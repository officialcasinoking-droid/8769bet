import express from 'express'
import { body } from 'express-validator'
import { login, signup, forgotPassword, changePassword, getMe, resetPassword } from '../controllers/authController.js'

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

export default router
