/**
 * Rate Limiter Middleware
 * Login rate limiting and account lockout protection
 */

const loginAttempts = new Map()

const MAX_ATTEMPTS = 10
const LOCKOUT_DURATION_MS = 30 * 60 * 1000
const WINDOW_MS = 15 * 60 * 1000
const MAX_WINDOW_ATTEMPTS = 5

export function getLoginAttempts(identifier) {
  const now = Date.now()
  const attempts = loginAttempts.get(identifier) || []
  const recent = attempts.filter(a => now - a.timestamp < WINDOW_MS)
  loginAttempts.set(identifier, recent)
  return recent
}

export function recordLoginAttempt(identifier, success) {
  const now = Date.now()
  const attempts = loginAttempts.get(identifier) || []
  attempts.push({ timestamp: now, success })

  const recent = attempts.filter(a => now - a.timestamp < WINDOW_MS)
  loginAttempts.set(identifier, recent)

  return recent
}

export function isAccountLocked(identifier) {
  const attempts = getLoginAttempts(identifier)
  const failedAttempts = attempts.filter(a => !a.success)
  return failedAttempts.length >= MAX_ATTEMPTS
}

export function getLockoutRemaining(identifier) {
  const attempts = getLoginAttempts(identifier)
  const failedAttempts = attempts.filter(a => !a.success)

  if (failedAttempts.length < MAX_ATTEMPTS) {
    return 0
  }

  const oldestFailed = failedAttempts[0].timestamp
  const unlockTime = oldestFailed + LOCKOUT_DURATION_MS
  const remaining = unlockTime - Date.now()

  return Math.max(0, remaining)
}

export function createLoginRateLimiter() {
  return (req, res, next) => {
    const identifier = req.body.username || req.body.email || req.ip

    if (!identifier) {
      return next()
    }

    const lockoutRemaining = getLockoutRemaining(identifier)
    if (lockoutRemaining > 0) {
      return res.status(429).json({
        error: 'Too many failed login attempts',
        locked: true,
        retryAfter: Math.ceil(lockoutRemaining / 1000)
      })
    }

    const attempts = getLoginAttempts(identifier)
    if (attempts.length >= MAX_WINDOW_ATTEMPTS) {
      return res.status(429).json({
        error: 'Too many attempts, please wait before trying again',
        retryAfter: Math.ceil((WINDOW_MS - (Date.now() - attempts[0].timestamp)) / 1000)
      })
    }

    next()
  }
}

export function clearLoginAttempts(identifier) {
  loginAttempts.delete(identifier)
}

export function cleanupOldAttempts() {
  const now = Date.now()
  for (const [key, attempts] of loginAttempts.entries()) {
    const recent = attempts.filter(a => now - a.timestamp < WINDOW_MS)
    if (recent.length === 0) {
      loginAttempts.delete(key)
    } else {
      loginAttempts.set(key, recent)
    }
  }
}

setInterval(cleanupOldAttempts, 5 * 60 * 1000)
