import { memo } from 'react'

const CrashHistory = memo(function CrashHistory({ history }) {
  return (
    <div className="flex items-center gap-1.5 px-3.5 py-2 bg-[#0f1929] border-b border-white/[0.04] overflow-x-auto scrollbar-none flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
      {history.length === 0 && (
        <span className="text-[10px] text-white/15 flex-shrink-0">Waiting...</span>
      )}
      {history.map((h, i) => {
        const n = typeof h === 'number' ? h : parseFloat(h)
        const cls = n >= 10
          ? 'text-red-400 bg-red-500/10 border-red-500/20'
          : n >= 2
          ? 'text-purple-400 bg-purple-500/10 border-purple-500/20'
          : 'text-sky-400 bg-sky-500/10 border-sky-500/20'
        return (
          <div key={`${h}-${i}`} className={`flex-shrink-0 px-2 py-0.5 rounded text-[11px] font-bold border ${cls}`}>
            {n.toFixed(2)}x
          </div>
        )
      })}
    </div>
  )
})

export default CrashHistory
