import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { motion } from 'framer-motion'
import { getPlatformSettings, updatePlatformSettings } from '../../api/referrals'
import { Button, FormField, Input } from '../../components/ui/FormElements'
import {
  Settings, Sparkles, ShieldCheck, Loader2,
  Check, Eye, EyeOff
} from 'lucide-react'

export default function SettingsPage() {
  const qc = useQueryClient()
  const [saving, setSaving] = useState(false)
  const [groqKey, setGroqKey] = useState('')
  const [showKey, setShowKey] = useState(false)

  const { data: settings } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: getPlatformSettings,
  })

  useEffect(() => {
    if (!settings) return
    if (settings.groq_api_key) setGroqKey(settings.groq_api_key)
  }, [settings])

  const saveMutation = useMutation({
    mutationFn: (updates) => updatePlatformSettings(updates),
    onSuccess: () => {
      toast.success('Settings saved')
      qc.invalidateQueries({ queryKey: ['platform-settings'] })
    },
    onError: (e) => toast.error(e.message),
  })

  const handleSave = async (updates) => {
    setSaving(true)
    try {
      await saveMutation.mutateAsync(updates)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center">
            <Settings className="w-5 h-5 text-white" />
          </div>
          Settings
        </h2>
        <p className="text-slate-400 mt-1">Platform configuration and preferences</p>
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-w-2xl">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-semibold text-white">Groq API Key</h3>
          </div>
          <p className="text-sm text-slate-400 mb-4">
            Stored securely in Supabase — never exposed to browser. Free tier at{' '}
            <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer"
              className="text-emerald-400 hover:underline">console.groq.com</a>
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                type={showKey ? 'text' : 'password'}
                value={groqKey}
                onChange={(e) => setGroqKey(e.target.value)}
                placeholder="gsk_..."
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <Button
              onClick={() => handleSave({ groq_api_key: groqKey })}
              disabled={saving || !groqKey.trim()}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save
            </Button>
          </div>
          {settings?.groq_api_key && (
            <p className="text-xs text-emerald-500 mt-2 flex items-center gap-1">
              <Check className="w-3 h-3" /> Key is configured — AI predictions enabled
            </p>
          )}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Model', value: 'Llama 3.3 70B', color: 'text-purple-400', bg: 'bg-purple-500/20' },
            { label: 'Provider', value: 'Groq (Free)', color: 'text-amber-400', bg: 'bg-amber-500/20' },
            { label: 'Max Tokens', value: '300 / request', color: 'text-blue-400', bg: 'bg-blue-500/20' },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
              <p className="text-xs text-slate-400">{label}</p>
              <p className={`text-sm font-semibold mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
