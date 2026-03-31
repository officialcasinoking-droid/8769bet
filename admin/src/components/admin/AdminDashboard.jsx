import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useQuery } from '@tanstack/react-query'
import AdminDashboardOverview from './AdminDashboardOverview'
import {
  Users, DollarSign, Gamepad2, TrendingUp,
  ArrowDownRight, ArrowUpRight, Clock, Trophy
} from 'lucide-react'

// ── API Functions ────────────────────────────────────────────
async function fetchStats() {
  try {
    const [usersRes, walletRes, gamesRes, txRes] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('admin_wallet').select('balance').eq('id', 'main').single(),
      supabase.from('games').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('transactions').select('type, amount, status').order('created_at', { ascending: false }).limit(100),
    ])

    const txData = txRes.data || []
    const totalRevenue = txData.filter(t => t.type === 'deposit' && t.status === 'completed').reduce((s, t) => s + Number(t.amount), 0)
    const totalWithdrawals = txData.filter(t => t.type === 'withdrawal' && t.status === 'approved').reduce((s, t) => s + Number(t.amount), 0)

    return {
      totalUsers: usersRes.count || 0,
      walletBalance: walletRes.data?.balance || 0,
      activeGames: gamesRes.count || 0,
      totalRevenue,
      totalWithdrawals,
      netRevenue: totalRevenue - totalWithdrawals,
    }
  } catch {
    return { totalUsers: 0, walletBalance: 0, activeGames: 0, totalRevenue: 0, totalWithdrawals: 0, netRevenue: 0 }
  }
}

async function fetchRecentActivity() {
  try {
    const { data } = await supabase
      .from('transactions')
      .select('id, type, amount, status, note, created_at, user_id')
      .order('created_at', { ascending: false })
      .limit(10)
    return data || []
  } catch { return [] }
}

async function fetchTopGames() {
  try {
    const { data } = await supabase
      .from('games')
      .select('id, name, provider, category, is_active')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(6)
    return data || []
  } catch { return [] }
}

async function fetchJackpotTiers() {
  try {
    const { data } = await supabase
      .from('jackpot_tiers')
      .select('*')
      .eq('is_active', true)
      .order('seed_amount', { ascending: true })
    return data || []
  } catch { return [] }
}

// ── LiveStats ────────────────────────────────────────────────
function LiveStats() {
  const { data: stats = {}, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchStats,
    refetchInterval: 30000,
    staleTime: 10000,
    retry: 1,
  })

  const statCards = [
    { name: 'Total Users', value: stats.totalUsers || 0, icon: Users, color: 'emerald', format: 'number' },
    { name: 'Wallet Balance', value: stats.walletBalance || 0, icon: DollarSign, color: 'cyan', format: 'currency' },
    { name: 'Active Games', value: stats.activeGames || 0, icon: Gamepad2, color: 'purple', format: 'number' },
    { name: 'Net Revenue', value: stats.netRevenue || 0, icon: TrendingUp, color: 'amber', format: 'currency' },
  ]

  const formatValue = (value, format) => {
    if (format === 'currency') {
      if (value >= 100000) return `PKR ${(value / 100000).toFixed(1)}L`
      return `PKR ${Number(value).toLocaleString('en-IN')}`
    }
    return Number(value).toLocaleString('en-IN')
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-28 bg-slate-800/50 rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  const colorMap = {
    emerald: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/25' },
    cyan: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/25' },
    purple: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/25' },
    amber: { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/25' },
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((stat, i) => {
        const Icon = stat.icon
        const c = colorMap[stat.color]
        return (
          <motion.div
            key={stat.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`bg-slate-800/60 backdrop-blur-xl border ${c.border} rounded-xl p-5 hover:shadow-lg transition-all`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${c.bg}`}>
                <Icon className={`w-5 h-5 ${c.text}`} />
              </div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider">Live</span>
            </div>
            <h3 className="text-xl font-bold text-white">{formatValue(stat.value, stat.format)}</h3>
            <p className="text-xs text-slate-400 mt-0.5">{stat.name}</p>
          </motion.div>
        )
      })}
    </div>
  )
}

// ── RecentActivity ───────────────────────────────────────────
function RecentActivity() {
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ['dashboard-activity'],
    queryFn: fetchRecentActivity,
    refetchInterval: 15000,
    staleTime: 5000,
    retry: 1,
  })

  const typeConfig = {
    deposit: { color: 'text-emerald-400', bg: 'bg-emerald-500/15', icon: ArrowDownRight },
    withdrawal: { color: 'text-red-400', bg: 'bg-red-500/15', icon: ArrowUpRight },
    bet: { color: 'text-amber-400', bg: 'bg-amber-500/15', icon: ArrowUpRight },
    win: { color: 'text-emerald-400', bg: 'bg-emerald-500/15', icon: ArrowDownRight },
    bonus: { color: 'text-blue-400', bg: 'bg-blue-500/15', icon: ArrowDownRight },
  }

  const getTimeAgo = (date) => {
    const diff = Math.floor((Date.now() - new Date(date)) / 1000)
    if (diff < 60) return 'Just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  return (
    <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-xl">
      <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Clock className="w-4 h-4 text-slate-400" />
          Recent Activity
        </h2>
        <span className="text-[10px] text-slate-500">{transactions.length} items</span>
      </div>
      {isLoading ? (
        <div className="p-8 text-center">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-sm">No recent activity</div>
      ) : (
        <div className="divide-y divide-slate-700/30 max-h-80 overflow-y-auto">
          {transactions.map((tx, i) => {
            const config = typeConfig[tx.type] || typeConfig.deposit
            const Icon = config.icon
            return (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center justify-between p-3 hover:bg-slate-700/20 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full ${config.bg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${config.color}`} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white capitalize">{tx.type}</p>
                    <p className="text-[10px] text-slate-400 truncate max-w-[140px]">
                      {tx.note || tx.user_id?.slice(0, 8) || 'System'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-medium ${config.color}`}>
                    PKR {Number(tx.amount).toLocaleString('en-IN')}
                  </p>
                  <p className="text-[10px] text-slate-500">{getTimeAgo(tx.created_at)}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── TopGames ─────────────────────────────────────────────────
function TopGames() {
  const { data: games = [], isLoading } = useQuery({
    queryKey: ['dashboard-games'],
    queryFn: fetchTopGames,
    refetchInterval: 60000,
    staleTime: 10000,
    retry: 1,
  })

  const categoryColors = {
    Crash: 'bg-red-500/15 text-red-400',
    Slots: 'bg-amber-500/15 text-amber-400',
    Live: 'bg-green-500/15 text-green-400',
    Table: 'bg-blue-500/15 text-blue-400',
    Lottery: 'bg-purple-500/15 text-purple-400',
    Fishing: 'bg-cyan-500/15 text-cyan-400',
  }

  return (
    <div className="bg-slate-800/60 backdrop-blur-xl border border-slate-700/50 rounded-xl">
      <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Gamepad2 className="w-4 h-4 text-slate-400" />
          Active Games
        </h2>
        <span className="text-[10px] text-slate-500">{games.length} games</span>
      </div>
      {isLoading ? (
        <div className="p-8 text-center">
          <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : games.length === 0 ? (
        <div className="p-8 text-center text-slate-500 text-sm">No active games</div>
      ) : (
        <div className="divide-y divide-slate-700/30">
          {games.map((game, i) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between p-3 hover:bg-slate-700/20 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-700/50 flex items-center justify-center text-[10px] font-bold text-slate-400">
                  {i + 1}
                </div>
                <div>
                  <p className="text-xs font-medium text-white">{game.name}</p>
                  <p className="text-[10px] text-slate-400">{game.provider}</p>
                </div>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${categoryColors[game.category] || 'bg-slate-700 text-slate-400'}`}>
                {game.category}
              </span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── JackpotOverview ──────────────────────────────────────────
function JackpotOverview() {
  const { data: tiers = [], isLoading } = useQuery({
    queryKey: ['dashboard-jackpot'],
    queryFn: fetchJackpotTiers,
    refetchInterval: 10000,
    staleTime: 5000,
    retry: 1,
  })

  const tierEmojis = { mini: '🥉', minor: '🥈', major: '🥇', grand: '💎' }

  if (isLoading) {
    return <div className="h-32 bg-slate-800/50 rounded-xl animate-pulse" />
  }

  return (
    <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/5 backdrop-blur-xl border border-amber-500/20 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            Progressive Jackpots
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Live amounts from Supabase</p>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tiers.map((tier) => (
          <motion.div
            key={tier.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-3 text-center"
          >
            <p className="text-xl mb-0.5">{tierEmojis[tier.id] || '💎'}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">{tier.name}</p>
            <p className="text-sm font-bold text-amber-400 mt-1">
              PKR {Number(tier.current_amount || 0).toLocaleString('en-IN')}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ── Main Export ──────────────────────────────────────────────
export default function AdminDashboard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >
      <AdminDashboardOverview />
      <LiveStats />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentActivity />
        <TopGames />
      </div>
      <JackpotOverview />
    </motion.div>
  )
}

