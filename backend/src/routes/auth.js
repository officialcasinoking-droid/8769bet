import express from 'express'
import crypto from 'crypto'
import { login, signup, forgotPassword, changePassword, getMe, resetPassword } from '../controllers/authController.js'
import { supabase } from '../lib/supabase.js'
import bcrypt from 'bcryptjs'
import { logAudit } from '../middleware/auditLogger.js'
import { encryptPin, decryptPin, hashPin, verifyPin, verifyPinFormat } from '../lib/crypto.js'
import { validate, setPinSchema, withdrawalAccountSchema } from '../middleware/validation.js'

const router = express.Router()

// User withdrawal PIN routes
router.post('/users/:id/set-pin', validate(setPinSchema), async (req, res) => {
  try {
    const { pin } = req.body
    if (!verifyPinFormat(pin)) {
      return res.status(400).json({ error: 'PIN must be 6 digits' })
    }

    const pinHash = await hashPin(pin)
    const encryptedPin = encryptPin(pin)

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

router.post('/users/:id/verify-pin', validate(setPinSchema), async (req, res) => {
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

    const isValid = await verifyPin(pin, user.withdrawal_pin_hash)
    res.json({ success: isValid })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

router.post('/users/:id/withdrawal-accounts', validate(withdrawalAccountSchema), async (req, res) => {
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

export { encryptPin, decryptPin, hashPin, verifyPin }
export default router
