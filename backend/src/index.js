import express from 'express'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { createServer } from 'http'
import authRoutes from './routes/auth.js'
import adminRoutes from './routes/admin.js'
import userRoutes from './routes/users.js'
import auditRoutes from './routes/audit.js'
import adminAccountRoutes from './routes/admin-accounts.js'
import securityRoutes from './routes/security.js'
import supportRoutes from './routes/support.js'
import { landingContent } from './store.js'
import { initGameEngine, getCurrentState, requestManualCrash, updateSettings, placeBet, cashoutBet } from './gameEngine.js'
import { authenticateAdmin, getRequiredRoleForPath, requireRole } from './middleware/auth.js'
import { createAuditMiddleware } from './middleware/auditLogger.js'
import { createLoginRateLimiter } from './middleware/rateLimiter.js'

dotenv.config()

const app = express()
const server = createServer(app)

// Root endpoint for testing
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: '8769bet backend running' })
})

// Simple CORS - allow specific origins
const ALLOWED_ORIGINS = [
  'https://eight769bet.onrender.com',
  'https://eight769bet-frontend.onrender.com',
  'https://eight769bet-admin.onrender.com',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000'
]

app.use((req, res, next) => {
  const origin = req.headers.origin
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin)
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200)
  }
  next()
})

// Body parser
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use('/public', express.static('public'))

// Login rate limiter
const loginLimiter = createLoginRateLimiter()
app.use('/api/auth/login', loginLimiter)

// Audit middleware for admin routes
app.use('/api/admin', createAuditMiddleware())

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/admin/users', authenticateAdmin, userRoutes)
app.use('/api/admin/audit', authenticateAdmin, auditRoutes)
app.use('/api/admin/accounts', authenticateAdmin, adminAccountRoutes)
app.use('/api/admin/security', authenticateAdmin, securityRoutes)
app.use('/api/admin/support', authenticateAdmin, supportRoutes)
app.use('/api/support', supportRoutes)

// Public landing page endpoint
app.get('/api/landing', (req, res) => {
  res.json(landingContent)
})

// ── Aviator Game API ─────────────────────────────────────────
// Get current game state
app.get('/api/aviator/state', (req, res) => {
  res.json(getCurrentState())
})

// Manual crash request (admin only)
app.post('/api/aviator/crash', (req, res) => {
  requestManualCrash()
  res.json({ success: true })
})

// Update game settings (admin only)
app.post('/api/aviator/settings', (req, res) => {
  updateSettings(req.body)
  res.json({ success: true, settings: require('./gameEngine.js').settings })
})

// Place bet
app.post('/api/aviator/bet', (req, res) => {
  const result = placeBet(req.body)
  res.json(result)
})

// Cash out
app.post('/api/aviator/cashout', (req, res) => {
  const result = cashoutBet(req.body.userId, req.body.betNum)
  res.json(result)
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    game: getCurrentState()
  })
})

// House edge pool endpoint
app.get('/api/aviator/house-edge', (req, res) => {
  const state = getCurrentState()
  res.json(state.settings || {})
})

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: 'Something went wrong!' })
})

const PORT = process.env.PORT || 3006

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  // Initialize the Aviator game engine with WebSocket
  initGameEngine(server)
})
