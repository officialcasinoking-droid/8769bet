import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  HomeIcon, PencilSquareIcon, CubeIcon, CurrencyRupeeIcon,
  MegaphoneIcon, UsersIcon, CogIcon, ChevronLeftIcon,
  ChevronRightIcon, EyeIcon, ArrowRightOnRectangleIcon,
  BanknotesIcon, SparklesIcon, ArrowLeftIcon, UserGroupIcon,
  ChatBubbleLeftRightIcon, MagnifyingGlassIcon, RocketLaunchIcon
} from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'

const menuItems = [
  { id: 'dashboard', name: 'Dashboard', icon: HomeIcon, path: '/admin' },
  { id: 'aviator', name: 'Aviator Game', icon: RocketLaunchIcon, path: '/admin/aviator' },
  { id: 'landing', name: 'Landing Page', icon: PencilSquareIcon, path: '/admin/landing' },
  { id: 'deposit-withdrawal', name: 'Deposit & Withdrawal', icon: BanknotesIcon, path: '/admin/deposit-withdrawal' },
  { id: 'games', name: 'Games', icon: CubeIcon, path: '/admin/games' },
  { id: 'jackpot', name: 'Jackpot', icon: CurrencyRupeeIcon, path: '/admin/jackpot' },
  { id: 'announcements', name: 'Announcements', icon: MegaphoneIcon, path: '/admin/announcements' },
  { id: 'referrals', name: 'Referrals', icon: UserGroupIcon, path: '/admin/referrals' },
  { id: 'users', name: 'Users', icon: UsersIcon, path: '/admin/users' },
  { id: 'support', name: 'Support', icon: ChatBubbleLeftRightIcon, path: '/admin/support' },
  { id: 'ai-agent', name: 'AI Agent', icon: SparklesIcon, path: '/admin/ai-agent' },
  { id: 'settings', name: 'Settings', icon: CogIcon, path: '/admin/settings' },
]

const PAGE_TITLES = {
  '/admin': 'Admin Dashboard',
  '/admin/aviator': 'Aviator Game Control',
  '/admin/landing': 'Landing Page Editor',
  '/admin/deposit-withdrawal': 'Deposit & Withdrawal',
  '/admin/games': 'Game Management',
  '/admin/jackpot': 'Jackpot Settings',
  '/admin/announcements': 'Announcements',
  '/admin/referrals': 'Referral Management',
  '/admin/users': 'User Management',
  '/admin/support': 'Support Center',
  '/admin/settings': 'Settings',
  '/admin/ai-agent': 'AI Agent Settings',
}

const IS_SECTION = {
  '/admin': false,
  '/admin/aviator': true,
  '/admin/landing': true,
  '/admin/deposit-withdrawal': true,
  '/admin/games': true,
  '/admin/jackpot': true,
  '/admin/announcements': true,
  '/admin/referrals': true,
  '/admin/users': true,
  '/admin/support': true,
  '/admin/settings': true,
  '/admin/ai-agent': true,
}

export default function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [globalSearch, setGlobalSearch] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)

  const currentPath = location.pathname
  const pageTitle = PAGE_TITLES[currentPath] || 'Admin Dashboard'
  const isSection = IS_SECTION[currentPath] || false

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleBack = () => {
    if (window.history.length > 2 && document.referrer) {
      navigate(-1)
    } else {
      navigate('/admin')
    }
  }

  const handleGlobalSearch = async (query) => {
    setGlobalSearch(query)
    if (!query.trim() || query.length < 2) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    setSearching(true)
    setShowResults(true)
    const results = []
    const q = query.toLowerCase()

    try {
      const { data: users } = await supabase
        .from('users')
        .select('id, username, email, balance, is_active')
        .or(`username.ilike.%${q}%,email.ilike.%${q}%,id.ilike.%${q}%`)
        .limit(5)
      
      if (users && users.length > 0) {
        users.forEach(u => results.push({
          type: 'user',
          title: u.username,
          subtitle: u.email || 'No email',
          extra: `Balance: ₨${Number(u.balance || 0).toLocaleString()}`,
          path: '/admin/users',
          id: u.id
        }))
      }

      const { data: withdrawals } = await supabase
        .from('withdrawals')
        .select('id, user_id, amount, status')
        .or(`user_id.ilike.%${q}%`)
        .limit(5)

      if (withdrawals && withdrawals.length > 0) {
        withdrawals.forEach(w => results.push({
          type: 'withdrawal',
          title: `Withdrawal: ₨${Number(w.amount || 0).toLocaleString()}`,
          subtitle: `User: ${w.user_id?.slice(0, 8) || 'Unknown'}`,
          status: w.status,
          path: '/admin/deposit-withdrawal',
          id: w.id
        }))
      }

      const { data: transactions } = await supabase
        .from('transactions')
        .select('id, user_id, type, amount, description')
        .or(`user_id.ilike.%${q}%,description.ilike.%${q}%`)
        .limit(5)
      
      if (transactions && transactions.length > 0) {
        transactions.forEach(tx => results.push({
          type: 'transaction',
          title: `${tx.type}: ₨${Number(tx.amount || 0).toLocaleString()}`,
          subtitle: tx.description || tx.note || 'Transaction',
          extra: `User ID: ${tx.user_id?.slice(0, 8)}...`,
          path: '/admin/deposit-withdrawal',
          id: tx.id
        }))
      }

      setSearchResults(results)
    } catch (err) {
      console.error('Search error:', err)
    } finally {
      setSearching(false)
    }
  }

  const handleResultClick = (result) => {
    setGlobalSearch('')
    setSearchResults([])
    setShowResults(false)
    navigate(result.path)
  }

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showResults && !e.target.closest('.global-search-container')) {
        setShowResults(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [showResults])

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <aside
        className={`fixed left-0 top-0 h-screen bg-slate-900/80 backdrop-blur-xl border-r border-slate-800/50 z-50 flex flex-col transition-all duration-300 ${collapsed ? 'w-20' : 'w-64'}`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/50">
          {!collapsed && (
            <Link to="/admin" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <span className="text-sm font-bold text-white">8</span>
              </div>
              <span className="text-lg font-bold text-white">8769bet</span>
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            {collapsed ? <ChevronRightIcon className="w-5 h-5" /> : <ChevronLeftIcon className="w-5 h-5" />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <div className="space-y-1">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path
              const Icon = item.icon
              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-white border border-transparent'
                  }`}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0 ${isActive ? 'text-emerald-400' : ''}`} />
                  {!collapsed && <span className="text-sm font-medium truncate">{item.name}</span>}
                </Link>
              )
            })}
          </div>
        </nav>

        <div className="p-3 border-t border-slate-800/50 space-y-1">
          <Link
            to="https://8769bet.com"
            target="_blank"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-slate-800/50 hover:text-white transition-all border border-transparent"
          >
            <EyeIcon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">View Site</span>}
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 transition-all border border-transparent"
          >
            <ArrowRightOnRectangleIcon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="text-sm font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      <main className={`flex-1 min-h-screen transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-64'}`}>
        <header className="sticky top-0 z-40 h-16 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            {isSection && (
              <button
                onClick={handleBack}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors border border-slate-800/50 hover:border-slate-700"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Back
              </button>
            )}
            <h1 className="text-lg font-bold text-white">
              {pageTitle}
            </h1>
          </div>
          
          <div className="relative global-search-container flex-1 max-w-md mx-4">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => handleGlobalSearch(e.target.value)}
              placeholder="Search users, withdrawals, tickets..."
              className="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all"
            />
            
            {showResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700/50 rounded-xl shadow-xl overflow-hidden max-h-96 overflow-y-auto z-50">
                {searching ? (
                  <div className="p-4 text-center text-slate-400">
                    <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-sm">
                    No results found for "{globalSearch}"
                  </div>
                ) : (
                  <div className="py-2">
                    {searchResults.map((result, i) => (
                      <button
                        key={`${result.type}-${result.id}-${i}`}
                        onClick={() => handleResultClick(result)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800/50 transition-colors text-left"
                      >
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          result.type === 'user' ? 'bg-emerald-500/20 text-emerald-400' :
                          result.type === 'withdrawal' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-slate-500/20 text-slate-400'
                        }`}>
                          {result.type.toUpperCase()}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{result.title}</p>
                          <p className="text-xs text-slate-400 truncate">{result.subtitle}</p>
                        </div>
                        <span className="text-xs text-slate-500">{result.extra}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <span className="px-3 py-1 rounded-full bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
              GOD MODE
            </span>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold shadow-lg shadow-emerald-500/20">
                {user?.username?.charAt(0)?.toUpperCase() || 'A'}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium text-white">{user?.username || 'Admin'}</p>
                <p className="text-xs text-slate-500 capitalize">{user?.role === 'god' ? 'Administrator' : 'Admin'}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
