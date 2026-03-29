import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { 
  UsersIcon, WalletIcon, 
  RocketIcon, TrendingUpIcon, TrendingDownIcon,
  ArrowRightIcon
} from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    aviatorBets: 0,
    aviatorRevenue: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const [usersRes, transactionsRes] = await Promise.all([
          supabase.from('users').select('id, is_active'),
          supabase.from('transactions').select('type, amount')
        ])

        const users = usersRes.data || []
        const transactions = transactionsRes.data || []

        const deposits = transactions.filter(t => t.type === 'deposit').reduce((sum, t) => sum + (t.amount || 0), 0)
        const withdrawals = transactions.filter(t => t.type === 'withdrawal').reduce((sum, t) => sum + (t.amount || 0), 0)

        setStats({
          totalUsers: users.length,
          activeUsers: users.filter(u => u.is_active).length,
          totalDeposits: deposits,
          totalWithdrawals: withdrawals,
          aviatorBets: 0,
          aviatorRevenue: 0
        })
      } catch (err) {
        console.error('Error fetching stats:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const statCards = [
    { 
      title: 'Total Users', 
      value: stats.totalUsers, 
      icon: UsersIcon, 
      color: 'from-blue-500 to-blue-600',
      link: '/admin/users'
    },
    { 
      title: 'Total Deposits', 
      value: `₨${(stats.totalDeposits || 0).toLocaleString()}`, 
      icon: WalletIcon, 
      color: 'from-emerald-500 to-emerald-600',
      link: '/admin/deposit-withdrawal'
    },
    { 
      title: 'Total Withdrawals', 
      value: `₨${(stats.totalWithdrawals || 0).toLocaleString()}`, 
      icon: TrendingDownIcon, 
      color: 'from-red-500 to-red-600',
      link: '/admin/deposit-withdrawal'
    },
    { 
      title: 'Aviator Bets', 
      value: stats.aviatorBets, 
      icon: RocketIcon, 
      color: 'from-purple-500 to-purple-600',
      link: '/admin/aviator'
    }
  ]

  const quickLinks = [
    { name: 'Aviator Game Control', path: '/admin/aviator', icon: RocketLaunchIcon },
    { name: 'User Management', path: '/admin/users', icon: UsersIcon },
    { name: 'Deposit & Withdrawal', path: '/admin/deposit-withdrawal', icon: CurrencyRupeeIcon },
    { name: 'AI Agent Settings', path: '/admin/ai-agent', icon: TrendingUpIcon },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <Link
            key={i}
            to={stat.link}
            className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6 hover:border-slate-700/50 transition-all group"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-slate-400 text-sm mb-1">{stat.title}</p>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickLinks.map((link, i) => (
            <Link
              key={i}
              to={link.path}
              className="flex items-center gap-3 p-4 bg-slate-800/30 rounded-xl border border-slate-700/30 hover:border-emerald-500/30 hover:bg-slate-800/50 transition-all group"
            >
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500/20">
                <link.icon className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-slate-300 group-hover:text-white">{link.name}</span>
              <ArrowRightIcon className="w-4 h-4 text-slate-500 ml-auto group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-slate-900/50 border border-slate-800/50 rounded-2xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">System Status</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-xl">
            <span className="text-slate-400">Database</span>
            <span className="px-2 py-1 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400">Connected</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-800/30 rounded-xl">
            <span className="text-slate-400">Aviator Game</span>
            <span className="px-2 py-1 rounded text-xs font-medium bg-emerald-500/20 text-emerald-400">Active</span>
          </div>
        </div>
      </div>
    </div>
  )
}
