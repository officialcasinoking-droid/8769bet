import express from 'express'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { createServer } from 'http'
import authRoutes from './routes/auth.js'
import adminRoutes from './routes/admin.js'
import { landingContent } from './store.js'
import { initGameEngine, getCurrentState, requestManualCrash, updateSettings, placeBet, cashoutBet } from './gameEngine.js'

dotenv.config()

const app = express()
const server = createServer(app)

// Simple CORS - allow all for now
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
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

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/admin', adminRoutes)

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
