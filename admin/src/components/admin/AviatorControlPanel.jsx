import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { Button, FormField, Input, Select, Toggle } from '../../components/ui/FormElements'
import { Octagon, Settings, BarChart3, ChevronDown, ChevronUp, Loader2, TrendingUp, TrendingDown, Wallet, Zap } from 'lucide-react'

// ── API ──────────────────────────────────────────────────────
async function fetchGameState() {
  try {
    const { data } = await supabase.from('aviator_game_state').select('*').eq('id', 'current').single()
    return data || { phase: 'betting', mult: 1.00, crash_point: null }
  } catch { return { phase: 'betting', mult: 1.00, crash_point: null } }
}

async function fetchBets(limit = 50) {
  try {
    const { data } = await supabase.from('game_bets').select('*').order('created_at', { ascending: false }).limit(limit)
    return data || []
  } catch { return [] }
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

async function fetchPool() {
  try {
    const { data } = await supabase.from('aviator_house_edge').select('*').eq('id', 'pool').single()
    return data || { total_bets: 0, total_winnings_paid: 0, house_edge_pool: 0, gross_pnl: 0, rounds_played: 0 }
  } catch { return { total_bets: 0, total_winnings_paid: 0, house_edge_pool: 0, gross_pnl: 0, rounds_played: 0 } }
}

async function fetchLiveHE() {
  try {
    const { data } = await supabase.from('aviator_live_he').select('*').eq('id', 'metrics').single()
    return data
  } catch { return null }
}

// ── Canvas Preview ───────────────────────────────────────────
function GameCanvas({ phase, mult, crashedAt }) {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const frameRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const draw = () => {
      const dpr = 2
      const cw = canvas.offsetWidth
      const ch = canvas.offsetHeight
      canvas.width = cw * dpr
      canvas.height = ch * dpr
      ctx.scale(dpr, dpr)

      // Background
      ctx.fillStyle = '#0c1220'
      ctx.fillRect(0, 0, cw, ch)

      // Grid
      ctx.strokeStyle = 'rgba(255,255,255,0.03)'
      ctx.lineWidth = 0.5
      for (let i = 0; i < 10; i++) {
        ctx.beginPath(); ctx.moveTo(0, (ch / 10) * i); ctx.lineTo(cw, (ch / 10) * i); ctx.stroke()
        ctx.beginPath(); ctx.moveTo((cw / 10) * i, 0); ctx.lineTo((cw / 10) * i, ch); ctx.stroke()
      }

      // Y-axis labels
      ctx.fillStyle = 'rgba(255,255,255,0.12)'
      ctx.font = 'bold 10px monospace'
      for (let i = 1; i <= 10; i++) {
        const y = ch - (i / 10) * ch * 0.84 - ch * 0.07
        ctx.fillText(`${i}x`, 3, y + 3)
        ctx.strokeStyle = 'rgba(0,232,135,0.06)'
        ctx.beginPath(); ctx.moveTo(20, y); ctx.lineTo(cw, y); ctx.stroke()
      }

      if (phase === 'running') {
        const originX = 5
        const originY = ch * 0.90
        const maxTravelX = Math.max(cw - 220, cw * 0.65)
        const maxTravelY = ch * 0.78
        const progress = Math.min(1, Math.log(mult) / Math.log(50))
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

        // Plane
        ctx.font = '24px sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('✈️', nx, ny)

        // Multiplier text
        let mc = '#00e887'
        if (mult >= 10) mc = '#ff4d4d'
        else if (mult >= 5) mc = '#ffd600'
        ctx.fillStyle = mc
        ctx.font = 'bold 24px sans-serif'
        ctx.shadowColor = mc
        ctx.shadowBlur = 10
        ctx.fillText(`${mult.toFixed(2)}x`, nx + 10, ny + 8)
        ctx.shadowBlur = 0
      } else if (phase === 'crashed') {
        // Explosion particles
        const cx = cw / 2
        const cy = ch / 2
        for (let i = 0; i < 25; i++) {
          const ag = (i / 25) * Math.PI * 2
          const di = 14 + Math.sin(frameRef.current * 0.4 + i) * 12
          ctx.fillStyle = ['#dc2626', '#f97316', '#fde047'][i % 3]
          ctx.globalAlpha = 0.35 + Math.sin(frameRef.current * 0.4 + i) * 0.2
          ctx.beginPath()
          ctx.arc(cx + Math.cos(ag) * di, cy + Math.sin(ag) * di, 1 + Math.random() * 2.5, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1
        frameRef.current++

        // Crashed text
        ctx.font = 'bold 36px sans-serif'
        ctx.fillStyle = '#ff4d4d'
        ctx.shadowColor = '#ff4d4d'
        ctx.shadowBlur = 20
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('CRASHED', cw / 2, ch / 2 - 10)
        ctx.font = 'bold 24px sans-serif'
        ctx.fillText(`${crashedAt?.toFixed(2) || '1.00'}x`, cw / 2, ch / 2 + 25)
        ctx.shadowBlur = 0
      } else {
        // Betting phase
        ctx.font = 'bold 32px sans-serif'
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('NEXT ROUND', cw / 2, ch / 2 - 10)
        ctx.font = '14px sans-serif'
        ctx.fillStyle = 'rgba(255,255,255,0.4)'
        ctx.fillText('Waiting for bets...', cw / 2, ch / 2 + 20)
      }

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current) }
  }, [phase, mult, crashedAt])

  return <canvas ref={canvasRef} className="w-full h-full" />
}

// ── Main Component ───────────────────────────────────────────
export default function AviatorControlPanel() {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState(true)
  const [settings, setSettings] = useState({})
  const [saving, setSaving] = useState(false)
  const [localSettings, setLocalSettings] = useState({})

  // Poll for live data
  const [gs, setGs] = useState({ phase: 'betting', mult: 1.00, crash_point: null })
  const [bets, setBets] = useState([])
  const [pool, setPool] = useState({})
  const [liveHE, setLiveHE] = useState(null)

  useEffect(() => {
    const load = async () => {
      const [g, b, p, s, he] = await Promise.all([
        fetchGameState(), fetchBets(30), fetchPool(), fetchSettings(), fetchLiveHE()
      ])
      setGs(g); setBets(b); setPool(p); setSettings(s); setLocalSettings(s); setLiveHE(he)
    }
    load()
  }, [])

  useEffect(() => {
    const gsIv = setInterval(async () => {
      const g = await fetchGameState()
      if (g) setGs(g)
    }, 1000)
    const betsIv = setInterval(async () => {
      const b = await fetchBets(30)
      setBets(b)
    }, 3000)
    const heIv = setInterval(async () => {
      const he = await fetchLiveHE()
      if (he) setLiveHE(he)
    }, 2000)

    // Realtime
    const channels = []
    try {
      channels.push(supabase.channel('gs-av').on('postgres_changes',
        { event: '*', schema: 'public', table: 'aviator_game_state' },
        (p) => { if (p.new) setGs(p.new) }
      ).subscribe())
    } catch {}
    try {
      channels.push(supabase.channel('bets-av').on('postgres_changes',
        { event: '*', schema: 'public', table: 'game_bets' },
        async () => { const b = await fetchBets(30); setBets(b) }
      ).subscribe())
    } catch {}

    return () => {
      clearInterval(gsIv); clearInterval(betsIv); clearInterval(heIv)
      channels.forEach(ch => { try { supabase.removeChannel(ch) } catch {} })
    }
  }, [])

  const handleCrash = async () => {
    toast.loading('Crashing...', { duration: 300 })
    await sendCrashSignal()
    toast.success('Crash signal sent!')
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    const ok = await saveSettings(localSettings)
    if (ok) {
      setSettings(localSettings)
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

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Zap className="w-6 h-6 text-amber-400" />
          Aviator Game Control
        </h2>
        <button onClick={() => setExpanded(!expanded)} className="text-slate-400 hover:text-white">
          {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {/* Control Bar */}
      <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-4">
          <Button variant="danger" onClick={handleCrash} disabled={gs.phase !== 'running'}
            className={`font-bold px-5 py-2.5 ${gs.phase === 'running' ? 'animate-pulse shadow-lg shadow-red-500/30' : ''}`}>
            <Octagon className="w-5 h-5" /> CRASH NOW
          </Button>

          <div className="flex items-center gap-2">
            <div className={`px-3 py-2 rounded-lg border ${settings.he_mode !== 'off' ? 'bg-emerald-500/15 border-emerald-500/30' : 'bg-slate-800/50 border-slate-700/50'}`}>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${settings.he_mode !== 'off' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600'}`} />
                <span className={`text-xs ${settings.he_mode !== 'off' ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {settings.he_mode !== 'off' ? 'Auto Active' : 'Auto OFF'}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="px-2 py-1 bg-slate-800/50 rounded">
              <span className="text-slate-500">Real:</span>
              <span className="text-white font-bold ml-1">₹{realTotal.toLocaleString()}</span>
            </div>
            <div className="px-2 py-1 bg-slate-800/50 rounded">
              <span className="text-slate-500">Remaining:</span>
              <span className={`font-bold ml-1 ${remainingPct <= (settings.he_target_pct || 5) ? 'text-red-400' : 'text-emerald-400'}`}>
                {remainingPct.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Game Preview */}
      <div className="relative w-full aspect-video bg-slate-950 rounded-xl overflow-hidden border border-slate-700/50">
        <GameCanvas phase={gs.phase} mult={gs.mult || 1.00} crashedAt={gs.crash_point || gs.crashed_at} />
        <div className="absolute top-3 left-3">
          <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
            gs.phase === 'running' ? 'bg-emerald-500/20 text-emerald-400' :
            gs.phase === 'crashed' ? 'bg-red-500/20 text-red-400' :
            'bg-amber-500/20 text-amber-400'
          }`}>
            {gs.phase?.toUpperCase() || 'BETTING'}
          </span>
        </div>
      </div>

      {/* Live Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Real Users', value: realBets.length, color: 'text-blue-400', bg: 'bg-blue-500/15' },
          { label: 'Bots', value: botBets.length, color: 'text-purple-400', bg: 'bg-purple-500/15' },
          { label: 'Real Bets', value: `₹${realTotal.toLocaleString()}`, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
          { label: 'Cashed Out', value: `₹${cashedTotal.toLocaleString()}`, color: 'text-cyan-400', bg: 'bg-cyan-500/15' },
        ].map((s, i) => (
          <div key={s.label} className={`${s.bg} border border-slate-700/50 rounded-xl p-3`}>
            <p className="text-[10px] text-slate-400 uppercase">{s.label}</p>
            <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Expandable Settings */}
      {expanded && (
        <div className="space-y-4">
          {/* Pool Stats */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Total Bets', val: `₹${Number(pool.total_bets || 0).toLocaleString()}`, c: 'text-blue-400' },
              { label: 'Winnings', val: `₹${Number(pool.total_winnings_paid || 0).toLocaleString()}`, c: 'text-emerald-400' },
              { label: 'HE Pool', val: `₹${Number(pool.house_edge_pool || 0).toLocaleString()}`, c: 'text-amber-400' },
              { label: 'Rounds', val: pool.rounds_played || 0, c: 'text-purple-400' },
            ].map(s => (
              <div key={s.label} className="bg-slate-800/30 border border-slate-700/30 rounded-lg p-3 text-center">
                <p className="text-[10px] text-slate-500">{s.label}</p>
                <p className={`text-lg font-bold ${s.c}`}>{s.val}</p>
              </div>
            ))}
          </div>

          <div className={`p-4 rounded-xl border ${(pool.gross_pnl || 0) >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
            <p className="text-xs text-slate-400">Gross P&L</p>
            <p className={`text-2xl font-bold ${(pool.gross_pnl || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              ₹{Number(pool.gross_pnl || 0).toLocaleString('en-IN')}
            </p>
          </div>

          {/* Settings Form */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Settings className="w-4 h-4" /> HE Configuration
            </h4>
            <FormField label={`House Edge (${((localSettings.house_edge || 0.05) * 100).toFixed(1)}%)`}>
              <div className="flex items-center gap-3">
                <input type="range" min="0.01" max="0.20" step="0.01"
                  value={localSettings.house_edge || 0.05}
                  onChange={e => setLocalSettings(s => ({ ...s, house_edge: parseFloat(e.target.value) }))}
                  className="flex-1 accent-emerald-500" />
                <Input type="number" min="1" max="20" step="0.5"
                  value={((localSettings.house_edge || 0.05) * 100).toFixed(1)}
                  onChange={e => setLocalSettings(s => ({ ...s, house_edge: parseFloat(e.target.value) / 100 }))}
                  className="w-20" />
              </div>
            </FormField>
            <FormField label="HE Mode">
              <Select value={localSettings.he_mode || 'off'} onChange={e => setLocalSettings(s => ({ ...s, he_mode: e.target.value }))}>
                <option value="off">Off (Random)</option>
                <option value="smart">Smart Auto</option>
                <option value="aggressive">Aggressive</option>
              </Select>
            </FormField>
            {localSettings.he_mode !== 'off' && (
              <>
                <FormField label={`Auto-Crash Target (${localSettings.he_target_pct || 5}%)`}>
                  <div className="flex items-center gap-3">
                    <input type="range" min="1" max="20" step="1"
                      value={localSettings.he_target_pct || 5}
                      onChange={e => setLocalSettings(s => ({ ...s, he_target_pct: parseInt(e.target.value) }))}
                      className="flex-1 accent-amber-500" />
                    <Input type="number" min="1" max="20"
                      value={localSettings.he_target_pct || 5}
                      onChange={e => setLocalSettings(s => ({ ...s, he_target_pct: parseInt(e.target.value) }))}
                      className="w-16" />
                  </div>
                </FormField>
                <div className="grid grid-cols-2 gap-3">
                  <FormField label="Min Flight (sec)">
                    <Input type="number" min="1" max="30" value={localSettings.he_min_secs || 3}
                      onChange={e => setLocalSettings(s => ({ ...s, he_min_secs: parseInt(e.target.value) }))} />
                  </FormField>
                  <FormField label="Max Flight (sec)">
                    <Input type="number" min="5" max="120" value={localSettings.he_max_secs || 50}
                      onChange={e => setLocalSettings(s => ({ ...s, he_max_secs: parseInt(e.target.value) }))} />
                  </FormField>
                </div>
              </>
            )}
            <Button onClick={handleSaveSettings} disabled={saving} className="w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
              Save Settings
            </Button>
          </div>

          {/* Live Bets Table */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
            <div className="p-3 border-b border-slate-700/50 flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">Live Bets</h4>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="text-blue-400">{realBets.length} real</span>
                <span>•</span>
                <span className="text-purple-400">{botBets.length} bots</span>
              </div>
            </div>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700/50">
                    <th className="text-left px-3 py-2 text-[10px] text-slate-400 uppercase">Player</th>
                    <th className="text-left px-3 py-2 text-[10px] text-slate-400 uppercase">Amount</th>
                    <th className="text-left px-3 py-2 text-[10px] text-slate-400 uppercase">Auto</th>
                    <th className="text-left px-3 py-2 text-[10px] text-slate-400 uppercase">Status</th>
                    <th className="text-left px-3 py-2 text-[10px] text-slate-400 uppercase">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {bets.slice(0, 20).map((bet, i) => (
                    <tr key={bet.id || i} className={`hover:bg-slate-800/30 transition-colors ${!bet.is_bot ? 'bg-blue-500/5' : 'opacity-60'}`}>
                      <td className="px-3 py-1.5">
                        <span className={`text-xs font-medium ${!bet.is_bot ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {bet.username || 'Anon'}
                          {bet.is_bot && <span className="text-[8px] text-slate-600 ml-1">BOT</span>}
                        </span>
                      </td>
                      <td className="px-3 py-1.5">
                        <span className="text-xs font-bold text-white">₹{Number(bet.amount || 0).toLocaleString()}</span>
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
                          <span className="text-xs font-bold text-emerald-400">+₹{Number(bet.cashout_amount || 0).toLocaleString()}</span>
                        ) : bet.status === 'lost' ? (
                          <span className="text-xs font-bold text-red-400">-₹{Number(bet.amount || 0)}</span>
                        ) : (
                          <span className="text-xs text-slate-600">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
