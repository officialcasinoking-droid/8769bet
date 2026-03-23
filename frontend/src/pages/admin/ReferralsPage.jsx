import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { motion } from 'framer-motion'
import {
  getReferrals, payReferralBonus, revokeReferral,
  getPlatformSettings, updatePlatformSettings,
  giveManualBonus, getUsers
} from '../../api/referrals'
import { Button, FormField, Input, Select, Badge } from '../../components/ui/FormElements'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '../../components/ui/Dialog'
import {
  Users, Gift, TreeDeciduous, TrendingUp, DollarSign,
  UserPlus, ChevronDown, ChevronRight, Download,
  Minus, X, Check, AlertTriangle, Loader2
} from 'lucide-react'

function PayBonusModal({ referral, open, onClose, onSuccess }) {
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const handlePay = async () => {
    if (!amount || parseFloat(amount) <= 0) return toast.error('Enter a valid amount')
    setLoading(true)
    try {
      await payReferralBonus(referral.id, parseFloat(amount), reason)
      toast.success(`Bonus of $${amount} paid to ${referral.referred?.username}`)
      onSuccess()
      onClose()
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (!referral) return null

  return (
    <Dialog open={open} onClose={onClose} className="max-w-sm">
      <DialogHeader onClose={onClose}>
        <DialogTitle>Pay Referral Bonus</DialogTitle>
      </DialogHeader>
      <DialogContent>
        <div className="space-y-4">
          <div className="bg-slate-800/50 rounded-xl p-3">
            <p className="text-xs text-slate-400">Recipient</p>
            <p className="text-sm font-medium text-white">{referral.referred?.username || 'Unknown'}</p>
          </div>
          <FormField label="Bonus Amount ($)">
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 50.00"
            />
          </FormField>
          <FormField label="Reason (optional)">
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Level 1 referral bonus"
            />
          </FormField>
        </div>
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handlePay} disabled={loading || !amount}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
          Pay Bonus
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

function ManualBonusModal({ open, onClose, onSuccess }) {
  const [userId, setUserId] = useState('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users-select'],
    queryFn: getUsers,
  })

  const handlePay = async () => {
    if (!userId || !amount || parseFloat(amount) <= 0) return toast.error('Select user and enter amount')
    setLoading(true)
    try {
      await giveManualBonus(userId, parseFloat(amount), reason)
      toast.success(`Manual bonus of $${amount} credited`)
      onSuccess()
      onClose()
      setUserId(''); setAmount(''); setReason('')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} className="max-w-sm">
      <DialogHeader onClose={onClose}>
        <DialogTitle>Give Manual Bonus</DialogTitle>
      </DialogHeader>
      <DialogContent>
        <div className="space-y-4">
          <FormField label="Select User">
            <Select value={userId} onChange={(e) => setUserId(e.target.value)}>
              <option value="">Choose a user...</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Amount ($)">
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
          </FormField>
          <FormField label="Reason">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Promotional bonus" />
          </FormField>
        </div>
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={handlePay} disabled={loading || !userId || !amount}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
          Send Bonus
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

function ReferralTree({ referrer, referrals }) {
  const [expanded, setExpanded] = useState(true)
  const childRefs = referrals.filter(r => r.referrer_id === referrer.id)

  return (
    <div className="relative">
      {/* Tree lines */}
      {childRefs.length > 0 && (
        <div className="absolute left-6 top-0 w-px bg-slate-600" style={{ height: '50%' }} />
      )}

      <div className="relative">
        {/* Root node */}
        <div className="flex items-center gap-3 p-3 bg-slate-800/60 border border-slate-700/50 rounded-xl hover:bg-slate-800 transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            {referrer.username?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-white">{referrer.username}</p>
              <Badge variant="emerald">L1</Badge>
            </div>
            <p className="text-xs text-slate-500">{referrer.email}</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-medium text-emerald-400">${Number(referrer.bonus_paid || 0).toFixed(2)}</p>
            <p className="text-[10px] text-slate-500">paid</p>
          </div>
        </div>

        {/* Children */}
        {childRefs.length > 0 && expanded && (
          <div className="ml-10 mt-2 space-y-2 border-l border-slate-700 pl-4">
            {childRefs.map((ref) => {
              const child = ref.referred
              if (!child) return null
              return (
                <div key={ref.id} className="relative">
                  <div className="absolute -left-4 top-4 w-4 h-px bg-slate-600" />
                  <div className="flex items-center gap-3 p-3 bg-slate-800/40 border border-slate-700/30 rounded-xl hover:bg-slate-800/60 transition-colors">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                      {child.username?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-200">{child.username}</p>
                        <Badge>Referred</Badge>
                      </div>
                      <p className="text-xs text-slate-500">Joined {new Date(child.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-medium text-blue-400">${Number(ref.bonus_paid || 0).toFixed(2)}</p>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        ref.status === 'active' ? 'text-emerald-400 bg-emerald-500/10' :
                        ref.status === 'revoked' ? 'text-red-400 bg-red-500/10' :
                        'text-slate-400 bg-slate-500/10'
                      }`}>
                        {ref.status}
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ReferralsPage() {
  const qc = useQueryClient()
  const [selectedReferral, setSelectedReferral] = useState(null)
  const [showPayModal, setShowPayModal] = useState(false)
  const [showBonusModal, setShowBonusModal] = useState(false)
  const [search, setSearch] = useState('')
  const [bonusRules, setBonusRules] = useState(null)
  const [rulesSaving, setRulesSaving] = useState(false)
  const [editingRules, setEditingRules] = useState(false)
  const [tempRules, setTempRules] = useState(null)

  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ['admin-referrals'],
    queryFn: getReferrals,
  })

  const { data: settings } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: getPlatformSettings,
  })

  const revokeMutation = useMutation({
    mutationFn: revokeReferral,
    onSuccess: () => {
      toast.success('Referral revoked')
      qc.invalidateQueries({ queryKey: ['admin-referrals'] })
    },
    onError: (e) => toast.error(e.message),
  })

  const saveRulesMutation = useMutation({
    mutationFn: (rules) => updatePlatformSettings({ referral_settings: rules }),
    onSuccess: () => {
      toast.success('Bonus rules saved')
      qc.invalidateQueries({ queryKey: ['platform-settings'] })
      setEditingRules(false)
    },
    onError: (e) => toast.error(e.message),
  })

  const referralSettings = settings?.referral_settings || {
    level1_percent: 5, level2_percent: 2, level3_percent: 1,
    deposit_bonus_percent: 10, min_deposit_for_bonus: 100, max_bonus: 1000, active: true,
  }

  const totalReferred = referrals.length
  const totalPaid = referrals.reduce((sum, r) => sum + Number(r.bonus_paid || 0), 0)
  const activeReferrals = referrals.filter(r => r.status === 'active').length

  const thisMonth = referrals.filter(r => {
    const d = new Date(r.created_at)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const filtered = referrals.filter(r => {
    if (!search) return true
    const s = search.toLowerCase()
    return (
      r.referrer?.username?.toLowerCase().includes(s) ||
      r.referred?.username?.toLowerCase().includes(s) ||
      r.referred?.email?.toLowerCase().includes(s)
    )
  })

  const handleExportCSV = () => {
    const headers = ['ID', 'Referrer', 'Referred', 'Level', 'Bonus Paid', 'Status', 'Date']
    const rows = filtered.map(r => [
      r.id, r.referrer?.username || '', r.referred?.username || '',
      r.level, r.bonus_paid || 0, r.status, new Date(r.created_at).toLocaleDateString()
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `referrals-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported')
  }

  const handleRuleSave = () => {
    if (!tempRules) return
    setRulesSaving(true)
    saveRulesMutation.mutate(tempRules)
    setRulesSaving(false)
  }

  const startEditRules = () => {
    setTempRules({ ...referralSettings })
    setEditingRules(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center">
              <TreeDeciduous className="w-5 h-5 text-white" />
            </div>
            Referral Management
          </h2>
          <p className="text-slate-400 mt-1">Manage referral bonuses, trees, and commission rules</p>
        </div>
        <Button onClick={() => setShowBonusModal(true)}>
          <Gift className="w-4 h-4" />
          Manual Bonus
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Users, label: 'Total Referred', value: totalReferred.toString(), color: 'text-blue-400', bg: 'bg-blue-500/20' },
          { icon: DollarSign, label: 'Bonus Paid', value: `$${totalPaid.toFixed(2)}`, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
          { icon: UserPlus, label: 'This Month', value: thisMonth.toString(), color: 'text-purple-400', bg: 'bg-purple-500/20' },
          { icon: Check, label: 'Active Trees', value: activeReferrals.toString(), color: 'text-amber-400', bg: 'bg-amber-500/20' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-xs text-slate-400">{label}</p>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bonus Rules */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-semibold text-white">Bonus Rules</h3>
          </div>
          {!editingRules ? (
            <Button variant="outline" size="sm" onClick={startEditRules}>
              <AlertTriangle className="w-3.5 h-3.5" />
              Edit Rules
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditingRules(false)}>Cancel</Button>
              <Button size="sm" onClick={handleRuleSave} disabled={rulesSaving}>
                {rulesSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save
              </Button>
            </div>
          )}
        </div>

        {editingRules ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { key: 'level1_percent', label: 'Level 1 (%)', step: 0.5 },
              { key: 'level2_percent', label: 'Level 2 (%)', step: 0.5 },
              { key: 'level3_percent', label: 'Level 3 (%)', step: 0.5 },
              { key: 'deposit_bonus_percent', label: 'Deposit Bonus (%)', step: 1 },
              { key: 'min_deposit_for_bonus', label: 'Min Deposit ($)', step: 10 },
              { key: 'max_bonus', label: 'Max Bonus ($)', step: 100 },
            ].map(({ key, label, step }) => (
              <FormField key={key} label={label}>
                <Input
                  type="number"
                  step={step}
                  value={tempRules?.[key] || 0}
                  onChange={(e) => setTempRules({ ...tempRules, [key]: parseFloat(e.target.value) || 0 })}
                />
              </FormField>
            ))}
            <FormField label="Active">
              <button
                type="button"
                onClick={() => setTempRules({ ...tempRules, active: !tempRules?.active })}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all ${
                  tempRules?.active ? 'bg-emerald-500/15 border-emerald-500/30' : 'bg-slate-800/50 border-slate-700/50'
                }`}
              >
                <span className={`text-sm font-medium ${tempRules?.active ? 'text-white' : 'text-slate-300'}`}>
                  {tempRules?.active ? 'Active' : 'Inactive'}
                </span>
                <div className={`relative w-11 h-6 rounded-full transition-colors ${tempRules?.active ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                  <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${tempRules?.active ? 'translate-x-5' : ''}`} />
                </div>
              </button>
            </FormField>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Level 1 Commission', value: `${referralSettings.level1_percent}%` },
              { label: 'Level 2 Commission', value: `${referralSettings.level2_percent}%` },
              { label: 'Level 3 Commission', value: `${referralSettings.level3_percent}%` },
              { label: 'Deposit Bonus', value: `${referralSettings.deposit_bonus_percent}%` },
              { label: 'Min Deposit', value: `$${referralSettings.min_deposit_for_bonus}` },
              { label: 'Max Bonus', value: `$${referralSettings.max_bonus}` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-900/50 rounded-xl p-3">
                <p className="text-xs text-slate-400">{label}</p>
                <p className="text-lg font-bold text-white mt-1">{value}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Referral List */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-slate-700/50 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search referrer or referred..."
              className="w-full pl-10 pr-4 py-2 bg-slate-800/80 border border-slate-700/50 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Referrer</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Referred User</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Level</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Bonus Paid</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {isLoading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500">No referrals found</td></tr>
              ) : filtered.map((ref) => (
                <tr key={ref.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-xs font-bold">
                        {ref.referrer?.username?.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-white">{ref.referrer?.username || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                        {ref.referred?.username?.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-slate-300">{ref.referred?.username || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant="amber">Level {ref.level}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-emerald-400">${Number(ref.bonus_paid || 0).toFixed(2)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      ref.status === 'active' ? 'bg-emerald-500/15 text-emerald-400' :
                      ref.status === 'revoked' ? 'bg-red-500/15 text-red-400' :
                      'bg-slate-500/15 text-slate-400'
                    }`}>
                      {ref.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">
                    {new Date(ref.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setSelectedReferral(ref); setShowPayModal(true) }}
                        disabled={ref.status !== 'active'}
                        className="text-emerald-400 hover:text-emerald-300"
                        title="Pay Bonus"
                      >
                        <Gift className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm('Revoke this referral?')) revokeMutation.mutate(ref.id)
                        }}
                        disabled={ref.status === 'revoked'}
                        className="text-red-400 hover:text-red-300"
                        title="Revoke"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedReferral && (
        <PayBonusModal
          referral={selectedReferral}
          open={showPayModal}
          onClose={() => { setShowPayModal(false); setSelectedReferral(null) }}
          onSuccess={() => qc.invalidateQueries({ queryKey: ['admin-referrals'] })}
        />
      )}
      <ManualBonusModal
        open={showBonusModal}
        onClose={() => setShowBonusModal(false)}
        onSuccess={() => qc.invalidateQueries({ queryKey: ['admin-users'] })}
      />
    </div>
  )
}
