import { supabase } from '../lib/supabase'
import { saveDraft, publishContent, getLanding } from './landing'
import { recordWithdrawal } from './aviator'

export const getPublicLanding = getLanding

const BUCKET = 'landing-images'

export async function getWallet() {
  try {
    const { data, error } = await supabase
      .from('admin_wallet')
      .select('*')
      .eq('id', 'main')
      .single()
    if (error) return null
    return data
  } catch {
    return null
  }
}

export async function uploadImage(file) {
  const ext = file.name.split('.').pop()
  const path = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`

  let { data: listData } = await supabase.storage.listBuckets()
  const bucketExists = listData?.some(b => b.id === BUCKET)

  if (!bucketExists) {
    const { error: createError } = await supabase.storage.createBucket(BUCKET, { public: true })
    if (createError && createError.message !== 'Bucket already exists') {
      throw new Error(`Failed to create bucket: ${createError.message}`)
    }
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (error) throw error

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path)
  return urlData.publicUrl
}

export async function getAdminLanding() {
  const { data, error } = await supabase
    .from('landing_content')
    .select('draft_json, live_json, updated_at')
    .eq('id', 'main')
    .single()
  if (error) return null
  return data
}

export async function getAllTransactions() {
  const { data, error } = await supabase
    .from('transactions')
    .select('*, users(username, email)')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return []
  return (data || []).map(tx => ({
    id: tx.id,
    type: tx.type,
    user: tx.users?.username || tx.user_id || 'Unknown',
    amount: Number(tx.amount),
    date: new Date(tx.created_at).toLocaleDateString(),
    status: tx.status,
  }))
}

export async function getPendingWithdrawals() {
  const { data, error } = await supabase
    .from('withdrawals')
    .select('*, users(username, email)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(100)
  if (error) return []
  return (data || []).map(w => ({
    id: w.id,
    user: w.users?.username || w.user_id || 'Unknown',
    amount: Number(w.amount),
    date: new Date(w.created_at).toLocaleDateString(),
    status: w.status,
    method: w.method,
  }))
}

export async function approveWithdrawal(id, action) {
  const newStatus = action === 'approve' ? 'approved' : 'rejected'
  
  if (action === 'approve') {
    const { data: wd } = await supabase
      .from('withdrawals')
      .select('amount')
      .eq('id', id)
      .single()
    if (wd) {
      await recordWithdrawal(Number(wd.amount))
    }
  }
  
  const { data, error } = await supabase
    .from('withdrawals')
    .update({ status: newStatus, processed_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateWithdrawalSettings(settings) {
  const { data, error } = await supabase
    .from('admin_wallet')
    .update({
      min_deposit: settings.dailyDepositLimit,
      max_deposit: settings.dailyDepositLimit,
      min_withdrawal: settings.minAmount,
      max_withdrawal: settings.withdrawalLimitPerUser,
      withdrawal_fee_percent: settings.feePercent,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 'main')
    .select()
    .single()
  if (error) throw error
  return data
}

export { saveDraft, publishContent }
