import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Layers, Users, Gamepad2, Trophy, Megaphone,
  Wallet, ArrowLeftRight, Bot, Plus, RefreshCw, Eye, Zap
} from 'lucide-react'

// ── Card Config ──────────────────────────────────────────────
const CARDS = [
  {
    id: 'landing',
    label: 'Landing Page Editor',
    icon: Layers,
    path: '/landing',
    color: 'emerald',
    desc: 'Hero, colors, header, footer',
    queryFn: async () => {
      try {
        const { data } = await supabase.from('landing_content').select('updated_at').eq('id', 'main').single()
        return data?.updated_at ? new Date(data.updated_at).toLocaleDateString('en-IN') : '—'
      } catch { return '—' }
    },
    badgeTable: 'landing_content',
  },
  {
    id: 'users',
    label: 'User Management',
    icon: Users,
    path: '/users',
    color: 'blue',
    desc: 'View & manage all users',
    queryFn: async () => {
      try {
        const { count } = await supabase.from('users').select('*', { count: 'exact', head: true })
        return count || 0
      } catch { return 0 }
    },
    badgeTable: 'users',
  },
  {
    id: 'games',
    label: 'Game Management',
    icon: Gamepad2,
    path: '/games',
    color: 'purple',
    desc: 'Add, edit, remove games',
    queryFn: async () => {
      try {
        const { count } = await supabase.from('games').select('*', { count: 'exact', head: true }).eq('is_active', true)
        return count || 0
      } catch { return 0 }
    },
    badgeTable: 'games',
  },
  {
    id: 'jackpot',
    label: 'Jackpot Settings',
    icon: Trophy,
    path: '/jackpot',
    color: 'amber',
    desc: 'Configure jackpot tiers',
    queryFn: async () => {
      try {
        const { data } = await supabase.from('jackpot_tiers').select('current_amount').eq('id', 'grand').single()
        if (!data?.current_amount) return 0
        return Number(data.current_amount) >= 100000 ? `₹${(Number(data.current_amount) / 100000).toFixed(1)}L` : `₹${Number(data.current_amount).toLocaleString('en-IN')}`
      } catch { return '—' }
    },
    badgeTable: 'jackpot_tiers',
  },
  {
    id: 'announcements',
    label: 'Announcements',
    icon: Megaphone,
    path: '/announcements',
    color: 'pink',
    desc: 'Broadcast to all users',
    queryFn: async () => {
      try {
        const { data } = await supabase.from('landing_content').select('live_json').eq('id', 'main').single()
        return data?.live_json?.announcements?.length || 0
      } catch { return 0 }
    },
    badgeTable: 'landing_content',
  },
  {
    id: 'wallet',
    label: 'Wallet & Transactions',
    icon: Wallet,
    path: '/deposit-withdrawal',
    color: 'cyan',
    desc: 'Balance, deposits, payouts',
    queryFn: async () => {
      try {
        const { data } = await supabase.from('admin_wallet').select('balance').eq('id', 'main').single()
        if (!data?.balance) return 0
        return Number(data.balance) >= 100000 ? `₹${(Number(data.balance) / 100000).toFixed(1)}L` : `₹${Number(data.balance).toLocaleString('en-IN')}`
      } catch { return '—' }
    },
    badgeTable: 'transactions',
  },
  {
    id: 'deposit-withdrawal',
    label: 'Deposit & Withdrawal',
    icon: ArrowLeftRight,
    path: '/deposit-withdrawal',
    color: 'violet',
    desc: 'Approvals & payment methods',
    queryFn: async () => {
      try {
        const { count } = await supabase.from('withdrawals').select('*', { count: 'exact', head: true }).eq('status', 'pending')
        return count || 0
      } catch { return 0 }
    },
    badgeTable: 'withdrawals',
  },
  {
    id: 'ai-agent',
    label: 'AI Agent Settings',
    icon: Bot,
    path: '/ai-agent',
    color: 'indigo',
    desc: 'Configure AI agent behavior',
    queryFn: async () => {
      return 'v2.4'
    },
    badgeTable: 'platform_settings',
  },
]

// ── Color Maps ───────────────────────────────────────────────
const GRADIENT_MAP = {
  emerald: { from: 'from-emerald-500/20', to: 'to-emerald-600/5', border: 'border-emerald-500/25', iconBg: 'bg-emerald-500/15', icon: 'text-emerald-400', glow: 'shadow-emerald-500/10', badge: '#10b981' },
  blue: { from: 'from-blue-500/20', to: 'to-blue-600/5', border: 'border-blue-500/25', iconBg: 'bg-blue-500/15', icon: 'text-blue-400', glow: 'shadow-blue-500/10', badge: '#3b82f6' },
  purple: { from: 'from-purple-500/20', to: 'to-purple-600/5', border: 'border-purple-500/25', iconBg: 'bg-purple-500/15', icon: 'text-purple-400', glow: 'shadow-purple-500/10', badge: '#a855f7' },
  amber: { from: 'from-amber-500/20', to: 'to-amber-600/5', border: 'border-amber-500/25', iconBg: 'bg-amber-500/15', icon: 'text-amber-400', glow: 'shadow-amber-500/10', badge: '#f59e0b' },
  pink: { from: 'from-pink-500/20', to: 'to-pink-600/5', border: 'border-pink-500/25', iconBg: 'bg-pink-500/15', icon: 'text-pink-400', glow: 'shadow-pink-500/10', badge: '#ec4899' },
  cyan: { from: 'from-cyan-500/20', to: 'to-cyan-600/5', border: 'border-cyan-500/25', iconBg: 'bg-cyan-500/15', icon: 'text-cyan-400', glow: 'shadow-cyan-500/10', badge: '#06b6d4' },
  violet: { from: 'from-violet-500/20', to: 'to-violet-600/5', border: 'border-violet-500/25', iconBg: 'bg-violet-500/15', icon: 'text-violet-400', glow: 'shadow-violet-500/10', badge: '#8b5cf6' },
  indigo: { from: 'from-indigo-500/20', to: 'to-indigo-600/5', border: 'border-indigo-500/25', iconBg: 'bg-indigo-500/15', icon: 'text-indigo-400', glow: 'shadow-indigo-500/10', badge: '#6366f1' },
}

// ── Single Card ──────────────────────────────────────────────
function AdminCard({ card, index, liveCount }) {
  const navigate = useNavigate()
  const Icon = card.icon
  const colors = GRADIENT_MAP[card.color] || GRADIENT_MAP.emerald

  const { data: primary = 0, isRefetching } = useQuery({
    queryKey: [`card-primary-${card.id}`],
    queryFn: card.queryFn,
    refetchInterval: 30000,
    staleTime: 10000,
    retry: 1,
  })

  return (
    <motion.button
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.4, type: 'spring', stiffness: 200 }}
      whileHover={{ scale: 1.03, y: -4 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => navigate(card.path)}
      className="group relative w-full text-left overflow-hidden"
    >
      <div className={`relative bg-gradient-to-br ${colors.from} ${colors.to} backdrop-blur-xl border ${colors.border} rounded-2xl p-5 transition-all duration-300 hover:shadow-xl`}>
        <div className={`absolute inset-0 bg-gradient-to-br ${colors.from} to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

        <div className="relative z-10">
          <div className="flex items-start justify-between mb-4">
            <div className={`p-3 rounded-xl ${colors.iconBg} transition-all group-hover:scale-110`}>
              <Icon className={`w-6 h-6 ${colors.icon}`} />
            </div>
            <div className="flex items-center gap-2">
              <AnimatePresence mode="wait">
                {liveCount !== null && liveCount !== undefined && (
                  <motion.div
                    key={String(liveCount)}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-lg"
                    style={{ backgroundColor: colors.badge }}
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>{liveCount}</span>
                  </motion.div>
                )}
              </AnimatePresence>
              {isRefetching && <RefreshCw className="w-3 h-3 text-slate-500 animate-spin" />}
            </div>
          </div>

          <h3 className="text-sm font-bold text-white mb-1 truncate">{card.label}</h3>
          <p className="text-xs text-slate-400 mb-3 truncate">{card.desc}</p>

          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-white">{primary}</span>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Eye className="w-3.5 h-3.5 text-slate-500" />
              <Zap className="w-3 h-3 text-amber-400" />
            </div>
          </div>
        </div>

        <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-current to-transparent opacity-0 group-hover:opacity-60 transition-opacity ${colors.icon}`} />
      </div>
    </motion.button>
  )
}

// ── Main Export ──────────────────────────────────────────────
export default function AdminDashboardOverview() {
  const qc = useQueryClient()
  const [liveCounts, setLiveCounts] = useState({})

  // Realtime subscription for ALL tables
  useEffect(() => {
    const tables = ['users', 'transactions', 'withdrawals', 'payment_methods', 'landing_content', 'games', 'jackpot_tiers', 'platform_settings']
    const channels = []

    tables.forEach(table => {
      try {
        const channel = supabase
          .channel(`dashboard-rt-${table}-${Date.now()}`)
          .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
            qc.invalidateQueries({ queryKey: [`card-primary-`] })
            setLiveCounts(prev => ({
              ...prev,
              [table]: (prev[table] || 0) + 1,
            }))
          })
          .subscribe()
        channels.push(channel)
      } catch (e) {
        console.warn(`Failed to subscribe to ${table}:`, e)
      }
    })

    return () => {
      channels.forEach(ch => {
        try { supabase.removeChannel(ch) } catch {}
      })
    }
  }, [qc])

  const getBadgeForCard = (card) => {
    const table = card.badgeTable
    const count = liveCounts[table]
    if (!count) return null
    if (count === 1) return '+1'
    return `+${count}`
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white">Admin Overview</h2>
        <p className="text-sm text-slate-400 mt-1">Real-time platform metrics via Supabase</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {CARDS.map((card, i) => (
          <AdminCard
            key={card.id}
            card={card}
            index={i}
            liveCount={getBadgeForCard(card)}
          />
        ))}
      </div>
    </div>
  )
}
