/**
 * AviatorGame.jsx — WebSocket-Connected Aviator Crash Game
 *
 * The game engine runs on the backend server. All clients connect via WebSocket
 * and receive synchronized game state (same multiplier, same crash point for everyone).
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { ChevronLeft } from 'lucide-react'

const WS_URL = import.meta.env.VITE_WS_URL || 'wss://8769bet-backend.onrender.com/ws/aviator'

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Exo+2:wght@400;500;600;700;800;900&display=swap');
  * { box-sizing: border-box; }
  .av-root {
    --bg-primary: #0c1220;
    --bg-secondary: #0f1929;
    --bg-panel: rgba(15,25,41,0.88);
    --border: rgba(255,255,255,0.06);
    --green: #00e887;
    --green-dim: rgba(0,232,135,0.15);
    --green-border: rgba(0,232,135,0.3);
    --red: #ff4d4d;
    --yellow: #ffd600;
    --text: #ffffff;
    --text-sec: rgba(255,255,255,0.5);
    font-family: 'Inter','Exo 2',-apple-system,BlinkMacSystemFont,sans-serif;
  }
  .av-loading {
    position:fixed;inset:0;z-index:200;background:var(--bg-primary);
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
    box-shadow:0 0 10px rgba(0,232,135,.5);transition:width .08s linear;
  }
  .av-header {
    display:flex;align-items:center;justify-content:space-between;
    padding:9px 14px;background:rgba(12,18,32,.92);border-bottom:1px solid var(--border);
  }
  .av-logo {display:flex;align-items:center;gap:8px;}
  .av-logo-icon {
    width:36px;height:36px;border-radius:10px;
    background:linear-gradient(135deg,#ff4d4d,#ff8c00);
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 0 20px rgba(255,77,77,.3);
  }
  .av-logo-text {
    font-family:'Exo 2',sans-serif;font-size:16px;font-weight:800;
    color:var(--text);letter-spacing:.08em;text-transform:uppercase;
  }
  .av-history {display:flex;gap:4px;align-items:center;}
  .av-hist-item {
    padding:2px 7px;border-radius:10px;font-size:11px;font-weight:700;
    font-family:'Exo 2',sans-serif;
  }
  .av-hist-red {background:var(--red);color:#fff;}
  .av-hist-green {background:var(--green);color:#000;}
  .av-hist-yellow {background:var(--yellow);color:#000;}
  .av-canvas {position:relative;width:100%;height:340px;background:var(--bg-primary);overflow:hidden;}
  .av-canvas-el {position:absolute;inset:0;z-index:1;}
  .av-bets-area {
    padding:12px;display:flex;flex-direction:column;gap:10px;
    background:var(--bg-secondary);border-top:1px solid var(--border);
  }
  .av-bet-panel {
    background:var(--bg-panel);border:1px solid var(--border);
    border-radius:14px;padding:12px;backdrop-filter:blur(12px);
  }
  .av-bet-row {display:flex;gap:8px;align-items:center;}
  .av-bet-input {
    flex:1;background:rgba(255,255,255,.06);border:1px solid var(--border);
    border-radius:10px;padding:10px 12px;color:var(--text);font-size:14px;
    font-weight:700;font-family:'Exo 2',sans-serif;
  }
  .av-bet-input:focus {outline:none;border-color:var(--green-border);}
  .av-bet-btn {
    padding:10px 20px;border-radius:10px;border:none;
    font-size:14px;font-weight:800;font-family:'Exo 2',sans-serif;
    cursor:pointer;text-transform:uppercase;letter-spacing:.05em;transition:all .15s;
  }
  .av-bet-btn-bet {
    background:linear-gradient(135deg,var(--green),#00d4aa);color:#000;
    box-shadow:0 0 20px rgba(0,232,135,.3);
  }
  .av-bet-btn-bet:hover {box-shadow:0 0 30px rgba(0,232,135,.5);transform:scale(1.02);}
  .av-bet-btn-bet:disabled {opacity:.5;cursor:not-allowed;transform:none;}
  .av-bet-btn-cashout {
    background:linear-gradient(135deg,var(--yellow),#ffb300);color:#000;
    box-shadow:0 0 20px rgba(255,214,0,.3);animation:pulse-cashout 1s infinite;
  }
  @keyframes pulse-cashout {
    0%,100%{box-shadow:0 0 20px rgba(255,214,0,.3)}
    50%{box-shadow:0 0 40px rgba(255,214,0,.6)}
  }
  .av-bet-btn-waiting {background:rgba(255,255,255,.1);color:var(--text-sec);cursor:default;}
  .av-bet-controls {display:flex;gap:4px;margin-top:6px;}
  .av-bet-quick {
    flex:1;padding:6px;border-radius:8px;border:1px solid var(--border);
    background:rgba(255,255,255,.04);color:var(--text-sec);font-size:11px;font-weight:600;cursor:pointer;
  }
  .av-bet-quick:hover {background:rgba(255,255,255,.08);color:var(--text);}
  .av-auto-row {display:flex;gap:6px;align-items:center;margin-top:6px;}
  .av-auto-check {width:16px;height:16px;accent-color:var(--green);}
  .av-auto-input {
    flex:1;background:rgba(255,255,255,.06);border:1px solid var(--border);
    border-radius:8px;padding:6px 10px;color:var(--text);font-size:12px;font-weight:600;
  }
  .av-auto-input:focus {outline:none;border-color:var(--green-border);}
  .av-my-history {
    padding:10px 12px;background:var(--bg-secondary);
    border-top:1px solid var(--border);max-height:100px;overflow-y:auto;
  }
  .av-my-title {font-size:11px;font-weight:700;color:var(--text-sec);margin-bottom:6px;}
  .av-my-item {
    display:flex;justify-content:space-between;padding:4px 0;
    font-size:11px;border-bottom:1px solid rgba(255,255,255,.03);
  }
`

export default function AviatorGame() {
  const navigate = useNavigate()
  const { user, isLoggedIn, updateBalance } = useAuth()
  const toast = useToast()
  const canvasRef = useRef(null)
  const wsRef = useRef(null)
  const animRef = useRef(null)
  const trailRef = useRef([])

  // Game state from server
  const [phase, setPhase] = useState('betting')
  const [mult, setMult] = useState(1.00)
  const [countdown, setCountdown] = useState(8)
  const [crashPoint, setCrashPoint] = useState(0)
  const [crashedAt, setCrashedAt] = useState(null)
  const [roundId, setRoundId] = useState('')
  const [crashHistory, setCrashHistory] = useState([])
  const [myHistory, setMyHistory] = useState([])
  const [connected, setConnected] = useState(false)

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

  // ── WebSocket Connection ───────────────────────────────────
  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket(WS_URL)

      ws.onopen = () => {
        console.log('[Aviator] Connected to game server')
        setConnected(true)
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)

          if (msg.type === 'game_state') {
            setPhase(msg.phase)
            if (msg.phase === 'betting') {
              setCountdown(msg.countdown || 0)
              setMult(1.00)
              setCrashedAt(null)
              setBet1Placed(false)
              setBet2Placed(false)
              setBet1Cashed(false)
              setBet2Cashed(false)
              trailRef.current = []
            } else if (msg.phase === 'flying') {
              setMult(msg.mult || 1.00)
              setCrashedAt(null)
            } else if (msg.phase === 'crashed') {
              setCrashPoint(msg.crash_point || 0)
              setCrashedAt(msg.crash_point || 0)
              setPhase('crashed')
              if (msg.crash_point) {
                setCrashHistory(prev => [msg.crash_point, ...prev].slice(0, 20))
              }
            }
            if (msg.roundId) setRoundId(msg.roundId)
          }

          if (msg.type === 'bet_result') {
            if (msg.success) {
              if (msg.bet.betNum === 1) setBet1Placed(true)
              else setBet2Placed(true)
              toast.success(`Bet placed: PKR ${msg.bet.amount}`)
            } else {
              toast.error(msg.error || 'Failed to place bet')
            }
          }

          if (msg.type === 'cashout_result') {
            if (msg.success) {
              if (msg.betNum === 1) setBet1Cashed(true)
              else setBet2Cashed(true)
              updateBalance((user?.balance || 0) + msg.winAmount)
              toast.success(`Cashed out: PKR ${msg.winAmount}`)
              setMyHistory(prev => [{
                amount: msg.amount,
                mult: msg.multiplier,
                won: true,
                profit: msg.winAmount,
                time: new Date().toLocaleTimeString(),
              }, ...prev].slice(0, 15))
            } else {
              toast.error(msg.error || 'Failed to cash out')
            }
          }
        } catch (e) {
          console.warn('[Aviator] Invalid message:', e)
        }
      }

      ws.onclose = () => {
        console.log('[Aviator] Disconnected, reconnecting...')
        setConnected(false)
        setTimeout(connect, 3000)
      }

      ws.onerror = (err) => {
        console.error('[Aviator] WebSocket error:', err)
      }

      wsRef.current = ws
    }

    connect()

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
        wsRef.current = null
      }
    }
  }, [])

  // ── Canvas Animation ───────────────────────────────────────
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
        ctx.fillText(`${crashedAt.toFixed(2)}x`, w / 2, h / 2)
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
        ctx.fillText('Place your bets', w / 2, h / 2 + 20)
      }

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [phase, mult, countdown, crashedAt])

  // ── Bet Actions ────────────────────────────────────────────
  const placeBet = (betNum) => {
    if (!isLoggedIn) return toast.error('Login to bet')
    if (phase !== 'betting') return toast.error('Waiting for next round')

    const amount = betNum === 1 ? bet1Amount : bet2Amount
    if (amount < 10) return toast.error('Min bet is PKR 10')
    if (amount > (user?.balance || 0)) return toast.error('Insufficient balance')

    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify({
        type: 'place_bet',
        userId: user.id,
        username: user.username,
        amount,
        betNum,
        autoCashout: (betNum === 1 && bet1Auto) ? bet1AutoAt : (betNum === 2 && bet2Auto) ? bet2AutoAt : null,
      }))
    }
  }

  const cashoutBet = (betNum) => {
    if (phase !== 'flying') return
    if (betNum === 1 && !bet1Placed) return
    if (betNum === 2 && !bet2Placed) return
    if (betNum === 1 && bet1Cashed) return
    if (betNum === 2 && bet2Cashed) return

    if (wsRef.current && wsRef.current.readyState === 1) {
      wsRef.current.send(JSON.stringify({
        type: 'cashout',
        userId: user.id,
        betNum,
      }))
    }
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <>
      <style>{CSS}</style>
      <div className="av-root" style={{ width: '100%', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div className="av-header">
          <div className="av-logo">
            <button onClick={() => navigate('/')} className="mr-2 text-gray-400 hover:text-white">
              <ChevronLeft size={18} />
            </button>
            <div className="av-logo-icon">✈</div>
            <span className="av-logo-text">Aviator</span>
          </div>
          <div className="av-history">
            {crashHistory.slice(0, 8).map((cp, i) => (
              <span key={i} className={`av-hist-item ${cp >= 10 ? 'av-hist-green' : cp >= 2 ? 'av-hist-yellow' : 'av-hist-red'}`}>
                {cp.toFixed(2)}x
              </span>
            ))}
          </div>
        </div>

        {/* Canvas */}
        <div className="av-canvas">
          <canvas ref={canvasRef} className="av-canvas-el" />
        </div>

        {/* Bet Panels */}
        <div className="av-bets-area">
          {/* Bet 1 */}
          <div className="av-bet-panel">
            <div className="av-bet-row">
              <input type="number" className="av-bet-input" value={bet1Amount}
                onChange={e => setBet1Amount(Math.max(10, Number(e.target.value)))}
                disabled={bet1Placed || phase !== 'betting'} min="10" />
              <button className={`av-bet-btn ${
                bet1Cashed ? 'av-bet-btn-waiting' :
                bet1Placed && phase === 'flying' ? 'av-bet-btn-cashout' :
                bet1Placed ? 'av-bet-btn-waiting' :
                phase === 'betting' ? 'av-bet-btn-bet' : 'av-bet-btn-waiting'
              }`} onClick={() => {
                if (bet1Cashed) return
                if (bet1Placed && phase === 'flying') cashoutBet(1)
                else if (!bet1Placed && phase === 'betting') placeBet(1)
              }} disabled={!isLoggedIn}>
                {bet1Cashed ? 'Cashed' : bet1Placed && phase === 'flying' ? `Cash Out ${mult.toFixed(2)}x` : bet1Placed ? 'Waiting...' : 'BET'}
              </button>
            </div>
            <div className="av-bet-controls">
              {[10, 50, 100, 500].map(amt => (
                <button key={amt} className="av-bet-quick" onClick={() => setBet1Amount(amt)} disabled={bet1Placed}>{amt}</button>
              ))}
            </div>
            <div className="av-auto-row">
              <input type="checkbox" className="av-auto-check" checked={bet1Auto} onChange={e => setBet1Auto(e.target.checked)} />
              <span className="text-xs text-gray-400">Auto</span>
              <input type="number" className="av-auto-input" value={bet1AutoAt}
                onChange={e => setBet1AutoAt(Math.max(1.1, Number(e.target.value)))} step="0.1" min="1.1" />
            </div>
          </div>

          {/* Bet 2 */}
          <div className="av-bet-panel">
            <div className="av-bet-row">
              <input type="number" className="av-bet-input" value={bet2Amount}
                onChange={e => setBet2Amount(Math.max(10, Number(e.target.value)))}
                disabled={bet2Placed || phase !== 'betting'} min="10" />
              <button className={`av-bet-btn ${
                bet2Cashed ? 'av-bet-btn-waiting' :
                bet2Placed && phase === 'flying' ? 'av-bet-btn-cashout' :
                bet2Placed ? 'av-bet-btn-waiting' :
                phase === 'betting' ? 'av-bet-btn-bet' : 'av-bet-btn-waiting'
              }`} onClick={() => {
                if (bet2Cashed) return
                if (bet2Placed && phase === 'flying') cashoutBet(2)
                else if (!bet2Placed && phase === 'betting') placeBet(2)
              }} disabled={!isLoggedIn}>
                {bet2Cashed ? 'Cashed' : bet2Placed && phase === 'flying' ? `Cash Out ${mult.toFixed(2)}x` : bet2Placed ? 'Waiting...' : 'BET'}
              </button>
            </div>
            <div className="av-bet-controls">
              {[10, 50, 100, 500].map(amt => (
                <button key={amt} className="av-bet-quick" onClick={() => setBet2Amount(amt)} disabled={bet2Placed}>{amt}</button>
              ))}
            </div>
            <div className="av-auto-row">
              <input type="checkbox" className="av-auto-check" checked={bet2Auto} onChange={e => setBet2Auto(e.target.checked)} />
              <span className="text-xs text-gray-400">Auto</span>
              <input type="number" className="av-auto-input" value={bet2AutoAt}
                onChange={e => setBet2AutoAt(Math.max(1.1, Number(e.target.value)))} step="0.1" min="1.1" />
            </div>
          </div>
        </div>

        {/* My History */}
        <div className="av-my-history">
          <div className="av-my-title">My Bets</div>
          {myHistory.length === 0 ? (
            <span className="text-xs text-gray-500">No bets yet</span>
          ) : myHistory.map((h, i) => (
            <div key={i} className="av-my-item">
              <span className="text-gray-400">{h.time}</span>
              <span className="text-white">{h.amount}</span>
              <span className="text-emerald-400">{h.mult.toFixed(2)}x</span>
              <span className="text-emerald-400">+{h.profit}</span>
            </div>
          ))}
        </div>

        {/* Connection Status */}
        {!connected && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-red-500/90 text-white rounded-lg text-sm font-medium z-50">
            Connecting to game server...
          </div>
        )}
      </div>
    </>
  )
}
