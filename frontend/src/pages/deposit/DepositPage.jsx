import { useState } from 'react'
import { motion } from 'framer-motion'
import { WalletIcon, BuildingLibraryIcon, CheckCircleIcon, GiftIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../components/ui/Toast'
import { recordDeposit } from '../../api/aviator'

const methods = [
  { id: 'jazzcash', name: 'JazzCash', icon: '📱', min: 100, max: 50000, color: 'from-red-500 to-orange-500' },
  { id: 'easypaisa', name: 'Easypaisa', icon: '📱', min: 100, max: 50000, color: 'from-green-500 to-emerald-500' },
  { id: 'bank', name: 'Bank', icon: BuildingLibraryIcon, min: 500, max: 100000, color: 'from-blue-500 to-indigo-500' },
]

const quickAmounts = [500, 1000, 2000, 5000]

export default function DepositPage() {
  const { user, isLoggedIn, formatBalance, updateBalance } = useAuth()
  const toast = useToast()
  const [selectedMethod, setSelectedMethod] = useState('jazzcash')
  const [amount, setAmount] = useState(1000)
  const [depositing, setDepositing] = useState(false)

  const currentMethod = methods.find(m => m.id === selectedMethod)
  const availableBalance = user?.balance || 0

  const handleDeposit = async () => {
    if (!amount || amount < currentMethod?.min) {
      toast.error(`Minimum deposit is ${formatBalance(currentMethod?.min)}`)
      return
    }
    if (amount > currentMethod?.max) {
      toast.error(`Maximum deposit is ${formatBalance(currentMethod?.max)}`)
      return
    }

    setDepositing(true)
    try {
      await new Promise(r => setTimeout(r, 1500))
      const newBalance = (user?.balance || 0) + amount
      await updateBalance(newBalance)
      await recordDeposit(amount)
      toast.success(`${formatBalance(amount)} deposited successfully!`, 4000)
    } catch (err) {
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
          <WalletIcon className="w-6 h-6 text-emerald-400" />
          <h1 className="text-xl font-bold text-white">Add Funds</h1>
        </div>

        {/* Balance Card - Compact */}
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
            <GiftIcon className="w-6 h-6 text-emerald-400" />
          </div>
        </motion.div>

        {/* Payment Method - Compact */}
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
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${method.color} flex items-center justify-center text-lg`}>
                    {typeof method.icon === 'string' ? method.icon : <method.icon className="w-4 h-4 text-white" />}
                  </div>
                  <p className={`text-xs font-medium ${isSelected ? 'text-white' : 'text-gray-400'}`}>{method.name}</p>
                </button>
              )
            })}
          </div>
        </div>

        {/* Amount Selection - Compact */}
        <div className="bg-dark-300/50 border border-dark-100 rounded-xl p-3 mb-3">
          <label className="text-xs font-medium text-gray-400 mb-2 block">Select Amount</label>
          
          {/* Quick Amounts */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            {quickAmounts.map((amt) => (
              <button
                key={amt}
                onClick={() => setAmount(amt)}
                className={`py-2 rounded-lg font-semibold text-xs transition-all ${
                  amount === amt
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
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full bg-dark-400 border border-dark-100 rounded-lg px-3 py-2 text-lg font-bold text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Min/Max Info */}
          <div className="mt-2 flex items-center justify-between text-[10px] text-gray-500">
            <span>Min: {formatBalance(currentMethod?.min)}</span>
            <span>Max: {formatBalance(currentMethod?.max)}</span>
          </div>
        </div>

        {/* Bonus Info */}
        {amount >= 500 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-gradient-to-r from-yellow-500/20 to-orange-500/10 border border-yellow-500/30 rounded-xl p-3 mb-3 flex items-center gap-2"
          >
            <GiftIcon className="w-4 h-4 text-yellow-400" />
            <p className="text-xs font-medium text-yellow-300">Bonus! Get {formatBalance(100)} on {formatBalance(500)}+ deposit</p>
          </motion.div>
        )}

        {/* Deposit Button */}
        <button
          onClick={handleDeposit}
          disabled={depositing || !amount}
          className={`w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
            depositing
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
              <ArrowTrendingUpIcon className="w-4 h-4" />
              Deposit {formatBalance(amount)}
            </>
          )}
        </button>

        {/* Info */}
        <div className="mt-3 bg-dark-300/30 border border-dark-100 rounded-xl p-3">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1.5">
            <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-400" />
            Instant credit to your account
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-400" />
            Secure via {currentMethod?.name}
          </div>
        </div>
      </div>
    </div>
  )
}
