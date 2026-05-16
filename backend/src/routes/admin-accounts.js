/**
 * Admin Accounts Routes
 * Multi-admin management (super_admin only)
 */

import express from 'express'
import bcrypt from 'bcryptjs'
import { supabase } from '../lib/supabase.js'
import { authenticateAdmin, requireRole } from '../middleware/auth.js'
import { logAudit } from '../middleware/auditLogger.js'

const router = express.Router()

router.use(authenticateAdmin)
router.use(requireRole('super_admin'))

// GET /api/admin/accounts - List admin accounts
router.get('/', async (req, res) => {
  try {
    const { data: accounts, error } = await supabase
      .from('admin_accounts')
      .select('id,username,email,full_name,role,is_active,created_at,last_login,failed_login_count,locked_until')
      .order('created_at', { ascending: false })

    if (error) throw error

    res.json({ success: true, accounts: accounts || [] })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/admin/accounts - Create new admin account
router.post('/', async (req, res) => {
  try {
    const { username, password, email, full_name, role, permissions } = req.body

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' })
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const { data: account, error } = await supabase
      .from('admin_accounts')
      .insert({
        username,
        password_hash: passwordHash,
        email,
        full_name,
        role: role || 'admin',
        permissions: permissions || {},
        created_by: req.admin.id
      })
      .select('id,username,email,full_name,role,is_active,created_at')
      .single()

    if (error) throw error

    await logAudit({
      actorType: 'admin',
      actorId: req.admin.id,
      actorUsername: req.admin.username,
      action: 'create_admin_account',
      targetType: 'admin',
      targetId: account.id,
      targetUsername: account.username,
      details: { role: account.role },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      severity: 'warning'
    })

    res.json({ success: true, account })
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ success: false, error: 'Username or email already exists' })
    }
    res.status(500).json({ success: false, error: err.message })
  }
})

// PUT /api/admin/accounts/:id - Update admin account
router.put('/:id', async (req, res) => {
  try {
    const { email, full_name, role, permissions, is_active } = req.body

    const { data: account, error } = await supabase
      .from('admin_accounts')
      .update({ email, full_name, role, permissions, is_active })
      .eq('id', req.params.id)
      .select('id,username,email,full_name,role,is_active')
      .single()

    if (error) throw error

    await logAudit({
      actorType: 'admin',
      actorId: req.admin.id,
      actorUsername: req.admin.username,
      action: 'update_admin_account',
      targetType: 'admin',
      targetId: account.id,
      targetUsername: account.username,
      details: { email, full_name, role, is_active },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      severity: 'warning'
    })

    res.json({ success: true, account })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/admin/accounts/:id/reset-password - Reset admin password
router.post('/:id/reset-password', async (req, res) => {
  try {
    const { newPassword } = req.body

    if (!newPassword) {
      return res.status(400).json({ success: false, error: 'New password is required' })
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)

    const { data: account, error } = await supabase
      .from('admin_accounts')
      .update({ password_hash: passwordHash })
      .eq('id', req.params.id)
      .select('id,username')
      .single()

    if (error) throw error

    await supabase.from('admin_sessions').update({ is_active: false }).eq('admin_id', req.params.id)

    await logAudit({
      actorType: 'admin',
      actorId: req.admin.id,
      actorUsername: req.admin.username,
      action: 'reset_admin_password',
      targetType: 'admin',
      targetId: account.id,
      targetUsername: account.username,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      severity: 'critical'
    })

    res.json({ success: true, message: 'Password reset successfully' })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/admin/accounts/:id/lock - Lock/unlock admin account
router.post('/:id/lock', async (req, res) => {
  try {
    const { locked } = req.body

    const lockedUntil = locked ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null

    const { data: account, error } = await supabase
      .from('admin_accounts')
      .update({ locked_until: lockedUntil, failed_login_count: 0 })
      .eq('id', req.params.id)
      .select('id,username')
      .single()

    if (error) throw error

    await logAudit({
      actorType: 'admin',
      actorId: req.admin.id,
      actorUsername: req.admin.username,
      action: locked ? 'lock_admin_account' : 'unlock_admin_account',
      targetType: 'admin',
      targetId: account.id,
      targetUsername: account.username,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      severity: 'critical'
    })

    res.json({ success: true, message: locked ? 'Account locked' : 'Account unlocked' })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// DELETE /api/admin/accounts/:id - Deactivate admin account
router.delete('/:id', async (req, res) => {
  try {
    if (req.params.id === req.admin.id) {
      return res.status(400).json({ success: false, error: 'Cannot deactivate your own account' })
    }

    const { data: account, error: fetchError } = await supabase
      .from('admin_accounts')
      .select('username')
      .eq('id', req.params.id)
      .single()

    if (fetchError || !account) {
      return res.status(404).json({ success: false, error: 'Account not found' })
    }

    const { error } = await supabase
      .from('admin_accounts')
      .update({ is_active: false })
      .eq('id', req.params.id)

    if (error) throw error

    await supabase.from('admin_sessions').update({ is_active: false }).eq('admin_id', req.params.id)

    await logAudit({
      actorType: 'admin',
      actorId: req.admin.id,
      actorUsername: req.admin.username,
      action: 'deactivate_admin_account',
      targetType: 'admin',
      targetId: req.params.id,
      targetUsername: account.username,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      severity: 'critical'
    })

    res.json({ success: true, message: 'Account deactivated' })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/admin/accounts/:id/sessions - Get active sessions
router.get('/:id/sessions', async (req, res) => {
  try {
    const { data: sessions, error } = await supabase
      .from('admin_sessions')
      .select('id,ip_address,user_agent,created_at,expires_at,is_active')
      .eq('admin_id', req.params.id)
      .eq('is_active', true)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error) throw error

    res.json({ success: true, sessions: sessions || [] })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// DELETE /api/admin/accounts/:id/sessions/:sessionId - Revoke session
router.delete('/:id/sessions/:sessionId', async (req, res) => {
  try {
    const { error } = await supabase
      .from('admin_sessions')
      .update({ is_active: false })
      .eq('id', req.params.sessionId)
      .eq('admin_id', req.params.id)

    if (error) throw error

    await logAudit({
      actorType: 'admin',
      actorId: req.admin.id,
      actorUsername: req.admin.username,
      action: 'revoke_admin_session',
      targetType: 'admin',
      targetId: req.params.id,
      details: { sessionId: req.params.sessionId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      severity: 'warning'
    })

    res.json({ success: true, message: 'Session revoked' })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
