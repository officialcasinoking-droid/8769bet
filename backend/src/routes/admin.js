import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { supabase } from '../lib/supabase.js'
import { validate, adminChangePasswordSchema, aviatorSettingsSchema, gameCreateSchema, gameUpdateSchema } from '../middleware/validation.js'

const router = express.Router()

// Optimized dashboard stats endpoint (single request)
router.get('/stats', async (req, res) => {
  try {
    const [
      { count: totalUsers },
      { count: activeUsers },
      { data: wallet },
      { count: activeGames },
      { data: recentTx },
      { count: pendingWithdrawals },
      { count: pendingDeposits },
      { data: revenueData }
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('admin_wallet').select('*').eq('id', 'main').maybeSingle(),
      supabase.from('games').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('transactions').select('type, amount, status, created_at').order('created_at', { ascending: false }).limit(10),
      supabase.from('withdrawals').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('deposits').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('transactions').select('amount, type, status').eq('status', 'completed').in('type', ['deposit', 'win'])
    ]);

    const totalRevenue = revenueData?.reduce((sum, tx) => {
      if (tx.type === 'deposit') return sum + Number(tx.amount);
      if (tx.type === 'win') return sum - Number(tx.amount);
      return sum;
    }, 0) || 0;

    res.json({
      success: true,
      stats: {
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        walletBalance: wallet?.balance || 0,
        activeGames: activeGames || 0,
        pendingWithdrawals: pendingWithdrawals || 0,
        pendingDeposits: pendingDeposits || 0,
        totalRevenue,
        recentTransactions: recentTx || []
      }
    });
  } catch (err) {
    console.error('[admin/stats] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
})

// Get all deposits
router.get('/deposits', async (req, res) => {
  const { status } = req.query
  
  try {
    let query = supabase
      .from('deposits')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('[admin/deposits] Error:', error.message)
      return res.status(500).json({ error: 'Failed to fetch deposits' })
    }

    // Fetch usernames separately (deposits FK is to auth.users, not public.users)
    const depositsWithUsers = await Promise.all((data || []).map(async (dep) => {
      const { data: u } = await supabase
        .from('users')
        .select('username')
        .eq('id', dep.user_id)
        .maybeSingle()
      return { ...dep, users: u || { username: null } }
    }))

    res.json(depositsWithUsers)
  } catch (err) {
    console.error('[admin/deposits] Exception:', err.message)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Approve/reject deposit
router.post('/deposits/:id', async (req, res) => {
  const { id } = req.params
  const { action, adminId, adminUsername, rejectionReason } = req.body
  
  try {
    const { data: deposit, error: fetchError } = await supabase
      .from('deposits')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !deposit) {
      console.error('[admin/deposits] Fetch error:', fetchError?.message)
      return res.status(404).json({ error: 'Deposit not found' })
    }

    // Fetch user data separately
    const { data: depositUser } = await supabase
      .from('users')
      .select('username, balance')
      .eq('id', deposit.user_id)
      .maybeSingle()
    
    deposit.users = depositUser || { username: 'Unknown', balance: 0 }

    if (deposit.status !== 'pending') {
      return res.status(400).json({ error: 'Deposit already processed' })
    }

    const now = new Date().toISOString()
    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    
    const updateData = {
      status: newStatus,
      processed_at: now
    }

    if (action === 'reject' && rejectionReason) {
      updateData.rejection_reason = rejectionReason
    }
    
    const { data: updated, error: updateError } = await supabase
      .from('deposits')
      .update(updateData)
      .eq('id', id)
      .select()

    if (updateError) {
      console.error('[admin/deposits/update] Error:', updateError.message)
      return res.status(500).json({ error: `Failed to update deposit: ${updateError.message}` })
    }

    // If approved, add balance to user
    if (action === 'approve') {
      const newBalance = Number(deposit.users?.balance || 0) + deposit.amount
      const { error: balanceError } = await supabase
        .from('users')
        .update({ balance: newBalance })
        .eq('id', deposit.user_id)
      
      if (balanceError) {
        console.error('[admin/deposits] Balance update error:', balanceError.message)
      } else {
        // Balance updated successfully
      }
    }

    // Log to audit_logs
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        actor_type: 'admin',
        actor_id: adminId || 'system',
        actor_username: adminUsername || 'admin',
        action: action === 'approve' ? 'approve_deposit' : 'reject_deposit',
        target_type: 'deposit',
        target_id: id,
        target_username: deposit.users?.username || 'unknown',
        details: { 
          amount: deposit.amount, 
          method: deposit.method,
          rejection_reason: rejectionReason || null
        },
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        severity: action === 'approve' ? 'info' : 'warning',
        success: true,
        timestamp: now
      })

    if (auditError) {
      console.error('[admin/deposits] Audit log error:', auditError.message)
    }

    console.log(`[admin/deposits] ${action}: ID ${id} by ${adminUsername || 'admin'}`)
    res.json({ success: true, deposit: updated?.[0] || deposit })
  } catch (err) {
    console.error('[admin/deposits] Exception:', err.message, err.stack)
    res.status(500).json({ error: `Internal server error: ${err.message}` })
  }
})

// Get all pending withdrawals
router.get('/withdrawals', async (req, res) => {
  const { status } = req.query
  
  try {
    let query = supabase
      .from('withdrawals')
      .select('*, users(username)')
      .order('created_at', { ascending: false })
    
    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('[admin/withdrawals] Error:', error.message)
      return res.status(500).json({ error: 'Failed to fetch withdrawals' })
    }

    res.json(data || [])
  } catch (err) {
    console.error('[admin/withdrawals] Exception:', err.message)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Approve/reject withdrawal
router.post('/withdrawals/:id', async (req, res) => {
  const { id } = req.params
  const { action, adminId, adminUsername, rejectionReason } = req.body
  
  try {
    const { data: withdrawal, error: fetchError } = await supabase
      .from('withdrawals')
      .select('*, users(username)')
      .eq('id', id)
      .single()

    if (fetchError || !withdrawal) {
      console.error('[admin/withdrawals] Fetch error:', fetchError?.message)
      return res.status(404).json({ error: 'Withdrawal not found' })
    }

    const now = new Date().toISOString()
    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    
    // Build update data - only include fields that exist
    const updateData = {
      status: newStatus,
      processed_at: now
    }

    if (action === 'reject' && rejectionReason) {
      updateData.rejection_reason = rejectionReason
    }
    
    console.log('[admin/withdrawals] Updating:', id, updateData)
    
    const { data: updated, error: updateError } = await supabase
      .from('withdrawals')
      .update(updateData)
      .eq('id', id)
      .select()

    if (updateError) {
      console.error('[admin/withdrawals/update] Error:', updateError.message, updateError.details)
      return res.status(500).json({ error: `Failed to update withdrawal: ${updateError.message}` })
    }

    console.log('[admin/withdrawals] Update result:', updated)

    // If rejected, refund balance
    if (action === 'reject') {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('balance')
        .eq('id', withdrawal.user_id)
        .single()

      if (userError) {
        console.error('[admin/withdrawals] User fetch error:', userError.message)
      } else if (user) {
        const newBalance = Number(user.balance) + withdrawal.amount
        const { error: balanceError } = await supabase
          .from('users')
          .update({ balance: newBalance })
          .eq('id', withdrawal.user_id)
        
        if (balanceError) {
          console.error('[admin/withdrawals] Balance update error:', balanceError.message)
        } else {
          // Balance updated successfully
        }
      }
    }

    // Log to audit_logs
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        actor_type: 'admin',
        actor_id: adminId || 'system',
        actor_username: adminUsername || 'admin',
        action: action === 'approve' ? 'approve_withdrawal' : 'reject_withdrawal',
        target_type: 'withdrawal',
        target_id: id,
        target_username: withdrawal.users?.username || 'unknown',
        details: { 
          amount: withdrawal.amount, 
          method: withdrawal.method,
          rejection_reason: rejectionReason || null
        },
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        severity: action === 'approve' ? 'info' : 'warning',
        success: true,
        timestamp: now
      })

    if (auditError) {
      console.error('[admin/withdrawals] Audit log error:', auditError.message)
    }

    console.log(`[admin/withdrawals] ${action}: ID ${id} by ${adminUsername || 'admin'}`)
    res.json({ success: true, withdrawal: updated?.[0] || withdrawal })
  } catch (err) {
    console.error('[admin/withdrawals] Exception:', err.message, err.stack)
    res.status(500).json({ error: `Internal server error: ${err.message}` })
  }
})

async function seedDefaultAdmin(username, password) {
  try {
    const hash = await bcrypt.hash(password, 12)
    const { error } = await supabase.from('admins').insert({
      id: '00000000-0000-0000-0000-000000000001',
      username,
      password_hash: hash,
      email: 'admin@8769bet.com',
      full_name: 'Super Admin',
      role: 'super_admin',
      permissions: { all: true },
      is_active: true
    })
    if (error) console.error('[seedAdmin] Insert error:', error.message)
  } catch (e) {
    console.error('[seedAdmin] Error:', e.message)
  }
}

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body
    const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production'

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' })
    }

    const respondAdmin = (adminId, adminUsername, role, permissions, email, fullName) => {
      const token = jwt.sign(
        { adminId, username: adminUsername, role },
        JWT_SECRET,
        { expiresIn: '24h' }
      )
      logAudit({
        actorType: 'admin',
        actorId: adminId,
        actorUsername: adminUsername,
        action: 'admin_login',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      }).catch(() => {})
      return res.json({
        success: true,
        token,
        admin: {
          id: adminId,
          username: adminUsername,
          email: email || 'admin@8769bet.com',
          fullName: fullName || 'Super Admin',
          role,
          permissions
        }
      })
    }

    // 1. Try admins table (bcrypt)
    const { data: admin, error: adminError } = await supabase
      .from('admins')
      .select('*')
      .eq('username', username)
      .maybeSingle()

    if (admin && admin.password_hash) {
      const isValid = await bcrypt.compare(password, admin.password_hash)
      if (isValid) {
        return respondAdmin(admin.id, admin.username, admin.role, admin.permissions, admin.email, admin.full_name)
      }
    }

    // 2. Try admin_accounts table (used by auth middleware)
    const { data: acct, error: acctError } = await supabase
      .from('admin_accounts')
      .select('*')
      .eq('username', username)
      .maybeSingle()

    if (acct && acct.password_hash) {
      const isValid = await bcrypt.compare(password, acct.password_hash)
      if (isValid) {
        return respondAdmin(acct.id, acct.username, acct.role || 'super_admin', acct.permissions || { all: true }, acct.email, acct.full_name)
      }
    }

    // 3. Fallback: platform_settings
    const { data: platformSettings, error: psError } = await supabase
      .from('platform_settings')
      .select('admin_username, admin_password')
      .eq('id', 'main')
      .maybeSingle()

    if (!psError && platformSettings?.admin_username && platformSettings?.admin_password) {
      if (username === platformSettings.admin_username && password === platformSettings.admin_password) {
        seedDefaultAdmin(username, password)
        return respondAdmin('00000000-0000-0000-0000-000000000001', username, 'super_admin', { all: true })
      }
    }

    // 4. Fallback: environment variables
    const envUsername = process.env.ADMIN_USERNAME
    const envPassword = process.env.ADMIN_PASSWORD
    if (envUsername && envPassword && username === envUsername && password === envPassword) {
      seedDefaultAdmin(username, password)
      return respondAdmin('00000000-0000-0000-0000-000000000001', username, 'super_admin', { all: true })
    }

    res.status(401).json({ error: 'Invalid credentials' })
  } catch (err) {
    console.error('Admin login error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`)
  },
})
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } })

// Landing content - uses shared store
router.get('/landing/content', (req, res) => {
  res.json(landingContent)
})

router.post('/landing/draft', (req, res) => {
  const { content } = req.body
  if (content) {
    Object.assign(landingContent, content)
  }
  res.json({ ok: true, content: landingContent, status: 'draft' })
})

router.post('/landing/publish', (req, res) => {
  const { content } = req.body
  if (content) {
    Object.assign(landingContent, content)
  }
  console.log('✅ Changes published – live preview updated')
  console.log('📝 Title:', landingContent.title, '| Primary:', landingContent.colors?.primary, '| Footer:', landingContent.footerText)
  res.json({ ok: true, content: { ...landingContent }, status: 'live' })
})

// Real file upload with multer — returns full URL
const BASE_URL = process.env.BASE_URL || 'http://localhost:3006'
router.post('/landing/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }
  const fullUrl = `${BASE_URL}/uploads/${req.file.filename}`
  console.log('📷 Image uploaded:', fullUrl)
  res.json({ path: fullUrl, filename: req.file.filename })
})

// Wallet and transactions
router.get('/wallet', async (req, res) => {
  try {
    const { data } = await supabase.from('platform_settings').select('*').eq('id', 'wallet').single()
    res.json(data || {})
  } catch (err) {
    res.json({})
  }
})

router.get('/transactions', async (req, res) => {
  try {
    const { data } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(50)
    res.json(data || [])
  } catch (err) {
    res.json([])
  }
})

router.post('/withdrawal/settings', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .upsert({ id: 'withdrawal', ...req.body, updated_at: new Date().toISOString() })
      .select()
      .single()
    
    if (error) throw error
    res.json({ ok: true, settings: data })
  } catch (err) {
    console.error('[withdrawal/settings] Error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// ── Game Control Endpoints ────────────────────────

// Force crash current round
router.post('/game/crash', async (req, res) => {
  try {
    await supabase.from('aviator_admin_signals').insert({
      id: 'control',
      action: 'force_crash',
      triggered_by: req.admin?.id || null,
      processed: false
    });
    res.json({ success: true, message: 'Crash signal sent' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
})

// Start new round immediately
router.post('/game/new-round', async (req, res) => {
  try {
    await supabase.from('aviator_admin_signals').insert({
      id: 'control',
      action: 'new_round',
      triggered_by: req.admin?.id || null,
      processed: false
    });
    res.json({ success: true, message: 'New round signal sent' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
})

// Get current game state
router.get('/game/state', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('aviator_game_state')
      .select('*')
      .eq('id', 'current')
      .single();
    if (error) throw error;
    res.json({ success: true, state: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
})

// Get game statistics
router.get('/game/stats', async (req, res) => {
  try {
    const { data: gameState } = await supabase
      .from('aviator_game_state')
      .select('*')
      .eq('id', 'current')
      .single();
    
    const { data: settings } = await supabase
      .from('aviator_settings')
      .select('*')
      .eq('id', 'config')
      .single();
    
    res.json({
      success: true,
      stats: {
        currentPhase: gameState?.phase || 'betting',
        multiplier: gameState?.multiplier || 1.00,
        houseEdge: settings?.house_edge || 0.05,
        heMode: settings?.he_mode || 'off',
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
})

// Update game settings
router.post('/game/settings', validate(aviatorSettingsSchema), async (req, res) => {
  try {
    const { error } = await supabase
      .from('aviator_settings')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', 'config');
    if (error) throw error;
    const { data } = await supabase.from('aviator_settings').select('*').eq('id', 'config').single();
    res.json({ success: true, settings: data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
})

// Change admin password (super admin only)
router.post('/change-password', validate(adminChangePasswordSchema), async (req, res) => {
  try {
    const { newPassword } = req.body
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)

    const { data: admin, error } = await supabase
      .from('admin_accounts')
      .update({ password_hash: passwordHash })
      .eq('username', 'admin')
      .select('id, username')
      .single()

    if (error) throw error

    await logAudit({
      actorType: 'admin',
      actorId: admin.id,
      actorUsername: admin.username,
      action: 'change_admin_password',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      severity: 'critical'
    })

    res.json({ success: true, message: 'Password changed successfully' })
  } catch (err) {
    console.error('Change password error:', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
