import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { landingContent, wallet, withdrawals, transactions, withdrawalSettings } from '../store.js'

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

export default router
