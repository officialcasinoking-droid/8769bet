/**
 * User Management Routes
 * All user CRUD operations with audit logging
 */

import express from 'express'
import bcrypt from 'bcryptjs'
import { supabase } from '../lib/supabase.js'
import { authenticateAdmin, requireRole } from '../middleware/auth.js'
import { logAudit } from '../middleware/auditLogger.js'

const router = express.Router()

router.use(authenticateAdmin)

// GET /api/admin/users - List users with pagination, search, filters, sorting
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const search = req.query.search || ''
    const status = req.query.status || ''
    const riskLevel = req.query.riskLevel || ''
    const kycStatus = req.query.kycStatus || ''
    const sortBy = req.query.sortBy || 'created_at'
    const sortOrder = req.query.sortOrder || 'desc'

    const offset = (page - 1) * limit

    // First sync any missing auth users into public.users
    const { data: authUsers } = await supabase
      .from('users')
      .select('id')
      .limit(1)

    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })

    if (search) {
      query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%,id.eq.${search}`)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (riskLevel) {
      query = query.eq('risk_level', riskLevel)
    }

    if (kycStatus) {
      query = query.eq('kyc_status', kycStatus)
    }

    query = query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1)

    const { data: users, error, count } = await query

    if (error) throw error

    res.json({
      success: true,
      users,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/admin/users/stats - User statistics
router.get('/stats', async (req, res) => {
  try {
    const { data: total } = await supabase.from('users').select('id', { count: 'exact' })
    const { data: active } = await supabase.from('users').select('id', { count: 'exact' }).eq('status', 'active')
    const { data: banned } = await supabase.from('users').select('id', { count: 'exact' }).eq('status', 'banned')
    const { data: suspended } = await supabase.from('users').select('id', { count: 'exact' }).eq('status', 'suspended')
    const { data: highRisk } = await supabase.from('users').select('id', { count: 'exact' }).in('risk_level', ['high', 'critical'])

    const now = new Date()
    const yesterday = new Date(now - 24 * 60 * 60 * 1000)
    const { data: newUsers } = await supabase
      .from('users')
      .select('id', { count: 'exact' })
      .gte('created_at', yesterday.toISOString())

    res.json({
      success: true,
      stats: {
        total: total?.length || 0,
        active: active?.length || 0,
        banned: banned?.length || 0,
        suspended: suspended?.length || 0,
        highRisk: highRisk?.length || 0,
        newLast24h: newUsers?.length || 0
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/admin/users/export - Export users as CSV
router.get('/export', async (req, res) => {
  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id,username,email,full_name,balance,status,risk_level,kyc_status,created_at,last_login,login_count')
      .order('created_at', { ascending: false })
      .limit(10000)

    if (error) throw error

    const headers = ['ID', 'Username', 'Email', 'Full Name', 'Balance', 'Status', 'Risk Level', 'KYC Status', 'Created At', 'Last Login', 'Login Count']
    const csvRows = [headers.join(',')]

    users.forEach(u => {
      csvRows.push([
        u.id,
        `"${u.username}"`,
        `"${u.email}"`,
        `"${u.full_name || ''}"`,
        u.balance,
        u.status,
        u.risk_level,
        u.kyc_status,
        u.created_at,
        u.last_login || '',
        u.login_count
      ].join(','))
    })

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename=users_export.csv')
    res.send(csvRows.join('\n'))

    await logAudit({
      actorType: 'admin',
      actorId: req.admin.id,
      actorUsername: req.admin.username,
      action: 'export_users',
      details: { count: users.length },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/admin/users/:id - Get single user with full details
router.get('/:id', async (req, res) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (error || !user) {
      return res.status(404).json({ success: false, error: 'User not found' })
    }

    const { data: notes } = await supabase
      .from('user_notes')
      .select('*')
      .eq('user_id', req.params.id)
      .order('created_at', { ascending: false })
      .limit(20)

    res.json({ success: true, user, notes: notes || [] })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// PUT /api/admin/users/:id - Update user info
router.put('/:id', async (req, res) => {
  try {
    const { username, email, full_name, phone, risk_level, kyc_status } = req.body

    const { data: user, error } = await supabase
      .from('users')
      .update({ username, email, full_name, phone, risk_level, kyc_status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) throw error

    await logAudit({
      actorType: 'admin',
      actorId: req.admin.id,
      actorUsername: req.admin.username,
      action: 'update_user',
      targetType: 'user',
      targetId: req.params.id,
      targetUsername: user.username,
      details: { updates: { username, email, full_name, phone, risk_level, kyc_status } },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    res.json({ success: true, user })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/admin/users/:id/balance - Adjust user balance
router.post('/:id/balance', async (req, res) => {
  try {
    const { amount, reason } = req.body

    if (!amount || !reason) {
      return res.status(400).json({ success: false, error: 'Amount and reason are required' })
    }

    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('balance, username')
      .eq('id', req.params.id)
      .single()

    if (fetchError || !user) {
      return res.status(404).json({ success: false, error: 'User not found' })
    }

    const balanceBefore = parseFloat(user.balance)
    const balanceAfter = balanceBefore + parseFloat(amount)

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ balance: balanceAfter, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single()

    if (updateError) throw updateError

    await supabase.from('balance_history').insert({
      user_id: req.params.id,
      amount: parseFloat(amount),
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      reason,
      admin_id: req.admin.id,
      admin_username: req.admin.username
    })

    await logAudit({
      actorType: 'admin',
      actorId: req.admin.id,
      actorUsername: req.admin.username,
      action: 'adjust_balance',
      targetType: 'user',
      targetId: req.params.id,
      targetUsername: user.username,
      details: { amount: parseFloat(amount), balance_before: balanceBefore, balance_after: balanceAfter, reason },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      severity: amount < 0 ? 'warning' : 'info'
    })

    res.json({ success: true, user: updatedUser, balanceBefore, balanceAfter })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/admin/users/:id/status - Change user status
router.post('/:id/status', async (req, res) => {
  try {
    const { status, reason } = req.body

    if (!status) {
      return res.status(400).json({ success: false, error: 'Status is required' })
    }

    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('username')
      .eq('id', req.params.id)
      .single()

    if (fetchError || !user) {
      return res.status(404).json({ success: false, error: 'User not found' })
    }

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) throw error

    await logAudit({
      actorType: 'admin',
      actorId: req.admin.id,
      actorUsername: req.admin.username,
      action: 'change_user_status',
      targetType: 'user',
      targetId: req.params.id,
      targetUsername: user.username,
      details: { status, reason },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      severity: status === 'banned' ? 'critical' : 'warning'
    })

    res.json({ success: true, user: updatedUser })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/admin/users/:id/lock - Lock/unlock user account
router.post('/:id/lock', async (req, res) => {
  try {
    const { locked, reason, duration } = req.body

    const lockedUntil = locked && duration
      ? new Date(Date.now() + duration * 60 * 60 * 1000).toISOString()
      : null

    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('username')
      .eq('id', req.params.id)
      .single()

    if (fetchError || !user) {
      return res.status(404).json({ success: false, error: 'User not found' })
    }

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update({ is_locked: locked, locked_until: lockedUntil, failed_login_count: locked ? 0 : undefined, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) throw error

    await logAudit({
      actorType: 'admin',
      actorId: req.admin.id,
      actorUsername: req.admin.username,
      action: locked ? 'lock_user' : 'unlock_user',
      targetType: 'user',
      targetId: req.params.id,
      targetUsername: user.username,
      details: { reason, lockedUntil },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      severity: 'warning'
    })

    res.json({ success: true, user: updatedUser })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/admin/users/:id/note - Add admin note
router.post('/:id/note', async (req, res) => {
  try {
    const { note } = req.body

    if (!note) {
      return res.status(400).json({ success: false, error: 'Note is required' })
    }

    const { data: userNote, error } = await supabase
      .from('user_notes')
      .insert({
        user_id: req.params.id,
        admin_id: req.admin.id,
        admin_username: req.admin.username,
        note
      })
      .select()
      .single()

    if (error) throw error

    await logAudit({
      actorType: 'admin',
      actorId: req.admin.id,
      actorUsername: req.admin.username,
      action: 'add_user_note',
      targetType: 'user',
      targetId: req.params.id,
      details: { note },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    res.json({ success: true, note: userNote })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/admin/users/:id/activity - Get user activity history
router.get('/:id/activity', async (req, res) => {
  try {
    const { data: auditLogs } = await supabase
      .from('audit_logs')
      .select('*')
      .or(`target_id.eq.${req.params.id},actor_id.eq.${req.params.id}`)
      .order('timestamp', { ascending: false })
      .limit(50)

    const { data: balanceHistory } = await supabase
      .from('balance_history')
      .select('*')
      .eq('user_id', req.params.id)
      .order('created_at', { ascending: false })
      .limit(50)

    const { data: loginAttempts } = await supabase
      .from('login_attempts')
      .select('*')
      .eq('username', req.params.id)
      .order('timestamp', { ascending: false })
      .limit(20)

    // Get user's game history from crash_history (stored in game state)
    const { data: userBets } = await supabase
      .from('bets')
      .select('*')
      .eq('user_id', req.params.id)
      .order('created_at', { ascending: false })
      .limit(50)

    const { data: userTransactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', req.params.id)
      .order('created_at', { ascending: false })
      .limit(50)

    const { data: userWithdrawals } = await supabase
      .from('withdrawals')
      .select('*')
      .eq('user_id', req.params.id)
      .order('created_at', { ascending: false })
      .limit(20)

    const { data: userDeposits } = await supabase
      .from('deposits')
      .select('*')
      .eq('user_id', req.params.id)
      .order('created_at', { ascending: false })
      .limit(20)

    res.json({
      success: true,
      activity: {
        auditLogs: auditLogs || [],
        balanceHistory: balanceHistory || [],
        loginAttempts: loginAttempts || [],
        bets: userBets || [],
        transactions: userTransactions || [],
        withdrawals: userWithdrawals || [],
        deposits: userDeposits || []
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/admin/users/:id/balance-history - Get balance change history
router.get('/:id/balance-history', async (req, res) => {
  try {
    const { data: history, error } = await supabase
      .from('balance_history')
      .select('*')
      .eq('user_id', req.params.id)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error

    res.json({ success: true, history: history || [] })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/admin/users/bulk-action - Bulk action on users
router.post('/bulk-action', async (req, res) => {
  try {
    const { userIds, action, reason } = req.body

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, error: 'User IDs are required' })
    }

    if (!action) {
      return res.status(400).json({ success: false, error: 'Action is required' })
    }

    let result
    switch (action) {
      case 'ban':
        result = await supabase.from('users').update({ status: 'banned', updated_at: new Date().toISOString() }).in('id', userIds)
        break
      case 'suspend':
        result = await supabase.from('users').update({ status: 'suspended', updated_at: new Date().toISOString() }).in('id', userIds)
        break
      case 'activate':
        result = await supabase.from('users').update({ status: 'active', updated_at: new Date().toISOString() }).in('id', userIds)
        break
      case 'unlock':
        result = await supabase.from('users').update({ is_locked: false, locked_until: null, updated_at: new Date().toISOString() }).in('id', userIds)
        break
      default:
        return res.status(400).json({ success: false, error: 'Invalid action' })
    }

    if (result.error) throw result.error

    await logAudit({
      actorType: 'admin',
      actorId: req.admin.id,
      actorUsername: req.admin.username,
      action: `bulk_${action}`,
      details: { userIds, count: userIds.length, reason },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      severity: 'warning'
    })

    res.json({ success: true, affected: userIds.length })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/admin/users/:id/reset-pin - Reset user withdrawal PIN
router.post('/:id/reset-pin', async (req, res) => {
  try {
    const { pin } = req.body

    if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({ success: false, error: 'PIN must be 4 digits' })
    }

    const pinHash = await bcrypt.hash(pin, 12)

    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('username')
      .eq('id', req.params.id)
      .single()

    if (fetchError || !user) {
      return res.status(404).json({ success: false, error: 'User not found' })
    }

    const { error } = await supabase
      .from('users')
      .update({ withdrawal_pin_hash: pinHash, withdrawal_pin_set: true, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)

    if (error) throw error

    await logAudit({
      actorType: 'admin',
      actorId: req.admin.id,
      actorUsername: req.admin.username,
      action: 'reset_withdrawal_pin',
      targetType: 'user',
      targetId: req.params.id,
      targetUsername: user.username,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      severity: 'warning'
    })

    res.json({ success: true, message: 'PIN reset successfully' })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
