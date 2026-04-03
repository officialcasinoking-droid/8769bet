import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { EyeIcon, EyeSlashIcon, LockClosedIcon, UserIcon, ArrowRightIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const toast = useToast()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    await new Promise(resolve => setTimeout(resolve, 800))
    const result = await login(username, password)
    if (result.success) {
      toast.success('Welcome back, God!')
      navigate('/')
    } else {
      toast.error(result.error || 'Invalid credentials')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-admin-bg flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary-500/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 mb-4 shadow-lg shadow-primary-500/25">
            <span className="text-2xl font-bold text-white">8</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">8769bet Admin</h1>
          <p className="text-admin-muted text-sm">Enter your credentials to access God Mode</p>
        </div>

        <div className="bg-admin-card rounded-2xl border border-admin-border p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-admin-text mb-2">Username</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-admin-muted" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="input-field pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-admin-text mb-2">Password</label>
              <div className="relative">
                <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-admin-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="input-field pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-admin-muted hover:text-white transition-colors"
                >
                  {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full btn-primary flex items-center justify-center gap-2 py-3 text-base"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Login to God Mode
                  <ArrowRightIcon className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </form>

          <div className="mt-6 p-4 rounded-lg bg-admin-sidebar border border-admin-border">
            <p className="text-xs text-admin-muted text-center mb-2">Demo Credentials</p>
            <div className="text-xs text-admin-muted space-y-1">
              <p><span className="text-primary-400">Username:</span> admin</p>
              <p><span className="text-primary-400">Password:</span> admin123</p>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
          <a href="https://eight769bet-frontend.onrender.com" target="_blank" className="text-sm text-admin-muted hover:text-primary-400 transition-colors">
            ← Back to website
          </a>
        </div>
      </motion.div>
    </div>
  )
}
