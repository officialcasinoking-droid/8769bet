import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

export function Dialog({ open, onClose, children, className = '' }) {
  const overlayRef = useRef(null)

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === 'Escape' && open) onClose() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            ref={overlayRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={`relative z-10 w-full max-h-[90vh] overflow-y-auto bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl ${className}`}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

export function DialogHeader({ children, onClose }) {
  return (
    <div className="flex items-center justify-between p-5 border-b border-slate-700/50">
      <div>{children}</div>
      {onClose && (
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  )
}

export function DialogTitle({ children }) {
  return <h2 className="text-lg font-bold text-white">{children}</h2>
}

export function DialogDescription({ children }) {
  return <p className="text-sm text-slate-400 mt-1">{children}</p>
}

export function DialogContent({ children }) {
  return <div className="p-5">{children}</div>
}

export function DialogFooter({ children, className = '' }) {
  return (
    <div className={`flex items-center justify-end gap-3 p-5 border-t border-slate-700/50 ${className}`}>
      {children}
    </div>
  )
}
