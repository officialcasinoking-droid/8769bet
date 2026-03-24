import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { SparklesIcon, CpuChipIcon, BeakerIcon, BoltIcon, ChartBarIcon, CogIcon, PlayIcon, StopIcon, ArrowPathIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'

export default function AiAgentPage() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    enablePredictions: true,
    predictionConfidence: 75,
    autoCashoutEnabled: false,
    safeMode: true,
    riskLevel: 'medium',
    maxBetMultiplier: 10,
    signalUpdates: 30,
    historicalAnalysis: true,
    patternRecognition: true,
    hotColdNumbers: true
  })
  const [stats, setStats] = useState({
    totalPredictions: 0,
    accuracy: 0,
    activeUsers: 0,
    signalsGenerated: 0
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const { data } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'ai_agent_settings')
        .single()
      
      if (data?.value) {
        setSettings(prev => ({ ...prev, ...data.value }))
      }

      const { data: statsData } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'ai_agent_stats')
        .single()
      
      if (statsData?.value) {
        setStats(statsData.value)
      }
    } catch (err) {
      console.error('Error loading settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await supabase
        .from('platform_settings')
        .upsert({
          key: 'ai_agent_settings',
          value: settings,
          updated_at: new Date().toISOString()
        })
      
      toast.success('AI Agent settings saved!')
    } catch (err) {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const toggleSetting = (key) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const featureCards = [
    { id: 'predictions', name: 'Crash Predictions', description: 'AI predicts crash points based on historical data', icon: ChartBarIcon, enabled: settings.enablePredictions },
    { id: 'autoCashout', name: 'Auto Cashout', description: 'Automatically cashes out at optimal times', icon: BoltIcon, enabled: settings.autoCashoutEnabled },
    { id: 'historical', name: 'Historical Analysis', description: 'Analyzes past rounds for patterns', icon: BeakerIcon, enabled: settings.historicalAnalysis },
    { id: 'pattern', name: 'Pattern Recognition', description: 'Identifies betting patterns', icon: CpuChipIcon, enabled: settings.patternRecognition }
  ]

  const riskLevels = [
    { id: 'low', name: 'Conservative', color: 'text-green-400', desc: 'Lower rewards, minimal risk' },
    { id: 'medium', name: 'Balanced', color: 'text-yellow-400', desc: 'Moderate risk and rewards' },
    { id: 'high', name: 'Aggressive', color: 'text-red-400', desc: 'Higher rewards, higher risk' }
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Agent Settings</h1>
          <p className="text-admin-muted">Configure AI-powered game predictions and automation</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadSettings}
            className="p-2 rounded-lg bg-admin-card border border-admin-border text-admin-muted hover:text-white"
          >
            <ArrowPathIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-admin-card rounded-xl border border-admin-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/20">
              <ChartBarIcon className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-admin-muted">Total Predictions</p>
              <p className="text-xl font-bold text-white">{stats.totalPredictions}</p>
            </div>
          </div>
        </div>
        <div className="bg-admin-card rounded-xl border border-admin-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/20">
              <SparklesIcon className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-admin-muted">Accuracy</p>
              <p className="text-xl font-bold text-white">{stats.accuracy}%</p>
            </div>
          </div>
        </div>
        <div className="bg-admin-card rounded-xl border border-admin-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <CpuChipIcon className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-admin-muted">Active Users</p>
              <p className="text-xl font-bold text-white">{stats.activeUsers}</p>
            </div>
          </div>
        </div>
        <div className="bg-admin-card rounded-xl border border-admin-border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/20">
              <BoltIcon className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-admin-muted">Signals Generated</p>
              <p className="text-xl font-bold text-white">{stats.signalsGenerated}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-admin-card rounded-xl border border-admin-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <CogIcon className="w-6 h-6 text-primary-400" />
            <h2 className="text-lg font-semibold text-white">AI Features</h2>
          </div>
          
          <div className="space-y-4">
            {featureCards.map((feature) => (
              <div key={feature.id} className="flex items-center justify-between p-4 bg-admin-sidebar rounded-lg">
                <div className="flex items-center gap-3">
                  <feature.icon className="w-5 h-5 text-admin-muted" />
                  <div>
                    <p className="font-medium text-white">{feature.name}</p>
                    <p className="text-sm text-admin-muted">{feature.description}</p>
                  </div>
                </div>
                <button
                  onClick={() => toggleSetting(feature.id === 'predictions' ? 'enablePredictions' : 
                    feature.id === 'autoCashout' ? 'autoCashoutEnabled' :
                    feature.id === 'historical' ? 'historicalAnalysis' : 'patternRecognition')}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    feature.enabled ? 'bg-primary-500' : 'bg-admin-border'
                  }`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    feature.enabled ? 'left-7' : 'left-1'
                  }`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-admin-card rounded-xl border border-admin-border p-6">
            <div className="flex items-center gap-3 mb-6">
              <SparklesIcon className="w-6 h-6 text-primary-400" />
              <h2 className="text-lg font-semibold text-white">Risk Level</h2>
            </div>
            
            <div className="space-y-3">
              {riskLevels.map((level) => (
                <button
                  key={level.id}
                  onClick={() => updateSetting('riskLevel', level.id)}
                  className={`w-full p-4 rounded-lg border text-left transition-all ${
                    settings.riskLevel === level.id
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-admin-border hover:border-primary-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`font-medium ${level.color}`}>{level.name}</span>
                    {settings.riskLevel === level.id && (
                      <span className="text-primary-400">✓</span>
                    )}
                  </div>
                  <p className="text-sm text-admin-muted mt-1">{level.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-admin-card rounded-xl border border-admin-border p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Prediction Confidence</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-admin-muted">Minimum confidence to show</span>
                <span className="text-white font-bold">{settings.predictionConfidence}%</span>
              </div>
              <input
                type="range"
                min={50}
                max={95}
                value={settings.predictionConfidence}
                onChange={(e) => updateSetting('predictionConfidence', Number(e.target.value))}
                className="w-full h-2 bg-admin-border rounded-lg appearance-none cursor-pointer accent-primary-500"
              />
              <div className="flex justify-between text-xs text-admin-muted">
                <span>50%</span>
                <span>95%</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-admin-muted">Signal update interval</span>
                <span className="text-white font-bold">{settings.signalUpdates} seconds</span>
              </div>
              <input
                type="range"
                min={10}
                max={120}
                step={10}
                value={settings.signalUpdates}
                onChange={(e) => updateSetting('signalUpdates', Number(e.target.value))}
                className="w-full h-2 bg-admin-border rounded-lg appearance-none cursor-pointer accent-primary-500"
              />
            </div>

            <div className="mt-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-admin-muted">Max bet multiplier</span>
                <span className="text-white font-bold">{settings.maxBetMultiplier}x</span>
              </div>
              <input
                type="range"
                min={1}
                max={50}
                value={settings.maxBetMultiplier}
                onChange={(e) => updateSetting('maxBetMultiplier', Number(e.target.value))}
                className="w-full h-2 bg-admin-border rounded-lg appearance-none cursor-pointer accent-primary-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-3 bg-primary-500 hover:bg-primary-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </motion.div>
  )
}
