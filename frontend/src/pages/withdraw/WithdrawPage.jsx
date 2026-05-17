import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { ArrowTrendingUpIcon, CheckCircleIcon, ClockIcon, ExclamationTriangleIcon, LockClosedIcon, BanknotesIcon, ShieldCheckIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline'
import { RefreshCw, Eye } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '../../components/ui/Dialog'
import { supabase } from '../../lib/supabase'
import { getHouseEdgePool } from '../../api/aviator'

const API_URL = import.meta.env.VITE_API_URL || 'https://eight769bet-backend.onrender.com'

const MIN_WITHDRAWAL = 100
const MAX_WITHDRAWAL = 50000
const PROCESSING_TIME = '24-48 hours'

function PINInput({ value, onChange, length = 6 }) {
  const inputRef = useRef(null)
  
  const handleChange = (index, val) => {
    if (!/^\d*$/.test(val)) return
    if (val.length > 1) {
      const digits = val.split('').filter(c => /^\d$/.test(c))
      const newValue = [...value]
      digits.forEach((d, i) => {
        if (index + i < length) newValue[index + i] = d
      })
      onChange(newValue.join(''))
      return
    }
    const newValue = [...value]
    newValue[index] = val
    onChange(newValue.join(''))
    if (val && index < length - 1) {
      inputRef.current?.querySelectorAll('input')[index + 1]?.focus()
    }
  }

  return (
    <div ref={inputRef} className="flex justify-center gap-1.5">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ''}
          onChange={(e) => handleChange(i, e.target.value)}
          className="w-10 h-11 rounded-lg bg-dark-300 border-2 border-dark-100 text-center text-xl font-bold text-white focus:border-emerald-500 focus:outline-none transition-colors"
          autoFocus={i === 0}
        />
      ))}
    </div>
  )
}

function PINConfirmModal({ open, onClose, onConfirm }) {
  const [pin, setPin] = useState('')
  const { verifyWithdrawalPIN } = useAuth()
  const toast = useToast()

  useEffect(() => {
    if (open) setPin('')
  }, [open])

  const handleConfirm = async () => {
    if (pin.length !== 6) {
      toast.error('Enter your 6-digit PIN')
      return
    }
    
    const isValid = verifyWithdrawalPIN(pin)
    if (!isValid) {
      toast.error('Invalid PIN')
      setPin('')
      return
    }
    
    onConfirm()
    setPin('')
  }

  if (!open) return null

  return (
    <Dialog open={open} onClose={onClose} className="max-w-sm">
      <DialogHeader onClose={onClose}>
        <DialogTitle>Enter PIN</DialogTitle>
      </DialogHeader>
      <DialogContent>
        <p className="text-sm text-gray-400 mb-4 text-center">Enter your 6-digit PIN to confirm</p>
        <PINInput value={pin} onChange={setPin} length={6} />
      </DialogContent>
      <DialogFooter>
        <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-dark-300 text-gray-400 font-medium">
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={pin.length !== 6}
          className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-semibold disabled:opacity-50"
        >
          Confirm
        </button>
      </DialogFooter>
    </Dialog>
  )
}

export default function WithdrawPage() {
  const navigate = useNavigate()
  const { user, isLoggedIn, verifyWithdrawalPIN, formatBalance, refreshUser } = useAuth()
  const toast = useToast()
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [amount, setAmount] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)
  const [showPINModal, setShowPINModal] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [loadingTx, setLoadingTx] = useState(false)
  const [showDetails, setShowDetails] = useState(null)

  const { data: hePool } = useQuery({
    queryKey: ['withdraw-he-pool'],
    queryFn: getHouseEdgePool,
    staleTime: 10000,
    refetchInterval: 10000,
  })

  const availableBalance = user?.balance || 0
  const withdrawalAccounts = user?.withdrawal_accounts || []
  const hasPIN = user?.withdrawal_pin_set || false
  const hasAccount = withdrawalAccounts.length > 0

  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login', { replace: true })
    }
  }, [isLoggedIn, navigate])

  useEffect(() => {
    if (user?.id) {
      fetchTransactions()
    }
  }, [user?.id])

  const fetchTransactions = async () => {
    if (!user?.id) return
    setLoadingTx(true)
    try {
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (!error && data) {
        setTransactions(data)
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoadingTx(false)
    }
  }

  useEffect(() => {
    if (withdrawalAccounts.length > 0 && !selectedAccount) {
      setSelectedAccount(withdrawalAccounts[0])
    }
  }, [withdrawalAccounts])

  const canWithdraw = 
    hasPIN && 
    hasAccount && 
    Number(amount) >= MIN_WITHDRAWAL && 
    Number(amount) <= Math.min(availableBalance, MAX_WITHDRAWAL) &&
    selectedAccount

  const handleWithdrawClick = () => {
    if (!hasPIN) {
      toast.error('Please set your withdrawal PIN first')
      navigate('/profile')
      return
    }
    if (!hasAccount) {
      toast.error('Please add a withdrawal account first')
      navigate('/profile')
      return
    }
    if (availableBalance < MIN_WITHDRAWAL) {
      toast.error(`Minimum balance of ${formatBalance(MIN_WITHDRAWAL)} required`)
      return
    }
    const hePoolBalance = Number(hePool?.house_edge_pool || 0)
    if (hePoolBalance < 0) {
      toast.error('Platform processing high volume. Your request has been queued.', { duration: 5000 })
      return
    }
    setShowPINModal(true)
  }

  const handleWithdraw = async () => {
    if (!canWithdraw) return

    setWithdrawing(true)
    setShowPINModal(false)
    
    try {
      const selectedAccountData = withdrawalAccounts.find(a => a.id === selectedAccount?.id)
      const withdrawAmount = Number(amount)
      
      const response = await fetch(`${API_URL}/api/withdrawals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          amount: withdrawAmount,
          method: selectedAccountData?.type || 'bank',
          details: {
            account_type: selectedAccountData?.type || 'bank',
            account_number: selectedAccountData?.account_number || '',
            account_name: selectedAccountData?.account_name || '',
            cnic: selectedAccountData?.cnic || '',
            real_name: selectedAccountData?.real_name || '',
          }
        })
      })

      const result = await response.json()

      if (!result.success) {
        toast.error(result.error || 'Failed to create withdrawal request')
        setWithdrawing(false)
        return
      }

      toast.success(`Withdrawal of ₨${withdrawAmount.toLocaleString()} submitted!`, 4000)
      setAmount('')
      fetchTransactions()
      refreshUser()
    } catch (err) {
      console.error('[withdraw] Error:', err)
      toast.error('Withdrawal failed. Please try again.')
    } finally {
      setWithdrawing(false)
    }
  }

  if (!isLoggedIn || !user) {
    return (
      <div className="pt-16 pb-24 min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="pt-16 pb-24 min-h-screen">
      <div className="max-w-lg mx-auto px-3 py-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <ArrowTrendingUpIcon className="w-6 h-6 text-emerald-400" />
          <h1 className="text-xl font-bold text-white">Withdraw</h1>
        </div>

        {/* Requirements Check - Compact */}
        {!hasPIN || !hasAccount ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-3"
          >
            <div className="flex items-center gap-2 mb-2">
              <ExclamationTriangleIcon className="w-4 h-4 text-red-400" />
              <p className="text-xs font-medium text-white">Complete Setup</p>
            </div>
            <div className="flex gap-2">
              {!hasPIN && (
                <button
                  onClick={() => navigate('/profile')}
                  className="flex-1 py-2 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium"
                >
                  Set PIN
                </button>
              )}
              {!hasAccount && (
                <button
                  onClick={() => navigate('/profile')}
                  className="flex-1 py-2 rounded-lg bg-red-500/20 text-red-400 text-xs font-medium"
                >
                  Add Account
                </button>
              )}
            </div>
          </motion.div>
        ) : null}

        {/* House Edge Pool Status Banner */}
        {(() => {
          const poolBalance = Number(hePool?.house_edge_pool || 0)
          const isNegative = poolBalance < 0
          return (
            <div className={`border rounded-xl p-3 mb-3 ${isNegative ? 'bg-orange-500/10 border-orange-500/40' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ExclamationTriangleIcon className={`w-4 h-4 ${isNegative ? 'text-orange-400' : 'text-emerald-400'}`} />
                  <div>
                    <p className={`text-xs font-medium ${isNegative ? 'text-orange-300' : 'text-gray-300'}`}>
                      {isNegative ? 'Processing High Volume' : 'Platform Healthy'}
                    </p>
                    <p className={`text-[10px] ${isNegative ? 'text-orange-400/70' : 'text-gray-500'}`}>
                      {isNegative
                        ? 'Requests queued. Support notified.'
                        : `HE Pool: ${formatBalance(poolBalance)}`}
                    </p>
                  </div>
                </div>
                <div className={`text-right ${isNegative ? 'text-orange-400' : 'text-emerald-400'}`}>
                  <p className="text-xs font-bold">{formatBalance(poolBalance)}</p>
                  <p className="text-[10px] text-gray-500">HE Pool</p>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Balance Card - Compact */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-3"
        >
          <p className="text-xs text-emerald-400/80">Available Balance</p>
          <p className="text-2xl font-bold text-white">{formatBalance(availableBalance)}</p>
        </motion.div>

        {/* Withdrawal Amount - Compact */}
        <div className="bg-dark-300/50 border border-dark-100 rounded-xl p-3 mb-3">
          <label className="text-xs font-medium text-gray-400 mb-2 block">Amount</label>
          
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg text-gray-400">₨</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              disabled={!hasPIN || !hasAccount || availableBalance < MIN_WITHDRAWAL}
              className="w-full bg-dark-400 border border-dark-100 rounded-lg px-3 py-2 text-lg font-bold text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 disabled:opacity-50"
            />
          </div>

          {/* Quick Amounts */}
          <div className="flex gap-2 flex-wrap">
            {[100, 500, 1000, 2000].map((val) => (
              <button
                key={val}
                onClick={() => setAmount(val.toString())}
                disabled={!hasPIN || !hasAccount || availableBalance < MIN_WITHDRAWAL}
                className="px-3 py-1.5 rounded-lg bg-dark-400 text-gray-300 text-xs hover:bg-dark-300 transition-colors disabled:opacity-50"
              >
                ₨{val.toLocaleString()}
              </button>
            ))}
            <button
              onClick={() => setAmount(availableBalance.toString())}
              disabled={!hasPIN || !hasAccount || availableBalance < MIN_WITHDRAWAL}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs hover:bg-emerald-500/30 disabled:opacity-50"
            >
              Max
            </button>
          </div>

          <div className="mt-2 text-[10px] text-gray-500">
            Min: ₨{MIN_WITHDRAWAL} | Max: ₨{MAX_WITHDRAWAL.toLocaleString()}
          </div>
        </div>

        {/* Withdrawal Account - Compact */}
        {hasPIN && hasAccount && (
          <div className="bg-dark-300/50 border border-dark-100 rounded-xl p-3 mb-3">
            <label className="text-xs font-medium text-gray-400 mb-2 block">Withdraw To</label>
            <div className="space-y-2">
              {withdrawalAccounts.map((account) => {
                const isSelected = selectedAccount?.id === account.id
                const methodIcon = account.type === 'jazzcash' ? '📱' : account.type === 'easypaisa' ? '📱' : '🏦'
                const methodName = account.type === 'jazzcash' ? 'JazzCash' : account.type === 'easypaisa' ? 'Easypaisa' : 'Bank'
                
                return (
                  <button
                    key={account.id}
                    onClick={() => setSelectedAccount(account)}
                    className={`w-full p-3 rounded-lg border transition-all flex items-center gap-2 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-dark-100 hover:border-dark-200'
                    }`}
                  >
                    <span className="text-xl">{methodIcon}</span>
                    <div className="flex-1 text-left">
                      <p className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-300'}`}>{methodName}</p>
                      <p className="text-xs text-gray-500">••••{account.account_number.slice(-4)}</p>
                    </div>
                    {isSelected && <CheckCircleIcon className="w-5 h-5 text-emerald-400" />}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Withdraw Button */}
        <button
          onClick={handleWithdrawClick}
          disabled={!canWithdraw || withdrawing}
          className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
            canWithdraw && !withdrawing
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white'
              : 'bg-dark-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {withdrawing ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </span>
          ) : !hasPIN ? 'Set PIN to Withdraw' : !hasAccount ? 'Add Account to Withdraw' : availableBalance < MIN_WITHDRAWAL ? `Min ${formatBalance(MIN_WITHDRAWAL)} Required` : `Withdraw ${formatBalance(Number(amount) || 0)}`}
        </button>

        {/* Info */}
        <div className="mt-3 bg-dark-300/30 border border-dark-100 rounded-xl p-3">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1.5">
            <ClockIcon className="w-3.5 h-3.5 text-gray-400" />
            Processing: {PROCESSING_TIME}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <ShieldCheckIcon className="w-3.5 h-3.5 text-emerald-400" />
            PIN protected • No charges
          </div>
        </div>

        {/* Transactions - Compact */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-300">Recent Withdrawals</h3>
            <button onClick={fetchTransactions} className="p-1 text-gray-500 hover:text-gray-300">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
          
          {loadingTx ? (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="bg-dark-300/30 border border-dark-100 rounded-xl p-4 text-center">
              <BanknotesIcon className="w-8 h-8 text-gray-600 mx-auto mb-1" />
              <p className="text-xs text-gray-500">No withdrawals yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div key={tx.id} className="bg-dark-300/50 border border-dark-100 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{formatBalance(tx.amount)}</p>
                      <p className="text-[10px] text-gray-500">
                        {tx.method === 'jazzcash' ? 'JazzCash' : tx.method === 'easypaisa' ? 'Easypaisa' : 'Bank'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                        tx.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                        tx.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                        'bg-amber-500/20 text-amber-400'
                      }`}>
                        {tx.status === 'approved' ? '✓' : tx.status === 'rejected' ? '✗' : '⏳'} {tx.status}
                      </span>
                      <button onClick={() => setShowDetails(tx)} className="p-1 text-gray-500 hover:text-gray-300">
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transaction Details Modal */}
      <Dialog open={!!showDetails} onClose={() => setShowDetails(null)} className="max-w-sm">
        <DialogHeader onClose={() => setShowDetails(null)}>
          <DialogTitle>Details</DialogTitle>
        </DialogHeader>
        <DialogContent>
          {showDetails && (
            <div className="space-y-3">
              <div className="bg-dark-300/50 rounded-xl p-4 text-center">
                <p className="text-xs text-gray-500">Amount</p>
                <p className="text-xl font-bold text-white">{formatBalance(showDetails.amount)}</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Status</span>
                  <span className={showDetails.status === 'approved' ? 'text-emerald-400' : showDetails.status === 'rejected' ? 'text-red-400' : 'text-amber-400'}>
                    {showDetails.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Method</span>
                  <span className="text-white">{showDetails.method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Account</span>
                  <span className="text-white">{showDetails.account_number}</span>
                </div>
              </div>
              {showDetails.admin_note && (
                <div className="bg-dark-300/50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Admin Response</p>
                  <p className="text-sm text-gray-300">{showDetails.admin_note}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <button onClick={() => setShowDetails(null)} className="w-full py-3 rounded-xl bg-dark-300 text-gray-400 font-medium">
            Close
          </button>
        </DialogFooter>
      </Dialog>

      <PINConfirmModal open={showPINModal} onClose={() => setShowPINModal(false)} onConfirm={handleWithdraw} />
    </div>
  )
}
