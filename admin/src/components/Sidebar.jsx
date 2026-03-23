import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  HomeIcon,
  PencilSquareIcon,
  CubeIcon,
  CurrencyRupeeIcon,
  MegaphoneIcon,
  TagIcon,
  UsersIcon,
  WalletIcon,
  SparklesIcon,
  PaintBrushIcon,
  CogIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowRightOnRectangleIcon,
  EyeIcon,
  RocketLaunchIcon,
  GiftIcon,
  ChatBubbleLeftIcon
} from '@heroicons/react/24/outline'

const menuItems = [
  { id: 'dashboard', name: 'Dashboard', icon: HomeIcon, path: '/admin' },
  { id: 'landing', name: 'Landing Page Editor', icon: PencilSquareIcon, path: '/admin/landing', highlight: true },
  { id: 'games', name: 'Game Management', icon: CubeIcon, path: '/admin/games' },
  { id: 'aviator', name: 'Aviator Control', icon: RocketLaunchIcon, path: '/admin/aviator' },
  { id: 'jackpot', name: 'Jackpot Settings', icon: CurrencyRupeeIcon, path: '/admin/jackpot' },
  { id: 'referrals', name: 'Referrals & Bonus', icon: GiftIcon, path: '/admin/referrals' },
  { id: 'support', name: 'Support Settings', icon: ChatBubbleLeftIcon, path: '/admin/support' },
  { id: 'announcements', name: 'Announcements', icon: MegaphoneIcon, path: '/admin/announcements' },
  { id: 'categories', name: 'Categories', icon: TagIcon, path: '/admin/categories' },
  { id: 'users', name: 'User Management', icon: UsersIcon, path: '/admin/users' },
  { id: 'transactions', name: 'Transactions', icon: WalletIcon, path: '/admin/transactions' },
  { id: 'ai-agent', name: 'AI Agent Settings', icon: SparklesIcon, path: '/admin/ai-agent' },
  { id: 'theme', name: 'Theme & Colors', icon: PaintBrushIcon, path: '/admin/theme' },
  { id: 'settings', name: 'Settings', icon: CogIcon, path: '/admin/settings' },
]

export default function Sidebar({ collapsed, onToggle }) {
  const location = useLocation()

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 280 }}
      className="fixed left-0 top-0 h-screen bg-admin-sidebar border-r border-admin-border z-50 flex flex-col"
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-admin-border">
        {!collapsed && (
          <Link to="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
              <span className="text-sm font-bold text-white">8</span>
            </div>
            <span className="text-lg font-bold text-white">399bet</span>
          </Link>
        )}
        <button
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-admin-border transition-colors text-admin-muted hover:text-white"
        >
          {collapsed ? (
            <ChevronRightIcon className="w-5 h-5" />
          ) : (
            <ChevronLeftIcon className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <div className="space-y-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path
            const Icon = item.icon

            return (
              <Link
                key={item.id}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
                  isActive
                    ? 'bg-primary-500/20 text-primary-400'
                    : 'text-admin-muted hover:bg-admin-border hover:text-white'
                } ${item.highlight ? 'border border-primary-500/30' : ''}`}
              >
                <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-primary-400' : ''}`} />
                {!collapsed && (
                  <span className="text-sm font-medium truncate">{item.name}</span>
                )}
                {!collapsed && item.highlight && (
                  <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-primary-500/20 text-primary-400 font-medium">
                    GOD
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-admin-border">
        <Link
          to="/"
          target="_blank"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-admin-muted hover:bg-admin-border hover:text-white transition-all mb-2"
        >
          <EyeIcon className="w-5 h-5" />
          {!collapsed && <span className="text-sm font-medium">View Site</span>}
        </Link>
        <button
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-all"
        >
          <ArrowRightOnRectangleIcon className="w-5 h-5" />
          {!collapsed && <span className="text-sm font-medium">Logout</span>}
        </button>
      </div>
    </motion.aside>
  )
}
