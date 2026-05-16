/**
 * Audit Logger Middleware
 * Logs all admin actions to the audit_logs table and broadcasts via WebSocket
 */

import { supabase } from '../lib/supabase.js'

let auditClients = new Set()

export function initAuditWebSocket(server) {
  const { WebSocketServer } = await import('ws')
  const wss = new WebSocketServer({ server, path: '/ws/audit' })

  wss.on('connection', (ws) => {
    auditClients.add(ws)

    ws.on('close', () => {
      auditClients.delete(ws)
    })

    ws.on('error', () => {
      auditClients.delete(ws)
    })
  })

  return wss
}

export function broadcastAudit(event) {
  const msg = JSON.stringify(event)
  auditClients.forEach(client => {
    if (client.readyState === 1) {
      client.send(msg)
    }
  })
}

export async function logAudit({
  actorType,
  actorId,
  actorUsername,
  action,
  targetType = null,
  targetId = null,
  targetUsername = null,
  details = null,
  ipAddress = null,
  userAgent = null,
  severity = 'info',
  success = true
}) {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert({
        actor_type: actorType,
        actor_id: actorId,
        actor_username: actorUsername,
        action,
        target_type: targetType,
        target_id: targetId,
        target_username: targetUsername,
        details: details || {},
        ip_address: ipAddress,
        user_agent: userAgent,
        severity,
        success
      })
      .select()
      .single()

    if (error) {
      console.error('[AuditLogger] Failed to log:', error.message)
      return null
    }

    broadcastAudit({
      type: 'audit_log',
      log: data
    })

    return data
  } catch (err) {
    console.error('[AuditLogger] Exception:', err.message)
    return null
  }
}

export function createAuditMiddleware() {
  return async (req, res, next) => {
    const originalJson = res.json.bind(res)

    res.json = function(body) {
      const success = res.statusCode >= 200 && res.statusCode < 400

      if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE' || req.method === 'PATCH') {
        const admin = req.admin
        if (admin) {
          logAudit({
            actorType: 'admin',
            actorId: admin.id,
            actorUsername: admin.username,
            action: `${req.method} ${req.originalUrl}`,
            targetType: req.body.targetType || req.params.targetType || null,
            targetId: req.body.targetId || req.params.id || req.params.userId || null,
            targetUsername: req.body.targetUsername || null,
            details: {
              method: req.method,
              url: req.originalUrl,
              body: req.body,
              params: req.params,
              query: req.query
            },
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'],
            severity: req.method === 'DELETE' ? 'warning' : 'info',
            success
          }).catch(() => {})
        }
      }

      return originalJson(body)
    }

    next()
  }
}
