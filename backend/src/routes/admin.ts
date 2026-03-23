const express = require('express')
const router = express.Router()
const path = require('path')
const fs = require('fs')

// Mock DB helpers (in real app replace with DB calls)
let landingContent = {
  id: 'lp1',
  title: 'Welcome to 399bet',
  subtitle: 'Best AI-powered bets',
  logoUrl: '/public/uploads/logo.png',
  banners: ['/public/uploads/banner1.png'],
  showAnnouncements: true,
  primaryColor: '#10B981',
  secondaryColor: '#34D399',
  gameCards: []
}
let wallet = { balance: 100000, drawdown: 12 }
let withdrawals = []
let transactions = []

// Landing content
router.get('/landing/content', (req, res) => {
  res.json(landingContent)
})
router.post('/landing/draft', (req, res) => {
  landingContent = { ...landingContent, ...req.body.content }
  res.json({ ok: true, content: landingContent, status: 'draft' })
})
router.post('/landing/publish', (req, res) => {
  landingContent = { ...landingContent, ...req.body.content }
  // In real app, push to live site via webhook/socket
  res.json({ ok: true, content: landingContent, status: 'live' })
})
router.post('/landing/upload', (req, res) => {
  // Placeholder: in real app this would use multer to save file
  // Accepts a single image under 'image' field
  // For demo, pretend success and return a path
  const fakePath = '/public/uploads/' + Date.now() + '.png'
  res.json({ path: fakePath })
})

// Wallet and transactions
router.get('/wallet', (req, res) => {
  res.json(wallet)
})
router.get('/transactions', (req, res) => {
  res.json(transactions)
})
router.get('/withdrawals', (req, res) => {
  // status=pending to fetch pending
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
  // Save settings in a real DB
  res.json({ ok: true, settings: req.body })
})

module.exports = router
