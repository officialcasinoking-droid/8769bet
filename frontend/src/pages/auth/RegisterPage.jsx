import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { EyeIcon, EyeSlashIcon, UserIcon, EnvelopeIcon, LockClosedIcon, GiftIcon, ArrowRightIcon, CheckCircleIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/ui/Toast'
import AuthFormWrapper from '../../components/auth/AuthFormWrapper'
import SocialButton from '../../components/auth/SocialButton'
import PasswordStrengthMeter from '../../components/auth/PasswordStrengthMeter'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { signup, isLoggedIn, loading: authLoading } = useAuth()
  const toast = useToast()
  
  const [formData, setFormData] = useState({
    full_name: '',
    username: '',
    email: '',
    password: '',
    confirm_password: '',
    referral_code: searchParams.get('ref') || '',
    terms: false
  })
  
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && isLoggedIn) {
      navigate('/', { replace: true })
    }
  }, [isLoggedIn, authLoading, navigate])

  const validateForm = () => {
    const errors = {}
    
    // Full name validation
    if (!formData.full_name.trim()) {
      errors.full_name = 'Full name is required'
    } else if (formData.full_name.length < 2) {
      errors.full_name = 'Name must be at least 2 characters'
    }
    
    // Username validation
    if (!formData.username.trim()) {
      errors.username = 'Username is required'
    } else if (formData.username.length < 3) {
      errors.username = 'Username must be at least 3 characters'
    } else if (!/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      errors.username = 'Only letters, numbers, and underscores allowed'
    }
    
    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Enter a valid email address'
    }
    
    // Password validation - clear and specific messages
    if (!formData.password) {
      errors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters'
    } else if (!/(?=.*[a-z])/.test(formData.password)) {
      errors.password = 'Add at least one lowercase letter'
    } else if (!/(?=.*[A-Z])/.test(formData.password)) {
      errors.password = 'Add at least one uppercase letter'
    } else if (!/(?=.*\d)/.test(formData.password)) {
      errors.password = 'Add at least one number'
    }
    
    // Confirm password
    if (!formData.confirm_password) {
      errors.confirm_password = 'Please confirm your password'
    } else if (formData.password !== formData.confirm_password) {
      errors.confirm_password = 'Passwords do not match'
    }
    
    // Terms
    if (!formData.terms) {
      errors.terms = 'You must accept the terms'
    }
    
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
    // Clear field error when user types
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({ ...prev, [name]: '' }))
    }
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!validateForm()) return
    
    setLoading(true)
    
    try {
      const result = await signup({
        full_name: formData.full_name,
        username: formData.username,
        email: formData.email,
        password: formData.password,
        referral_code: formData.referral_code
      })
      
      if (result.success) {
        if (result.isAutoLoggedIn) {
          toast.success('Account created! Welcome aboard!', 3000)
          navigate('/', { replace: true })
        } else {
          setSuccess(true)
          toast.success(result.message || 'Account created successfully!', 3000)
          setTimeout(() => {
            navigate('/', { replace: true })
          }, 2000)
        }
      } else {
        setError(result.error)
      }
    } catch (err) {
      setError('Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = () => {
    toast.info('Google OAuth coming soon!')
  }

  const handleTelegramSignup = () => {
    toast.info('Telegram login coming soon!')
  }

  if (success) {
    return (
      <AuthFormWrapper title="Welcome to 399bet!" subtitle="Start your winning journey today">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"
          >
            <CheckCircleIcon className="w-10 h-10 text-green-500" />
          </motion.div>
          
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Account Created!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Welcome bonus of <span className="text-primary-600 font-bold">PKR 50</span> credited!
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Redirecting you to home...
          </p>
          
          <div className="mt-6 w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 2, ease: 'linear' }}
              className="h-full bg-gradient-to-r from-primary-500 to-primary-600"
            />
          </div>
        </motion.div>
      </AuthFormWrapper>
    )
  }

  return (
    <AuthFormWrapper
      title="Join 399bet"
      subtitle="Start winning today"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Create Account
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Join thousands of winners every day
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                placeholder="John Doe"
                className={`w-full pl-10 pr-4 py-3 rounded-xl bg-gray-100 dark:bg-dark-400 border ${
                  fieldErrors.full_name ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                } text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors`}
              />
            </div>
            {fieldErrors.full_name && <p className="mt-1 text-sm text-red-500">{fieldErrors.full_name}</p>}
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Username
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">@</span>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="johndoe123"
                className={`w-full pl-10 pr-4 py-3 rounded-xl bg-gray-100 dark:bg-dark-400 border ${
                  fieldErrors.username ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                } text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors`}
              />
            </div>
            {fieldErrors.username && <p className="mt-1 text-sm text-red-500">{fieldErrors.username}</p>}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className={`w-full pl-10 pr-4 py-3 rounded-xl bg-gray-100 dark:bg-dark-400 border ${
                  fieldErrors.email ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                } text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors`}
              />
            </div>
            {fieldErrors.email && <p className="mt-1 text-sm text-red-500">{fieldErrors.email}</p>}
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
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a strong password"
                className={`w-full pl-10 pr-12 py-3 rounded-xl bg-gray-100 dark:bg-dark-400 border ${
                  fieldErrors.password ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                } text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
            <PasswordStrengthMeter password={formData.password} />
            {fieldErrors.password && <p className="mt-1 text-sm text-red-500">{fieldErrors.password}</p>}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirm_password"
                value={formData.confirm_password}
                onChange={handleChange}
                placeholder="Confirm your password"
                className={`w-full pl-10 pr-12 py-3 rounded-xl bg-gray-100 dark:bg-dark-400 border ${
                  fieldErrors.confirm_password ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                } text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
            {fieldErrors.confirm_password && <p className="mt-1 text-sm text-red-500">{fieldErrors.confirm_password}</p>}
          </div>

          {/* Referral Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Referral Code <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <GiftIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                name="referral_code"
                value={formData.referral_code}
                onChange={handleChange}
                placeholder="FRIEND123"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-100 dark:bg-dark-400 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors"
              />
            </div>
          </div>

          {/* Terms */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="terms"
                checked={formData.terms}
                onChange={handleChange}
                className="w-5 h-5 mt-0.5 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                I agree to the{' '}
                <a href="#" className="text-primary-600 dark:text-primary-400 hover:underline">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-primary-600 dark:text-primary-400 hover:underline">Responsible Gaming</a>
              </span>
            </label>
            {fieldErrors.terms && <p className="mt-1 text-sm text-red-500">{fieldErrors.terms}</p>}
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
            >
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </motion.div>
          )}

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold disabled:opacity-50 shadow-lg shadow-primary-500/25 transition-all"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating Account...
              </>
            ) : (
              <>
                Create Account
                <ArrowRightIcon className="w-5 h-5" />
              </>
            )}
          </motion.button>
        </form>

        {/* Social */}
        <div className="mt-6">
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
            <span className="text-sm text-gray-500 dark:text-gray-400">or continue with</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
          </div>

          <div className="space-y-3">
            <SocialButton provider="google" onClick={handleGoogleSignup} disabled={loading} />
            <SocialButton provider="telegram" onClick={handleTelegramSignup} disabled={loading} />
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-primary-600 dark:text-primary-400 hover:underline">
            Sign In
          </Link>
        </p>

        {/* Welcome Bonus */}
        <div className="mt-6 p-4 rounded-xl bg-gradient-to-r from-primary-50 to-emerald-50 dark:from-primary-900/20 dark:to-emerald-900/20 border border-primary-200 dark:border-primary-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center">
              <span className="text-lg">🎁</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-primary-700 dark:text-primary-300">
                Get PKR 50 Welcome Bonus!
              </p>
              <p className="text-xs text-primary-600 dark:text-primary-400">
                Plus extra rewards with referral code
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </AuthFormWrapper>
  )
}

