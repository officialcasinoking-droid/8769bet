import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Wallet, Building2, CheckCircle, Clock, AlertTriangle, TrendingUp, Eye, RefreshCw, Banknotes } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '../../components/ui/Dialog'
import { supabase } from '../../lib/supabase'

const API_URL = import.meta.env.VITE_API_URL || 'https://eight769bet-backend.onrender.com'

const methods = [
  { id: 'jazzcash', name: 'JazzCash', icon: '📱', min: 100, max: 50000, color: 'from-red-500 to-orange-500', accountName: 'JazzCash Account', instructions: 'Send payment to the account details shown below' },
  { id: 'easypaisa', name: 'Easypaisa', icon: '📱', min: 100, max: 50000, color: 'from-green-500 to-emerald-500', accountName: 'Easypaisa Account', instructions: 'Send payment to the account details shown below' },
  { id: 'bank', name: 'Bank Transfer', icon: '🏦', min: 500, max: 100000, color: 'from-blue-500 to-indigo-500', accountName: 'Bank Account', instructions: 'Transfer to the bank account details shown below' },
]

export default function DepositPage() {
  const { user, isLoggedIn, formatBalance, refreshUser } = useAuth()
  const toast = useToast()
  const [selectedMethod, setSelectedMethod] = useState('jazzcash')
  const [amount, setAmount] = useState('')
  const [depositing, setDepositing] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [loadingTx, setLoadingTx] = useState(false)
  const [showDetails, setShowDetails] = useState(null)
  const [showPaymentInfo, setShowPaymentInfo] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState([])
  const [loadingMethods, setLoadingMethods] = useState(false)

  const currentMethod = methods.find(m => m.id === selectedMethod)
  const availableBalance = user?.balance || 0

  useEffect(() => {
    if (!isLoggedIn) return
    fetchTransactions()
    fetchPaymentMethods()
  }, [user?.id])

  const fetchTransactions = async () => {
    if (!user?.id) return
    setLoadingTx(true)
    try {
      const { data, error } = await supabase
        .from('deposits')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (!error && data) {
        setTransactions(data)
      }
    } catch (err) {
      console.error('Error fetching deposits:', err)
    } finally {
      setLoadingTx(false)
    }
  }

  const fetchPaymentMethods = async () => {
    setLoadingMethods(true)
    try {
      const adminToken = localStorage.getItem('admin_token')
      const response = await fetch(`${API_URL}/api/admin/payment-methods`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      })
      if (response.ok) {
        const data = await response.json()
        setPaymentMethods(data || [])
      }
    } catch (err) {
      console.error('Error fetching payment methods:', err)
    } finally {
      setLoadingMethods(false)
    }
  }

  const handleDepositClick = () => {
    if (!amount || Number(amount) < currentMethod?.min) {
      toast.error(`Minimum deposit is ${formatBalance(currentMethod?.min)}`)
      return
    }
    if (Number(amount) > currentMethod?.max) {
      toast.error(`Maximum deposit is ${formatBalance(currentMethod?.max)}`)
      return
    }
    setShowPaymentInfo(true)
  }

  const handleDepositSubmit = async () => {
    setShowPaymentInfo(false)
    setDepositing(true)
    
    try {
      const response = await fetch(`${API_URL}/api/deposits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          amount: Number(amount),
          method: selectedMethod,
          status: 'pending'
        })
      })

      const result = await response.json()

      if (!result.success) {
        toast.error(result.error || 'Failed to create deposit request')
        setDepositing(false)
        return
      }

      toast.success(`Deposit request of ${formatBalance(Number(amount))} submitted! Wait for admin approval.`, 5000)
      setAmount('')
      fetchTransactions()
    } catch (err) {
      console.error('[deposit] Error:', err)
      toast.error('Deposit failed. Please try again.')
    } finally {
      setDepositing(false)
    }
  }

  if (!isLoggedIn) {
    return (
      <div className="pt-16 pb-24 min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Please login to deposit</p>
      </div>
    )
  }

  return (
    <div className="pt-16 pb-24 min-h-screen">
      <div className="max-w-lg mx-auto px-3 py-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="w-6 h-6 text-emerald-400" />
          <h1 className="text-xl font-bold text-white">Deposit Funds</h1>
        </div>

        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-emerald-400/80">Current Balance</p>
              <p className="text-2xl font-bold text-white">{formatBalance(availableBalance)}</p>
            </div>
            <Banknotes className="w-6 h-6 text-emerald-400" />
          </div>
        </motion.div>

        {/* How it works */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-blue-300 mb-1">How Deposit Works</p>
              <ol className="text-[10px] text-blue-400/80 space-y-0.5 list-decimal list-inside">
                <li>Select payment method and amount</li>
                <li>View payment details and send money</li>
                <li>Submit deposit request with transaction ID</li>
                <li>Admin verifies and approves your deposit</li>
                <li>Balance credited to your account</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-dark-300/50 border border-dark-100 rounded-xl p-3 mb-3">
          <label className="text-xs font-medium text-gray-400 mb-2 block">Payment Method</label>
          <div className="grid grid-cols-3 gap-2">
            {methods.map((method) => {
              const isSelected = selectedMethod === method.id
              return (
                <button
                  key={method.id}
                  onClick={() => setSelectedMethod(method.id)}
                  className={`p-3 rounded-lg border transition-all flex flex-col items-center gap-1 ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : 'border-dark-100 hover:border-dark-200'
                  }`}
                >
                  <span className="text-xl">{method.icon}</span>
                  <p className={`text-xs font-medium ${isSelected ? 'text-white' : 'text-gray-400'}`}>{method.name}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Amount Selection */}
        <div className="bg-dark-300/50 border border-dark-100 rounded-xl p-3 mb-3">
          <label className="text-xs font-medium text-gray-400 mb-2 block">Deposit Amount</label>
          
          {/* Quick Amounts */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[500, 1000, 2000, 5000].map((amt) => (
              <button
                key={amt}
                onClick={() => setAmount(amt.toString())}
                className={`py-2 rounded-lg font-semibold text-xs transition-all ${
                  amount === amt.toString()
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white'
                    : 'bg-dark-400 text-gray-300 hover:bg-dark-300'
                }`}
              >
                {formatBalance(amt)}
              </button>
            ))}
          </div>

          {/* Custom Amount */}
          <div className="flex items-center gap-2">
            <span className="text-lg text-gray-400">₨</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full bg-dark-400 border border-dark-100 rounded-lg px-3 py-2 text-lg font-bold text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Min/Max Info */}
          <div className="mt-2 flex items-center justify-between text-[10px] text-gray-500">
            <span>Min: {formatBalance(currentMethod?.min)}</span>
            <span>Max: {formatBalance(currentMethod?.max)}</span>
          </div>
        </div>

        {/* Deposit Button */}
        <button
          onClick={handleDepositClick}
          disabled={depositing || !amount}
          className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
            depositing || !amount
              ? 'bg-dark-300 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:shadow-lg hover:shadow-emerald-500/30'
          }`}
        >
          {depositing ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <TrendingUp className="w-4 h-4" />
              Deposit {formatBalance(Number(amount) || 0)}
            </>
          )}
        </button>

        {/* Recent Deposits */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-300">Recent Deposits</h3>
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
              <Banknotes className="w-8 h-8 text-gray-600 mx-auto mb-1" />
              <p className="text-xs text-gray-500">No deposits yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((tx) => (
                <div key={tx.id} className="bg-dark-300/50 border border-dark-100 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{formatBalance(tx.amount)}</p>
                      <p className="text-[10px] text-gray-500 capitalize">{tx.method}</p>
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

      {/* Payment Info Modal */}
      <Dialog open={showPaymentInfo} onClose={() => setShowPaymentInfo(false)} className="max-w-sm">
        <DialogHeader onClose={() => setShowPaymentInfo(false)}>
          <DialogTitle>Payment Details</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            {/* Amount Summary */}
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
              <p className="text-xs text-emerald-400">Deposit Amount</p>
              <p className="text-2xl font-bold text-white">{formatBalance(Number(amount))}</p>
              <p className="text-[10px] text-gray-500 mt-1">via {currentMethod?.name}</p>
            </div>

            {/* Payment Instructions */}
            <div className="bg-dark-300/50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-white mb-2">Send Payment To:</h4>
              <div className="space-y-2 text-sm">
                {selectedMethod === 'jazzcash' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Account</span>
                      <span className="text-white font-mono">0300-1234567</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Name</span>
                      <span className="text-white">8769bet Official</span>
                    </div>
                  </>
                )}
                {selectedMethod === 'easypaisa' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Account</span>
                      <span className="text-white font-mono">0345-7654321</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Name</span>
                      <span className="text-white">8769bet Official</span>
                    </div>
                  </>
                )}
                {selectedMethod === 'bank' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Bank</span>
                      <span className="text-white">Meezan Bank</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Account</span>
                      <span className="text-white font-mono">0123456789012</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Title</span>
                      <span className="text-white">8769bet Pvt Ltd</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Important Note */}
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-300">
                  After sending payment, your deposit request will be submitted for admin verification. 
                  Balance will be credited once approved.
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <button onClick={() => setShowPaymentInfo(false)} className="flex-1 py-3 rounded-xl bg-dark-300 text-gray-400 font-medium">
            Cancel
          </button>
          <button
            onClick={handleDepositSubmit}
            disabled={depositing}
            className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-semibold disabled:opacity-50"
          >
            {depositing ? 'Submitting...' : 'I Have Sent Payment'}
          </button>
        </DialogFooter>
      </Dialog>

      {/* Transaction Details Modal */}
      <Dialog open={!!showDetails} onClose={() => setShowDetails(null)} className="max-w-sm">
        <DialogHeader onClose={() => setShowDetails(null)}>
          <DialogTitle>Deposit Details</DialogTitle>
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
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    showDetails.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                    showDetails.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                    'bg-amber-500/20 text-amber-400'
                  }`}>
                    {showDetails.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Method</span>
                  <span className="text-white capitalize">{showDetails.method}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Requested</span>
                  <span className="text-white text-xs">{new Date(showDetails.created_at).toLocaleString()}</span>
                </div>
                {showDetails.processed_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Processed</span>
                    <span className="text-white text-xs">{new Date(showDetails.processed_at).toLocaleString()}</span>
                  </div>
                )}
              </div>
              {showDetails.rejection_reason && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                  <p className="text-xs text-red-400 mb-1">Rejection Reason</p>
                  <p className="text-sm text-red-300">{showDetails.rejection_reason}</p>
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
    </div>
  )
}
