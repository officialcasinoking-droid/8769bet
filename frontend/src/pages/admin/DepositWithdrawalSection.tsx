import React, { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { toast } from 'react-hot-toast'
import { PaymentMethodsSection } from '../../components/admin/PaymentMethods'
import {
  useReactTable, getCoreRowModel, getSortedRowModel,
  getFilteredRowModel, getPaginationRowModel, flexRender,
  createColumnHelper,
} from '@tanstack/react-table'
import {
  Search, Download, RefreshCw, Check, X, ChevronLeft, ChevronRight,
  CheckCircle, XCircle, Clock, ArrowUpDown, ArrowUp, ArrowDown,
  CreditCard, Banknote, Wallet, ArrowLeftRight, Lock, User, CreditCardIcon, Eye
} from 'lucide-react'
import { useRealtimeTable } from '../../hooks/useRealtime'
import { Badge, Button } from '../../components/ui/FormElements'

// ── Transaction API ───────────────────────────────────────────
async function getAllTransactions() {
  // Get regular transactions
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*, users(username, email)')
    .order('created_at', { ascending: false })
    .limit(500)
  
  // Get withdrawal requests
  const { data: withdrawals } = await supabase
    .from('withdrawals')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)

  // Combine and format both
  const formattedTx = (transactions || []).map(tx => ({
    id: tx.id,
    user: tx.users?.username || tx.user_id || '—',
    email: tx.users?.email || '',
    type: tx.type,
    amount: Number(tx.amount),
    status: tx.status,
    reference: tx.reference || '',
    note: tx.note || '',
    created_at: tx.created_at,
    processed_at: tx.processed_at,
  }))

  const formattedWd = (withdrawals || []).map(w => ({
    id: w.id,
    user_id: w.user_id,
    user: w.user_id ? w.user_id.slice(0, 8) : '—',
    email: '',
    type: 'withdrawal',
    amount: Number(w.amount),
    status: w.status,
    reference: w.id,
    note: w.rejection_reason || `Withdrawal via ${w.method}`,
    created_at: w.created_at,
    processed_at: w.processed_at,
    method: w.method,
    details: w.details || {},
  }))

  // Combine and sort by date
  const allTransactions = [...formattedTx, ...formattedWd]
  allTransactions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  return allTransactions.slice(0, 500)
}

// ── Withdrawal Requests API ───────────────────────────────────
async function getWithdrawalRequests(status) {
  let q = supabase
    .from('withdrawals')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)

  if (status === 'pending') q = q.eq('status', 'pending')
  else if (status === 'completed') q = q.eq('status', 'approved')
  else if (status === 'rejected') q = q.eq('status', 'rejected')

  const { data } = await q
  return (data || []).map(w => ({
    id: w.id,
    user_id: w.user_id,
    user: w.user_id ? w.user_id.slice(0, 8) : '—',
    email: '',
    type: 'withdrawal',
    amount: Number(w.amount),
    method: w.method || 'bank',
    status: w.status,
    details: w.details || {},
    rejection_reason: w.rejection_reason || '',
    created_at: w.created_at,
    processed_at: w.processed_at,
  }))
}

// Get user details including PIN and accounts
async function getUserSecurityDetails(userId) {
  const { data } = await supabase
    .from('users')
    .select('withdrawal_pin_set, withdrawal_accounts')
    .eq('id', userId)
    .single()
  return data || { withdrawal_pin_set: false, withdrawal_accounts: [] }
}

async function processWithdrawal(id, action, reason = '', userId = null, amount = 0, username = '') {
  const status = action === 'approve' ? 'approved' : 'rejected'
  const formattedAmount = `₨${Number(amount).toLocaleString()}`
  const amountNum = Number(amount)
  
  // Update withdrawal request status
  const { error } = await supabase
    .from('withdrawals')
    .update({ 
      status, 
      admin_note: reason,
      processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
  
  if (error) throw error
  
  // If rejected, return balance to user FIRST (before logging transaction)
  if (action === 'reject' && userId && amountNum > 0) {
    try {
      // Get current user balance
      const { data: userData, error: selectError } = await supabase
        .from('users')
        .select('balance')
        .eq('id', userId)
        .single()
      
      if (selectError) {
        console.error('Failed to get user balance:', selectError)
      }
      
      const currentBalance = userData?.balance ? Number(userData.balance) : 0
      const newBalance = currentBalance + amountNum
      
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          balance: newBalance, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', userId)
      
      if (updateError) {
        console.error('Failed to return balance:', updateError)
      } else {
        console.log(`✅ Balance returned: ₨${amountNum.toLocaleString()}. New balance: ₨${newBalance.toLocaleString()}`)
      }
    } catch (err) {
      console.error('Error returning balance:', err)
    }
  }
  
  // Log transaction
  await supabase.from('transactions').insert({
    user_id: userId,
    type: action === 'approve' ? 'withdrawal' : 'refund',
    amount: action === 'approve' ? -amountNum : amountNum,
    status,
    reference: id,
    note: reason || `Withdrawal ${action === 'approve' ? 'approved' : 'rejected'}`,
  })

  // Send notification to user via support messages
  try {
    let notificationMessage = ''
    if (action === 'approve') {
      notificationMessage = `✅ Your withdrawal request for ${formattedAmount} has been APPROVED and will be processed shortly.`
    } else {
      notificationMessage = `❌ Your withdrawal request for ${formattedAmount} has been REJECTED.${reason ? ` Reason: ${reason}` : ''}`
    }

    // Find or create a support ticket for this user
    const { data: existingTicket } = await supabase
      .from('support_tickets')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'open')
      .limit(1)
      .single()

    let ticketId = existingTicket?.id

    if (!ticketId) {
      // Create a new notification ticket
      const { data: newTicket, error: ticketError } = await supabase
        .from('support_tickets')
        .insert({
          user_id: userId,
          user_name: username || 'User',
          user_identifier: userId,
          subject: 'Withdrawal Update',
          status: 'open',
          priority: 'low'
        })
        .select('id')
        .single()
      
      if (!ticketError && newTicket) {
        ticketId = newTicket.id
      }
    }

    if (ticketId) {
      // Send the notification message
      await supabase.from('support_messages').insert({
        ticket_id: ticketId,
        sender_id: 'system',
        sender_name: 'System',
        sender_role: 'admin',
        message: notificationMessage,
        language: 'english',
        is_system: true
      })
    }
  } catch (err) {
    console.error('Failed to send withdrawal notification:', err)
  }
}

// ── User Details Modal ──────────────────────────────────────────
function UserDetailsModal({ open, userId, onClose }) {
  const { data: security, isLoading } = useQuery({
    queryKey: ['user-security', userId],
    queryFn: () => getUserSecurityDetails(userId),
    enabled: !!userId && open,
  })

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-yellow-400" />
            Security Details
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-slate-400">Loading...</div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Withdrawal PIN</span>
                <span className={`text-sm font-medium ${security?.withdrawal_pin_set ? 'text-emerald-400' : 'text-red-400'}`}>
                  {security?.withdrawal_pin_set ? '✓ Set' : 'Not Set'}
                </span>
              </div>
            </div>

            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-300 flex items-center gap-2">
                  <CreditCardIcon className="w-4 h-4" />
                  Withdrawal Accounts ({security?.withdrawal_accounts?.length || 0})
                </span>
              </div>
              
              {security?.withdrawal_accounts?.length > 0 ? (
                <div className="space-y-2 mt-3">
                  {security.withdrawal_accounts.map((acc, i) => (
                    <div key={i} className="p-3 bg-slate-700/50 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">
                          {acc.type === 'jazzcash' ? '📱' : acc.type === 'easypaisa' ? '📱' : '🏦'}
                        </span>
                        <span className="text-sm font-medium text-white capitalize">{acc.type}</span>
                      </div>
                      <div className="text-xs text-slate-400 space-y-1">
                        <p>CNIC: {acc.cnic || 'N/A'}</p>
                        <p>Real Name: {acc.real_name || 'N/A'}</p>
                        <p>Account: {acc.account_number || 'N/A'}</p>
                        <p>Holder: {acc.account_name || 'N/A'}</p>
                        {acc.bank_name && <p>Bank: {acc.bank_name}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No withdrawal accounts added</p>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ── Confirm Modal ────────────────────────────────────────────
function ConfirmModal({ open, action, amount, user, userId, reason, onReason, onConfirm, onClose }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900 border border-slate-700/50 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-4">
          {action === 'approve' ? (
            <div className="p-2 rounded-xl bg-emerald-500/20">
              <CheckCircle className="w-6 h-6 text-emerald-400" />
            </div>
          ) : (
            <div className="p-2 rounded-xl bg-red-500/20">
              <XCircle className="w-6 h-6 text-red-400" />
            </div>
          )}
          <div>
            <h3 className="text-lg font-bold text-white">
              {action === 'approve' ? 'Approve Withdrawal' : 'Reject Withdrawal'}
            </h3>
            <p className="text-sm text-slate-400">₨{amount?.toLocaleString()} — {user}</p>
          </div>
        </div>

        {action === 'reject' && (
          <div className="mb-4">
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Rejection Reason</label>
            <textarea
              value={reason}
              onChange={e => onReason(e.target.value)}
              placeholder="e.g. Invalid account details"
              rows={3}
              className="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500/50 resize-none"
            />
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button
            variant={action === 'approve' ? 'default' : 'danger'}
            onClick={onConfirm}
            disabled={action === 'reject' && !reason.trim()}
            className="flex-1"
          >
            {action === 'approve' ? <><Check className="w-4 h-4" /> Approve</> : <><X className="w-4 h-4" /> Reject</>}
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Withdrawal Table ────────────────────────────────────────
function WithdrawalTable({ data, tab, onAction, onViewUser }) {
  const [search, setSearch] = useState('')
  const [sorting, setSorting] = useState([])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })

  const columns = useMemo(() => [
    {
      id: 'date',
      accessorFn: row => new Date(row.created_at),
      header: ({ column }) => (
        <button onClick={() => column.toggleSorting()} className="flex items-center gap-1 text-xs font-semibold text-slate-300 hover:text-white">
          Date <SortingIcon sorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-xs text-slate-400">
          {new Date(row.original.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
        </span>
      ),
    },
    {
      id: 'user',
      accessorKey: 'user',
      header: ({ column }) => (
        <button onClick={() => column.toggleSorting()} className="flex items-center gap-1 text-xs font-semibold text-slate-300 hover:text-white">
          User <SortingIcon sorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-white">{row.original.user}</span>
          <button
            onClick={() => onViewUser(row.original.user_id)}
            className="p-1 rounded hover:bg-slate-700/50"
            title="View user security details"
          >
            <Eye className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      ),
    },
    {
      id: 'amount',
      accessorKey: 'amount',
      header: ({ column }) => (
        <button onClick={() => column.toggleSorting()} className="flex items-center gap-1 text-xs font-semibold text-slate-300 hover:text-white">
          Amount <SortingIcon sorted={column.getIsSorted()} />
        </button>
      ),
      cell: ({ row }) => (
        <span className="text-xs font-bold text-white">
          ₨{Number(row.original.amount).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      id: 'method',
      accessorKey: 'method',
      header: () => <span className="text-xs font-semibold text-slate-300">Method</span>,
      cell: ({ row }) => (
        <Badge>
          {row.original.method === 'jazzcash' ? '📱 JazzCash' :
           row.original.method === 'easypaisa' ? '📱 Easypaisa' :
           row.original.method === 'bank' ? '🏦 Bank' : '💳'}
        </Badge>
      ),
    },
    {
      id: 'account',
      header: () => <span className="text-xs font-semibold text-slate-300">Account</span>,
      cell: ({ row }) => (
        <div className="text-xs">
          <p className="text-slate-300">{row.original.real_name || row.original.account_name || 'N/A'}</p>
          <p className="text-slate-500">{row.original.account_number ? `***${row.original.account_number.slice(-4)}` : 'N/A'}</p>
        </div>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: () => <span className="text-xs font-semibold text-slate-300">Status</span>,
      cell: ({ row }) => {
        const s = row.original.status || 'pending'
        return (
          <Badge variant={
            s === 'approved' ? 'emerald' :
            s === 'pending' ? 'amber' : 'red'
          }>
            {s === 'approved' ? <><CheckCircle className="w-3 h-3" /> {s}</> :
             s === 'pending' ? <><Clock className="w-3 h-3" /> {s}</> :
             <><XCircle className="w-3 h-3" /> {s}</>}
          </Badge>
        )
      },
    },
    ...(tab === 'pending' ? [{
      id: 'actions',
      header: () => <span className="text-xs font-semibold text-slate-300">Actions</span>,
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <button onClick={() => onAction(row.original, 'approve')}
            className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/30 transition-colors" title="Approve">
            <Check className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onAction(row.original, 'reject')}
            className="p-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/30 transition-colors" title="Reject">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    }] : []),
  ], [tab, onAction, onViewUser])

  const filtered = useMemo(() => {
    if (!search) return data
    const s = search.toLowerCase()
    return data.filter(r =>
      r.user?.toLowerCase().includes(s) ||
      r.method?.toLowerCase().includes(s) ||
      r.status?.toLowerCase().includes(s) ||
      String(r.amount).includes(s)
    )
  }, [data, search])

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const pageCount = table.getPageCount()
  const pageIndex = table.getState().pagination.pageIndex

  return (
    <div className="space-y-4">
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search user, method, status..."
          className="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/50 transition-all" />
      </div>

      <div className="bg-slate-900/60 border border-slate-800/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              {table.getHeaderGroups().map(hg => (
                <tr key={hg.id} className="border-b border-slate-800/50">
                  {hg.headers.map(h => (
                    <th key={h.id} className="px-4 py-3 text-left">
                      {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.length === 0 ? (
                <tr><td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-slate-500">No withdrawal requests found</td></tr>
              ) : table.getRowModel().rows.map(row => (
                <tr key={row.id} className="border-b border-slate-800/30 hover:bg-slate-800/20 transition-colors">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-3">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pageCount > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800/50">
            <span className="text-xs text-slate-500">
              {pageIndex * table.getState().pagination.pageSize + 1}–{Math.min((pageIndex + 1) * table.getState().pagination.pageSize, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}
                className="p-1.5 rounded-lg border border-slate-700/50 text-slate-400 hover:text-white disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 text-xs text-slate-400">{pageIndex + 1} / {pageCount}</span>
              <button onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}
                className="p-1.5 rounded-lg border border-slate-700/50 text-slate-400 hover:text-white disabled:opacity-30">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SortingIcon({ sorted }) {
  if (sorted === 'asc') return <ArrowUp className="w-3 h-3" />
  if (sorted === 'desc') return <ArrowDown className="w-3 h-3" />
  return <ArrowUpDown className="w-3 h-3 opacity-40" />
}

// ── Main Component ───────────────────────────────────────────
export default function DepositWithdrawalSection() {
  const qc = useQueryClient()
  const [tab, setTab] = useState('all')
  const [wdTab, setWdTab] = useState('pending')
  const [confirm, setConfirm] = useState({ open: false, row: null, action: null, reason: '' })
  const [viewUserId, setViewUserId] = useState(null)

  const { pending: rtPending } = useRealtimeTable('withdrawals')

  const { data: allTxns = [], isLoading: txLoading } = useQuery({
    queryKey: ['transactions-all'],
    queryFn: getAllTransactions,
    staleTime: 0,
    enabled: tab === 'all',
  })

  const { data: pendingWd = [], isLoading: pendingLoading } = useQuery({
    queryKey: ['withdrawal-requests-pending'],
    queryFn: () => getWithdrawalRequests('pending'),
    staleTime: 0,
    enabled: tab === 'withdrawals' && wdTab === 'pending',
  })

  const { data: approvedWd = [], isLoading: approvedLoading } = useQuery({
    queryKey: ['withdrawal-requests-approved'],
    queryFn: () => getWithdrawalRequests('completed'),
    staleTime: 0,
    enabled: tab === 'withdrawals' && wdTab === 'approved',
  })

  const { data: rejectedWd = [], isLoading: rejectedLoading } = useQuery({
    queryKey: ['withdrawal-requests-rejected'],
    queryFn: () => getWithdrawalRequests('rejected'),
    staleTime: 0,
    enabled: tab === 'withdrawals' && wdTab === 'rejected',
  })

  const processMut = useMutation({
    mutationFn: ({ id, action, reason, userId, amount, username }) => processWithdrawal(id, action, reason, userId, amount, username),
    onSuccess: (_, { action }) => {
      toast.success(action === 'approve' ? 'Withdrawal approved ✅' : 'Withdrawal rejected ✅')
      qc.invalidateQueries({ queryKey: ['withdrawal-requests-pending'] })
      qc.invalidateQueries({ queryKey: ['withdrawal-requests-approved'] })
      qc.invalidateQueries({ queryKey: ['withdrawal-requests-rejected'] })
      qc.invalidateQueries({ queryKey: ['transactions-all'] })
      qc.invalidateQueries({ queryKey: ['admin-support-tickets'] })
      qc.invalidateQueries({ queryKey: ['admin-users'] }) // Refresh users list
      setConfirm({ open: false, row: null, action: null, reason: '' })
    },
    onError: (e) => toast.error(`Failed: ${e.message} ❌`),
  })

  const handleAction = (row, action) => setConfirm({ open: true, row, action, reason: '' })

  const TABS = [
    { id: 'all', label: 'All Transactions', icon: ArrowLeftRight },
    { id: 'withdrawals', label: 'Withdrawals', icon: Banknote, badge: rtPending > 0 },
    { id: 'methods', label: 'Payment Methods', icon: CreditCard },
  ]

  const WD_TABS = [
    { id: 'pending', label: 'Pending', count: pendingWd?.length || 0 },
    { id: 'approved', label: 'Approved', count: approvedWd?.length || 0 },
    { id: 'rejected', label: 'Rejected', count: rejectedWd?.length || 0 },
  ]

  const wdData = wdTab === 'pending' ? pendingWd : wdTab === 'approved' ? approvedWd : rejectedWd
  const wdLoading = wdTab === 'pending' ? pendingLoading : wdTab === 'approved' ? approvedLoading : rejectedLoading

  return (
    <div className="space-y-5">
      {/* Main Tabs */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-slate-900/80 backdrop-blur-xl border border-slate-800/50 rounded-xl p-1">
          {TABS.map(t => {
            const Icon = t.icon
            const isActive = tab === t.id
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                  isActive ? 'bg-emerald-500/15 text-emerald-400' : 'text-slate-400 hover:text-white'
                }`}>
                <Icon className="w-4 h-4" />
                {t.label}
                {t.badge && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
              </button>
            )
          })}
        </div>
        <button onClick={() => qc.invalidateQueries()}
          className="p-2 rounded-xl border border-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Transactions Tab */}
      {tab === 'all' && (
        <TransactionTableSimple
          data={txLoading ? [] : allTxns}
          isLoading={txLoading}
          onAction={handleAction}
          onViewUser={setViewUserId}
        />
      )}

      {/* Withdrawals Tab */}
      {tab === 'withdrawals' && (
        <div className="space-y-4">
          <div className="flex gap-2 bg-slate-900/60 border border-slate-800/50 rounded-xl p-1 w-fit">
            {WD_TABS.map(t => (
              <button key={t.id} onClick={() => setWdTab(t.id)}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                  wdTab === t.id ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                }`}>
                {t.label}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${wdTab === t.id ? 'bg-emerald-500/20' : 'bg-slate-700'}`}>
                  {t.count}
                </span>
                {t.id === 'pending' && rtPending > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
              </button>
            ))}
          </div>

          <WithdrawalTable
            data={wdLoading ? [] : wdData}
            tab={wdTab}
            onAction={handleAction}
            onViewUser={setViewUserId}
          />
        </div>
      )}

      {/* Payment Methods Tab */}
      {tab === 'methods' && <PaymentMethodsSection />}

      {/* Confirm Modal */}
      <ConfirmModal
        open={confirm.open}
        action={confirm.action}
        amount={confirm.row?.amount}
        user={confirm.row?.user}
        userId={confirm.row?.user_id}
        reason={confirm.reason}
        onReason={r => setConfirm(c => ({ ...c, reason: r }))}
        onConfirm={() => {
          if (confirm.action === 'reject' && !confirm.reason.trim()) {
            toast.error('Please provide a rejection reason')
            return
          }
          processMut.mutate({
            id: confirm.row.id,
            action: confirm.action,
            reason: confirm.reason,
            userId: confirm.row?.user_id,
            amount: confirm.row?.amount,
            username: confirm.row?.user
          })
        }}
        onClose={() => setConfirm({ open: false, row: null, action: null, reason: '' })}
      />

      {/* User Details Modal */}
      <UserDetailsModal
        open={!!viewUserId}
        userId={viewUserId}
        onClose={() => setViewUserId(null)}
      />
    </div>
  )
}

// ── Simple Transaction Table ─────────────────────────────────
function TransactionTableSimple({ data, isLoading, onAction, onViewUser }) {
  const [search, setSearch] = useState('')
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 })

  const columns = useMemo(() => [
    {
      id: 'date',
      accessorFn: row => new Date(row.created_at),
      header: 'Date',
      cell: ({ row }) => (
        <span className="text-xs text-slate-400">
          {new Date(row.original.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
        </span>
      ),
    },
    {
      id: 'user',
      accessorKey: 'user',
      header: 'User',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-white">{row.original.user}</span>
          {row.original.user_id && (
            <button
              onClick={() => onViewUser?.(row.original.user_id)}
              className="p-1 rounded hover:bg-slate-700/50"
              title="View user details"
            >
              <Eye className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>
      ),
    },
    {
      id: 'type',
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => {
        const t = row.original.type
        return (
          <Badge variant={
            t === 'deposit' ? 'emerald' :
            t === 'withdrawal' ? 'red' :
            t === 'win' ? 'amber' : 'default'
          }>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </Badge>
        )
      },
    },
    {
      id: 'amount',
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <span className={`text-xs font-bold ${row.original.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {row.original.amount > 0 ? '+' : ''}₹{Number(row.original.amount).toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const s = row.original.status || 'completed'
        return (
          <Badge variant={s === 'completed' ? 'emerald' : s === 'pending' ? 'amber' : 'red'}>
            {s}
          </Badge>
        )
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        // Show actions only for pending withdrawals
        if (row.original.type === 'withdrawal' && row.original.status === 'pending') {
          return (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onAction?.(row.original, 'approve')}
                className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/30 transition-colors"
                title="Approve"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onAction?.(row.original, 'reject')}
                className="p-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/30 transition-colors"
                title="Reject"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        }
        return <span className="text-slate-600">—</span>
      },
    },
  ], [onAction, onViewUser])

  const filtered = useMemo(() => {
    if (!search) return data
    const s = search.toLowerCase()
    return data.filter(r =>
      r.user?.toLowerCase().includes(s) ||
      r.type?.toLowerCase().includes(s)
    )
  }, [data, search])

  const table = useReactTable({
    data: filtered,
    columns,
    state: { pagination },
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search..."
          className="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30" />
      </div>

      <div className="bg-slate-900/60 border border-slate-800/50 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-800/50">
                {table.getHeaderGroups()[0]?.headers.map(h => (
                  <th key={h.id} className="px-4 py-3 text-left text-xs font-semibold text-slate-400">{h.column.columnDef.header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-500">Loading...</td></tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-500">No transactions</td></tr>
              ) : table.getRowModel().rows.map(row => (
                <tr key={row.id} className="border-b border-slate-800/30">
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-3">{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
