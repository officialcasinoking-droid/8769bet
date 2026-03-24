import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { WalletIcon, ArrowUpIcon, ArrowDownIcon, CurrencyRupeeIcon, FunnelIcon, MagnifyingGlassIcon, CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline'
import { supabase } from '../lib/supabase'
import { useToast } from '../context/ToastContext'

export default function TransactionsPage() {
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('all')
  const [transactions, setTransactions] = useState([])
  const [withdrawals, setWithdrawals] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [processing, setProcessing] = useState({})

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [txRes, wdRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('*, users(username, email, phone)')
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('withdrawals')
          .select('*, users(username, email, phone)')
          .order('created_at', { ascending: false })
          .limit(200)
      ])

      if (txRes.data) {
        setTransactions(txRes.data.map(tx => ({
          id: tx.id,
          type: tx.type,
          user: tx.users?.username || 'Unknown',
          userId: tx.user_id,
          amount: Number(tx.amount || 0),
          date: tx.created_at,
          status: tx.status || 'completed',
          method: tx.method || 'wallet',
          phone: tx.users?.phone || ''
        })))
      }

      if (wdRes.data) {
        setWithdrawals(wdRes.data.map(w => ({
          id: w.id,
          user: w.users?.username || 'Unknown',
          userId: w.user_id,
          amount: Number(w.amount || 0),
          date: w.created_at,
          status: w.status || 'pending',
          method: w.method || 'bank',
          accountNumber: w.account_number || '',
          phone: w.users?.phone || ''
        })))
      }
    } catch (err) {
      console.error('Error loading data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleWithdrawalAction = async (id, action) => {
    setProcessing(prev => ({ ...prev, [id]: true }))
    try {
      const newStatus = action === 'approve' ? 'approved' : 'rejected'
      
      if (action === 'approve') {
        const { data: wd } = await supabase
          .from('withdrawals')
          .select('amount')
          .eq('id', id)
          .single()
        if (wd) {
          await supabase.rpc('record_aviator_withdrawal', { p_amount: Number(wd.amount) })
        }
      }

      await supabase
        .from('withdrawals')
        .update({ status: newStatus, processed_at: new Date().toISOString() })
        .eq('id', id)

      toast.success(`Withdrawal ${newStatus}`)
      loadData()
    } catch (err) {
      toast.error('Action failed')
    } finally {
      setProcessing(prev => ({ ...prev, [id]: false }))
    }
  }

  const filteredTransactions = transactions.filter(t => 
    t.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.id.includes(searchTerm)
  )

  const filteredWithdrawals = withdrawals.filter(w =>
    w.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
    w.id.includes(searchTerm)
  )

  const getStatusBadge = (status) => {
    const styles = {
      completed: 'bg-green-500/20 text-green-400',
      pending: 'bg-yellow-500/20 text-yellow-400',
      approved: 'bg-green-500/20 text-green-400',
      rejected: 'bg-red-500/20 text-red-400',
      processing: 'bg-blue-500/20 text-blue-400'
    }
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[status] || styles.pending}`}>
        {status?.toUpperCase()}
      </span>
    )
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const stats = [
    { name: 'Total Deposits', value: transactions.filter(t => t.type === 'deposit').reduce((s, t) => s + t.amount, 0), icon: ArrowDownIcon, color: 'text-green-400' },
    { name: 'Total Withdrawals', value: transactions.filter(t => t.type === 'withdrawal').reduce((s, t) => s + t.amount, 0), icon: ArrowUpIcon, color: 'text-red-400' },
    { name: 'Pending Withdrawals', value: withdrawals.filter(w => w.status === 'pending').reduce((s, w) => s + w.amount, 0), icon: ClockIcon, color: 'text-yellow-400' },
    { name: 'Bets Placed', value: transactions.filter(t => t.type === 'bet').length, icon: CurrencyRupeeIcon, color: 'text-blue-400' },
  ]

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p className="text-admin-muted">Manage deposits, withdrawals, and bets</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="bg-admin-card rounded-xl border border-admin-border p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-admin-sidebar ${stat.color}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-admin-muted">{stat.name}</p>
                <p className="text-xl font-bold text-white">₨{stat.value.toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4 border-b border-admin-border">
        {['all', 'deposits', 'withdrawals', 'bets'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-primary-500 text-primary-400'
                : 'border-transparent text-admin-muted hover:text-white'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="relative">
        <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-admin-muted" />
        <input
          type="text"
          placeholder="Search by user or transaction ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-admin-card border border-admin-border rounded-xl text-white placeholder-admin-muted focus:outline-none focus:border-primary-500"
        />
      </div>

      {loading ? (
        <div className="text-center py-12 text-admin-muted">Loading...</div>
      ) : (
        <>
          {activeTab === 'all' && (
            <div className="bg-admin-card rounded-xl border border-admin-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-admin-sidebar">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-admin-muted uppercase">User</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-admin-muted uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-admin-muted uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-admin-muted uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-admin-muted uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-admin-border">
                    {[...filteredTransactions, ...filteredWithdrawals]
                      .sort((a, b) => new Date(b.date) - new Date(a.date))
                      .slice(0, 50)
                      .map((tx, i) => (
                        <tr key={i} className="hover:bg-admin-border/50">
                          <td className="px-4 py-3 text-white font-medium">{tx.user}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              tx.type === 'deposit' ? 'bg-green-500/20 text-green-400' :
                              tx.type === 'withdrawal' ? 'bg-red-500/20 text-red-400' :
                              tx.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                              'bg-blue-500/20 text-blue-400'
                            }`}>
                              {(tx.type || tx.status)?.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white font-bold">₨{tx.amount.toLocaleString()}</td>
                          <td className="px-4 py-3">{getStatusBadge(tx.status)}</td>
                          <td className="px-4 py-3 text-admin-muted text-sm">{formatDate(tx.date)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'withdrawals' && (
            <div className="bg-admin-card rounded-xl border border-admin-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-admin-sidebar">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-admin-muted uppercase">User</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-admin-muted uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-admin-muted uppercase">Method</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-admin-muted uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-admin-muted uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-admin-muted uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-admin-border">
                    {filteredWithdrawals.slice(0, 50).map((w) => (
                      <tr key={w.id} className="hover:bg-admin-border/50">
                        <td className="px-4 py-3 text-white font-medium">{w.user}</td>
                        <td className="px-4 py-3 text-white font-bold">₨{w.amount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-admin-muted">{w.method}</td>
                        <td className="px-4 py-3">{getStatusBadge(w.status)}</td>
                        <td className="px-4 py-3 text-admin-muted text-sm">{formatDate(w.date)}</td>
                        <td className="px-4 py-3">
                          {w.status === 'pending' && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleWithdrawalAction(w.id, 'approve')}
                                disabled={processing[w.id]}
                                className="p-2 rounded bg-green-500/20 text-green-400 hover:bg-green-500/30"
                              >
                                <CheckCircleIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleWithdrawalAction(w.id, 'reject')}
                                disabled={processing[w.id]}
                                className="p-2 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
                              >
                                <XCircleIcon className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {(activeTab === 'deposits' || activeTab === 'bets') && (
            <div className="bg-admin-card rounded-xl border border-admin-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-admin-sidebar">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-admin-muted uppercase">User</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-admin-muted uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-admin-muted uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-admin-muted uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-admin-muted uppercase">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-admin-border">
                    {filteredTransactions
                      .filter(t => activeTab === 'deposits' ? t.type === 'deposit' : t.type === 'bet')
                      .slice(0, 50)
                      .map((t) => (
                        <tr key={t.id} className="hover:bg-admin-border/50">
                          <td className="px-4 py-3 text-white font-medium">{t.user}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${
                              t.type === 'deposit' ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'
                            }`}>
                              {t.type?.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white font-bold">₨{t.amount.toLocaleString()}</td>
                          <td className="px-4 py-3">{getStatusBadge(t.status)}</td>
                          <td className="px-4 py-3 text-admin-muted text-sm">{formatDate(t.date)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  )
}
