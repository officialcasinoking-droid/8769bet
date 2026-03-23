import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { FireIcon, HeartIcon, PlayIcon, WalletIcon, GiftIcon, ArrowTrendingUpIcon, UserIcon, SparklesIcon, ChevronDownIcon, ClipboardIcon, CheckIcon } from '@heroicons/react/24/outline'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../context/AuthContext'
import { useTheme } from '../../context/ThemeContext'
import { useToast } from '../../components/ui/Toast'
import { getPublicLanding } from '../../api/admin'


const DEFAULT_CATEGORIES = [
  { id: 'hot', name: 'Hot', icon: '🔥' },
  { id: 'slots', name: 'Slots', icon: '🤑' },
  { id: 'crash', name: 'Crash', icon: '🚀' },
  { id: 'fishing', name: 'Fishing', icon: '🎣' },
  { id: 'live', name: 'Live', icon: '♠️' },
  { id: 'ai', name: 'AI Pick', icon: '🤖' },
]

const DEFAULT_GAMES = [
  { id: 1, name: 'Aviator', provider: 'Spribe', multiplier: '10000x', rtp: '97%', players: 2347, hot: true, ai: true, cat: 'crash', playable: true, image: '/images/aviator logo.jpg' },
  { id: 2, name: 'Fortune Gems 3', provider: 'JILI', multiplier: '5000x', rtp: '96%', players: 1823, hot: true, ai: false, cat: 'slots', playable: false },
  { id: 3, name: 'Money Coming', provider: 'JILI', multiplier: '10000x', rtp: '95%', players: 3421, hot: true, ai: true, cat: 'slots', playable: false },
  { id: 4, name: 'Crazy777', provider: 'WG', multiplier: '7777x', rtp: '94%', players: 987, hot: false, ai: false, cat: 'slots', playable: false },
  { id: 5, name: 'JetX', provider: 'SmartSoft', multiplier: '10000x', rtp: '97%', players: 1543, hot: true, ai: true, cat: 'crash', playable: false },
  { id: 6, name: 'Lucky Jet', provider: '3 Oaks', multiplier: '10000x', rtp: '96%', players: 2156, hot: true, ai: true, cat: 'crash', playable: false },
]

const DEFAULT_JACKPOT_TIERS = [
  { name: 'Mini', amount: 847.50 },
  { name: 'Minor', amount: 12847.25 },
  { name: 'Major', amount: 127458.00 },
  { name: 'Grand', amount: 1847293.75 },
]

export default function HomePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { user, isLoggedIn, isAdmin, logout, formatBalance } = useAuth()
  const { isDark } = useTheme()

  const [activeCategory, setActiveCategory] = useState('hot')
  const [jackpots, setJackpots] = useState(DEFAULT_JACKPOT_TIERS)

  const { data: landingData, isLoading, refetch } = useQuery({
    queryKey: ['landing-content'],
    queryFn: getPublicLanding,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  })

  const landing = landingData || {}
  const categories = landing.categories?.length ? landing.categories.map(c => ({ id: c.id, name: c.name, icon: c.icon || '📁' })) : DEFAULT_CATEGORIES
  const games = DEFAULT_GAMES
  const announcements = landing.announcements || []

  // Jackpot animation
  useEffect(() => {
    const interval = setInterval(() => {
      setJackpots(prev => prev.map(jackpot => ({
        ...jackpot,
        amount: jackpot.amount + Math.random() * (jackpot.name === 'Grand' ? 5 : jackpot.name === 'Major' ? 2 : jackpot.name === 'Minor' ? 0.5 : 0.1)
      })))
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const copyUserId = async () => {
    try {
      await navigator.clipboard.writeText(user?.id || '')
      setUserIdCopied(true)
      setTimeout(() => setUserIdCopied(false), 2000)
    } catch (err) {
      toast.error('Failed to copy user ID')
    }
  }

  const filteredGames = games.filter(g => 
    activeCategory === 'hot' ? g.hot : 
    activeCategory === 'ai' ? g.ai : 
    g.cat === activeCategory
  )

  const handleLogout = () => {
    logout()
    setShowUserMenu(false)
    toast.success('Signed out successfully', 3000)
    navigate('/')
  }

  return (
    <div className={`relative min-h-screen pb-20 sm:pb-24 md:pb-8 transition-colors duration-300 ${isDark ? 'bg-dark-400' : 'bg-gray-50'}`}>
      {/* Main Content - starts under navbar */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* LOGGED IN: User Dashboard */}
        {isLoggedIn && user && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="mb-6 relative"
          >
            {/* Glow effect behind card */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary-500 via-emerald-500 to-primary-500 rounded-2xl blur opacity-30" />
            
            <div className={`relative rounded-2xl p-4 mb-4 ${isDark ? 'bg-gradient-to-r from-primary-500/20 to-emerald-500/20 border border-primary-500/30' : 'bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200'}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <motion.p
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-sm text-gray-600 dark:text-gray-400"
                  >
                    Welcome back,
                  </motion.p>
                  <motion.p
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-xl font-bold text-gray-900 dark:text-white"
                  >
{user.full_name || user.username}! 👋
                  </motion.p>
                </div>
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-right"
                >
                  <p className="text-xs text-gray-500 dark:text-gray-400">Balance</p>
                  <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">
                    🇵🇰 {formatBalance(user.balance || 0)}
                  </p>
                </motion.div>
              </div>
              
              {/* Quick Actions - Mobile Friendly */}
              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/deposit')}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold shadow-lg shadow-primary-500/30"
                >
                  💰
                  Deposit
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/withdraw')}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white dark:bg-dark-300 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-semibold hover:border-primary-500 transition-colors"
                >
                  <motion.span animate={{ y: [0, -3, 0] }} transition={{ duration: 1, repeat: Infinity }}>
                    💸
                  </motion.span>
                  Withdraw
                </motion.button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className={`text-center p-3 rounded-xl ${isDark ? 'bg-dark-300' : 'bg-white'} border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <span className="text-2xl">🎮</span>
                <p className="text-xs text-gray-500 mt-1">Last Played</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">Aviator</p>
              </div>
              <div className={`text-center p-3 rounded-xl ${isDark ? 'bg-dark-300' : 'bg-white'} border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <span className="text-2xl">🏆</span>
                <p className="text-xs text-gray-500 mt-1">Biggest Win</p>
                <p className="text-sm font-semibold text-green-600 dark:text-green-400">₹2,450</p>
              </div>
              <div className={`text-center p-3 rounded-xl ${isDark ? 'bg-dark-300' : 'bg-white'} border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                <span className="text-2xl">🤖</span>
                <p className="text-xs text-gray-500 mt-1">AI Accuracy</p>
                <p className="text-sm font-semibold text-primary-600 dark:text-primary-400">80%</p>
              </div>
            </div>


          </motion.div>
        )}

        {/* GUEST: Promo Banner */}
        {!isLoggedIn && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="mb-6 relative"
          >
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary-500 via-emerald-500 to-primary-500 rounded-2xl blur opacity-40" />
            
            {landing.heroImage ? (
              <div className="relative overflow-hidden rounded-2xl shadow-lg">
                <motion.img
                  initial={{ scale: 1.1 }}
                  animate={{ scale: 1 }}
                  src={landing.heroImage} alt="hero" className="w-full h-40 object-cover"
                  onError={e => { e.target.style.display = 'none'; e.target.nextSibling?.removeAttribute('style') }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent flex items-center p-6">
                  <div>
                    <motion.h2
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.2 }}
                      className="text-2xl font-bold text-white"
                    >
{landing.title || 'Welcome to 399bet'}
                    </motion.h2>
                    <motion.p
                      initial={{ x: -50, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-white/90 text-lg"
                    >
                      {landing.subtitle || 'Best AI-powered bets'}
                    </motion.p>
                    <Link to="/register" className="inline-block mt-3 px-6 py-2 rounded-xl font-bold shadow-lg hover:shadow-xl transition-shadow"
                      style={{ backgroundColor: landing.colors?.primary || '#10b981', color: 'white' }}>
                      Get Started →
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative overflow-hidden rounded-2xl p-6 shadow-lg"
                style={{ background: `linear-gradient(135deg, ${landing.colors?.primary || '#10b981'}, ${landing.colors?.accent || '#6366f1'})` }}>
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                <h2 className="text-2xl font-bold text-white relative z-10">{landing.title || 'Welcome to 399bet'}</h2>
                <p className="text-white/90 text-lg relative z-10">{landing.subtitle || 'Best AI-powered bets'}</p>
                <div className="flex gap-2 text-2xl mt-2 relative z-10">🤝 💰 💰</div>
                <Link to="/register" className="inline-block mt-4 px-6 py-2 rounded-xl bg-white font-bold shadow-md hover:shadow-lg transition-shadow relative z-10"
                  style={{ color: landing.colors?.primary || '#10b981' }}>
                  Get Started
                </Link>
              </div>
            )}
          </motion.div>
        )}

        {/* Announcements Banner */}
        {landing.showAnnouncements !== false && announcements.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
            {announcements.map((ann) => (
              <div key={ann.id} className={`rounded-xl p-3 mb-2 ${isDark ? 'bg-emerald-900/30 border border-emerald-700' : 'bg-emerald-50 border border-emerald-200'}`}>
                <p className={`text-sm ${isDark ? 'text-emerald-300' : 'text-emerald-700'}`}>📢 {ann.text}</p>
              </div>
            ))}
          </motion.div>
        )}

        {/* Categories */}
        {landing.showCategories !== false && (
        <div className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {categories.map((cat, i) => (
              <motion.button
                key={cat.id}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.1, y: -5 }}
                whileTap={{ scale: 0.95 }}
                viewport={{ once: true }}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex-shrink-0 flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${activeCategory === cat.id ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30' : isDark ? 'bg-dark-300 text-gray-400 hover:bg-dark-200' : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-500'}`}
              >
<span className="text-xl">{cat.icon}</span>
                <span className="text-xs font-medium">{cat.name}</span>
              </motion.button>
            ))}
          </div>
        </div>
        )}

        {/* Jackpot Banner */}
        {landing.showJackpot !== false && (
        <motion.div
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className="mb-6 relative"
        >
          {/* Glow effect for jackpot */}
          <motion.div
            animate={{
              boxShadow: [
                '0 0 20px rgba(234, 179, 8, 0.2)',
                '0 0 40px rgba(234, 179, 8, 0.4)',
                '0 0 60px rgba(234, 179, 8, 0.2)',
                '0 0 40px rgba(234, 179, 8, 0.1)',
              ],
            }}
            transition={{ duration: 3, repeat: Infinity }}
            className={`rounded-xl sm:rounded-2xl p-3 sm:p-5 ${isDark ? 'bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-gray-700/50' : 'bg-gradient-to-br from-gray-50 to-white border border-gray-200'}`}
          >
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <motion.span
                  animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="text-lg sm:text-2xl"
                >
                  💎
                </motion.span>
                <span className={`font-bold tracking-wide text-xs sm:text-sm ${isDark ? 'text-white' : 'text-gray-700'}`}>
                  PROGRESSIVE JACKPOT
                </span>
              </div>
              <span className={`text-[10px] sm:text-xs ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>Network Wide</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              {jackpots.map((tier) => {
                const colors = {
                  'Mini': { bg: 'bg-gray-500/20', text: 'text-gray-400' },
                  'Minor': { bg: 'bg-blue-500/20', text: 'text-blue-400' },
                  'Major': { bg: 'bg-purple-500/20', text: 'text-purple-400' },
                  'Grand': { bg: 'bg-yellow-500/20', text: 'text-yellow-400' },
                }
                const color = colors[tier.name] || colors['Mini']
                return (
                  <motion.div
                    key={tier.name}
                    whileHover={{ scale: 1.02 }}
                    className={`text-center p-1.5 sm:p-2 rounded-lg ${color.bg}`}
                  >
                    <div className={`text-[8px] sm:text-[9px] font-semibold uppercase tracking-wider mb-0.5 ${color.text}`}>
                      {tier.name}
                    </div>
                    <motion.div
                      animate={{ scale: [1, 1.02, 1] }}
                      transition={{ duration: 0.5, repeat: Infinity }}
                      className={`font-mono font-bold text-[10px] sm:text-xs ${color.text}`}
                    >
                      ₨{tier.amount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                    </motion.div>
                  </motion.div>
                )
              })}
            </div>
          </motion.div>
        </motion.div>
        )}

        {/* Game Grid */}
        {landing.showGameCards !== false && (
        <div className="mb-4">
          <div className={`flex gap-4 mb-4 ${isDark ? 'border-b border-gray-700' : 'border-b border-gray-200'}`}>
            {['Hot', 'All', 'Favorites'].map((tab, i) => (
              <button key={tab} className={`pb-2 px-1 text-sm font-medium ${i === 0 ? (isDark ? 'text-primary-400 border-b-2 border-primary-400' : 'text-primary-600 border-b-2 border-primary-500') : isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                {tab}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filteredGames.map((game, i) => (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05, y: -5 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, type: 'spring', stiffness: 300 }}
                onClick={() => {
                  if (game.playable) {
                    navigate(`/play/aviator`)
                  }
                }}
                className={`group relative rounded-xl overflow-hidden cursor-pointer ${isDark ? 'bg-dark-300' : 'bg-white shadow-sm hover:shadow-lg'}`}
              >
                {/* Glow Effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-primary-500/20 to-emerald-500/20 opacity-0 group-hover:opacity-100 transition-opacity"
                />
                
                <div className={`aspect-square relative flex items-center justify-center overflow-hidden ${isDark ? 'bg-dark-400' : 'bg-gray-100'}`}>
                  {game.image ? (
                    <img src={game.image} alt={game.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl sm:text-4xl">
                      {game.cat === 'crash' ? '🚀' : '💎'}
                    </span>
                  )}
                  {game.hot && (
                    <motion.span
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] font-bold bg-gradient-to-r from-orange-500 to-red-500 text-white flex items-center gap-0.5 animate-pulse"
                    >
                      <FireIcon className="w-2.5 h-2.5" /> HOT
                    </motion.span>
                  )}
                  {game.ai && (
                    <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] font-bold bg-primary-500 text-white">
                      🤖 AI
                    </span>
                  )}
                  <div className={`absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] font-mono font-bold ${isDark ? 'bg-dark-400/80 text-primary-400' : 'bg-white/90 text-primary-600'}`}>
                    {game.multiplier}
                  </div>
                </div>
                <div className="p-1.5 sm:p-2">
                  <h3 className={`text-[10px] sm:text-xs font-semibold truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{game.name}</h3>
                  <p className={`text-[8px] sm:text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{game.provider}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className={`text-[8px] sm:text-[10px] font-medium ${isDark ? 'text-primary-400' : 'text-primary-600'}`}>{game.rtp}</span>
                    <span className={`text-[8px] sm:text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{game.players}</span>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); game.playable ? navigate(`/play/aviator`) : null }} className="w-full mt-1.5 py-1 rounded bg-gradient-to-r from-primary-500 to-primary-600 text-white text-[8px] sm:text-[10px] font-bold">
                    {game.playable ? 'PLAY' : 'SOON'}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
        )}


      </div>

      {/* Footer text from landing config */}
      {landing.footerText && (
        <div className={`text-center text-xs py-4 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
          {landing.footerText}
        </div>
      )}
    </div>
  )
}
