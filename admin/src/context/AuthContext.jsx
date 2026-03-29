import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

const DEFAULT_CREDENTIALS = {
  username: 'admin',
  password: 'admin123'
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [credentials, setCredentials] = useState(DEFAULT_CREDENTIALS)

  useEffect(() => {
    // Load stored session
    const stored = localStorage.getItem('admin_user')
    if (stored) {
      setUser(JSON.parse(stored))
    }
    setLoading(false)

    // Load credentials from Supabase
    const loadCredentials = async () => {
      try {
        const { data } = await supabase
          .from('platform_settings')
          .select('admin_username, admin_password')
          .eq('id', 'main')
          .single()
        if (data) {
          setCredentials({
            username: data.admin_username || DEFAULT_CREDENTIALS.username,
            password: data.admin_password || DEFAULT_CREDENTIALS.password,
          })
        }
      } catch {}
    }
    loadCredentials()

    // Listen for credential changes
    const channel = supabase
      .channel('admin-creds-rt')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'platform_settings', filter: 'id=eq.main' }, (payload) => {
        const d = payload.new
        if (d) {
          setCredentials({
            username: d.admin_username || DEFAULT_CREDENTIALS.username,
            password: d.admin_password || DEFAULT_CREDENTIALS.password,
          })
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const login = async (username, password) => {
    if (username === credentials.username && password === credentials.password) {
      const userData = { username, role: 'god', loginTime: Date.now() }
      localStorage.setItem('admin_user', JSON.stringify(userData))
      setUser(userData)
      return { success: true }
    }
    return { success: false, error: 'Invalid credentials' }
  }

  const logout = () => {
    localStorage.removeItem('admin_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
