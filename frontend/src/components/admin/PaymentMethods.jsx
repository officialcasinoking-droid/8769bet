import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { toast } from 'react-hot-toast'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter } from '../ui/Dialog'
import { FormField, Input, Select, Toggle, Button, Badge } from '../ui/FormElements'
import {
  CreditCard, Plus, Edit2, Trash2, Search, Download,
  RefreshCw, Check, X, Upload, Globe, Smartphone, Building2, Coins
} from 'lucide-react'

const BUCKET = 'landing-images'

// ── Zod Schema ──────────────────────────────────────────────
const methodSchema = {
  name: { required: 'Name is required', minLength: 2, maxLength: 50 },
  type: { required: 'Type is required' },
  country: { required: 'Country is required' },
  min_amount: { required: 'Min amount is required', min: 1 },
  max_amount: { required: 'Max amount is required', min: 1 },
  fee_percent: { required: 'Fee is required', min: 0, max: 100 },
  daily_limit: { required: 'Daily limit is required', min: 0 },
}

function validateMethod(data) {
  const errors = {}
  if (!data.name || data.name.trim().length < 2) errors.name = methodSchema.name.required
  if (!data.type) errors.type = methodSchema.type.required
  if (!data.country) errors.country = methodSchema.country.required
  if (!data.min_amount || data.min_amount < methodSchema.min_amount.min) errors.min_amount = 'Invalid min amount'
  if (!data.max_amount || data.max_amount < data.min_amount) errors.max_amount = 'Max must be > Min'
  if (data.fee_percent === undefined || data.fee_percent < 0 || data.fee_percent > 100) errors.fee_percent = 'Fee must be 0-100'
  if (!data.daily_limit || data.daily_limit < 0) errors.daily_limit = 'Invalid daily limit'
  return errors
}

// ── API ────────────────────────────────────────────────────
async function getPaymentMethods() {
  const { data, error } = await supabase
    .from('payment_methods')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) return []
  return data || []
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
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: true })
  if (error) throw error
  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path)
  return urlData.publicUrl
}

// ── Type Icons ──────────────────────────────────────────────
const TYPE_CONFIG = {
  wallet: { icon: Smartphone, label: 'Mobile Wallet', color: 'emerald' },
  bank: { icon: Building2, label: 'Bank Transfer', color: 'blue' },
  crypto: { icon: Coins, label: 'Crypto', color: 'amber' },
  upi: { icon: Globe, label: 'UPI', color: 'violet' },
}

// ── Payment Method Modal ──────────────────────────────────────
function PaymentMethodModal({ open, onClose, method, onSaved }) {
  const [form, setForm] = useState({
    name: '', type: 'wallet', country: 'pakistan',
    logo_url: '', min_amount: 100, max_amount: 50000,
    fee_percent: 0, daily_limit: 100000, auto_approve: false, is_active: true,
  })
  const [errors, setErrors] = useState({})
  const [logoFile, setLogoFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const logoRef = useRef(null)
  const qc = useQueryClient()

  useEffect(() => {
    if (open) {
      if (method) {
        setForm({
          id: method.id,
          name: method.name || '',
          type: method.type || 'wallet',
          country: method.country || 'pakistan',
          logo_url: method.logo_url || '',
          min_amount: method.min_amount || 100,
          max_amount: method.max_amount || 50000,
          fee_percent: method.fee_percent || 0,
          daily_limit: method.daily_limit || 100000,
          auto_approve: method.auto_approve || false,
          is_active: method.is_active !== false,
        })
      } else {
        setForm({ name: '', type: 'wallet', country: 'pakistan', logo_url: '', min_amount: 100, max_amount: 50000, fee_percent: 0, daily_limit: 100000, auto_approve: false, is_active: true })
      }
      setErrors({})
      setLogoFile(null)
    }
  }, [open, method])

  const set = useCallback((key, value) => {
    setForm(f => ({ ...f, [key]: value }))
    if (errors[key]) setErrors(e => ({ ...e, [key]: undefined }))
  }, [errors])

  const handleLogoFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    setLogoFile(file)
    const preview = URL.createObjectURL(file)
    setForm(f => ({ ...f, logo_url: preview }))
  }

  const handleSave = async () => {
    const errs = validateMethod(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setSaving(true)
    try {
      let logoUrl = form.logo_url
      if (logoFile) {
        logoUrl = await uploadLogo(logoFile)
      }
      const { id: _id, country: _country, ...rest } = form
      const payload = { ...rest, logo_url: logoUrl }
      const result = await savePaymentMethod(method ? { ...payload, id: method.id } : payload)
      toast.success(result._action === 'update' ? 'Method updated ✅' : 'Method created ✅')
      qc.invalidateQueries({ queryKey: ['payment_methods'] })
      qc.invalidateQueries({ queryKey: ['payment_methods_count'] })
      onSaved?.(result)
      onClose()
    } catch (e) {
      toast.error(`Save failed: ${e.message} ❌`)
    } finally {
      setSaving(false)
    }
  }

  const typeIcon = TYPE_CONFIG[form.type]?.icon || CreditCard

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
          {/* Logo Upload */}
          <div className="flex items-center gap-4">
            <div
              onClick={() => logoRef.current?.click()}
              className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-600 hover:border-emerald-500 flex items-center justify-center cursor-pointer transition-colors overflow-hidden bg-slate-800/50"
            >
              {form.logo_url ? (
                <img src={form.logo_url} alt="logo" className="w-full h-full object-contain p-1" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-slate-500">
                  <Upload className="w-5 h-5" />
                  <span className="text-[10px]">Logo</span>
                </div>
              )}
            </div>
            <input ref={logoRef} type="file" accept="image/*" className="hidden"
              onChange={e => handleLogoFile(e.target.files[0])} />
            <div>
              <p className="text-sm font-medium text-white">Method Logo</p>
              <p className="text-xs text-slate-500 mt-0.5">PNG, JPG up to 2MB. Recommended 200×200px.</p>
            </div>
          </div>

          {/* Name + Type */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Method Name" error={errors.name}>
              <Input
                value={form.name}
                onChange={e => set('name', e.target.value)}
                placeholder="e.g. JazzCash"
              />
            </FormField>
            <FormField label="Type" error={errors.type}>
              <Select value={form.type} onChange={e => set('type', e.target.value)}>
                <option value="wallet">Mobile Wallet</option>
                <option value="bank">Bank Transfer</option>
                <option value="crypto">Crypto</option>
                <option value="upi">UPI</option>
              </Select>
            </FormField>
          </div>

          {/* Country */}
          <FormField label="Country" error={errors.country}>
            <Select value={form.country} onChange={e => set('country', e.target.value)}>
              <option value="pakistan">🇵🇰 Pakistan</option>
              <option value="india">🇮🇳 India</option>
              <option value="global">🌐 Global</option>
            </Select>
          </FormField>

          {/* Amounts */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Min Amount (₹)" error={errors.min_amount}>
              <Input type="number" value={form.min_amount} onChange={e => set('min_amount', Number(e.target.value))} min={1} />
            </FormField>
            <FormField label="Max Amount (₹)" error={errors.max_amount}>
              <Input type="number" value={form.max_amount} onChange={e => set('max_amount', Number(e.target.value))} min={1} />
            </FormField>
          </div>

          {/* Fee + Daily Limit */}
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Fee (%)" error={errors.fee_percent} hint="0 = no fee">
              <Input type="number" step="0.1" value={form.fee_percent} onChange={e => set('fee_percent', Number(e.target.value))} min={0} max={100} />
            </FormField>
            <FormField label="Daily Limit (₹)" error={errors.daily_limit}>
              <Input type="number" value={form.daily_limit} onChange={e => set('daily_limit', Number(e.target.value))} min={0} />
            </FormField>
          </div>

          {/* Toggles */}
          <div className="space-y-2">
            <Toggle
              checked={form.auto_approve}
              onChange={v => set('auto_approve', v)}
              label={form.auto_approve ? 'Auto Approve — ON' : 'Auto Approve — OFF'}
              description={form.auto_approve ? 'Payments are processed instantly without manual review.' : 'All payments require manual approval before processing.'}
              variant={form.auto_approve ? 'emerald' : 'orange'}
            />
            <Toggle
              checked={form.is_active}
              onChange={v => set('is_active', v)}
              label={form.is_active ? 'Active — Visible to users' : 'Inactive — Hidden from users'}
              description={form.is_active ? 'This method is available for deposits and withdrawals.' : 'This method is disabled and hidden from users.'}
              variant={form.is_active ? 'emerald' : 'red'}
            />
          </div>
        </div>
      </DialogContent>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</>
          ) : (
            <><Check className="w-4 h-4" /> {method ? 'Update Method' : 'Create Method'}</>
          )}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

// ── Payment Methods Table ─────────────────────────────────────
function PaymentMethodsTable({ methods, onEdit, onDelete, loading }) {
  const [search, setSearch] = useState('')

  const filtered = methods.filter(m =>
    !search || m.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.type?.toLowerCase().includes(search.toLowerCase()) ||
    (m.country || '').toLowerCase().includes(search.toLowerCase())
  )

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-slate-800/50 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search methods..."
            className="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all"
          />
        </div>
        <span className="text-xs text-slate-500">{filtered.length} method{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Rows */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 border border-slate-800 rounded-2xl bg-slate-900/50">
          <CreditCard className="w-12 h-12 mx-auto text-slate-700 mb-3" />
          <p className="text-sm text-slate-500">
            {search ? 'No methods match your search' : 'No payment methods configured'}
          </p>
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800/50 rounded-2xl overflow-hidden divide-y divide-slate-800/50">
          {filtered.map(method => {
            const typeInfo = TYPE_CONFIG[method.type] || TYPE_CONFIG.wallet
            const TypeIcon = typeInfo.icon
            const countryFlags = { pakistan: '🇵🇰', india: '🇮🇳', global: '🌐' }
            const country = method.country || 'global'

            return (
              <div key={method.id} className="flex items-center justify-between px-5 py-4 hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Logo */}
                  <div className="w-12 h-12 rounded-xl bg-slate-800/80 flex items-center justify-center overflow-hidden flex-shrink-0 border border-slate-700/50">
                    {method.logo_url ? (
                      <img src={method.logo_url} alt={method.name} className="w-full h-full object-contain p-1" />
                    ) : (
                      <TypeIcon className={`w-5 h-5 text-${typeInfo.color}-400`} />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-white truncate">{method.name}</p>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                        method.is_active
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                          : 'bg-slate-700/50 text-slate-500 border-slate-700'
                      }`}>
                        {method.is_active ? 'Active' : 'Inactive'}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                        method.auto_approve
                          ? 'bg-green-500/15 text-green-400 border-green-500/20'
                          : 'bg-amber-500/15 text-amber-400 border-amber-500/20'
                      }`}>
                        {method.auto_approve ? 'Auto' : 'Manual'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        {countryFlags[country] || '🌐'} {country}
                      </span>
                      <span>₹{Number(method.min_amount).toLocaleString()} – ₹{Number(method.max_amount).toLocaleString()}</span>
                      <span>Fee: {method.fee_percent}%</span>
                      <span>Daily: ₹{Number(method.daily_limit).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => onEdit(method)}
                    className="p-2 rounded-xl border border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-800 hover:border-slate-600 transition-all"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(method)}
                    className="p-2 rounded-xl border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 transition-all"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main Export ──────────────────────────────────────────────
export function PaymentMethodsSection() {
  const qc = useQueryClient()
  const [modal, setModal] = useState({ open: false, method: null })
  const [confirmDelete, setConfirmDelete] = useState(null)

  const { data: methods = [], isLoading } = useQuery({
    queryKey: ['payment_methods'],
    queryFn: getPaymentMethods,
    staleTime: 0,
  })

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('pm-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payment_methods' }, () => {
        qc.invalidateQueries({ queryKey: ['payment_methods'] })
        qc.invalidateQueries({ queryKey: ['payment_methods_count'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [qc])

  const handleEdit = (method) => setModal({ open: true, method })
  const handleAdd = () => setModal({ open: true, method: null })
  const handleDelete = (method) => setConfirmDelete(method)
  const handleConfirmDelete = async () => {
    try {
      await deletePaymentMethod(confirmDelete.id)
      toast.success('Method deleted ✅')
      qc.invalidateQueries({ queryKey: ['payment_methods'] })
      qc.invalidateQueries({ queryKey: ['payment_methods_count'] })
    } catch (e) {
      toast.error(`Delete failed: ${e.message} ❌`)
    } finally {
      setConfirmDelete(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-slate-400" />
            Payment Methods
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Configure how users can deposit and withdraw funds.</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="w-4 h-4" />
          Add Method
        </Button>
      </div>

      <PaymentMethodsTable
        methods={methods}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={isLoading}
      />

      {/* Add/Edit Modal */}
      <PaymentMethodModal
        open={modal.open}
        onClose={() => setModal({ open: false, method: null })}
        method={modal.method}
        onSaved={() => qc.invalidateQueries({ queryKey: ['payment_methods'] })}
      />

      {/* Delete Confirmation */}
      <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)} className="max-w-sm">
        <DialogHeader onClose={() => setConfirmDelete(null)}>
          <DialogTitle>Delete Payment Method</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete "{confirmDelete?.name}"? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleConfirmDelete}>
            <Trash2 className="w-4 h-4" /> Delete
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}

export default PaymentMethodsSection
