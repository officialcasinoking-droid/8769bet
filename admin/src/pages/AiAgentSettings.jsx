import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { motion } from 'framer-motion'
import {
  getPlatformSettings, updatePlatformSettings, callGroqAI
} from '../api/referrals'
import { Button, FormField, Input, Badge } from '../components/ui/FormElements'
import {
  Sparkles, Brain, Zap, Settings, ShieldCheck,
  ChevronRight, Loader2, TrendingUp, AlertTriangle, CheckCircle2
} from 'lucide-react'

export default function AiAgentSettings() {
  const qc = useQueryClient()
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [predictionPrompt, setPredictionPrompt] = useState(
    'Analyze the last 10 crash game rounds and predict the best cashout point for the next round. Recent history: [2.1x, 0.9x, 4.5x, 1.2x, 8.3x, 1.5x, 3.2x, 0.7x, 5.1x, 2.8x]'
  )
  const [result, setResult] = useState(null)
  const [testing, setTesting] = useState(false)

  const { data: settings } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: getPlatformSettings,
  })

  const saveMutation = useMutation({
    mutationFn: (key) => updatePlatformSettings({ groq_api_key: key }),
    onSuccess: () => {
      toast.success('Groq API key saved securely')
      qc.invalidateQueries({ queryKey: ['platform-settings'] })
    },
    onError: (e) => toast.error(e.message),
  })

  const testMutation = useMutation({
    mutationFn: () => callGroqAI(predictionPrompt, 'crash'),
    onSuccess: (data) => {
      setResult(data.prediction)
      toast.success('AI prediction generated!')
    },
    onError: (e) => toast.error(e.message),
  })

  const handleSaveKey = () => {
    if (apiKey.trim()) saveMutation.mutate(apiKey.trim())
  }

  const handleTest = () => {
    if (!settings?.groq_api_key) return toast.error('Please save your Groq API key first')
    testMutation.mutate()
  }

  const hasKey = !!settings?.groq_api_key

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          AI Agent Settings
        </h2>
        <p className="text-slate-400 mt-1">Configure Groq AI for intelligent crash game predictions</p>
      </div>

      {/* Status Banner */}
      <div className={`flex items-center gap-3 p-4 rounded-xl border ${
        hasKey
          ? 'bg-emerald-500/10 border-emerald-500/20'
          : 'bg-amber-500/10 border-amber-500/20'
      }`}>
        {hasKey ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
        ) : (
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
        )}
        <div>
          <p className={`text-sm font-medium ${hasKey ? 'text-emerald-400' : 'text-amber-400'}`}>
            {hasKey ? 'AI Agent is configured and ready' : 'Groq API Key not configured'}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            {hasKey ? 'You can test predictions below' : 'Add your Groq API key to enable AI predictions'}
          </p>
        </div>
      </div>

      {/* API Key Configuration */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h3 className="text-lg font-semibold text-white">Groq API Configuration</h3>
        </div>
        <p className="text-sm text-slate-400 mb-4">
          Your API key is stored securely in Supabase and never exposed to the browser.
          Get a free key at{' '}
          <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer"
             className="text-emerald-400 hover:underline">
            console.groq.com
          </a>
        </p>

        <div className="space-y-3">
          <FormField label="Groq API Key">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showKey ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={hasKey ? '••••••••••••••••••••' : 'gsk_...'}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showKey ? '🙈' : '👁️'}
                </button>
              </div>
              <Button
                onClick={handleSaveKey}
                disabled={saveMutation.isPending || !apiKey.trim()}
                variant="outline"
              >
                {saveMutation.isPending ? 'Saving...' : 'Save Key'}
              </Button>
            </div>
          </FormField>

          {hasKey && (
            <p className="text-xs text-emerald-500 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Key is saved securely in Supabase platform settings
            </p>
          )}
        </div>
      </div>

      {/* AI Model Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { icon: Brain, label: 'AI Model', value: 'Llama 3.3 70B', color: 'text-purple-400', bg: 'bg-purple-500/20' },
          { icon: Zap, label: 'Provider', value: 'Groq (Free Tier)', color: 'text-amber-400', bg: 'bg-amber-500/20' },
          { icon: TrendingUp, label: 'Max Tokens', value: '300 / request', color: 'text-blue-400', bg: 'bg-blue-500/20' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <div>
                <p className="text-xs text-slate-400">{label}</p>
                <p className={`text-sm font-semibold ${color}`}>{value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Prediction Test */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <h3 className="text-lg font-semibold text-white">Test AI Prediction</h3>
        </div>

        <div className="space-y-3">
          <FormField label="Prediction Prompt">
            <textarea
              value={predictionPrompt}
              onChange={(e) => setPredictionPrompt(e.target.value)}
              rows={4}
              className="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/30 resize-none"
              placeholder="Enter your prediction prompt..."
            />
          </FormField>

          <Button
            onClick={handleTest}
            disabled={!hasKey || testMutation.isPending}
            className="w-full"
          >
            {testMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating Prediction...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Crash Prediction
              </>
            )}
          </Button>
        </div>

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 space-y-3"
          >
            {result.suggested_cashout && (
              <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Suggested Cashout</p>
                    <p className="text-3xl font-bold text-white mt-1">{result.suggested_cashout}x</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-400 uppercase tracking-wider">Confidence</p>
                    <p className={`text-2xl font-bold mt-1 ${
                      result.confidence >= 80 ? 'text-emerald-400' :
                      result.confidence >= 60 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {result.confidence}%
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Badge variant={result.risk_level === 'low' ? 'emerald' : result.risk_level === 'medium' ? 'amber' : 'red'}>
                    {result.risk_level?.toUpperCase()} RISK
                  </Badge>
                </div>
                {result.reasoning && (
                  <p className="text-sm text-slate-300 mt-3 leading-relaxed">{result.reasoning}</p>
                )}
              </div>
            )}

            {result.recommended_bet_percent && (
              <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border border-blue-500/20 rounded-xl p-4">
                <p className="text-xs text-slate-400 uppercase tracking-wider">Recommended Bet</p>
                <p className="text-2xl font-bold text-white mt-1">{result.recommended_bet_percent}% of balance</p>
                {result.game_tip && (
                  <p className="text-sm text-blue-300 mt-2">Recommended: {result.game_tip}</p>
                )}
                {result.reasoning && (
                  <p className="text-sm text-slate-300 mt-2">{result.reasoning}</p>
                )}
              </div>
            )}

            {result.raw && (
              <pre className="bg-slate-900 rounded-xl p-4 text-sm text-slate-300 overflow-x-auto">
                {result.raw}
              </pre>
            )}
          </motion.div>
        )}
      </div>
    </div>
  )
}
