import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { MagnifyingGlassIcon, SunIcon, MoonIcon, UserIcon, ChevronDownIcon, LogoutIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../../context/AuthContext'

export default function TopBar({ onSearchOpen }) {
  const navigate = useNavigate()
  const { user, isLoggedIn, isAdmin, logout } = useAuth()
  const [isDark, setIsDark] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const menuRef = useRef(null)

  // Initialize theme
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      setIsDark(true)
      document.documentElement.classList.add('dark')
    }
  }, [])

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleDark = () => {
    setIsDark(!isDark)
    document.documentElement.classList.toggle('dark')
    localStorage.setItem('theme', !isDark ? 'dark' : 'light')
  }

  const handleLogout = () => {
    logout()
    setShowUserMenu(false)
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-dark-400 border-b border-gray-200 dark:border-gray-700">
      <div className="h-14 sm:h-16 px-2 sm:px-4 flex items-center justify-between gap-2">
        {/* Left: Logo */}
        <Link to="/" className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-md">
            <span className="text-sm sm:text-base font-bold text-white">8</span>
          </div>
          <span className={`text-base sm:text-lg font-bold hidden sm:block ${isDark ? 'text-white' : 'text-gray-900'}`}>399bet</span>
        </Link>

        {/* Center: Search (Desktop) */}
        <div className="hidden md:flex flex-1 max-w-md mx-4">
          <div className={`relative w-full rounded-xl transition-all ${isDark ? 'bg-dark-300' : 'bg-gray-100'}`}>
            <MagnifyingGlassIcon className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
            <input
              type="text"
              placeholder="Search games, news..."
              className={`w-full pl-10 pr-4 py-2 rounded-xl bg-transparent outline-none text-sm ${isDark ? 'text-white placeholder-gray-400' : 'text-gray-900 placeholder-gray-500'}`}
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Mobile Search */}
          <button
            onClick={onSearchOpen}
            className={`md:hidden p-2 rounded-lg ${isDark ? 'bg-dark-300 text-gray-400' : 'bg-gray-100 text-gray-600'}`}
          >
            <MagnifyingGlassIcon className="w-5 h-5" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleDark}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'bg-dark-300 text-yellow-400' : 'bg-gray-100 text-gray-600'}`}
          >
            {isDark ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
          </button>

          {/* Logged Out: Login/Signup */}
          {!isLoggedIn && (
            <>
              <Link
                to="/login"
                className="hidden sm:flex items-center px-3 py-1.5 rounded-full font-medium text-sm border border-primary-500 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="flex items-center px-3 py-1.5 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold text-sm shadow-sm hover:shadow-md transition-shadow"
              >
                Sign Up
              </Link>
            </>
          )}

          {/* Logged In: Balance + Profile */}
          {isLoggedIn && user && (
            <>
              {/* Balance - Always visible */}
              <div className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full ${isDark ? 'bg-dark-300' : 'bg-gray-100'}`}>
                <span className="text-primary-600 dark:text-primary-400 font-semibold text-sm">
                  PKR {user.balance?.toFixed(2) || '0.00'}
                </span>
              </div>

              {/* Deposit - Desktop */}
              <Link
                to="/deposit"
                className="hidden sm:flex items-center px-3 py-1.5 rounded-full bg-gradient-to-r from-yellow-400 to-yellow-500 text-gray-900 font-bold text-sm shadow-sm hover:shadow-md transition-shadow"
              >
                Deposit
              </Link>

              {/* User Menu Dropdown */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className={`flex items-center gap-1 p-1.5 rounded-lg transition-colors ${isDark ? 'bg-dark-300 hover:bg-dark-200' : 'bg-gray-100 hover:bg-gray-200'}`}
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-sm">
                    {user.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <ChevronDownIcon className={`w-4 h-4 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-dark-300 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50"
                    >
                      {/* User Info */}
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-lg">
                            {user.username?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white truncate">{user.full_name || user.username}</p>
                            <p className="text-sm text-primary-600 dark:text-primary-400 font-medium">PKR {user.balance?.toFixed(2) || '0.00'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="p-2">
                        <button
                          onClick={() => { setShowUserMenu(false); navigate('/profile') }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <UserIcon className="w-5 h-5 text-gray-500" />
                          <span className="text-gray-900 dark:text-white">My Profile</span>
                        </button>
                        <button
                          onClick={() => { setShowUserMenu(false); navigate('/deposit') }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <span className="text-lg">💰</span>
                          <span className="text-gray-900 dark:text-white">Deposit</span>
                        </button>
                        <button
                          onClick={() => { setShowUserMenu(false); navigate('/withdraw') }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <span className="text-lg">💸</span>
                          <span className="text-gray-900 dark:text-white">Withdraw</span>
                        </button>
                      </div>

                      {/* Logout */}
                      <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors"
                        >
                          <LogoutIcon className="w-5 h-5" />
                          <span className="font-medium">Sign Out</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

