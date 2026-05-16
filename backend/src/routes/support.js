/**
 * Support Ticket Routes
 * User support tickets with AI review workflow
 */

import express from 'express'
import { supabase } from '../lib/supabase.js'
import { authenticateAdmin, requireRole } from '../middleware/auth.js'
import { logAudit } from '../middleware/auditLogger.js'

const router = express.Router()

router.use(authenticateAdmin)
router.use(requireRole('support'))

// GET /api/admin/support/tickets - List support tickets
router.get('/tickets', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 20
    const status = req.query.status || ''
    const priority = req.query.priority || ''
    const assignedTo = req.query.assignedTo || ''
    const offset = (page - 1) * limit

    let query = supabase
      .from('support_tickets')
      .select('*, users(username, email), admin_accounts(username)')
      .order('created_at', { ascending: false })

    if (status) query = query.eq('status', status)
    if (priority) query = query.eq('priority', priority)
    if (assignedTo) query = query.eq('assigned_to', assignedTo)

    query = query.range(offset, offset + limit - 1)

    const { data: tickets, error, count } = await query

    if (error) throw error

    res.json({
      success: true,
      tickets: tickets || [],
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

// GET /api/admin/support/tickets/:id - Get ticket details
router.get('/tickets/:id', async (req, res) => {
  try {
    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .select('*, users(*), admin_accounts(username)')
      .eq('id', req.params.id)
      .single()

    if (error || !ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' })
    }

    res.json({ success: true, ticket })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/admin/support/tickets/:id/assign - Assign ticket to admin
router.post('/tickets/:id/assign', async (req, res) => {
  try {
    const { adminId } = req.body

    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .update({ assigned_to: adminId, status: 'pending', updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) throw error

    await logAudit({
      actorType: 'admin',
      actorId: req.admin.id,
      actorUsername: req.admin.username,
      action: 'assign_ticket',
      targetType: 'support_ticket',
      targetId: req.params.id,
      details: { adminId },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    res.json({ success: true, ticket })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/admin/support/tickets/:id/resolve - Resolve ticket
router.post('/tickets/:id/resolve', async (req, res) => {
  try {
    const { resolution } = req.body

    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .update({ status: 'resolved', resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single()

    if (error) throw error

    await logAudit({
      actorType: 'admin',
      actorId: req.admin.id,
      actorUsername: req.admin.username,
      action: 'resolve_ticket',
      targetType: 'support_ticket',
      targetId: req.params.id,
      details: { resolution },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    res.json({ success: true, ticket })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/admin/support/tickets/:id/review - AI/manual review result
router.post('/tickets/:id/review', async (req, res) => {
  try {
    const { aiResult, action } = req.body

    if (action === 'ai_review') {
      const { data: ticket, error } = await supabase
        .from('support_tickets')
        .update({ ai_review_result: aiResult, status: 'ai_review', updated_at: new Date().toISOString() })
        .eq('id', req.params.id)
        .select()
        .single()

      if (error) throw error

      res.json({ success: true, ticket })
    } else if (action === 'approve') {
      const { data: ticket } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('id', req.params.id)
        .single()

      if (ticket?.ip_address) {
        await supabase
          .from('blocked_ips')
          .update({ is_active: false, review_status: 'approved' })
          .eq('ip_address', ticket.ip_address)
      }

      await supabase
        .from('support_tickets')
        .update({ status: 'resolved', resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', req.params.id)

      await logAudit({
        actorType: 'admin',
        actorId: req.admin.id,
        actorUsername: req.admin.username,
        action: 'approve_ip_unblock',
        targetType: 'support_ticket',
        targetId: req.params.id,
        details: { aiResult },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent']
      })

      res.json({ success: true, message: 'IP unblocked and ticket resolved' })
    } else if (action === 'reject') {
      await supabase
        .from('support_tickets')
        .update({ status: 'closed', resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', req.params.id)

      await logAudit({
        actorType: 'admin',
        actorId: req.admin.id,
        actorUsername: req.admin.username,
        action: 'reject_ip_unblock',
        targetType: 'support_ticket',
        targetId: req.params.id,
        details: { aiResult },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
        severity: 'warning'
      })

      res.json({ success: true, message: 'Request rejected' })
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/support/request - User submits support request (IP unblock)
router.post('/request', async (req, res) => {
  try {
    const { userId, ip_address, subject, description } = req.body

    if (!ip_address || !subject) {
      return res.status(400).json({ success: false, error: 'IP address and subject are required' })
    }

    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: userId || null,
        ip_address,
        subject,
        description,
        status: 'ai_review',
        priority: 'medium'
      })
      .select()
      .single()

    if (error) throw error

    res.json({ success: true, ticket, message: 'Support request submitted. AI review in progress.' })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
