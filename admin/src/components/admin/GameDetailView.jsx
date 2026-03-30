import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { Button, FormField, Input, Select, Toggle, Badge } from '../../components/ui/FormElements'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '../../components/ui/Dialog'
import {
  ArrowLeft, Play, Pause, AlertTriangle, Zap, Users, Bot,
  TrendingUp, TrendingDown, Clock, DollarSign, BarChart3,
  RefreshCw, Settings, Shield, Eye, EyeOff, Gauge, Target,
  ChevronDown, ChevronUp, Loader2
} from 'lucide-react'

// ── API Functions ────────────────────────────────────────────
async function getGameById(id) {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .eq('id', id)
    .single()
  if (error) throw error
  return data
}

async function getGameState() {
  try {
    const { data } = await supabase
      .from('aviator_game_state')
      .select('*')
      .eq('id', 'current')
      .single()
    return data || null
  } catch { return null }
}

async function getLiveHEMetrics() {
  try {
    const { data } = await supabase
      .from('aviator_live_he')
      .select('*')
      .eq('id', 'metrics')
      .single()
    return data
  } catch { return null }
}

async function getGameSettingsDB() {
  try {
    const { data } = await supabase
      .from('aviator_settings')
      .select('*')
      .eq('id', 'config')
      .single()
    return data || null
  } catch { return null }
}

async function saveGameSettingsDB(settings) {
  try {
    await supabase
      .from('aviator_settings')
      .upsert({
        id: 'config',
        house_edge: settings.houseEdge || 0.05,
        bias_strength: settings.biasStrength || 50,
        he_mode: settings.heMode || 'off',
        he_target_pct: settings.heTargetPct || 5,
        he_min_secs: settings.heMinSecs || 3,
        he_max_secs: settings.heMaxSecs || 50,
        auto_target_secs: settings.autoTargetSecs || 8,
        updated_at: new Date().toISOString()
      })
  } catch (e) {
    console.warn('[saveGameSettingsDB]', e?.message)
  }
}

async function getRecentCrashes(limit = 20) {
  try {
    const { data } = await supabase
      .from('game_rounds')
      .select('round_id, crash_point, created_at, house_profit, bet_count, total_bet_amount, total_exit_amount')
      .eq('status', 'crashed')
      .order('created_at', { ascending: false })
      .limit(limit)
    return data || []
  } catch { return [] }
}

async function getCurrentRoundBets() {
  try {
    const { data } = await supabase
      .from('game_bets')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    return data || []
  } catch { return [] }
}

async function setManualCrashSignalDB() {
  try {
    await supabase
      .from('aviator_signals')
      .upsert({
        id: 'crash',
        signal: 'crash',
        timestamp: Date.now(),
        processed: false
      })
    // Also set in localStorage for local game instances
    localStorage.setItem('aviator_manual_crash', JSON.stringify({ v: true, ts: Date.now() }))
  } catch (e) {
    console.warn('[setManualCrashSignal]', e?.message)
  }
}

async function getHouseEdgePool() {
  try {
    const { data } = await supabase
      .from('aviator_house_edge')
      .select('*')
      .eq('id', 'pool')
      .single()
    return data || {
      total_deposits: 0, total_bets: 0, total_winnings_paid: 0,
      house_edge_pool: 0, total_withdrawals_paid: 0, gross_pnl: 0, rounds_played: 0,
    }
  } catch {
    return {
      total_deposits: 0, total_bets: 0, total_winnings_paid: 0,
      house_edge_pool: 0, total_withdrawals_paid: 0, gross_pnl: 0, rounds_played: 0,
    }
  }
}

// ── Live Preview Canvas ──────────────────────────────────────
function LiveGamePreview({ gameState, crashHistory }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const multRef = useRef(1.00)
  const phaseRef = useRef('betting')
  const planeRef = useRef({ x: 0, y: 0, trail: [] })

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

    // Background
    ctx.fillStyle = '#0c1220'
    ctx.fillRect(0, 0, cw, ch)

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.04)'
    ctx.lineWidth = 0.5
    for (let i = 0; i < 10; i++) {
      ctx.beginPath()
      ctx.moveTo(0, (ch / 10) * i)
      ctx.lineTo(cw, (ch / 10) * i)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo((cw / 10) * i, 0)
      ctx.lineTo((cw / 10) * i, ch)
      ctx.stroke()
    }

    const mult = multRef.current
    const phase = phaseRef.current

    // Draw curve
    if (phase === 'flying' || phase === 'crashed') {
      ctx.beginPath()
      ctx.strokeStyle = phase === 'crashed' ? '#ff4d4d' : '#00e887'
      ctx.lineWidth = 2.5
      ctx.shadowColor = phase === 'crashed' ? '#ff4d4d' : '#00e887'
      ctx.shadowBlur = 8

      const points = []
      const maxMult = Math.max(mult, 5)
      const steps = 100

      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const m = 1 + (maxMult - 1) * t
        const x = 40 + (cw - 80) * t
        const y = ch - 40 - (ch - 80) * (Math.log(m) / Math.log(maxMult))
        points.push({ x, y })
      }

      ctx.moveTo(points[0].x, points[0].y)
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y)
      }
      ctx.stroke()
      ctx.shadowBlur = 0

      // Plane position
      const planeT = Math.min(Math.log(mult) / Math.log(maxMult), 1)
      const px = 40 + (cw - 80) * planeT
      const py = ch - 40 - (ch - 80) * planeT

      // Plane glow
      ctx.beginPath()
      ctx.arc(px, py, 12, 0, Math.PI * 2)
      ctx.fillStyle = phase === 'crashed' ? 'rgba(255,77,77,0.3)' : 'rgba(0,232,135,0.3)'
      ctx.fill()

      // Plane icon
      ctx.font = '16px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(phase === 'crashed' ? '💥' : '✈️', px, py)
    }

    // Multiplier text
    ctx.font = `bold ${phase === 'flying' ? 48 : 36}px 'Exo 2', sans-serif`
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
    } else if (phase === 'betting') {
      ctx.fillStyle = '#ffffff'
      ctx.fillText('NEXT ROUND', cw / 2, ch / 2 - 15)
      ctx.font = '16px sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.fillText('Waiting for bets...', cw / 2, ch / 2 + 15)
    }
    ctx.shadowBlur = 0

    // Recent crashes bar at bottom
    if (crashHistory?.length > 0) {
      const barY = ch - 25
      crashHistory.slice(0, 15).forEach((crash, i) => {
        const x = 10 + i * 35
        const cp = Number(crash.crash_point || crash)
        ctx.font = '10px sans-serif'
        ctx.fillStyle = cp >= 10 ? '#00e887' : cp >= 2 ? '#ffd600' : '#ff4d4d'
        ctx.textAlign = 'center'
        ctx.fillText(`${cp.toFixed(1)}x`, x, barY)
      })
    }

    animRef.current = requestAnimationFrame(draw)
  }, [crashHistory])

  useEffect(() => {
    animRef.current = requestAnimationFrame(draw)
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [draw])

  return (
    <div className="relative w-full aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-700/50">
      <canvas ref={canvasRef} className="w-full h-full" style={{ imageRendering: 'auto' }} />
      {/* Phase indicator */}
      <div className="absolute top-3 left-3 flex items-center gap-2">
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

// ── Real-time Stats Panel ────────────────────────────────────
function RealTimeStats({ bets, gameState }) {
  const realBets = bets.filter(b => !b.is_bot)
  const botBets = bets.filter(b => b.is_bot)
  const realTotal = realBets.reduce((s, b) => s + Number(b.amount || 0), 0)
  const botTotal = botBets.reduce((s, b) => s + Number(b.amount || 0), 0)
  const cashedOut = bets.filter(b => b.status === 'won')
  const cashedOutTotal = cashedOut.reduce((s, b) => s + Number(b.cashout_amount || b.won_amount || 0), 0)

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {[
        { label: 'Real Users', value: realBets.length, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/15' },
        { label: 'Bots', value: botBets.length, icon: Bot, color: 'text-purple-400', bg: 'bg-purple-500/15' },
        { label: 'Real Bets', value: `₹${realTotal.toLocaleString('en-IN')}`, icon: DollarSign, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
        { label: 'Cashed Out', value: `₹${cashedOutTotal.toLocaleString('en-IN')}`, icon: TrendingUp, color: 'text-cyan-400', bg: 'bg-cyan-500/15' },
      ].map((stat, i) => {
        const Icon = stat.icon
        return (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`${stat.bg} border border-slate-700/50 rounded-xl p-3`}>
            <div className="flex items-center gap-2 mb-1">
              <Icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-[10px] text-slate-400 uppercase">{stat.label}</span>
            </div>
            <p className="text-lg font-bold text-white">{stat.value}</p>
          </motion.div>
        )
      })}
    </div>
  )
}

// ── House Edge Control Panel ─────────────────────────────────
function HouseEdgeControl({ settings, onSettingsChange, onManualCrash }) {
  const [localSettings, setLocalSettings] = useState(settings || {})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setLocalSettings(settings || {})
  }, [settings])

  const handleSave = async () => {
    setSaving(true)
    try {
      await saveGameSettingsDB(localSettings)
      // Also save to localStorage for the game to read
      localStorage.setItem('aviator_settings', JSON.stringify({ ...localSettings, ts: Date.now() }))
      onSettingsChange?.(localSettings)
      toast.success('Settings saved')
    } catch (e) {
      toast.error(`Save failed: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Manual Crash */}
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Manual Crash
            </h4>
            <p className="text-xs text-slate-400 mt-1">Instantly crash the current running round</p>
          </div>
          <Button variant="danger" onClick={onManualCrash}>
            <Zap className="w-4 h-4" /> CRASH NOW
          </Button>
        </div>
      </div>

      {/* House Edge Settings */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-4">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" /> House Edge Configuration
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

        <FormField label="HE Mode">
          <Select value={localSettings.he_mode || 'off'}
            onChange={e => setLocalSettings(s => ({ ...s, he_mode: e.target.value }))}>
            <option value="off">Off (Random)</option>
            <option value="smart">Smart Auto (Recommended)</option>
            <option value="aggressive">Aggressive</option>
          </Select>
        </FormField>

        {localSettings.he_mode !== 'off' && (
          <>
            <FormField label={`Auto-Crash Target (${localSettings.he_target_pct || 5}%)`}
              hint="Auto-crash when remaining real pot is this % of total">
              <div className="flex items-center gap-3">
                <input type="range" min="1" max="20" step="1"
                  value={localSettings.he_target_pct || 5}
                  onChange={e => setLocalSettings(s => ({ ...s, he_target_pct: parseInt(e.target.value) }))}
                  className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                <Input type="number" min="1" max="20"
                  value={localSettings.he_target_pct || 5}
                  onChange={e => setLocalSettings(s => ({ ...s, he_target_pct: parseInt(e.target.value) }))}
                  className="w-16" />
              </div>
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Min Flight (sec)">
                <Input type="number" min="1" max="30"
                  value={localSettings.he_min_secs || 3}
                  onChange={e => setLocalSettings(s => ({ ...s, he_min_secs: parseInt(e.target.value) }))} />
              </FormField>
              <FormField label="Max Flight (sec)">
                <Input type="number" min="5" max="120"
                  value={localSettings.he_max_secs || 50}
                  onChange={e => setLocalSettings(s => ({ ...s, he_max_secs: parseInt(e.target.value) }))} />
              </FormField>
            </div>
          </>
        )}

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
          Save House Edge Settings
        </Button>
      </div>

      {/* Info */}
      <div className="p-3 bg-slate-800/30 border border-slate-700/50 rounded-xl">
        <p className="text-xs text-slate-400">
          <strong className="text-slate-300">How Auto-Crash works:</strong> When HE mode is "Smart", the system monitors real user bets and cashouts.
          When real users have cashed out and only <strong className="text-amber-400">{localSettings.he_target_pct || 5}%</strong> of the real pot remains uncashed,
          the round auto-crashes to protect house edge.
        </p>
      </div>
    </div>
  )
}

// ── Live Bet Feed ────────────────────────────────────────────
function LiveBetFeed({ bets }) {
  return (
    <div className="space-y-2 max-h-96 overflow-y-auto">
      {bets.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <Users className="w-8 h-8 mx-auto mb-2 text-slate-700" />
          <p className="text-sm">No bets yet this round</p>
        </div>
      ) : bets.map((bet, i) => (
        <motion.div key={bet.id || i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center justify-between p-3 bg-slate-800/30 rounded-lg hover:bg-slate-700/30 transition-colors">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              bet.is_bot ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
            }`}>
              {bet.is_bot ? <Bot className="w-4 h-4" /> : <Users className="w-4 h-4" />}
            </div>
            <div>
              <p className="text-sm font-medium text-white">{bet.username || 'Anonymous'}</p>
              <p className="text-[10px] text-slate-500">
                {bet.is_bot ? 'Bot' : 'Real'} • {new Date(bet.created_at).toLocaleTimeString()}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-white">₹{Number(bet.amount).toLocaleString('en-IN')}</p>
            {bet.status === 'won' && (
              <p className="text-xs text-emerald-400">
                ×{Number(bet.cashout_at).toFixed(2)} → ₹{Number(bet.cashout_amount || bet.won_amount).toLocaleString('en-IN')}
              </p>
            )}
            {bet.status === 'lost' && (
              <p className="text-xs text-red-400">Lost</p>
            )}
            {bet.status === 'pending' && (
              <p className="text-xs text-amber-400">Pending</p>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// ── Recent Crash History ─────────────────────────────────────
function CrashHistory({ crashes }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {crashes.map((crash, i) => {
          const cp = Number(crash.crash_point)
          return (
            <motion.div key={crash.round_id || i}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.02 }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                cp >= 10 ? 'bg-emerald-500/20 text-emerald-400' :
                cp >= 2 ? 'bg-amber-500/20 text-amber-400' :
                'bg-red-500/20 text-red-400'
              }`}>
              {cp.toFixed(2)}x
            </motion.div>
          )
        })}
      </div>
      {crashes.length === 0 && (
        <p className="text-sm text-slate-500 py-4 text-center">No crash history yet</p>
      )}
    </div>
  )
}

// ── House Edge Analytics ─────────────────────────────────────
function HouseEdgeAnalytics({ pool, metrics }) {
  return (
    <div className="space-y-4">
      {/* Pool Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Bets', value: `₹${Number(pool?.total_bets || 0).toLocaleString('en-IN')}`, color: 'text-blue-400' },
          { label: 'Total Winnings', value: `₹${Number(pool?.total_winnings_paid || 0).toLocaleString('en-IN')}`, color: 'text-emerald-400' },
          { label: 'House Edge Pool', value: `₹${Number(pool?.house_edge_pool || 0).toLocaleString('en-IN')}`, color: 'text-amber-400' },
          { label: 'Rounds Played', value: pool?.rounds_played || 0, color: 'text-purple-400' },
        ].map((stat, i) => (
          <div key={stat.label} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3">
            <p className="text-[10px] text-slate-500 uppercase">{stat.label}</p>
            <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Live Metrics */}
      {metrics && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
          <h4 className="text-sm font-bold text-emerald-400 mb-3">Live HE Metrics</h4>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-slate-400">Real Bets</p>
              <p className="text-sm font-bold text-white">₹{Number(metrics.real_bets || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Exited</p>
              <p className="text-sm font-bold text-emerald-400">₹{Number(metrics.exited_amt || 0).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Pending</p>
              <p className="text-sm font-bold text-amber-400">₹{Number(metrics.pending_amt || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Gross P&L */}
      <div className={`p-4 rounded-xl border ${
        (pool?.gross_pnl || 0) >= 0
          ? 'bg-emerald-500/10 border-emerald-500/20'
          : 'bg-red-500/10 border-red-500/20'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Gross P&L</p>
            <p className={`text-2xl font-bold ${(pool?.gross_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              ₹{Number(pool?.gross_pnl || 0).toLocaleString('en-IN')}
            </p>
          </div>
          {(pool?.gross_pnl || 0) >= 0 ? (
            <TrendingUp className="w-8 h-8 text-emerald-400" />
          ) : (
            <TrendingDown className="w-8 h-8 text-red-400" />
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Game Detail View ────────────────────────────────────
export default function GameDetailView() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const gameId = slug // slug is actually the game ID now
  const [activeTab, setActiveTab] = useState('overview')
  const [gameState, setGameState] = useState(null)
  const [liveBets, setLiveBets] = useState([])
  const [crashHistory, setCrashHistory] = useState([])
  const [heMetrics, setHeMetrics] = useState(null)
  const [hePool, setHePool] = useState(null)
  const [settings, setSettings] = useState(null)

  // Fetch game data
  const { data: game, isLoading } = useQuery({
    queryKey: ['admin-game', gameId],
    queryFn: () => getGameById(gameId),
    enabled: !!gameId,
  })

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      const [gs, bets, crashes, metrics, pool, cfg] = await Promise.all([
        getGameState(),
        getCurrentRoundBets(),
        getRecentCrashes(20),
        getLiveHEMetrics(),
        getHouseEdgePool(),
        getGameSettingsDB(),
      ])
      setGameState(gs)
      setLiveBets(bets)
      setCrashHistory(crashes)
      setHeMetrics(metrics)
      setHePool(pool)
      setSettings(cfg)
    }
    loadData()
  }, [])

  // Realtime subscriptions
  useEffect(() => {
    const channels = []

    // Game state updates
    try {
      const ch1 = supabase
        .channel('game-state-admin')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'aviator_game_state' }, (payload) => {
          setGameState(payload.new)
        })
        .subscribe()
      channels.push(ch1)
    } catch {}

    // Live bets updates
    try {
      const ch2 = supabase
        .channel('live-bets-admin')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'game_bets' }, () => {
          qc.invalidateQueries({ queryKey: ['admin-game-bets'] })
        })
        .subscribe()
      channels.push(ch2)
    } catch {}

    // HE metrics updates
    try {
      const ch3 = supabase
        .channel('he-metrics-admin')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'aviator_live_he' }, (payload) => {
          setHeMetrics(payload.new)
        })
        .subscribe()
      channels.push(ch3)
    } catch {}

    // House edge pool updates
    try {
      const ch4 = supabase
        .channel('he-pool-admin')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'aviator_house_edge' }, (payload) => {
          setHePool(payload.new)
        })
        .subscribe()
      channels.push(ch4)
    } catch {}

    // Crash history updates
    try {
      const ch5 = supabase
        .channel('crash-history-admin')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_rounds' }, () => {
          getRecentCrashes(20).then(setCrashHistory)
        })
        .subscribe()
      channels.push(ch5)
    } catch {}

    return () => {
      channels.forEach(ch => { try { supabase.removeChannel(ch) } catch {} })
    }
  }, [qc])

  // Refresh bets periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      const bets = await getCurrentRoundBets()
      setLiveBets(bets)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  const handleManualCrash = async () => {
    if (!confirm('Crash the current round immediately?')) return
    try {
      await setManualCrashSignalDB()
      toast.success('Manual crash signal sent!')
    } catch (e) {
      toast.error(`Crash failed: ${e.message}`)
    }
  }

  const TABS = [
    { id: 'overview', label: 'Overview', icon: Eye },
    { id: 'house-edge', label: 'House Edge', icon: Shield },
    { id: 'bets', label: 'Live Bets', icon: Users },
    { id: 'history', label: 'History', icon: Clock },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    )
  }

  if (!game) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-400">Game not found</p>
        <Button variant="outline" onClick={() => navigate('/games')} className="mt-4">
          <ArrowLeft className="w-4 h-4" /> Back to Games
        </Button>
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/games')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              {game.thumbnail_url ? (
                <img src={game.thumbnail_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
              ) : (
                <span className="text-2xl">🎮</span>
              )}
              {game.name}
            </h2>
            <p className="text-sm text-slate-400">/{game.slug} • {game.provider} • {game.category}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={game.is_active ? 'emerald' : 'red'}>
            {game.is_active ? 'Active' : 'Disabled'}
          </Badge>
          {game.ai_enabled && <Badge variant="blue">🤖 AI</Badge>}
        </div>
      </div>

      {/* Live Preview */}
      <LiveGamePreview gameState={gameState} crashHistory={crashHistory} />

      {/* Real-time Stats */}
      <RealTimeStats bets={liveBets} gameState={gameState} />

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-800/60 rounded-xl border border-slate-700/50 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                isActive ? 'bg-emerald-500/15 text-emerald-400' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}>
              <Icon className="w-4 h-4" /> {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.15 }}>
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
                <h3 className="text-lg font-bold text-white">Game Info</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-slate-500">Name:</span> <span className="text-white">{game.name}</span></div>
                  <div><span className="text-slate-500">Slug:</span> <span className="text-white font-mono">/{game.slug}</span></div>
                  <div><span className="text-slate-500">Provider:</span> <span className="text-white">{game.provider}</span></div>
                  <div><span className="text-slate-500">Category:</span> <span className="text-white">{game.category}</span></div>
                  <div><span className="text-slate-500">RTP:</span> <span className="text-emerald-400">{Number(game.rtp || 0).toFixed(1)}%</span></div>
                  <div><span className="text-slate-500">Max Multiplier:</span> <span className="text-white">{game.max_multiplier}x</span></div>
                </div>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
                <h3 className="text-lg font-bold text-white">Current Status</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><span className="text-slate-500">Phase:</span> <span className="text-white capitalize">{gameState?.phase || 'Unknown'}</span></div>
                  <div><span className="text-slate-500">Multiplier:</span> <span className="text-emerald-400 font-bold">{(gameState?.mult || 1).toFixed(2)}x</span></div>
                  <div><span className="text-slate-500">Active Bets:</span> <span className="text-white">{liveBets.length}</span></div>
                  <div><span className="text-slate-500">Real Users:</span> <span className="text-blue-400">{liveBets.filter(b => !b.is_bot).length}</span></div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'house-edge' && (
            <HouseEdgeControl settings={settings} onSettingsChange={setSettings} onManualCrash={handleManualCrash} />
          )}
          {activeTab === 'bets' && <LiveBetFeed bets={liveBets} />}
          {activeTab === 'history' && <CrashHistory crashes={crashHistory} />}
          {activeTab === 'analytics' && <HouseEdgeAnalytics pool={hePool} metrics={heMetrics} />}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
