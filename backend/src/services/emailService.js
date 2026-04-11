import nodemailer from 'nodemailer'
import dotenv from 'dotenv'

dotenv.config()

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email, resetToken, username) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@399bet.com',
      to: email,
      subject: 'Password Reset - 399bet',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">399bet Password Reset</h2>
          <p>Hello ${username},</p>
          <p>You requested a password reset for your 399bet account.</p>
          <p>Click the button below to reset your password:</p>
          <a href="${resetUrl}" 
             style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; 
                    text-decoration: none; border-radius: 6px; margin: 16px 0;">
            Reset Password
          </a>
          <p>This link will expire in 1 hour.</p>
          <p style="color: #666; font-size: 14px;">
            If you didn't request this, please ignore this email. Your password will remain unchanged.
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          <p style="color: #999; font-size: 12px;">
            © 2026 399bet. All rights reserved.
          </p>
        </div>
      `
    }

    try {
      await this.transporter.sendMail(mailOptions)
      console.log(`✅ Password reset email sent to ${email}`)
      return { success: true }
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(email, username, referralCode) {
    const loginUrl = `${process.env.FRONTEND_URL}/login`
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@399bet.com',
      to: email,
      subject: 'Welcome to 399bet! 🎉',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">Welcome to 399bet! 🎉</h2>
          <p>Hello ${username},</p>
          <p>Welcome to 399bet - your AI-powered betting platform!</p>
          <p>Your account has been successfully created with a welcome bonus.</p>
          <p><strong>Your Referral Code:</strong> <code style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px;">${referralCode}</code></p>
          <p>Share this code with friends to earn referral bonuses!</p>
          <a href="${loginUrl}" 
             style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; 
                    text-decoration: none; border-radius: 6px; margin: 16px 0;">
            Start Playing
          </a>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
          <p style="color: #999; font-size: 12px;">
            © 2026 399bet. All rights reserved.
          </p>
        </div>
      `
    }

    try {
      await this.transporter.sendMail(mailOptions)
      console.log(`✅ Welcome email sent to ${email}`)
      return { success: true }
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * Test email configuration
   */
  async testConnection() {
    try {
      await this.transporter.verify()
      console.log('✅ Email server is ready to send messages')
      return true
    } catch (error) {
      console.error('❌ Email configuration error:', error.message)
      return false
    }
  }
}

export default new EmailService()
