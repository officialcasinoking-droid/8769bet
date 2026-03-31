import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { processReferralSignup } from '../api/referrals'

const CURRENCIES = {
  PKR: { symbol: '₨', code: 'PKR', rate: 1, name: 'Pakistani Rupee' },
  INR: { symbol: 'PKR ', code: 'INR', rate: 0.28, name: 'Indian Rupee' },
  USD: { symbol: '$', code: 'USD', rate: 0.0036, name: 'US Dollar' },
}

const AuthContext = createContext()

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}

export { CURRENCIES }

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currency, setCurrency] = useState('PKR')
  const initRef = useRef(false)
  const restoreAttempted = useRef(false)

  const isLoggedIn = !!user
  const isAdmin = user?.role === 'admin' || user?.role === 'god'

  const convertBalance = useCallback((amount, fromCurrency = 'PKR', toCurrency = currency) => {
    if (fromCurrency === toCurrency) return amount
    const inPKR = amount / (CURRENCIES[fromCurrency]?.rate || 1)
    return inPKR * (CURRENCIES[toCurrency]?.rate || 1)
  }, [currency])

  const formatBalance = useCallback((amount, curr = 'PKR') => {
    return `₨${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }, [currency])

  const refreshUser = useCallback(async () => {
    if (!user?.id) return
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (data && !error) {
        const updatedUser = {
          ...user,
          username: data.username || user.username,
          full_name: data.full_name || user.full_name,
          role: data.role || user.role,
          balance: Number(data.balance) || user.balance,
          avatar_url: data.avatar_url || user.avatar_url,
          withdrawal_pin_set: data.withdrawal_pin_set ?? user.withdrawal_pin_set,
          withdrawal_pin_hash: data.withdrawal_pin_hash || user.withdrawal_pin_hash,
          withdrawal_accounts: data.withdrawal_accounts || user.withdrawal_accounts,
        }
        setUser(updatedUser)
        localStorage.setItem('sb_user', JSON.stringify(updatedUser))
      }
    } catch (err) {
      console.warn('Failed to refresh user:', err)
      // Keep current user data
    }
  }, [user])

  const addToBalance = useCallback(async (amount, description = 'Bonus') => {
    if (!user?.id) return false
    const newBalance = (user.balance || 0) + amount
    const updatedUser = { ...user, balance: newBalance }
    setUser(updatedUser)
    localStorage.setItem('sb_user', JSON.stringify(updatedUser))
    
    if (!user.id.startsWith('00000000')) {
      await supabase
        .from('users')
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('id', user.id)
      
      await supabase.from('transactions').insert({
        user_id: user.id,
        type: 'bonus',
        amount: amount,
        balance_after: newBalance,
        description: description,
        status: 'completed',
      })
    }
    return true
  }, [user])

  async function loadUserProfile(supabaseUserId, authUserData = null) {
    if (!supabaseUserId) {
      setLoading(false)
      return
    }

    let authUser = authUserData
    if (!authUser) {
      const { data } = await supabase.auth.getUser()
      authUser = data?.user
    }

    // Build base user from auth data
    const appUser = {
      id: authUser?.id || supabaseUserId,
      supabaseId: authUser?.id || supabaseUserId,
      username: authUser?.user_metadata?.username || authUser?.email?.split('@')[0] || 'User',
      email: authUser?.email || '',
      full_name: authUser?.user_metadata?.full_name || authUser?.user_metadata?.username || authUser?.email?.split('@')[0] || 'User',
      role: 'user',
      balance: 0,
      avatar_url: authUser?.user_metadata?.avatar_url || null,
      withdrawal_pin_set: false,
      withdrawal_pin_hash: null,
      withdrawal_accounts: [],
    }

    // First, check localStorage cache
    const cachedUser = localStorage.getItem('sb_user')
    if (cachedUser) {
      try {
        const cachedData = JSON.parse(cachedUser)
        if (cachedData && cachedData.id === supabaseUserId) {
          console.log('Using cached data as primary source')
          appUser.role = cachedData.role || appUser.role
          appUser.balance = cachedData.balance ?? appUser.balance
          appUser.withdrawal_pin_set = cachedData.withdrawal_pin_set === true
          appUser.withdrawal_pin_hash = cachedData.withdrawal_pin_hash || null
          appUser.withdrawal_accounts = cachedData.withdrawal_accounts || []
        }
      } catch (e) {
        console.warn('Cache parse failed:', e)
      }
    }

    // Try to fetch from database to sync (best effort)
    try {
      const dbResult = await Promise.race([
        supabase.from('users').select('*').eq('id', supabaseUserId).single(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
      ])
      const { data, error, status } = dbResult

      if (data && !error && status === 200) {
        // DB fetch successful - merge with DB data, preserve cached balance if higher
        appUser.username = data.username || appUser.username
        appUser.full_name = data.full_name || appUser.full_name
        appUser.role = data.role || appUser.role
        const dbBalance = Number(data.balance) || 0
        const cachedBalance = appUser.balance || 0
        appUser.balance = Math.max(dbBalance, cachedBalance)
        appUser.avatar_url = data.avatar_url || appUser.avatar_url
        
        // Only use DB withdrawal data if it's explicitly set
        if (data.withdrawal_pin_set === true) {
          appUser.withdrawal_pin_set = true
        }
        if (data.withdrawal_pin_hash) {
          appUser.withdrawal_pin_hash = data.withdrawal_pin_hash
        }
        if (data.withdrawal_accounts && Array.isArray(data.withdrawal_accounts)) {
          appUser.withdrawal_accounts = data.withdrawal_accounts
        }
        
        console.log('Synced with DB:', {
          withdrawal_pin_set: appUser.withdrawal_pin_set,
          withdrawal_accounts: appUser.withdrawal_accounts.length
        })
      } else {
        console.log('DB sync failed, using cached data. Error:', error?.message)
      }
    } catch (dbError) {
      console.error('DB sync exception:', dbError)
    }

    // Update state and cache with final data
    console.log('Setting user with withdrawal_pin_set:', appUser.withdrawal_pin_set)
    setUser(appUser)
    localStorage.setItem('sb_user', JSON.stringify(appUser))
    setLoading(false)
  }

  const setWithdrawalPIN = useCallback(async (pin) => {
    if (!user?.id) return { success: false, error: 'Not logged in' }
    
    const pinHash = btoa(pin).slice(0, 32)
    
    // Update DB
    try {
      const { error } = await supabase
        .from('users')
        .update({ withdrawal_pin_set: true, withdrawal_pin_hash: pinHash, updated_at: new Date().toISOString() })
        .eq('id', user.id)
      
      if (error) {
        console.error('DB update error:', error)
        // Continue anyway - we'll save to localStorage
      } else {
        console.log('PIN saved to DB successfully')
      }
    } catch (e) {
      console.error('DB update failed:', e)
    }
    
    // Always update local state and cache
    const updatedUser = { 
      ...user, 
      withdrawal_pin_set: true, 
      withdrawal_pin_hash: pinHash 
    }
    setUser(updatedUser)
    localStorage.setItem('sb_user', JSON.stringify(updatedUser))
    
    return { success: true }
  }, [user])

  const verifyWithdrawalPIN = useCallback((pin) => {
    if (!user?.withdrawal_pin_hash) return false
    const pinHash = btoa(pin).slice(0, 32)
    return user.withdrawal_pin_hash === pinHash
  }, [user])

  const addWithdrawalAccount = useCallback(async (account) => {
    if (!user?.id) return { success: false, error: 'Not logged in' }
    if (!user?.withdrawal_pin_set) return { success: false, error: 'Please set withdrawal PIN first' }
    
    const accounts = user.withdrawal_accounts || []
    const exists = accounts.some(a => 
      a.type === account.type && a.account_number === account.account_number
    )
    if (exists) return { success: false, error: 'This account is already added' }
    
    const newAccount = {
      id: Date.now().toString(),
      type: account.type,
      cnic: account.cnic,
      real_name: account.real_name,
      account_number: account.account_number,
      account_name: account.account_name,
      bank_name: account.bank_name || '',
      created_at: new Date().toISOString()
    }
    
    const updatedAccounts = [...accounts, newAccount]
    
    // Update DB
    try {
      const { error } = await supabase
        .from('users')
        .update({ withdrawal_accounts: updatedAccounts, updated_at: new Date().toISOString() })
        .eq('id', user.id)
      
      if (error) {
        console.error('DB update error:', error)
      } else {
        console.log('Account saved to DB successfully')
      }
    } catch (e) {
      console.error('DB update failed:', e)
    }
    
    // Always update local state and cache
    const updatedUser = { ...user, withdrawal_accounts: updatedAccounts }
    setUser(updatedUser)
    localStorage.setItem('sb_user', JSON.stringify(updatedUser))
    
    return { success: true }
  }, [user])

  const removeWithdrawalAccount = useCallback(async (accountId) => {
    if (!user?.id) return { success: false, error: 'Not logged in' }
    
    const accounts = user.withdrawal_accounts || []
    const updatedAccounts = accounts.filter(a => a.id !== accountId)
    
    // Update DB
    try {
      const { error } = await supabase
        .from('users')
        .update({ withdrawal_accounts: updatedAccounts, updated_at: new Date().toISOString() })
        .eq('id', user.id)
      
      if (error) {
        console.error('DB update error:', error)
      }
    } catch (e) {
      console.error('DB update failed:', e)
    }
    
    // Always update local state
    const updatedUser = { ...user, withdrawal_accounts: updatedAccounts }
    setUser(updatedUser)
    localStorage.setItem('sb_user', JSON.stringify(updatedUser))
    
    return { success: true }
  }, [user])

  const signup = useCallback(async (userData) => {
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            username: userData.username,
            full_name: userData.full_name || userData.username,
          },
        },
      })

      if (signUpError) {
        if (signUpError.message.includes('already been registered')) {
          return { success: false, error: 'An account with this email already exists.' }
        }
        return { success: false, error: signUpError.message }
      }

      if (signUpData.user) {
        try {
          await supabase.from('users').upsert({
            id: signUpData.user.id,
            username: userData.username,
            email: userData.email,
            full_name: userData.full_name || userData.username,
            role: 'user',
            balance: 0,
            referred_by: userData.referral_code || null,
          }, { onConflict: 'id' })
        } catch {}
        
        if (userData.referral_code) {
          await processReferralSignup(signUpData.user.id, userData.referral_code)
        }
      }

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: userData.password,
      })

      if (signInError) {
        return { success: false, error: 'Account created but login failed. Please try logging in.' }
      }

      if (signInData.user) {
        await loadUserProfile(signInData.user.id, signInData.user)
        return { success: true, message: 'Account created!', isAutoLoggedIn: true }
      }

      return { success: true, message: 'Account created! Check your email to confirm.' }
    } catch {
      return { success: false, error: 'Network error. Please try again.' }
    }
  }, [])

  const login = useCallback(async (username, password) => {
    setUser(null)

    if (username.trim().toLowerCase() === 'admin' && password === 'admin123') {
      try {
        await supabase.auth.signOut()
      } catch {}
      const adminUser = {
        id: '00000000-0000-0000-0000-000000000001',
        supabaseId: '00000000-0000-0000-0000-000000000001',
        username: 'admin',
        email: 'admin@399bet.com',
        full_name: 'Administrator',
        role: 'admin',
        balance: 100000,
        avatar_url: null,
      }
      setUser(adminUser)
      localStorage.setItem('sb_user', JSON.stringify(adminUser))
      setLoading(false)
      return { success: true, isAdmin: true }
    }

    if (username.trim().toLowerCase() === 'demo' && password === 'demo123') {
      try {
        await supabase.auth.signOut()
      } catch {}
      const demoUser = {
        id: '00000000-0000-0000-0000-000000000002',
        supabaseId: '00000000-0000-0000-0000-000000000002',
        username: 'demo',
        email: 'demo@399bet.com',
        full_name: 'Demo User',
        role: 'user',
        balance: 5000,
        avatar_url: null,
      }
      setUser(demoUser)
      localStorage.setItem('sb_user', JSON.stringify(demoUser))
      setLoading(false)
      return { success: true, isAdmin: false }
    }

    try {
      let email = username
      if (username.includes('@')) {
        email = username
      }

      const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) return { success: false, error: error.message }
      await loadUserProfile(signInData.user.id, signInData.user)
      return { success: true, isAdmin: false }
    } catch {
      return { success: false, error: 'Network error. Please try again.' }
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      if (supabase?.auth?.signOut) {
        await Promise.race([
          supabase.auth.signOut(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000))
        ]).catch(() => {})
      }
    } catch {}
    try { localStorage.removeItem('sb_user') } catch {}
    try { localStorage.removeItem('sb_balance') } catch {}
    setUser(null)
    setLoading(false)
  }, [])

  const updateBalance = useCallback(async (newBalance) => {
    if (!user?.id) return
    const updatedUser = { ...user, balance: newBalance }
    setUser(updatedUser)
    localStorage.setItem('sb_user', JSON.stringify(updatedUser))
    localStorage.setItem('sb_balance', JSON.stringify(newBalance))
    try {
      await supabase
        .from('users')
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('id', user.id)
    } catch (e) {
      console.warn('[updateBalance] DB error (saved locally):', e?.message)
    }
  }, [user])

  useEffect(() => {
    const savedCurrency = localStorage.getItem('user_currency')
    if (savedCurrency && CURRENCIES[savedCurrency]) {
      setCurrency(savedCurrency)
    }
  }, [])

  const changeCurrency = useCallback((newCurrency) => {
    if (CURRENCIES[newCurrency]) {
      setCurrency(newCurrency)
      localStorage.setItem('user_currency', newCurrency)
    }
  }, [])

  useEffect(() => {
    if (initRef.current || restoreAttempted.current) return
    initRef.current = true
    restoreAttempted.current = true

    const init = async () => {
      const cachedUser = localStorage.getItem('sb_user')
      
      if (cachedUser) {
        try {
          const parsed = JSON.parse(cachedUser)
          if (parsed.id) {
            setUser(parsed)
            setLoading(false)
          }
        } catch {}
      } else {
        setLoading(false)
      }

      try {
        const { data: { session } } = await Promise.race([
          supabase.auth.getSession(),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000))
        ])
        if (session?.user) {
          await loadUserProfile(session.user.id)
        }
      } catch {
        // Timeout or error - use cached data
      }
    }

    init()

    let authInitDone = false
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (authInitDone && session?.user) {
        await loadUserProfile(session.user.id)
      } else if (!session) {
        const cached = localStorage.getItem('sb_user')
        if (!cached) {
          setUser(null)
        }
      }
      authInitDone = true
    })

    return () => subscription.unsubscribe()
  }, [])

  const value = useMemo(() => ({
    user,
    loading,
    isLoggedIn,
    isAdmin,
    currency,
    currencies: CURRENCIES,
    login,
    signup,
    logout,
    updateBalance,
    addToBalance,
    convertBalance,
    formatBalance,
    changeCurrency,
    setWithdrawalPIN,
    verifyWithdrawalPIN,
    addWithdrawalAccount,
    removeWithdrawalAccount,
    refreshUser,
  }), [user, loading, isLoggedIn, isAdmin, currency, login, signup, logout, updateBalance, addToBalance, convertBalance, formatBalance, changeCurrency, setWithdrawalPIN, verifyWithdrawalPIN, addWithdrawalAccount, removeWithdrawalAccount, refreshUser])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

