/**
 * AviatorGame.jsx — Professional Autonomous Aviator Crash Game
 *
 * Design Reference: Spribe Aviator
 * - Dark navy theme with neon green/red accents
 * - Small red plane flying across graph
 * - Glass morphism bet panels
 * - Professional gaming aesthetic
 *
 * Hybrid Mode:
 * - The game runs client-side with its own game loop
 * - Connects to backend WebSocket for admin control when available
 * - Falls back gracefully if backend is not available
 * - Admin can control crash, settings via WebSocket
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { ChevronLeft } from 'lucide-react'
import { supabaseAnon } from '../../lib/supabase'
import {
  subscribeToGameBroadcast,
  subscribeToRoundBroadcast,
  unsubscribe,
  getRecentCrashes,
  getUserBetHistory,
  placeBet as apiPlaceBet,
  cashoutBet as apiCashoutBet,
  generateCrashPoint,
  generateBotBetAmount,
  generateBotAutoCashout,
  getRandomBotName,
  getManualCrash,
  clearManualCrash,
  getGameSettingsLocal,
  broadcastLiveHE,
  updateHouseEdgePool,
  broadcastGameState,
  getSettingsFromDB,
  checkManualCrash,
  broadcastLiveHEMetrics,
} from '../../api/aviator'

// WebSocket URL for admin control (optional)
const WS_URL = import.meta.env.VITE_WS_URL || 'wss://8769bet-backend.onrender.com/ws/aviator'

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Exo+2:wght@400;500;600;700;800;900&display=swap');

  * { box-sizing: border-box; }

  .av-root {
    --bg-primary: #0c1220;
    --bg-secondary: #0f1929;
    --bg-panel: rgba(15,25,41,0.88);
    --border: rgba(255,255,255,0.06);
    --border-active: rgba(255,255,255,0.12);
    --green: #00e887;
    --green-dim: rgba(0,232,135,0.15);
    --green-border: rgba(0,232,135,0.3);
    --red: #ff4d4d;
    --red-dim: rgba(255,77,77,0.15);
    --yellow: #ffd600;
    --text: #ffffff;
    --text-sec: rgba(255,255,255,0.5);
    font-family: 'Inter','Exo 2',-apple-system,BlinkMacSystemFont,sans-serif;
  }

  /* Loading */
  .av-loading {
    position:fixed;inset:0;z-index:200;
    background:var(--bg-primary);
    display:flex;flex-direction:column;align-items:center;justify-content:center;
  }
  .av-loading-icon {
    width:72px;height:72px;border-radius:18px;
    background:linear-gradient(135deg,#ff4d4d,#ff8c00);
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 0 50px rgba(255,77,77,0.4);margin-bottom:28px;
  }
  .av-loading-title {
    font-family:'Exo 2',sans-serif;font-size:38px;font-weight:900;
    color:var(--text);letter-spacing:.15em;text-transform:uppercase;margin:0 0 6px;
  }
  .av-loading-sub {
    font-size:11px;color:rgba(255,255,255,.28);letter-spacing:.3em;
    text-transform:uppercase;margin:0 0 36px;
  }
  .av-bar-wrap {width:260px;margin-bottom:28px;}
  .av-bar-track {width:100%;height:3px;background:rgba(255,255,255,.1);border-radius:3px;overflow:hidden;}
  .av-bar-fill {
    height:100%;border-radius:3px;
    background:linear-gradient(90deg,var(--green),#00d4aa);
    box-shadow:0 0 10px rgba(0,232,135,.5);
    transition:width .08s linear;
  }

  /* Header */
  .av-header {
    display:flex;align-items:center;justify-content:space-between;
    padding:9px 14px;
    background:var(--bg-secondary);
    border-bottom:1px solid var(--border);
    z-index:10;flex-shrink:0;
  }
  .av-header-left{display:flex;align-items:center;gap:10px;}
  .av-back{
    width:30px;height:30px;border-radius:7px;
    background:rgba(255,255,255,.04);border:none;
    display:flex;align-items:center;justify-content:center;
    cursor:pointer;color:rgba(255,255,255,.45);
    transition:background .12s;
  }
  .av-back:hover{background:rgba(255,255,255,.09);color:#fff}
  .av-logo{display:flex;align-items:center;gap:8px;}
  .av-logo-icon{
    width:26px;height:26px;border-radius:7px;
    background:linear-gradient(135deg,#ff4d4d,#ff8c00);
    display:flex;align-items:center;justify-content:center;font-size:13px;
  }
  .av-logo-text{
    font-family:'Exo 2',sans-serif;font-size:12px;font-weight:800;
    color:var(--text);letter-spacing:.15em;text-transform:uppercase;
  }
  .av-live-dot{
    width:5px;height:5px;border-radius:50%;
    background:var(--green);box-shadow:0 0 7px var(--green);
    animation:avPulse 1.4s infinite;
  }
  @keyframes avPulse{0%,100%{opacity:1}50%{opacity:.35}}
  .av-bal{
    display:flex;align-items:center;gap:7px;
    padding:5px 12px;border-radius:9px;
    background:var(--green-dim);border:1px solid var(--green-border);
  }
  .av-bal-label{font-size:9px;font-weight:700;color:var(--green);opacity:.65;text-transform:uppercase;letter-spacing:.04em}
  .av-bal-amt{font-family:'Exo 2',sans-serif;font-size:14px;font-weight:800;color:var(--green)}
  .av-leader-badge{
    display:inline-flex;align-items:center;gap:4px;
    padding:2px 7px;border-radius:5px;
    background:rgba(0,232,135,.12);border:1px solid rgba(0,232,135,.25);
    font-size:8px;font-weight:700;color:var(--green);text-transform:uppercase;letter-spacing:.06em;
  }

  /* History */
  .av-history{
    display:flex;align-items:center;gap:5px;
    padding:7px 14px;
    background:var(--bg-secondary);
    border-bottom:1px solid var(--border);
    overflow-x:auto;white-space:nowrap;flex-shrink:0;
    scrollbar-width:none;
  }
  .av-history::-webkit-scrollbar{display:none}
  .av-pill{
    flex-shrink:0;padding:3px 9px;border-radius:5px;
    font-size:11px;font-weight:700;border:1px solid;
  }
  .av-pill-low{color:#5bc8f5;background:rgba(91,200,245,.1);border-color:rgba(91,200,245,.2)}
  .av-pill-mid{color:#a855f7;background:rgba(168,85,247,.1);border-color:rgba(168,85,247,.2)}
  .av-pill-high{color:#ff4d4d;background:rgba(255,77,77,.1);border-color:rgba(255,77,77,.2)}

  /* Main layout */
  .av-main{display:flex;flex-direction:column;flex:1;overflow:hidden;min-height:0}
  .av-top-row{display:flex;flex:1;overflow:hidden;min-height:0}
  .av-bets-row{display:flex;overflow:hidden;flex-shrink:0}

  /* Betting history */
  .av-my-history{
    flex-shrink:0;display:flex;align-items:center;gap:0;
    padding:0;
    background:var(--bg-secondary);
    border-top:1px solid var(--border);
    overflow-x:auto;white-space:nowrap;max-height:48px;
    scrollbar-width:none;
  }
  .av-my-history::-webkit-scrollbar{display:none}
  .av-my-history-title{
    font-size:8px;font-weight:700;color:rgba(255,255,255,.25);
    text-transform:uppercase;letter-spacing:.1em;flex-shrink:0;
    padding:0 10px;display:flex;align-items:center;height:100%;
    border-right:1px solid var(--border);
  }
  .av-my-h-item{
    flex-shrink:0;display:inline-flex;align-items:center;gap:5px;
    padding:5px 10px;
    font-size:9px;font-weight:600;
    border-right:1px solid rgba(255,255,255,.03);
    transition:background .1s;
  }
  .av-my-h-item.won{color:var(--green);background:var(--green-dim)}
  .av-my-h-item.lost{color:var(--red);background:var(--red-dim)}
  .av-my-h-item.pending{color:var(--yellow);background:rgba(255,214,0,.06)}
  .av-my-h-time{font-size:7px;color:rgba(255,255,255,.25);font-weight:500}
  .av-my-h-amt{font-weight:800;font-size:10px}
  .av-my-h-mult{font-weight:800;font-size:9px}
  .av-my-h-profit{font-weight:800;font-size:9px}

  /* Bet panels */
  .av-panel{
    flex:1;display:flex;flex-direction:column;gap:7px;
    padding:12px 14px;
    background:var(--bg-panel);
    border-top:1px solid var(--border);
  }
  .av-panel:first-child{border-right:1px solid var(--border)}
  .av-input-row{display:flex;gap:6px;align-items:center}
  .av-bet-input{
    flex:1;background:rgba(255,255,255,.06);border:1px solid var(--border);
    border-radius:10px;padding:10px 12px;color:var(--text);font-size:14px;
    font-weight:700;font-family:'Exo 2',sans-serif;
    transition:border-color .12s,box-shadow .12s;
  }
  .av-bet-input:focus{outline:none;border-color:var(--green-border);box-shadow:0 0 0 2px rgba(0,232,135,.15)}
  .av-bet-input:disabled{opacity:.5;cursor:not-allowed}
  .av-btn-bet{
    padding:10px 16px;border-radius:10px;border:none;
    font-family:'Exo 2',sans-serif;font-size:14px;font-weight:800;
    cursor:pointer;text-transform:uppercase;letter-spacing:.04em;
    transition:all .15s;min-width:100px;text-align:center;
  }
  .av-btn-bet.bet{
    background:linear-gradient(135deg,var(--green),#00d4aa);color:#000;
    box-shadow:0 0 20px rgba(0,232,135,.3);
  }
  .av-btn-bet.bet:hover{box-shadow:0 0 30px rgba(0,232,135,.5);transform:scale(1.02)}
  .av-btn-bet.bet:disabled{opacity:.5;cursor:not-allowed;transform:none}
  .av-btn-bet.cashout{
    background:linear-gradient(135deg,var(--yellow),#ffb300);color:#000;
    box-shadow:0 0 20px rgba(255,214,0,.3);
    animation:pulse-cashout 1s infinite;
  }
  @keyframes pulse-cashout{
    0%,100%{box-shadow:0 0 20px rgba(255,214,0,.3)}
    50%{box-shadow:0 0 40px rgba(255,214,0,.6)}
  }
  .av-btn-bet.waiting{
    background:rgba(255,255,255,.1);color:var(--text-sec);cursor:default;
  }
  .av-quick-row{display:flex;gap:4px;margin-top:4px}
  .av-quick-btn{
    flex:1;padding:6px;border-radius:8px;
    background:rgba(255,255,255,.04);border:1px solid var(--border);
    color:var(--text-sec);font-size:11px;font-weight:600;cursor:pointer;
    transition:all .12s;
  }
  .av-quick-btn:hover{background:rgba(255,255,255,.08);color:var(--text)}
  .av-quick-btn:disabled{opacity:.4;cursor:not-allowed}
  .av-auto-row{display:flex;align-items:center;gap:6px;margin-top:4px}
  .av-auto-check{
    width:16px;height:16px;accent-color:var(--green);cursor:pointer;
  }
  .av-auto-label{font-size:11px;color:var(--text-sec)}
  .av-auto-input{
    flex:1;background:rgba(255,255,255,.06);border:1px solid var(--border);
    border-radius:8px;padding:6px 10px;color:var(--text);font-size:12px;font-weight:600;
  }
  .av-auto-input:focus{outline:none;border-color:var(--green-border)}
  .av-auto-input:disabled{opacity:.5;cursor:not-allowed}

  /* Canvas */
  .av-canvas-wrap{
    flex:1;position:relative;overflow:hidden;
    background:var(--bg-primary);min-height:0;
  }
  .av-canvas{position:absolute;inset:0;width:100%;height:100%;z-index:1}
  .av-bg-canvas{position:absolute;inset:0;width:100%;height:100%;z-index:0}

  /* Overlay */
  .av-overlay{
    position:absolute;inset:0;z-index:10;
    display:flex;flex-direction:column;align-items:center;justify-content:center;
    pointer-events:none;
  }
  .av-mult{
    font-family:'Exo 2',sans-serif;font-weight:900;
    text-shadow:0 0 30px currentColor;
  }
  .av-mult.running{color:#00e887;font-size:24px}
  .av-mult.crashed{color:#ff4d4d;font-size:24px}
  .av-mult.betting{color:#00e887;font-size:56px}
  .av-countdown-label{
    font-size:13px;color:rgba(255,255,255,.4);margin-top:8px;
  }
  .av-crashed-sub{
    font-size:13px;color:rgba(255,255,255,.5);margin-top:8px;
  }

  /* Live bets */
  .av-live-bets{
    position:absolute;top:0;right:0;bottom:0;width:200px;
    background:rgba(15,25,41,.95);
    border-left:1px solid var(--border);
    overflow-y:auto;z-index:5;
    scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.1) transparent;
  }
  .av-live-bets::-webkit-scrollbar{width:4px}
  .av-live-bets::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px}
  .av-live-bets-title{
    font-size:10px;font-weight:700;color:rgba(255,255,255,.35);
    text-transform:uppercase;letter-spacing:.08em;
    padding:8px 10px;border-bottom:1px solid var(--border);
    position:sticky;top:0;background:rgba(15,25,41,.98);z-index:1;
  }
  .av-live-bet{
    display:flex;justify-content:space-between;align-items:center;
    padding:4px 10px;font-size:10px;
    border-bottom:1px solid rgba(255,255,255,.03);
  }
  .av-live-bet-user{color:rgba(255,255,255,.5);font-weight:500}
  .av-live-bet-amt{color:var(--text);font-weight:700}
  .av-live-bet-won{color:var(--green);font-weight:800}
`

function LoadingScreen({ progress }) {
  return (
    <div className="av-loading">
      <div className="av-loading-icon">✈</div>
      <div className="av-loading-title">Aviator</div>
      <div className="av-loading-sub">Loading game...</div>
      <div className="av-bar-wrap">
        <div className="av-bar-track">
          <div className="av-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  )
}

export default function AviatorGame() {
  const navigate = useNavigate()
  const { user, isLoggedIn, updateBalance } = useAuth()
  const toast = useToast()
  const canvasRef = useRef(null)
  const bgCanvasRef = useRef(null)
  const imgRef = useRef(null)
  const planeImgLoaded = useRef(false)
  const animRef = useRef(null)
  const resizeRef = useRef(null)

  // Game state
  const [phase, setPhase] = useState('betting') // 'betting' | 'running' | 'crashed'
  const [mult, setMult] = useState(1.00)
  const [countdown, setCountdown] = useState(8)
  const [crashPoint, setCrashPoint] = useState(0)
  const [crashedAt, setCrashedAt] = useState(null)
  const [crashHistory, setCrashHistory] = useState([])
  const [myHistory, setMyHistory] = useState([])
  const [showLoading, setShowLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [isLeader, setIsLeader] = useState(false)
  const [wsConnected, setWsConnected] = useState(false)

  // Refs for game loop
  const phaseRef = useRef('betting')
  const multRef = useRef(1.00)
  const crashPointRef = useRef(0)
  const startTimeRef = useRef(0)
  const planeX = useRef(0)
  const planeY = useRef(0)
  const frameCount = useRef(0)

  // Bet state
  const [bet1Amount, setBet1Amount] = useState(10)
  const [bet2Amount, setBet2Amount] = useState(10)
  const [bet1Placed, setBet1Placed] = useState(false)
  const [bet2Placed, setBet2Placed] = useState(false)
  const [bet1Cashed, setBet1Cashed] = useState(false)
  const [bet2Cashed, setBet2Cashed] = useState(false)
  const [bet1Auto, setBet1Auto] = useState(false)
  const [bet2Auto, setBet2Auto] = useState(false)
  const [bet1AutoAt, setBet1AutoAt] = useState(2.0)
  const [bet2AutoAt, setBet2AutoAt] = useState(2.0)

  // WebSocket connection for admin control (optional)
  const wsRef = useRef(null)
  useEffect(() => {
    let reconnectTimer = null
    const connect = () => {
      try {
        const ws = new WebSocket(WS_URL)
        ws.onopen = () => {
          console.log('[Aviator] Connected to admin WebSocket')
          setWsConnected(true)
        }
        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data)
            if (msg.type === 'manual_crash') {
              // Admin triggered manual crash
              if (phaseRef.current === 'running') {
                crashRound(multRef.current, 'manual')
              }
            }
            if (msg.type === 'update_settings') {
              // Admin updated settings
              // Settings are stored in localStorage, game will pick them up
            }
          } catch (e) {
            console.warn('[Aviator] Invalid WS message:', e)
          }
        }
        ws.onclose = () => {
          console.log('[Aviator] Disconnected from admin WebSocket')
          setWsConnected(false)
          reconnectTimer = setTimeout(connect, 5000)
        }
        ws.onerror = () => {
          console.log('[Aviator] WebSocket error, using local game loop')
          ws.close()
        }
        wsRef.current = ws
      } catch (e) {
        console.log('[Aviator] WebSocket not available, using local game loop')
      }
    }
    connect()
    return () => {
      if (wsRef.current) wsRef.current.close()
      if (reconnectTimer) clearTimeout(reconnectTimer)
    }
  }, [])

  // ── Game Engine ────────────────────────────────────────────
  const startNewRound = useCallback(() => {
    const settings = getGameSettingsLocal() || {}
    const he = settings.houseEdge || 0.05
    const crashPt = generateCrashPoint(he)
    crashPointRef.current = crashPt
    phaseRef.current = 'betting'
    multRef.current = 1.00
    startTimeRef.current = Date.now()
    setPhase('betting')
    setMult(1.00)
    setCrashPoint(crashPt)
    setCrashedAt(null)
    setCountdown(8)
    setBet1Placed(false)
    setBet2Placed(false)
    setBet1Cashed(false)
    setBet2Cashed(false)

    // Notify admin via WebSocket
    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify({
        type: 'new_round',
        roundId: `r_${Date.now()}`,
      }))
    }
  }, [])

  const startFlying = useCallback(() => {
    phaseRef.current = 'running'
    multRef.current = 1.00
    startTimeRef.current = Date.now()
    setPhase('running')
    setMult(1.00)
  }, [])

  const crashRound = useCallback((crashPt, reason = 'natural') => {
    phaseRef.current = 'crashed'
    crashPointRef.current = crashPt
    setPhase('crashed')
    setCrashedAt(crashPt)
    setCrashHistory(prev => [crashPt, ...prev].slice(0, 20))

    // Process losing bets
    if (bet1Placed && !bet1Cashed) {
      setMyHistory(prev => [{ amount: bet1Amount, mult: crashPt, won: false, profit: 0, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 15))
    }
    if (bet2Placed && !bet2Cashed) {
      setMyHistory(prev => [{ amount: bet2Amount, mult: crashPt, won: false, profit: 0, time: new Date().toLocaleTimeString() }, ...prev].slice(0, 15))
    }

    // Start new round after delay
    setTimeout(() => startNewRound(), 3000)
  }, [bet1Placed, bet1Cashed, bet1Amount, bet2Placed, bet2Cashed, bet2Amount, startNewRound])

  // Betting countdown
  useEffect(() => {
    if (phase !== 'betting') return
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 0.1) {
          startFlying()
          return 0
        }
        return prev - 0.1
      })
    }, 100)
    return () => clearInterval(interval)
  }, [phase, startFlying])

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    // Background canvas
    let bgCanvas = bgCanvasRef.current
    if (!bgCanvas) {
      bgCanvas = document.createElement('canvas')
      bgCanvasRef.current = bgCanvas
    }

    // Build background
    const buildBg = (W, H) => {
      bgCanvas.width = W
      bgCanvas.height = H
      const bgCtx = bgCanvas.getContext('2d')
      bgCtx.fillStyle = '#0c1220'
      bgCtx.fillRect(0, 0, W, H)

      // Grid
      bgCtx.strokeStyle = 'rgba(255,255,255,0.04)'
      bgCtx.lineWidth = 0.5
      for (let i = 0; i < 10; i++) {
        bgCtx.beginPath()
        bgCtx.moveTo(0, (H / 10) * i)
        bgCtx.lineTo(W, (H / 10) * i)
        bgCtx.stroke()
        bgCtx.beginPath()
        bgCtx.moveTo((W / 10) * i, 0)
        bgCtx.lineTo((W / 10) * i, H)
        bgCtx.stroke()
      }
      return bgCanvas
    }

    // Load plane image
    const img = imgRef.current || new Image()
    if (!imgRef.current) {
      imgRef.current = img
      img.onload = () => { planeImgLoaded.current = true }
      img.onerror = () => { planeImgLoaded.current = false }
      img.src = '/img/plane.png'
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * 2
      canvas.height = rect.height * 2
      ctx.scale(2, 2)
      bgCanvas = buildBg(rect.width, rect.height)
    }
    window.addEventListener('resize', resize)
    resize()

    let frameCount = 0
    const draw = () => {
      frameCount++
      const currentPhase = phaseRef.current
      const currentMult = multRef.current

      if (!bgCanvas) {
        animRef.current = requestAnimationFrame(draw)
        return
      }

      ctx.clearRect(0, 0, canvas.width / 2, canvas.height / 2)
      ctx.drawImage(bgCanvas, 0, 0)

      if (currentPhase === 'running' && currentMult > 1) {
        const originX = 5
        const originY = (canvas.height / 2) * 0.90
        const maxTravelX = Math.max(canvas.width / 2 - 220, (canvas.width / 2) * 0.65)
        const maxTravelY = (canvas.height / 2) * 0.78
        const progress = Math.min(1, Math.log(currentMult) / Math.log(50))
        const eased = Math.pow(progress, 0.6)
        const nx = originX + eased * maxTravelX
        const ny = originY - eased * maxTravelY
        const endX = nx - 15
        const endY = ny + 5
        const cpx = (originX + endX) * 0.5
        const cpy = originY - (originY - endY) * 0.08

        ctx.strokeStyle = 'rgba(0,255,157,0.18)'
        ctx.lineWidth = 10
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(originX, originY)
        ctx.quadraticCurveTo(cpx, cpy, endX, endY)
        ctx.stroke()

        ctx.strokeStyle = '#00ff9d'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(originX, originY)
        ctx.quadraticCurveTo(cpx, cpy, endX, endY)
        ctx.stroke()

        planeX.current = nx
        planeY.current = ny

        if (planeImgLoaded.current) ctx.drawImage(img, nx - 50, ny - 32, 100, 64)

        const displayMult = currentMult * 1.5
        ctx.fillStyle = displayMult >= 10 ? '#ff4d4d' : displayMult >= 5 ? '#ffd600' : '#00e887'
        ctx.font = 'bold 24px sans-serif'
        ctx.fillText(`${displayMult.toFixed(2)}x`, nx + 10, ny + 8)
      }

      if (currentPhase === 'crashed' && planeX.current > 0) {
        for (let i = 0; i < 15; i++) {
          const ag = (i / 15) * Math.PI * 2
          const di = 14 + Math.sin(frameCount * 0.4 + i) * 12
          ctx.fillStyle = ['#dc2626', '#f97316', '#fde047'][i % 3]
          ctx.globalAlpha = 0.35 + Math.sin(frameCount * 0.4 + i) * 0.2
          ctx.beginPath()
          ctx.arc(planeX.current + Math.cos(ag) * di, planeY.current + Math.sin(ag) * di, 2, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1
      }

      if (currentPhase !== 'running') {
        if (planeX.current !== 0) { planeX.current = 0; planeY.current = 0; frameCount = 0 }
        bgCanvas = buildBg(canvas.width / 2, canvas.height / 2)
      }

      animRef.current = requestAnimationFrame(draw)
    }

    let raf = requestAnimationFrame(draw)
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(raf)
    }
  }, [showLoading])

  // Game multiplier update
  useEffect(() => {
    if (phase !== 'running') return
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000
      const m = Math.pow(Math.E, 0.06 * elapsed)

      // Check for manual crash from admin
      if (getManualCrash()) {
        clearManualCrash()
        crashRound(m, 'manual')
        return
      }

      // Check auto cashout
      if (bet1Placed && !bet1Cashed && bet1Auto && m >= bet1AutoAt) {
        handleCashout(1, m)
      }
      if (bet2Placed && !bet2Cashed && bet2Auto && m >= bet2AutoAt) {
        handleCashout(2, m)
      }

      // Check crash
      if (m >= crashPointRef.current) {
        crashRound(crashPointRef.current, 'natural')
        return
      }

      multRef.current = m
      setMult(m)
    }, 33)
    return () => clearInterval(interval)
  }, [phase, bet1Placed, bet1Cashed, bet1Auto, bet1AutoAt, bet2Placed, bet2Cashed, bet2Auto, bet2AutoAt, crashRound])

  // Loading
  useEffect(() => {
    const timer = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer)
          setShowLoading(false)
          return 100
        }
        return prev + 2
      })
    }, 30)
    return () => clearInterval(timer)
  }, [])

  // Load crash history
  useEffect(() => {
    getRecentCrashes(20).then(setCrashHistory)
  }, [])

  // Load my history
  useEffect(() => {
    if (isLoggedIn && user?.id) {
      getUserBetHistory(user.id, 15).then(setMyHistory)
    }
  }, [isLoggedIn, user?.id])

  // Bet functions
  const handleBet = async (betNum) => {
    if (!isLoggedIn) return toast.error('Please login to play')
    if (phase !== 'betting') return toast.error('Wait for next round')

    const amount = betNum === 1 ? bet1Amount : bet2Amount
    if (amount < 10) return toast.error('Minimum bet is PKR 10')
    if (amount > (user?.balance || 0)) return toast.error('Insufficient balance')

    const autoCashout = (betNum === 1 && bet1Auto) ? bet1AutoAt : (betNum === 2 && bet2Auto) ? bet2AutoAt : null

    const result = await apiPlaceBet({
      roundId: `local_${Date.now()}`,
      userId: user.id,
      username: user.username,
      amount,
      autoCashoutAt: autoCashout,
      isBot: false,
    })

    if (result) {
      if (betNum === 1) setBet1Placed(true)
      else setBet2Placed(true)
      updateBalance((user.balance || 0) - amount)
      toast.success(`Bet placed: PKR ${amount}`)
    }
  }

  const handleCashout = async (betNum, currentMult) => {
    if (phase !== 'running') return
    if (betNum === 1 && !bet1Placed) return
    if (betNum === 2 && !bet2Placed) return
    if (betNum === 1 && bet1Cashed) return
    if (betNum === 2 && bet2Cashed) return

    const betId = betNum === 1 ? 'bet1' : 'bet2'
    const result = await apiCashoutBet(betId, currentMult || multRef.current)

    if (result) {
      if (betNum === 1) setBet1Cashed(true)
      else setBet2Cashed(true)
      updateBalance((user?.balance || 0) + result.winAmount)
      toast.success(`Cashed out: PKR ${result.winAmount}`)
      setMyHistory(prev => [{
        amount: betNum === 1 ? bet1Amount : bet2Amount,
        mult: result.multiplier,
        won: true,
        profit: result.winAmount,
        time: new Date().toLocaleTimeString(),
      }, ...prev].slice(0, 15))
    }
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="av-root" style={{ width: '100%', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {showLoading && <LoadingScreen progress={loadingProgress} />}

        {!showLoading && (
          <>
            <div className="av-header">
              <div className="av-header-left">
                <button className="av-back" onClick={() => navigate(-1)}>
                  <ChevronLeft size={15} />
                </button>
                <div className="av-logo">
                  <div className="av-logo-icon">✈</div>
                  <span className="av-logo-text">Aviator</span>
                  <div className="av-live-dot" />
                </div>
              </div>
              {isLoggedIn && (
                <div className="av-bal">
                  <span className="av-bal-label">Balance</span>
                  <span className="av-bal-amt">₨{(user?.balance || 0).toLocaleString()}</span>
                </div>
              )}
            </div>

            <div className="av-history">
              {crashHistory.map((cp, i) => (
                <span key={i} className={`av-pill ${cp >= 10 ? 'av-pill-high' : cp >= 2 ? 'av-pill-mid' : 'av-pill-low'}`}>
                  {(cp * 1.5).toFixed(2)}x
                </span>
              ))}
            </div>

            <div className="av-main">
              <div className="av-top-row">
                <div className="av-canvas-wrap">
                  <canvas ref={bgCanvasRef} className="av-bg-canvas" />
                  <canvas ref={canvasRef} className="av-canvas" />
                  <div className="av-overlay">
                    {phase === 'betting' && (
                      <>
                        <div className="av-mult betting">{countdown.toFixed(1)}</div>
                        <div className="av-countdown-label">Place your bets</div>
                      </>
                    )}
                    {phase === 'crashed' && crashedAt && (
                      <>
                        <div className="av-mult crashed">{(crashedAt * 1.5).toFixed(2)}x</div>
                        <div className="av-crashed-sub">Flew away!</div>
                      </>
                    )}
                  </div>
                  {/* Live bets panel */}
                  <div className="av-live-bets">
                    <div className="av-live-bets-title">Live Bets</div>
                    {/* This would be populated with live bets from WebSocket */}
                  </div>
                </div>
              </div>

              {/* My bet history */}
              <div className="av-my-history">
                <div className="av-my-history-title">My Bets</div>
                {myHistory.map((h, i) => (
                  <div key={i} className={`av-my-h-item ${h.won ? 'won' : h.won === false ? 'lost' : 'pending'}`}>
                    <span className="av-my-h-time">{h.time}</span>
                    <span className="av-my-h-amt">₨{h.amount}</span>
                    <span className="av-my-h-mult">{h.mult.toFixed(2)}x</span>
                    {h.won && <span className="av-my-h-profit">+₨{h.profit}</span>}
                    {h.won === false && <span className="av-my-h-profit">-₨{h.amount}</span>}
                  </div>
                ))}
              </div>

              {/* Bet panels */}
              <div className="av-bets-row">
                {/* Bet 1 */}
                <div className="av-panel">
                  <div className="av-input-row">
                    <input
                      type="number"
                      className="av-bet-input"
                      value={bet1Amount}
                      onChange={e => setBet1Amount(Math.max(10, Number(e.target.value)))}
                      disabled={bet1Placed || phase !== 'betting'}
                      min="10"
                    />
                    <button
                      className={`av-btn-bet ${bet1Cashed ? 'waiting' : bet1Placed && phase === 'running' ? 'cashout' : bet1Placed ? 'waiting' : phase === 'betting' ? 'bet' : 'waiting'}`}
                      onClick={() => {
                        if (bet1Cashed) return
                        if (bet1Placed && phase === 'running') handleCashout(1)
                        else if (!bet1Placed && phase === 'betting') handleBet(1)
                      }}
                      disabled={!isLoggedIn}
                    >
                      {bet1Cashed ? 'Cashed' : bet1Placed && phase === 'running' ? `Cash Out ${(mult * 1.5).toFixed(2)}x` : bet1Placed ? 'Waiting...' : 'BET'}
                    </button>
                  </div>
                  <div className="av-quick-row">
                    {[10, 50, 100, 500].map(amt => (
                      <button key={amt} className="av-quick-btn" onClick={() => setBet1Amount(amt)} disabled={bet1Placed}>
                        {amt}
                      </button>
                    ))}
                  </div>
                  <div className="av-auto-row">
                    <input type="checkbox" className="av-auto-check" checked={bet1Auto} onChange={e => setBet1Auto(e.target.checked)} />
                    <span className="av-auto-label">Auto</span>
                    <input type="number" className="av-auto-input" value={bet1AutoAt} onChange={e => setBet1AutoAt(Math.max(1.1, Number(e.target.value)))} step="0.1" min="1.1" disabled={!bet1Auto} />
                  </div>
                </div>

                {/* Bet 2 */}
                <div className="av-panel">
                  <div className="av-input-row">
                    <input
                      type="number"
                      className="av-bet-input"
                      value={bet2Amount}
                      onChange={e => setBet2Amount(Math.max(10, Number(e.target.value)))}
                      disabled={bet2Placed || phase !== 'betting'}
                      min="10"
                    />
                    <button
                      className={`av-btn-bet ${bet2Cashed ? 'waiting' : bet2Placed && phase === 'running' ? 'cashout' : bet2Placed ? 'waiting' : phase === 'betting' ? 'bet' : 'waiting'}`}
                      onClick={() => {
                        if (bet2Cashed) return
                        if (bet2Placed && phase === 'running') handleCashout(2)
                        else if (!bet2Placed && phase === 'betting') handleBet(2)
                      }}
                      disabled={!isLoggedIn}
                    >
                      {bet2Cashed ? 'Cashed' : bet2Placed && phase === 'running' ? `Cash Out ${(mult * 1.5).toFixed(2)}x` : bet2Placed ? 'Waiting...' : 'BET'}
                    </button>
                  </div>
                  <div className="av-quick-row">
                    {[10, 50, 100, 500].map(amt => (
                      <button key={amt} className="av-quick-btn" onClick={() => setBet2Amount(amt)} disabled={bet2Placed}>
                        {amt}
                      </button>
                    ))}
                  </div>
                  <div className="av-auto-row">
                    <input type="checkbox" className="av-auto-check" checked={bet2Auto} onChange={e => setBet2Auto(e.target.checked)} />
                    <span className="av-auto-label">Auto</span>
                    <input type="number" className="av-auto-input" value={bet2AutoAt} onChange={e => setBet2AutoAt(Math.max(1.1, Number(e.target.value)))} step="0.1" min="1.1" disabled={!bet2Auto} />
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
