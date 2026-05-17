import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { toast } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter } from '../ui/Dialog'
import { FormField, Input, Select, Toggle, Button, Badge } from '../ui/FormElements'
import AIWithdrawalAgent from './AIWithdrawalAgent'
import {
  CreditCard, Plus, Edit2, Trash2, Search, Download,
  RefreshCw, Check, X, Upload, Globe, Smartphone, Building2, Coins,
  ArrowUpRight, ArrowDownRight, Clock, CheckCircle, XCircle, Filter,
  ChevronLeft, ChevronRight, ArrowLeftRight, TrendingUp, Wallet, FileText,
  Loader2, Sparkles
} from 'lucide-react'

const BUCKET = 'landing-images'
const API_URL = import.meta.env.VITE_API_URL || 'https://eight769bet-backend.onrender.com'

// ── Tabs Config ──────────────────────────────────────────────
const TABS = [
  { id: 'all', label: 'All Transactions', icon: FileText },
  { id: 'pending', label: 'Pending', icon: Clock },
  { id: 'completed', label: 'Completed', icon: CheckCircle },
  { id: 'payment-methods', label: 'Payment Methods', icon: CreditCard },
  { id: 'ai-assistant', label: 'AI Assistant', icon: Sparkles },
]

// ── Status Config ────────────────────────────────────────────
const STATUS_CONFIG = {
  pending: { color: 'bg-amber-500/15 text-amber-400 border-amber-500/20', icon: Clock },
  approved: { color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', icon: Check },
  rejected: { color: 'bg-red-500/15 text-red-400 border-red-500/20', icon: X },
  completed: { color: 'bg-blue-500/15 text-blue-400 border-blue-500/20', icon: CheckCircle },
  paid: { color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', icon: CheckCircle },
  failed: { color: 'bg-red-500/15 text-red-400 border-red-500/20', icon: XCircle },
}

const TYPE_CONFIG = {
  deposit: { color: 'text-emerald-400', icon: ArrowDownRight, label: 'Deposit' },
  withdrawal: { color: 'text-red-400', icon: ArrowUpRight, label: 'Withdrawal' },
  bet: { color: 'text-amber-400', icon: ArrowUpRight, label: 'Bet' },
  win: { color: 'text-emerald-400', icon: ArrowDownRight, label: 'Win' },
  bonus: { color: 'text-blue-400', icon: Gift, label: 'Bonus' },
  refund: { color: 'text-purple-400', icon: ArrowDownRight, label: 'Refund' },
}

// ── Gift icon from lucide ────────────────────────────────────
function Gift(props) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>
}

// ── API Functions ────────────────────────────────────────────
async function getAllTransactions() {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return []
  return data || []
}

async function getPendingTransactions() {
  try {
    const adminUser = JSON.parse(localStorage.getItem('admin_user') || '{}')
    const response = await fetch(`${API_URL}/api/admin/withdrawals?status=pending`, {
      headers: { 'Authorization': `Bearer ${adminUser.token}` }
    })
    if (!response.ok) return []
    const data = await response.json()
    return data || []
  } catch (err) {
    console.error('Failed to fetch pending withdrawals:', err)
    return []
  }
}

async function getCompletedTransactions() {
  try {
    const adminUser = JSON.parse(localStorage.getItem('admin_user') || '{}')
    const response = await fetch(`${API_URL}/api/admin/withdrawals?status=approved`, {
      headers: { 'Authorization': `Bearer ${adminUser.token}` }
    })
    if (!response.ok) return []
    const data = await response.json()
    return data || []
  } catch (err) {
    console.error('Failed to fetch completed withdrawals:', err)
    return []
  }
}

async function getPaymentMethods() {
  const { data, error } = await supabase
    .from('payment_methods')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return []
  return data || []
}

async function approveWithdrawal(id) {
  const adminUser = JSON.parse(localStorage.getItem('admin_user') || '{}')
  const response = await fetch(`${API_URL}/api/admin/withdrawals/${id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminUser.token}`
    },
    body: JSON.stringify({
      action: 'approve',
      adminId: adminUser.admin?.id,
      adminUsername: adminUser.admin?.username
    })
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Failed to approve')
  return data
}

async function rejectWithdrawal(id, reason) {
  const adminUser = JSON.parse(localStorage.getItem('admin_user') || '{}')
  const response = await fetch(`${API_URL}/api/admin/withdrawals/${id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminUser.token}`
    },
    body: JSON.stringify({
      action: 'reject',
      adminId: adminUser.admin?.id,
      adminUsername: adminUser.admin?.username,
      rejectionReason: reason
    })
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Failed to reject')
  return data
}

async function savePaymentMethod(method) {
  if (method.id) {
    const { data, error } = await supabase
      .from('payment_methods')
      .update({ ...method, updated_at: new Date().toISOString() })
      .eq('id', method.id)
      .select()
      .single()
    if (error) throw error
    return { ...data, _action: 'update' }
  } else {
    const { data, error } = await supabase
      .from('payment_methods')
      .insert(method)
      .select()
      .single()
    if (error) throw error
    return { ...data, _action: 'create' }
  }
}

async function deletePaymentMethod(id) {
  const { error } = await supabase.from('payment_methods').delete().eq('id', id)
  if (error) throw error
}

async function uploadLogo(file) {
  const ext = file.name.split('.').pop()
  const path = `logos/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
  const { data, error } = await supabase.storage.from(BUCKET).upload(path, file, { cacheControl: '3600', upsert: true })
  if (error) throw error
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path)
  return urlData.publicUrl
}

// ── CSV Export ───────────────────────────────────────────────
function exportCSV(data, filename) {
  if (!data.length) return
  const headers = Object.keys(data[0])
  const csv = [
    headers.join(','),
    ...data.map(row => headers.map(h => `"${String(row[h] || '').replace(/"/g, '""')}"`).join(','))
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ── Transaction Row ──────────────────────────────────────────
function TransactionRow({ tx, type }) {
  const config = TYPE_CONFIG[tx.type] || TYPE_CONFIG.deposit
  const statusInfo = STATUS_CONFIG[tx.status] || STATUS_CONFIG.pending
  const Icon = config.icon

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center justify-between px-5 py-4 hover:bg-slate-800/30 transition-colors"
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className={`w-10 h-10 rounded-xl ${config.color === 'text-emerald-400' ? 'bg-emerald-500/15' : config.color === 'text-red-400' ? 'bg-red-500/15' : 'bg-slate-500/15'} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-semibold text-white capitalize">{tx.type}</p>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${statusInfo.color}`}>
              {tx.status}
            </span>
          </div>
          <p className="text-xs text-slate-400 truncate">
            {tx.note || tx.reference || `ID: ${tx.id?.slice(0, 8)}`}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className={`text-sm font-bold ${config.color}`}>{Number(tx.amount).toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}</p>
        <p className="text-[10px] text-slate-500">{new Date(tx.created_at).toLocaleDateString('en-IN')}</p>
      </div>
    </motion.div>
  )
}

// ── Pending Withdrawal Row ───────────────────────────────────
function PendingRow({ item, onApprove, onReject }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center justify-between px-5 py-4 hover:bg-slate-800/30 transition-colors"
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
          <Clock className="w-5 h-5 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-semibold text-white">Withdrawal #{item.id?.slice(0, 8)}</p>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold border bg-amber-500/15 text-amber-400 border-amber-500/20">
              PENDING
            </span>
          </div>
          <p className="text-xs text-slate-400">
            User: {item.user_id?.slice(0, 8)} | Method: {item.method} | {new Date(item.created_at).toLocaleDateString('en-IN')}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right mr-4">
          <p className="text-sm font-bold text-white">PKR {Number(item.amount).toLocaleString('en-IN')}</p>
          {item.fee > 0 && <p className="text-[10px] text-slate-500">Fee: PKR {Number(item.fee).toLocaleString()}</p>}
        </div>
        <Button variant="outline" size="sm" onClick={() => onReject(item)}>
          <X className="w-3 h-3" /> Reject
        </Button>
        <Button size="sm" onClick={() => onApprove(item)}>
          <Check className="w-3 h-3" /> Approve
        </Button>
      </div>
    </motion.div>
  )
}

// ── Payment Method Row ───────────────────────────────────────
function PaymentMethodRow({ method, onEdit, onDelete }) {
  const countryFlags = { pakistan: '🇵🇰', india: '🇮🇳', global: '🌐' }

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-center justify-between px-5 py-4 hover:bg-slate-800/30 transition-colors"
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="w-12 h-12 rounded-xl bg-slate-800/80 flex items-center justify-center overflow-hidden border border-slate-700/50">
          {method.logo_url ? (
            <img src={method.logo_url} alt={method.name} className="w-full h-full object-contain p-1" />
          ) : (
            <CreditCard className="w-5 h-5 text-slate-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-sm font-semibold text-white">{method.name}</p>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${method.is_active ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : 'bg-slate-700/50 text-slate-500 border-slate-700'}`}>
              {method.is_active ? 'Active' : 'Inactive'}
            </span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${method.auto_approve ? 'bg-green-500/15 text-green-400 border-green-500/20' : 'bg-amber-500/15 text-amber-400 border-amber-500/20'}`}>
              {method.auto_approve ? 'Auto' : 'Manual'}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>{countryFlags[method.country] || '🌐'} {method.type}</span>
            <span>PKR {Number(method.min_amount).toLocaleString()} – PKR {Number(method.max_amount).toLocaleString()}</span>
            <span>Fee: {method.fee_percent}%</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => onEdit(method)} className="p-2 rounded-xl border border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-800 transition-all">
          <Edit2 className="w-4 h-4" />
        </button>
        <button onClick={() => onDelete(method)} className="p-2 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  )
}

// ── Payment Method Modal ─────────────────────────────────────
function PaymentMethodModal({ open, onClose, method, onSaved }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    name: '', type: 'wallet', country: 'pakistan',
    logo_url: '', min_amount: 100, max_amount: 50000,
    fee_percent: 0, daily_limit: 100000, auto_approve: false, is_active: true,
  })
  const [logoFile, setLogoFile] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && method) {
      setForm({
        id: method.id,
        name: method.name || '',
        type: method.type || 'wallet',
        country: method.country || 'pakistan',
        logo_url: method.logo_url || '',
        min_amount: Number(method.min_amount) || 100,
        max_amount: Number(method.max_amount) || 50000,
        fee_percent: Number(method.fee_percent) || 0,
        daily_limit: Number(method.daily_limit) || 100000,
        auto_approve: method.auto_approve || false,
        is_active: method.is_active !== false,
      })
    } else if (open) {
      setForm({ name: '', type: 'wallet', country: 'pakistan', logo_url: '', min_amount: 100, max_amount: 50000, fee_percent: 0, daily_limit: 100000, auto_approve: false, is_active: true })
    }
  }, [open, method])

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }))

  const handleSave = async () => {
    if (!form.name || form.name.trim().length < 2) return toast.error('Name is required')
    if (form.max_amount < form.min_amount) return toast.error('Max must be > Min')

    setSaving(true)
    try {
      let logoUrl = form.logo_url
      if (logoFile) logoUrl = await uploadLogo(logoFile)
      const payload = { ...form, logo_url: logoUrl, min_amount: Number(form.min_amount), max_amount: Number(form.max_amount), fee_percent: Number(form.fee_percent), daily_limit: Number(form.daily_limit) }
      const result = await savePaymentMethod(method ? { ...payload, id: method.id } : payload)
      toast.success(result._action === 'update' ? 'Method updated' : 'Method created')
      qc.invalidateQueries({ queryKey: ['payment_methods'] })
      onSaved?.(result)
      onClose()
    } catch (e) {
      toast.error(`Save failed: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} className="max-w-lg">
      <DialogHeader onClose={onClose}>
        <DialogTitle>{method ? 'Edit Payment Method' : 'Add Payment Method'}</DialogTitle>
        <DialogDescription>
          {method ? 'Update the details for this payment method.' : 'Configure a new payment option for your users.'}
        </DialogDescription>
      </DialogHeader>
      <DialogContent>
        <div className="space-y-5">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <label className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-600 hover:border-emerald-500 flex items-center justify-center cursor-pointer transition-colors overflow-hidden bg-slate-800/50">
              {form.logo_url ? (
                <img src={form.logo_url} alt="logo" className="w-full h-full object-contain p-1" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-slate-500">
                  <Upload className="w-5 h-5" />
                  <span className="text-[10px]">Logo</span>
                </div>
              )}
              <input type="file" accept="image/*" className="hidden" onChange={e => {
                const file = e.target.files?.[0]
                if (file && file.type.startsWith('image/')) {
                  setLogoFile(file)
                  set('logo_url', URL.createObjectURL(file))
                }
              }} />
            </label>
            <div>
              <p className="text-sm font-medium text-white">Method Logo</p>
              <p className="text-xs text-slate-500 mt-0.5">PNG, JPG up to 2MB</p>
            </div>
          </div>

          {/* Name + Type */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Method Name">
              <Input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. JazzCash" />
            </FormField>
            <FormField label="Type">
              <Select value={form.type} onChange={e => set('type', e.target.value)}>
                <option value="wallet">Mobile Wallet</option>
                <option value="bank">Bank Transfer</option>
                <option value="crypto">Crypto</option>
                <option value="upi">UPI</option>
              </Select>
            </FormField>
          </div>

          {/* Country */}
          <FormField label="Country">
            <Select value={form.country} onChange={e => set('country', e.target.value)}>
              <option value="pakistan">Pakistan</option>
              <option value="india">India</option>
              <option value="global">Global</option>
            </Select>
          </FormField>

          {/* Amounts */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Min Amount">
              <Input type="number" value={form.min_amount} onChange={e => set('min_amount', e.target.value)} />
            </FormField>
            <FormField label="Max Amount">
              <Input type="number" value={form.max_amount} onChange={e => set('max_amount', e.target.value)} />
            </FormField>
          </div>

          {/* Fee + Daily Limit */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Fee (%)" hint="0 = no fee">
              <Input type="number" step="0.1" value={form.fee_percent} onChange={e => set('fee_percent', e.target.value)} />
            </FormField>
            <FormField label="Daily Limit">
              <Input type="number" value={form.daily_limit} onChange={e => set('daily_limit', e.target.value)} />
            </FormField>
          </div>

          {/* Toggles */}
          <div className="space-y-2">
            <Toggle
              checked={form.auto_approve}
              onChange={v => set('auto_approve', v)}
              label={form.auto_approve ? 'Auto Approve — ON' : 'Auto Approve — OFF'}
              description={form.auto_approve ? 'Payments processed instantly.' : 'Manual approval required.'}
              variant={form.auto_approve ? 'emerald' : 'orange'}
            />
            <Toggle
              checked={form.is_active}
              onChange={v => set('is_active', v)}
              label={form.is_active ? 'Active — Visible to users' : 'Inactive — Hidden'}
              variant={form.is_active ? 'emerald' : 'red'}
            />
          </div>
        </div>
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Check className="w-4 h-4" /> {method ? 'Update' : 'Create'}</>}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

// ── Reject Modal ─────────────────────────────────────────────
function RejectModal({ open, onClose, item, onConfirm }) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    if (!reason.trim()) return toast.error('Reason is required')
    setLoading(true)
    await onConfirm(item, reason)
    setLoading(false)
    setReason('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} className="max-w-sm">
      <DialogHeader onClose={onClose}>
        <DialogTitle>Reject Withdrawal</DialogTitle>
        <DialogDescription>Are you sure you want to reject this withdrawal of PKR {Number(item?.amount).toLocaleString('en-IN')}?</DialogDescription>
      </DialogHeader>
      <DialogContent>
        <FormField label="Rejection Reason">
          <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Enter reason..." />
        </FormField>
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={handleConfirm} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />} Reject
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

// ── Confirm Approve Modal ────────────────────────────────────
function ApproveModal({ open, onClose, item, onConfirm }) {
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    await onConfirm(item)
    setLoading(false)
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} className="max-w-sm">
      <DialogHeader onClose={onClose}>
        <DialogTitle>Approve Withdrawal</DialogTitle>
        <DialogDescription>Approve withdrawal of PKR {Number(item?.amount).toLocaleString('en-IN')}?</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handleConfirm} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Approve
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

// ── Data Table ───────────────────────────────────────────────
function DataTable({ data, columns, search, onSearch, onExport, pagination, onPageChange }) {
  const { page, totalPages } = pagination

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder="Search..."
            className="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all"
          />
        </div>
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="w-3 h-3" /> Export CSV
        </Button>
        <span className="text-xs text-slate-500">{data.length} items</span>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">Page {page + 1} of {totalPages}</span>
          <div className="flex items-center gap-1">
            <button onClick={() => onPageChange(page - 1)} disabled={page === 0} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 disabled:opacity-30">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => onPageChange(page + 1)} disabled={page >= totalPages - 1} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 disabled:opacity-30">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────
export default function DepositWithdrawalSection() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [modal, setModal] = useState({ open: false, method: null })
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [approveItem, setApproveItem] = useState(null)
  const [rejectItem, setRejectItem] = useState(null)

  // Queries
  const { data: transactions = [], isLoading: loadingTx } = useQuery({
    queryKey: ['transactions'],
    queryFn: getAllTransactions,
    staleTime: 0,
    enabled: activeTab === 'all',
  })

  const { data: pendingItems = [], isLoading: loadingPending } = useQuery({
    queryKey: ['withdrawals-pending'],
    queryFn: getPendingTransactions,
    staleTime: 0,
    enabled: activeTab === 'pending',
  })

  const { data: completedItems = [], isLoading: loadingCompleted } = useQuery({
    queryKey: ['withdrawals-completed'],
    queryFn: getCompletedTransactions,
    staleTime: 0,
    enabled: activeTab === 'completed',
  })

  const { data: methods = [], isLoading: loadingMethods } = useQuery({
    queryKey: ['payment_methods'],
    queryFn: getPaymentMethods,
    staleTime: 0,
    enabled: activeTab === 'payment-methods',
  })

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel('tx-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        qc.invalidateQueries({ queryKey: ['transactions'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals' }, () => {
        qc.invalidateQueries({ queryKey: ['withdrawals-pending'] })
        qc.invalidateQueries({ queryKey: ['withdrawals-completed'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_methods' }, () => {
        qc.invalidateQueries({ queryKey: ['payment_methods'] })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [qc])

  // Filter + paginate
  const filteredData = useMemo(() => {
    let data = []
    if (activeTab === 'all') data = transactions
    else if (activeTab === 'pending') data = pendingItems
    else if (activeTab === 'completed') data = completedItems
    else if (activeTab === 'payment-methods') data = methods

    if (search) {
      const q = search.toLowerCase()
      data = data.filter(item =>
        item.name?.toLowerCase().includes(q) ||
        item.type?.toLowerCase().includes(q) ||
        item.status?.toLowerCase().includes(q) ||
        item.note?.toLowerCase().includes(q) ||
        item.method?.toLowerCase().includes(q) ||
        String(item.amount).includes(q)
      )
    }

    return data
  }, [activeTab, transactions, pendingItems, completedItems, methods, search])

  const pageSize = 20
  const totalPages = Math.ceil(filteredData.length / pageSize)
  const paginatedData = filteredData.slice(page * pageSize, (page + 1) * pageSize)

  // Pending count for badge
  const pendingCount = pendingItems.length

  // Handlers
  const handleApprove = async (item) => {
    try {
      await approveWithdrawal(item.id)
      toast.success('Withdrawal approved')
      qc.invalidateQueries({ queryKey: ['withdrawals-pending'] })
    } catch (e) {
      toast.error(`Approve failed: ${e.message}`)
    }
  }

  const handleReject = async (item, reason) => {
    try {
      await rejectWithdrawal(item.id, reason)
      toast.success('Withdrawal rejected')
      qc.invalidateQueries({ queryKey: ['withdrawals-pending'] })
    } catch (e) {
      toast.error(`Reject failed: ${e.message}`)
    }
  }

  const handleDelete = async () => {
    try {
      await deletePaymentMethod(confirmDelete.id)
      toast.success('Method deleted')
      qc.invalidateQueries({ queryKey: ['payment_methods'] })
    } catch (e) {
      toast.error(`Delete failed: ${e.message}`)
    } finally {
      setConfirmDelete(null)
    }
  }

  const handleExport = () => {
    const data = filteredData.map(item => {
      if (activeTab === 'payment-methods') {
        return { name: item.name, type: item.type, min: item.min_amount, max: item.max_amount, fee: item.fee_percent, active: item.is_active }
      }
      return { type: item.type, amount: item.amount, status: item.status, date: item.created_at }
    })
    exportCSV(data, `withdrawal-${activeTab}`)
  }

  const isLoading = activeTab === 'all' ? loadingTx : activeTab === 'pending' ? loadingPending : activeTab === 'completed' ? loadingCompleted : loadingMethods

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-violet-400" />
            Deposit & Withdrawal
          </h2>
          <p className="text-sm text-slate-400 mt-1">Manage transactions, approvals, and payment methods</p>
        </div>
        {activeTab === 'payment-methods' && (
          <Button onClick={() => setModal({ open: true, method: null })}>
            <Plus className="w-4 h-4" /> Add Method
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-800/60 rounded-xl border border-slate-700/50">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSearch(''); setPage(0) }}
              className={`relative flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive ? 'bg-violet-500/15 text-violet-400 shadow-lg shadow-violet-500/10' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.id === 'pending' && pendingCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center shadow-lg">
                  {pendingCount}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'ai-assistant' ? (
            <div className="h-[calc(100vh-280px)] min-h-[600px]">
              <AIWithdrawalAgent />
            </div>
          ) : isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-800/50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Search + Export */}
              <DataTable
                data={filteredData}
                search={search}
                onSearch={setSearch}
                onExport={handleExport}
                pagination={{ page, totalPages }}
                onPageChange={setPage}
              />

              {/* Data Rows */}
              <div className="bg-slate-900/60 border border-slate-800/50 rounded-2xl overflow-hidden divide-y divide-slate-800/50">
                {paginatedData.length === 0 ? (
                  <div className="text-center py-16">
                    <ArrowLeftRight className="w-12 h-12 mx-auto text-slate-700 mb-3" />
                    <p className="text-sm text-slate-500">
                      {search ? 'No results match your search' : `No ${activeTab} items`}
                    </p>
                  </div>
                ) : (
                  <>
                    {activeTab === 'all' && paginatedData.map(tx => <TransactionRow key={tx.id} tx={tx} type="all" />)}
                    {activeTab === 'pending' && paginatedData.map(item => (
                      <PendingRow key={item.id} item={item} onApprove={setApproveItem} onReject={setRejectItem} />
                    ))}
                    {activeTab === 'completed' && paginatedData.map(item => <TransactionRow key={item.id} tx={{ ...item, type: 'withdrawal' }} type="completed" />)}
                    {activeTab === 'payment-methods' && paginatedData.map(method => (
                      <PaymentMethodRow key={method.id} method={method} onEdit={m => setModal({ open: true, method: m })} onDelete={setConfirmDelete} />
                    ))}
                  </>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Modals */}
      <PaymentMethodModal
        open={modal.open}
        onClose={() => setModal({ open: false, method: null })}
        method={modal.method}
        onSaved={() => qc.invalidateQueries({ queryKey: ['payment_methods'] })}
      />

      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} className="max-w-sm">
        <DialogHeader onClose={() => setConfirmDelete(null)}>
          <DialogTitle>Delete Payment Method</DialogTitle>
          <DialogDescription>Delete "{confirmDelete?.name}"? This cannot be undone.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>
            <Trash2 className="w-4 h-4" /> Delete
          </Button>
        </DialogFooter>
      </Dialog>

      <ApproveModal
        open={!!approveItem}
        onClose={() => setApproveItem(null)}
        item={approveItem}
        onConfirm={handleApprove}
      />

      <RejectModal
        open={!!rejectItem}
        onClose={() => setRejectItem(null)}
        item={rejectItem}
        onConfirm={handleReject}
      />
    </div>
  )
}

