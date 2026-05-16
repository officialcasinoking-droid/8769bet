/**
 * Audit Log Routes
 * View, filter, and export audit logs
 */

import express from 'express'
import { supabase } from '../lib/supabase.js'
import { authenticateAdmin, requireRole } from '../middleware/auth.js'
import { logAudit } from '../middleware/auditLogger.js'

const router = express.Router()

router.use(authenticateAdmin)
router.use(requireRole('super_admin'))

// GET /api/admin/audit/logs - Get audit logs with filters
router.get('/logs', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 50
    const dateFrom = req.query.dateFrom
    const dateTo = req.query.dateTo
    const actorType = req.query.actorType
    const actorUsername = req.query.actorUsername
    const action = req.query.action
    const severity = req.query.severity
    const targetType = req.query.targetType
    const success = req.query.success
    const search = req.query.search

    const offset = (page - 1) * limit

    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })

    if (dateFrom) query = query.gte('timestamp', dateFrom)
    if (dateTo) query = query.lte('timestamp', dateTo)
    if (actorType) query = query.eq('actor_type', actorType)
    if (actorUsername) query = query.ilike('actor_username', `%${actorUsername}%`)
    if (action) query = query.ilike('action', `%${action}%`)
    if (severity) query = query.eq('severity', severity)
    if (targetType) query = query.eq('target_type', targetType)
    if (success !== undefined) query = query.eq('success', success === 'true')
    if (search) {
      query = query.or(`actor_username.ilike.%${search}%,target_username.ilike.%${search}%,action.ilike.%${search}%`)
    }

    query = query.order('timestamp', { ascending: false }).range(offset, offset + limit - 1)

    const { data: logs, error, count } = await query

    if (error) throw error

    res.json({
      success: true,
      logs,
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

// GET /api/admin/audit/logs/:id - Get single audit log entry
router.get('/logs/:id', async (req, res) => {
  try {
    const { data: log, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('id', req.params.id)
      .single()

    if (error || !log) {
      return res.status(404).json({ success: false, error: 'Log entry not found' })
    }

    res.json({ success: true, log })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/admin/audit/login-attempts - Get login attempt history
router.get('/login-attempts', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 50
    const username = req.query.username
    const success = req.query.success
    const offset = (page - 1) * limit

    let query = supabase
      .from('login_attempts')
      .select('*', { count: 'exact' })

    if (username) query = query.eq('username', username)
    if (success !== undefined) query = query.eq('success', success === 'true')

    query = query.order('timestamp', { ascending: false }).range(offset, offset + limit - 1)

    const { data: attempts, error, count } = await query

    if (error) throw error

    res.json({
      success: true,
      attempts,
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

// GET /api/admin/audit/stats - Get audit statistics
router.get('/stats', async (req, res) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: todayLogs } = await supabase
      .from('audit_logs')
      .select('id', { count: 'exact' })
      .gte('timestamp', today.toISOString())

    const { data: criticalLogs } = await supabase
      .from('audit_logs')
      .select('id', { count: 'exact' })
      .eq('severity', 'critical')
      .gte('timestamp', today.toISOString())

    const { data: failedActions } = await supabase
      .from('audit_logs')
      .select('id', { count: 'exact' })
      .eq('success', false)
      .gte('timestamp', today.toISOString())

    const { data: uniqueActors } = await supabase
      .from('audit_logs')
      .select('actor_id, actor_username')
      .gte('timestamp', today.toISOString())

    const uniqueCount = new Set(uniqueActors?.map(a => a.actor_id)).size

    res.json({
      success: true,
      stats: {
        todayLogs: todayLogs?.length || 0,
        criticalToday: criticalLogs?.length || 0,
        failedToday: failedActions?.length || 0,
        uniqueActorsToday: uniqueCount
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/admin/audit/export - Export audit logs as CSV
router.get('/export', async (req, res) => {
  try {
    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(10000)

    if (error) throw error

    const headers = ['Timestamp', 'Actor Type', 'Actor Username', 'Action', 'Target Type', 'Target Username', 'Severity', 'Success', 'IP Address', 'Details']
    const csvRows = [headers.join(',')]

    logs.forEach(l => {
      csvRows.push([
        l.timestamp,
        l.actor_type,
        `"${l.actor_username || ''}"`,
        `"${l.action}"`,
        l.target_type || '',
        `"${l.target_username || ''}"`,
        l.severity,
        l.success,
        l.ip_address || '',
        `"${JSON.stringify(l.details || {}).replace(/"/g, '""')}"`
      ].join(','))
    })

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename=audit_logs_export.csv')
    res.send(csvRows.join('\n'))

    await logAudit({
      actorType: 'admin',
      actorId: req.admin.id,
      actorUsername: req.admin.username,
      action: 'export_audit_logs',
      details: { count: logs.length },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
