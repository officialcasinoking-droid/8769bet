import { motion } from 'framer-motion'
import AdminDashboardOverview from './AdminDashboardOverview'

export default function AdminDashboard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      <AdminDashboardOverview />

      {/* ── Stats Row ── */}
      <LiveStats />

      {/* ── Recent Activity + Top Games ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity />
        <TopGames />
      </div>

      {/* ── Jackpot Overview ── */}
      <JackpotOverview />
    </motion.div>
  )
}

function LiveStats() {
  const stats = [
    { name: 'Total Users', value: '12,847', change: '+12%', emoji: '👥', positive: true },
    { name: 'Daily Revenue', value: 'PKR 4,52,180', change: '+8.2%', emoji: '💰', positive: true },
    { name: 'Active Games', value: '156', change: '+5', emoji: '🎮', positive: true },
    { name: 'Win Rate', value: '94.2%', change: '-0.3%', emoji: '📊', positive: false },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, i) => (
        <motion.div
          key={stat.name}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.1 }}
          className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-xl p-5"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-2xl">{stat.emoji}</span>
            <span className={`text-xs font-medium ${stat.positive ? 'text-emerald-400' : 'text-red-400'}`}>
              {stat.change}
            </span>
          </div>
          <h3 className="text-xl font-bold text-white">{stat.value}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{stat.name}</p>
        </motion.div>
      ))}
    </div>
  )
}

function RecentActivity() {
  const activity = [
    { user: 'Rahul***847', action: 'Deposited', amount: 'PKR 5,000', time: '2 min ago', type: 'deposit' },
    { user: 'Priya***123', action: 'Withdrew', amount: 'PKR 2,500', time: '5 min ago', type: 'withdraw' },
    { user: 'Amit***456', action: 'Won', amount: 'PKR 12,450', time: '8 min ago', type: 'win' },
    { user: 'Sneha***789', action: 'Registered', amount: 'Bonus PKR 200', time: '12 min ago', type: 'bonus' },
    { user: 'Vikram***321', action: 'Bet Lost', amount: 'PKR 500', time: '15 min ago', type: 'loss' },
  ]

  return (
    <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-xl">
      <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">🕐 Recent Activity</h2>
      </div>
      <div className="divide-y divide-slate-700/30 max-h-72 overflow-y-auto">
        {activity.map((item, i) => (
          <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-700/20 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-xs font-medium">
                {item.user.charAt(0)}
              </div>
              <div>
                <p className="text-xs font-medium text-white">{item.user}</p>
                <p className="text-[10px] text-slate-400">{item.action}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-xs font-medium ${item.type === 'win' || item.type === 'bonus' ? 'text-emerald-400' : item.type === 'loss' ? 'text-red-400' : 'text-white'}`}>
                {item.amount}
              </p>
              <p className="text-[10px] text-slate-500">{item.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TopGames() {
  const games = [
    { name: 'Aviator', players: 2347, revenue: 'PKR 12.5L' },
    { name: 'Fortune Gems 3', players: 1823, revenue: 'PKR 8.2L' },
    { name: 'Money Coming', players: 3421, revenue: 'PKR 15.8L' },
    { name: 'Lucky Jet', players: 2156, revenue: 'PKR 9.4L' },
  ]

  return (
    <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-xl">
      <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">🎮 Top Performing Games</h2>
      </div>
      <div className="divide-y divide-slate-700/30">
        {games.map((game, i) => (
          <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-700/20 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold flex items-center justify-center">
                {i + 1}
              </div>
              <div>
                <p className="text-xs font-medium text-white">{game.name}</p>
                <p className="text-[10px] text-slate-400">{game.players.toLocaleString()} players</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-emerald-400">{game.revenue}</p>
              <p className="text-[10px] text-slate-500">Revenue</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function JackpotOverview() {
  return (
    <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/5 backdrop-blur-xl border border-amber-500/20 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">💎 Progressive Jackpots</h2>
          <p className="text-xs text-slate-400 mt-0.5">Live amounts across all tiers</p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { name: 'Mini', amount: 'PKR 847', emoji: '🥉' },
          { name: 'Minor', amount: 'PKR 12,847', emoji: '🥈' },
          { name: 'Major', amount: 'PKR 1,27,458', emoji: '🥇' },
          { name: 'Grand', amount: 'PKR 18,47,294', emoji: '💎' },
        ].map((j) => (
          <div key={j.name} className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-3 text-center">
            <p className="text-xl mb-0.5">{j.emoji}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">{j.name}</p>
            <p className="text-sm font-bold text-amber-400 mt-1">{j.amount}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

