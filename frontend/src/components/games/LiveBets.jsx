import { memo } from 'react'

const LiveBets = memo(function LiveBets({ bets, currentUsername }) {
  return (
    <div className="flex flex-col bg-[#0f1929] border-l border-white/[0.04] flex-[0.25] min-w-[120px]">
      <div className="flex items-center gap-2 px-2.5 py-2 border-b border-white/[0.04] flex-shrink-0">
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#00e887] animate-pulse" />
        <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider">Live</span>
        <span className="text-[10px] font-bold text-sky-400">{bets.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0" style={{ maskImage: 'linear-gradient(to bottom,transparent,#000 6%,#000 94%,transparent)' }}>
        {bets.length === 0 ? (
          <div className="flex items-center justify-center h-20 text-[10px] text-white/10">Waiting for bets...</div>
        ) : bets.map(b => {
          const isUser = !b.is_bot && b.username === currentUsername
          const statusCls = b.status === 'won' ? 'border-l-emerald-400 bg-emerald-500/[0.04]'
            : b.status === 'lost' ? 'border-l-red-400 bg-red-500/[0.03]'
            : 'border-l-amber-400/40 bg-amber-500/[0.02]'
          return (
            <div key={b.id} className={`flex items-center justify-between px-2.5 py-1.5 border-b border-white/[0.02] border-l-[3px] border-l-transparent transition-colors ${isUser ? statusCls : ''}`}>
              <span className={`text-[10px] font-semibold truncate max-w-[70px] ${isUser ? 'text-emerald-400' : 'text-white/40'}`}>{b.username}</span>
              <span className="text-[11px] font-bold text-white">₨{Number(b.amount || 0).toLocaleString()}</span>
              <span className="text-[10px] font-extrabold" style={{
                color: b.status === 'won' ? '#facc15' : b.autoCashout ? 'rgba(250,204,21,0.4)' : 'rgba(255,255,255,0.15)'
              }}>
                {b.status === 'won' ? `${Number(b.cashoutMult || 0).toFixed(2)}x`
                  : b.autoCashout ? `A:${Number(b.autoCashout).toFixed(1)}` : '—'}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
})

export default LiveBets
