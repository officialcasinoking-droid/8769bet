import { z } from 'zod'

// Auth schemas
export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required')
})

export const signupSchema = z.object({
  full_name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  username: z.string().trim().min(3, 'Username must be at least 3 characters').regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().trim().email('Valid email is required').toLowerCase(),
  password: z.string().min(8, 'Password must be at least 8 characters').regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  confirm_password: z.string(),
  terms: z.literal(true, { errorMap: () => ({ message: 'You must accept the terms' }) })
}).refine(data => data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password']
})

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Valid email is required').toLowerCase()
})

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, 'Reset token is required'),
  new_password: z.string().min(8, 'Password must be at least 8 characters').regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number')
})

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string().min(8, 'Password must be at least 8 characters').regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number'),
  confirm_password: z.string()
}).refine(data => data.new_password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password']
})

// PIN schemas
export const setPinSchema = z.object({
  pin: z.string().regex(/^\d{6}$/, 'PIN must be exactly 6 digits')
})

export const verifyPinSchema = z.object({
  pin: z.string().regex(/^\d{6}$/, 'PIN must be exactly 6 digits')
})

export const resetPinSchema = z.object({
  pin: z.string().regex(/^\d{6}$/, 'PIN must be exactly 6 digits')
})

// Withdrawal account schemas
export const withdrawalAccountSchema = z.object({
  type: z.enum(['jazzcash', 'easypaisa', 'bank', 'crypto'], { errorMap: () => ({ message: 'Invalid account type' }) }),
  account_number: z.string().trim().min(1, 'Account number is required'),
  account_name: z.string().trim().optional(),
  bank_name: z.string().trim().optional(),
  cnic: z.string().trim().optional(),
  real_name: z.string().trim().optional()
})

// Deposit schemas
export const depositSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  amount: z.number().positive('Amount must be positive').min(100, 'Minimum deposit is 100'),
  method: z.string().trim().min(1, 'Payment method is required'),
  transactionId: z.string().trim().optional(),
  screenshotUrl: z.string().url('Valid screenshot URL is required')
})

// Withdrawal schemas
export const withdrawalSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
  amount: z.number().positive('Amount must be positive').min(100, 'Minimum withdrawal is 100').max(50000, 'Maximum withdrawal is 50,000'),
  method: z.string().trim().min(1, 'Payment method is required').optional(),
  details: z.record(z.any()).optional()
})

// Admin user schemas
export const adminCreateUserSchema = z.object({
  username: z.string().trim().min(3).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  email: z.string().email().toLowerCase(),
  full_name: z.string().trim().min(2).optional(),
  role: z.enum(['user', 'admin']).optional(),
  balance: z.number().min(0).optional()
})

export const adminUpdateUserSchema = z.object({
  username: z.string().trim().min(3).regex(/^[a-zA-Z0-9_]+$/).optional(),
  email: z.string().email().toLowerCase().optional(),
  full_name: z.string().trim().min(2).optional(),
  role: z.enum(['user', 'admin']).optional(),
  is_active: z.boolean().optional(),
  balance: z.number().min(0).optional()
})

// Admin account schemas
export const adminCreateAccountSchema = z.object({
  username: z.string().trim().min(3).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
  email: z.string().email().toLowerCase().optional(),
  full_name: z.string().trim().min(2).optional(),
  role: z.enum(['super_admin', 'admin', 'moderator', 'support']).optional(),
  permissions: z.record(z.boolean()).optional()
})

export const adminUpdateAccountSchema = z.object({
  email: z.string().email().toLowerCase().optional(),
  full_name: z.string().trim().min(2).optional(),
  role: z.enum(['super_admin', 'admin', 'moderator', 'support']).optional(),
  is_active: z.boolean().optional(),
  permissions: z.record(z.boolean()).optional()
})

export const adminChangePasswordSchema = z.object({
  newPassword: z.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
})

// Landing content schema
export const landingContentSchema = z.object({
  title: z.string().trim().min(1).optional(),
  subtitle: z.string().trim().optional(),
  heroImage: z.string().url().optional().or(z.literal('')),
  logoUrl: z.string().url().optional().or(z.literal('')),
  colors: z.object({
    primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    accent: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    background: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    text: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    success: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    warning: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
    jackpot: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()
  }).optional(),
  showAnnouncements: z.boolean().optional(),
  showJackpot: z.boolean().optional(),
  showCategories: z.boolean().optional(),
  showGameCards: z.boolean().optional(),
  gameCards: z.array(z.object({
    id: z.string(),
    gameSlug: z.string(),
    title: z.string(),
    description: z.string().optional(),
    imageUrl: z.string().url().optional()
  })).optional(),
  footerText: z.string().optional(),
  announcements: z.array(z.object({
    id: z.string(),
    text: z.string(),
    expiry: z.string().optional()
  })).optional(),
  categories: z.array(z.object({
    id: z.string(),
    name: z.string(),
    icon: z.string()
  })).optional(),
  headerBg: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  headerLogoUrl: z.string().url().optional().or(z.literal('')),
  headerSearchPlaceholder: z.string().optional(),
  headerShowLogin: z.boolean().optional(),
  headerShowSignup: z.boolean().optional()
})

// Game management schemas
export const gameCreateSchema = z.object({
  name: z.string().trim().min(1),
  provider: z.string().trim().optional(),
  category: z.enum(['Slots', 'Crash', 'Live', 'Fishing', 'Table', 'Lottery']).optional(),
  rtp: z.number().min(0).max(100).optional(),
  thumbnail_url: z.string().url().optional().or(z.literal('')),
  max_multiplier: z.string().optional(),
  is_active: z.boolean().optional(),
  description: z.string().optional(),
  slug: z.string().trim().regex(/^[a-z0-9-]+$/).optional(),
  min_bet: z.number().positive().optional(),
  max_bet: z.number().positive().optional(),
  ai_enabled: z.boolean().optional(),
  maintenance_mode: z.boolean().optional(),
  maintenance_reason: z.string().optional(),
  order_index: z.number().int().min(0).optional(),
  risk_level: z.enum(['Low', 'Medium', 'High']).optional(),
  provably_fair: z.boolean().optional()
})

export const gameUpdateSchema = gameCreateSchema.partial()

// Aviator settings schema
export const aviatorSettingsSchema = z.object({
  house_edge: z.number().min(0).max(1).optional(),
  he_mode: z.enum(['off', 'smart', 'aggressive']).optional(),
  he_target_pct: z.number().min(0).max(100).optional(),
  he_min_secs: z.number().int().min(1).optional(),
  he_max_secs: z.number().int().min(1).optional(),
  auto_target_secs: z.number().int().min(1).optional(),
  wait_time_seconds: z.number().int().min(1).optional(),
  tick_interval_ms: z.number().int().min(10).optional(),
  min_bet: z.number().positive().optional(),
  max_bet: z.number().positive().optional(),
  is_enabled: z.boolean().optional()
})

// Pagination/filter schema
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
})

export const userFiltersSchema = paginationSchema.extend({
  search: z.string().optional(),
  role: z.enum(['user', 'admin']).optional(),
  is_active: z.boolean().optional(),
  minBalance: z.coerce.number().optional(),
  maxBalance: z.coerce.number().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional()
})

export const transactionFiltersSchema = paginationSchema.extend({
  userId: z.string().uuid().optional(),
  type: z.enum(['deposit', 'withdrawal', 'bet', 'win', 'bonus', 'refund']).optional(),
  status: z.enum(['pending', 'approved', 'rejected', 'completed', 'failed']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional()
})

// Validation middleware factory
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body)
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors
      })
    }
    req.validated = result.data
    next()
  }
}

export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query)
    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: result.error.flatten().fieldErrors
      })
    }
    req.validatedQuery = result.data
    next()
  }
}

export function validateParams(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.params)
    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid route parameters',
        details: result.error.flatten().fieldErrors
      })
    }
    req.validatedParams = result.data
    next()
  }
}