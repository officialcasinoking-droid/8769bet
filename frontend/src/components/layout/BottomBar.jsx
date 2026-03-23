import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { HomeIcon, UsersIcon, GiftIcon, UserIcon, Squares2X2Icon } from '@heroicons/react/24/outline'
import { useAuth } from '../../context/AuthContext'

const navItems = [
  { id: 'home', name: 'Home', Icon: HomeIcon, path: '/' },
  { id: 'referral', name: 'Referral', Icon: UsersIcon, path: '/referral' },
  { id: 'games', name: 'All Games', Icon: Squares2X2Icon, path: '/games', highlight: true },
  { id: 'offers', name: 'Offers', Icon: GiftIcon, path: '/offers' },
  { id: 'profile', name: 'Profile', Icon: UserIcon, path: '/profile' },
]

export default function BottomBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  // Don't show on admin pages or game pages
  if (location.pathname.startsWith('/admin') || location.pathname.startsWith('/play')) {
    return null
  }

  return (
    <motion.div
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden safe-area-inset-bottom"
    >
      <div className="bg-white/95 dark:bg-dark-400/95 backdrop-blur-xl border-t border-gray-200 dark:border-dark-100 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
        <div className="flex items-center justify-around py-2 px-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || 
              (item.id === 'home' && location.pathname === '/')
            const Icon = item.Icon
            
            if (item.highlight) {
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.path)}
                  className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5"
                >
                  <div className="relative">
                    <div className="w-12 h-12 -mt-6 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">{item.name}</span>
                </button>
              )
            }
            
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-1.5 transition-all ${
                  isActive 
                    ? 'text-emerald-600 dark:text-emerald-400' 
                    : item.id === 'referral'
                      ? 'text-emerald-500 dark:text-emerald-400'
                      : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <div className="relative">
                  <Icon className="w-6 h-6" />
                  {isActive && (
                    <motion.div
                      layoutId="bottomNavDot"
                      className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-500"
                    />
                  )}
                </div>
                <span className="text-[10px] font-medium">{item.name}</span>
              </button>
            )
          })}
        </div>
      </div>
    </motion.div>
  )
}
