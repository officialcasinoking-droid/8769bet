import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button, FormField, Input, Select } from '../../components/ui/FormElements'
import {
  ArrowLeft, Zap, Users, Bot, TrendingUp, TrendingDown,
  Clock, Settings, Shield, Eye, Loader2, ExternalLink,
  MessageSquare, Send, Play, RotateCcw, BarChart3, AlertTriangle,
  Check, X, ChevronRight, Lightbulb, Target
} from 'lucide-react'

const BACKEND_URL = import.meta.env.VITE_API_URL || 'https://8769bet-backend.onrender.com'

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

// ── AI Chat Component ────────────────────────────────────────
function AIChat({ settings }) {
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
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl p-3 text-xs whitespace-pre-line ${
              msg.role === 'user'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                : 'bg-slate-700/50 text-slate-300 border border-slate-600/50'
            }`}>
              {msg.text.split('**').map((part, j) =>
                j % 2 === 1 ? <strong key={j} className="text-white">{part}</strong> : part
              )}
            </div>
          </div>
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
      <div className="px-3 py-2 border-t border-slate-700/50">
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
            placeholder="Ask about house edge..."
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

// ── Game Canvas ──────────────────────────────────────────────
function GameCanvas({ phase, mult, countdown, crashPoint }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const trailRef = useRef([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const draw = () => {
      const dpr = 2
      const w = canvas.offsetWidth
      const h = canvas.offsetHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.scale(dpr, dpr)

      // Background
      ctx.fillStyle = '#0c1220'
      ctx.fillRect(0, 0, w, h)

      // Grid
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'
      ctx.lineWidth = 0.5
      for (let i = 0; i < 10; i++) {
        ctx.beginPath(); ctx.moveTo(0, (h / 10) * i); ctx.lineTo(w, (h / 10) * i); ctx.stroke()
        ctx.beginPath(); ctx.moveTo((w / 10) * i, 0); ctx.lineTo((w / 10) * i, h); ctx.stroke()
      }

      if (phase === 'flying') {
        const maxMult = Math.max(mult, 5)
        const progress = Math.min(1, Math.log(mult) / Math.log(maxMult))
        const eased = Math.pow(progress, 0.6)

        const originX = 5
        const originY = h * 0.90
        const maxTravelX = w - 10
        const maxTravelY = h * 0.78

        const nx = originX + eased * maxTravelX
        const ny = originY - eased * maxTravelY

        trailRef.current.push({ x: nx, y: ny })
        if (trailRef.current.length > 200) trailRef.current.shift()

        // Draw trail
        if (trailRef.current.length > 1) {
          ctx.beginPath()
          ctx.strokeStyle = '#00e887'
          ctx.lineWidth = 2.5
          ctx.shadowColor = '#00e887'
          ctx.shadowBlur = 10
          ctx.moveTo(trailRef.current[0].x, trailRef.current[0].y)
          for (let i = 1; i < trailRef.current.length; i++) {
            ctx.lineTo(trailRef.current[i].x, trailRef.current[i].y)
          }
          ctx.stroke()
          ctx.shadowBlur = 0
        }

        // Plane
        ctx.beginPath()
        ctx.arc(nx, ny, 10, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(0,232,135,0.3)'
        ctx.fill()
        ctx.font = '16px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('✈️', nx, ny)

        // Multiplier
        ctx.font = 'bold 48px sans-serif'
        ctx.fillStyle = '#00e887'
        ctx.shadowColor = '#00e887'
        ctx.shadowBlur = 20
        ctx.fillText(`${mult.toFixed(2)}x`, w / 2, h / 2)
        ctx.shadowBlur = 0
      } else if (phase === 'crashed') {
        // Explosion
        const cx = w / 2
        const cy = h / 2
        const t = Date.now() % 1000 / 1000

        for (let i = 0; i < 15; i++) {
          const ag = (i / 15) * Math.PI * 2
          const di = 14 + Math.sin(t * 4 + i) * 12
          ctx.fillStyle = ['#ff4d4d', '#ff8c00', '#ffd600'][i % 3]
          ctx.globalAlpha = 0.35 + Math.sin(t * 4 + i) * 0.2
          ctx.beginPath()
          ctx.arc(cx + Math.cos(ag) * di, cy + Math.sin(ag) * di, 2, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1

        ctx.font = 'bold 48px sans-serif'
        ctx.fillStyle = '#ff4d4d'
        ctx.shadowColor = '#ff4d4d'
        ctx.shadowBlur = 20
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`${crashPoint.toFixed(2)}x`, w / 2, h / 2)
        ctx.shadowBlur = 0
      } else {
        // Betting
        ctx.font = 'bold 56px sans-serif'
        ctx.fillStyle = '#00e887'
        ctx.shadowColor = '#00e887'
        ctx.shadowBlur = 20
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(`${countdown.toFixed(1)}`, w / 2, h / 2 - 10)
        ctx.shadowBlur = 0

        ctx.font = '14px sans-serif'
        ctx.fillStyle = 'rgba(255,255,255,0.4)'
        ctx.fillText('Waiting for next round', w / 2, h / 2 + 20)
      }

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [phase, mult, countdown, crashPoint])

  return (
    <div className="relative w-full aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-700/50">
      <canvas ref={canvasRef} className="w-full h-full" />
      <div className="absolute top-3 left-3">
        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
          phase === 'flying' ? 'bg-emerald-500/20 text-emerald-400' :
          phase === 'crashed' ? 'bg-red-500/20 text-red-400' :
          'bg-amber-500/20 text-amber-400'
        }`}>
          {phase === 'flying' ? 'FLYING' : phase === 'crashed' ? 'CRASHED' : 'BETTING'}
        </span>
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────
export default function GameControlPanel() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const wsRef = useRef(null)

  // Game state from backend WebSocket
  const [phase, setPhase] = useState('betting')
  const [mult, setMult] = useState(1.00)
  const [countdown, setCountdown] = useState(8)
  const [crashPoint, setCrashPoint] = useState(0)
  const [connected, setConnected] = useState(false)

  // Settings
  const [settings, setSettings] = useState({
    house_edge: 0.05,
    he_mode: 'off',
    he_target_pct: 5,
    he_min_secs: 3,
    he_max_secs: 50,
  })

  // Crash history
  const [crashHistory, setCrashHistory] = useState([])

  // ── WebSocket Connection to Backend ─────────────────────────
  useEffect(() => {
    const fetchInitialState = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/admin/game/state`)
        if (response.ok) {
          const state = await response.json()
          setPhase(state.phase || 'betting')
          if (state.phase === 'betting') {
            setCountdown(parseFloat(state.countdown) || 8)
            setMult(1.00)
          } else if (state.phase === 'flying') {
            setMult(parseFloat(state.mult) || 1.00)
          } else if (state.phase === 'crashed') {
            setCrashPoint(parseFloat(state.crash_point || state.crashPoint) || 0)
          }
          if (state.settings) {
            setSettings(prev => ({ ...prev, ...state.settings }))
          }
          if (state.crashHistory) {
            setCrashHistory(state.crashHistory.map(h => typeof h === 'object' ? parseFloat(h.crash_point || h) : parseFloat(h)))
          }
          setConnected(true)
        }
      } catch (e) {
        console.error('[GameControl] Failed to fetch initial state:', e)
      }
    }

    fetchInitialState()

    // Connect to WebSocket for real-time updates
    const wsUrl = BACKEND_URL.replace('http', 'ws') + '/ws/aviator'
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('[GameControl] WebSocket connected')
      setConnected(true)
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'game_state') {
          if (msg.phase === 'betting') {
            setPhase('betting')
            setCountdown(parseFloat(msg.countdown) || 8)
            setMult(1.00)
          } else if (msg.phase === 'flying') {
            setPhase('flying')
            setMult(parseFloat(msg.mult) || 1.00)
          } else if (msg.phase === 'crashed') {
            setPhase('crashed')
            const cp = parseFloat(msg.crash_point || msg.crashPoint) || 0
            setCrashPoint(cp)
            setCrashHistory(prev => [cp, ...prev].slice(0, 30))
          }
          if (msg.settings) {
            setSettings(prev => ({ ...prev, ...msg.settings }))
          }
        }
      } catch (e) {
        console.error('[GameControl] WS parse error:', e)
      }
    }

    ws.onerror = (err) => {
      console.error('[GameControl] WebSocket error:', err)
      setConnected(false)
    }

    ws.onclose = () => {
      console.log('[GameControl] WebSocket disconnected')
      setConnected(false)
    }

    wsRef.current = ws

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  // ── Controls ───────────────────────────────────────────────
  const handleManualCrash = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/game/crash`, {
        method: 'POST',
      })
      if (response.ok) {
        console.log('[GameControl] Crash forced')
      }
    } catch (e) {
      console.error('[GameControl] Failed to force crash:', e)
    }
  }

  const handleSaveSettings = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/game/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          houseEdge: settings.house_edge,
          heMode: settings.he_mode,
          heTargetPct: settings.he_target_pct,
          heMinSecs: settings.he_min_secs,
          heMaxSecs: settings.he_max_secs,
        })
      })
      if (response.ok) {
        console.log('[GameControl] Settings saved')
      }
    } catch (e) {
      console.error('[GameControl] Failed to save settings:', e)
    }
  }

  const handleNewRound = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/game/new-round`, {
        method: 'POST',
      })
      if (response.ok) {
        console.log('[GameControl] New round started')
      }
    } catch (e) {
      console.error('[GameControl] Failed to start new round:', e)
    }
  }

  const handleTest = () => {
    // Simulate a test round
    const he = settings.house_edge
    const crashPoint = (Math.random() < 0.4 - he * 2) ? 1 + Math.random() * 0.5 :
                     (Math.random() < 0.25 - he) ? 1.5 + Math.random() :
                     2.5 + Math.random() * 2
    alert(`Test Result: Crash at ${crashPoint.toFixed(2)}x`)
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/games')}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              Aviator Game Control
            </h2>
            <p className="text-xs text-slate-400">
              {connected ? 'Connected to game server' : 'Connecting...'}
            </p>
          </div>
        </div>
        <a href="https://8769bet.onrender.com/play/aviator" target="_blank" rel="noreferrer"
          className="flex items-center gap-1 px-3 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs hover:bg-slate-700 transition-colors">
          <ExternalLink className="w-3.5 h-3.5" /> Open User Game
        </a>
      </div>

      {/* Game Canvas */}
      <GameCanvas phase={phase} mult={mult} countdown={countdown} crashPoint={crashPoint} />

      {/* Control Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Controls */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-400" />
            Controls
          </h3>

          <Button variant="danger" onClick={handleManualCrash} disabled={phase !== 'flying'} className="w-full">
            <Zap className="w-4 h-4" /> Manual Crash
          </Button>

          <FormField label={`House Edge (${(settings.house_edge * 100).toFixed(1)}%)`}>
            <div className="flex items-center gap-3">
              <input type="range" min="0.01" max="0.20" step="0.01"
                value={settings.house_edge}
                onChange={e => setSettings(s => ({ ...s, house_edge: parseFloat(e.target.value) }))}
                className="flex-1 accent-emerald-500" />
              <Input type="number" min="1" max="20" step="0.5"
                value={(settings.house_edge * 100).toFixed(1)}
                onChange={e => setSettings(s => ({ ...s, house_edge: parseFloat(e.target.value) / 100 }))}
                className="w-20" />
            </div>
          </FormField>

          <FormField label="HE Mode">
            <Select value={settings.he_mode} onChange={e => setSettings(s => ({ ...s, he_mode: e.target.value }))}>
              <option value="off">Off (Random)</option>
              <option value="smart">Smart Auto</option>
              <option value="aggressive">Aggressive</option>
            </Select>
          </FormField>

          {settings.he_mode !== 'off' && (
            <>
              <FormField label={`Auto-Crash Target (${settings.he_target_pct}%)`}>
                <div className="flex items-center gap-3">
                  <input type="range" min="1" max="20" step="1"
                    value={settings.he_target_pct}
                    onChange={e => setSettings(s => ({ ...s, he_target_pct: parseInt(e.target.value) }))}
                    className="flex-1 accent-amber-500" />
                  <Input type="number" min="1" max="20"
                    value={settings.he_target_pct}
                    onChange={e => setSettings(s => ({ ...s, he_target_pct: parseInt(e.target.value) }))}
                    className="w-16" />
                </div>
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Min Flight (sec)">
                  <Input type="number" min="1" max="30" value={settings.he_min_secs}
                    onChange={e => setSettings(s => ({ ...s, he_min_secs: parseInt(e.target.value) }))} />
                </FormField>
                <FormField label="Max Flight (sec)">
                  <Input type="number" min="5" max="120" value={settings.he_max_secs}
                    onChange={e => setSettings(s => ({ ...s, he_max_secs: parseInt(e.target.value) }))} />
                </FormField>
              </div>
            </>
          )}

          <Button onClick={handleSaveSettings} className="w-full">
            <Settings className="w-4 h-4" /> Save Settings
          </Button>

          <Button variant="outline" onClick={handleTest} className="w-full">
            <Play className="w-4 h-4" /> Test Settings
          </Button>
        </div>

        {/* Crash History */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-slate-400" />
            Crash History
          </h3>
          <div className="flex flex-wrap gap-2">
            {crashHistory.map((cp, i) => (
              <div key={i}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  cp >= 10 ? 'bg-emerald-500/20 text-emerald-400' :
                  cp >= 2 ? 'bg-amber-500/20 text-amber-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                {cp.toFixed(2)}x
              </div>
            ))}
            {crashHistory.length === 0 && (
              <p className="text-slate-500 text-sm">Waiting for crashes...</p>
            )}
          </div>
        </div>

        {/* AI Chat */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
            <MessageSquare className="w-4 h-4 text-slate-400" />
            AI Assistant
          </h3>
          <AIChat settings={settings} />
        </div>
      </div>
    </motion.div>
  )
}
