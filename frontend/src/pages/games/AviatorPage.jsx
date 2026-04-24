import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useToast } from '../../components/ui/Toast'
import { aviatorWS } from '../../api/aviatorWebSocket'

const API_URL = import.meta.env.VITE_API_URL || ''

const GAME_STATE = {
  WAITING: 'waiting',
  RUNNING: 'running',
  CRASHED: 'crashed'
}

const TICK_INTERVAL = 50
const WAIT_TIME = 8000

const QUICK_AMOUNTS = [6, 10, 20, 50, 100, 200, 500]

const BOT_NAMES = [
  'Ali_Khan', 'Sara_Ahmed', 'Usman_Ali', 'Fatima_Z', 'Ahmed_R',
  'Ayesha_K', 'Bilal_H', 'Zainab_M', 'Hassan_A', 'Mariam_W',
  'Hamza_S', 'Hira_N', 'Saad_A', 'Nadia_I', 'Faisal_I'
]

const CRASH_COLORS = {
  high: 'bg-red-500/20 text-red-400 border border-red-500/30',
  medium: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  low: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
}

function BetPanel({ bet, betIndex, gameState, multiplier, hasBet, balance, onPlaceBet, onCashout, disabled }) {
  const [amount, setAmount] = useState(betIndex === 0 ? 6 : 6)
  const [autoCashoutValue, setAutoCashoutValue] = useState('')
  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState(false)

  const canBet = gameState === GAME_STATE.WAITING && !hasBet && amount > 0
  const canCashout = gameState === GAME_STATE.RUNNING && hasBet && bet && bet.status !== 'cashed_out'
  const potentialWin = hasBet && bet ? (parseFloat(bet.amount) * multiplier).toFixed(2) : '0.00'
  const betPlaced = bet?.status === 'cashed_out'

  return (
    <div className={`flex flex-col gap-2 p-3 rounded-xl bg-dark-300/50 border border-dark-100 ${betIndex === 1 ? 'hidden sm:flex' : ''}`}>
      {/* Bet Panel Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-emerald-400">Bet {betIndex + 1}</span>
        {hasBet && bet && (
          <span className={`text-xs font-bold ${betPlaced ? 'text-yellow-400' : 'text-emerald-400'}`}>
            {betPlaced ? `Won ₨${bet.wonAmount?.toFixed(2)}` : `₨${bet.amount}`}
          </span>
        )}
      </div>

      {/* Bet Amount */}
      <div>
        <label className="text-[10px] text-gray-400 mb-1 block">Bet Amount</label>
        <div className="flex gap-1.5">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Math.max(1, parseFloat(e.target.value) || 0))}
            disabled={hasBet}
            className="flex-1 px-2 py-1.5 rounded-lg bg-dark-400 border-dark-100 border text-white text-sm font-medium disabled:opacity-50"
          />
          <button
            onClick={() => setAmount(Math.min(balance, 50000))}
            disabled={hasBet}
            className="px-2 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium disabled:opacity-50"
          >
            MAX
          </button>
        </div>
        <div className="flex gap-1 mt-1">
          {QUICK_AMOUNTS.map(amt => (
            <button
              key={amt}
              onClick={() => setAmount(amt)}
              disabled={hasBet}
              className={`flex-1 py-1 rounded text-[10px] font-medium ${
                amount === amt
                  ? 'bg-emerald-500 text-white'
                  : 'bg-dark-400 text-gray-400'
              } disabled:opacity-50`}
            >
              {amt >= 1000 ? `${amt/1000}k` : amt}
            </button>
          ))}
        </div>
      </div>

      {/* Auto Cashout Toggle */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] text-gray-400">Auto Cashout</label>
          <button
            onClick={() => setAutoCashoutEnabled(!autoCashoutEnabled)}
            disabled={hasBet}
            className={`relative w-8 h-4 rounded-full transition-colors ${autoCashoutEnabled ? 'bg-emerald-500' : 'bg-gray-600'} disabled:opacity-50`}
          >
            <span className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${autoCashoutEnabled ? 'translate-x-4' : ''}`} />
          </button>
        </div>
        {autoCashoutEnabled && (
          <input
            type="number"
            step="0.1"
            min="1.1"
            max="100"
            value={autoCashoutValue}
            onChange={(e) => setAutoCashoutValue(e.target.value)}
            disabled={hasBet}
            placeholder="e.g. 2.00x"
            className="w-full px-2 py-1.5 rounded-lg bg-dark-400 border-dark-100 border text-white text-sm font-medium disabled:opacity-50"
          />
        )}
      </div>

      {/* Action Button */}
      {!hasBet ? (
        <button
          onClick={() => onPlaceBet(betIndex, amount, autoCashoutEnabled ? autoCashoutValue : null)}
          disabled={!canBet || amount > balance}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
            canBet && amount <= balance
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-emerald-500/30'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          {gameState === GAME_STATE.WAITING ? (
            amount > balance ? 'Insufficient Balance' : `Bet ₨${amount}`
          ) : 'Wait...'}
        </button>
      ) : (
        <div className="space-y-1.5">
          {bet?.status === 'cashed_out' ? (
            <div className="w-full py-2 rounded-xl bg-yellow-500/20 border border-yellow-500/30 text-center">
              <p className="text-[10px] text-yellow-400">Cashed Out</p>
              <p className="text-sm font-bold text-yellow-400">₨{bet.wonAmount?.toFixed(2)}</p>
            </div>
          ) : canCashout ? (
            <button
              onClick={() => onCashout(betIndex, multiplier)}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold text-sm hover:shadow-lg hover:shadow-yellow-500/30 animate-pulse"
            >
              Cash Out ₨{potentialWin}
            </button>
          ) : (
            <div className="w-full py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-center">
              <p className="text-[10px] text-emerald-400">Bet Placed</p>
              <p className="text-sm font-bold text-emerald-400">₨{bet?.amount || 0}</p>
            </div>
          )}
        </div>
      )}

      {/* Min/Max */}
      <div className="flex justify-between text-[10px] text-gray-500">
        <span>Min: ₨6</span>
        <span>Max: ₨50,000</span>
      </div>
    </div>
  )
}

export default function AviatorPage() {
  const { user, isLoggedIn, refreshUser, formatBalance } = useAuth()
  const { isDark } = useTheme()
  const toast = useToast()

  // Game state
  const [gameState, setGameState] = useState(GAME_STATE.WAITING)
  const [multiplier, setMultiplier] = useState(1.00)
  const [recentCrashes, setRecentCrashes] = useState([
    1.23, 4.56, 2.10, 8.92, 1.45, 15.67, 3.21, 6.78, 2.34, 1.02, 9.45, 4.12, 1.89, 7.65, 2.45
  ])
  const [roundId, setRoundId] = useState(0)
  const [countdown, setCountdown] = useState(WAIT_TIME / 1000)

  // Dual bets - two separate bet panels
  const [bets, setBets] = useState([null, null])
  const [hasBets, setHasBets] = useState([false, false])

  // Live bets
  const [allBets, setAllBets] = useState([])

  // Canvas refs
  const canvasRef = useRef(null)
  const animationRef = useRef(null)
  const gameLoopRef = useRef(null)
  const planeRef = useRef({ x: 0, y: 0, trail: [] })
  const startTimeRef = useRef(0)
  const crashPointRef = useRef(0)

  const generateCrashPoint = useCallback(() => {
    const rand = Math.random()
    if (rand < 0.40) return 1.00 + Math.random() * 0.50
    if (rand < 0.65) return 1.50 + Math.random() * 1.00
    if (rand < 0.80) return 2.50 + Math.random() * 2.00
    if (rand < 0.92) return 4.50 + Math.random() * 5.50
    if (rand < 0.98) return 10.00 + Math.random() * 15.00
    return 25.00 + Math.random() * 25.00
  }, [])

  // Sync with backend on mount
  useEffect(() => {
    if (!API_URL) return
    
    // Fetch initial state from backend
    fetch(`${API_URL}/api/aviator/state`)
      .then(res => res.json())
      .then(state => {
        console.log('[Aviator] Backend state:', state)
        if (state.phase === 'betting') {
          setGameState(GAME_STATE.WAITING)
          setCountdown(state.countdown || 8)
          setMultiplier(1.00)
        } else if (state.phase === 'flying') {
          setGameState(GAME_STATE.RUNNING)
          setMultiplier(state.mult || 1.00)
          crashPointRef.current = state.crash_point || state.crashPoint || 0
        } else if (state.phase === 'crashed') {
          setGameState(GAME_STATE.CRASHED)
          setMultiplier(state.crash_point || 1.00)
        }
        if (state.roundId) setRoundId(state.roundId)
        if (state.crashHistory) {
          setRecentCrashes(state.crashHistory.map(h => parseFloat(h)).slice(0, 15))
        }
      })
      .catch(err => console.error('[Aviator] Failed to fetch:', err))

    // Connect to WebSocket for real-time updates
    aviatorWS.connect()
    
    const handleGameState = (state) => {
      if (state.phase === 'betting') {
        setGameState(GAME_STATE.WAITING)
        setCountdown(state.countdown || 8)
        setMultiplier(1.00)
      } else if (state.phase === 'flying') {
        setGameState(GAME_STATE.RUNNING)
        setMultiplier(state.mult || 1.00)
        crashPointRef.current = state.crash_point || state.crashPoint || 0
      } else if (state.phase === 'crashed') {
        setGameState(GAME_STATE.CRASHED)
        setMultiplier(state.crash_point || 1.00)
        setRecentCrashes(prev => [state.crash_point, ...prev].slice(0, 15))
      }
      if (state.roundId) setRoundId(state.roundId)
    }
    
    aviatorWS.on('game_state', handleGameState)
    aviatorWS.on('bets_update', (bets) => {
      setAllBets(bets || [])
    })
    
    return () => {}
  }, [])

  const startNewRound = useCallback(() => {
    setGameState(GAME_STATE.WAITING)
    setMultiplier(1.00)
    setHasBets([false, false])
    setBets([null, null])
    setAllBets([])
    setCountdown(WAIT_TIME / 1000)
    planeRef.current = { x: 0, y: 0, trail: [] }

    // Countdown timer
    let cd = WAIT_TIME / 1000
    const cdInterval = setInterval(() => {
      cd -= 1
      setCountdown(cd)
      if (cd <= 0) clearInterval(cdInterval)
    }, 1000)

    const timeout = setTimeout(() => {
      clearInterval(cdInterval)
      startGame()
    }, WAIT_TIME)

    return () => { clearTimeout(timeout); clearInterval(cdInterval) }
  }, [])

  const startGame = useCallback(() => {
    crashPointRef.current = generateCrashPoint()
    setGameState(GAME_STATE.RUNNING)
    startTimeRef.current = Date.now()
    setRoundId(prev => prev + 1)

    gameLoopRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000
      const mult = Math.min(100, Math.pow(Math.E, 0.06 * elapsed))

      setMultiplier(mult)

      if (mult >= crashPointRef.current) {
        crashGame()
      }

      // Auto cashout check for both bets
      setBets(prev => {
        const newBets = [...prev]
        for (let i = 0; i < 2; i++) {
          if (newBets[i] && newBets[i].status === 'placed' && newBets[i].autoCashoutAt) {
            if (mult >= parseFloat(newBets[i].autoCashoutAt)) {
              const winAmount = parseFloat(newBets[i].amount) * parseFloat(newBets[i].autoCashoutAt)
              newBets[i] = {
                ...newBets[i],
                status: 'cashed_out',
                wonAmount: winAmount,
                cashedOutAt: mult
              }
              if (user) {
                refreshUser()
              }
            }
          }
        }
        return newBets
      })
    }, TICK_INTERVAL)

    addBotBets()
  }, [generateCrashPoint, user, refreshUser])

  const crashGame = useCallback(() => {
    clearInterval(gameLoopRef.current)
    setGameState(GAME_STATE.CRASHED)

    const crashedAt = crashPointRef.current

    setBets(prev => {
      const newBets = [...prev]
      for (let i = 0; i < 2; i++) {
        if (newBets[i] && newBets[i].status === 'placed') {
          toast.error(`Crashed at ${crashedAt.toFixed(2)}x - Bet ${i+1} lost`)
        }
      }
      return newBets
    })

    setRecentCrashes(prev => [crashedAt, ...prev.slice(0, 14)])

    setTimeout(() => startNewRound(), 3000)
  }, [toast, startNewRound])

  const handlePlaceBet = useCallback((betIndex, amount, autoCashoutAt) => {
    if (!isLoggedIn) return

    const hasAnyBet = hasBets.some(h => h)
    if (hasAnyBet && hasBets[betIndex]) return

    if (amount < 6) {
      toast.error('Minimum bet is ₨6')
      return
    }

    if (amount > (user.balance || 0)) {
      toast.error('Insufficient balance')
      return
    }

    const newBets = [...bets]
    newBets[betIndex] = {
      amount: amount,
      autoCashoutAt: autoCashoutAt,
      status: 'placed',
      placedAt: Date.now()
    }
    setBets(newBets)

    const newHasBets = [...hasBets]
    newHasBets[betIndex] = true
    setHasBets(newHasBets)

    setAllBets(prev => [{
      id: Date.now(),
      username: 'You',
      amount: amount,
      autoCashout: autoCashoutAt,
      isUser: true,
      betIndex: betIndex
    }, ...prev])

    toast.success(`Bet ${betIndex+1}: ₨${amount} placed!`)
  }, [isLoggedIn, hasBets, bets, user, toast])

  const handleCashout = useCallback((betIndex, currentMultiplier) => {
    const bet = bets[betIndex]
    if (!bet || bet.status === 'cashed_out') return

    const winAmount = parseFloat(bet.amount) * currentMultiplier

    const newBets = [...bets]
    newBets[betIndex] = {
      ...bet,
      status: 'cashed_out',
      wonAmount: winAmount,
      cashedOutAt: currentMultiplier
    }
    setBets(newBets)

    if (user) refreshUser()
    toast.success(`Cashout ${currentMultiplier.toFixed(2)}x! Won ₨${winAmount.toFixed(2)}`)
  }, [bets, user, refreshUser, toast])

  const addBotBets = () => {
    const amounts = [6, 10, 20, 50, 100, 200, 500, 1000]
    const numBets = 3 + Math.floor(Math.random() * 6)
    const newBots = []

    for (let i = 0; i < numBets; i++) {
      newBots.push({
        id: Date.now() + i,
        username: BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)],
        amount: amounts[Math.floor(Math.random() * amounts.length)],
        autoCashout: Math.random() > 0.5 ? (1.1 + Math.random() * 3).toFixed(1) : null,
        isBot: true
      })
    }
    setAllBets(prev => [...prev, ...newBots])
  }

  // Initialize
  useEffect(() => {
    startNewRound()
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      if (gameLoopRef.current) clearInterval(gameLoopRef.current)
    }
  }, [])

  // Canvas animation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio
      canvas.height = canvas.offsetHeight * window.devicePixelRatio
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    let frameCount = 0

    const animate = () => {
      const width = canvas.offsetWidth
      const height = canvas.offsetHeight

      ctx.clearRect(0, 0, width, height)

      // Draw grid
      ctx.strokeStyle = 'rgba(255,255,255,0.03)'
      ctx.lineWidth = 1
      for (let i = 0; i < width; i += 50) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke()
      }
      for (let i = 0; i < height; i += 50) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(width, i); ctx.stroke()
      }

      if (gameState === GAME_STATE.RUNNING) {
        const progress = Math.min(0.95, Math.log(multiplier) / Math.log(50))
        const planeX = progress * width
        const curveY = height * 0.7 - (progress * height * 0.6)
        const planeY = Math.max(20, Math.min(height - 40, curveY))

        planeRef.current.trail.push({ x: planeX, y: planeY })
        if (planeRef.current.trail.length > 60) planeRef.current.trail.shift()

        // Draw gradient trail
        if (planeRef.current.trail.length > 1) {
          const gradient = ctx.createLinearGradient(
            planeRef.current.trail[0].x, planeRef.current.trail[0].y,
            planeX, planeY
          )
          gradient.addColorStop(0, 'rgba(16, 185, 129, 0.1)')
          gradient.addColorStop(1, 'rgba(16, 185, 129, 0.8)')
          ctx.strokeStyle = gradient
          ctx.lineWidth = 3
          ctx.beginPath()
          ctx.moveTo(planeRef.current.trail[0].x, planeRef.current.trail[0].y)
          planeRef.current.trail.forEach(p => ctx.lineTo(p.x, p.y))
          ctx.stroke()

          // Glow effect
          ctx.shadowColor = '#10b981'
          ctx.shadowBlur = 10
          ctx.strokeStyle = '#10b981'
          ctx.lineWidth = 1.5
          ctx.beginPath()
          ctx.moveTo(planeRef.current.trail[0].x, planeRef.current.trail[0].y)
          planeRef.current.trail.forEach(p => ctx.lineTo(p.x, p.y))
          ctx.stroke()
          ctx.shadowBlur = 0
        }

        // Draw plane
        ctx.save()
        ctx.translate(planeX, planeY)
        const scale = 1 + progress * 0.5
        ctx.scale(scale, scale)

        // Engine flame
        const flameSize = 8 + Math.sin(frameCount * 0.4) * 4
        const fGrad = ctx.createLinearGradient(-25, 0, -5, 0)
        fGrad.addColorStop(0, 'transparent')
        fGrad.addColorStop(0.5, '#f97316')
        fGrad.addColorStop(1, '#fbbf24')
        ctx.fillStyle = fGrad
        ctx.beginPath()
        ctx.moveTo(-5, 0)
        ctx.lineTo(-15 - flameSize, -6)
        ctx.lineTo(-22 - flameSize * 1.5, 0)
        ctx.lineTo(-15 - flameSize, 6)
        ctx.closePath()
        ctx.fill()

        // Plane body
        const bodyGrad = ctx.createLinearGradient(-10, -10, 20, 10)
        bodyGrad.addColorStop(0, '#059669')
        bodyGrad.addColorStop(1, '#10b981')
        ctx.fillStyle = bodyGrad
        ctx.beginPath()
        ctx.moveTo(22, 0)
        ctx.lineTo(-8, -10)
        ctx.lineTo(-4, 0)
        ctx.lineTo(-8, 10)
        ctx.closePath()
        ctx.fill()

        // Plane tip glow
        ctx.shadowColor = '#fbbf24'
        ctx.shadowBlur = 8
        ctx.fillStyle = '#fbbf24'
        ctx.beginPath()
        ctx.arc(20, 0, 3, 0, Math.PI * 2)
        ctx.fill()
        ctx.shadowBlur = 0

        ctx.restore()

        planeRef.current.x = planeX
        planeRef.current.y = planeY
        frameCount++
      }

      if (gameState === GAME_STATE.CRASHED) {
        const { x, y } = planeRef.current
        if (x > 0 && y > 0) {
          // Explosion
          for (let i = 0; i < 30; i++) {
            const angle = (i / 30) * Math.PI * 2
            const dist = 15 + Math.sin(frameCount * 0.15 + i) * 15
            const px = x + Math.cos(angle) * dist
            const py = y + Math.sin(angle) * dist
            const size = 2 + Math.random() * 3

            ctx.fillStyle = `rgba(239, 68, 68, ${0.9 - dist / 50})`
            ctx.beginPath()
            ctx.arc(px, py, size, 0, Math.PI * 2)
            ctx.fill()
          }

          // Red X
          ctx.strokeStyle = '#ef4444'
          ctx.lineWidth = 4
          ctx.shadowColor = '#ef4444'
          ctx.shadowBlur = 15
          ctx.beginPath()
          ctx.moveTo(x - 20, y - 20); ctx.lineTo(x + 20, y + 20)
          ctx.moveTo(x + 20, y - 20); ctx.lineTo(x - 20, y + 20)
          ctx.stroke()
          ctx.shadowBlur = 0

          frameCount++
        }
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  }, [gameState, multiplier])

  const getMultiplierColor = (mult) => {
    if (mult >= 10) return 'text-red-500'
    if (mult >= 5) return 'text-yellow-400'
    if (mult >= 2) return 'text-emerald-400'
    return 'text-white'
  }

  const getCrashPointColor = (point) => {
    if (point >= 10) return CRASH_COLORS.high
    if (point >= 2) return CRASH_COLORS.medium
    return CRASH_COLORS.low
  }

  const balance = user?.balance || 0

  return (
    <div className="min-h-screen bg-dark-400">
      <div className="max-w-7xl mx-auto px-2 py-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <span className="text-3xl">✈️</span>
            <div>
              <h1 className="text-lg font-bold text-white">Aviator</h1>
              <p className="text-[10px] text-gray-400">Crash Game • Bet & Cashout</p>
            </div>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30">
            <span className="text-[10px] text-emerald-400">Balance:</span>
            <span className="ml-1 font-bold text-emerald-400 text-sm">{formatBalance(balance)}</span>
          </div>
        </div>

        {/* Game Canvas Area */}
        <div className="relative rounded-xl overflow-hidden bg-dark-300 border border-dark-100 mb-3">
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <AnimatePresence mode="wait">
              {gameState === GAME_STATE.WAITING && (
                <motion.div
                  key="waiting"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="text-center"
                >
                  <p className="text-gray-400 text-xs mb-1">Next round in</p>
                  <p className="text-5xl font-bold text-emerald-400">{countdown}</p>
                </motion.div>
              )}

              {gameState === GAME_STATE.RUNNING && (
                <motion.div
                  key="running"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center"
                >
                  <motion.p
                    key={multiplier.toFixed(2)}
                    initial={{ scale: 1.1 }}
                    animate={{ scale: 1 }}
                    className={`text-6xl sm:text-8xl font-bold ${getMultiplierColor(multiplier)} drop-shadow-[0_0_30px_rgba(16,185,129,0.5)]`}
                  >
                    {multiplier.toFixed(2)}x
                  </motion.p>
                </motion.div>
              )}

              {gameState === GAME_STATE.CRASHED && (
                <motion.div
                  key="crashed"
                  initial={{ scale: 0.5, opacity: 0, rotate: -10 }}
                  animate={{ scale: 1, opacity: 1, rotate: 0 }}
                  className="text-center"
                >
                  <p className="text-red-500 text-lg mb-2 font-bold">CRASHED</p>
                  <p className="text-5xl font-bold text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.5)]">
                    {recentCrashes[0]?.toFixed(2)}x
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <canvas
            ref={canvasRef}
            className="w-full h-48 sm:h-64 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
          />
        </div>

        {/* Recent Crashes */}
        <div className="bg-dark-300/50 border border-dark-100 rounded-xl p-2 mb-3">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {recentCrashes.map((point, i) => (
              <div
                key={`${point}-${i}`}
                className={`flex-shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold ${getCrashPointColor(point)}`}
              >
                {point.toFixed(2)}x
              </div>
            ))}
          </div>
        </div>

        {/* Dual Bet Panels + Live Bets */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Bet Panels */}
          <div className="flex-1 flex gap-3">
            {!isLoggedIn ? (
              <div className="flex-1 text-center py-6 bg-dark-300/50 rounded-xl border border-dark-100">
                <p className="text-gray-400 text-sm mb-2">Please login to play</p>
                <a href="/login" className="px-6 py-2 bg-emerald-500 text-white rounded-lg font-medium text-sm">
                  Login
                </a>
              </div>
            ) : (
              <>
                <BetPanel
                  bet={bets[0]}
                  betIndex={0}
                  gameState={gameState}
                  multiplier={multiplier}
                  hasBet={hasBets[0]}
                  balance={balance}
                  onPlaceBet={handlePlaceBet}
                  onCashout={handleCashout}
                />
                <BetPanel
                  bet={bets[1]}
                  betIndex={1}
                  gameState={gameState}
                  multiplier={multiplier}
                  hasBet={hasBets[1]}
                  balance={balance}
                  onPlaceBet={handlePlaceBet}
                  onCashout={handleCashout}
                />
              </>
            )}
          </div>

          {/* Live Bets Feed */}
          <div className="sm:w-64 bg-dark-300/50 border border-dark-100 rounded-xl overflow-hidden">
            <div className="p-2 border-b border-dark-100">
              <h3 className="font-semibold text-white text-xs">Live Bets</h3>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {allBets.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-xs">
                  No bets yet
                </div>
              ) : (
                <div className="divide-y divide-dark-100">
                  {allBets.slice(0, 20).map((bet) => (
                    <div
                      key={bet.id}
                      className={`flex items-center justify-between px-2.5 py-1.5 ${bet.isUser ? 'bg-emerald-500/10' : ''}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${bet.isUser ? 'text-emerald-400' : 'text-gray-300'}`}>
                          {bet.isUser ? `You (Bet ${bet.betIndex + 1})` : bet.username}
                        </p>
                        <p className="text-[10px] text-gray-500">₨{bet.amount}</p>
                      </div>
                      <div className="text-right">
                        {bet.autoCashout ? (
                          <span className="text-[10px] text-yellow-400">@ {bet.autoCashout}x</span>
                        ) : (
                          <span className="text-[10px] text-gray-400">Manual</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
