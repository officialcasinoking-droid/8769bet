import { createContext, useContext, useState, useCallback } from 'react'
import { Toaster, toast } from 'react-hot-toast'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1e293b',
            color: '#f1f5f9',
            border: '#334155',
          },
          success: {
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    return { success: () => {}, error: () => {} }
  }
  return {
    success: (msg) => toast.success(msg),
    error: (msg) => toast.error(msg)
  }
}
