import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Wallet, Building2, CheckCircle, Clock, AlertTriangle, TrendingUp, Eye, RefreshCw, Coins, Upload, Image, X, Copy } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '../../components/ui/Dialog'

const API_URL = import.meta.env.VITE_API_URL || 'https://eight769bet-backend.onrender.com'

const methodIcons = {
  jazzcash: '📱',
  easypaisa: '📱',
  bank: '🏦',
  wallet: '📱',
  crypto: '₿',
  upi: '📲'
}

export default function DepositPage() {
  const { user, isLoggedIn, formatBalance, refreshUser } = useAuth()
  const toast = useToast()
  const [selectedMethod, setSelectedMethod] = useState(null)
  const [amount, setAmount] = useState('')
  const [depositing, setDepositing] = useState(false)
  const [transactions, setTransactions] = useState([])
  const [loadingTx, setLoadingTx] = useState(false)
  const [showDetails, setShowDetails] = useState(null)
  const [showPaymentInfo, setShowPaymentInfo] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState([])
  const [loadingMethods, setLoadingMethods] = useState(false)
  const [screenshotFile, setScreenshotFile] = useState(null)
  const [screenshotPreview, setScreenshotPreview] = useState(null)
  const [transactionId, setTransactionId] = useState('')
  const [uploading, setUploading] = useState(false)
  const [screenshotError, setScreenshotError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const fileInputRef = useRef(null)

  const currentMethod = paymentMethods.find(m => m.id === selectedMethod)
  const availableBalance = user?.balance || 0

  useEffect(() => {
    if (!isLoggedIn) return
    fetchTransactions()
    fetchPaymentMethods()
  }, [user?.id])

  useEffect(() => {
    if (paymentMethods.length > 0 && !selectedMethod) {
      setSelectedMethod(paymentMethods[0].id)
    }
  }, [paymentMethods])

  // Poll for deposit status updates every 10 seconds
  useEffect(() => {
    if (!isLoggedIn || !user?.id) return
    const interval = setInterval(() => {
      fetchTransactions()
    }, 10000)
    return () => clearInterval(interval)
  }, [user?.id, isLoggedIn])

  const fetchTransactions = async () => {
    if (!user?.id) return
    setLoadingTx(true)
    try {
      const response = await fetch(`${API_URL}/api/deposits/${user.id}`)
      if (response.ok) {
        const data = await response.json()
        setTransactions(data || [])
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
      const response = await fetch(`${API_URL}/api/payment-methods`)
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

  const handleScreenshotSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be under 5MB')
      return
    }
    setScreenshotFile(file)
    setScreenshotPreview(URL.createObjectURL(file))
  }

  const removeScreenshot = () => {
    setScreenshotFile(null)
    setScreenshotPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const uploadScreenshot = async () => {
    if (!screenshotFile) return null
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', screenshotFile)
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData
      })
      const data = await response.json()
      if (!data.success) throw new Error(data.error || 'Upload failed')
      return data.url
    } catch (err) {
      console.error('[upload] Error:', err)
      toast.error('Failed to upload screenshot')
      return null
    } finally {
      setUploading(false)
    }
  }

  const handleDepositClick = () => {
    if (!amount || Number(amount) < (currentMethod?.min_amount || 100)) {
      toast.error(`Minimum deposit is ${formatBalance(currentMethod?.min_amount || 100)}`)
      return
    }
    if (Number(amount) > (currentMethod?.max_amount || 50000)) {
      toast.error(`Maximum deposit is ${formatBalance(currentMethod?.max_amount || 50000)}`)
      return
    }
    setScreenshotError('')
    setSubmitError('')
    setShowPaymentInfo(true)
  }

  const handleDepositSubmit = async () => {
    setScreenshotError('')
    setSubmitError('')

    // Validate screenshot before closing modal
    if (!screenshotFile) {
      setScreenshotError('Please upload a transaction screenshot as proof of payment')
      return
    }

    setShowPaymentInfo(false)
    setDepositing(true)

    let screenshotUrl = await uploadScreenshot()
    if (!screenshotUrl) {
      setDepositing(false)
      setShowPaymentInfo(true)
      return
    }

    try {
      const response = await fetch(`${API_URL}/api/deposits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          amount: Number(amount),
          method: currentMethod?.type || selectedMethod,
          transactionId: transactionId || null,
          screenshotUrl: screenshotUrl
        })
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        setSubmitError(result.error || 'Failed to create deposit request')
        setShowPaymentInfo(true)
        setDepositing(false)
        return
      }

      if (result.deposit?.auto_approved) {
        toast.success(`Deposit of ${formatBalance(Number(amount))} approved! Balance credited.`, 5000)
      } else {
        toast.success(`Deposit request of ${formatBalance(Number(amount))} submitted! Wait for admin approval.`, 5000)
      }

      setAmount('')
      setTransactionId('')
      removeScreenshot()
      fetchTransactions()
      if (result.deposit?.auto_approved) {
        refreshUser()
      }
    } catch (err) {
      console.error('[deposit] Error:', err)
      setSubmitError('Deposit failed. Please try again.')
      setShowPaymentInfo(true)
    } finally {
      setDepositing(false)
    }
  }

  const handleCopyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('Copied!')
    } catch {
      toast.error('Failed to copy')
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
            <Coins className="w-6 h-6 text-emerald-400" />
          </div>
        </motion.div>

        {/* How it works */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-3 mb-4">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-blue-300 mb-1">How Deposit Works</p>
              <ol className="text-[10px] text-blue-400/80 space-y-0.5 list-decimal list-inside">
                <li>Select payment method and enter amount</li>
                <li>Send payment to the account details shown</li>
                <li>Upload transaction screenshot and enter transaction ID</li>
                <li>Submit deposit request for admin verification</li>
                <li>Balance credited once approved</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-dark-300/50 border border-dark-100 rounded-xl p-3 mb-3">
          <label className="text-xs font-medium text-gray-400 mb-2 block">Payment Method</label>
          {loadingMethods ? (
            <div className="flex justify-center py-3">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : paymentMethods.length === 0 ? (
            <div className="bg-dark-400 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-500">No payment methods available</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {paymentMethods.map((method) => {
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
                    {method.logo_url ? (
                      <img src={method.logo_url} alt={method.name} className="w-8 h-8 object-contain" />
                    ) : (
                      <span className="text-xl">{methodIcons[method.type] || '💳'}</span>
                    )}
                    <p className={`text-xs font-medium ${isSelected ? 'text-white' : 'text-gray-400'}`}>{method.name}</p>
                  </button>
                )
              })}
            </div>
          )}
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
            <span>Min: {formatBalance(currentMethod?.min_amount || 100)}</span>
            <span>Max: {formatBalance(currentMethod?.max_amount || 50000)}</span>
          </div>
        </div>

        {/* Deposit Button */}
        <button
          onClick={handleDepositClick}
          disabled={depositing || !amount || !selectedMethod}
          className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
            depositing || !amount || !selectedMethod
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
              <Coins className="w-8 h-8 text-gray-600 mx-auto mb-1" />
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
      <Dialog open={showPaymentInfo} onClose={() => setShowPaymentInfo(false)} className="max-w-sm max-h-none overflow-visible">
        <DialogHeader onClose={() => setShowPaymentInfo(false)}>
          <DialogTitle>Complete Payment</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-3">
            {/* Amount & Method row */}
            <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3">
              <div>
                <p className="text-[10px] text-emerald-400">Amount</p>
                <p className="text-lg font-bold text-white">{formatBalance(Number(amount))}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-500">Method</p>
                <p className="text-sm text-white font-medium">{currentMethod?.name || 'Payment Method'}</p>
              </div>
            </div>

            {/* Payment Account Details - only title, number, bank */}
            {currentMethod?.account_details && (
              <div className="bg-dark-300/50 rounded-xl p-3.5">
                <h4 className="text-xs font-semibold text-white mb-2.5">Send Payment To:</h4>
                <div className="space-y-2">
                  {[['account_title', 'Account Title'], ['account_number', 'Account Number'], ['bank_name', 'Bank']].map(([key, label]) => {
                    const value = currentMethod.account_details[key]
                    if (!value) return null
                    const isAccountNumber = key === 'account_number'
                    return (
                      <div key={key} className="flex items-center justify-between bg-dark-400/50 rounded-lg px-3 py-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] text-gray-500">{label}</p>
                          <p className={`text-sm text-white truncate ${isAccountNumber ? 'font-mono font-bold tracking-wider' : 'font-medium'}`}>
                            {String(value)}
                          </p>
                        </div>
                        {isAccountNumber && (
                          <button
                            onClick={() => handleCopyText(String(value))}
                            className="ml-2 p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-all flex-shrink-0"
                            title="Copy account number"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
                {currentMethod.account_details.instructions && (
                  <p className="text-[11px] text-amber-400/80 mt-2 italic">
                    {currentMethod.account_details.instructions}
                  </p>
                )}
              </div>
            )}

            {/* Screenshot Upload - compact bar */}
            <div className={`rounded-xl border ${screenshotError ? 'border-red-500/50' : 'border-dark-100'} ${screenshotPreview ? 'bg-dark-300/50 p-3' : ''}`}>
              {screenshotPreview ? (
                <div className="flex items-center gap-3">
                  <div className="relative w-16 h-12 flex-shrink-0">
                    <img src={screenshotPreview} alt="Screenshot" className="w-full h-full object-cover rounded-lg" />
                    <button onClick={removeScreenshot} className="absolute -top-1.5 -right-1.5 p-0.5 bg-red-500 rounded-full text-white">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white font-medium truncate">{screenshotFile?.name || 'Screenshot'}</p>
                    <p className="text-[10px] text-gray-500">Tap to change</p>
                  </div>
                  <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-lg bg-dark-400 text-gray-400 hover:text-white">
                    <Upload className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 transition-all ${
                    screenshotError ? 'bg-red-500/5' : 'bg-dark-300/50 hover:bg-dark-300'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg ${screenshotError ? 'bg-red-500/20' : 'bg-blue-500/20'}`}>
                    <Upload className={`w-4 h-4 ${screenshotError ? 'text-red-400' : 'text-blue-400'}`} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`text-xs font-medium ${screenshotError ? 'text-red-400' : 'text-gray-300'}`}>
                      {screenshotError ? 'Upload screenshot required' : 'Tap to upload payment screenshot'}
                    </p>
                    <p className="text-[10px] text-gray-500">Proof of payment</p>
                  </div>
                  {screenshotError && <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { handleScreenshotSelect(e); setScreenshotError('') }} />
            </div>

            {/* Transaction ID - inline compact */}
            <div className="flex items-center gap-2 bg-dark-300/50 border border-dark-100 rounded-xl px-3 py-2">
              <input
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="Transaction ID (optional)"
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none"
              />
              <span className="text-[10px] text-gray-600 flex-shrink-0">Ref</span>
            </div>

            {/* Submit button */}
            <button
              onClick={handleDepositSubmit}
              disabled={depositing || uploading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {(depositing || uploading) ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{uploading ? 'Uploading...' : 'Submitting...'}</>
              ) : 'I Have Sent Payment'}
            </button>

            {submitError && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-2.5">
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                  {submitError}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
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
              {showDetails.screenshot_url && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Proof Screenshot</p>
                  <img src={showDetails.screenshot_url} alt="Transaction screenshot" className="w-full rounded-lg border border-dark-100" />
                </div>
              )}
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
