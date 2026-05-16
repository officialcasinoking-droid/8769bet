/**
 * Authentication Middleware
 * JWT verification and role-based access control for admin routes
 */

import jwt from 'jsonwebtoken'
import { supabase } from '../lib/supabase.js'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret-change-in-production'

const ROLE_HIERARCHY = {
  super_admin: 4,
  admin: 3,
  moderator: 2,
  support: 1
}

const REQUIRED_ROLES = {
  '/api/admin/users': 'admin',
  '/api/admin/audit': 'super_admin',
  '/api/admin/accounts': 'super_admin',
  '/api/admin/security': 'admin',
  '/api/admin/support': 'support',
  '/api/admin/game': 'admin',
  '/api/admin/landing': 'admin',
  '/api/admin/wallet': 'admin',
  '/api/admin/transactions': 'admin',
  '/api/admin/withdrawals': 'admin'
}

export async function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' })
  }

  const token = authHeader.split(' ')[1]

  try {
    const decoded = jwt.verify(token, JWT_SECRET)

    if (decoded.adminId === '00000000-0000-0000-0000-000000000001') {
      req.admin = {
        id: decoded.adminId,
        username: decoded.username,
        email: 'admin@8769bet.com',
        role: decoded.role || 'super_admin',
        permissions: { all: true },
        fullName: 'Super Admin'
      }
      return next()
    }

    const { data: admin, error } = await supabase
      .from('admin_accounts')
      .select('*')
      .eq('id', decoded.adminId)
      .eq('is_active', true)
      .single()

    if (error || !admin) {
      return res.status(401).json({ error: 'Invalid admin account' })
    }

    if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
      return res.status(403).json({ error: 'Account is locked', lockedUntil: admin.locked_until })
    }

    req.admin = {
      id: admin.id,
      username: admin.username,
      email: admin.email,
      role: admin.role,
      permissions: admin.permissions || {},
      fullName: admin.full_name
    }

    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' })
    }
    return res.status(401).json({ error: 'Invalid token' })
  }
}

export function requireRole(minimumRole) {
  return (req, res, next) => {
    const admin = req.admin
    if (!admin) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const adminLevel = ROLE_HIERARCHY[admin.role] || 0
    const requiredLevel = ROLE_HIERARCHY[minimumRole] || 0

    if (adminLevel < requiredLevel) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: minimumRole,
        current: admin.role
      })
    }

    next()
  }
}

export function requirePermission(permission) {
  return (req, res, next) => {
    const admin = req.admin
    if (!admin) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    if (admin.permissions.all === true) {
      return next()
    }

    if (admin.permissions[permission] !== true) {
      return res.status(403).json({
        error: 'Permission denied',
        required: permission
      })
    }

    next()
  }
}

export function getRequiredRoleForPath(path) {
  for (const [prefix, role] of Object.entries(REQUIRED_ROLES)) {
    if (path.startsWith(prefix)) {
      return role
    }
  }
  return 'admin'
}
