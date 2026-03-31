import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { Button, FormField, Input, Badge } from '../../components/ui/FormElements'
import {
  ArrowLeft, Zap, Users, Bot, TrendingUp, TrendingDown,
  Clock, DollarSign, Settings, Shield, Eye, Loader2, ExternalLink
} from 'lucide-react'

// ── API ──────────────────────────────────────────────────────
async function getGameById(id) {
  try {
    const { data } = await supabase.from('games').select('*').eq('id', id).single()
    return data
  } catch { return null }
}

async function fetchBets() {
  try {
    const { data } = await supabase.from('game_bets').select('*').order('created_at', { ascending: false }).limit(50)
    return data || []
  } catch { return [] }
}

async function fetchCrashes(limit = 30) {
  try {
    const { data } = await supabase.from('game_rounds')
      .select('round_id, crash_point, created_at, house_profit, total_bet_amount, total_exit_amount')
      .eq('status', 'crashed').order('created_at', { ascending: false }).limit(limit)
    return data || []
  } catch { return [] }
}

async function fetchPool() {
  try {
    const { data } = await supabase.from('aviator_house_edge').select('*').eq('id', 'pool').single()
    return data || { total_bets: 0, total_winnings_paid: 0, house_edge_pool: 0, gross_pnl: 0, rounds_played: 0 }
  } catch { return { total_bets: 0, total_winnings_paid: 0, house_edge_pool: 0, gross_pnl: 0, rounds_played: 0 } }
}

async function fetchSettings() {
  try {
    const { data } = await supabase.from('aviator_settings').select('*').eq('id', 'config').single()
    return data || { house_edge: 0.05, he_mode: 'off', he_target_pct: 5, he_min_secs: 3, he_max_secs: 50 }
  } catch { return { house_edge: 0.05, he_mode: 'off', he_target_pct: 5, he_min_secs: 3, he_max_secs: 50 } }
}

async function saveSettings(s) {
  try {
    await supabase.from('aviator_settings').upsert({
      id: 'config',
      house_edge: s.house_edge || 0.05,
      he_mode: s.he_mode || 'off',
      he_target_pct: s.he_target_pct || 5,
      he_min_secs: s.he_min_secs || 3,
      he_max_secs: s.he_max_secs || 50,
      updated_at: new Date().toISOString()
    })
  } catch (e) { console.warn('[saveSettings]', e?.message) }
}

async function sendCrashSignal() {
  try {
    await supabase.from('aviator_signals').upsert({ id: 'crash', signal: 'crash', timestamp: Date.now(), processed: false })
  } catch (e) { console.warn('[sendCrashSignal]', e?.message) }
}

// ── Live Game Iframe ─────────────────────────────────────────
function GameIframe() {
  const [loading, setLoading] = useState(true)
  const gameUrl = 'https://eight769bet-frontend.onrender.com/play/aviator'

  return (
    <div className="relative w-full aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-700/50">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950 z-10">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-2" />
            <p className="text-sm text-slate-400">Loading live game...</p>
          </div>
        </div>
      )}
      <iframe
        src={gameUrl}
        className="w-full h-full border-0"
        onLoad={() => setLoading(false)}
        allow="autoplay"
        sandbox="allow-scripts allow-same-origin allow-forms"
        title="Live Aviator Game"
      />
    </div>
  )
}

// ── Control Bar ──────────────────────────────────────────────
function ControlBar({ settings, onCrash, onSettingsChange, bets }) {
  const [saving, setSaving] = useState(false)
  const isAuto = settings?.he_mode !== 'off'

  const realBets = bets.filter(b => !b.is_bot)
  const realTotal = realBets.reduce((s, b) => s + Number(b.amount || 0), 0)
  const cashedOut = realBets.filter(b => b.status === 'won')
  const cashedTotal = cashedOut.reduce((s, b) => s + Number(b.cashout_amount || b.won_amount || 0), 0)
  const pendingTotal = realTotal - cashedTotal
  const remainingPct = realTotal > 0 ? ((pendingTotal / realTotal) * 100) : 100
  const targetPct = settings?.he_target_pct || 5

  const handleToggleAuto = async () => {
    setSaving(true)
    const newMode = isAuto ? 'off' : 'smart'
    const newSettings = { ...settings, he_mode: newMode }
    await saveSettings(newSettings)
    onSettingsChange?.(newSettings)
    setSaving(false)
    toast.success(newMode === 'off' ? 'Auto OFF' : 'Auto ON')
  }

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4">
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="danger" onClick={onCrash} className="font-bold px-5 py-2.5 animate-pulse shadow-lg shadow-red-500/30">
          <Zap className="w-5 h-5" /> CRASH NOW
        </Button>

        <div className="flex items-center gap-2">
          <div className={`px-3 py-2 rounded-lg border ${isAuto ? 'bg-emerald-500/15 border-emerald-500/30' : 'bg-slate-800/50 border-slate-700/50'}`}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isAuto ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
              <span className={`text-xs ${isAuto ? 'text-emerald-400' : 'text-slate-400'}`}>
                {isAuto ? 'Auto Active' : 'Auto OFF'}
              </span>
            </div>
          </div>
          <button onClick={handleToggleAuto} disabled={saving}
            className={`relative w-12 h-6 rounded-full transition-colors ${isAuto ? 'bg-emerald-500' : 'bg-slate-700'}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isAuto ? 'translate-x-6' : ''}`} />
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="px-2 py-1 bg-slate-800/50 rounded">
            <span className="text-slate-500">Real:</span>
            <span className="text-white font-bold ml-1">PKR {realTotal.toLocaleString('en-IN')}</span>
          </div>
          <div className="px-2 py-1 bg-slate-800/50 rounded">
            <span className="text-slate-500">Remaining:</span>
            <span className={`font-bold ml-1 ${remainingPct <= targetPct ? 'text-red-400' : 'text-emerald-400'}`}>
              {remainingPct.toFixed(0)}%
            </span>
          </div>
          <div className="px-2 py-1 bg-slate-800/50 rounded">
            <span className="text-slate-500">Target:</span>
            <span className="text-amber-400 font-bold ml-1">{targetPct}%</span>
          </div>
        </div>

        <a href="https://eight769bet-frontend.onrender.com/play/aviator" target="_blank" rel="noreferrer"
          className="ml-auto flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300">
          Open in new tab <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  )
}

// ── Bet Feed ─────────────────────────────────────────────────
function BetFeed({ bets }) {
  return (
    <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
      {bets.length === 0 ? (
        <div className="text-center py-8 text-slate-500 text-sm">No bets yet</div>
      ) : bets.map((b, i) => (
        <div key={b.id || i} className="flex items-center justify-between p-2.5 bg-slate-800/30 rounded-lg">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${b.is_bot ? 'bg-purple-500/20' : 'bg-blue-500/20'}`}>
              {b.is_bot ? <Bot className="w-3.5 h-3.5 text-purple-400" /> : <Users className="w-3.5 h-3.5 text-blue-400" />}
            </div>
            <div>
              <p className="text-xs font-medium text-white">{b.username || 'Anon'}</p>
              <p className="text-[10px] text-slate-500">{b.is_bot ? 'Bot' : 'Real'}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-white">PKR {Number(b.amount).toLocaleString('en-IN')}</p>
            {b.status === 'won' && <p className="text-[10px] text-emerald-400">x{Number(b.cashout_at).toFixed(2)}</p>}
            {b.status === 'lost' && <p className="text-[10px] text-red-400">Lost</p>}
            {b.status === 'pending' && <p className="text-[10px] text-amber-400">Pending</p>}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── HE Panel ─────────────────────────────────────────────────
function HEPanel({ settings, onSettingsChange, pool, crashes }) {
  const [localSettings, setLocalSettings] = useState(settings || {})
  const [saving, setSaving] = useState(false)

  useEffect(() => { setLocalSettings(settings || {}) }, [settings])

  const handleSave = async () => {
    setSaving(true)
    await saveSettings(localSettings)
    onSettingsChange?.(localSettings)
    setSaving(false)
    toast.success('Settings saved')
  }

  const todayIncome = crashes.filter(c => (Date.now() - new Date(c.created_at).getTime()) < 86400000)
    .reduce((s, c) => s + Number(c.house_profit || 0), 0)
  const totalIncome = crashes.reduce((s, c) => s + Number(c.house_profit || 0), 0)
  const last10Income = crashes.slice(0, 10).reduce((s, c) => s + Number(c.house_profit || 0), 0)

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
          <p className="text-[10px] text-slate-400 uppercase">Last 10 Rounds</p>
          <p className="text-2xl font-bold text-white">PKR {last10Income.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
          <p className="text-[10px] text-slate-400 uppercase">Today</p>
          <p className="text-2xl font-bold text-white">PKR {todayIncome.toLocaleString('en-IN')}</p>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
          <p className="text-[10px] text-slate-400 uppercase">Total (30d)</p>
          <p className="text-2xl font-bold text-white">PKR {totalIncome.toLocaleString('en-IN')}</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Total Bets', val: `PKR ${Number(pool.total_bets || 0).toLocaleString()}`, c: 'text-blue-400' },
          { label: 'Winnings', val: `PKR ${Number(pool.total_winnings_paid || 0).toLocaleString()}`, c: 'text-emerald-400' },
          { label: 'HE Pool', val: `PKR ${Number(pool.house_edge_pool || 0).toLocaleString()}`, c: 'text-amber-400' },
          { label: 'Rounds', val: pool.rounds_played || 0, c: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-3 text-center">
            <p className="text-[10px] text-slate-500">{s.label}</p>
            <p className={`text-lg font-bold ${s.c}`}>{s.val}</p>
          </div>
        ))}
      </div>

      <div className={`p-4 rounded-xl border ${(pool.gross_pnl || 0) >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
        <p className="text-xs text-slate-400">Gross P&L</p>
        <p className={`text-2xl font-bold ${(pool.gross_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          PKR {Number(pool.gross_pnl || 0).toLocaleString('en-IN')}
        </p>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
        <h4 className="text-sm font-bold text-white">HE Configuration</h4>
        <FormField label={`House Edge (${((localSettings.house_edge || 0.05) * 100).toFixed(1)}%)`}>
          <div className="flex items-center gap-3">
            <input type="range" min="0.01" max="0.20" step="0.01"
              value={localSettings.house_edge || 0.05}
              onChange={e => setLocalSettings(s => ({ ...s, house_edge: parseFloat(e.target.value) }))}
              className="flex-1 accent-emerald-500" />
            <Input type="number" min="1" max="20" step="0.5"
              value={((localSettings.house_edge || 0.05) * 100).toFixed(1)}
              onChange={e => setLocalSettings(s => ({ ...s, house_edge: parseFloat(e.target.value) / 100 }))}
              className="w-20" />
          </div>
        </FormField>
        <div className="grid grid-cols-3 gap-3">
          <FormField label={`Target %`}>
            <Input type="number" min="1" max="20" value={localSettings.he_target_pct || 5}
              onChange={e => setLocalSettings(s => ({ ...s, he_target_pct: parseInt(e.target.value) }))} />
          </FormField>
          <FormField label="Min (sec)">
            <Input type="number" min="1" max="30" value={localSettings.he_min_secs || 3}
              onChange={e => setLocalSettings(s => ({ ...s, he_min_secs: parseInt(e.target.value) }))} />
          </FormField>
          <FormField label="Max (sec)">
            <Input type="number" min="5" max="120" value={localSettings.he_max_secs || 50}
              onChange={e => setLocalSettings(s => ({ ...s, he_max_secs: parseInt(e.target.value) }))} />
          </FormField>
        </div>
        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
          Save Settings
        </Button>
      </div>

      <div className="p-3 bg-slate-800/30 border border-slate-700/50 rounded-xl text-xs text-slate-400">
        <strong className="text-slate-300">Auto Logic:</strong> When enabled, monitors real user cashouts. When only <strong className="text-amber-400">{localSettings.he_target_pct || 5}%</strong> of real pot remains uncashed, auto-crashes. Bot traffic excluded.
      </div>
    </div>
  )
}

// ── Crash History ────────────────────────────────────────────
function CrashHistory({ crashes }) {
  return (
    <div className="flex flex-wrap gap-2">
      {crashes.map((c, i) => {
        const cp = Number(c.crash_point)
        return (
          <div key={c.round_id || i}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
              cp >= 10 ? 'bg-emerald-500/20 text-emerald-400' :
              cp >= 2 ? 'bg-amber-500/20 text-amber-400' :
              'bg-red-500/20 text-red-400'
            }`}>
            {cp.toFixed(2)}x
          </div>
        )
      })}
      {crashes.length === 0 && <p className="text-slate-500 text-sm">No history</p>}
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────
export default function GameDetailView() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const gameId = slug
  const [tab, setTab] = useState('house-edge')
  const [bets, setBets] = useState([])
  const [crashes, setCrashes] = useState([])
  const [pool, setPool] = useState({})
  const [settings, setSettings] = useState({})

  const { data: game, isLoading } = useQuery({
    queryKey: ['game', gameId],
    queryFn: () => getGameById(gameId),
    enabled: !!gameId,
  })

  // Load all data
  useEffect(() => {
    const load = async () => {
      const [b, c, p, s] = await Promise.all([
        fetchBets(), fetchCrashes(30), fetchPool(), fetchSettings()
      ])
      setBets(b); setCrashes(c); setPool(p); setSettings(s)
    }
    load()
  }, [])

  // Poll for updates
  useEffect(() => {
    const betsIv = setInterval(async () => {
      const b = await fetchBets()
      setBets(b)
    }, 3000)

    const crashesIv = setInterval(async () => {
      const c = await fetchCrashes(30)
      setCrashes(c)
    }, 5000)

    // Realtime channels
    const channels = []
    try {
      channels.push(supabase.channel('bets-rt').on('postgres_changes',
        { event: '*', schema: 'public', table: 'game_bets' },
        async () => { const b = await fetchBets(); setBets(b) }
      ).subscribe())
    } catch {}
    try {
      channels.push(supabase.channel('rounds-rt').on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'game_rounds' },
        async () => { const c = await fetchCrashes(30); setCrashes(c) }
      ).subscribe())
    } catch {}

    return () => {
      clearInterval(betsIv)
      clearInterval(crashesIv)
      channels.forEach(ch => { try { supabase.removeChannel(ch) } catch {} })
    }
  }, [])

  const handleCrash = async () => {
    toast.loading('Crashing...', { duration: 300 })
    await sendCrashSignal()
    toast.success('Crashed!')
  }

  if (isLoading) return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 text-emerald-500 animate-spin" /></div>
  if (!game) return (
    <div className="text-center py-16">
      <p className="text-slate-400">Game not found</p>
      <Button variant="outline" onClick={() => navigate('/games')} className="mt-4"><ArrowLeft className="w-4 h-4" /> Back</Button>
    </div>
  )

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/games')}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              {game.thumbnail_url ? <img src={game.thumbnail_url} alt="" className="w-7 h-7 rounded" /> : '🎮'}
              {game.name}
            </h2>
            <p className="text-xs text-slate-400">{game.provider} • {game.category} • RTP {Number(game.rtp || 0).toFixed(1)}%</p>
          </div>
        </div>
        <Badge variant={game.is_active ? 'emerald' : 'red'}>{game.is_active ? 'Active' : 'Disabled'}</Badge>
      </div>

      {/* Control Bar */}
      <ControlBar settings={settings} onCrash={handleCrash} onSettingsChange={setSettings} bets={bets} />

      {/* Live Game (Iframe) + Bets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <GameIframe />
        </div>
        <div className="bg-slate-900/60 border border-slate-800/50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white">Live Bets</h3>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="text-blue-400">{bets.filter(b => !b.is_bot).length} real</span>
              <span>•</span>
              <span className="text-purple-400">{bets.filter(b => b.is_bot).length} bots</span>
            </div>
          </div>
          <BetFeed bets={bets.slice(0, 20)} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-800/60 rounded-xl border border-slate-700/50">
        {[
          { id: 'house-edge', label: 'House Edge', icon: Shield },
          { id: 'bets', label: 'All Bets', icon: Users },
          { id: 'history', label: 'History', icon: Clock },
        ].map(t => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.id ? 'bg-emerald-500/15 text-emerald-400' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}>
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {tab === 'house-edge' && <HEPanel settings={settings} onSettingsChange={setSettings} pool={pool} crashes={crashes} />}
      {tab === 'bets' && <BetFeed bets={bets} />}
      {tab === 'history' && <CrashHistory crashes={crashes} />}
    </motion.div>
  )
}
