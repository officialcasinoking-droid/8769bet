/**
 * Security Routes
 * IP blocking, security alerts, and monitoring
 */

import express from 'express'
import { supabase } from '../lib/supabase.js'
import { authenticateAdmin, requireRole } from '../middleware/auth.js'
import { logAudit } from '../middleware/auditLogger.js'

const router = express.Router()

router.use(authenticateAdmin)

// GET /api/admin/security/blocked-ips - List blocked IPs
router.get('/blocked-ips', async (req, res) => {
  try {
    const { data: blockedIPs, error } = await supabase
      .from('blocked_ips')
      .select('*')
      .order('blocked_at', { ascending: false })

    if (error) throw error

    res.json({ success: true, blockedIPs: blockedIPs || [] })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/admin/security/block-ip - Block IP manually
router.post('/block-ip', async (req, res) => {
  try {
    const { ip_address, reason, expiresAt } = req.body

    if (!ip_address || !reason) {
      return res.status(400).json({ success: false, error: 'IP address and reason are required' })
    }

    const { data: blockedIP, error } = await supabase
      .from('blocked_ips')
      .insert({
        ip_address,
        reason,
        blocked_by: req.admin.id,
        expires_at: expiresAt || null,
        review_status: 'approved'
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ success: false, error: 'IP already blocked' })
      }
      throw error
    }

    await logAudit({
      actorType: 'admin',
      actorId: req.admin.id,
      actorUsername: req.admin.username,
      action: 'block_ip',
      targetType: 'ip',
      details: { ip_address, reason, expiresAt },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      severity: 'warning'
    })

    res.json({ success: true, blockedIP })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/admin/security/unblock-ip - Unblock IP
router.post('/unblock-ip', async (req, res) => {
  try {
    const { ip_address } = req.body

    if (!ip_address) {
      return res.status(400).json({ success: false, error: 'IP address is required' })
    }

    const { data: blockedIP, error } = await supabase
      .from('blocked_ips')
      .update({ is_active: false, review_status: 'approved' })
      .eq('ip_address', ip_address)
      .select()
      .single()

    if (error) throw error

    await logAudit({
      actorType: 'admin',
      actorId: req.admin.id,
      actorUsername: req.admin.username,
      action: 'unblock_ip',
      targetType: 'ip',
      details: { ip_address },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    res.json({ success: true, message: 'IP unblocked' })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/admin/security/alerts - Get security alerts
router.get('/alerts', async (req, res) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: criticalLogs } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('severity', 'critical')
      .gte('timestamp', today.toISOString())
      .order('timestamp', { ascending: false })
      .limit(20)

    const { data: pendingIPs } = await supabase
      .from('blocked_ips')
      .select('*')
      .eq('review_status', 'pending')
      .order('blocked_at', { ascending: false })
      .limit(10)

    const { data: failedLogins } = await supabase
      .from('login_attempts')
      .select('ip_address,username,count(*)')
      .eq('success', false)
      .gte('timestamp', today.toISOString())
      .group('ip_address,username')
      .limit(10)

    res.json({
      success: true,
      alerts: {
        criticalEvents: criticalLogs || [],
        pendingIPReviews: pendingIPs || [],
        suspiciousFailedLogins: failedLogins || []
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/admin/security/alerts/:id/resolve - Resolve security alert
router.post('/alerts/:id/resolve', async (req, res) => {
  try {
    const { note } = req.body

    await logAudit({
      actorType: 'admin',
      actorId: req.admin.id,
      actorUsername: req.admin.username,
      action: 'resolve_security_alert',
      targetType: 'alert',
      targetId: req.params.id,
      details: { note },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    res.json({ success: true, message: 'Alert resolved' })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
