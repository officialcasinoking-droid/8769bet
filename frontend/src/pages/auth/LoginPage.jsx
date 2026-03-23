import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { EyeIcon, EyeSlashIcon, LockClosedIcon, UserIcon, ArrowRightIcon, SparklesIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/ui/Toast'
import AuthFormWrapper from '../../components/auth/AuthFormWrapper'
import SocialButton from '../../components/auth/SocialButton'
import ForgotPasswordModal from '../../components/auth/ForgotPasswordModal'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login, isLoggedIn, isAdmin, loading: authLoading } = useAuth()
  const toast = useToast()

  useEffect(() => {
    if (!authLoading && isLoggedIn) {
      const from = location.state?.from?.pathname
      if (isAdmin) {
        navigate(from || '/admin', { replace: true })
      } else {
        navigate(from || '/', { replace: true })
      }
    }
  }, [isLoggedIn, authLoading, navigate, location, isAdmin])
  
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [forgotModal, setForgotModal] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const hasRedirected = useRef(false)

  const validateForm = () => {
    const errors = {}
    
    if (!username.trim()) {
      errors.username = 'Username or email is required'
    }
    
    if (!password) {
      errors.password = 'Password is required'
    } else if (password.length < 8) {
      errors.password = 'Password must be at least 8 characters'
    }
    
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!validateForm()) {
      return
    }
    
    setLoading(true)
    
    try {
      const result = await login(username, password)
      
      if (result.success) {
        if (result.isAdmin) {
          toast.success('Admin access granted!', 3000)
          navigate('/admin', { replace: true })
        } else {
          toast.success('Welcome back!', 3000)
          navigate('/', { replace: true })
        }
      } else {
        setError(result.error || 'Invalid credentials')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = async (type) => {
    setLoading(true)
    setError('')
    
    try {
      let result
      if (type === 'admin') {
        result = await login('admin', 'admin123')
        if (result.success) {
          toast.success('Admin access granted!', 3000)
          navigate('/admin', { replace: true })
          return
        }
      } else {
        result = await login('demo', 'demo123')
        if (result.success) {
          toast.success('Welcome back!', 3000)
          navigate('/', { replace: true })
          return
        }
      }
      setError(result?.error || 'Login failed')
    } catch (err) {
      setError('Demo login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    toast.info('Google OAuth coming soon!')
  }

  const handleTelegramLogin = () => {
    toast.info('Telegram login coming soon!')
  }

  return (
    <>
      <AuthFormWrapper
        title="Welcome Back"
        subtitle="Sign in to continue winning"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Sign In
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Enter your credentials to access your account
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username/Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Username or Email
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value)
                    if (fieldErrors.username) setFieldErrors(prev => ({ ...prev, username: '' }))
                  }}
                  placeholder="Enter username or email"
                  className={`w-full pl-10 pr-4 py-3 rounded-xl bg-gray-100 dark:bg-dark-400 border ${
                    fieldErrors.username 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-200 dark:border-gray-700 focus:ring-primary-500'
                  } text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2`}
                />
              </div>
              {fieldErrors.username && (
                <p className="mt-1 text-sm text-red-500">{fieldErrors.username}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: '' }))
                  }}
                  placeholder="Enter your password"
                  className={`w-full pl-10 pr-12 py-3 rounded-xl bg-gray-100 dark:bg-dark-400 border ${
                    fieldErrors.password 
                      ? 'border-red-500 focus:ring-red-500' 
                      : 'border-gray-200 dark:border-gray-700 focus:ring-primary-500'
                  } text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="mt-1 text-sm text-red-500">{fieldErrors.password}</p>
              )}
            </div>

            {/* Remember & Forgot */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="flex items-center gap-2 cursor-pointer order-2 sm:order-1">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => setForgotModal(true)}
                className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 order-1 sm:order-2"
              >
                Forgot password?
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
              >
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </motion.div>
            )}

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/25 hover:shadow-xl transition-all"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRightIcon className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </form>

          {/* Demo Login Buttons */}
          <div className="mt-6 space-y-3">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-dark-400 text-gray-500">Demo Access</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <motion.button
                type="button"
                onClick={() => handleDemoLogin('user')}
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 font-medium disabled:opacity-50 transition-all"
              >
                <SparklesIcon className="w-5 h-5" />
                <span className="text-sm">Demo User</span>
              </motion.button>
              
              <motion.button
                type="button"
                onClick={() => handleDemoLogin('admin')}
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400 font-medium disabled:opacity-50 transition-all"
              >
                <ShieldCheckIcon className="w-5 h-5" />
                <span className="text-sm">Demo Admin</span>
              </motion.button>
            </div>
          </div>

          {/* Social Login */}
          <div className="mt-6">
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
              <span className="text-sm text-gray-500 dark:text-gray-400">or continue with</span>
              <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            </div>

            <div className="space-y-3">
              <SocialButton provider="google" onClick={handleGoogleLogin} disabled={loading} />
              <SocialButton provider="telegram" onClick={handleTelegramLogin} disabled={loading} />
            </div>
          </div>

          {/* Footer */}
          <p className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
            >
              Sign Up
            </Link>
          </p>
        </motion.div>
      </AuthFormWrapper>

      <ForgotPasswordModal 
        isOpen={forgotModal} 
        onClose={() => setForgotModal(false)} 
      />
    </>
  )
}
