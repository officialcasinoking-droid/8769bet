import crypto from 'crypto'

const CSRF_SECRET = process.env.CSRF_SECRET || process.env.JWT_SECRET || 'dev-csrf-secret-change-in-production'
const CSRF_TOKEN_LENGTH = 32
const CSRF_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000

const csrfTokens = new Map()

export function generateCSRFToken(sessionId) {
  const token = crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex')
  const expiresAt = Date.now() + CSRF_TOKEN_EXPIRY_MS
  csrfTokens.set(sessionId, { token, expiresAt })
  return token
}

export function validateCSRFToken(sessionId, token) {
  const stored = csrfTokens.get(sessionId)
  if (!stored) return false
  if (Date.now() > stored.expiresAt) {
    csrfTokens.delete(sessionId)
    return false
  }
  return crypto.timingSafeEqual(Buffer.from(stored.token), Buffer.from(token))
}

export function csrfMiddleware() {
  return (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next()
    }

    const sessionId = req.headers['x-session-id'] || req.ip
    const token = req.headers['x-csrf-token'] || req.body._csrf || req.query._csrf

    if (!validateCSRFToken(sessionId, token)) {
      return res.status(403).json({ 
        error: 'Invalid CSRF token',
        code: 'CSRF_INVALID'
      })
    }

    next()
  }
}

export function csrfTokenEndpoint(req, res) {
  const sessionId = req.headers['x-session-id'] || req.ip
  const token = generateCSRFToken(sessionId)
  res.json({ csrfToken: token })
}

function cleanupExpiredTokens() {
  const now = Date.now()
  for (const [sessionId, data] of csrfTokens.entries()) {
    if (now > data.expiresAt) {
      csrfTokens.delete(sessionId)
    }
  }
}

setInterval(cleanupExpiredTokens, 60 * 60 * 1000)