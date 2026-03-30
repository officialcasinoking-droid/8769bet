import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { Button, FormField, Input, Select, Toggle, Badge } from '../../components/ui/FormElements'
import {
  ArrowLeft, Zap, Users, Bot, TrendingUp, TrendingDown,
  Clock, DollarSign, BarChart3, Settings, Shield, Eye,
  Gauge, Target, Loader2, Play, Pause, AlertTriangle,
  ArrowDown, ArrowUp, Percent
} from 'lucide-react'

// ── API Functions ────────────────────────────────────────────
async function getGameById(id) {
  const { data, error } = await supabase.from('games').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

async function getGameState() {
  try {
    const { data } = await supabase.from('aviator_game_state').select('*').eq('id', 'current').single()
    return data || null
  } catch { return null }
}

async function getLiveHEMetrics() {
  try {
    const { data } = await supabase.from('aviator_live_he').select('*').eq('id', 'metrics').single()
    return data
  } catch { return null }
}

async function getGameSettingsDB() {
  try {
    const { data } = await supabase.from('aviator_settings').select('*').eq('id', 'config').single()
    return data || { house_edge: 0.05, he_mode: 'off', he_target_pct: 5, he_min_secs: 3, he_max_secs: 50 }
  } catch { return { house_edge: 0.05, he_mode: 'off', he_target_pct: 5, he_min_secs: 3, he_max_secs: 50 } }
}

async function saveGameSettingsDB(settings) {
  try {
    await supabase.from('aviator_settings').upsert({
      id: 'config',
      house_edge: settings.house_edge || 0.05,
      he_mode: settings.he_mode || 'off',
      he_target_pct: settings.he_target_pct || 5,
      he_min_secs: settings.he_min_secs || 3,
      he_max_secs: settings.he_max_secs || 50,
      updated_at: new Date().toISOString()
    })
    localStorage.setItem('aviator_settings', JSON.stringify({ ...settings, ts: Date.now() }))
  } catch (e) { console.warn('[saveGameSettingsDB]', e?.message) }
}

async function getRecentCrashes(limit = 20) {
  try {
    const { data } = await supabase
      .from('game_rounds').select('round_id, crash_point, created_at, house_profit, bet_count, total_bet_amount, total_exit_amount')
      .eq('status', 'crashed').order('created_at', { ascending: false }).limit(limit)
    return data || []
  } catch { return [] }
}

async function getCurrentRoundBets() {
  try {
    const { data } = await supabase.from('game_bets').select('*').order('created_at', { ascending: false }).limit(50)
    return data || []
  } catch { return [] }
}

// INSTANT manual crash - no confirmation
async function triggerManualCrash() {
  try {
    // Set in localStorage for immediate local game pickup
    localStorage.setItem('aviator_manual_crash', JSON.stringify({ v: true, ts: Date.now() }))
    // Also set in Supabase for remote game instances
    await supabase.from('aviator_signals').upsert({
      id: 'crash', signal: 'crash', timestamp: Date.now(), processed: false
    })
  } catch (e) { console.warn('[triggerManualCrash]', e?.message) }
}

async function getHouseEdgePool() {
  try {
    const { data } = await supabase.from('aviator_house_edge').select('*').eq('id', 'pool').single()
    return data || { total_deposits: 0, total_bets: 0, total_winnings_paid: 0, house_edge_pool: 0, total_withdrawals_paid: 0, gross_pnl: 0, rounds_played: 0 }
  } catch {
    return { total_deposits: 0, total_bets: 0, total_winnings_paid: 0, house_edge_pool: 0, total_withdrawals_paid: 0, gross_pnl: 0, rounds_played: 0 }
  }
}

// ── Control Bar ──────────────────────────────────────────────
function ControlBar({ gameState, settings, onCrash, onSettingsChange, heMetrics }) {
  const [autoMode, setAutoMode] = useState(settings?.he_mode !== 'off')
  const [targetPct, setTargetPct] = useState(settings?.he_target_pct || 5)
  const [saving, setSaving] = useState(false)
  const isFlying = gameState?.phase === 'flying'
  const isAuto = settings?.he_mode !== 'off'

  const handleToggleAuto = async () => {
    const newMode = isAuto ? 'off' : 'smart'
    setSaving(true)
    try {
      const newSettings = { ...settings, he_mode: newMode }
      await saveGameSettingsDB(newSettings)
      onSettingsChange?.(newSettings)
      setAutoMode(newMode !== 'off')
      toast.success(newMode === 'off' ? 'Auto mode OFF' : 'Auto mode ON – Monitoring real pot')
    } catch (e) {
      toast.error(`Failed: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleTargetChange = async (val) => {
    const pct = parseInt(val)
    setTargetPct(pct)
    const newSettings = { ...settings, he_target_pct: pct }
    await saveGameSettingsDB(newSettings)
    onSettingsChange?.(newSettings)
  }

  // Real pot calculation
  const realBets = heMetrics?.real_bets || 0
  const exitedAmt = heMetrics?.exited_amt || 0
  const pendingAmt = heMetrics?.pending_amt || 0
  const remainingPct = realBets > 0 ? ((pendingAmt / realBets) * 100) : 100

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Manual Crash */}
        <Button
          variant="danger"
          onClick={onCrash}
          disabled={!isFlying}
          className={`text-base font-bold px-6 py-3 ${isFlying ? 'animate-pulse shadow-lg shadow-red-500/30' : ''}`}
        >
          <Zap className="w-5 h-5" />
          {isFlying ? 'CRASH NOW' : 'Waiting...'}
        </Button>

        {/* Auto Toggle */}
        <div className="flex items-center gap-3">
          <div className={`px-3 py-2 rounded-lg border ${isAuto ? 'bg-emerald-500/15 border-emerald-500/30' : 'bg-slate-800/50 border-slate-700/50'}`}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isAuto ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
              <span className={`text-xs font-medium ${isAuto ? 'text-emerald-400' : 'text-slate-400'}`}>
                {isAuto ? 'Auto Mode Active – Monitoring Real Pot' : 'Auto Mode OFF'}
              </span>
            </div>
          </div>
          <button onClick={handleToggleAuto} disabled={saving}
            className={`relative w-14 h-7 rounded-full transition-colors ${isAuto ? 'bg-emerald-500' : 'bg-slate-700'}`}>
            <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${isAuto ? 'translate-x-7' : ''}`} />
          </button>
        </div>

        {/* Target % */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Auto-Crash at:</span>
          <select value={targetPct} onChange={e => handleTargetChange(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-sm text-white">
            {[1, 2, 3, 5, 7, 10, 15, 20].map(p => (
              <option key={p} value={p}>{p}% remaining</option>
            ))}
          </select>
        </div>

        {/* Current Status */}
        <div className="flex items-center gap-3 text-xs">
          <div className="px-2 py-1 bg-slate-800/50 rounded-lg">
            <span className="text-slate-500">Real Pot:</span>
            <span className="text-white font-bold ml-1">₹{Number(realBets).toLocaleString()}</span>
          </div>
          <div className="px-2 py-1 bg-slate-800/50 rounded-lg">
            <span className="text-slate-500">Remaining:</span>
            <span className={`font-bold ml-1 ${remainingPct <= targetPct ? 'text-red-400' : 'text-emerald-400'}`}>
              {remainingPct.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Live Preview Canvas ──────────────────────────────────────
function LiveGamePreview({ gameState, crashHistory }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const multRef = useRef(1.00)
  const phaseRef = useRef('betting')

  useEffect(() => {
    if (gameState) {
      multRef.current = gameState.mult || 1.00
      phaseRef.current = gameState.phase || 'betting'
    }
  }, [gameState])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const w = canvas.width = canvas.offsetWidth * 2
    const h = canvas.height = canvas.offsetHeight * 2
    ctx.scale(2, 2)
    const cw = w / 2
    const ch = h / 2

    ctx.fillStyle = '#0c1220'
    ctx.fillRect(0, 0, cw, ch)

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 0.5
    for (let i = 0; i < 10; i++) {
      ctx.beginPath(); ctx.moveTo(0, (ch / 10) * i); ctx.lineTo(cw, (ch / 10) * i); ctx.stroke()
      ctx.beginPath(); ctx.moveTo((cw / 10) * i, 0); ctx.lineTo((cw / 10) * i, ch); ctx.stroke()
    }

    const mult = multRef.current
    const phase = phaseRef.current

    // Curve
    if (phase === 'flying' || phase === 'crashed') {
      ctx.beginPath()
      ctx.strokeStyle = phase === 'crashed' ? '#ff4d4d' : '#00e887'
      ctx.lineWidth = 2.5
      ctx.shadowColor = phase === 'crashed' ? '#ff4d4d' : '#00e887'
      ctx.shadowBlur = 8

      const maxMult = Math.max(mult, 5)
      const steps = 100
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const m = 1 + (maxMult - 1) * t
        const x = 40 + (cw - 80) * t
        const y = ch - 40 - (ch - 80) * (Math.log(m) / Math.log(maxMult))
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y)
      }
      ctx.stroke()
      ctx.shadowBlur = 0

      // Plane
      const planeT = Math.min(Math.log(mult) / Math.log(maxMult), 1)
      const px = 40 + (cw - 80) * planeT
      const py = ch - 40 - (ch - 80) * planeT
      ctx.beginPath()
      ctx.arc(px, py, 12, 0, Math.PI * 2)
      ctx.fillStyle = phase === 'crashed' ? 'rgba(255,77,77,0.3)' : 'rgba(0,232,135,0.3)'
      ctx.fill()
      ctx.font = '16px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(phase === 'crashed' ? '💥' : '✈️', px, py)
    }

    // Multiplier text
    ctx.font = `bold ${phase === 'flying' ? 48 : 36}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    if (phase === 'flying') {
      ctx.fillStyle = '#00e887'
      ctx.shadowColor = '#00e887'
      ctx.shadowBlur = 20
      ctx.fillText(`${mult.toFixed(2)}x`, cw / 2, ch / 2)
    } else if (phase === 'crashed') {
      ctx.fillStyle = '#ff4d4d'
      ctx.shadowColor = '#ff4d4d'
      ctx.shadowBlur = 20
      ctx.fillText(`CRASHED`, cw / 2, ch / 2 - 10)
      ctx.font = 'bold 24px sans-serif'
      ctx.fillText(`${mult.toFixed(2)}x`, cw / 2, ch / 2 + 25)
    } else {
      ctx.fillStyle = '#ffffff'
      ctx.fillText('NEXT ROUND', cw / 2, ch / 2 - 15)
      ctx.font = '16px sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.fillText('Waiting for bets...', cw / 2, ch / 2 + 15)
    }
    ctx.shadowBlur = 0

    // Crash history bar
    if (crashHistory?.length > 0) {
      crashHistory.slice(0, 15).forEach((crash, i) => {
        const x = 10 + i * 35
        const cp = Number(crash.crash_point || crash)
        ctx.font = '10px sans-serif'
        ctx.fillStyle = cp >= 10 ? '#00e887' : cp >= 2 ? '#ffd600' : '#ff4d4d'
        ctx.textAlign = 'center'
        ctx.fillText(`${cp.toFixed(1)}x`, x, ch - 25)
      })
    }

    animRef.current = requestAnimationFrame(draw)
  }, [crashHistory])

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw)
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [draw])

  return (
    <div className="relative w-full aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-700/50">
      <canvas ref={canvasRef} className="w-full h-full" />
      <div className="absolute top-3 left-3">
        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
          gameState?.phase === 'flying' ? 'bg-emerald-500/20 text-emerald-400' :
          gameState?.phase === 'crashed' ? 'bg-red-500/20 text-red-400' :
          'bg-amber-500/20 text-amber-400'
        }`}>
          {gameState?.phase?.toUpperCase() || 'BETTING'}
        </span>
      </div>
    </div>
  )
}

// ── House Edge Panel with Analytics ──────────────────────────
function HouseEdgePanel({ settings, onSettingsChange, heMetrics, hePool, crashes }) {
  const [saving, setSaving] = useState(false)
  const [localSettings, setLocalSettings] = useState(settings || {})

  useEffect(() => { setLocalSettings(settings || {}) }, [settings])

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveGameSettingsDB(localSettings)
      onSettingsChange?.(localSettings)
      toast.success('Settings saved')
    } catch (e) { toast.error(`Save failed: ${e.message}`) }
    finally { setSaving(false) }
  }

  // Calculate historical income
  const last10RoundsIncome = crashes.slice(0, 10).reduce((s, c) => s + Number(c.house_profit || 0), 0)
  const last1DayIncome = crashes.filter(c => {
    const d = new Date(c.created_at)
    return (Date.now() - d.getTime()) < 86400000
  }).reduce((s, c) => s + Number(c.house_profit || 0), 0)
  const last30DaysIncome = crashes.reduce((s, c) => s + Number(c.house_profit || 0), 0)

  // Current round income calculation (real users only)
  const currentRealBets = heMetrics?.real_bets || 0
  const currentExited = heMetrics?.exited_amt || 0
  const currentPending = heMetrics?.pending_amt || 0
  const currentRoundIncome = currentRealBets - currentExited - currentPending

  return (
    <div className="space-y-6">
      {/* Current Round Live Stats */}
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5">
        <h4 className="text-sm font-bold text-emerald-400 mb-4 flex items-center gap-2">
          <Gauge className="w-4 h-4" /> Current Round (Real Users Only)
        </h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-xs text-slate-400">Total Real Pot</p>
            <p className="text-xl font-bold text-white">₹{Number(currentRealBets).toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400">House Income</p>
            <p className="text-xl font-bold text-emerald-400">₹{Number(currentRoundIncome).toLocaleString()}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-slate-400">Auto System Added</p>
            <p className="text-xl font-bold text-amber-400">₹{Number(currentExited).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Historical Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-400">Last 10 Rounds</p>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">₹{last10RoundsIncome.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-400">House Income 1 Day</p>
            {last1DayIncome >= 0 ? <ArrowUp className="w-4 h-4 text-emerald-400" /> : <ArrowDown className="w-4 h-4 text-red-400" />}
          </div>
          <p className="text-2xl font-bold text-white">₹{last1DayIncome.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-400">House Income 30 Days</p>
            {last30DaysIncome >= 0 ? <ArrowUp className="w-4 h-4 text-emerald-400" /> : <ArrowDown className="w-4 h-4 text-red-400" />}
          </div>
          <p className="text-2xl font-bold text-white">₹{last30DaysIncome.toLocaleString('en-IN')}</p>
        </div>
      </div>

      {/* Pool Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Bets', value: `₹${Number(hePool?.total_bets || 0).toLocaleString()}`, color: 'text-blue-400' },
          { label: 'Total Winnings', value: `₹${Number(hePool?.total_winnings_paid || 0).toLocaleString()}`, color: 'text-emerald-400' },
          { label: 'HE Pool', value: `₹${Number(hePool?.house_edge_pool || 0).toLocaleString()}`, color: 'text-amber-400' },
          { label: 'Rounds', value: hePool?.rounds_played || 0, color: 'text-purple-400' },
        ].map((s, i) => (
          <div key={s.label} className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-3">
            <p className="text-[10px] text-slate-500 uppercase">{s.label}</p>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* P&L */}
      <div className={`p-4 rounded-xl border ${(hePool?.gross_pnl || 0) >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Gross P&L</p>
            <p className={`text-2xl font-bold ${(hePool?.gross_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              ₹{Number(hePool?.gross_pnl || 0).toLocaleString('en-IN')}
            </p>
          </div>
          {(hePool?.gross_pnl || 0) >= 0 ? <TrendingUp className="w-8 h-8 text-emerald-400" /> : <TrendingDown className="w-8 h-8 text-red-400" />}
        </div>
      </div>

      {/* Settings */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <Settings className="w-4 h-4 text-slate-400" /> HE Configuration
        </h4>
        <FormField label={`House Edge (${((localSettings.house_edge || 0.05) * 100).toFixed(1)}%)`}>
          <div className="flex items-center gap-3">
            <input type="range" min="0.01" max="0.20" step="0.01"
              value={localSettings.house_edge || 0.05}
              onChange={e => setLocalSettings(s => ({ ...s, house_edge: parseFloat(e.target.value) }))}
              className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
            <Input type="number" min="1" max="20" step="0.5"
              value={((localSettings.house_edge || 0.05) * 100).toFixed(1)}
              onChange={e => setLocalSettings(s => ({ ...s, house_edge: parseFloat(e.target.value) / 100 }))}
              className="w-20" />
          </div>
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Min Flight (sec)">
            <Input type="number" min="1" max="30" value={localSettings.he_min_secs || 3}
              onChange={e => setLocalSettings(s => ({ ...s, he_min_secs: parseInt(e.target.value) }))} />
          </FormField>
          <FormField label="Max Flight (sec)">
            <Input type="number" min="5" max="120" value={localSettings.he_max_secs || 50}
              onChange={e => setLocalSettings(s => ({ ...s, he_max_secs: parseInt(e.target.value) }))} />
          </FormField>
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
          Save HE Settings
        </Button>
      </div>

      {/* Info */}
      <div className="p-3 bg-slate-800/30 border border-slate-700/50 rounded-xl">
        <p className="text-xs text-slate-400">
          <strong className="text-slate-300">Auto Crash Logic:</strong> When enabled, the system monitors real user bets (excluding bots).
          When only <strong className="text-amber-400">{localSettings.he_target_pct || 5}%</strong> of the real pot remains uncashed,
          the round auto-crashes. All calculations exclude bot traffic.
        </p>
      </div>
    </div>
  )
}

// ── Live Bet Feed ────────────────────────────────────────────
function LiveBetFeed({ bets }) {
  return (
    <div className="space-y-2 max-h-[500px] overflow-y-auto">
      {bets.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <Users className="w-8 h-8 mx-auto mb-2 text-slate-700" />
          <p className="text-sm">No bets yet this round</p>
        </div>
      ) : bets.map((bet, i) => (
        <motion.div key={bet.id || i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
          className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg hover:bg-slate-700/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${bet.is_bot ? 'bg-purple-500/20' : 'bg-blue-500/20'}`}>
              {bet.is_bot ? <Bot className="w-4 h-4 text-purple-400" /> : <Users className="w-4 h-4 text-blue-400" />}
            </div>
            <div>
              <p className="text-sm font-medium text-white">{bet.username || 'Anonymous'}</p>
              <p className="text-[10px] text-slate-500">{bet.is_bot ? 'Bot' : 'Real'} • {new Date(bet.created_at).toLocaleTimeString()}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-white">₹{Number(bet.amount).toLocaleString('en-IN')}</p>
            {bet.status === 'won' && <p className="text-xs text-emerald-400">×{Number(bet.cashout_at).toFixed(2)} → ₹{Number(bet.cashout_amount || bet.won_amount).toLocaleString()}</p>}
            {bet.status === 'lost' && <p className="text-xs text-red-400">Lost</p>}
            {bet.status === 'pending' && <p className="text-xs text-amber-400">Pending</p>}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// ── Crash History ────────────────────────────────────────────
function CrashHistory({ crashes }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {crashes.map((crash, i) => {
          const cp = Number(crash.crash_point)
          return (
            <motion.div key={crash.round_id || i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.02 }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${cp >= 10 ? 'bg-emerald-500/20 text-emerald-400' : cp >= 2 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
              {cp.toFixed(2)}x
            </motion.div>
          )
        })}
      </div>
      {crashes.length === 0 && <p className="text-sm text-slate-500 py-4 text-center">No crash history yet</p>}
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────
export default function GameDetailView() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const gameId = slug
  const [activeTab, setActiveTab] = useState('house-edge')
  const [gameState, setGameState] = useState(null)
  const [liveBets, setLiveBets] = useState([])
  const [crashHistory, setCrashHistory] = useState([])
  const [heMetrics, setHeMetrics] = useState(null)
  const [hePool, setHePool] = useState(null)
  const [settings, setSettings] = useState(null)

  const { data: game, isLoading } = useQuery({
    queryKey: ['admin-game', gameId],
    queryFn: () => getGameById(gameId),
    enabled: !!gameId,
  })

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      const [gs, bets, crashes, metrics, pool, cfg] = await Promise.all([
        getGameState(), getCurrentRoundBets(), getRecentCrashes(30), getLiveHEMetrics(), getHouseEdgePool(), getGameSettingsDB(),
      ])
      setGameState(gs); setLiveBets(bets); setCrashHistory(crashes); setHeMetrics(metrics); setHePool(pool); setSettings(cfg)
    }
    loadData()
  }, [])

  // Realtime subscriptions
  useEffect(() => {
    const channels = []
    try {
      channels.push(supabase.channel('gs-admin').on('postgres_changes', { event: '*', schema: 'public', table: 'aviator_game_state' }, (p) => setGameState(p.new)).subscribe())
    } catch {}
    try {
      channels.push(supabase.channel('bets-admin').on('postgres_changes', { event: '*', schema: 'public', table: 'game_bets' }, async () => {
        const bets = await getCurrentRoundBets(); setLiveBets(bets)
      }).subscribe())
    } catch {}
    try {
      channels.push(supabase.channel('he-m-admin').on('postgres_changes', { event: '*', schema: 'public', table: 'aviator_live_he' }, (p) => setHeMetrics(p.new)).subscribe())
    } catch {}
    try {
      channels.push(supabase.channel('he-p-admin').on('postgres_changes', { event: '*', schema: 'public', table: 'aviator_house_edge' }, (p) => setHePool(p.new)).subscribe())
    } catch {}
    try {
      channels.push(supabase.channel('crash-admin').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_rounds' }, async () => {
        const crashes = await getRecentCrashes(30); setCrashHistory(crashes)
      }).subscribe())
    } catch {}
    return () => { channels.forEach(ch => { try { supabase.removeChannel(ch) } catch {} }) }
  }, [qc])

  // Refresh bets every 2 seconds
  useEffect(() => {
    const iv = setInterval(async () => { const bets = await getCurrentRoundBets(); setLiveBets(bets) }, 2000)
    return () => clearInterval(iv)
  }, [])

  // INSTANT crash handler - NO confirmation
  const handleInstantCrash = async () => {
    toast.loading('Crashing...', { duration: 500 })
    await triggerManualCrash()
    toast.success('Crash signal sent!')
  }

  const TABS = [
    { id: 'house-edge', label: 'House Edge', icon: Shield },
    { id: 'bets', label: 'Live Bets', icon: Users },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'overview', label: 'Overview', icon: Eye },
  ]

  if (isLoading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>

  if (!game) return (
    <div className="text-center py-16">
      <p className="text-slate-400">Game not found</p>
      <Button variant="outline" onClick={() => navigate('/games')} className="mt-4"><ArrowLeft className="w-4 h-4" /> Back</Button>
    </div>
  )

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/games')}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              {game.thumbnail_url ? <img src={game.thumbnail_url} alt="" className="w-8 h-8 rounded-lg object-cover" /> : '🎮'}
              {game.name}
            </h2>
            <p className="text-sm text-slate-400">{game.provider} • {game.category}</p>
          </div>
        </div>
        <Badge variant={game.is_active ? 'emerald' : 'red'}>{game.is_active ? 'Active' : 'Disabled'}</Badge>
      </div>

      {/* Control Bar */}
      <ControlBar gameState={gameState} settings={settings} onCrash={handleInstantCrash} onSettingsChange={setSettings} heMetrics={heMetrics} />

      {/* Preview + Bets Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <LiveGamePreview gameState={gameState} crashHistory={crashHistory} />
        </div>
        <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/50 rounded-xl p-4">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" /> Live Bets
            <span className="text-xs text-slate-500 ml-auto">{liveBets.filter(b => !b.is_bot).length} real</span>
          </h3>
          <LiveBetFeed bets={liveBets.slice(0, 15)} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-800/60 rounded-xl border border-slate-700/50 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id ? 'bg-emerald-500/15 text-emerald-400' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}>
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
          {activeTab === 'house-edge' && <HouseEdgePanel settings={settings} onSettingsChange={setSettings} heMetrics={heMetrics} hePool={hePool} crashes={crashHistory} />}
          {activeTab === 'bets' && <LiveBetFeed bets={liveBets} />}
          {activeTab === 'history' && <CrashHistory crashes={crashHistory} />}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-3">
                <h3 className="text-lg font-bold text-white">Game Info</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-slate-500">Name:</span> <span className="text-white">{game.name}</span></div>
                  <div><span className="text-slate-500">Provider:</span> <span className="text-white">{game.provider}</span></div>
                  <div><span className="text-slate-500">Category:</span> <span className="text-white">{game.category}</span></div>
                  <div><span className="text-slate-500">RTP:</span> <span className="text-emerald-400">{Number(game.rtp || 0).toFixed(1)}%</span></div>
                  <div><span className="text-slate-500">Max Multi:</span> <span className="text-white">{game.max_multiplier}x</span></div>
                </div>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-3">
                <h3 className="text-lg font-bold text-white">Live Status</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-slate-500">Phase:</span> <span className="text-white capitalize">{gameState?.phase || 'Unknown'}</span></div>
                  <div><span className="text-slate-500">Multiplier:</span> <span className="text-emerald-400 font-bold">{(gameState?.mult || 1).toFixed(2)}x</span></div>
                  <div><span className="text-slate-500">Bets:</span> <span className="text-white">{liveBets.length}</span></div>
                  <div><span className="text-slate-500">Real Users:</span> <span className="text-blue-400">{liveBets.filter(b => !b.is_bot).length}</span></div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
