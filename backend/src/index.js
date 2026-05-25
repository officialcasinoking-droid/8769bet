import express from 'express'
import rateLimit from 'express-rate-limit'
import dotenv from 'dotenv'
import { createServer } from 'http'
import { supabase } from './lib/supabase.js'
import authRoutes from './routes/auth.js'
import adminRoutes from './routes/admin.js'
import userRoutes from './routes/users.js'
import auditRoutes from './routes/audit.js'
import adminAccountRoutes from './routes/admin-accounts.js'
import securityRoutes from './routes/security.js'
import supportRoutes from './routes/support.js'
import aiWithdrawalRoutes from './routes/ai-withdrawal.js'
import { landingContent } from './store.js'
import { initGameEngine, getCurrentState, requestManualCrash, updateSettings, placeBet, cashoutBet } from './gameEngine.js'
import { authenticateAdmin, getRequiredRoleForPath, requireRole } from './middleware/auth.js'
import { createAuditMiddleware, initAuditWebSocket } from './middleware/auditLogger.js'
import { createLoginRateLimiter } from './middleware/rateLimiter.js'
import multer from 'multer'

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
app.use('/api/admin/ai/withdrawal', authenticateAdmin, aiWithdrawalRoutes)
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
app.post('/api/aviator/bet', async (req, res) => {
  const result = await placeBet(req.body)
  res.json(result)
})

// Cash out
app.post('/api/aviator/cashout', async (req, res) => {
  const result = await cashoutBet(req.body.userId, req.body.betNum)
  res.json(result)
})

// Cancel bet
app.post('/api/aviator/cancel-bet', async (req, res) => {
  const { userId, betNum, betId } = req.body
  const bet = currentBets.find(b => b.userId === userId && b.betNum === betNum && b.status === 'pending')
  if (!bet) {
    return res.json({ success: false, error: 'Bet not found' })
  }

  // Refund balance
  if (supabaseAvailable) {
    try {
      const { data: user } = await supabase.from('users').select('balance').eq('id', userId).single()
      if (user) {
        await supabase.from('users').update({ balance: Number(user.balance) + bet.amount, updated_at: new Date().toISOString() }).eq('id', userId)
      }
      await supabase.from('aviator_bets').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', betId)
    } catch (e) {
      console.error('[cancel-bet] DB error:', e.message)
    }
  }

  currentBets = currentBets.filter(b => b.id !== betId)
  broadcast({ type: 'bets_update', bets: currentBets })
  res.json({ success: true })
})

// Get user bet history
app.get('/api/aviator/bet-history', async (req, res) => {
  const { userId } = req.query
  if (!userId) return res.status(400).json({ error: 'userId required' })

  try {
    const { data: bets, error } = await supabase
      .from('aviator_bets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('[bet-history] Supabase error:', error.message)
      return res.json({ success: true, bets: [], stats: { totalBets: 0, wonBets: 0, lostBets: 0, totalWagered: 0, totalWon: 0, profit: 0 } })
    }

    // Calculate stats
    const totalBets = bets?.length || 0
    const wonBets = bets?.filter(b => b.status === 'won').length || 0
    const lostBets = bets?.filter(b => b.status === 'lost').length || 0
    const totalWagered = bets?.reduce((sum, b) => sum + Number(b.amount), 0) || 0
    const totalWon = bets?.filter(b => b.status === 'won').reduce((sum, b) => sum + Number(b.win_amount), 0) || 0

    res.json({
      success: true,
      bets: bets || [],
      stats: { totalBets, wonBets, lostBets, totalWagered, totalWon, profit: totalWon - totalWagered }
    })
  } catch (err) {
    console.error('[bet-history] Exception:', err.message)
    res.json({ success: true, bets: [], stats: { totalBets: 0, wonBets: 0, lostBets: 0, totalWagered: 0, totalWon: 0, profit: 0 } })
  }
})

// Create deposit request
app.post('/api/deposits', async (req, res) => {
  const { userId, amount, method, transactionId, screenshotUrl } = req.body
  
  if (!userId || !amount) {
    return res.status(400).json({ error: 'userId and amount required' })
  }

  if (!screenshotUrl) {
    return res.status(400).json({ error: 'Transaction screenshot is required' })
  }

  try {
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('username, balance')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const now = new Date().toISOString()

    const { data: deposit, error: depError } = await supabase
      .from('deposits')
      .insert({
        user_id: userId,
        amount: amount,
        method: method || 'bank',
        transaction_id: transactionId || null,
        screenshot_url: screenshotUrl || null,
        status: 'pending',
        created_at: now,
        processed_at: null,
        rejection_reason: null
      })
      .select()
      .single()

    if (depError) {
      console.error('[deposit] Create error:', depError.message)
      return res.status(500).json({ error: 'Failed to create deposit request' })
    }

    // Check if this payment method has auto_approve enabled
    let autoApproved = false
    const { data: payMethod } = await supabase
      .from('payment_methods')
      .select('auto_approve, max_amount')
      .eq('type', method || 'bank')
      .eq('is_active', true)
      .single()

    if (payMethod?.auto_approve && Number(amount) <= Number(payMethod.max_amount)) {
      // Auto-approve the deposit
      const { error: approveError } = await supabase
        .from('deposits')
        .update({ status: 'approved', processed_at: now })
        .eq('id', deposit.id)

      if (!approveError) {
        // Add balance to user
        await supabase
          .from('users')
          .update({ balance: Number(user.balance) + Number(amount), updated_at: now })
          .eq('id', userId)
        autoApproved = true
      }
    }

    // Log to audit_logs
    const { error: auditError } = await supabase
      .from('audit_logs')
      .insert({
        actor_type: 'user',
        actor_id: userId,
        actor_username: user.username,
        action: autoApproved ? 'deposit_auto_approved' : 'request_deposit',
        target_type: 'deposit',
        target_id: deposit.id,
        details: { amount, method, auto_approved: autoApproved, screenshot_url: screenshotUrl },
        ip_address: req.ip,
        user_agent: req.headers['user-agent'],
        severity: 'info',
        success: true,
        timestamp: now
      })

    if (auditError) {
      console.error('[deposit] Audit log error:', auditError.message)
    }

    console.log(`[deposit] Created: ID ${deposit.id}, User ${user.username}, Amount ${amount}${autoApproved ? ' [AUTO-APPROVED]' : ''}`)
    res.json({ success: true, deposit: { ...deposit, auto_approved: autoApproved } })
  } catch (err) {
    console.error('[deposit] Exception:', err.message)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Get user deposits
app.get('/api/deposits/:userId', async (req, res) => {
  const { userId } = req.params
  
  try {
    const { data, error } = await supabase
      .from('deposits')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('[deposit] Fetch error:', error.message)
      return res.status(500).json({ error: 'Failed to fetch deposits' })
    }

    res.json(data || [])
  } catch (err) {
    console.error('[deposit] Exception:', err.message)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Create withdrawal request
app.post('/api/withdrawals', async (req, res) => {
  const { userId, amount, method, details } = req.body
  
  if (!userId || !amount) {
    return res.status(400).json({ error: 'userId and amount required' })
  }

  try {
    // Get user balance
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('balance, username')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found' })
    }

    if (Number(user.balance) < amount) {
      return res.status(400).json({ error: 'Insufficient balance' })
    }

    const fee = Math.round(amount * 0.01 * 100) / 100
    const netAmount = Math.round(amount * 0.99 * 100) / 100
    const newBalance = Number(user.balance) - amount
    const now = new Date().toISOString()

    // Create withdrawal record
    const { data: withdrawal, error: wdError } = await supabase
      .from('withdrawals')
      .insert({
        user_id: userId,
        amount: amount,
        fee: fee,
        net_amount: netAmount,
        method: method || 'bank',
        details: details || {},
        status: 'pending',
        created_at: now,
        processed_at: null,
        rejection_reason: null
      })
      .select()
      .single()

    if (wdError) {
      console.error('[withdrawal] Create error:', wdError.message)
      return res.status(500).json({ error: 'Failed to create withdrawal' })
    }

    // Deduct balance
    await supabase
      .from('users')
      .update({ balance: newBalance, updated_at: now })
      .eq('id', userId)

    // Log to audit_logs
    try {
      await supabase
        .from('audit_logs')
        .insert({
          actor_type: 'user',
          actor_id: userId,
          actor_username: user.username,
          action: 'request_withdrawal',
          target_type: 'withdrawal',
          target_id: withdrawal.id,
          details: { amount, method, fee, netAmount },
          ip_address: req.ip,
          user_agent: req.headers['user-agent'],
          severity: 'info',
          success: true,
          timestamp: now
        })
    } catch (_auditErr) {
      console.error('[withdrawal] Audit log error:', _auditErr.message)
    }

    console.log(`[withdrawal] Created: ${user.username} requested ₨${amount}`)
    res.json({ success: true, withdrawal })
  } catch (err) {
    console.error('[withdrawal] Exception:', err.message)
    res.status(500).json({ error: 'Internal server error' })
  }
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

// ── Public Payment Methods ──────────────────────────────────
app.get('/api/payment-methods', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('payment_methods')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[payment-methods] Error:', error.message)
      return res.status(500).json({ error: 'Failed to fetch payment methods' })
    }

    res.json(data || [])
  } catch (err) {
    console.error('[payment-methods] Exception:', err.message)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// ── File Upload ────────────────────────────────────────────
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed'))
    }
  }
})

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const ext = req.file.originalname.split('.').pop()
    const fileName = `uploads/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`

    const { data, error } = await supabase.storage
      .from('landing-images')
      .upload(fileName, req.file.buffer, {
        contentType: req.file.mimetype,
        cacheControl: '3600',
        upsert: true
      })

    if (error) {
      console.error('[upload] Storage error:', error.message)
      return res.status(500).json({ error: 'Failed to upload file' })
    }

    const { data: urlData } = supabase.storage
      .from('landing-images')
      .getPublicUrl(data.path)

    res.json({ success: true, url: urlData.publicUrl })
  } catch (err) {
    console.error('[upload] Exception:', err.message)
    res.status(500).json({ error: 'Upload failed' })
  }
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
  // Initialize audit WebSocket
  initAuditWebSocket(server)
})
