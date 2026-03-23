// Shared data store - single source of truth for landing content

let landingContent = {
  id: 'lp1',

  // Hero
  title: 'Welcome to 399bet',
  subtitle: 'Best AI-powered bets with AI Agent',
  heroImage: '',

  // Logo
  logoUrl: '',

  // Banner images
  banners: [],

  // Theme colors (CSS variables)
  colors: {
    primary: '#10b981',
    accent: '#6366f1',
    background: '#0f172a',
    text: '#f1f5f9',
    success: '#22c55e',
    warning: '#f59e0b',
    jackpot: '#f59e0b',
  },

  // Section visibility
  showAnnouncements: true,
  showJackpot: true,
  showCategories: true,
  showGameCards: true,

  // Content
  gameCards: [],
  footerText: '© 2026 399bet. All rights reserved.',
  announcements: [
    { id: '1', text: 'New users get 100% bonus on first deposit!', expiry: '2026-12-31' },
    { id: '2', text: 'AI Agent accuracy is now 94%!', expiry: '2026-12-31' },
  ],
  categories: [
    { id: '1', name: 'Slots', icon: '🤑' },
    { id: '2', name: 'Crash', icon: '🚀' },
    { id: '3', name: 'Live', icon: '♠️' },
    { id: '4', name: 'AI Pick', icon: '🤖' },
  ],

  // Top bar (header)
  headerBg: '#0f172a',
  headerLogoUrl: '',
  headerSearchPlaceholder: 'Search games...',
  headerShowLogin: true,
  headerShowSignup: true,
}

let wallet = { balance: 100000, drawdown: 12 }
let withdrawals = []
let transactions = []
let withdrawalSettings = {
  dailyDepositLimit: 1000,
  withdrawalLimitPerUser: 5000,
  minAmount: 10,
  maxAmount: 10000,
  feePercent: 1,
}

export { landingContent, wallet, withdrawals, transactions, withdrawalSettings }
