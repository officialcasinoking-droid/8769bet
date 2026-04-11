import supabase from '../lib/supabase.js'
import bcrypt from 'bcryptjs'

/**
 * User Model - Interfaces with Supabase
 */
export class UserModel {
  /**
   * Find user by email or username
   */
  static async findByCredential(credential) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .or(`email.eq.${credential},username.eq.${credential}`)
      .single()

    if (error || !data) return null
    return data
  }

  /**
   * Find user by ID
   */
  static async findById(id) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) return null
    return data
  }

  /**
   * Find user by email
   */
  static async findByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error || !data) return null
    return data
  }

  /**
   * Find user by username
   */
  static async findByUsername(username) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single()

    if (error || !data) return null
    return data
  }

  /**
   * Create new user
   */
  static async create(userData) {
    const { data, error } = await supabase
      .from('users')
      .insert([{
        username: userData.username,
        email: userData.email,
        password_hash: userData.password_hash,
        full_name: userData.full_name,
        balance: userData.balance || 0,
        avatar: userData.avatar || null,
        referral_code: userData.referral_code,
        used_referral_code: userData.used_referral_code || null,
        role: 'user',
        status: 'active'
      }])
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Update user balance
   */
  static async updateBalance(userId, amount) {
    const { data, error } = await supabase
      .from('users')
      .update({ balance: amount })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Update user password
   */
  static async updatePassword(userId, passwordHash) {
    const { data, error } = await supabase
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get all users (admin function)
   */
  static async findAll(limit = 100, offset = 0) {
    const { data, error } = await supabase
      .from('users')
      .select('id, username, email, full_name, balance, avatar, referral_code, status, created_at')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error
    return data || []
  }

  /**
   * Update user status
   */
  static async updateStatus(userId, status) {
    const { data, error } = await supabase
      .from('users')
      .update({ status })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

export default UserModel
