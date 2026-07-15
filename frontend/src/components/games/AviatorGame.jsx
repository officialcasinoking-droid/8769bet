import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { ChevronLeft, Volume2, VolumeX } from 'lucide-react'
import { aviatorWS } from '../../api/aviatorWebSocket'
import AviatorCanvas from './AviatorCanvas'
import AviatorBetPanel from './AviatorBetPanel'
import CrashHistory from './CrashHistory'
import LiveBets from './LiveBets'
import MyBets from './MyBets'
import useGameSounds from '../../hooks/useGameSounds'

const API_URL = import.meta.env.VITE_API_URL || 'https://eight769bet-backend.onrender.com'
const MIN_BET = 6, MAX_BET = 1000

export default function AviatorGame() {
  const navigate = useNavigate()
  const { user, isLoggedIn, updateBalance } = useAuth()
  const toast = useToast()

  // ── State ──
  const [showLoading, setShowLoading] = useState(true)
  const [loadProg, setLoadProg] = useState(0)
  const [phase, setPhase] = useState('betting')
  const [mult, setMult] = useState(1.0)
  const [cd, setCd] = useState(8)
  const [crashedAt, setCrashedAt] = useState(null)
  const [bal, setBal] = useState(0)
  const [live, setLive] = useState([])
  const [hist, setHist] = useState([])
  const [myHistory, setMyHistory] = useState([])
  const [cashoutExits, setCashoutExits] = useState([])
  const [connected, setConnected] = useState(false)
  const [initialConnect, setInitialConnect] = useState(true)
  const [polling, setPolling] = useState(false)
  const [soundMuted, setSoundMuted] = useState(() => localStorage.getItem('aviator_muted') === 'true')

  // Bet 1 & 2 state
  const [b1a, setB1a] = useState(10)
  const [b1o, setB1o] = useState(false)
  const [b1v, setB1v] = useState('2.00')
  const [b1d, setB1d] = useState(null)
  const [b2a, setB2a] = useState(10)
  const [b2o, setB2o] = useState(false)
  const [b2v, setB2v] = useState('2.00')
  const [b2d, setB2d] = useState(null)

  const b1dRef = useRef(null), b2dRef = useRef(null)
  const autoCashedRef = useRef(new Set())
  const phaseRef = useRef('betting')
  const exitCountRef = useRef(0)
  const prevPhaseRef = useRef('betting')
  const prevLiveRef = useRef([])
  const cdIntervalRef = useRef(null)
  const userRef = useRef(user)
  const balRef = useRef(bal)
  const b1aRef = useRef(b1a), b1oRef = useRef(b1o), b1vRef = useRef(b1v)
  const b2aRef = useRef(b2a), b2oRef = useRef(b2o), b2vRef = useRef(b2v)

  useEffect(() => { b1dRef.current = b1d }, [b1d])
  useEffect(() => { b2dRef.current = b2d }, [b2d])
  useEffect(() => { phaseRef.current = phase }, [phase])
  useEffect(() => { userRef.current = user }, [user])
  useEffect(() => { balRef.current = bal }, [bal])
  useEffect(() => { b1aRef.current = b1a; b1oRef.current = b1o; b1vRef.current = b1v }, [b1a, b1o, b1v])
  useEffect(() => { b2aRef.current = b2a; b2oRef.current = b2o; b2vRef.current = b2v }, [b2a, b2o, b2v])
  useEffect(() => { if (user?.balance !== undefined) setBal(user.balance) }, [user])
  useEffect(() => { localStorage.setItem('aviator_muted', soundMuted) }, [soundMuted])

  const sounds = useGameSounds(soundMuted)
  const soundsRef = useRef(sounds)
  useEffect(() => { soundsRef.current = sounds }, [sounds])

  // ── Loading screen ──
  useEffect(() => {
    let prog = 0
    const tick = setInterval(() => {
      prog += Math.random() * 18 + 8
      if (prog >= 100) { prog = 100; clearInterval(tick); setLoadProg(100); setTimeout(() => setShowLoading(false), 300) }
      else setLoadProg(prog)
    }, 150)
    const force = setTimeout(() => { clearInterval(tick); setLoadProg(100); setShowLoading(false) }, 5000)
    return () => { clearInterval(tick); clearTimeout(force) }
  }, [])

  // ── Refresh balance ──
  useEffect(() => {
    if (!user?.id || showLoading) return
    const fetchBal = async () => {
      try {
        const { supabase } = await import('../../lib/supabase')
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const { data } = await supabase.from('users').select('balance').eq('id', user.id).single()
          if (data) setBal(Number(data.balance) || 0)
        }
      } catch {}
    }
    fetchBal()
    const i = setInterval(fetchBal, 10000)
    return () => clearInterval(i)
  }, [user?.id, showLoading])

  // ── Load bet history ──
  useEffect(() => {
    if (!user?.id || showLoading) return
    fetch(`${API_URL}/api/aviator/bet-history?userId=${user.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.success && d.bets) {
          setMyHistory(d.bets.slice(0, 15).map(b => ({
            amount: Number(b.amount), mult: b.cashout_multiplier || null,
            won: b.status === 'won', profit: b.status === 'won' ? Number(b.win_amount) : -Number(b.amount),
            pending: false, betId: b.id,
            time: new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          })))
        }
      }).catch(() => {})
  }, [user?.id, showLoading])

  // ── Countdown timer ──
  useEffect(() => {
    if (phase === 'betting' && !showLoading) {
      cdIntervalRef.current = setInterval(() => {
        setCd(prev => {
          if (prev <= 0.1) { clearInterval(cdIntervalRef.current); return 0 }
          if (Math.floor(prev) !== Math.floor(prev - 0.1) && prev > 0.5) soundsRef.current.playTick()
          return Math.round((prev - 0.1) * 10) / 10
        })
      }, 100)
    }
    return () => { if (cdIntervalRef.current) clearInterval(cdIntervalRef.current) }
  }, [phase, showLoading])

  // ── WebSocket connection ──
  useEffect(() => {
    if (showLoading) return
    aviatorWS.connect()

    const checkConn = setInterval(() => {
      setConnected(aviatorWS.isConnected)
      setPolling(aviatorWS.isPolling)
    }, 1000)

    aviatorWS.on('polling_active', () => setPolling(true))
    aviatorWS.on('ws_connected', () => {
      setConnected(true)
      setInitialConnect(false)
      if (aviatorWS.ws) aviatorWS.ws.send(JSON.stringify({ type: 'get_state' }))
    })

    aviatorWS.on('game_state', (state) => {
      if (state.phase === 'betting') {
        phaseRef.current = 'betting'
        setPhase('betting')
        setCd(parseFloat(state.countdown) || 8)
        setCrashedAt(null)
      } else if (state.phase === 'flying') {
        phaseRef.current = 'running'
        setPhase('running')
        setMult(parseFloat(state.mult) || 1.0)
      } else if (state.phase === 'crashed') {
        phaseRef.current = 'crashed'
        setPhase('crashed')
        const cp = parseFloat(state.crash_point) || 1.0
        setCrashedAt(cp)
        setMult(cp)
        setHist(prev => prev.includes(cp) ? prev : [cp, ...prev].slice(0, 30))
      }
      if (state.crashHistory?.length) setHist(state.crashHistory.slice(0, 30))
      if (state.bets?.length) setLive(state.bets)
    })

    aviatorWS.on('bets_update', (data) => {
      const bets = Array.isArray(data) ? data : data?.bets || []
      setLive(bets)
      const u = userRef.current
      if (!u?.id) return
      ;[1, 2].forEach(num => {
        const ref = num === 1 ? b1dRef : b2dRef
        const setter = num === 1 ? setB1d : setB2d
        const myBet = bets.find(b => b.userId === u.id && b.betNum === num && b.cashedOut && b.status === 'won')
        if (myBet && ref.current && !ref.current.cashed && !autoCashedRef.current.has(`${myBet.userId}_${myBet.betNum}`)) {
          autoCashedRef.current.add(`${myBet.userId}_${myBet.betNum}`)
          const won = myBet.winAmount || 0
          setBal(p => { const n = p + won; updateBalance(n); return n })
          setter(p => p ? { ...p, cashed: { won }, id: myBet.id } : null)
          setMyHistory(p => p.map(e => e.pending && (e.betId === myBet.id || e.betId.startsWith('temp_'))
            ? { ...e, mult: myBet.cashoutMult, won: true, profit: won, pending: false } : e))
          addCashoutExit(u.username || 'You', won)
          toast.success(`Auto cashed ${myBet.cashoutMult.toFixed(2)}x — +₨${won.toLocaleString()}`)
          soundsRef.current.playCashout()
        }
      })
    })

    aviatorWS.on('cashout_result', (result) => {
      if (!result.success) return
      const u = userRef.current
      const num = result.betNum || 1
      const setter = num === 1 ? setB1d : setB2d
      setBal(p => { const n = p + result.winAmount; updateBalance(n); return n })
      setter(p => p ? { ...p, cashed: { won: result.winAmount } } : null)
      const betData = num === 1 ? b1dRef.current : b2dRef.current
      setMyHistory(p => p.map(e => e.pending && (e.betId === betData?.id || e.betId.startsWith('temp_'))
        ? { ...e, mult: result.multiplier, won: true, profit: result.winAmount, pending: false } : e))
      addCashoutExit(u?.username || 'You', result.winAmount)
      toast.success(`Cashed ${result.multiplier.toFixed(2)}x — +₨${result.winAmount.toLocaleString()}`)
      soundsRef.current.playCashout()
    })

    aviatorWS.on('bet_result', (result) => {
      if (result.success) {
        const num = result.betNumber
        const setter = num === 1 ? setB1d : setB2d
        setter(p => p && p.id.startsWith('temp_') ? { ...p, id: result.bet.id } : p)
        setMyHistory(p => p.map(e => e.pending && e.betId.startsWith('temp_') && e.amount === result.bet.amount ? { ...e, betId: result.bet.id } : e))
      } else {
        toast.error(result.error || 'Failed to place bet')
        setB1d(null); setB2d(null)
        setMyHistory(p => p.filter(e => !e.betId.startsWith('temp_')))
      }
    })

    aviatorWS.on('cancel_result', (r) => { if (!r.success) console.error('[cancel] Failed:', r.error) })

    return () => { clearInterval(checkConn) }
  }, [showLoading])

  // ── Round transitions ──
  useEffect(() => {
    const prev = prevPhaseRef.current
    prevPhaseRef.current = phase
    if (phase === 'crashed' && prev !== 'crashed') {
      soundsRef.current.playCrash()
      setMyHistory(h => h.map(e => e.pending && !e.won ? { ...e, won: false, pending: false, mult: null, profit: -e.amount } : e))
      if (userRef.current?.id) fetch(`${API_URL}/api/aviator/bet-history?userId=${userRef.current.id}`).then(r => r.json()).catch(() => {})
    }
    if (phase === 'betting' && prev === 'crashed') {
      setB1d(null); setB2d(null)
      autoCashedRef.current.clear()
    }
  }, [phase])

  // ── Engine sound ──
  useEffect(() => {
    if (phase === 'running') soundsRef.current.playEngine(mult)
    else soundsRef.current.stopEngine()
  }, [phase, mult])

  // ── Live bet cashout popups ──
  useEffect(() => {
    if (prevLiveRef.current.length > 0) {
      const prevMap = new Map(prevLiveRef.current.map(b => [b.id, b]))
      live.forEach(b => {
        const prev = prevMap.get(b.id)
        if (prev && prev.status === 'pending' && b.status === 'won' && b.username !== userRef.current?.username) {
          addCashoutExit(b.username, Number(b.winAmount || b.win_amount || 0))
        }
      })
    }
    prevLiveRef.current = [...live]
  }, [live])

  // ── Actions ──
  const addCashoutExit = useCallback((name, profit) => {
    exitCountRef.current++
    const id = `ex_${exitCountRef.current}_${Date.now()}`
    setCashoutExits(p => [...p, { id, name, profit, left: 20 + Math.random() * 50, top: 50 + Math.random() * 40 }])
    setTimeout(() => setCashoutExits(p => p.filter(e => e.id !== id)), 2500)
  }, [])

  const place = useCallback((num) => {
    const u = userRef.current
    const b = balRef.current
    if (!isLoggedIn) { navigate('/login', { state: { from: '/play/aviator' } }); return }
    const amount = num === 1 ? b1aRef.current : b2aRef.current
    if (amount < MIN_BET) { toast.error(`Min ₨${MIN_BET}`); return }
    if (amount > MAX_BET) { toast.error(`Max ₨${MAX_BET}`); return }
    if (amount > b) { toast.error('Low balance'); return }
    if (phaseRef.current !== 'betting') { toast.error('Wait for next round'); return }

    const autoOn = num === 1 ? b1oRef.current : b2oRef.current
    const autoVal = num === 1 ? b1vRef.current : b2vRef.current
    const autoCashout = autoOn ? parseFloat(autoVal) : null
    const tempId = `temp_${Date.now()}_${num}`
    const newBal = b - amount
    setBal(newBal); updateBalance(newBal)
    const entry = { id: tempId, amount, autoCashout, cashed: null }
    if (num === 1) setB1d(entry); else setB2d(entry)
    setMyHistory(p => [{ amount, mult: null, won: false, profit: 0, pending: true, betId: tempId, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }, ...p].slice(0, 15))

    aviatorWS.placeBet({ userId: u?.id, username: u?.username || 'You', amount, autoCashout, betNumber: num })
    soundsRef.current.playBet()
    toast.success(`Bet ${num}: ₨${amount} placed`)
  }, [isLoggedIn, navigate, toast, updateBalance])

  const cashout = useCallback((num) => {
    if (phaseRef.current !== 'running') return
    const betData = num === 1 ? b1dRef.current : b2dRef.current
    if (!betData || betData.cashed) return
    aviatorWS.cashout(userRef.current?.id, num)
  }, [])

  const cancelBet = useCallback((num) => {
    const betData = num === 1 ? b1dRef.current : b2dRef.current
    if (!betData) return
    if (phaseRef.current !== 'betting') { toast.error('Can only cancel during betting phase'); return }
    aviatorWS.cancelBet(userRef.current?.id, num, betData.id)
    setBal(p => { const n = p + betData.amount; updateBalance(n); return n })
    if (num === 1) setB1d(null); else setB2d(null)
    setMyHistory(p => p.filter(e => e.betId !== betData.id && !e.betId.startsWith('temp_')))
    toast.success('Bet cancelled')
  }, [toast, updateBalance])

  // ── Render ──
  return (
    <div className="w-full h-[100dvh] flex flex-col overflow-hidden bg-[#0a0f1e] text-white font-['Inter',sans-serif]">
      {showLoading && (
        <div className="fixed inset-0 z-[200] bg-[#0a0f1e] flex flex-col items-center justify-center">
          <div className="w-28 h-28 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex flex-col items-center justify-center shadow-[0_0_60px_rgba(255,77,77,0.4)] mb-6">
            <span className="font-['Exo_2'] text-4xl font-black text-white tracking-widest uppercase leading-none">AVIATOR</span>
            <span className="font-['Exo_2'] text-[9px] font-bold text-white/60 tracking-[0.25em] uppercase mt-1">CRASH GAME</span>
          </div>
          <h1 className="font-['Exo_2'] text-2xl font-black tracking-[0.2em] uppercase mb-1">AVIATOR</h1>
          <p className="text-[10px] text-white/20 tracking-[0.3em] uppercase mb-8">Loading...</p>
          <div className="w-60 h-[3px] bg-white/10 rounded overflow-hidden">
            <div className="h-full rounded bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-[0_0_10px_rgba(0,232,135,0.5)] transition-all duration-150" style={{ width: `${loadProg}%` }} />
          </div>
        </div>
      )}

      {!showLoading && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-2 bg-[#0f1929] border-b border-white/[0.04] flex-shrink-0 z-10">
            <div className="flex items-center gap-2.5">
              <button className="w-7 h-7 rounded-lg bg-white/[0.03] border-none flex items-center justify-center cursor-pointer text-white/40 hover:bg-white/[0.08] hover:text-white transition-all" onClick={() => navigate(-1)}>
                <ChevronLeft size={14} />
              </button>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-xs">✈</div>
                <span className="font-['Exo_2'] text-xs font-extrabold tracking-[0.15em] uppercase">Aviator</span>
                <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 shadow-[0_0_7px_#00e887]' : 'bg-amber-400'} animate-pulse`} />
                {polling && <span className="text-[8px] text-amber-400/60 font-bold">POLLING</span>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="w-7 h-7 rounded-lg bg-white/[0.03] border-none flex items-center justify-center cursor-pointer text-white/40 hover:bg-white/[0.08] hover:text-white transition-all" onClick={() => setSoundMuted(m => !m)}>
                {soundMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[8px] font-bold text-emerald-400/60 uppercase">Balance</span>
                <span className="font-['Exo_2'] text-sm font-extrabold text-emerald-400">₨{bal.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <CrashHistory history={hist} />

          {/* Main */}
          <div className="flex flex-col flex-1 overflow-hidden min-h-0">
            <div className="flex flex-1 overflow-hidden min-h-0">
              {/* Canvas */}
              <div className="flex-[0.75] relative overflow-hidden bg-[#0a0f1e]">
                <AviatorCanvas phase={phase} mult={mult} crashedAt={crashedAt} cashoutExits={cashoutExits} />

                {/* Overlays */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                  {phase === 'betting' && (
                    <div className="bg-black/60 backdrop-blur-xl border border-white/[0.08] rounded-2xl px-8 py-5 text-center">
                      <div className="font-['Exo_2'] text-5xl font-black text-white leading-none drop-shadow-[0_0_28px_rgba(255,255,255,0.2)]">{cd.toFixed(1)}</div>
                      <div className="text-[9px] font-semibold text-white/30 uppercase tracking-[0.2em] mt-1">Place your bets</div>
                    </div>
                  )}
                  {phase === 'crashed' && crashedAt && (
                    <div className="font-['Exo_2'] text-4xl font-black text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.6)]">
                      {crashedAt.toFixed(2)}x
                    </div>
                  )}
                </div>

                {/* Connecting overlay */}
                {initialConnect && !connected && (
                  <div className="absolute inset-0 z-20 bg-[#0a0f1e] flex flex-col items-center justify-center">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex flex-col items-center justify-center shadow-[0_0_40px_rgba(255,77,77,0.3)] mb-5">
                      <span className="font-['Exo_2'] text-3xl font-black text-white tracking-widest uppercase leading-none">AVIATOR</span>
                      <span className="font-['Exo_2'] text-[8px] font-bold text-white/60 tracking-[0.2em] uppercase mt-1">CRASH GAME</span>
                    </div>
                    <div className="text-sm font-bold tracking-[0.1em]">Connecting to server...</div>
                    <div className="text-[11px] text-white/25 mt-1.5">This may take a moment if server is waking up</div>
                  </div>
                )}
                {!initialConnect && !connected && (
                  <div className="absolute inset-0 z-20 bg-[#0a0f1e]/85 backdrop-blur-xl flex flex-col items-center justify-center">
                    <div className="w-10 h-10 border-[3px] border-white/10 border-t-emerald-400 rounded-full animate-spin mb-4" />
                    <div className="text-sm font-bold tracking-[0.05em]">Reconnecting...</div>
                    <div className="text-[10px] text-white/30 mt-1">Game will resume automatically</div>
                  </div>
                )}
              </div>

              <LiveBets bets={live} currentUsername={user?.username} />
            </div>

            {/* Bet panels */}
            <div className="flex overflow-hidden flex-shrink-0">
              <div className="flex-1 min-w-0 overflow-x-auto p-1" style={{ scrollbarWidth: 'none' }}>
                <AviatorBetPanel num={1} amt={b1a} setAmt={setB1a} autoOn={b1o} setAutoOn={setB1o} autoVal={b1v} setAutoVal={setB1v} betData={b1d} phase={phase} mult={mult} bal={bal} onPlace={() => place(1)} onCash={() => cashout(1)} onCancel={() => cancelBet(1)} />
              </div>
              <div className="flex-1 min-w-0 overflow-x-auto p-1" style={{ scrollbarWidth: 'none' }}>
                <AviatorBetPanel num={2} amt={b2a} setAmt={setB2a} autoOn={b2o} setAutoOn={setB2o} autoVal={b2v} setAutoVal={setB2v} betData={b2d} phase={phase} mult={mult} bal={bal} onPlace={() => place(2)} onCash={() => cashout(2)} onCancel={() => cancelBet(2)} />
              </div>
            </div>

            <MyBets history={myHistory} />
          </div>
        </>
      )}
    </div>
  )
}
