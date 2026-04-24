import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { validationResult } from 'express-validator'
import { v4 as uuidv4 } from 'uuid'
import UserModel from '../models/User.js'
import emailService from '../services/emailService.js'
import { supabase } from '../lib/supabase.js'
import dotenv from 'dotenv'

dotenv.config()

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

export const login = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { username, password } = req.body

    // Find user by email or username
    const user = await UserModel.findByCredential(username)

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    // Check if account is active
    if (user.status === 'banned' || user.status === 'suspended') {
      return res.status(403).json({ error: 'Account is suspended or banned' })
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        email: user.email, 
        role: user.role || 'user' 
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        balance: user.balance,
        avatar: user.avatar,
        referral_code: user.referral_code,
        role: user.role
      },
      redirect: user.role === 'admin' ? '/admin' : '/'
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: 'Server error' })
  }
}

export const signup = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { full_name, username, email, password, referral_code } = req.body

    // Check if email already exists
    const existingEmail = await UserModel.findByEmail(email)
    if (existingEmail) {
      return res.status(400).json({ error: 'Email already registered' })
    }

    // Check if username already exists
    const existingUsername = await UserModel.findByUsername(username)
    if (existingUsername) {
      return res.status(400).json({ error: 'Username already taken' })
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12)

    // Generate unique referral code
    const userReferralCode = username.toUpperCase().slice(0, 4) + Math.random().toString(36).substring(2, 6).toUpperCase()

    // Create new user with welcome bonus
    const newUser = await UserModel.create({
      username,
      email,
      password_hash,
      full_name,
      balance: 50.00, // Welcome bonus
      referral_code: userReferralCode,
      used_referral_code: referral_code || null
    })

    // If referral code used, credit referrer
    if (referral_code) {
      try {
        const referrer = await supabase
          .from('users')
          .select('id, balance')
          .eq('referral_code', referral_code)
          .single()

        if (referrer.data) {
          // Credit referrer with bonus
          const referralBonus = 10.00
          await UserModel.updateBalance(referrer.data.id, referrer.data.balance + referralBonus)
          
          // Record referral in referrals table
          await supabase
            .from('referrals')
            .insert([{
              referrer_id: referrer.data.id,
              referred_id: newUser.id,
              level: 1,
              bonus_amount: referralBonus,
              status: 'completed'
            }])
          
          console.log(`Referral bonus credited to user ${referrer.data.id}`)
        }
      } catch (refError) {
        console.error('Referral credit error:', refError)
        // Don't fail signup if referral credit fails
      }
    }

    // Send welcome email (non-blocking)
    emailService.sendWelcomeEmail(email, username, userReferralCode).catch(err => {
      console.error('Welcome email failed:', err)
    })

    // Generate JWT
    const token = jwt.sign(
      { id: newUser.id, username: newUser.username, email: newUser.email, role: 'user' },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    )

    res.status(201).json({
      success: true,
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        full_name: newUser.full_name,
        balance: newUser.balance,
        avatar: newUser.avatar,
        referral_code: newUser.referral_code
      },
      message: 'Welcome bonus of PKR 50 credited!',
      redirect: '/'
    })
  } catch (error) {
    console.error('Signup error:', error)
    res.status(500).json({ error: 'Server error during registration' })
  }
}

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body

    // Find user
    const user = await UserModel.findByEmail(email)

    if (!user) {
      // Don't reveal if email exists (security best practice)
      return res.json({ success: true, message: 'If email exists, reset link sent' })
    }

    // Generate reset token
    const resetToken = uuidv4()
    const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour from now

    // Save reset token to database
    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .insert([{
        user_id: user.id,
        token: resetToken,
        expires_at: resetTokenExpiry.toISOString(),
        used: false
      }])

    if (tokenError) {
      console.error('Password reset token save error:', tokenError)
      // Continue anyway - token logged for development
    }

    // Send password reset email
    const emailResult = await emailService.sendPasswordResetEmail(
      email, 
      resetToken, 
      user.full_name || user.username
    )

    if (!emailResult.success) {
      console.error('Failed to send reset email:', emailResult.error)
      // In development, still return token
      if (process.env.NODE_ENV === 'development') {
        return res.json({
          success: true,
          message: 'Password reset email sent (check console in demo)',
          reset_token: resetToken
        })
      }
    }

    res.json({
      success: true,
      message: 'Password reset email sent'
    })
  } catch (error) {
    console.error('Forgot password error:', error)
    res.status(500).json({ error: 'Server error' })
  }
}

export const changePassword = async (req, res) => {
  try {
    const { user_id, current_password, new_password } = req.body

    // Find user
    const user = await UserModel.findById(user_id)

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Verify current password
    const isValid = await bcrypt.compare(current_password, user.password_hash)
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' })
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(new_password, 12)
    await UserModel.updatePassword(user_id, newPasswordHash)

    res.json({ success: true, message: 'Password changed successfully' })
  } catch (error) {
    console.error('Change password error:', error)
    res.status(500).json({ error: 'Server error' })
  }
}

export const getMe = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]
    if (!token) {
      return res.status(401).json({ error: 'No token provided' })
    }

    const decoded = jwt.verify(token, JWT_SECRET)

    // Find user
    const user = await UserModel.findById(decoded.id)

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        balance: user.balance,
        avatar: user.avatar,
        role: user.role || decoded.role
      }
    })
  } catch (error) {
    console.error('Get me error:', error)
    res.status(401).json({ error: 'Invalid token' })
  }
}

/**
 * Reset password with token
 */
export const resetPassword = async (req, res) => {
  try {
    const { token, new_password } = req.body

    if (!token || !new_password) {
      return res.status(400).json({ error: 'Token and new password are required' })
    }

    // Find valid reset token
    const { data: resetData, error: resetError } = await supabase
      .from('password_reset_tokens')
      .select('*, users(*)')
      .eq('token', token)
      .eq('used', false)
      .single()

    if (resetError || !resetData) {
      return res.status(400).json({ error: 'Invalid or expired reset token' })
    }

    // Check if token is expired
    if (new Date(resetData.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Reset token has expired' })
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(new_password, 12)

    // Update user password
    await UserModel.updatePassword(resetData.user_id, passwordHash)

    // Mark token as used
    await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('id', resetData.id)

    res.json({ success: true, message: 'Password reset successfully' })
  } catch (error) {
    console.error('Reset password error:', error)
    res.status(500).json({ error: 'Server error during password reset' })
  }
}
