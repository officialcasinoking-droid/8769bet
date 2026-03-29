import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { Button, FormField, Input, Toggle } from '../components/ui/FormElements'
import {
  Settings, Sparkles, ShieldCheck, Loader2, Check, Eye, EyeOff,
  DollarSign, Shield, Key, User, Lock, Mail
} from 'lucide-react'

// ── API ──────────────────────────────────────────────────────
async function getSettings() {
  const { data } = await supabase.from('platform_settings').select('*').eq('id', 'main').single()
  return data || {}
}

async function updateSettings(updates) {
  const { error } = await supabase.from('platform_settings').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', 'main')
  if (error) throw error
}

async function getWalletSettings() {
  const { data } = await supabase.from('admin_wallet').select('*').eq('id', 'main').single()
  return data || {}
}

async function updateWalletSettings(updates) {
  const { error } = await supabase.from('admin_wallet').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', 'main')
  if (error) throw error
}

// ── Main Component ───────────────────────────────────────────
export default function SettingsPage() {
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [groqKey, setGroqKey] = useState('')
  const [showKey, setShowKey] = useState(false)

  // Admin credentials
  const [adminUsername, setAdminUsername] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminNewPassword, setAdminNewPassword] = useState('')
  const [showAdminPassword, setShowAdminPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)

  // Wallet settings
  const [walletSettings, setWalletSettings] = useState({
    min_deposit: 10,
    max_deposit: 10000,
    min_withdrawal: 10,
    max_withdrawal: 5000,
    withdrawal_fee_percent: 1,
    drawdown_percent: 12,
  })

  const { data: settings } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: getSettings,
  })

  const { data: wallet } = useQuery({
    queryKey: ['wallet-settings'],
    queryFn: getWalletSettings,
  })

  useEffect(() => {
    if (settings) {
      if (settings.groq_api_key) setGroqKey(settings.groq_api_key)
      if (settings.admin_username) setAdminUsername(settings.admin_username)
    }
  }, [settings])

  useEffect(() => {
    if (wallet) {
      setWalletSettings({
        min_deposit: wallet.min_deposit || 10,
        max_deposit: wallet.max_deposit || 10000,
        min_withdrawal: wallet.min_withdrawal || 10,
        max_withdrawal: wallet.max_withdrawal || 5000,
        withdrawal_fee_percent: wallet.withdrawal_fee_percent || 1,
        drawdown_percent: wallet.drawdown_percent || 12,
      })
    }
  }, [wallet])

  const handleSavePlatform = async () => {
    setSaving(true)
    try {
      await updateSettings({ groq_api_key: groqKey })
      toast.success('API key saved')
      qc.invalidateQueries({ queryKey: ['platform-settings'] })
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveCredentials = async () => {
    if (!adminUsername.trim()) return toast.error('Username is required')
    setSaving(true)
    try {
      const updates = { admin_username: adminUsername }
      if (adminNewPassword.trim()) {
        updates.admin_password = adminNewPassword
      }
      await updateSettings(updates)
      toast.success('Admin credentials updated')
      qc.invalidateQueries({ queryKey: ['platform-settings'] })
      setAdminPassword('')
      setAdminNewPassword('')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveWallet = async () => {
    setSaving(true)
    try {
      await updateWalletSettings({
        min_deposit: Number(walletSettings.min_deposit),
        max_deposit: Number(walletSettings.max_deposit),
        min_withdrawal: Number(walletSettings.min_withdrawal),
        max_withdrawal: Number(walletSettings.max_withdrawal),
        withdrawal_fee_percent: Number(walletSettings.withdrawal_fee_percent),
        drawdown_percent: Number(walletSettings.drawdown_percent),
      })
      toast.success('Wallet settings saved')
      qc.invalidateQueries({ queryKey: ['wallet-settings'] })
    } catch (e) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center">
            <Settings className="w-5 h-5 text-white" />
          </div>
          Platform Settings
        </h2>
        <p className="text-slate-400 mt-1">Configure API keys, wallet limits, and admin credentials</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Admin Credentials */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-semibold text-white">Admin Credentials</h3>
          </div>
          <p className="text-sm text-slate-400 mb-4">Change your admin login username and password</p>
          <div className="space-y-4">
            <FormField label="Admin Username">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="admin"
                  className="pl-10"
                />
              </div>
            </FormField>
            <FormField label="New Password" hint="Leave empty to keep current password">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input
                  type={showNewPassword ? 'text' : 'password'}
                  value={adminNewPassword}
                  onChange={(e) => setAdminNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="pl-10 pr-10"
                />
                <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </FormField>
            <Button onClick={handleSaveCredentials} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Update Credentials
            </Button>
          </div>
        </motion.div>

        {/* AI API Key */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h3 className="text-lg font-semibold text-white">AI Agent Configuration</h3>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            Groq API key for AI predictions. Get free at{' '}
            <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">console.groq.com</a>
          </p>
          <div className="space-y-3">
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                placeholder="gsk_..."
                className="pr-10"
              />
              <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button onClick={handleSavePlatform} disabled={saving || !groqKey.trim()}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save API Key
            </Button>
            {settings?.groq_api_key && (
              <p className="text-xs text-emerald-500 flex items-center gap-1">
                <Check className="w-3 h-3" /> AI predictions enabled
              </p>
            )}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: 'Model', value: 'Llama 3.3 70B' },
              { label: 'Provider', value: 'Groq Free' },
              { label: 'Max Tokens', value: '300/req' },
            ].map(({ label, value }) => (
              <div key={label} className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-2.5 text-center">
                <p className="text-[10px] text-slate-500">{label}</p>
                <p className="text-xs font-medium text-white mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Wallet Limits */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-semibold text-white">Wallet Limits</h3>
          </div>
          <p className="text-sm text-slate-400 mb-4">Configure deposit and withdrawal limits</p>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Min Deposit (₹)">
                <Input type="number" value={walletSettings.min_deposit} onChange={e => setWalletSettings(s => ({ ...s, min_deposit: e.target.value }))} />
              </FormField>
              <FormField label="Max Deposit (₹)">
                <Input type="number" value={walletSettings.max_deposit} onChange={e => setWalletSettings(s => ({ ...s, max_deposit: e.target.value }))} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Min Withdrawal (₹)">
                <Input type="number" value={walletSettings.min_withdrawal} onChange={e => setWalletSettings(s => ({ ...s, min_withdrawal: e.target.value }))} />
              </FormField>
              <FormField label="Max Withdrawal (₹)">
                <Input type="number" value={walletSettings.max_withdrawal} onChange={e => setWalletSettings(s => ({ ...s, max_withdrawal: e.target.value }))} />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Withdrawal Fee (%)" hint="Applied to each withdrawal">
                <Input type="number" step="0.1" value={walletSettings.withdrawal_fee_percent} onChange={e => setWalletSettings(s => ({ ...s, withdrawal_fee_percent: e.target.value }))} />
              </FormField>
              <FormField label="Drawdown (%)" hint="Platform profit margin">
                <Input type="number" value={walletSettings.drawdown_percent} onChange={e => setWalletSettings(s => ({ ...s, drawdown_percent: e.target.value }))} />
              </FormField>
            </div>
            <Button onClick={handleSaveWallet} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save Wallet Settings
            </Button>
          </div>
        </motion.div>

        {/* Admin Wallet Balance */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <Key className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-semibold text-white">Admin Wallet</h3>
          </div>
          <p className="text-sm text-slate-400 mb-4">Current platform balance</p>
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-6 text-center">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Wallet Balance</p>
            <p className="text-3xl font-bold text-cyan-400">
              ₹{Number(wallet?.balance || 0).toLocaleString('en-IN')}
            </p>
          </div>
          <p className="text-xs text-slate-500 mt-3">This balance is used for payouts and is reduced by approved withdrawals.</p>
        </motion.div>
      </div>
    </div>
  )
}
