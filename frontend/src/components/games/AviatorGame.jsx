/**
 * AviatorGame.jsx — Full-featured Aviator Crash Game
 * Backend WebSocket for real-time state, REST API for bets/cashouts.
 * Canvas-based rendering with plane image, trail, explosions.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { ChevronLeft } from 'lucide-react'
import { aviatorWS } from '../../api/aviatorWebSocket'

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
  .av-loading-icon { width:72px;height:72px;border-radius:18px; background:linear-gradient(135deg,#ff4d4d,#ff8c00); display:flex;align-items:center;justify-content:center; box-shadow:0 0 50px rgba(255,77,77,0.4); margin-bottom:28px; font-size:36px; }
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
  .av-my-history { flex-shrink:0;display:flex;align-items:center;gap:0; padding:0; background:var(--bg-secondary); border-top:1px solid var(--border); overflow-x:auto;white-space:nowrap;max-height:48px; scrollbar-width:none; }
  .av-my-history::-webkit-scrollbar{display:none}
  .av-my-history-title { font-size:8px;font-weight:700;color:rgba(255,255,255,.25); text-transform:uppercase;letter-spacing:.1em;flex-shrink:0; padding:0 10px;display:flex;align-items:center;height:100%; border-right:1px solid var(--border); }
  .av-my-h-item { flex-shrink:0;display:inline-flex;align-items:center;gap:5px; padding:5px 10px; font-size:9px;font-weight:600; border-right:1px solid rgba(255,255,255,.03); transition:background .1s; }
  .av-my-h-item.won{color:var(--green);background:var(--green-dim)}
  .av-my-h-item.lost{color:var(--red);background:var(--red-dim)}
  .av-my-h-item.pending{color:var(--yellow);background:rgba(255,214,0,.06)}
  .av-my-h-time{font-size:7px;color:rgba(255,255,255,.25);font-weight:500}
  .av-my-h-amt{font-weight:800;font-size:10px}
  .av-my-h-mult{font-weight:800;font-size:9px}
  .av-my-h-profit{font-weight:800;font-size:9px}
  .av-panel { flex:1;display:flex;flex-direction:column;gap:7px; padding:8px 6px;overflow-y:auto; max-width:210px; scrollbar-width:none; }
  .av-panel::-webkit-scrollbar{display:none}
  .av-card { background:var(--bg-panel);border:1px solid var(--border); border-radius:11px;padding:11px; backdrop-filter:blur(12px); transition:border-color .15s; }
  .av-card:hover{border-color:var(--border-active)}
  .av-card.green{border-color:rgba(0,232,135,.18)}
  .av-card.red{border-color:rgba(255,77,77,.18)}
  .av-card-head { display:flex;align-items:center;justify-content:space-between;margin-bottom:7px; }
  .av-card-label{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.1em}
  .av-card-label.g{color:var(--green)}
  .av-card-label.r{color:var(--red)}
  .av-card-won{font-size:9px;font-weight:700;color:var(--yellow)}
  .av-quick{display:grid;grid-template-columns:repeat(4,1fr);gap:4px;margin-bottom:7px;}
  .av-qbtn { padding:8px 0;border-radius:6px; font-size:11px;font-weight:700; background:rgba(255,255,255,.04);color:rgba(255,255,255,.55); border:1px solid rgba(255,255,255,.07);cursor:pointer; transition:all .12s; }
  .av-qbtn:hover{background:rgba(255,255,255,.09);color:#fff}
  .av-qbtn.on{background:var(--green);color:#0c1220;border-color:var(--green)}
  .av-amt-row { display:flex;align-items:center;gap:3px; background:rgba(0,0,0,.28); border:1px solid rgba(255,255,255,.07); border-radius:7px;padding:5px 9px;margin-bottom:7px; }
  .av-amt-sym{font-size:12px;color:rgba(255,255,255,.28);font-weight:600}
  .av-amt-input { flex:1;background:transparent;border:none;outline:none; font-family:'Exo 2',sans-serif;font-size:15px;font-weight:800; color:var(--text);text-align:center;width:100%; }
  .av-amt-input:disabled{opacity:.28}
  .av-amt-inc { width:32px;height:32px;border-radius:6px; background:rgba(255,255,255,.04);border:none; color:rgba(255,255,255,.45);cursor:pointer; font-size:16px;display:flex;align-items:center;justify-content:center; transition:background .12s; }
  .av-amt-inc:hover{background:rgba(255,255,255,.09);color:#fff}
  .av-auto-row{display:flex;align-items:center;gap:5px;margin-bottom:9px;}
  .av-auto-btn { padding:6px 12px;border-radius:6px;border:none;cursor:pointer; font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.04em; background:rgba(255,255,255,.04);color:rgba(255,255,255,.45); border:1px solid rgba(255,255,255,.09);transition:all .12s; }
  .av-auto-btn.on{background:var(--green);color:#0c1220;border-color:var(--green)}
  .av-auto-presets{display:flex;gap:3px;flex:1;}
  .av-auto-p { flex:1;padding:6px 2px;border-radius:5px;border:none;cursor:pointer; font-size:9px;font-weight:700; background:rgba(255,255,255,.04);color:rgba(255,255,255,.35); transition:all .12s; }
  .av-auto-p.on{background:var(--green);color:#0c1220}
  .av-betbtn { width:100%;padding:14px;border-radius:10px; font-family:'Exo 2',sans-serif;font-size:14px;font-weight:800; letter-spacing:.04em;text-transform:uppercase;border:none;cursor:pointer; transition:all .12s; }
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
        <div className="av-wait-label">Bet Placed</div>
        <div className="av-wait-amt">₨{betData.amount}</div>
      </div>
    )
  }

  return (
    <div className={`av-card ${g ? 'green' : 'red'}`}>
      <div className="av-card-head">
        <span className={`av-card-label ${g ? 'g' : 'r'}`}>BET {num}</span>
        {won != null && <span className="av-card-won">+₨{won.toLocaleString()}</span>}
      </div>
      <div className="av-quick">
        {QUICK_BET.map(a => (
          <button key={a} className={`av-qbtn ${amt === a && !hasBet ? 'on' : ''}`} onClick={() => setAmt(a)} disabled={hasBet}>
            {a >= 1000 ? `${a / 1000}k` : a}
          </button>
        ))}
      </div>
      <div className="av-amt-row">
        <span className="av-amt-sym">₨</span>
        <input type="number" className="av-amt-input" value={amt} onChange={e => setAmt(Math.max(MIN_BET, Math.min(MAX_BET, parseInt(e.target.value) || MIN_BET)))} disabled={hasBet} min={MIN_BET} max={MAX_BET} />
        <button className="av-amt-inc" onClick={() => setAmt(Math.min(MAX_BET, Math.min(bal, amt + 100)))} disabled={hasBet}>+</button>
      </div>
      <div className="av-auto-row">
        <button className={`av-auto-btn ${autoOn ? 'on' : ''}`} onClick={() => setAutoOn(o => !o)} disabled={hasBet}>Auto</button>
        {autoOn && (
          <div className="av-auto-presets">
            {AUTO_PRESETS.map(p => (
              <button key={p} className={`av-auto-p ${autoVal === p ? 'on' : ''}`} onClick={() => setAutoVal(p)} disabled={hasBet}>{p}x</button>
            ))}
          </div>
        )}
      </div>
      {actionBtn}
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────
function histClass(v) {
  const n = typeof v === 'number' ? v : parseFloat(v)
  if (n >= 10) return 'av-pill-high'
  if (n >= 2) return 'av-pill-mid'
  return 'av-pill-low'
}

// ── Main Component ────────────────────────────────────────────
export default function AviatorGame() {
  const navigate = useNavigate()
  const { user, isLoggedIn, updateBalance, refreshUser } = useAuth()
  const toast = useToast()

  const [showLoading, setShowLoading] = useState(true)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [phase, setPhase] = useState('betting')
  const [mult, setMult] = useState(1.00)
  const [cd, setCd] = useState(8)
  const [crashedAt, setCrashedAt] = useState(null)
  const [bal, setBal] = useState(10000)
  const [live, setLive] = useState([])
  const [hist, setHist] = useState([])
  const [myHistory, setMyHistory] = useState([])
  const [cashoutExits, setCashoutExits] = useState([])
  const exitCountRef = useRef(0)

  const [b1a, setB1a] = useState(10)
  const [b1o, setB1o] = useState(false)
  const [b1v, setB1v] = useState('2.00')
  const [b1d, setB1d] = useState(null)
  const [b2a, setB2a] = useState(10)
  const [b2o, setB2o] = useState(false)
  const [b2v, setB2v] = useState('2.00')
  const [b2d, setB2d] = useState(null)

  const phaseRef = useRef('betting')
  const canvasRef = useRef(null)

  useEffect(() => {
    if (user?.balance !== undefined) setBal(user.balance)
  }, [user])

  useEffect(() => { phaseRef.current = phase }, [phase])

  // ── WebSocket connection ──
  useEffect(() => {
    if (showLoading) return
    aviatorWS.connect()

    aviatorWS.on('game_state', (state) => {
      if (state.phase === 'betting') {
        phaseRef.current = 'betting'
        setPhase('betting')
        setCd(parseFloat(state.countdown) || 8)
        setCrashedAt(null)
      } else if (state.phase === 'flying') {
        phaseRef.current = 'running'
        setPhase('running')
        setMult(parseFloat(state.mult) || 1.00)
      } else if (state.phase === 'crashed') {
        phaseRef.current = 'crashed'
        setPhase('crashed')
        const cp = parseFloat(state.crash_point) || 1.00
        setCrashedAt(cp)
        setMult(cp)
        setHist(prev => {
          if (prev.includes(cp)) return prev
          return [cp, ...prev].slice(0, 30)
        })
      }
      if (state.crashHistory && Array.isArray(state.crashHistory)) {
        setHist(state.crashHistory.slice(0, 30))
      }
    })

    aviatorWS.on('bets_update', (data) => {
      try {
        const betsArray = Array.isArray(data) ? data : (data?.bets && Array.isArray(data.bets) ? data.bets : [])
        setLive(betsArray)

        // Check if my bet was auto-cashed by the server
        const myBet = betsArray.find(b => b.userId === user?.id && b.betNum === 1 && b.cashedOut && b.status === 'won')
        if (myBet && b1d && !b1d.cashed) {
          const won = myBet.winAmount || 0
          setBal(prev => prev + won)
          setB1d({ ...b1d, cashed: { won } })
          setMyHistory(prev => prev.map(entry => {
            if (entry.pending && entry.betId === myBet.id) {
              return { ...entry, mult: myBet.cashoutMult, won: true, profit: won, pending: false }
            }
            return entry
          }))
          addCashoutExit(user?.username || 'You', won)
          updateBalance(bal + won)
          toast.success(`Auto cashed ${myBet.cashoutMult.toFixed(2)}x — +₨${won.toLocaleString()}`)
        }

        const myBet2 = betsArray.find(b => b.userId === user?.id && b.betNum === 2 && b.cashedOut && b.status === 'won')
        if (myBet2 && b2d && !b2d.cashed) {
          const won = myBet2.winAmount || 0
          setBal(prev => prev + won)
          setB2d({ ...b2d, cashed: { won } })
          setMyHistory(prev => prev.map(entry => {
            if (entry.pending && entry.betId === myBet2.id) {
              return { ...entry, mult: myBet2.cashoutMult, won: true, profit: won, pending: false }
            }
            return entry
          }))
          addCashoutExit(user?.username || 'You', won)
          updateBalance(bal + won)
          toast.success(`Auto cashed ${myBet2.cashoutMult.toFixed(2)}x — +₨${won.toLocaleString()}`)
        }
      } catch (e) {
        setLive([])
      }
    })

    return () => {}
  }, [showLoading])

  // ── Round transitions ──
  const prevPhaseRef = useRef('betting')
  useEffect(() => {
    const prev = prevPhaseRef.current
    prevPhaseRef.current = phase

    if (phase === 'crashed' && prev !== 'crashed') {
      setMyHistory(h => h.map(entry => {
        if (entry.pending && !entry.won) {
          return { ...entry, won: false, pending: false, mult: null, profit: -entry.amount }
        }
        return entry
      }))
    }
    if (phase === 'betting' && prev === 'crashed') {
      setB1d(null)
      setB2d(null)
    }
  }, [phase])

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

  const prevLiveRef = useRef([])
  useEffect(() => {
    if (prevLiveRef.current.length > 0) {
      const prevMap = new Map(prevLiveRef.current.map(b => [b.id, b]))
      live.forEach(b => {
        const prev = prevMap.get(b.id)
        if (prev && prev.status === 'pending' && b.status === 'won' && b.username !== user?.username) {
          const won = Number(b.winAmount || b.win_amount || 0)
          addCashoutExit(b.username, won)
        }
      })
    }
    prevLiveRef.current = [...live]
  }, [live, addCashoutExit, user])

  // ── Bet placement ──
  const place = useCallback(async (num) => {
    if (!isLoggedIn) { navigate('/login', { state: { from: '/play/aviator' } }); return }
    const amount = num === 1 ? b1a : b2a
    if (amount < MIN_BET) { toast.error(`Min ₨${MIN_BET}`); return }
    if (amount > MAX_BET) { toast.error(`Max ₨${MAX_BET}`); return }
    if (amount > bal) { toast.error('Low balance'); return }
    if (phaseRef.current !== 'betting') { toast.error('Wait for next round'); return }

    const autoCashout = (num === 1 ? b1o : b2o) ? parseFloat(num === 1 ? b1v : b2v) : null
    setBal(prev => prev - amount)

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
        }, ...prev].slice(0, 15))
        toast.success(`Bet ${num}: ₨${amount} placed`)
      } else {
        setBal(prev => prev + amount)
        toast.error(result.error || 'Failed to place bet')
      }
    } catch (err) {
      setBal(prev => prev + amount)
      toast.error('Failed to place bet')
    }
  }, [isLoggedIn, b1a, b1o, b1v, b2a, b2o, b2v, bal, user, navigate, toast])

  // ── Cashout ──
  const cashout = useCallback(async (num) => {
    if (phaseRef.current !== 'running') return
    const betData = num === 1 ? b1d : b2d
    if (!betData || betData.cashed) return

    try {
      const response = await fetch(`${API_URL}/api/aviator/cashout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, betNum: num }),
      })
      const result = await response.json()
      if (result.success) {
        const won = result.winAmount
        setBal(prev => prev + won)
        const setter = num === 1 ? setB1d : setB2d
        setter({ ...betData, cashed: { won } })
        setMyHistory(prev => prev.map(entry => {
          if (entry.pending && entry.betId === betData.id) {
            return { ...entry, mult: result.multiplier, won: true, profit: won, pending: false }
          }
          return entry
        }))
        addCashoutExit(user?.username || 'You', won)
        toast.success(`Cashed ${result.multiplier.toFixed(2)}x — +₨${won.toLocaleString()}`)
      } else {
        toast.error(result.error || 'Failed to cash out')
      }
    } catch (err) {
      toast.error('Failed to cash out')
    }
  }, [b1d, b2d, user, toast, addCashoutExit])

  // ── Cancel bet ──
  const cancelBet = useCallback(async (num) => {
    const betData = num === 1 ? b1d : b2d
    if (!betData) return
    if (phaseRef.current !== 'betting') { toast.error('Can only cancel during betting phase'); return }

    // Remove from backend
    try {
      await fetch(`${API_URL}/api/aviator/cancel-bet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.id, betNum: num, betId: betData.id })
      })
    } catch (e) {}

    const newBal = bal + betData.amount
    setBal(prev => prev + betData.amount)
    if (num === 1) setB1d(null); else setB2d(null)
    setMyHistory(prev => prev.filter(entry => entry.betId !== betData.id))
    toast.success('Bet cancelled')
  }, [b1d, b2d, bal, user, toast])

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
      frameCount++
      const currentPhase = phaseRef.current
      const currentMult = mult

      if (!bgCanvas || W === 0 || H === 0) {
        raf = requestAnimationFrame(draw)
        return
      }

      ctx.clearRect(0, 0, W, H)
      ctx.drawImage(bgCanvas, 0, 0)

      if (currentPhase === 'running' && currentMult > 1) {
        const originX = 5, originY = H * 0.90
        const maxTravelX = Math.max(W - 220, W * 0.65), maxTravelY = H * 0.78
        const progress = Math.min(1, Math.log(currentMult) / Math.log(50))
        const eased = Math.pow(progress, 0.6)
        const nx = originX + eased * maxTravelX
        const ny = originY - eased * maxTravelY
        const endX = nx - 15, endY = ny + 5
        const cpx = (originX + endX) * 0.5, cpy = originY - (originY - endY) * 0.08

        // Trail glow
        ctx.strokeStyle = 'rgba(0,255,157,0.18)'; ctx.lineWidth = 10; ctx.lineCap = 'round'
        ctx.beginPath(); ctx.moveTo(originX, originY); ctx.quadraticCurveTo(cpx, cpy, endX, endY); ctx.stroke()
        // Trail line
        ctx.strokeStyle = '#00ff9d'; ctx.lineWidth = 3
        ctx.beginPath(); ctx.moveTo(originX, originY); ctx.quadraticCurveTo(cpx, cpy, endX, endY); ctx.stroke()

        planeX = nx; planeY = ny

        // Draw plane image
        if (planeImgReady) {
          ctx.save()
          ctx.translate(nx, ny)
          ctx.rotate(-0.3)
          ctx.drawImage(planeImg, -40, -20, 80, 40)
          ctx.restore()
        }

        // Multiplier text
        const mc = currentMult >= 10 ? '#ff4d4d' : currentMult >= 5 ? '#ffd600' : '#00e887'
        ctx.fillStyle = mc; ctx.font = 'bold 24px sans-serif'
        ctx.fillText(`${currentMult.toFixed(2)}x`, nx + 10, ny + 8)
      }

      // Explosion on crash
      if (currentPhase === 'crashed' && planeX > 0) {
        for (let i = 0; i < 15; i++) {
          const ag = (i / 15) * Math.PI * 2
          const di = 14 + Math.sin(frameCount * 0.4 + i) * 12
          ctx.fillStyle = ['#dc2626', '#f97316', '#fde047'][i % 3]
          ctx.globalAlpha = 0.35 + Math.sin(frameCount * 0.4 + i) * 0.2
          ctx.beginPath(); ctx.arc(planeX + Math.cos(ag) * di, planeY + Math.sin(ag) * di, 2, 0, Math.PI * 2); ctx.fill()
        }
        ctx.globalAlpha = 1
      }

      // Reset plane when not running
      if (currentPhase !== 'running') {
        if (planeX !== 0) { planeX = 0; planeY = 0; frameCount = 0 }
        bgCanvas = buildBg(W, H)
      }

      raf = requestAnimationFrame(draw)
    }

    let raf = requestAnimationFrame(draw)
    return () => { window.removeEventListener('resize', resize); cancelAnimationFrame(raf) }
  }, [showLoading, phase, mult])

  // ── Render ──
  return (
    <>
      <style>{CSS}</style>
      <div className="av-root" style={{ width: '100%', height: '100dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {showLoading && <LoadingScreen progress={loadingProgress} />}

        {!showLoading && (
          <>
            {/* Header */}
            <div className="av-header">
              <div className="av-header-left">
                <button className="av-back" onClick={() => navigate(-1)}><ChevronLeft size={15} /></button>
                <div className="av-logo">
                  <div className="av-logo-icon">✈</div>
                  <span className="av-logo-text">Aviator</span>
                  <div className="av-live-dot" />
                </div>
              </div>
              <div className="av-bal">
                <span className="av-bal-label">Balance</span>
                <span className="av-bal-amt">₨{bal.toLocaleString()}</span>
              </div>
            </div>

            {/* Crash History */}
            <div className="av-history">
              {hist.length === 0 && <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', paddingRight: 6 }}>Waiting...</span>}
              {hist.map((h, i) => (
                <div key={`${h}-${i}`} className={`av-pill ${histClass(h)}`}>
                  {typeof h === 'number' ? h.toFixed(2) : h}x
                </div>
              ))}
            </div>

            {/* Main Content */}
            <div className="av-main">
              <div className="av-top-row">
                {/* Canvas */}
                <div className="av-canvas">
                  <canvas ref={canvasRef} className="av-canvas-el" />

                  {/* Exit popups */}
                  <div className="av-exit-layer">
                    {cashoutExits.map(e => (
                      <div key={e.id} className="av-exit-item" style={{ left: `${e.left}%`, top: `${e.top}%` }}>
                        <div className="av-exit-avatar">{(e.name || '?')[0].toUpperCase()}</div>
                        <span className="av-exit-name">{e.name}</span>
                        <span className="av-exit-amt">+₨{e.profit.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>

                  {/* Overlay: countdown / crash */}
                  <div className="av-overlay">
                    {phase === 'betting' && (
                      <div className="av-cd-box">
                        <div className="av-cd-num">{cd.toFixed(1)}</div>
                        <div className="av-cd-label">Place your bets</div>
                      </div>
                    )}
                    {phase === 'crashed' && crashedAt && (
                      <div className="av-crash-val">{crashedAt.toFixed(2)}x</div>
                    )}
                  </div>
                </div>

                {/* Live Bets */}
                <div className="av-live">
                  <div className="av-live-head">
                    <div className="av-live-dot" />
                    <span className="av-live-title">Live</span>
                    <span className="av-live-cnt">{live.length}</span>
                  </div>
                  <div className="av-live-list">
                    {live.length === 0 ? (
                      <div className="av-live-empty">Waiting for bets...</div>
                    ) : live.map(b => (
                      <div key={b.id} className={`av-live-item ${!b.is_bot ? 'isu' : ''} ${b.status === 'won' ? 'won' : b.status === 'lost' ? 'lost' : 'pending'}`}>
                        <span className={`av-live-user ${!b.is_bot ? 'isu' : ''}`}>{b.username}</span>
                        <span className="av-live-amt">₨{Number(b.amount || 0).toLocaleString()}</span>
                        <span className="av-live-mult" style={{ color: b.status === 'won' ? 'var(--yellow)' : b.autoCashout ? 'rgba(255,214,0,.45)' : 'rgba(255,255,255,.2)' }}>
                          {b.status === 'won' ? `${Number(b.cashoutMult || 0).toFixed(2)}x`
                            : b.autoCashout ? `A:${Number(b.autoCashout).toFixed(1)}` : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bet Panels */}
              <div className="av-bets-row">
                <div className="av-panel">
                  <BetPanel num={1} amt={b1a} setAmt={setB1a} autoOn={b1o} setAutoOn={setB1o} autoVal={b1v} setAutoVal={setB1v} betData={b1d} phase={phase} mult={mult} bal={bal} onPlace={() => place(1)} onCash={() => cashout(1)} onCancel={() => cancelBet(1)} />
                </div>
                <div className="av-panel">
                  <BetPanel num={2} amt={b2a} setAmt={setB2a} autoOn={b2o} setAutoOn={setB2o} autoVal={b2v} setAutoVal={setB2v} betData={b2d} phase={phase} mult={mult} bal={bal} onPlace={() => place(2)} onCash={() => cashout(2)} onCancel={() => cancelBet(2)} />
                </div>
              </div>

              {/* My Betting History */}
              <div className="av-my-history">
                <span className="av-my-history-title">My Bets</span>
                {myHistory.length === 0 ? (
                  <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)', padding: '0 10px', flexShrink: 0, height: '100%', display: 'flex', alignItems: 'center' }}>Place a bet to start</span>
                ) : myHistory.map((h, i) => (
                  <div key={`${h.amount}-${h.pending ? 'p' : 'r'}-${i}`} className={`av-my-h-item ${h.pending ? 'pending' : h.won ? 'won' : 'lost'}`}>
                    <span className="av-my-h-time">{h.time || ''}</span>
                    <span className="av-my-h-amt">₨{Number(h.amount).toLocaleString()}</span>
                    {h.pending ? (
                      <span className="av-my-h-mult" style={{ color: 'rgba(255,214,0,0.6)' }}>playing</span>
                    ) : h.won ? (
                      <>
                        <span className="av-my-h-mult" style={{ color: 'var(--green)' }}>{(h.mult || 0).toFixed(2)}x</span>
                        <span className="av-my-h-profit" style={{ color: 'var(--green)' }}>+₨{Number(h.profit).toLocaleString()}</span>
                      </>
                    ) : (
                      <span className="av-my-h-profit" style={{ color: 'var(--red)' }}>-₨{Number(h.amount).toLocaleString()}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
