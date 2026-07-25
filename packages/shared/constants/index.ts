export const GAME_PHASES = {
  BETTING: 'betting',
  FLYING: 'flying',
  CRASHED: 'crashed'
} as const;

export type GamePhase = typeof GAME_PHASES[keyof typeof GAME_PHASES];

export const BET_STATUS = {
  PENDING: 'pending',
  WON: 'won',
  LOST: 'lost',
  CANCELLED: 'cancelled'
} as const;

export type BetStatus = typeof BET_STATUS[keyof typeof BET_STATUS];

export const TRANSACTION_TYPES = {
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal',
  BET: 'bet',
  WIN: 'win',
  BONUS: 'bonus',
  REFUND: 'refund'
} as const;

export type TransactionType = typeof TRANSACTION_TYPES[keyof typeof TRANSACTION_TYPES];

export const TRANSACTION_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  COMPLETED: 'completed',
  FAILED: 'failed'
} as const;

export type TransactionStatus = typeof TRANSACTION_STATUS[keyof typeof TRANSACTION_STATUS];

export const WITHDRAWAL_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PAID: 'paid'
} as const;

export type WithdrawalStatus = typeof WITHDRAWAL_STATUS[keyof typeof WITHDRAWAL_STATUS];

export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  GOD: 'god'
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const ADMIN_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  SUPPORT: 'support'
} as const;

export type AdminRole = typeof ADMIN_ROLES[keyof typeof ADMIN_ROLES];

export const ADMIN_PERMISSIONS = {
  ALL: 'all',
  USERS: 'users',
  DEPOSITS: 'deposits',
  WITHDRAWALS: 'withdrawals',
  GAMES: 'games',
  SETTINGS: 'settings',
  AUDIT: 'audit',
  SUPPORT: 'support',
  SECURITY: 'security',
  LANDING: 'landing',
  WALLET: 'wallet',
  TRANSACTIONS: 'transactions',
  AI: 'ai'
} as const;

export type AdminPermission = typeof ADMIN_PERMISSIONS[keyof typeof ADMIN_PERMISSIONS];

export const GAME_CATEGORIES = {
  SLOTS: 'Slots',
  CRASH: 'Crash',
  LIVE: 'Live',
  FISHING: 'Fishing',
  TABLE: 'Table',
  LOTTERY: 'Lottery'
} as const;

export type GameCategory = typeof GAME_CATEGORIES[keyof typeof GAME_CATEGORIES];

export const RISK_LEVELS = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High'
} as const;

export type RiskLevel = typeof RISK_LEVELS[keyof typeof RISK_LEVELS];

export const CURRENCIES = {
  PKR: { symbol: '₨', code: 'PKR', rate: 1, name: 'Pakistani Rupee' },
  INR: { symbol: '₹', code: 'INR', rate: 0.28, name: 'Indian Rupee' },
  USD: { symbol: '$', code: 'USD', rate: 0.0036, name: 'US Dollar' }
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

export const PAYMENT_METHOD_TYPES = {
  UPI: 'upi',
  BANK: 'bank',
  CRYPTO: 'crypto',
  WALLET: 'wallet'
} as const;

export type PaymentMethodType = typeof PAYMENT_METHOD_TYPES[keyof typeof PAYMENT_METHOD_TYPES];

export const COUNTRIES = {
  PAKISTAN: 'pakistan',
  INDIA: 'india',
  GLOBAL: 'global'
} as const;

export type Country = typeof COUNTRIES[keyof typeof COUNTRIES];

export const AUTO_CASHOUT_VALUES = [1.1, 1.2, 1.3, 1.5, 1.7, 2.0, 2.5, 3.0, 5.0, 10.0] as const;

export const QUICK_AMOUNTS = [100, 500, 1000, 2000, 5000, 10000, 20000, 50000] as const;

export const BOT_NAMES = [
  'Ali_Khan', 'Sara_Ahmed', 'Usman_Ali', 'Fatima_Zahid', 'Ahmed_Raza',
  'Ayesha_Khan', 'Bilal_Hassan', 'Zainab_Malik', 'Hassan_Ali', 'Mariam_Waseem',
  'Hamza_Saeed', 'Hira_Nawaz', 'Saad_Afzal', 'Nadia_Iqbal', 'Faisal_Imran',
  'Sana_Ansari', 'Kamran_Shahid', 'Mehwish_Butt', 'Adnan_Yousaf', 'Sadia_Parveen'
] as const;

export const AVIATOR_DEFAULTS = {
  HOUSE_EDGE: 0.05,
  HE_MODE: 'off' as 'off' | 'smart' | 'aggressive',
  HE_TARGET_PCT: 5,
  HE_MIN_SECS: 3,
  HE_MAX_SECS: 50,
  AUTO_TARGET_SECS: 8,
  WAIT_TIME_SECONDS: 8,
  TICK_INTERVAL_MS: 50,
  MIN_BET: 10,
  MAX_BET: 50000,
  MAX_CRASH: 10000
} as const;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    SIGNUP: '/api/auth/signup',
    ME: '/api/auth/me',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password',
    CHANGE_PASSWORD: '/api/auth/change-password',
    SET_PIN: '/api/auth/users/:id/set-pin',
    VERIFY_PIN: '/api/auth/users/:id/verify-pin',
    WITHDRAWAL_ACCOUNTS: '/api/auth/users/:id/withdrawal-accounts'
  },
  ADMIN: {
    LOGIN: '/api/admin/login',
    DEPOSITS: '/api/admin/deposits',
    WITHDRAWALS: '/api/admin/withdrawals',
    USERS: '/api/admin/users',
    AUDIT: '/api/admin/audit',
    ACCOUNTS: '/api/admin/accounts',
    SECURITY: '/api/admin/security',
    SUPPORT: '/api/admin/support',
    GAME: '/api/admin/game',
    LANDING: '/api/admin/landing',
    WALLET: '/api/admin/wallet',
    TRANSACTIONS: '/api/admin/transactions',
    AI_WITHDRAWAL: '/api/admin/ai/withdrawal'
  },
  AVIATOR: {
    STATE: '/api/aviator/state',
    CRASH: '/api/aviator/crash',
    SETTINGS: '/api/aviator/settings',
    BET: '/api/aviator/bet',
    CASHOUT: '/api/aviator/cashout',
    CANCEL_BET: '/api/aviator/cancel-bet',
    BET_HISTORY: '/api/aviator/bet-history',
    HOUSE_EDGE: '/api/aviator/house-edge'
  },
  DEPOSITS: '/api/deposits',
  WITHDRAWALS: '/api/withdrawals',
  PAYMENT_METHODS: '/api/payment-methods',
  LANDING: '/api/landing',
  HEALTH: '/api/health',
  UPLOAD: '/api/upload',
  CSRF_TOKEN: '/api/csrf-token'
} as const;