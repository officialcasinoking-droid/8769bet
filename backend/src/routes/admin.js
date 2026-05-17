import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { supabase } from '../lib/supabase.js'

const router = express.Router()

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
  const { action } = req.body // 'approve' or 'reject'
  
  try {
    const { data: withdrawal, error: fetchError } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !withdrawal) {
      return res.status(404).json({ error: 'Withdrawal not found' })
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected'
    
    const { error: updateError } = await supabase
      .from('withdrawals')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (updateError) {
      console.error('[admin/withdrawals/update] Error:', updateError.message)
      return res.status(500).json({ error: 'Failed to update withdrawal' })
    }

    // If rejected, refund balance
    if (action === 'reject') {
      const { data: user } = await supabase
        .from('users')
        .select('balance')
        .eq('id', withdrawal.user_id)
        .single()

      if (user) {
        await supabase
          .from('users')
          .update({ balance: Number(user.balance) + withdrawal.amount, updated_at: new Date().toISOString() })
          .eq('id', withdrawal.user_id)
      }
    }

    console.log(`[admin/withdrawals] ${action}: ID ${id}`)
    res.json({ success: true })
  } catch (err) {
    console.error('[admin/withdrawals] Exception:', err.message)
    res.status(500).json({ error: 'Internal server error' })
  }
})

      await logAudit({
        actorType: 'admin',
        actorId: admin.id,
        actorUsername: admin.username,
        action: 'admin_login',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      })

      return res.json({
        success: true,
        token,
        admin: {
          id: admin.id,
          username: admin.username,
          email: admin.email,
          fullName: admin.full_name,
          role: admin.role,
          permissions: admin.permissions
        }
      })
    }

    // Fallback: try the old platform_settings credentials
    const { data: platformSettings } = await supabase
      .from('platform_settings')
      .select('admin_username, admin_password')
      .eq('id', 'main')
      .single()

    if (platformSettings && username === platformSettings.admin_username && password === platformSettings.admin_password) {
      const token = jwt.sign(
        { adminId: '00000000-0000-0000-0000-000000000001', username, role: 'super_admin' },
        JWT_SECRET,
        { expiresIn: '24h' }
      )

      return res.json({
        success: true,
        token,
        admin: {
          id: '00000000-0000-0000-0000-000000000001',
          username,
          role: 'super_admin',
          permissions: { all: true }
        }
      })
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
router.post('/game/crash', (req, res) => {
  try {
    requestManualCrash()
    res.json({ success: true, message: 'Crash signal sent' })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// Start new round immediately
router.post('/game/new-round', (req, res) => {
  try {
    startNewRound()
    res.json({ success: true, message: 'New round started' })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// Get current game state
router.get('/game/state', (req, res) => {
  try {
    const state = getCurrentState()
    res.json({ success: true, state })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// Get game statistics
router.get('/game/stats', (req, res) => {
  try {
    res.json({
      success: true,
      stats: {
        houseEdgePool,
        currentPhase: getCurrentState().phase,
        totalRounds: houseEdgePool.roundsPlayed,
        totalBets: houseEdgePool.totalBets,
        totalWinnings: houseEdgePool.totalWinnings,
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// Update game settings
router.post('/game/settings', (req, res) => {
  try {
    updateSettings(req.body)
    res.json({ success: true, settings: { ...settings } })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// Change admin password (super admin only)
router.post('/change-password', async (req, res) => {
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
