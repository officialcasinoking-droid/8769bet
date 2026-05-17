/**
 * AviatorGame.jsx — Full-featured Aviator Crash Game
 * Backend manages all balance. Frontend reads from DB after every action.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { ChevronLeft } from 'lucide-react'
import { aviatorWS } from '../../api/aviatorWebSocket'
import { supabase } from '../../lib/supabase'

const API_URL = import.meta.env.VITE_API_URL || 'https://eight769bet-backend.onrender.com'

const QUICK_BET = [6, 10, 20, 50, 100, 200, 500]
const MIN_BET = 6
const MAX_BET = 1000
const AUTO_PRESETS = ['2.00', '3.00', '4.00', '5.00', '8.00', '10.00', '20.00']

// ── Inline CSS ────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Exo+2:wght@400;500;600;700;800;900&display=swap');
  * { box-sizing: border-box; }
  :root {
    --bg-primary: #0c1220; --bg-secondary: #0f1929; --bg-panel: rgba(15,25,41,0.88);
    --border: rgba(255,255,255,0.06); --border-active: rgba(255,255,255,0.12);
    --green: #00e887; --green-dim: rgba(0,232,135,0.15); --green-border: rgba(0,232,135,0.3);
    --red: #ff4d4d; --red-dim: rgba(255,77,77,0.15); --yellow: #ffd600;
    --text: #ffffff; --text-sec: rgba(255,255,255,0.5);
  }
  .av-root { font-family: 'Inter','Exo 2',-apple-system,sans-serif; }
  .av-loading { position:fixed;inset:0;z-index:200; background:var(--bg-primary); display:flex;flex-direction:column;align-items:center;justify-content:center; }
  .av-loading-icon { width:72px;height:72px;border-radius:18px; background:linear-gradient(135deg,#ff4d4d,#ff8c00); display:flex;align-items:center;justify-content:center;font-size:36px; box-shadow:0 0 50px rgba(255,77,77,0.4); margin-bottom:28px; }
  .av-loading-title { font-family:'Exo 2',sans-serif;font-size:38px;font-weight:900; color:var(--text);letter-spacing:.15em;text-transform:uppercase;margin:0 0 6px; }
  .av-loading-sub { font-size:11px;color:rgba(255,255,255,.28);letter-spacing:.3em; text-transform:uppercase;margin:0 0 36px; }
  .av-bar-wrap {width:260px;margin-bottom:28px;}
  .av-bar-track {width:100%;height:3px;background:rgba(255,255,255,.1);border-radius:3px;overflow:hidden;}
  .av-bar-fill { height:100%;border-radius:3px; background:linear-gradient(90deg,var(--green),#00d4aa); box-shadow:0 0 10px rgba(0,232,135,.5); transition:width .15s linear; }
  .av-header { display:flex;align-items:center;justify-content:space-between; padding:9px 14px; background:var(--bg-secondary); border-bottom:1px solid var(--border); z-index:10;flex-shrink:0; }
  .av-header-left{display:flex;align-items:center;gap:10px;}
  .av-back { width:30px;height:30px;border-radius:7px; background:rgba(255,255,255,.04);border:none; display:flex;align-items:center;justify-content:center; cursor:pointer;color:rgba(255,255,255,.45); transition:background .12s; }
  .av-back:hover{background:rgba(255,255,255,.09);color:#fff}
  .av-logo{display:flex;align-items:center;gap:8px;}
  .av-logo-icon { width:26px;height:26px;border-radius:7px; background:linear-gradient(135deg,#ff4d4d,#ff8c00); display:flex;align-items:center;justify-content:center;font-size:13px; }
  .av-logo-text { font-family:'Exo 2',sans-serif;font-size:12px;font-weight:800; color:var(--text);letter-spacing:.15em;text-transform:uppercase; }
  .av-live-dot { width:5px;height:5px;border-radius:50%; background:var(--green);box-shadow:0 0 7px var(--green); animation:avPulse 1.4s infinite; }
  @keyframes avPulse{0%,100%{opacity:1}50%{opacity:.35}}
  .av-bal { display:flex;align-items:center;gap:7px; padding:5px 12px;border-radius:9px; background:var(--green-dim);border:1px solid var(--green-border); }
  .av-bal-label{font-size:9px;font-weight:700;color:var(--green);opacity:.65;text-transform:uppercase;letter-spacing:.04em}
  .av-bal-amt{font-family:'Exo 2',sans-serif;font-size:14px;font-weight:800;color:var(--green)}
  .av-history { display:flex;align-items:center;gap:5px; padding:7px 14px; background:var(--bg-secondary); border-bottom:1px solid var(--border); overflow-x:auto;white-space:nowrap;flex-shrink:0; scrollbar-width:none; }
  .av-history::-webkit-scrollbar{display:none}
  .av-pill { flex-shrink:0;padding:3px 9px;border-radius:5px; font-size:11px;font-weight:700;border:1px solid; }
  .av-pill-low{color:#5bc8f5;background:rgba(91,200,245,.1);border-color:rgba(91,200,245,.2)}
  .av-pill-mid{color:#a855f7;background:rgba(168,85,247,.1);border-color:rgba(168,85,247,.2)}
  .av-pill-high{color:#ff4d4d;background:rgba(255,77,77,.1);border-color:rgba(255,77,77,.2)}
  .av-main{display:flex;flex-direction:column;flex:1;overflow:hidden;min-height:0}
  .av-top-row{display:flex;flex:1;overflow:hidden;min-height:0}
  .av-bets-row{display:flex;overflow:hidden;flex-shrink:0}
  .av-panel{flex:1;max-width:320px;min-width:160px;overflow-y:auto;padding:8px;background:var(--bg-secondary);border-right:1px solid var(--border);}
  .av-card{background:var(--bg-panel);border:1px solid var(--border);border-radius:10px;padding:8px;margin-bottom:8px;}
  .av-card-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;}
  .av-card-title{font-size:11px;font-weight:700;color:var(--text-sec);text-transform:uppercase;letter-spacing:.1em;}
  .av-card-amount{font-family:'Exo 2',sans-serif;font-size:12px;font-weight:700;color:var(--text);}
  .av-input-row{display:flex;gap:4px;margin-bottom:6px;}
  .av-input { flex:1;padding:6px 8px;border-radius:6px;background:rgba(255,255,255,.04);border:1px solid var(--border);color:var(--text);font-family:'Exo 2',sans-serif;font-size:13px;font-weight:700;outline:none; }
  .av-input:focus{border-color:var(--green-border);}
  .av-quick{display:flex;gap:3px;flex-wrap:wrap;margin-bottom:6px;}
  .av-quick-btn { padding:3px 7px;border-radius:4px;background:rgba(255,255,255,.04);border:1px solid var(--border);color:var(--text-sec);font-size:10px;font-weight:600;cursor:pointer;transition:all .12s; }
  .av-quick-btn:hover{background:var(--green-dim);border-color:var(--green-border);color:var(--green);}
  .av-auto-row{display:flex;align-items:center;gap:4px;margin-bottom:6px;}
  .av-auto-toggle { padding:4px 8px;border-radius:5px;font-size:10px;font-weight:700;cursor:pointer;border:1px solid var(--border);background:rgba(255,255,255,.04);color:var(--text-sec);transition:all .12s; }
  .av-auto-toggle.on{background:var(--green-dim);border-color:var(--green-border);color:var(--green);}
  .av-betbtn { width:100%;padding:14px;border-radius:10px; font-family:'Exo 2',sans-serif;font-size:14px;font-weight:800;border:none;cursor:pointer;transition:all .12s; }
  .av-betbtn.g{background:linear-gradient(135deg,var(--green),#00d4aa);color:#0c1220;box-shadow:0 3px 18px rgba(0,232,135,.28)}
  .av-betbtn.r{background:linear-gradient(135deg,var(--red),#ff8c00);color:#fff;box-shadow:0 3px 18px rgba(255,77,77,.28)}
  .av-betbtn.g:hover{box-shadow:0 3px 28px rgba(0,232,135,.48);transform:translateY(-1px)}
  .av-betbtn.r:hover{box-shadow:0 3px 28px rgba(255,77,77,.48);transform:translateY(-1px)}
  .av-betbtn:disabled{opacity:.3;cursor:not-allowed;transform:none!important;box-shadow:none!important}
  .av-cashbtn { width:100%;padding:14px;border-radius:10px; font-family:'Exo 2',sans-serif;font-size:14px;font-weight:800; background:linear-gradient(135deg,var(--yellow),#ff8c00); color:#0c1220;border:none;cursor:pointer; box-shadow:0 3px 18px rgba(255,214,0,.28); animation:avCashPulse .7s infinite; }
  .av-betbtn.av-cancelbtn-orange { background:linear-gradient(135deg,#f59e0b,#d97706);color:#0c1220; box-shadow:0 3px 18px rgba(245,158,11,.3); }
  .av-betbtn.av-cancelbtn-orange:hover{box-shadow:0 3px 28px rgba(245,158,11,.5);transform:translateY(-1px)}
  @keyframes avCashPulse{0%,100%{box-shadow:0 3px 18px rgba(255,214,0,.28)}50%{box-shadow:0 3px 32px rgba(255,214,0,.58)}}
  .av-result{width:100%;padding:7px;border-radius:7px;text-align:center;border:1px solid}
  .av-result.won{background:rgba(255,214,0,.1);border-color:rgba(255,214,0,.28)}
  .av-result.lost{background:rgba(255,77,77,.1);border-color:rgba(255,77,77,.28)}
  .av-result-label{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.04em}
  .av-result-label.w{color:var(--yellow)}
  .av-result-label.l{color:var(--red)}
  .av-result-amt{font-family:'Exo 2',sans-serif;font-size:14px;font-weight:900}
  .av-result-amt.w{color:var(--yellow)}
  .av-result-amt.l{color:var(--red)}
  .av-wait{width:100%;padding:7px;border-radius:7px;text-align:center;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07)}
  .av-wait-label{font-size:9px;font-weight:700;color:rgba(255,255,255,.28);text-transform:uppercase}
  .av-wait-amt{font-family:'Exo 2',sans-serif;font-size:12px;font-weight:700;color:rgba(255,255,255,.45)}
  .av-canvas{flex:7;position:relative;min-width:0;overflow:hidden;background:var(--bg-primary)}
  .av-canvas-el{position:absolute;inset:0;width:100%;height:100%;z-index:1}
  @media(max-width:767px){
    .av-top-row{flex-direction:row;flex:1;height:0;min-height:0;overflow:hidden}
    .av-canvas{flex:7;min-height:0;flex-shrink:0}
    .av-live{flex:none;width:30%;min-width:80px;border-top:none;border-left:1px solid var(--border);flex-direction:column;overflow:hidden}
    .av-live-head{width:100%;flex-shrink:0;border-bottom:1px solid var(--border);border-right:none;padding:4px 8px}
    .av-live-list{overflow-y:auto;overflow-x:hidden;flex:1;min-height:0}
    .av-live-item{flex-shrink:0;border-bottom:1px solid rgba(255,255,255,.03);border-right:none;padding:4px 8px;flex-direction:row;gap:4px;min-width:unset;width:100%}
    .av-live-empty{height:40px;width:unset;flex-shrink:0}
    .av-live-user{max-width:55px;font-size:9px}
    .av-live-amt{font-size:10px}
    .av-live-mult{font-size:9px}
    .av-bets-row{flex-shrink:0;overflow:hidden}
    .av-panel{flex:1;max-width:none;min-width:0;overflow-x:auto;overflow-y:hidden;padding:0}
    .av-panel::-webkit-scrollbar{display:none}
    .av-card{min-width:160px;flex-shrink:0;width:100%}
    .av-my-history{max-height:36px}
  }
  .av-overlay { position:absolute;inset:0; display:flex;align-items:center;justify-content:center; pointer-events:none;z-index:3; }
  .av-cd-box { background:rgba(0,0,0,.68);backdrop-filter:blur(14px); border:1px solid rgba(255,255,255,.09);border-radius:15px; padding:18px 36px;text-align:center; }
  .av-cd-num { font-family:'Exo 2',sans-serif; font-size:clamp(44px,7vw,68px);font-weight:900; color:var(--text);line-height:1;text-shadow:0 0 28px rgba(255,255,255,.28); }
  .av-cd-label{font-size:9px;font-weight:600;color:rgba(255,255,255,.38);text-transform:uppercase;letter-spacing:.2em;margin-top:5px}
  .av-crash-val { font-family:'Exo 2',sans-serif;font-size:clamp(24px,4vw,36px); font-weight:900;color:var(--red);line-height:1; text-shadow:0 0 20px rgba(255,77,77,.6),0 0 40px rgba(255,77,77,.3); }
  .av-exit-layer{position:absolute;inset:0;pointer-events:none;z-index:4;overflow:hidden}
  .av-exit-item { position:absolute;pointer-events:none; display:flex;align-items:center;gap:5px; padding:4px 10px;border-radius:20px; background:rgba(0,232,135,.15);border:1px solid rgba(0,232,135,.3); animation:avExitFade 2.2s forwards; }
  .av-exit-avatar { width:16px;height:16px;border-radius:50%; background:var(--green-dim);border:1px solid var(--green-border); display:flex;align-items:center;justify-content:center; font-size:8px;font-weight:700;color:var(--green); }
  .av-exit-name{font-size:8px;font-weight:600;color:rgba(255,255,255,.5);max-width:50px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .av-exit-amt{font-size:9px;font-weight:800;color:var(--green)}
  @keyframes avExitFade { 0%{opacity:0;transform:translateY(10px) scale(.8)} 8%{opacity:1;transform:translateY(0) scale(1)} 75%{opacity:1;transform:translateY(-8px)} 100%{opacity:0;transform:translateY(-20px)} }
  .av-live { flex:3;display:flex;flex-direction:column; background:var(--bg-secondary); border-left:1px solid var(--border); }
  .av-live-head { display:flex;align-items:center;gap:7px; padding:9px 11px;border-bottom:1px solid var(--border);flex-shrink:0; }
  .av-live-title{font-size:10px;font-weight:700;color:var(--text-sec);text-transform:uppercase;letter-spacing:.1em}
  .av-live-cnt{font-size:10px;font-weight:700;color:#5bc8f5}
  .av-live-list { flex:1;overflow-y:auto;overflow-x:hidden; scrollbar-width:thin;min-height:0; mask-image:linear-gradient(to bottom,transparent,#000 8%,#000 92%,transparent); -webkit-mask-image:linear-gradient(to bottom,transparent,#000 8%,#000 92%,transparent); }
  .av-live-item { display:flex;align-items:center;justify-content:space-between; padding:6px 11px;border-bottom:1px solid rgba(255,255,255,.03); border-left:3px solid transparent; transition:background .09s; }
  .av-live-item:hover{background:rgba(255,255,255,.02)}
  .av-live-item.isu{background:rgba(0,232,135,.04);border-left-color:rgba(0,232,135,.3)}
  .av-live-item.won{border-left-color:var(--green);background:rgba(0,232,135,.06)}
  .av-live-item.lost{border-left-color:var(--red);background:rgba(255,77,77,.04)}
  .av-live-item.pending{border-left-color:rgba(255,214,0,.3);background:rgba(255,214,0,.03)}
  .av-live-user{font-size:10px;font-weight:600;color:rgba(255,255,255,.45);max-width:72px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .av-live-user.isu{color:var(--green)}
  .av-live-amt{font-size:11px;font-weight:700;color:var(--text)}
  .av-live-mult{font-size:10px;font-weight:800}
  .av-live-empty{display:flex;align-items:center;justify-content:center;height:80px;font-size:10px;color:rgba(255,255,255,.13)}
  .av-my-history { margin-top:8px; }
  .av-my-history-title { font-size:10px;font-weight:700;color:var(--text-sec);text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px; }
  .av-my-history-list { display:flex;flex-direction:column;gap:2px;max-height:80px;overflow-y:auto; }
  .av-my-history-item { display:flex;justify-content:space-between;align-items:center;padding:3px 6px;border-radius:4px;font-size:10px; }
  .av-my-history-item.won { background:rgba(0,232,135,.08); }
  .av-my-history-item.lost { background:rgba(255,77,77,.08); }
  .av-my-history-item.pending { background:rgba(255,214,0,.08); }
`

// ── Loading Screen ────────────────────────────────────────────
function LoadingScreen({ progress }) {
  return (
    <div className="av-loading">
      <div className="av-loading-icon">✈</div>
      <h1 className="av-loading-title">AVIATOR</h1>
      <p className="av-loading-sub">Loading...</p>
      <div className="av-bar-wrap">
        <div className="av-bar-track">
          <div className="av-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
  )
}

// ── Bet Panel ─────────────────────────────────────────────────
function BetPanel({ num, amt, setAmt, autoOn, setAutoOn, autoVal, setAutoVal, betData, phase, mult, bal, onPlace, onCash, onCancel }) {
  const hasBet = !!betData
  const isBetting = phase === 'betting'
  const isRunning = phase === 'running'
  const isCrashed = phase === 'crashed'
  const cashed = betData?.cashed
  const g = num === 1
  const won = cashed ? cashed.won : null
  const cashAmt = hasBet && !cashed ? Math.floor(betData.amount * mult).toFixed(0) : '0'

  let actionBtn = null
  if (!hasBet) {
    const canPlace = isBetting && amt >= MIN_BET && amt <= MAX_BET && amt <= bal
    actionBtn = (
      <button className={`av-betbtn ${g ? 'g' : 'r'}`} disabled={!canPlace} onClick={onPlace}>
        {!isBetting ? 'Wait...' : amt < MIN_BET ? `Min ₨${MIN_BET}` : amt > MAX_BET ? `Max ₨${MAX_BET}` : amt > bal ? 'Low Balance' : `Bet ₨${amt}`}
      </button>
    )
  } else if (cashed) {
    actionBtn = (
      <div className="av-result won">
        <div className="av-result-label w">Cashed Out</div>
        <div className="av-result-amt w">+₨{won.toLocaleString()}</div>
      </div>
    )
  } else if (isRunning) {
    actionBtn = <button className="av-cashbtn" onClick={onCash}>Cash ₨{cashAmt}</button>
  } else if (isCrashed) {
    actionBtn = (
      <div className="av-result lost">
        <div className="av-result-label l">Lost</div>
        <div className="av-result-amt l">-₨{betData.amount}</div>
      </div>
    )
  } else if (isBetting) {
    actionBtn = <button className="av-betbtn av-cancelbtn-orange" onClick={onCancel}>Cancel ₨{betData.amount}</button>
  } else {
    actionBtn = (
      <div className="av-wait">
        <div className="av-wait-label">Waiting</div>
        <div className="av-wait-amt">₨{betData.amount}</div>
      </div>
    )
  }

  return (
    <div className="av-card">
      <div className="av-card-head">
        <span className="av-card-title">Bet {num}</span>
        <span className="av-card-amount">₨{amt}</span>
      </div>
      <div className="av-input-row">
        <input className="av-input" type="number" value={amt} onChange={e => setAmt(Math.max(0, parseInt(e.target.value) || 0))} min={MIN_BET} max={MAX_BET} />
        <button className="av-quick-btn" onClick={() => setAmt(prev => Math.max(MIN_BET, prev / 2))}>½</button>
        <button className="av-quick-btn" onClick={() => setAmt(prev => Math.min(MAX_BET, prev * 2))}>2×</button>
      </div>
      <div className="av-quick">
        {QUICK_BET.map(v => (
          <button key={v} className={`av-quick-btn ${amt === v ? 'on' : ''}`} onClick={() => setAmt(v)}>₨{v}</button>
        ))}
      </div>
      <div className="av-auto-row">
        <button className={`av-auto-toggle ${autoOn ? 'on' : ''}`} onClick={() => setAutoOn(!autoOn)}>Auto</button>
        {autoOn && (
          <select className="av-input" value={autoVal} onChange={e => setAutoVal(e.target.value)} style={{ flex: 1 }}>
            {AUTO_PRESETS.map(v => <option key={v} value={v}>{v}×</option>)}
          </select>
        )}
      </div>
      {actionBtn}
    </div>
  )
}

// ── Main Game ─────────────────────────────────────────────────
export default function AviatorGame() {
  const navigate = useNavigate()
  const { user, isLoggedIn } = useAuth()
  const toast = useToast()

  const [showLoading, setShowLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [phase, setPhase] = useState('betting')
  const [mult, setMult] = useState(1.00)
  const [cd, setCd] = useState(8)
  const [crashedAt, setCrashedAt] = useState(null)
  const [bal, setBal] = useState(0)
  const [live, setLive] = useState([])
  const [hist, setHist] = useState([])
  const [myHistory, setMyHistory] = useState([])
  const [cashoutExits, setCashoutExits] = useState([])
  const [flightStartTime, setFlightStartTime] = useState(0)
  const exitCountRef = useRef(0)

  const [b1a, setB1a] = useState(10)
  const [b1o, setB1o] = useState(false)
  const [b1v, setB1v] = useState('2.00')
  const [b1d, setB1d] = useState(null)
  const [b2a, setB2a] = useState(10)
  const [b2o, setB2o] = useState(false)
  const [b2v, setB2v] = useState('2.00')
  const [b2d, setB2d] = useState(null)

  // Refs for WS handler
  const b1dRef = useRef(null)
  const b2dRef = useRef(null)
  const autoCashedRef = useRef(new Set())
  const phaseRef = useRef('betting')
  const canvasRef = useRef(null)

  useEffect(() => { b1dRef.current = b1d }, [b1d])
  useEffect(() => { b2dRef.current = b2d }, [b2d])
  useEffect(() => { phaseRef.current = phase }, [phase])

  // ── Load balance and bet history from DB ──
  const fetchBalance = useCallback(async () => {
    if (!user?.id) return
    try {
      const { data } = await supabase.from('users').select('balance').eq('id', user.id).single()
      if (data) setBal(Number(data.balance) || 0)
    } catch (e) {
      console.error('[Aviator] Balance fetch error:', e.message)
    }
  }, [user?.id])

  const fetchBetHistory = useCallback(async () => {
    if (!user?.id) return
    try {
      const res = await fetch(`${API_URL}/api/aviator/bet-history?userId=${user.id}`)
      const data = await res.json()
      if (data.success && data.bets) {
        const history = data.bets.slice(0, 20).map(b => ({
          amount: Number(b.amount),
          mult: b.cashout_multiplier || null,
          won: b.status === 'won',
          profit: b.status === 'won' ? Number(b.win_amount) - Number(b.amount) : -Number(b.amount),
          pending: false,
          betId: b.id,
          time: new Date(b.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }))
        setMyHistory(history)
      }
    } catch (e) {
      console.error('[Aviator] History fetch error:', e.message)
    }
  }, [user?.id])

  useEffect(() => {
    if (!user?.id || showLoading) return
    fetchBalance()
    fetchBetHistory()
    const interval = setInterval(fetchBalance, 5000)
    return () => clearInterval(interval)
  }, [user?.id, showLoading, fetchBalance, fetchBetHistory])

  // ── WebSocket connection ──
  useEffect(() => {
    if (showLoading) return
    aviatorWS.connect()

    aviatorWS.on('game_state', (state) => {
      if (state.phase === 'betting') {
        setPhase('betting')
        setCd(parseFloat(state.countdown) || 8)
        setCrashedAt(null)
      } else if (state.phase === 'flying') {
        setPhase('running')
        setMult(parseFloat(state.mult) || 1.00)
        if (!flightStartTime) setFlightStartTime(Date.now())
      } else if (state.phase === 'crashed') {
        setPhase('crashed')
        setFlightStartTime(0)
        const cp = parseFloat(state.crash_point) || 1.00
        setCrashedAt(cp)
        setMult(cp)
        setHist(prev => prev.includes(cp) ? prev : [cp, ...prev].slice(0, 30))
      }
      if (state.crashHistory && Array.isArray(state.crashHistory)) {
        setHist(state.crashHistory.slice(0, 30))
      }
    })

    aviatorWS.on('bets_update', async (data) => {
      try {
        const betsArray = Array.isArray(data) ? data : (data?.bets && Array.isArray(data.bets) ? data.bets : [])
        setLive(betsArray)

        // Auto-cashout detection for bet 1
        const myBet1 = betsArray.find(b => b.userId === user?.id && b.betNum === 1 && b.cashedOut && b.status === 'won')
        if (myBet1 && b1dRef.current && !b1dRef.current.cashed && !autoCashedRef.current.has(myBet1.id)) {
          autoCashedRef.current.add(myBet1.id)
          const won = myBet1.winAmount || 0
          setB1d(prev => prev ? { ...prev, cashed: { won } } : null)
          setMyHistory(prev => prev.map(entry =>
            entry.pending && entry.betId === myBet1.id
              ? { ...entry, mult: myBet1.cashoutMult, won: true, profit: won, pending: false }
              : entry
          ))
          addCashoutExit(user?.username || 'You', won)
          toast.success(`Auto cashed ${myBet1.cashoutMult.toFixed(2)}x — +₨${won.toLocaleString()}`)
          fetchBalance()
        }

        // Auto-cashout detection for bet 2
        const myBet2 = betsArray.find(b => b.userId === user?.id && b.betNum === 2 && b.cashedOut && b.status === 'won')
        if (myBet2 && b2dRef.current && !b2dRef.current.cashed && !autoCashedRef.current.has(myBet2.id)) {
          autoCashedRef.current.add(myBet2.id)
          const won = myBet2.winAmount || 0
          setB2d(prev => prev ? { ...prev, cashed: { won } } : null)
          setMyHistory(prev => prev.map(entry =>
            entry.pending && entry.betId === myBet2.id
              ? { ...entry, mult: myBet2.cashoutMult, won: true, profit: won, pending: false }
              : entry
          ))
          addCashoutExit(user?.username || 'You', won)
          toast.success(`Auto cashed ${myBet2.cashoutMult.toFixed(2)}x — +₨${won.toLocaleString()}`)
          fetchBalance()
        }
      } catch (e) {
        setLive([])
      }
    })

    return () => {}
  }, [showLoading, user, toast, fetchBalance])

  // ── Round transitions ──
  const prevPhaseRef = useRef('betting')
  useEffect(() => {
    const prev = prevPhaseRef.current
    prevPhaseRef.current = phase

    if (phase === 'crashed' && prev !== 'crashed') {
      setMyHistory(h => h.map(entry =>
        entry.pending && !entry.won
          ? { ...entry, won: false, pending: false, mult: null, profit: -entry.amount }
          : entry
      ))
      fetchBalance()
    }
    if (phase === 'betting' && prev === 'crashed') {
      setB1d(null)
      setB2d(null)
      autoCashedRef.current.clear()
    }
  }, [phase, fetchBalance])

  // ── Loading animation ──
  useEffect(() => {
    let prog = 0
    const tick = setInterval(() => {
      prog += Math.random() * 18 + 8
      if (prog >= 100) {
        prog = 100
        clearInterval(tick)
        setLoadingProgress(100)
        setTimeout(() => setShowLoading(false), 300)
      } else {
        setLoadingProgress(prog)
      }
    }, 150)
    return () => clearInterval(tick)
  }, [])

  // ── Exit popups ──
  const addCashoutExit = useCallback((name, profit) => {
    exitCountRef.current++
    const id = `ex_${exitCountRef.current}_${Date.now()}`
    const left = 20 + Math.random() * 50
    const top = 50 + Math.random() * 40
    setCashoutExits(prev => [...prev, { id, name, profit, left, top }])
    setTimeout(() => setCashoutExits(prev => prev.filter(e => e.id !== id)), 2500)
  }, [])

  // ── Bet placement ──
  const place = useCallback(async (num) => {
    if (!isLoggedIn) { navigate('/login', { state: { from: '/play/aviator' } }); return }
    const amount = num === 1 ? b1a : b2a
    if (amount < MIN_BET) { toast.error(`Min ₨${MIN_BET}`); return }
    if (amount > MAX_BET) { toast.error(`Max ₨${MAX_BET}`); return }
    if (amount > bal) { toast.error(`Low balance: ₨${bal}`); return }
    if (phaseRef.current !== 'betting') { toast.error('Wait for next round'); return }

    const autoCashout = (num === 1 ? b1o : b2o) ? parseFloat(num === 1 ? b1v : b2v) : null

    try {
      const response = await fetch(`${API_URL}/api/aviator/bet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, username: user?.username || 'You', amount, autoCashout, betNumber: num }),
      })
      const result = await response.json()
      if (result.success) {
        const entry = { id: result.bet.id, amount, autoCashout, cashed: null }
        if (num === 1) setB1d(entry); else setB2d(entry)
        setMyHistory(prev => [{
          amount, mult: null, won: false, profit: 0, pending: true, betId: result.bet.id,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }, ...prev].slice(0, 20))
        fetchBalance()
        toast.success(`Bet ${num}: ₨${amount} placed`)
      } else {
        toast.error(result.error || 'Failed to place bet')
      }
    } catch (err) {
      toast.error('Failed to place bet')
    }
  }, [isLoggedIn, b1a, b1o, b1v, b2a, b2o, b2v, bal, user, navigate, toast, fetchBalance])

  // ── Cashout ──
  const cashout = useCallback(async (num) => {
    if (phaseRef.current !== 'running') return
    const betData = num === 1 ? b1dRef.current : b2dRef.current
    if (!betData || betData.cashed) return

    try {
      const response = await fetch(`${API_URL}/api/aviator/cashout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, betNum: num }),
      })
      const result = await response.json()
      if (result.success) {
        const setter = num === 1 ? setB1d : setB2d
        setter(prev => prev ? { ...prev, cashed: { won: result.winAmount } } : null)
        setMyHistory(prev => prev.map(entry =>
          entry.pending && entry.betId === betData.id
            ? { ...entry, mult: result.multiplier, won: true, profit: result.winAmount, pending: false }
            : entry
        ))
        addCashoutExit(user?.username || 'You', result.winAmount)
        fetchBalance()
        toast.success(`Cashed ${result.multiplier.toFixed(2)}x — +₨${result.winAmount.toLocaleString()}`)
      } else {
        toast.error(result.error || 'Failed to cash out')
      }
    } catch (err) {
      toast.error('Failed to cash out')
    }
  }, [user, toast, addCashoutExit, fetchBalance])

  // ── Cancel bet ──
  const cancelBet = useCallback(async (num) => {
    const betData = num === 1 ? b1dRef.current : b2dRef.current
    if (!betData) return
    if (phaseRef.current !== 'betting') { toast.error('Can only cancel during betting phase'); return }

    try {
      await fetch(`${API_URL}/api/aviator/cancel-bet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, betNum: num, betId: betData.id })
      })
    } catch (e) {}

    if (num === 1) setB1d(null); else setB2d(null)
    setMyHistory(prev => prev.filter(entry => entry.betId !== betData.id))
    fetchBalance()
    toast.success('Bet cancelled')
  }, [user, toast, fetchBalance])

  // ── Canvas animation ──
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    let W = 0, H = 0, planeX = 0, planeY = 0, frameCount = 0
    const planeImg = new Image()
    planeImg.src = '/img/aviator_jogo.png'
    let planeImgReady = false
    planeImg.onload = () => { planeImgReady = true }

    const buildBg = (w, h) => {
      const off = document.createElement('canvas')
      off.width = w; off.height = h
      const octx = off.getContext('2d')
      const grad = octx.createLinearGradient(0, 0, 0, h)
      grad.addColorStop(0, '#0c1220'); grad.addColorStop(1, '#0f1929')
      octx.fillStyle = grad; octx.fillRect(0, 0, w, h)
      octx.strokeStyle = 'rgba(255,255,255,0.03)'; octx.lineWidth = 1
      for (let i = 0; i < 8; i++) {
        const y = (h / 8) * i
        octx.beginPath(); octx.moveTo(0, y); octx.lineTo(w, y); octx.stroke()
      }
      for (let i = 0; i < 10; i++) {
        const x = (w / 10) * i
        octx.beginPath(); octx.moveTo(x, 0); octx.lineTo(x, h); octx.stroke()
      }
      return off
    }

    let bgCanvas = null

    const resize = () => {
      const rect = canvas.parentElement.getBoundingClientRect()
      canvas.width = rect.width * window.devicePixelRatio
      canvas.height = rect.height * window.devicePixelRatio
      canvas.style.width = rect.width + 'px'
      canvas.style.height = rect.height + 'px'
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
      W = rect.width; H = rect.height
      bgCanvas = buildBg(W, H)
    }

    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      frameCount++
      ctx.clearRect(0, 0, W, H)
      if (bgCanvas) ctx.drawImage(bgCanvas, 0, 0)

      if (phase === 'betting') {
        ctx.fillStyle = 'rgba(255,255,255,0.06)'
        ctx.font = 'bold 14px Inter, sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('PLACE YOUR BETS', W / 2, H / 2 - 10)
        ctx.fillStyle = 'rgba(0,232,135,0.8)'
        ctx.font = 'bold 48px Exo 2, sans-serif'
        ctx.fillText(Math.ceil(cd).toString(), W / 2, H / 2 + 40)
      } else       if (phase === 'running') {
        const curvePoints = []
        const maxTime = 10
        const elapsed = flightStartTime ? (Date.now() - flightStartTime) / 1000 : 0
        const t = Math.min(elapsed / maxTime, 1)

        for (let i = 0; i <= 100; i++) {
          const tt = (i / 100) * t
          const x = tt * W * 0.85
          const y = H - 40 - (Math.pow(tt, 1.5) * (H - 80))
          curvePoints.push({ x, y })
        }

        // Draw curve
        ctx.beginPath()
        ctx.strokeStyle = '#00e887'
        ctx.lineWidth = 3
        ctx.shadowColor = '#00e887'
        ctx.shadowBlur = 15
        curvePoints.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
        ctx.stroke()
        ctx.shadowBlur = 0

        // Fill under curve
        ctx.beginPath()
        ctx.fillStyle = 'rgba(0,232,135,0.08)'
        curvePoints.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
        ctx.lineTo(curvePoints[curvePoints.length - 1].x, H)
        ctx.lineTo(0, H)
        ctx.closePath()
        ctx.fill()

        // Draw plane
        if (planeImgReady && curvePoints.length > 0) {
          const last = curvePoints[curvePoints.length - 1]
          planeX = last.x; planeY = last.y
          ctx.drawImage(planeImg, planeX - 20, planeY - 20, 40, 40)
        }

        // Draw multiplier
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 56px Exo 2, sans-serif'
        ctx.textAlign = 'center'
        ctx.shadowColor = 'rgba(0,232,135,0.5)'
        ctx.shadowBlur = 20
        ctx.fillText(`${mult.toFixed(2)}x`, W / 2, H / 2)
        ctx.shadowBlur = 0
      } else if (phase === 'crashed') {
        ctx.fillStyle = '#ff4d4d'
        ctx.font = 'bold 56px Exo 2, sans-serif'
        ctx.textAlign = 'center'
        ctx.shadowColor = 'rgba(255,77,77,0.5)'
        ctx.shadowBlur = 20
        ctx.fillText(`${crashedAt.toFixed(2)}x`, W / 2, H / 2)
        ctx.shadowBlur = 0
        ctx.fillStyle = 'rgba(255,77,77,0.6)'
        ctx.font = 'bold 18px Inter, sans-serif'
        ctx.fillText('FLEW AWAY!', W / 2, H / 2 + 40)
      }

      requestAnimationFrame(draw)
    }

    draw()
    return () => window.removeEventListener('resize', resize)
  }, [phase, mult, cd, crashedAt, flightStartTime])

  if (showLoading) return <LoadingScreen progress={loadingProgress} />

  return (
    <div className="av-root" style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <style>{CSS}</style>

      {/* Header */}
      <div className="av-header">
        <div className="av-header-left">
          <button className="av-back" onClick={() => navigate(-1)}><ChevronLeft size={18} /></button>
          <div className="av-logo">
            <div className="av-logo-icon">✈</div>
            <span className="av-logo-text">AVIATOR</span>
          </div>
          <div className="av-live-dot" />
        </div>
        <div className="av-bal">
          <span className="av-bal-label">Balance</span>
          <span className="av-bal-amt">₨{bal.toLocaleString()}</span>
        </div>
      </div>

      {/* Crash history */}
      <div className="av-history">
        {hist.map((v, i) => (
          <span key={i} className={`av-pill ${v < 2 ? 'av-pill-low' : v < 10 ? 'av-pill-mid' : 'av-pill-high'}`}>
            {v.toFixed(2)}x
          </span>
        ))}
      </div>

      {/* Main content */}
      <div className="av-main">
        <div className="av-top-row">
          {/* Bet panels */}
          <div className="av-bets-row">
            <div className="av-panel">
              <BetPanel num={1} amt={b1a} setAmt={setB1a} autoOn={b1o} setAutoOn={setB1o} autoVal={b1v} setAutoVal={setB1v} betData={b1d} phase={phase} mult={mult} bal={bal} onPlace={() => place(1)} onCash={() => cashout(1)} onCancel={() => cancelBet(1)} />
              <BetPanel num={2} amt={b2a} setAmt={setB2a} autoOn={b2o} setAutoOn={setB2o} autoVal={b2v} setAutoVal={setB2v} betData={b2d} phase={phase} mult={mult} bal={bal} onPlace={() => place(2)} onCash={() => cashout(2)} onCancel={() => cancelBet(2)} />

              {/* My history */}
              {myHistory.length > 0 && (
                <div className="av-my-history">
                  <div className="av-my-history-title">My Bets</div>
                  <div className="av-my-history-list">
                    {myHistory.slice(0, 10).map((entry, i) => (
                      <div key={i} className={`av-my-history-item ${entry.won ? 'won' : entry.pending ? 'pending' : 'lost'}`}>
                        <span>₨{entry.amount}</span>
                        <span>{entry.mult ? `${entry.mult.toFixed(2)}x` : entry.pending ? '...' : '-'}</span>
                        <span style={{ color: entry.won ? 'var(--green)' : 'var(--red)' }}>
                          {entry.won ? `+₨${entry.profit}` : `-₨${Math.abs(entry.profit)}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Canvas */}
          <div className="av-canvas">
            <canvas ref={canvasRef} className="av-canvas-el" />
            <div className="av-exit-layer">
              {cashoutExits.map(exit => (
                <div key={exit.id} className="av-exit-item" style={{ left: `${exit.left}%`, top: `${exit.top}%` }}>
                  <div className="av-exit-avatar">{exit.name[0]}</div>
                  <span className="av-exit-name">{exit.name}</span>
                  <span className="av-exit-amt">+₨{exit.profit.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Live bets */}
          <div className="av-live">
            <div className="av-live-head">
              <span className="av-live-title">All Bets</span>
              <span className="av-live-cnt">{live.length}</span>
            </div>
            <div className="av-live-list">
              {live.length === 0 ? (
                <div className="av-live-empty">No bets yet</div>
              ) : (
                live.map(bet => {
                  const isMe = bet.userId === user?.id
                  const statusClass = bet.cashedOut ? 'won' : bet.status === 'lost' ? 'lost' : isMe ? 'isu' : ''
                  return (
                    <div key={bet.id} className={`av-live-item ${statusClass}`}>
                      <span className={`av-live-user ${isMe ? 'isu' : ''}`}>{bet.username}</span>
                      <span className="av-live-amt">₨{bet.amount}</span>
                      {bet.cashedOut ? (
                        <span className="av-live-mult" style={{ color: 'var(--green)' }}>{bet.cashoutMult?.toFixed(2)}x</span>
                      ) : (
                        <span className="av-live-mult" style={{ color: 'var(--yellow)' }}>{bet.autoCashout ? `${bet.autoCashout}x` : '-'}</span>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
