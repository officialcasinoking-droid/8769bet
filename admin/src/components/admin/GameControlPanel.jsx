import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Button, FormField, Input, Select } from '../../components/ui/FormElements'
import {
  ArrowLeft, Zap, Users, Bot, TrendingUp, TrendingDown,
  Clock, Settings, Shield, Eye, Loader2, ExternalLink,
  MessageSquare, Send, Play, RotateCcw, BarChart3, AlertTriangle,
  Check, X, ChevronRight, Lightbulb, Target, Wallet, DollarSign,
  PieChart, Activity
} from 'lucide-react'

const BACKEND_URL = import.meta.env.VITE_API_URL || 'https://eight769bet-backend.onrender.com'

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
  const planeXRef = useRef(0)
  const planeYRef = useRef(0)
  const frameCountRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    let W = 0, H = 0
    const planeImg = new Image()
    planeImg.src = '/img/aviator_jogo.png'
    let planeImgReady = false
    planeImg.onload = () => { planeImgReady = true }

    const buildBg = (w, h) => {
      const off = document.createElement('canvas')
      off.width = w; off.height = h
      const c = off.getContext('2d')
      const bg = c.createLinearGradient(0, 0, 0, h)
      bg.addColorStop(0, '#0c1220'); bg.addColorStop(1, '#060e1a')
      c.fillStyle = bg; c.fillRect(0, 0, w, h)
      c.strokeStyle = 'rgba(255,255,255,0.022)'; c.lineWidth = 1
      for (let i = 0; i < w; i += 28) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, h); c.stroke() }
      for (let i = 0; i < h; i += 28) { c.beginPath(); c.moveTo(0, i); c.lineTo(w, i); c.stroke() }
      c.fillStyle = 'rgba(255,255,255,0.12)'; c.font = 'bold 10px monospace'
      for (let i = 1; i <= 10; i++) {
        const y = h - (i / 10) * h * 0.84 - h * 0.07
        c.fillText(`${i}x`, 3, y + 3)
        c.strokeStyle = 'rgba(0,232,135,0.06)'
        c.beginPath(); c.moveTo(20, y); c.lineTo(w, y); c.stroke()
      }
      return off
    }

    let bgCanvas = buildBg(canvas.offsetWidth, canvas.offsetHeight)

    const resize = () => {
      W = canvas.offsetWidth; H = canvas.offsetHeight
      canvas.width = W; canvas.height = H
      bgCanvas = buildBg(W, H)
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      frameCountRef.current++
      const currentPhase = phase
      const currentMult = mult

      if (!bgCanvas || W === 0 || H === 0) {
        animRef.current = requestAnimationFrame(draw)
        return
      }

      ctx.clearRect(0, 0, W, H)
      ctx.drawImage(bgCanvas, 0, 0)

      if (currentPhase === 'flying' && currentMult > 1) {
        const originX = 5, originY = H * 0.90
        const maxTravelX = Math.max(W - 220, W * 0.65), maxTravelY = H * 0.78
        const progress = Math.min(1, Math.log(currentMult) / Math.log(50))
        const eased = Math.pow(progress, 0.6)
        const nx = originX + eased * maxTravelX
        const ny = originY - eased * maxTravelY
        const endX = nx - 15, endY = ny + 5
        const cpx = (originX + endX) * 0.5, cpy = originY - (originY - endY) * 0.08

        ctx.strokeStyle = 'rgba(0,255,157,0.18)'; ctx.lineWidth = 10; ctx.lineCap = 'round'
        ctx.beginPath(); ctx.moveTo(originX, originY); ctx.quadraticCurveTo(cpx, cpy, endX, endY); ctx.stroke()
        ctx.strokeStyle = '#00ff9d'; ctx.lineWidth = 3
        ctx.beginPath(); ctx.moveTo(originX, originY); ctx.quadraticCurveTo(cpx, cpy, endX, endY); ctx.stroke()

        planeXRef.current = nx; planeYRef.current = ny

        if (planeImgReady) {
          ctx.save()
          ctx.translate(nx, ny)
          ctx.rotate(-0.3)
          ctx.drawImage(planeImg, -40, -20, 80, 40)
          ctx.restore()
        }

        const mc = currentMult >= 10 ? '#ff4d4d' : currentMult >= 5 ? '#ffd600' : '#00e887'
        ctx.fillStyle = mc; ctx.font = 'bold 24px sans-serif'
        ctx.fillText(`${currentMult.toFixed(2)}x`, nx + 10, ny + 8)
      }

      if (currentPhase === 'crashed' && planeXRef.current > 0) {
        for (let i = 0; i < 15; i++) {
          const ag = (i / 15) * Math.PI * 2
          const di = 14 + Math.sin(frameCountRef.current * 0.4 + i) * 12
          ctx.fillStyle = ['#dc2626', '#f97316', '#fde047'][i % 3]
          ctx.globalAlpha = 0.35 + Math.sin(frameCountRef.current * 0.4 + i) * 0.2
          ctx.beginPath(); ctx.arc(planeXRef.current + Math.cos(ag) * di, planeYRef.current + Math.sin(ag) * di, 2, 0, Math.PI * 2); ctx.fill()
        }
        ctx.globalAlpha = 1
      }

      if (currentPhase !== 'flying') {
        if (planeXRef.current !== 0) { planeXRef.current = 0; planeYRef.current = 0; frameCountRef.current = 0 }
        bgCanvas = buildBg(W, H)
      }

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => { window.removeEventListener('resize', resize); if (animRef.current) cancelAnimationFrame(animRef.current) }
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
      {phase === 'betting' && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-2xl px-8 py-6 text-center">
            <div className="text-5xl font-black text-white" style={{ fontFamily: "'Exo 2', sans-serif" }}>
              {countdown.toFixed(1)}
            </div>
            <div className="text-xs font-semibold text-white/40 uppercase tracking-widest mt-2">
              Place your bets
            </div>
          </div>
        </div>
      )}
      {phase === 'crashed' && crashPoint > 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-4xl font-black text-red-500" style={{
            fontFamily: "'Exo 2', sans-serif",
            textShadow: '0 0 20px rgba(255,77,77,0.6), 0 0 40px rgba(255,77,77,0.3)'
          }}>
            {crashPoint.toFixed(2)}x
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────
export default function GameControlPanel() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const wsRef = useRef(null)

  const [phase, setPhase] = useState('betting')
  const [mult, setMult] = useState(1.00)
  const [countdown, setCountdown] = useState(8)
  const [crashPoint, setCrashPoint] = useState(0)
  const [connected, setConnected] = useState(false)
  const [crashHistory, setCrashHistory] = useState([])
  const [houseEdgeStats, setHouseEdgeStats] = useState({
    totalBets: 0,
    totalWinnings: 0,
    houseEdgeAmount: 0,
    roundsPlayed: 0,
  })

  const [settings, setSettings] = useState({
    houseEdge: 0.05,
    heMode: 'off',
    heTargetPct: 5,
    heMinSecs: 3,
    heMaxSecs: 50,
  })

  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const updateHouseEdgeStats = useCallback((stats) => {
    if (stats) {
      setHouseEdgeStats({
        totalBets: stats.totalBets || 0,
        totalWinnings: stats.totalWinnings || 0,
        houseEdgeAmount: stats.houseEdgeAmount || 0,
        roundsPlayed: stats.roundsPlayed || 0,
      })
    }
  }, [])

  useEffect(() => {
    const fetchInitialState = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/admin/game/state`)
        if (response.ok) {
          const data = await response.json()
          const state = data.state || data
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
            setSettings({
              houseEdge: state.settings.houseEdge || 0.05,
              heMode: state.settings.heMode || 'off',
              heTargetPct: state.settings.heTargetPct || 5,
              heMinSecs: state.settings.heMinSecs || 3,
              heMaxSecs: state.settings.heMaxSecs || 50,
            })
          }
          if (state.crashHistory) {
            setCrashHistory(state.crashHistory.map(h => typeof h === 'object' ? parseFloat(h.crash_point || h) : parseFloat(h)))
          }
          if (state.houseEdge) {
            updateHouseEdgeStats(state.houseEdge)
          }
        }
      } catch (e) {
        console.error('[GameControl] Failed to fetch initial state:', e)
      }
    }

    fetchInitialState()

    const wsUrl = BACKEND_URL.replace('https', 'wss').replace('http', 'ws') + '/ws/aviator'

    const connectWebSocket = () => {
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
              setCrashHistory(prev => {
                if (prev.length > 0 && prev[0] === cp) return prev
                return [cp, ...prev].slice(0, 30)
              })
            }
            if (msg.settings) {
              setSettings(prev => ({
                houseEdge: msg.settings.houseEdge ?? prev.houseEdge,
                heMode: msg.settings.heMode ?? prev.heMode,
                heTargetPct: msg.settings.heTargetPct ?? prev.heTargetPct,
                heMinSecs: msg.settings.heMinSecs ?? prev.heMinSecs,
                heMaxSecs: msg.settings.heMaxSecs ?? prev.heMaxSecs,
              }))
            }
            if (msg.houseEdge) {
              updateHouseEdgeStats(msg.houseEdge)
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
        console.log('[GameControl] WebSocket disconnected, reconnecting in 3s...')
        setConnected(false)
        setTimeout(connectWebSocket, 3000)
      }

      wsRef.current = ws
    }

    connectWebSocket()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [updateHouseEdgeStats])

  const handleManualCrash = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/admin/game/crash`, { method: 'POST' })
    } catch (e) {
      console.error('[GameControl] Failed to force crash:', e)
    }
  }

  const handleNewRound = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/admin/game/new-round`, { method: 'POST' })
    } catch (e) {
      console.error('[GameControl] Failed to start new round:', e)
    }
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    setSaveSuccess(false)
    try {
      const response = await fetch(`${BACKEND_URL}/api/admin/game/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          houseEdge: settings.houseEdge,
          heMode: settings.heMode,
          heTargetPct: settings.heTargetPct,
          heMinSecs: settings.heMinSecs,
          heMaxSecs: settings.heMaxSecs,
        })
      })
      if (response.ok) {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 2000)
      }
    } catch (e) {
      console.error('[GameControl] Failed to save settings:', e)
    } finally {
      setSaving(false)
    }
  }

  const profitMargin = houseEdgeStats.totalBets > 0
    ? ((houseEdgeStats.houseEdgeAmount / houseEdgeStats.totalBets) * 100).toFixed(2)
    : '0.00'

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => navigate('/games')}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              Aviator Game Control
            </h2>
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
              {connected ? 'Connected to game server' : 'Connecting...'}
            </p>
          </div>
        </div>
        <a href="https://eight769bet.onrender.com/play/aviator" target="_blank" rel="noreferrer"
          className="flex items-center gap-1 px-3 py-2 bg-slate-800 text-slate-300 rounded-lg text-xs hover:bg-slate-700 transition-colors">
          <ExternalLink className="w-3.5 h-3.5" /> Open User Game
        </a>
      </div>

      <GameCanvas phase={phase} mult={mult} countdown={countdown} crashPoint={crashPoint} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Settings className="w-4 h-4 text-slate-400" />
            Controls
          </h3>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="danger" onClick={handleManualCrash} disabled={phase !== 'flying'}>
              <Zap className="w-4 h-4" /> Crash
            </Button>
            <Button variant="outline" onClick={handleNewRound}>
              <RotateCcw className="w-4 h-4" /> New Round
            </Button>
          </div>

          <FormField label={`House Edge (${(settings.houseEdge * 100).toFixed(1)}%)`}>
            <div className="flex items-center gap-3">
              <input type="range" min="0.01" max="0.20" step="0.01"
                value={settings.houseEdge}
                onChange={e => setSettings(s => ({ ...s, houseEdge: parseFloat(e.target.value) }))}
                className="flex-1 accent-emerald-500" />
              <Input type="number" min="1" max="20" step="0.5"
                value={(settings.houseEdge * 100).toFixed(1)}
                onChange={e => setSettings(s => ({ ...s, houseEdge: parseFloat(e.target.value) / 100 }))}
                className="w-20" />
            </div>
          </FormField>

          <FormField label="HE Mode">
            <Select value={settings.heMode} onChange={e => setSettings(s => ({ ...s, heMode: e.target.value }))}>
              <option value="off">Off (Random)</option>
              <option value="smart">Smart Auto</option>
              <option value="aggressive">Aggressive</option>
            </Select>
          </FormField>

          {settings.heMode !== 'off' && (
            <>
              <FormField label={`Auto-Crash Target (${settings.heTargetPct}%)`}>
                <div className="flex items-center gap-3">
                  <input type="range" min="1" max="20" step="1"
                    value={settings.heTargetPct}
                    onChange={e => setSettings(s => ({ ...s, heTargetPct: parseInt(e.target.value) }))}
                    className="flex-1 accent-amber-500" />
                  <Input type="number" min="1" max="20"
                    value={settings.heTargetPct}
                    onChange={e => setSettings(s => ({ ...s, heTargetPct: parseInt(e.target.value) }))}
                    className="w-16" />
                </div>
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Min Flight (sec)">
                  <Input type="number" min="1" max="30" value={settings.heMinSecs}
                    onChange={e => setSettings(s => ({ ...s, heMinSecs: parseInt(e.target.value) }))} />
                </FormField>
                <FormField label="Max Flight (sec)">
                  <Input type="number" min="5" max="120" value={settings.heMaxSecs}
                    onChange={e => setSettings(s => ({ ...s, heMaxSecs: parseInt(e.target.value) }))} />
                </FormField>
              </div>
            </>
          )}

          <Button onClick={handleSaveSettings} disabled={saving} className="w-full">
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saveSuccess ? (
              <Check className="w-4 h-4" />
            ) : (
              <Settings className="w-4 h-4" />
            )}
            {saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Settings'}
          </Button>

          <div className="border-t border-slate-700/50 pt-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
              <PieChart className="w-4 h-4 text-emerald-400" />
              Live Stats
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <Activity className="w-3 h-3" /> Rounds
                </div>
                <div className="text-lg font-bold text-white">{houseEdgeStats.roundsPlayed.toLocaleString()}</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <DollarSign className="w-3 h-3" /> Total Bets
                </div>
                <div className="text-lg font-bold text-emerald-400">₨{houseEdgeStats.totalBets.toLocaleString()}</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <TrendingUp className="w-3 h-3" /> Winnings
                </div>
                <div className="text-lg font-bold text-amber-400">₨{houseEdgeStats.totalWinnings.toLocaleString()}</div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                  <Wallet className="w-3 h-3" /> House Edge
                </div>
                <div className="text-lg font-bold text-red-400">₨{houseEdgeStats.houseEdgeAmount.toLocaleString()}</div>
              </div>
              <div className="col-span-2 bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 rounded-lg p-3 border border-emerald-500/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <TrendingDown className="w-3 h-3" /> Profit Margin
                  </div>
                  <div className="text-xl font-black text-emerald-400">{profitMargin}%</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-slate-400" />
            Crash History
          </h3>
          <div className="flex flex-wrap gap-2">
            {crashHistory.map((cp, i) => (
              <div key={`${cp}-${i}`}
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
