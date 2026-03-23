import { motion } from 'framer-motion'

export default function PasswordStrengthMeter({ password }) {
  const getStrength = (pwd) => {
    if (!pwd) return { level: 0, label: '', color: '' }
    
    let strength = 0
    if (pwd.length >= 8) strength++
    if (pwd.length >= 12) strength++
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) strength++
    if (/\d/.test(pwd)) strength++
    if (/[^a-zA-Z0-9]/.test(pwd)) strength++

    const levels = [
      { level: 0, label: '', color: '' },
      { level: 1, label: 'Weak', color: 'bg-red-500' },
      { level: 2, label: 'Fair', color: 'bg-orange-500' },
      { level: 3, label: 'Good', color: 'bg-yellow-500' },
      { level: 4, label: 'Strong', color: 'bg-green-500' },
      { level: 5, label: 'Very Strong', color: 'bg-emerald-500' }
    ]

    return levels[Math.min(strength, 5)]
  }

  const { level, label, color } = getStrength(password)

  if (!password) return null

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 mb-1">
        <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${(level / 5) * 100}%` }}
            transition={{ duration: 0.3 }}
            className={`h-full ${color}`}
          />
        </div>
        <span className={`text-xs font-medium ${level >= 4 ? 'text-green-600 dark:text-green-400' : level >= 2 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}`}>
          {label}
        </span>
      </div>
      
      {/* Requirements Checklist */}
      <div className="grid grid-cols-2 gap-1 mt-2 text-xs">
        {[
          { test: password.length >= 8, label: '8+ characters' },
          { test: /[a-z]/.test(password) && /[A-Z]/.test(password), label: 'Upper & lowercase' },
          { test: /\d/.test(password), label: 'Numbers' },
          { test: /[^a-zA-Z0-9]/.test(password), label: 'Special characters' }
        ].map((req, i) => (
          <div key={i} className={`flex items-center gap-1 ${req.test ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
            <span>{req.test ? '✓' : '○'}</span>
            <span>{req.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
