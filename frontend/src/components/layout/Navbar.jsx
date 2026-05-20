import { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  HomeIcon, 
  SparklesIcon,
  UsersIcon,
  GiftIcon,
  ArrowTrendingUpIcon,
  BellIcon,
  SunIcon,
  MoonIcon,
  Bars3Icon,
  XMarkIcon,
  UserIcon,
  CreditCardIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import UserBadge, { UserBadgeMobile } from '../ui/UserBadge'
import { supabase, getLanding } from '../../api/landing'

const navigation = [
  { id: 'home', name: 'Home', href: '/', icon: HomeIcon },
  { id: 'wallet', name: 'Wallet', href: '/wallet', icon: CreditCardIcon },
  { id: 'referral', name: 'Referral', href: '/referral', icon: UsersIcon },
  { id: 'offers', name: 'Offers', href: '/offers', icon: GiftIcon },
  { id: 'profile', name: 'Profile', href: '/profile', icon: UserIcon },
]

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [headerSettings, setHeaderSettings] = useState({
    headerBg: null,
    headerLogoUrl: null,
    headerSearchPlaceholder: null,
    headerShowLogin: true,
    headerShowSignup: true,
  })
  const location = useLocation()
  const navigate = useNavigate()
  const { user, isLoggedIn, formatBalance, logout } = useAuth()
  const { isDark, toggleTheme, notifications, unreadCount, markAsRead, markAllAsRead, addNotification } = useTheme()
  const notifRef = useRef(null)
  const balance = user?.balance ?? 0

  useEffect(() => {
    if (isLoggedIn && user?.id) {
      loadNotifications()
      subscribeToNotifications()
    }
  }, [isLoggedIn, user?.id])

  useEffect(() => {
    const loadHeaderSettings = async () => {
      try {
        const data = await getLanding()
        if (data) {
          setHeaderSettings({
            headerBg: data.headerBg || null,
            headerLogoUrl: data.headerLogoUrl || null,
            headerSearchPlaceholder: data.headerSearchPlaceholder || null,
            headerShowLogin: data.headerShowLogin !== false,
            headerShowSignup: data.headerShowSignup !== false,
          })
        }
      } catch {}
    }
    loadHeaderSettings()

    const channel = supabase
      .channel('nav-header-rt')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'landing_content', filter: 'id=eq.main' }, (payload) => {
        const ld = payload.new?.live_json
        if (ld) {
          setHeaderSettings({
            headerBg: ld.headerBg || null,
            headerLogoUrl: ld.headerLogoUrl || null,
            headerSearchPlaceholder: ld.headerSearchPlaceholder || null,
            headerShowLogin: ld.headerShowLogin !== false,
            headerShowSignup: ld.headerShowSignup !== false,
          })
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadNotifications = async () => {
    try {
      // Get withdrawal request updates
      const { data: withdrawals } = await supabase
        .from('withdrawals')
        .select('id, amount, status, rejection_reason, processed_at, created_at')
        .eq('user_id', user.id)
        .neq('status', 'pending')
        .order('processed_at', { ascending: false })
        .limit(10)

      if (withdrawals) {
        withdrawals.forEach(w => {
          addNotification({
            type: 'withdrawal',
            title: w.status === 'approved' ? 'Withdrawal Approved' : 'Withdrawal Rejected',
            message: w.status === 'approved' 
              ? `Your withdrawal of ₨${Number(w.amount).toLocaleString()} has been approved!`
              : `Your withdrawal of ₨${Number(w.amount).toLocaleString()} was rejected.${w.admin_note ? ` Reason: ${w.admin_note}` : ''}`,
            timestamp: w.processed_at || w.created_at,
            read: false
          })
        })
      }
    } catch (err) {
      console.error('Error loading notifications:', err)
    }
  }

  const subscribeToNotifications = () => {
    const channel = supabase
      .channel('user-notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'support_messages',
      }, async (payload) => {
        const msg = payload.new
        // Check if this message is for the current user
        if (msg.sender_role === 'system' || msg.sender_role === 'admin') {
          addNotification({
            type: msg.sender_role === 'system' ? 'system' : 'admin',
            title: msg.sender_role === 'system' ? 'System Update' : 'Admin Message',
            message: msg.message,
            timestamp: msg.created_at,
            read: false
          })
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const handleLogout = () => {
    try { localStorage.removeItem('sb_user') } catch {}
    try { localStorage.removeItem('sb_balance') } catch {}
    logout()
    navigate('/')
    setIsOpen(false)
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'withdrawal':
        return <ArrowTrendingUpIcon className="w-5 h-5 text-emerald-400" />
      case 'bonus':
        return <GiftIcon className="w-5 h-5 text-yellow-400" />
      case 'system':
        return <InformationCircleIcon className="w-5 h-5 text-blue-400" />
      case 'admin':
        return <ExclamationTriangleIcon className="w-5 h-5 text-purple-400" />
      default:
        return <BellIcon className="w-5 h-5 text-gray-400" />
    }
  }

  const formatTime = (timestamp) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl border-b border-gray-200 dark:border-dark-100 shadow-sm"
      style={headerSettings.headerBg ? { backgroundColor: headerSettings.headerBg } : {}}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group flex-shrink-0">
            {headerSettings.headerLogoUrl ? (
              <img src={headerSettings.headerLogoUrl} alt="Logo" className="w-9 h-9 rounded-xl object-contain" />
            ) : (
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.95 }}
                className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg group-hover:shadow-emerald-500/30 transition-shadow"
              >
                <span className="text-lg font-bold text-white">8</span>
              </motion.div>
            )}
            <span className="text-lg font-bold text-gray-900 dark:text-white font-display hidden sm:block">8769bet</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navigation.map((item, i) => {
              const Icon = item.icon
              const isActive = location.pathname === item.href || 
                (item.id === 'home' && location.pathname === '/')
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Link
                    to={item.href}
                    className={`
                      relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2
                      ${item.highlight 
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-emerald-500/30' 
                        : isActive 
                          ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10' 
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-white/5'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                    {isActive && !item.highlight && (
                      <motion.div
                        layoutId="navbarActive"
                        className="absolute inset-0 bg-emerald-500/10 rounded-xl border border-emerald-500/20 -z-10"
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    )}
                  </Link>
                </motion.div>
              )
            })}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? (
                <SunIcon className="w-5 h-5 text-yellow-400" />
              ) : (
                <MoonIcon className="w-5 h-5 text-gray-600" />
              )}
            </button>

            {/* Notifications */}
            {isLoggedIn && (
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
                >
                  <BellIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-dark-300 rounded-xl shadow-xl border border-gray-200 dark:border-dark-100 overflow-hidden z-50"
                    >
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-dark-100">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                        {notifications.length > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                          <div className="p-8 text-center">
                            <BellIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">No notifications yet</p>
                          </div>
                        ) : (
                          notifications.slice(0, 20).map((notif) => (
                            <button
                              key={notif.id}
                              onClick={() => markAsRead(notif.id)}
                              className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors border-b border-gray-100 dark:border-dark-100 last:border-b-0 ${!notif.read ? 'bg-emerald-50/50 dark:bg-emerald-500/5' : ''}`}
                            >
                              <div className="flex-shrink-0 mt-0.5">
                                {getNotificationIcon(notif.type)}
                              </div>
                              <div className="flex-1 min-w-0 text-left">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">{notif.title}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{notif.message}</p>
                                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{formatTime(notif.timestamp)}</p>
                              </div>
                              {!notif.read && (
                                <div className="w-2 h-2 bg-emerald-500 rounded-full flex-shrink-0 mt-2" />
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Balance - Always visible when logged in */}
            {isLoggedIn && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-dark-200 border border-gray-200 dark:border-dark-100"
              >
                <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                  🇵🇰 {formatBalance(balance)}
                </span>
              </motion.div>
            )}

            {/* Auth buttons - Desktop */}
            {isLoggedIn && user ? (
              <div className="hidden sm:flex items-center gap-2">
                <UserBadge user={user} showBalance={false} />
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-gray-500 dark:text-gray-400 hover:text-red-500"
                  title="Sign Out"
                >
                  <ArrowRightOnRectangleIcon className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                {headerSettings.headerShowLogin && (
                  <Link to="/login" className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                    Login
                  </Link>
                )}
                {headerSettings.headerShowSignup && (
                  <Link to="/register" className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-emerald-500/30 transition-shadow">
                    Sign Up
                  </Link>
                )}
              </div>
            )}

            {/* Mobile Auth buttons */}
            {!isLoggedIn && (
              <div className="flex sm:hidden items-center gap-1.5">
                {headerSettings.headerShowLogin && (
                  <Link 
                    to="/login" 
                    className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-700 dark:text-gray-300"
                  >
                    Login
                  </Link>
                )}
                {headerSettings.headerShowSignup && (
                  <Link 
                    to="/register" 
                    className="px-2.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-xs font-semibold"
                  >
                    Sign Up
                  </Link>
                )}
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
            >
              {isOpen ? (
                <XMarkIcon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              ) : (
                <Bars3Icon className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden border-t border-gray-200 dark:border-dark-100"
          >
            <div className="px-4 py-4 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.href || 
                  (item.id === 'home' && location.pathname === '/')
                return (
                  <Link
                    key={item.id}
                    to={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-xl transition-all
                      ${item.highlight 
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold' 
                        : isActive 
                          ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                    {item.highlight && <span className="ml-auto text-xs bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full">LIVE</span>}
                  </Link>
                )
              })}
            </div>

            {/* Mobile Auth */}
            <div className="px-4 pb-4 pt-2 border-t border-gray-200 dark:border-dark-100 space-y-2">
              {isLoggedIn && user ? (
                <>
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 dark:bg-dark-200">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold">
                      {user.username?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{user.username}</p>
                      <p className="text-sm text-gray-500">Balance: 🇵🇰 {formatBalance(balance)}</p>
                    </div>
                  </div>
                  <Link
                    to="/profile"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold"
                  >
                    View Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-600 dark:text-red-400 font-medium hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors"
                  >
                    <ArrowRightOnRectangleIcon className="w-5 h-5" />
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-center px-4 py-3 rounded-xl border border-gray-300 dark:border-dark-100 text-gray-700 dark:text-gray-300 font-medium"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsOpen(false)}
                    className="flex items-center justify-center px-4 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
