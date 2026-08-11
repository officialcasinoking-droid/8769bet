import { useState, memo } from 'react'

const QUICK_BET = [6, 10, 20, 50, 100, 200, 500]
const MIN_BET = 6
const MAX_BET = 1000
const AUTO_PRESETS = ['2.00', '3.00', '4.00', '5.00', '8.00', '10.00', '20.00']

const AviatorBetPanel = memo(function AviatorBetPanel({ num, amt, setAmt, autoOn, setAutoOn, autoVal, setAutoVal, betData, phase, mult, bal, onPlace, onCash, onCancel }) {
  const hasBet = !!betData
  const isBetting = phase === 'betting'
  const isRunning = phase === 'running'
  const isCrashed = phase === 'crashed'
  const cashed = betData?.cashed
  const isUser = num === 1
  const won = cashed ? cashed.won : null
  const cashAmt = hasBet && !cashed ? Math.floor(betData.amount * mult) : 0

  let actionBtn = null
  if (!hasBet) {
    const canPlace = isBetting && amt >= MIN_BET && amt <= MAX_BET && amt <= bal
    actionBtn = (
      <button
        className={`w-full py-3.5 rounded-xl font-['Exo_2'] text-sm font-extrabold uppercase tracking-wider transition-all duration-200 ${
          isUser
            ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 text-gray-900 shadow-[0_4px_20px_rgba(0,232,135,0.3)] hover:shadow-[0_4px_30px_rgba(0,232,135,0.5)] hover:-translate-y-0.5'
            : 'bg-gradient-to-br from-blue-400 to-blue-500 text-white shadow-[0_4px_20px_rgba(59,130,246,0.3)] hover:shadow-[0_4px_30px_rgba(59,130,246,0.5)] hover:-translate-y-0.5'
        } ${!canPlace ? 'opacity-30 cursor-not-allowed !transform-none !shadow-none' : 'cursor-pointer'}`}
        disabled={!canPlace}
        onClick={onPlace}
      >
        {!isBetting ? 'Wait...' : amt < MIN_BET ? `Min ₨${MIN_BET}` : amt > MAX_BET ? `Max ₨${MAX_BET}` : amt > bal ? 'Low Balance' : `Bet ₨${amt}`}
      </button>
    )
  } else if (cashed) {
    actionBtn = (
      <div className="w-full py-2 rounded-xl text-center border border-emerald-500/20 bg-emerald-500/10">
        <div className="text-[9px] font-bold uppercase tracking-wider text-emerald-400">Cashed Out</div>
        <div className="font-['Exo_2'] text-base font-black text-emerald-400">+₨{won.toLocaleString()}</div>
      </div>
    )
  } else if (isRunning) {
    actionBtn = (
      <button
        className="w-full py-3.5 rounded-xl font-['Exo_2'] text-sm font-extrabold uppercase tracking-wider bg-gradient-to-br from-amber-400 to-orange-500 text-gray-900 shadow-[0_4px_20px_rgba(251,191,36,0.3)] hover:shadow-[0_4px_30px_rgba(251,191,36,0.5)] hover:-translate-y-0.5 cursor-pointer animate-pulse"
        onClick={onCash}
      >
        Cash ₨{cashAmt}
      </button>
    )
  } else if (isCrashed) {
    actionBtn = (
      <div className="w-full py-2 rounded-xl text-center border border-red-500/20 bg-red-500/10">
        <div className="text-[9px] font-bold uppercase tracking-wider text-red-400">Lost</div>
        <div className="font-['Exo_2'] text-base font-black text-red-400">-₨{betData.amount}</div>
      </div>
    )
  } else if (isBetting) {
    actionBtn = (
      <button
        className="w-full py-3.5 rounded-xl font-['Exo_2'] text-sm font-extrabold uppercase tracking-wider bg-gradient-to-br from-amber-400 to-orange-500 text-gray-900 shadow-[0_4px_20px_rgba(245,158,11,0.3)] hover:shadow-[0_4px_30px_rgba(245,158,11,0.5)] hover:-translate-y-0.5 cursor-pointer"
        onClick={onCancel}
      >
        Cancel ₨{betData.amount}
      </button>
    )
  }

  return (
    <div className={`flex-1 flex flex-col gap-2 p-2.5 rounded-2xl border backdrop-blur-xl ${
      isUser ? 'border-emerald-500/10 bg-emerald-500/[0.04]' : 'border-blue-500/10 bg-blue-500/[0.04]'
    }`}>
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-extrabold uppercase tracking-[0.1em] ${isUser ? 'text-emerald-400' : 'text-blue-400'}`}>
          Bet {num}
        </span>
        {won != null && <span className="text-[9px] font-bold text-amber-400">+₨{won.toLocaleString()}</span>}
      </div>

      {/* Quick bet */}
      <div className="grid grid-cols-4 gap-1">
        {QUICK_BET.map(a => (
          <button
            key={a}
            className={`py-1.5 rounded-lg text-[11px] font-bold border transition-all duration-150 cursor-pointer ${
              amt === a && !hasBet
                ? `${isUser ? 'bg-emerald-500 text-gray-900 border-emerald-500' : 'bg-blue-500 text-white border-blue-500'}`
                : 'bg-white/[0.03] text-white/50 border-white/[0.06] hover:bg-white/[0.08] hover:text-white'
            }`}
            onClick={() => setAmt(a)}
            disabled={hasBet}
          >
            {a >= 1000 ? `${a / 1000}k` : a}
          </button>
        ))}
      </div>

      {/* Amount input */}
      <div className="flex items-center gap-1 bg-black/30 border border-white/[0.06] rounded-lg px-2.5 py-1.5">
        <span className="text-xs text-white/25 font-semibold">₨</span>
        <input
          type="number"
          className="flex-1 bg-transparent border-none outline-none font-['Exo_2'] text-sm font-extrabold text-white text-center w-full"
          value={amt}
          onChange={e => setAmt(Math.max(MIN_BET, Math.min(MAX_BET, parseInt(e.target.value) || MIN_BET)))}
          disabled={hasBet}
          min={MIN_BET}
          max={MAX_BET}
        />
        <button
          className="w-7 h-7 rounded-md bg-white/[0.03] border-none text-white/40 cursor-pointer text-sm flex items-center justify-center hover:bg-white/[0.08] hover:text-white transition-all"
          onClick={() => setAmt(Math.min(MAX_BET, Math.min(bal, amt + 100)))}
          disabled={hasBet}
        >+</button>
      </div>

      {/* Auto cashout */}
      <div className="flex items-center gap-1.5">
        <button
          className={`px-3 py-1.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border transition-all cursor-pointer ${
            autoOn ? `${isUser ? 'bg-emerald-500 text-gray-900 border-emerald-500' : 'bg-blue-500 text-white border-blue-500'}` : 'bg-white/[0.03] text-white/40 border-white/[0.08] hover:bg-white/[0.08]'
          }`}
          onClick={() => setAutoOn(o => !o)}
          disabled={hasBet}
        >Auto</button>
        {autoOn && (
          <div className="flex gap-0.5 flex-1">
            {AUTO_PRESETS.map(p => (
              <button
                key={p}
                className={`flex-1 py-1.5 rounded text-[9px] font-bold border transition-all cursor-pointer ${
                  autoVal === p
                    ? `${isUser ? 'bg-emerald-500 text-gray-900' : 'bg-blue-500 text-white'}`
                    : 'bg-white/[0.03] text-white/30 hover:bg-white/[0.06]'
                }`}
                onClick={() => setAutoVal(p)}
                disabled={hasBet}
              >{p}x</button>
            ))}
          </div>
        )}
      </div>

      {actionBtn}
    </div>
  )
})

export default AviatorBetPanel
