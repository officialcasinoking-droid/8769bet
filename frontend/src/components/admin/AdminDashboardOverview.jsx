import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useQuery } from '@tanstack/react-query'
import {
  Layers, Users, Gamepad2, Trophy, Megaphone,
  Wallet, ArrowLeftRight, Bot, Plus, RefreshCw,
  TrendingUp, Eye
} from 'lucide-react'
import { useRealtimeTable, useLandingRealtime } from '../../hooks/useRealtime'

const CARDS = [
  {
    id: 'landing',
    label: 'Landing Page',
    icon: Layers,
    path: '/admin/landing',
    color: 'emerald',
    colorFrom: 'from-emerald-500/20',
    colorTo: 'to-emerald-600/5',
    borderColor: 'border-emerald-500/30',
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400',
    accent: 'emerald',
    desc: 'Hero, colors, header, footer',
    queryFn: async () => {
      const { data } = await supabase.from('landing_content').select('updated_at').eq('id', 'main').single()
      return data?.updated_at ? new Date(data.updated_at) : null
    },
    badgeFn: async () => {
      const { data } = await supabase.from('landing_content').select('updated_at').eq('id', 'main').single()
      if (!data?.updated_at) return null
      const d = new Date(data.updated_at)
      const now = new Date()
      if (d.toDateString() === now.toDateString()) return 'Updated today'
      const diff = Math.floor((now - d) / 86400000)
      return diff <= 7 ? `Updated ${diff}d ago` : null
    },
  },
  {
    id: 'users',
    label: 'User Management',
    icon: Users,
    path: '/admin/users',
    color: 'blue',
    colorFrom: 'from-blue-500/20',
    colorTo: 'to-blue-600/5',
    borderColor: 'border-blue-500/30',
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
    accent: 'blue',
    desc: 'View & manage all users',
    queryFn: async () => {
      const { count } = await supabase.from('users').select('*', { count: 'exact', head: true })
      return count || 0
    },
    badgeFn: async () => {
      const { count } = await supabase.from('users').select('*', { count: 'exact', head: true })
      return count ? `+ ${count} users` : null
    },
  },
  {
    id: 'games',
    label: 'Game Management',
    icon: Gamepad2,
    path: '/admin/games',
    color: 'purple',
    colorFrom: 'from-purple-500/20',
    colorTo: 'to-purple-600/5',
    borderColor: 'border-purple-500/30',
    iconBg: 'bg-purple-500/20',
    iconColor: 'text-purple-400',
    accent: 'purple',
    desc: 'Add, edit, remove games',
    queryFn: async () => {
      const { count } = await supabase.from('jackpot_tiers').select('*', { count: 'exact', head: true })
      return count || 0
    },
    badgeFn: async () => {
      const { count } = await supabase.from('jackpot_tiers').select('*', { count: 'exact', head: true })
      return count ? `${count} games active` : 'No games'
    },
  },
  {
    id: 'jackpot',
    label: 'Jackpot Settings',
    icon: Trophy,
    path: '/admin/jackpot',
    color: 'amber',
    colorFrom: 'from-amber-500/20',
    colorTo: 'to-amber-600/5',
    borderColor: 'border-amber-500/30',
    iconBg: 'bg-amber-500/20',
    iconColor: 'text-amber-400',
    accent: 'amber',
    desc: 'Configure jackpot tiers',
    queryFn: async () => {
      const { data } = await supabase.from('jackpot_tiers').select('current_amount').eq('id', 'grand').single()
      return data?.current_amount || 0
    },
    badgeFn: async () => {
      const { data } = await supabase.from('jackpot_tiers').select('current_amount').eq('id', 'grand').single()
      if (!data?.current_amount) return null
      return `PKR ${Number(data.current_amount).toLocaleString('en-IN')}`
    },
  },
  {
    id: 'announcements',
    label: 'Announcements',
    icon: Megaphone,
    path: '/admin/announcements',
    color: 'pink',
    colorFrom: 'from-pink-500/20',
    colorTo: 'to-pink-600/5',
    borderColor: 'border-pink-500/30',
    iconBg: 'bg-pink-500/20',
    iconColor: 'text-pink-400',
    accent: 'pink',
    desc: 'Broadcast to all users',
    queryFn: async () => {
      const { data } = await supabase.from('landing_content').select('live_json').eq('id', 'main').single()
      return data?.live_json?.announcements?.length || 0
    },
    badgeFn: async () => {
      const { data } = await supabase.from('landing_content').select('live_json').eq('id', 'main').single()
      return data?.live_json?.announcements?.length
        ? `${data.live_json.announcements.length} active`
        : 'No announcements'
    },
  },
  {
    id: 'wallet',
    label: 'Wallet & Transactions',
    icon: Wallet,
    path: '/admin/deposit-withdrawal',
    color: 'cyan',
    colorFrom: 'from-cyan-500/20',
    colorTo: 'to-cyan-600/5',
    borderColor: 'border-cyan-500/30',
    iconBg: 'bg-cyan-500/20',
    iconColor: 'text-cyan-400',
    accent: 'cyan',
    desc: 'Balance, deposits, payouts',
    queryFn: async () => {
      const { data } = await supabase.from('admin_wallet').select('balance').eq('id', 'main').single()
      return data?.balance || 0
    },
    badgeFn: async () => {
      const { count } = await supabase.from('transactions').select('*', { count: 'exact', head: true })
      return count ? `+ ${count} txns` : null
    },
  },
  {
    id: 'deposit-withdrawal',
    label: 'Deposit & Withdrawal',
    icon: ArrowLeftRight,
    path: '/admin/deposit-withdrawal',
    color: 'violet',
    colorFrom: 'from-violet-500/20',
    colorTo: 'to-violet-600/5',
    borderColor: 'border-violet-500/30',
    iconBg: 'bg-violet-500/20',
    iconColor: 'text-violet-400',
    accent: 'violet',
    desc: 'Approvals & payment methods',
    queryFn: async () => {
      const { count } = await supabase.from('withdrawals').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      return count || 0
    },
    badgeFn: async () => {
      const { count } = await supabase.from('withdrawals').select('*', { count: 'exact', head: true }).eq('status', 'pending')
      return count ? `+ ${count} pending` : 'All clear'
    },
  },
  {
    id: 'ai-agent',
    label: 'AI Agent Settings',
    icon: Bot,
    path: '/admin/ai-agent',
    color: 'indigo',
    colorFrom: 'from-indigo-500/20',
    colorTo: 'to-indigo-600/5',
    borderColor: 'border-indigo-500/30',
    iconBg: 'bg-indigo-500/20',
    iconColor: 'text-indigo-400',
    accent: 'indigo',
    desc: 'Configure AI agent behavior',
    queryFn: async () => {
      const { count } = await supabase.from('users').select('*', { count: 'exact', head: true })
      return count || 0
    },
    badgeFn: async () => {
      return 'AI v2.4 active'
    },
  },
]

function LiveBadge({ badge, color }) {
  const colorMap = {
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    amber: 'bg-amber-500',
    pink: 'bg-pink-500',
    cyan: 'bg-cyan-500',
    violet: 'bg-violet-500',
    indigo: 'bg-indigo-500',
  }
  if (!badge) return null
  return (
    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${colorMap[color] || 'bg-emerald-500'}`}>
      <Plus className="w-2.5 h-2.5" />
      {badge}
    </span>
  )
}

function AdminCard({ card, index }) {
  const navigate = useNavigate()
  const Icon = card.icon

  const { data: primary = 0 } = useQuery({
    queryKey: [`card-primary-${card.id}`],
    queryFn: card.queryFn,
    refetchInterval: 30000,
    staleTime: 0,
  })

  const { data: badge = null } = useQuery({
    queryKey: [`card-badge-${card.id}`],
    queryFn: card.badgeFn,
    refetchInterval: 30000,
    staleTime: 0,
  })

  const { pending: rtPending } = useRealtimeTable(
    card.id === 'deposit-withdrawal' ? 'withdrawals' : card.id === 'users' ? 'users' : 'landing_content',
    undefined
  )

  useLandingRealtime()

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(card.path)}
      className={`group relative w-full text-left bg-gradient-to-br ${card.colorFrom} ${card.colorTo} backdrop-blur-xl border ${card.borderColor} rounded-2xl p-5 transition-all duration-300 hover:shadow-lg hover:shadow-${card.color}-500/10 overflow-hidden`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${card.colorFrom} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-xl ${card.iconBg}`}>
            <Icon className={`w-6 h-6 ${card.iconColor}`} />
          </div>
          <div className="flex items-center gap-1">
            <LiveBadge badge={badge} color={card.color} />
            <RefreshCw className={`w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity`} />
          </div>
        </div>

        <h3 className="text-base font-bold text-white mb-1">{card.label}</h3>
        <p className="text-xs text-slate-400 mb-3">{card.desc}</p>

        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-white">
            {typeof primary === 'number' && primary > 1000
              ? `PKR ${(primary / 100000).toFixed(1)}L`
              : typeof primary === 'object' && primary instanceof Date
              ? primary.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
              : typeof primary === 'number'
              ? primary.toLocaleString('en-IN')
              : String(primary || '—')}
          </span>
          <Eye className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-${card.color}-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
    </motion.button>
  )
}

export default function AdminDashboardOverview() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Admin Overview</h2>
        <p className="text-sm text-slate-400 mt-1">Real-time platform metrics — updates every 30s</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {CARDS.map((card, i) => (
          <AdminCard key={card.id} card={card} index={i} />
        ))}
      </div>
    </div>
  )
}

