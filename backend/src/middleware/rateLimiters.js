import rateLimit from 'express-rate-limit'

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
})

export const strictRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
})

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many auth attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
})

export const depositRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Too many deposit requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
})

export const withdrawalRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: 'Too many withdrawal requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
})

export const pinRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many PIN attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
})

export const adminRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many admin requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false
})

export const csrfRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests' },
  standardHeaders: true,
  legacyHeaders: false
})