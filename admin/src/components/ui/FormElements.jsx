import { Loader2 } from 'lucide-react'

export function Button({ 
  children, 
  onClick, 
  className = '', 
  disabled = false, 
  size = 'md',
  type = 'button'
}) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  }
  
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn-primary flex items-center justify-center gap-2 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses[size]} ${className}`}
    >
      {disabled && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  )
}
