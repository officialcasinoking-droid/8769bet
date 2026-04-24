import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { landingContent, wallet, withdrawals, transactions, withdrawalSettings } from '../store.js'
import { requestManualCrash, startNewRound, updateSettings, getCurrentState, settings, houseEdgePool } from '../gameEngine.js'

const router = express.Router()

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true })
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${Date.now()}-${Math.random().toString(36).substring(7)}${ext}`)
  },
})
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } })

// Landing content - uses shared store
router.get('/landing/content', (req, res) => {
  res.json(landingContent)
})

router.post('/landing/draft', (req, res) => {
  const { content } = req.body
  if (content) {
    Object.assign(landingContent, content)
  }
  res.json({ ok: true, content: landingContent, status: 'draft' })
})

router.post('/landing/publish', (req, res) => {
  const { content } = req.body
  if (content) {
    Object.assign(landingContent, content)
  }
  console.log('✅ Changes published – live preview updated')
  console.log('📝 Title:', landingContent.title, '| Primary:', landingContent.colors?.primary, '| Footer:', landingContent.footerText)
  res.json({ ok: true, content: { ...landingContent }, status: 'live' })
})

// Real file upload with multer — returns full URL
const BASE_URL = process.env.BASE_URL || 'http://localhost:3006'
router.post('/landing/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' })
  }
  const fullUrl = `${BASE_URL}/uploads/${req.file.filename}`
  console.log('📷 Image uploaded:', fullUrl)
  res.json({ path: fullUrl, filename: req.file.filename })
})

// Wallet and transactions
router.get('/wallet', (req, res) => {
  res.json(wallet)
})

router.get('/transactions', (req, res) => {
  res.json(transactions)
})

router.get('/withdrawals', (req, res) => {
  const { status } = req.query
  const data = withdrawals.filter(w => !status || w.status === status)
  res.json(data)
})

router.post('/withdrawals/:id', (req, res) => {
  const { id } = req.params
  const { action } = req.body
  withdrawals = withdrawals.map(w => w.id === id ? { ...w, status: action === 'approve' ? 'approved' : 'rejected' } : w)
  res.json({ ok: true, id, action })
})

router.post('/withdrawal/settings', (req, res) => {
  Object.assign(withdrawalSettings, req.body)
  res.json({ ok: true, settings: withdrawalSettings })
})

// ── Game Control Endpoints ────────────────────────

// Force crash current round
router.post('/game/crash', (req, res) => {
  try {
    requestManualCrash()
    res.json({ success: true, message: 'Crash signal sent' })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// Start new round immediately
router.post('/game/new-round', (req, res) => {
  try {
    startNewRound()
    res.json({ success: true, message: 'New round started' })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// Get current game state
router.get('/game/state', (req, res) => {
  try {
    const state = getCurrentState()
    res.json({ success: true, state })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// Get game statistics
router.get('/game/stats', (req, res) => {
  try {
    res.json({
      success: true,
      stats: {
        houseEdgePool,
        currentPhase: getCurrentState().phase,
        totalRounds: houseEdgePool.roundsPlayed,
        totalBets: houseEdgePool.totalBets,
        totalWinnings: houseEdgePool.totalWinnings,
      }
    })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// Update game settings
router.post('/game/settings', (req, res) => {
  try {
    updateSettings(req.body)
    res.json({ success: true, settings: { ...settings } })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export default router
