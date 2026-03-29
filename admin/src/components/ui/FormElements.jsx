import { forwardRef } from 'react'

export const FormField = ({ label, error, children, hint }) => (
  <div className="space-y-1.5">
    {label && (
      <label className="block text-xs font-medium text-slate-300">{label}</label>
    )}
    {children}
    {error && <p className="text-xs text-red-400">{error}</p>}
    {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
  </div>
)

export const Input = forwardRef(({ className = '', error, ...props }, ref) => (
  <input
    ref={ref}
    className={`w-full bg-slate-800/80 border rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
      error
        ? 'border-red-500/50 focus:ring-red-500/30 focus:border-red-500'
        : 'border-slate-700/50 focus:ring-emerald-500/30 focus:border-emerald-500/50'
    } ${className}`}
    {...props}
  />
))
Input.displayName = 'Input'

export const Select = forwardRef(({ className = '', error, children, ...props }, ref) => (
  <select
    ref={ref}
    className={`w-full bg-slate-800/80 border rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 transition-all ${
      error
        ? 'border-red-500/50 focus:ring-red-500/30 focus:border-red-500'
        : 'border-slate-700/50 focus:ring-emerald-500/30 focus:border-emerald-500/50'
    } ${className}`}
    {...props}
  >
    {children}
  </select>
))
Select.displayName = 'Select'

export const Textarea = forwardRef(({ className = '', error, ...props }, ref) => (
  <textarea
    ref={ref}
    className={`w-full bg-slate-800/80 border rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 resize-none transition-all ${
      error
        ? 'border-red-500/50 focus:ring-red-500/30 focus:border-red-500'
        : 'border-slate-700/50 focus:ring-emerald-500/30 focus:border-emerald-500/50'
    } ${className}`}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

export function Toggle({ checked, onChange, label, description, variant = 'emerald' }) {
  const colors = {
    emerald: { on: 'bg-emerald-500', off: 'bg-slate-700', ring: 'ring-emerald-500/30' },
    orange: { on: 'bg-orange-500', off: 'bg-slate-700', ring: 'ring-orange-500/30' },
    red: { on: 'bg-red-500', off: 'bg-slate-700', ring: 'ring-red-500/30' },
  }
  const c = colors[variant] || colors.emerald
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
        checked
          ? `${c.on}/15 border-${variant === 'emerald' ? 'emerald' : variant === 'orange' ? 'orange' : 'red'}-500/30`
          : 'bg-slate-800/50 border-slate-700/50'
      }`}
    >
      <div className="text-left">
        <p className={`text-sm font-medium ${checked ? 'text-white' : 'text-slate-300'}`}>{label}</p>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
      <div className={`relative w-11 h-6 rounded-full transition-colors ${checked ? c.on : c.off}`}>
        <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </div>
    </button>
  )
}

export function Button({ variant = 'default', size = 'md', className = '', children, ...props }) {
  const variants = {
    default: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/20',
    outline: 'bg-transparent border border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600',
    ghost: 'bg-transparent text-slate-400 hover:bg-slate-800 hover:text-white',
    danger: 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/20',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-lg',
    md: 'px-4 py-2 text-sm rounded-xl',
    lg: 'px-6 py-3 text-sm rounded-xl',
  }
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

export function Badge({ children, variant = 'default' }) {
  const variants = {
    default: 'bg-slate-700/50 text-slate-300',
    emerald: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20',
    red: 'bg-red-500/15 text-red-400 border border-red-500/20',
    amber: 'bg-amber-500/15 text-amber-400 border border-amber-500/20',
    blue: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${variants[variant]}`}>
      {children}
    </span>
  )
}
