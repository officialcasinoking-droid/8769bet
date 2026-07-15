export default function MyBets({ history }) {
  return (
    <div className="flex items-center gap-0 bg-[#0f1929] border-t border-white/[0.04] overflow-x-auto flex-shrink-0 max-h-10" style={{ scrollbarWidth: 'none' }}>
      <span className="text-[8px] font-bold text-white/20 uppercase tracking-[0.1em] flex-shrink-0 px-2.5 h-full flex items-center border-r border-white/[0.04]">My Bets</span>
      {history.length === 0 ? (
        <span className="text-[9px] text-white/10 px-2.5 h-full flex items-center flex-shrink-0">Place a bet to start</span>
      ) : history.map((h, i) => (
        <div key={`${h.amount}-${h.pending ? 'p' : 'r'}-${i}`} className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 border-r border-white/[0.02] transition-colors ${
          h.pending ? 'bg-amber-500/[0.04]' : h.won ? 'bg-emerald-500/[0.04]' : 'bg-red-500/[0.04]'
        }`}>
          <span className="text-[7px] text-white/20 font-medium">{h.time || ''}</span>
          <span className="text-[10px] font-extrabold text-white/80">₨{Number(h.amount).toLocaleString()}</span>
          {h.pending ? (
            <span className="text-[9px] font-bold text-amber-400/50">playing</span>
          ) : h.won ? (
            <>
              <span className="text-[9px] font-extrabold text-emerald-400">{(h.mult || 0).toFixed(2)}x</span>
              <span className="text-[9px] font-extrabold text-emerald-400">+₨{Number(h.profit).toLocaleString()}</span>
            </>
          ) : (
            <span className="text-[9px] font-extrabold text-red-400">-₨{Number(h.amount).toLocaleString()}</span>
          )}
        </div>
      ))}
    </div>
  )
}
