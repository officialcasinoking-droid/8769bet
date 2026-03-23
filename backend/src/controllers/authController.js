import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { validationResult } from 'express-validator'
import { v4 as uuidv4 } from 'uuid'

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
const JWT_EXPIRES_IN = '7d'

// Mock database - In production, replace with actual MySQL queries
const users = new Map()
const admins = new Map()

// Initialize demo admin
admins.set('admin', {
  id: 1,
  username: 'admin',
  password_hash: bcrypt.hashSync('admin123', 10),
  role: 'god',
  must_change_password: false
})

// Initialize demo user
users.set('demo@399bet.com', {
  id: 1,
  username: 'demo',
  email: 'demo@399bet.com',
  password_hash: bcrypt.hashSync('demo123', 10),
  full_name: 'Demo User',
  balance: 100.00,
  avatar: null,
  referral_code: 'DEMO2024',
  created_at: new Date()
})

export const login = async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const { username, password } = req.body

    // Check if admin login
    if (username === 'admin' && password === 'admin123') {
      const admin = admins.get('admin')
      const token = jwt.sign(
        { id: admin.id, username: admin.username, role: admin.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      )

      return res.json({
        success: true,
        token,
        user: {
          id: admin.id,
          username: admin.username,
          role: admin.role,
          must_change_password: admin.must_change_password
        },
        redirect: '/admin'
      })
    }

    // Find user by email or username
    let user = null
    for (const [email, u] of users) {
      if (u.email === username || u.username === username) {
        user = u
        break
      }
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: 'user' },
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
        referral_code: user.referral_code
      },
      redirect: '/'
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
    for (const [existingEmail] of users) {
      if (existingEmail === email) {
        return res.status(400).json({ error: 'Email already registered' })
      }
    }

    // Check if username already exists
    for (const [, u] of users) {
      if (u.username === username) {
        return res.status(400).json({ error: 'Username already taken' })
      }
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 12)

    // Generate unique referral code
    const userReferralCode = username.toUpperCase().slice(0, 4) + Math.random().toString(36).substring(2, 6).toUpperCase()

    // Create new user
    const newUser = {
      id: users.size + 1,
      username,
      email,
      password_hash,
      full_name,
      balance: 50.00, // Welcome bonus
      avatar: null,
      referral_code: userReferralCode,
      used_referral: referral_code || null,
      created_at: new Date()
    }

    users.set(email, newUser)

    // If referral code used, credit referrer (mock)
    if (referral_code) {
      console.log(`Referral code ${referral_code} credited`)
    }

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
      message: 'Welcome bonus of ₹50 credited!',
      redirect: '/'
    })
  } catch (error) {
    console.error('Signup error:', error)
    res.status(500).json({ error: 'Server error' })
  }
}

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body

    // Find user
    let user = null
    for (const [e, u] of users) {
      if (e === email) {
        user = u
        break
      }
    }

    if (!user) {
      // Don't reveal if email exists
      return res.json({ success: true, message: 'If email exists, reset link sent' })
    }

    // Generate reset token (in production, save to DB with expiry)
    const resetToken = uuidv4()
    
    // In production: save resetToken to DB with expiry
    console.log(`Password reset token for ${email}: ${resetToken}`)

    res.json({
      success: true,
      message: 'Password reset email sent (check console in demo)',
      // Demo only: include token
      reset_token: resetToken
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
    let user = null
    for (const [, u] of users) {
      if (u.id === user_id) {
        user = u
        break
      }
    }

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Verify current password
    const isValid = await bcrypt.compare(current_password, user.password_hash)
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' })
    }

    // Hash new password
    user.password_hash = await bcrypt.hash(new_password, 12)

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
    let user = null
    if (decoded.role === 'admin') {
      user = admins.get(decoded.username)
    } else {
      for (const [, u] of users) {
        if (u.id === decoded.id) {
          user = u
          break
        }
      }
    }

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
        role: decoded.role
      }
    })
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' })
  }
}
