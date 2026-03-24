import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'
import { 
  Octagon, 
  Settings, 
  BarChart3, 
  ChevronDown, 
  ChevronUp, 
  Loader2, 
  TrendingUp, 
  TrendingDown, 
  Wallet 
} from 'lucide-react'

async function getGameState() {
  try {
    const { data } = await supabase.from('aviator_game_state').select('*').eq('id', 'current').single()
    if (data) return data
  } catch {}
  return null
}

async function getLiveBets() {
  try {
    const { data } = await supabase.from('aviator_live_bets').select('*').order('created_at', { ascending: true })
    return data || []
  } catch { return [] }
}

async function getCrashHistory() {
  try {
    const { data } = await supabase.from('aviator_crash_history').select('crash_point').order('created_at', { ascending: false }).limit(20)
    return (data || []).map(d => d.crash_point)
  } catch { return [] }
}

async function getSettingsFromDB() {
  try {
    const { data } = await supabase.from('aviator_settings').select('*').eq('id', 'config').single()
    return data || null
  } catch { return null }
}

async function saveSettingsToDB(settings) {
  try {
    await supabase.from('aviator_settings').upsert({
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
  } catch (e) { console.warn('[saveSettingsToDB]', e?.message) }
}

async function getLiveHEMetrics() {
  try {
    const { data } = await supabase.from('aviator_live_he').select('*').eq('id', 'metrics').single()
    return data
  } catch { return null }
}

async function setManualCrashSignal() {
  try {
    await supabase.from('aviator_signals').upsert({
      id: 'crash',
      signal: 'crash',
      timestamp: Date.now(),
      processed: false
    })
  } catch (e) { console.warn('[setManualCrashSignal]', e?.message) }
}

async function getHouseEdgePool() {
  const { data } = await supabase.from('aviator_house_edge').select('*').eq('id', 'pool').single()
  if (data && data.id) return data
  return { total_deposits: 0, total_bets: 0, total_winnings_paid: 0, house_edge_pool: 0, total_withdrawals_paid: 0, gross_pnl: 0, rounds_played: 0 }
}

const BetRow = React.memo(function BetRow({ bet }) {
  const time = useMemo(() => {
    try {
      return new Date(bet.created_at || Date.now()).toLocaleTimeString([], {
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      })
    } catch { return '—' }
  }, [bet.created_at])

  return (
    <tr className={`hover:bg-slate-800/30 transition-colors ${!bet.is_bot ? 'bg-blue-500/5' : 'opacity-60'}`}>
      <td className="px-3 py-1.5">
        <span className={`text-xs font-medium ${!bet.is_bot ? 'text-emerald-400' : 'text-slate-400'}`}>
          {bet.username}
          {bet.is_bot && <span className="text-[8px] text-slate-600 ml-1">BOT</span>}
        </span>
      </td>
      <td className="px-3 py-1.5">
        <span className="text-xs font-bold text-white">₨{Number(bet.amount || 0).toLocaleString()}</span>
      </td>
      <td className="px-3 py-1.5">
        {bet.auto_cashout_at ? (
          <span className="text-[10px] text-yellow-400/70">{Number(bet.auto_cashout_at).toFixed(2)}x</span>
        ) : (
          <span className="text-[10px] text-slate-600">—</span>
        )}
      </td>
      <td className="px-3 py-1.5">
        {bet.status === 'won' ? (
          <span className="px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-400 text-[10px] font-bold">WON</span>
        ) : bet.status === 'lost' ? (
          <span className="px-1.5 py-0.5 rounded bg-red-500/15 text-red-400 text-[10px] font-bold">LOST</span>
        ) : (
          <span className="px-1.5 py-0.5 rounded bg-slate-600/50 text-slate-400 text-[10px] font-bold">PENDING</span>
        )}
      </td>
      <td className="px-3 py-1.5">
        {bet.status === 'won' ? (
          <span className="text-xs font-bold text-emerald-400">+₨{Number(bet.cashout_amount || 0).toLocaleString()}</span>
        ) : bet.status === 'lost' ? (
          <span className="text-xs font-bold text-red-400">-₨{Number(bet.amount || 0)}</span>
        ) : (
          <span className="text-xs text-slate-600">—</span>
        )}
      </td>
      <td className="px-3 py-1.5">
        <span className="text-[10px] text-slate-500">{time}</span>
      </td>
    </tr>
  )
})

function loadSettingsFromStorage() {
  try {
    const raw = localStorage.getItem('aviator_settings')
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

export default function AviatorAdmin() {
  const toast = useToast()
  const savedSettings = useRef(loadSettingsFromStorage())

  const [expanded, setExpanded] = useState(true)
  const [houseEdge, setHouseEdge] = useState(() => savedSettings.current?.houseEdge != null ? savedSettings.current.houseEdge * 100 : 5)
  const [biasStrength, setBiasStrength] = useState(() => savedSettings.current?.biasStrength ?? 50)
  const [heMode, setHeMode] = useState(() => savedSettings.current?.heMode || 'off')
  const [heTargetPct, setHeTargetPct] = useState(() => savedSettings.current?.heTargetPct ?? 5)
  const [heMinSecs, setHeMinSecs] = useState(() => savedSettings.current?.heMinSecs ?? 3)
  const [heMaxSecs, setHeMaxSecs] = useState(() => savedSettings.current?.heMaxSecs ?? 50)
  const [autoTargetSecs, setAutoTargetSecs] = useState(() => savedSettings.current?.autoTargetSecs ?? 8)
  const [synced, setSynced] = useState(false)
  const [cumulativePL, setCumulativePL] = useState(0)
  const [roundsPlayed, setRoundsPlayed] = useState(0)
  const [liveBets, setLiveBets] = useState([])
  const [history, setHistory] = useState([])
  const [phase, setPhase] = useState('betting')
  const [mult, setMult] = useState(1.00)
  const [cd, setCd] = useState(8)
  const [crashedAt, setCrashedAt] = useState(null)
  const [liveHE, setLiveHE] = useState(null)

  const { data: hePool } = useQuery({
    queryKey: ['aviator-he-pool'],
    queryFn: getHouseEdgePool,
    staleTime: 5000,
    refetchInterval: 3000,
  })

  useEffect(() => {
    const pollGameState = async () => {
      try {
        const [gameState, bets, hist, heMetrics, settings] = await Promise.all([
          getGameState(),
          getLiveBets(),
          getCrashHistory(),
          getLiveHEMetrics(),
          getSettingsFromDB(),
        ])

        if (gameState) {
          setPhase(gameState.phase || 'betting')
          setMult(parseFloat(gameState.mult) || 1.00)
          setCd(gameState.countdown || 8)
          setCrashedAt(gameState.crash_point ? parseFloat(gameState.crash_point) : null)
          setSynced(true)
        }

        if (bets) {
          setLiveBets(bets)
        }

        if (hist) {
          setHistory(hist)
        }

        if (heMetrics) {
          setLiveHE(heMetrics)
        }

        if (settings) {
          if (settings.he_mode && settings.he_mode !== heMode) setHeMode(settings.he_mode)
          if (settings.he_target_pct && settings.he_target_pct !== heTargetPct) setHeTargetPct(settings.he_target_pct)
          if (settings.he_min_secs && settings.he_min_secs !== heMinSecs) setHeMinSecs(settings.he_min_secs)
          if (settings.he_max_secs && settings.he_max_secs !== heMaxSecs) setHeMaxSecs(settings.he_max_secs)
          if (settings.auto_target_secs && settings.auto_target_secs !== autoTargetSecs) setAutoTargetSecs(settings.auto_target_secs)
        }
      } catch (e) {
        console.warn('[pollGameState]', e?.message)
      }
    }

    pollGameState()
    const id = setInterval(pollGameState, 500)
    return () => clearInterval(id)
  }, [])

  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const planeRef = useRef({ x: 0, y: 0, fr: 0 })
  const lastDrawRef = useRef(0)
  const roundsPlayedRef = useRef(0)
  const bgDrawnRef = useRef(false)
  const prevPhaseRef = useRef('')
  const prevMultRef = useRef(1.00)
  const prevCdRef = useRef(8)
  const prevCrashedAtRef = useRef(null)
  const prevBetsCountRef = useRef(0)
  const prevBetsSnapshotRef = useRef([])
  const cumulativePLRef = useRef(0)

  const handleManualCrash = useCallback(async () => {
    await setManualCrashSignal()
    toast.success('Crash signal sent to game engine')
  }, [toast])

  const handleSaveSettings = useCallback(async () => {
    const settings = {
      houseEdge: houseEdge / 100,
      biasStrength,
      heMode,
      heTargetPct,
      heMinSecs,
      heMaxSecs,
      autoTargetSecs,
    }
    try {
      localStorage.setItem('aviator_settings', JSON.stringify({ ...settings, ts: Date.now() }))
      await saveSettingsToDB(settings)
      toast.success('Settings saved to game engine')
    } catch {}
  }, [houseEdge, biasStrength, heMode, heTargetPct, heMinSecs, heMaxSecs, autoTargetSecs, toast])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => {
      canvas.width = canvas.offsetWidth * 2
      canvas.height = canvas.offsetHeight * 2
      ctx.scale(2, 2)
      bgDrawnRef.current = false
    }
    resize()
    window.addEventListener('resize', resize)

    const img = new Image()
    img.src = '/img/aviator_jogo.png'

    const drawBg = (W, H) => {
      if (bgDrawnRef.current) return
      const bg = ctx.createLinearGradient(0, 0, 0, H)
      bg.addColorStop(0, '#0c1220')
      bg.addColorStop(1, '#060e1a')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)
      ctx.strokeStyle = 'rgba(255,255,255,0.022)'
      ctx.lineWidth = 1
      for (let i = 0; i < W; i += 28) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke() }
      for (let i = 0; i < H; i += 28) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke() }
      ctx.fillStyle = 'rgba(255,255,255,0.12)'
      ctx.font = 'bold 10px monospace'
      for (let i = 1; i <= 10; i++) {
        const y = H - (i / 10) * H * 0.84 - H * 0.07
        ctx.fillText(`${i}x`, 3, y + 3)
        ctx.strokeStyle = 'rgba(0,232,135,0.06)'
        ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(W, y); ctx.stroke()
      }
      bgDrawnRef.current = true
    }

    const draw = () => {
      const now = performance.now()
      if (now - lastDrawRef.current < 33) {
        rafRef.current = requestAnimationFrame(draw)
        return
      }
      lastDrawRef.current = now

      const W = canvas.offsetWidth
      const H = canvas.offsetHeight
      ctx.clearRect(0, 0, W, H)
      drawBg(W, H)

      let currentPhase = 'betting'
      let currentMult = 1.00
      let currentCd = 8
      let currentCrashedAt = null

      try {
        const s = JSON.parse(localStorage.getItem('aviator_game_state') || '{}')
        currentPhase = s.phase || 'betting'
        currentMult = s.mult || 1.00
        currentCd = s.countdown ?? 8
        if (currentPhase === 'running' && s.startTime && s.crashPoint) {
          const elapsed = (Date.now() - s.startTime) / 1000
          const m = Math.min(100, parseFloat(Math.pow(Math.E, 0.06 * elapsed).toFixed(2)))
          if (m >= s.crashPoint) {
            currentPhase = 'crashed'
            currentCrashedAt = s.crashPoint
          }
        } else if (currentPhase === 'crashed') {
          currentCrashedAt = s.crashPoint || null
        }
      } catch {}

      let didChange = false
      if (currentPhase !== prevPhaseRef.current) { prevPhaseRef.current = currentPhase; setPhase(currentPhase); didChange = true }
      if (Math.abs(currentMult - prevMultRef.current) > 0.001) { prevMultRef.current = currentMult; setMult(currentMult); didChange = true }
      if (currentCd !== prevCdRef.current) { prevCdRef.current = currentCd; setCd(currentCd); didChange = true }
      if (currentCrashedAt !== prevCrashedAtRef.current) { prevCrashedAtRef.current = currentCrashedAt; setCrashedAt(currentCrashedAt); didChange = true }
      if (didChange) setSynced(true)

      try {
        const heRaw = localStorage.getItem('aviator_live_he')
        if (heRaw) {
          const he = JSON.parse(heRaw)
          if (Date.now() - he.ts < 5000) {
            setLiveHE(he)
          }
        }
      } catch {}

      if (currentPhase === 'running') {
        const originX = 5
        const originY = H * 0.90
        const maxTravelX = Math.max(W - 220, W * 0.65)
        const maxTravelY = H * 0.78
        const progress = Math.min(1, Math.log(currentMult) / Math.log(50))
        const eased = Math.pow(progress, 0.6)
        const nx = originX + eased * maxTravelX
        const ny = originY - eased * maxTravelY
        const endX = nx - 15
        const endY = ny + 5
        const cpx = (originX + endX) * 0.5
        const cpy = originY - (originY - endY) * 0.08

        ctx.save()
        ctx.lineCap = 'round'
        ctx.shadowColor = '#00ff9d'
        ctx.shadowBlur = 22
        ctx.strokeStyle = 'rgba(0,255,157,0.2)'
        ctx.lineWidth = 10
        ctx.beginPath(); ctx.moveTo(originX, originY); ctx.quadraticCurveTo(cpx, cpy, endX, endY); ctx.stroke()
        ctx.shadowBlur = 10
        ctx.strokeStyle = '#00ff9d'
        ctx.lineWidth = 3
        ctx.beginPath(); ctx.moveTo(originX, originY); ctx.quadraticCurveTo(cpx, cpy, endX, endY); ctx.stroke()
        ctx.restore()

        if (img.complete) ctx.drawImage(img, nx - 50, ny - 32, 100, 64)

        const displayMult = currentMult * 1.5
        let mc = '#00e887'
        if (displayMult >= 10) mc = '#ff4d4d'
        else if (displayMult >= 5) mc = '#ffd600'
        ctx.fillStyle = mc
        ctx.font = 'bold 24px "Exo 2", sans-serif'
        ctx.shadowColor = mc
        ctx.shadowBlur = 10
        ctx.fillText(`${displayMult.toFixed(2)}x`, nx + 10, ny + 8)
        ctx.shadowBlur = 0

        planeRef.current.fr++
      }

      if (currentPhase === 'crashed' && planeRef.current.x > 0) {
        for (let i = 0; i < 25; i++) {
          const ag = (i / 25) * Math.PI * 2
          const di = 14 + Math.sin(planeRef.current.fr * 0.4 + i) * 12
          ctx.fillStyle = ['#dc2626', '#f97316', '#fde047'][i % 3]
          ctx.globalAlpha = 0.35 + Math.sin(planeRef.current.fr * 0.4 + i) * 0.2
          ctx.beginPath()
          ctx.arc(planeRef.current.x + Math.cos(ag) * di, planeRef.current.y + Math.sin(ag) * di, 1 + Math.random() * 2.5, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1
        planeRef.current.fr++
      }

      if (currentPhase === 'betting') {
        if (planeRef.current.x !== 0) { planeRef.current.x = 0; planeRef.current.y = 0; planeRef.current.fr = 0 }
        bgDrawnRef.current = false
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(rafRef.current)
    }
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      try {
        const betsRaw = localStorage.getItem('aviator_live_bets')
        const histRaw = localStorage.getItem('aviator_crash_history')

        if (betsRaw) {
          const bets = JSON.parse(betsRaw)
          if (bets.length !== prevBetsCountRef.current) {
            prevBetsCountRef.current = bets.length
            setLiveBets(bets)
          }
        }

        if (histRaw) {
          const arr = JSON.parse(histRaw)
          if (arr.length !== roundsPlayedRef.current) {
            roundsPlayedRef.current = arr.length
            setRoundsPlayed(arr.length)
            setHistory(arr)
          }
        }
      } catch {}
    }, 500)

    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (phase === 'crashed') {
      const bets = prevBetsSnapshotRef.current
      const realBets = bets.filter(b => !b.is_bot)
      const exited = realBets.filter(b => b.status === 'won')
      const lost = realBets.filter(b => b.status === 'lost')
      const realBetAmt = realBets.reduce((s, b) => s + Number(b.amount || 0), 0)
      const realExitAmt = exited.reduce((s, b) => s + Number(b.cashout_amount || 0), 0)
      const realLostAmt = lost.reduce((s, b) => s + Number(b.amount || 0), 0)
      const roundPL = realLostAmt - (realExitAmt - realBetAmt)
      cumulativePLRef.current += roundPL
      setCumulativePL(cumulativePLRef.current)
    } else if (phase === 'betting') {
      try {
        const bets = JSON.parse(localStorage.getItem('aviator_live_bets') || '[]')
        prevBetsSnapshotRef.current = bets
      } catch {
        prevBetsSnapshotRef.current = []
      }
    }
  }, [phase])

  const realBets = useMemo(() => liveBets.filter(b => !b.is_bot), [liveBets])
  const botBets = useMemo(() => liveBets.filter(b => b.is_bot), [liveBets])
  const exited = useMemo(() => liveBets.filter(b => b.status === 'won'), [liveBets])
  const lost = useMemo(() => liveBets.filter(b => b.status === 'lost'), [liveBets])
  const pending = useMemo(() => liveBets.filter(b => b.status === 'pending'), [liveBets])

  const realBetAmt = useMemo(() => realBets.reduce((s, b) => s + Number(b.amount || 0), 0), [realBets])
  const realExitAmt = useMemo(() => exited.reduce((s, b) => s + Number(b.cashout_amount || 0), 0), [exited])
  const realLostAmt = useMemo(() => lost.reduce((s, b) => s + Number(b.amount || 0), 0), [lost])
  const realPL = useMemo(() => realLostAmt - (realExitAmt - realBetAmt), [realLostAmt, realExitAmt, realBetAmt])
  const botBetAmt = useMemo(() => botBets.reduce((s, b) => s + Number(b.amount || 0), 0), [botBets])

  const actualHouseEdge = crashedAt ? ((crashedAt - 1) / crashedAt * 100).toFixed(2) : null

  const phaseColors = {
    betting: { label: 'BETTING', color: 'text-cyan-400', bg: 'bg-cyan-500/20' },
    running: { label: 'RUNNING', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    crashed: { label: 'CRASHED', color: 'text-red-400', bg: 'bg-red-500/20' },
  }
  const pc = phaseColors[phase] || phaseColors.betting

  const getH = (v) => {
    const n = typeof v === 'number' ? v : parseFloat(v)
    if (n >= 10) return 'bg-red-500/25 text-red-400 border border-red-500/30'
    if (n >= 2) return 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/25'
    return 'bg-white/5 text-white/40 border border-white/10'
  }

  const poolVal = Number(hePool?.house_edge_pool || 0)
  const grossPnl = Number(hePool?.gross_pnl || 0)
  const totalDeposits = Number(hePool?.total_deposits || 0)
  const totalBets = Number(hePool?.total_bets || 0)
  const totalWinnings = Number(hePool?.total_winnings_paid || 0)
  const totalWithdrawals = Number(hePool?.total_withdrawals_paid || 0)
  const poolRounds = Number(hePool?.rounds_played || 0)

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-5 py-4 bg-slate-900/60 border-b border-slate-700/50 hover:bg-slate-900/80 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white text-sm shadow-lg shadow-red-500/20">
            ✈
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-white">Aviator Game Control</h3>
            <p className="text-[11px] text-slate-400">
              {synced ? 'Synced · Manual crash available' : 'Waiting for game engine...'}
            </p>
          </div>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${pc.bg} ${pc.color}`}>{pc.label}</span>
          {!synced && <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />}
        </div>
        {expanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
      </button>

      {expanded && (
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 bg-slate-900/60 rounded-xl border border-slate-700/50 overflow-hidden">
              <div className="p-2 border-b border-slate-700/50 flex items-center justify-between">
                <h4 className="text-xs font-semibold text-white uppercase tracking-wider">Live Game</h4>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${pc.bg} ${pc.color}`}>{pc.label}</span>
              </div>
              <canvas ref={canvasRef} style={{ width: '100%', height: 220, display: 'block' }} />
              {phase === 'crashed' && crashedAt && (
                <div className="p-2 text-center border-t border-slate-700/50">
                  <span className="text-xs text-slate-400">House Edge: {actualHouseEdge}%</span>
                  <div className="grid grid-cols-3 gap-1 mt-1">
                    {history.slice(0, 6).map((h, i) => (
                      <div key={`${h}-${i}`} className={`px-1 py-0.5 rounded text-[9px] font-bold text-center ${getH(h)}`}>
                        {typeof h === 'number' ? h.toFixed(2) : h}x
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50">
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3">Controls</h4>
              <div className="space-y-2">
                <div className="bg-slate-800/60 rounded-lg p-2.5 text-center border border-slate-700/50">
                  <p className="text-[9px] text-slate-400 uppercase">Game State</p>
                  <p className={`text-sm font-bold mt-0.5 ${phase === 'running' ? 'text-emerald-400' : phase === 'crashed' ? 'text-red-400' : 'text-cyan-400'}`}>
                    {phase.toUpperCase()}
                  </p>
                  {phase === 'betting' && <p className="text-lg font-black text-white mt-0.5">{cd}s</p>}
                  {phase === 'running' && <p className="text-lg font-black text-emerald-400 mt-0.5">{(mult * 1.5).toFixed(2)}x</p>}
                  {phase === 'crashed' && <p className="text-lg font-black text-red-400 mt-0.5">{crashedAt?.toFixed(2)}x</p>}
                </div>
                <button
                  onClick={handleManualCrash}
                  className="w-full py-2.5 px-4 bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 rounded-lg text-xs font-bold flex items-center justify-center gap-2"
                >
                  <Octagon className="w-3.5 h-3.5" />
                  Manual Crash
                </button>
                <div className="text-[9px] text-slate-500 text-center">
                  Instant signal via localStorage
                </div>
                <div className={`rounded-lg p-2.5 text-center border ${cumulativePL >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                  <p className="text-[9px] text-slate-400 uppercase">Session P&L</p>
                  <p className={`text-base font-black mt-0.5 ${cumulativePL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {cumulativePL >= 0 ? '+' : ''}₨{Number(cumulativePL).toLocaleString()}
                  </p>
                  <p className="text-[9px] text-slate-400/60">{roundsPlayed} rounds</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-sm font-bold text-white uppercase tracking-wider">House Edge P&L Dashboard</h4>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-500">
                  <span>{poolRounds} rounds played</span>
                  <span className="w-px h-3 bg-slate-700" />
                  <span className="text-emerald-400">Auto-refreshes every 3s</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50 text-center">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider mb-1">Total Deposits</p>
                  <p className="text-base font-black text-cyan-400">₨{totalDeposits.toLocaleString()}</p>
                </div>

                <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50 text-center">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider mb-1">Total Bets</p>
                  <p className="text-base font-black text-white">₨{totalBets.toLocaleString()}</p>
                </div>

                <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50 text-center">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider mb-1">Winnings Paid</p>
                  <p className="text-base font-black text-emerald-400">₨{totalWinnings.toLocaleString()}</p>
                </div>

                <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/50 text-center">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider mb-1">Withdrawals</p>
                  <p className="text-base font-black text-amber-400">₨{totalWithdrawals.toLocaleString()}</p>
                </div>

                <div className={`rounded-xl p-3 border text-center ${poolVal >= 0 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                    <p className="text-[10px] text-emerald-400 uppercase font-semibold tracking-wider">House Edge Pool</p>
                  </div>
                  <p className={`text-lg font-black ${poolVal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {poolVal >= 0 ? '+' : ''}₨{poolVal.toLocaleString()}
                  </p>
                </div>

                <div className={`rounded-xl p-3 border text-center ${grossPnl >= 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                  <p className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider mb-1">Gross P&L</p>
                  <p className={`text-lg font-black ${grossPnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {grossPnl >= 0 ? '+' : ''}₨{grossPnl.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-slate-900/60 rounded-xl p-4 border border-slate-700/50">
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-cyan-400" />
                Smart Auto House Edge
              </h4>
              <div className="flex gap-1.5 mb-3">
                {['off', 'smart', 'time'].map(mode => (
                  <button
                    key={mode}
                    onClick={() => setHeMode(mode)}
                    className={`flex-1 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider border transition-all ${
                      heMode === mode
                        ? mode === 'off' ? 'bg-slate-600 border-slate-500 text-white'
                        : mode === 'smart' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                        : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
                        : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-white'
                    }`}
                  >
                    {mode === 'off' ? 'Off' : mode === 'smart' ? 'Smart' : 'Time'}
                  </button>
                ))}
              </div>

              {heMode === 'smart' && (
                <>
                  <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50 mb-2">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Target House Edge %</p>
                      <span className="text-sm font-black text-emerald-400">{heTargetPct}%</span>
                    </div>
                    <input
                      type="range" min={1} max={20} value={heTargetPct}
                      onChange={e => setHeTargetPct(Number(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[9px] text-slate-500 uppercase">Min Time</p>
                        <span className="text-sm font-black text-cyan-400">{heMinSecs}s</span>
                      </div>
                      <input
                        type="range" min={1} max={10} value={heMinSecs}
                        onChange={e => setHeMinSecs(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                      />
                    </div>
                    <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-[9px] text-slate-500 uppercase">Max Time</p>
                        <span className="text-sm font-black text-red-400">{heMaxSecs}s</span>
                      </div>
                      <input
                        type="range" min={5} max={200} value={heMaxSecs}
                        onChange={e => setHeMaxSecs(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                      />
                    </div>
                  </div>
                </>
              )}

              {heMode === 'time' && (
                <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50 mb-2">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[9px] text-slate-400 uppercase font-semibold">Auto Crash After (secs)</p>
                    <span className="text-sm font-black text-cyan-400">{autoTargetSecs}s</span>
                  </div>
                  <input
                    type="range" min={2} max={60} value={autoTargetSecs}
                    onChange={e => setAutoTargetSecs(Number(e.target.value))}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                  />
                </div>
              )}

              <button onClick={handleSaveSettings} className="w-full py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-xs font-bold mt-1">
                Save to Game Engine
              </button>

              {phase === 'running' && heMode === 'smart' && liveHE && liveHE.event === 'live' && (
                <div className="mt-3 rounded-lg p-3 border border-slate-700/50 bg-slate-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-slate-400 uppercase font-semibold">Live Smart Metrics</p>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      liveHE.liveEdge <= heTargetPct
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : liveHE.liveEdge <= heTargetPct * 2
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        : 'bg-red-500/20 text-red-400 border border-red-500/30'
                    }`}>
                      {liveHE.liveEdge <= heTargetPct ? 'SAFE' : liveHE.liveEdge <= heTargetPct * 2 ? 'CAUTION' : 'AT RISK'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <p className="text-[8px] text-slate-500 uppercase">Target Mult</p>
                      <p className="text-sm font-black text-cyan-400">
                        {liveHE.targetMult != null ? `≥${(liveHE.targetMult * 1.5).toFixed(2)}x` : '—'}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[8px] text-slate-500 uppercase">Current Edge</p>
                      <p className={`text-sm font-black ${liveHE.liveEdge <= heTargetPct ? 'text-emerald-400' : liveHE.liveEdge <= heTargetPct * 2 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {liveHE.liveEdge.toFixed(1)}%
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[8px] text-slate-500 uppercase">Exit Rate</p>
                      <p className="text-sm font-black text-white">{liveHE.exitRate.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-slate-900/60 rounded-xl border border-slate-700/50 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-semibold text-white">All Bets</h4>
                  <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 text-[10px] font-bold">{liveBets.length}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px]">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-500" /> Pending: {pending.length}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-400" /> Won: {exited.length}</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Lost: {lost.length}</span>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
                <table className="w-full">
                  <thead className="sticky top-0 bg-slate-900/90 backdrop-blur-sm z-10">
                    <tr className="border-b border-slate-700/50">
                      <th className="text-left px-3 py-2 text-[9px] font-semibold text-slate-500 uppercase tracking-wider">User</th>
                      <th className="text-left px-3 py-2 text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                      <th className="text-left px-3 py-2 text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Auto</th>
                      <th className="text-left px-3 py-2 text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                      <th className="text-left px-3 py-2 text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Result</th>
                      <th className="text-left px-3 py-2 text-[9px] font-semibold text-slate-500 uppercase tracking-wider">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {liveBets.length === 0 ? (
                      <tr><td colSpan={6} className="px-3 py-6 text-center text-slate-600 text-xs">Waiting for bets...</td></tr>
                    ) : liveBets.map(bet => (
                      <BetRow key={bet.id} bet={bet} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
