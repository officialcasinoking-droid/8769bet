import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowDownLeft, ArrowUpRight, Wallet } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import DepositPage from '../deposit/DepositPage'
import WithdrawPage from '../withdraw/WithdrawPage'

export default function WalletPage() {
  const { user, formatBalance } = useAuth()
  const [activeTab, setActiveTab] = useState('deposit')

  return (
    <div className="pt-16 pb-24 min-h-screen">
      <div className="max-w-lg mx-auto px-3 py-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Wallet className="w-6 h-6 text-emerald-400" />
          <h1 className="text-xl font-bold text-white">Wallet</h1>
        </div>

        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 mb-4"
        >
          <p className="text-xs text-emerald-400/80">Available Balance</p>
          <p className="text-3xl font-bold text-white">{formatBalance(user?.balance || 0)}</p>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-dark-300/50 rounded-xl border border-dark-100 mb-4">
          <button
            onClick={() => setActiveTab('deposit')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'deposit'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            Deposit
          </button>
          <button
            onClick={() => setActiveTab('withdraw')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'withdraw'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            Withdraw
          </button>
        </div>

        {/* Content */}
        {activeTab === 'deposit' ? <DepositPage /> : <WithdrawPage />}
      </div>
    </div>
  )
}
