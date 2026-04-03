import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { Button, FormField, Input, Select } from '../../components/ui/FormElements'
import {
  ArrowLeft, Zap, Users, Bot, TrendingUp, TrendingDown,
  Clock, Settings, Shield, Eye, Loader2, ExternalLink,
  MessageSquare, Send, Play, RotateCcw, BarChart3, AlertTriangle,
  Check, X, ChevronRight, Lightbulb, Target
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
      house_edge: s.house_edge,
      he_mode: s.he_mode,
      he_target_pct: s.he_target_pct,
      he_min_secs: s.he_min_secs,
      he_max_secs: s.he_max_secs,
      updated_at: new Date().toISOString()
    })
    return true
  } catch (e) { console.warn('[saveSettings]', e?.message); return false }
}

async function sendCrashSignal() {
  try {
    await supabase.from('aviator_signals').upsert({ id: 'crash', signal: 'crash', timestamp: Date.now(), processed: false })
    return true
  } catch (e) { console.warn('[sendCrashSignal]', e?.message); return false }
}

// ── AI Assistant Messages ────────────────────────────────────
const AI_MESSAGES = {
  welcome: [
    { role: 'ai', text: 'Welcome to the House Edge Control Panel! I\'m your AI assistant. I\'ll help you maximize your platform\'s profit while keeping players engaged.' },
  ],
  heMode: [
    { role: 'ai', text: 'House Edge Mode controls when the game auto-crashes:\n\n🟢 **OFF** - Random crash points, no control\n🟡 **Smart** - Auto-crashes when remaining pot ≤ target %\n🔴 **Aggressive** - Crashes earlier for higher profit\n\nRecommendation: Start with **Smart** mode at 5% target.' },
  ],
  targetPct: [
    { role: 'ai', text: 'Target % determines when the auto-crash triggers.\n\nExample: If users bet PKR 10,000 total and cash out PKR 9,500, only PKR 500 (5%) remains. At 5% target, the game crashes.\n\n💡 **Lower = More Profit** but players notice\n💡 **Higher = Less Profit** but players stay longer\n\nSweet spot: **3-7%** for balanced growth.' },
  ],
  minFlight: [
    { role: 'ai', text: 'Min Flight (seconds) is the minimum time the game must run before it can crash.\n\n⚠️ Too low (1-2s): Players feel cheated\n✅ Recommended: **3-5 seconds**\n\nThis ensures players have time to place bets and see the multiplier rise before any crash.' },
  ],
  maxFlight: [
    { role: 'ai', text: 'Max Flight (seconds) is the maximum time the game can run before forced crash.\n\n⚠️ Too high (60s+): Risk of huge payouts\n✅ Recommended: **30-50 seconds**\n\nThis prevents rounds from running indefinitely and protects against whale players.' },
  ],
  houseEdge: [
    { role: 'ai', text: 'House Edge % is the base percentage the house keeps.\n\n📊 **5%** = Standard casino edge\n📊 **10%** = Higher profit, more crashes\n📊 **15%+** = Very aggressive, players may leave\n\nCombined with Smart mode, this creates a powerful profit system.' },
  ],
  tips: [
    { role: 'ai', text: '🎯 **Pro Tips to Maximize Profit:**\n\n1. Start with **Smart mode, 5% target**\n2. Monitor player retention for 1 week\n3. If players stay, gradually lower target to **3%**\n4. Set **Min Flight to 3s** and **Max to 40s**\n5. Check analytics daily - adjust if needed\n\n⚠️ **Warning:** Don\'t be too aggressive or players will leave. The goal is sustainable profit.' },
  ],
  test: [
    { role: 'ai', text: '🧪 **Test Mode** simulates a round with your current settings.\n\nIt shows:\n- Expected crash point range\n- Estimated house profit per round\n- Player experience rating\n\nThis helps you understand the impact of your settings before applying them to live games.' },
  ],
}

// ── Game Iframe ──────────────────────────────────────────────
function GameIframe() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const iframeRef = useRef(null)
  const gameUrl = 'https://8769bet.onrender.com/play/aviator'

  const handleRefresh = () => {
    setLoading(true)
    setError(false)
    if (iframeRef.current) {
      iframeRef.current.src = gameUrl + '?t=' + Date.now()
    }
  }

  return (
    <div className="relative w-full aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-700/50">
      {loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950 z-10">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-2" />
            <p className="text-sm text-slate-400">Loading live game...</p>
          </div>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950 z-10">
          <div className="text-center">
            <p className="text-sm text-slate-400 mb-3">Game failed to load</p>
            <button onClick={handleRefresh} className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm hover:bg-emerald-600 transition-colors">
              <RotateCcw className="w-4 h-4" /> Retry
            </button>
          </div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={gameUrl}
        className="w-full h-full border-0"
        onLoad={() => { setLoading(false); setError(false) }}
        onError={() => { setLoading(false); setError(true) }}
        allow="autoplay"
        sandbox="allow-scripts allow-same-origin allow-forms"
        title="Live Aviator Game"
      />
      {/* Refresh button overlay */}
      <button onClick={handleRefresh} className="absolute top-3 right-3 p-2 bg-slate-900/80 backdrop-blur-sm rounded-lg text-slate-400 hover:text-white transition-colors z-20" title="Refresh game">
        <RotateCcw className="w-4 h-4" />
      </button>
    </div>
  )
}

// ── AI Chat Component ────────────────────────────────────────
function AIChat({ currentSettings }) {
  const [messages, setMessages] = useState(AI_MESSAGES.welcome)
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const getAIResponse = (userInput) => {
    const lower = userInput.toLowerCase()
    if (lower.includes('mode') || lower.includes('smart') || lower.includes('aggressive') || lower.includes('off')) {
      return AI_MESSAGES.heMode[0].text
    }
    if (lower.includes('target') || lower.includes('percent') || lower.includes('%')) {
      return AI_MESSAGES.targetPct[0].text
    }
    if (lower.includes('min') || lower.includes('flight') || lower.includes('second')) {
      return AI_MESSAGES.minFlight[0].text
    }
    if (lower.includes('max') || lower.includes('long')) {
      return AI_MESSAGES.maxFlight[0].text
    }
    if (lower.includes('edge') || lower.includes('house') || lower.includes('profit')) {
      return AI_MESSAGES.houseEdge[0].text
    }
    if (lower.includes('tip') || lower.includes('advice') || lower.includes('help') || lower.includes('how')) {
      return AI_MESSAGES.tips[0].text
    }
    if (lower.includes('test') || lower.includes('simulate') || lower.includes('demo')) {
      return AI_MESSAGES.test[0].text
    }
    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
      return 'Hello! I\'m your House Edge assistant. Ask me about:\n\n• **HE Mode** - How crash control works\n• **Target %** - When to auto-crash\n• **Min/Max Flight** - Time limits\n• **Tips** - How to maximize profit\n• **Test** - Simulate your settings'
    }
    return 'I can help you with House Edge settings. Try asking about:\n\n• "How does Smart mode work?"\n• "What target % should I use?"\n• "Give me tips to maximize profit"\n• "How do I test my settings?"'
  }

  const handleSend = () => {
    if (!input.trim()) return
    const userMsg = { role: 'user', text: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setTyping(true)

    setTimeout(() => {
      const response = getAIResponse(input)
      setMessages(prev => [...prev, { role: 'ai', text: response }])
      setTyping(false)
    }, 800)
  }

  const quickActions = [
    { label: 'How HE works', query: 'How does Smart mode work?' },
    { label: 'Best settings', query: 'What settings should I use?' },
    { label: 'Tips', query: 'Give me tips to maximize profit' },
    { label: 'Test mode', query: 'How do I test my settings?' },
  ]

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden flex flex-col h-[400px]">
      {/* Header */}
      <div className="p-3 border-b border-slate-700/50 flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
          <Lightbulb className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-sm font-medium text-white">AI House Edge Assistant</p>
          <p className="text-[10px] text-emerald-400">Online</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl p-3 text-xs whitespace-pre-line ${
              msg.role === 'user'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-slate-700/50 text-slate-300 border border-slate-600/50'
            }`}>
              {msg.text.split('**').map((part, j) =>
                j % 2 === 1 ? <strong key={j} className="text-white">{part}</strong> : part
              )}
            </div>
          </motion.div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <div className="bg-slate-700/50 rounded-xl p-3 border border-slate-600/50">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="px-3 py-2 border-t border-slate-700/30">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {quickActions.map(qa => (
            <button key={qa.label} onClick={() => { setInput(qa.query); setTimeout(() => handleSend(), 100) }}
              className="flex-shrink-0 px-2.5 py-1 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg text-[10px] text-slate-400 hover:text-white transition-colors">
              {qa.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-3 border-t border-slate-700/50">
        <div className="flex gap-2">
          <input type="text" value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Ask about house edge settings..."
            className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50" />
          <button onClick={handleSend} disabled={!input.trim()}
            className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Test Simulation ──────────────────────────────────────────
function TestSimulation({ settings, onRun }) {
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState(null)

  const runSimulation = () => {
    setRunning(true)
    setResult(null)

    setTimeout(() => {
      const he = (settings.house_edge || 0.05) * 100
      const target = settings.he_target_pct || 5
      const minSec = settings.he_min_secs || 3
      const maxSec = settings.he_max_secs || 50

      // Simulate crash point based on settings
      const baseCrash = 1 + (he / 100)
      const minCrash = Math.max(1.1, 1 + (minSec * 0.06))
      const maxCrash = Math.min(100, Math.pow(Math.E, 0.06 * maxSec))

      let estimatedCrash
      if (settings.he_mode === 'smart') {
        estimatedCrash = baseCrash + (target / 10)
      } else if (settings.he_mode === 'aggressive') {
        estimatedCrash = baseCrash * 0.8
      } else {
        estimatedCrash = 1 + Math.random() * 10
      }

      estimatedCrash = Math.max(minCrash, Math.min(maxCrash, estimatedCrash))

      const avgBet = 100
      const roundsPerHour = 60
      const estProfitPerHour = avgBet * roundsPerHour * (he / 100)

      setResult({
        crash: estimatedCrash.toFixed(2),
        minCrash: minCrash.toFixed(2),
        maxCrash: maxCrash.toFixed(2),
        profitPerHour: estProfitPerHour.toFixed(0),
        playerRating: he <= 5 ? 'Good' : he <= 10 ? 'Moderate' : 'Risky',
        playerRatingColor: he <= 5 ? 'text-emerald-400' : he <= 10 ? 'text-amber-400' : 'text-red-400',
      })
      setRunning(false)
    }, 1500)
  }

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <Play className="w-4 h-4 text-blue-400" />
          Test Settings
        </h4>
        <button onClick={runSimulation} disabled={running}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-500/30 transition-colors disabled:opacity-50">
          {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          {running ? 'Simulating...' : 'Run Test'}
        </button>
      </div>

      {result && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-700/30 rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-slate-500">Est. Crash Point</p>
              <p className="text-lg font-bold text-emerald-400">{result.crash}x</p>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-slate-500">Profit/Hour</p>
              <p className="text-lg font-bold text-amber-400">PKR {result.profitPerHour}</p>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-slate-500">Min Crash</p>
              <p className="text-lg font-bold text-blue-400">{result.minCrash}x</p>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-2.5 text-center">
              <p className="text-[10px] text-slate-500">Max Crash</p>
              <p className="text-lg font-bold text-purple-400">{result.maxCrash}x</p>
            </div>
          </div>
          <div className="flex items-center justify-between p-2 bg-slate-700/30 rounded-lg">
            <span className="text-xs text-slate-400">Player Experience</span>
            <span className={`text-sm font-bold ${result.playerRatingColor}`}>{result.playerRating}</span>
          </div>
        </motion.div>
      )}

      {!result && !running && (
        <p className="text-xs text-slate-500 text-center py-4">Click "Run Test" to simulate your current settings</p>
      )}
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────
export default function GameControlPanel() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const gameId = slug
  const [bets, setBets] = useState([])
  const [crashes, setCrashes] = useState([])
  const [pool, setPool] = useState({})
  const [settings, setSettings] = useState({})
  const [saving, setSaving] = useState(false)

  const { data: game, isLoading } = useQuery({
    queryKey: ['game', gameId],
    queryFn: () => getGameById(gameId),
    enabled: !!gameId,
  })

  // Load data
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

    return () => {
      clearInterval(betsIv)
      clearInterval(crashesIv)
    }
  }, [])

  const handleCrash = async () => {
    toast.loading('Crashing...', { duration: 300 })
    await sendCrashSignal()
    toast.success('Crash signal sent!')
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    const ok = await saveSettings(settings)
    if (ok) {
      toast.success('Settings saved')
    } else {
      toast.error('Failed to save')
    }
    setSaving(false)
  }

  const realBets = bets.filter(b => !b.is_bot)
  const botBets = bets.filter(b => b.is_bot)
  const realTotal = realBets.reduce((s, b) => s + Number(b.amount || 0), 0)
  const cashedOut = realBets.filter(b => b.status === 'won')
  const cashedTotal = cashedOut.reduce((s, b) => s + Number(b.cashout_amount || b.won_amount || 0), 0)
  const remainingPct = realTotal > 0 ? (((realTotal - cashedTotal) / realTotal) * 100) : 100

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
              {game.name} - Control Panel
            </h2>
            <p className="text-xs text-slate-400">{game.provider} • {game.category} • RTP {Number(game.rtp || 0).toFixed(1)}%</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href="https://8769bet.onrender.com/play/aviator" target="_blank" rel="noreferrer"
            className="flex items-center gap-1 px-3 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs hover:bg-slate-700 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" /> Open Full Game
          </a>
        </div>
      </div>

      {/* Live Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Real Users', value: realBets.length, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/15' },
          { label: 'Bots', value: botBets.length, icon: Bot, color: 'text-purple-400', bg: 'bg-purple-500/15' },
          { label: 'Real Pot', value: `PKR ${realTotal.toLocaleString()}`, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
          { label: 'Cashed Out', value: `PKR ${cashedTotal.toLocaleString()}`, icon: TrendingDown, color: 'text-cyan-400', bg: 'bg-cyan-500/15' },
          { label: 'Remaining', value: `${remainingPct.toFixed(0)}%`, icon: Target, color: remainingPct <= (settings.he_target_pct || 5) ? 'text-red-400' : 'text-emerald-400', bg: remainingPct <= (settings.he_target_pct || 5) ? 'bg-red-500/15' : 'bg-emerald-500/15' },
        ].map((stat, i) => {
          const Icon = stat.icon
          return (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className={`${stat.bg} border border-slate-700/50 rounded-xl p-3`}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className={`w-3.5 h-3.5 ${stat.color}`} />
                <span className="text-[10px] text-slate-400 uppercase">{stat.label}</span>
              </div>
              <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
            </motion.div>
          )
        })}
      </div>

      {/* Main Grid: Game + Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Game Iframe */}
        <div className="lg:col-span-2 space-y-4">
          <GameIframe />

          {/* Crash History */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              Crash History
            </h4>
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
              {crashes.length === 0 && <p className="text-slate-500 text-sm">No history yet</p>}
            </div>
          </div>

          {/* Pool Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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

          {/* P&L */}
          <div className={`p-4 rounded-xl border ${(pool.gross_pnl || 0) >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Gross P&L</p>
                <p className={`text-2xl font-bold ${(pool.gross_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  PKR {Number(pool.gross_pnl || 0).toLocaleString('en-IN')}
                </p>
              </div>
              {(pool.gross_pnl || 0) >= 0 ? <TrendingUp className="w-8 h-8 text-emerald-400" /> : <TrendingDown className="w-8 h-8 text-red-400" />}
            </div>
          </div>
        </div>

        {/* Right: Controls + AI Chat */}
        <div className="space-y-4">
          {/* Control Bar */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-400" />
              House Edge Controls
            </h4>

            {/* Crash Button */}
            <Button variant="danger" onClick={handleCrash} className="w-full font-bold py-3">
              <Zap className="w-5 h-5" /> CRASH NOW
            </Button>

            {/* HE Mode */}
            <FormField label="HE Mode">
              <Select value={settings.he_mode || 'off'} onChange={e => setSettings(s => ({ ...s, he_mode: e.target.value }))}>
                <option value="off">Off (Random)</option>
                <option value="smart">Smart Auto (Recommended)</option>
                <option value="aggressive">Aggressive</option>
              </Select>
            </FormField>

            {/* House Edge % */}
            <FormField label={`House Edge (${((settings.house_edge || 0.05) * 100).toFixed(1)}%)`}>
              <div className="flex items-center gap-3">
                <input type="range" min="0.01" max="0.20" step="0.01"
                  value={settings.house_edge || 0.05}
                  onChange={e => setSettings(s => ({ ...s, house_edge: parseFloat(e.target.value) }))}
                  className="flex-1 accent-emerald-500" />
                <Input type="number" min="1" max="20" step="0.5"
                  value={((settings.house_edge || 0.05) * 100).toFixed(1)}
                  onChange={e => setSettings(s => ({ ...s, house_edge: parseFloat(e.target.value) / 100 }))}
                  className="w-20" />
              </div>
            </FormField>

            {/* Target % */}
            <FormField label={`Auto-Crash Target (${settings.he_target_pct || 5}%)`}>
              <div className="flex items-center gap-3">
                <input type="range" min="1" max="20" step="1"
                  value={settings.he_target_pct || 5}
                  onChange={e => setSettings(s => ({ ...s, he_target_pct: parseInt(e.target.value) }))}
                  className="flex-1 accent-amber-500" />
                <Input type="number" min="1" max="20"
                  value={settings.he_target_pct || 5}
                  onChange={e => setSettings(s => ({ ...s, he_target_pct: parseInt(e.target.value) }))}
                  className="w-16" />
              </div>
            </FormField>

            {/* Min/Max Flight */}
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Min Flight (sec)">
                <Input type="number" min="1" max="30" value={settings.he_min_secs || 3}
                  onChange={e => setSettings(s => ({ ...s, he_min_secs: parseInt(e.target.value) }))} />
              </FormField>
              <FormField label="Max Flight (sec)">
                <Input type="number" min="5" max="120" value={settings.he_max_secs || 50}
                  onChange={e => setSettings(s => ({ ...s, he_max_secs: parseInt(e.target.value) }))} />
              </FormField>
            </div>

            <Button onClick={handleSaveSettings} disabled={saving} className="w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Save Settings
            </Button>
          </div>

          {/* Test Simulation */}
          <TestSimulation settings={settings} />

          {/* AI Chat */}
          <AIChat currentSettings={settings} />
        </div>
      </div>
    </motion.div>
  )
}
