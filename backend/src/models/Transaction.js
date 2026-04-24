import { supabase } from '../lib/supabase.js'

/**
 * Transaction Model - Handles all financial transactions
 */
export class TransactionModel {
  /**
   * Create a new transaction
   */
  static async create(transactionData) {
    const { data, error } = await supabase
      .from('transactions')
      .insert([{
        user_id: transactionData.userId,
        type: transactionData.type, // 'deposit', 'withdrawal', 'bet', 'win', 'bonus', 'refund'
        amount: transactionData.amount,
        currency: transactionData.currency || 'PKR',
        payment_method: transactionData.paymentMethod || null,
        status: transactionData.status || 'completed',
        description: transactionData.description || null,
        reference_id: transactionData.referenceId || null,
        metadata: transactionData.metadata || {}
      }])
      .select()
      .single()

    if (error) throw error
    return data
  }

  /**
   * Get user transactions with pagination
   */
  static async findByUserId(userId, limit = 50, offset = 0) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error
    return data || []
  }

  /**
   * Get transaction by ID
   */
  static async findById(id) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) return null
    return data
  }

  /**
   * Get all transactions (admin)
   */
  static async findAll(limit = 100, offset = 0, filters = {}) {
    let query = supabase
      .from('transactions')
      .select('*, users(username, email)')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (filters.type) {
      query = query.eq('type', filters.type)
    }
    if (filters.status) {
      query = query.eq('status', filters.status)
    }
    if (filters.userId) {
      query = query.eq('user_id', filters.userId)
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  }
}

export default TransactionModel
