import { motion } from 'framer-motion'
import {
  UsersIcon,
  CurrencyRupeeIcon,
  CubeIcon,
  SparklesIcon,
  ArrowTrendingUpIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline'

const stats = [
  { name: 'Total Users', value: '12,847', change: '+12%', positive: true, icon: UsersIcon },
  { name: 'Daily Revenue', value: '₹4,52,180', change: '+8.2%', positive: true, icon: CurrencyRupeeIcon },
  { name: 'Active Games', value: '156', change: '+5', positive: true, icon: CubeIcon },
  { name: 'Win Rate', value: '94.2%', change: '-0.3%', positive: false, icon: ArrowTrendingUpIcon },
]

const recentActivity = [
  { id: 1, user: 'User***847', action: 'Deposited', amount: '₹5,000', time: '2 min ago' },
  { id: 2, user: 'User***123', action: 'Withdrew', amount: '₹2,500', time: '5 min ago' },
  { id: 3, user: 'User***456', action: 'Played Aviator', amount: 'Won ₹12,450', time: '8 min ago' },
  { id: 4, user: 'User***789', action: 'Registered', amount: 'Bonus ₹500', time: '12 min ago' },
  { id: 5, user: 'User***321', action: 'Played JetX', amount: 'Won ₹8,200', time: '15 min ago' },
]

const quickActions = [
  { name: 'Edit Landing Page', description: 'God Mode controls', icon: SparklesIcon, path: '/admin/landing' },
  { name: 'Add New Game', description: 'Expand your catalog', icon: CubeIcon, path: '/admin/games' },
  { name: 'Send Announcement', description: 'Notify all users', icon: SparklesIcon, path: '/admin/announcements' },
]

export default function Dashboard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">God Mode Dashboard</h1>
          <p className="text-admin-muted">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="text-sm text-admin-muted">
          Last updated: <span className="text-primary-400">Just now</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-admin-card rounded-xl border border-admin-border p-5 hover:border-primary-500/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg ${stat.positive ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                <stat.icon className={`w-5 h-5 ${stat.positive ? 'text-green-400' : 'text-red-400'}`} />
              </div>
              <div className={`flex items-center gap-1 text-sm ${stat.positive ? 'text-green-400' : 'text-red-400'}`}>
                {stat.positive ? (
                  <ArrowUpIcon className="w-4 h-4" />
                ) : (
                  <ArrowDownIcon className="w-4 h-4" />
                )}
                {stat.change}
              </div>
            </div>
            <h3 className="text-2xl font-bold text-white mb-1">{stat.value}</h3>
            <p className="text-sm text-admin-muted">{stat.name}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickActions.map((action, index) => (
            <motion.button
              key={action.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + index * 0.1 }}
              className="bg-admin-card rounded-xl border border-admin-border p-5 text-left hover:border-primary-500/50 hover:bg-admin-border transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-lg bg-primary-500/10 group-hover:bg-primary-500/20 transition-colors">
                  <action.icon className="w-6 h-6 text-primary-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white group-hover:text-primary-400 transition-colors">{action.name}</h3>
                  <p className="text-sm text-admin-muted">{action.description}</p>
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-admin-card rounded-xl border border-admin-border">
        <div className="p-5 border-b border-admin-border">
          <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
        </div>
        <div className="divide-y divide-admin-border">
          {recentActivity.map((activity, index) => (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + index * 0.05 }}
              className="flex items-center justify-between p-4 hover:bg-admin-border/50 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-admin-sidebar flex items-center justify-center text-white font-medium">
                  {activity.user.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{activity.user}</p>
                  <p className="text-xs text-admin-muted">{activity.action}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-medium ${activity.amount.includes('Won') ? 'text-green-400' : 'text-white'}`}>
                  {activity.amount}
                </p>
                <p className="text-xs text-admin-muted">{activity.time}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
