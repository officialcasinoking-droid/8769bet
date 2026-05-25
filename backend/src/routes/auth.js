import express from 'express'
import { body } from 'express-validator'
import { login, signup, forgotPassword, changePassword, getMe, resetPassword } from '../controllers/authController.js'
import { supabase } from '../lib/supabase.js'
import bcrypt from 'bcryptjs'
import { logAudit } from '../middleware/auditLogger.js'

const router = express.Router()

// Login validation
const loginValidation = [
  body('username').trim().notEmpty().withMessage('Username or email is required'),
  body('password').notEmpty().withMessage('Password is required')
]

// Signup validation
const signupValidation = [
  body('full_name').trim().notEmpty().withMessage('Full name is required').isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('username').trim().notEmpty().withMessage('Username is required').isLength({ min: 3 }).withMessage('Username must be at least 3 characters').matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only contain letters, numbers, and underscores'),
  body('email').trim().isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters').matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one uppercase, one lowercase, and one number'),
  body('confirm_password').custom((value, { req }) => {
    if (value !== req.body.password) {
      throw new Error('Passwords do not match')
    }
    return true
  }),
  body('terms').isBoolean().withMessage('You must accept the terms').equals('true').withMessage('You must accept the terms')
]

// Reset password validation
const resetPasswordValidation = [
  body('token').trim().notEmpty().withMessage('Reset token is required'),
  body('new_password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters').matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).withMessage('Password must contain at least one uppercase, one lowercase, and one number')
]

// Routes
router.post('/login', loginValidation, login)
router.post('/signup', signupValidation, signup)
router.post('/forgot-password', [body('email').isEmail().withMessage('Valid email is required')], forgotPassword)
router.post('/reset-password', resetPasswordValidation, resetPassword)
router.post('/change-password', changePassword)
router.get('/me', getMe)

// Simple PIN encryption/decryption using JWT_SECRET
function encryptPin(pin, secret) {
  let result = ''
  for (let i = 0; i < pin.length; i++) {
    result += String.fromCharCode(pin.charCodeAt(i) ^ secret.charCodeAt(i % secret.length))
  }
  return Buffer.from(result).toString('base64')
}

function decryptPin(encrypted, secret) {
  try {
    const decoded = Buffer.from(encrypted, 'base64').toString()
    let result = ''
    for (let i = 0; i < decoded.length; i++) {
      result += String.fromCharCode(decoded.charCodeAt(i) ^ secret.charCodeAt(i % secret.length))
    }
    return result
  } catch {
    return null
  }
}

// User withdrawal PIN routes
router.post('/users/:id/set-pin', async (req, res) => {
  try {
    const { pin } = req.body
    if (!pin || pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN must be 6 digits' })
    }

    const pinHash = await bcrypt.hash(pin, 12)
    const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production-2026'
    const encryptedPin = encryptPin(pin, JWT_SECRET)

    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('username')
      .eq('id', req.params.id)
      .single()

    if (fetchError || !user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const { error } = await supabase
      .from('users')
      .update({ withdrawal_pin_hash: pinHash, withdrawal_pin_encrypted: encryptedPin, withdrawal_pin_set: true, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)

    if (error) throw error

    await logAudit({
      actorType: 'user',
      actorId: req.params.id,
      actorUsername: user.username,
      action: 'set_withdrawal_pin',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    res.json({ success: true, message: 'PIN set successfully' })
  } catch (err) {
    console.error('Set PIN error:', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/users/:id/verify-pin', async (req, res) => {
  try {
    const { pin } = req.body

    const { data: user, error } = await supabase
      .from('users')
      .select('withdrawal_pin_hash, withdrawal_pin_set')
      .eq('id', req.params.id)
      .single()

    if (error || !user || !user.withdrawal_pin_set) {
      return res.json({ success: false, error: 'PIN not set' })
    }

    const isValid = await bcrypt.compare(pin, user.withdrawal_pin_hash)
    res.json({ success: isValid })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/users/:id/withdrawal-accounts', async (req, res) => {
  try {
    const { account } = req.body
    if (!account || !account.type || !account.account_number) {
      return res.status(400).json({ error: 'Account type and number are required' })
    }

    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('withdrawal_accounts, username')
      .eq('id', req.params.id)
      .single()

    if (fetchError || !user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const accounts = Array.isArray(user.withdrawal_accounts) ? user.withdrawal_accounts : []
    const exists = accounts.some(a => a.account_number === account.account_number && a.type === account.type)
    if (exists) {
      return res.status(400).json({ error: 'This account is already added' })
    }

    const newAccount = {
      id: crypto.randomUUID(),
      type: account.type,
      cnic: account.cnic || '',
      real_name: account.real_name || '',
      account_number: account.account_number,
      account_name: account.account_name || '',
      bank_name: account.bank_name || '',
      created_at: new Date().toISOString()
    }

    const updatedAccounts = [...accounts, newAccount]

    const { error } = await supabase
      .from('users')
      .update({ withdrawal_accounts: updatedAccounts, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)

    if (error) throw error

    await logAudit({
      actorType: 'user',
      actorId: req.params.id,
      actorUsername: user.username,
      action: 'add_withdrawal_account',
      details: { type: account.type, account_number: account.account_number },
      ipAddress: req.ip,
      userAgent: req.headers['user-agent']
    })

    res.json({ success: true, account: newAccount })
  } catch (err) {
    console.error('Add withdrawal account error:', err)
    res.status(500).json({ success: false, error: err.message })
  }
})

router.delete('/users/:id/withdrawal-accounts/:accountId', async (req, res) => {
  try {
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('withdrawal_accounts, username')
      .eq('id', req.params.id)
      .single()

    if (fetchError || !user) {
      return res.status(404).json({ error: 'User not found' })
    }

    const accounts = Array.isArray(user.withdrawal_accounts) ? user.withdrawal_accounts : []
    const updatedAccounts = accounts.filter(a => a.id !== req.params.accountId)

    const { error } = await supabase
      .from('users')
      .update({ withdrawal_accounts: updatedAccounts, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)

    if (error) throw error

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

export { encryptPin, decryptPin }
export default router
