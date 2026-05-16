import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button, FormField, Input, Select, Badge } from '../../components/ui/FormElements'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '../../components/ui/Dialog'
import {
  Search, Shield, X, Ban, CheckCircle, Eye, Wallet, Lock,
  CreditCard, Edit, AlertTriangle, Users, UserCheck, UserX,
  Filter, ChevronLeft, ChevronRight, Download, CheckSquare, Square,
  MoreVertical, RefreshCw, Clock, Key, Phone, Mail, User,
  Calendar, Activity, History, ArrowUpRight, ArrowDownRight,
  Copy, EyeOff, Pencil, Save, XCircle
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'https://eight769bet-backend.onrender.com'

function getAuthToken() {
  return localStorage.getItem('admin_token')
}

async function apiCall(endpoint, options = {}) {
  const token = getAuthToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || 'Request failed')
  }
  return response.json()
}

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState({ total: 0, active: 0, banned: 0, suspended: 0, highRisk: 0, newLast24h: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [pagination, setPagination] = useState({ total: 0, pages: 0 })
  const [selectedUsers, setSelectedUsers] = useState([])
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({ riskLevel: '', kycStatus: '', sortBy: 'created_at', sortOrder: 'desc' })
  const [selectedUser, setSelectedUser] = useState(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [activeModalTab, setActiveModalTab] = useState('info')
  const [actionLoading, setActionLoading] = useState(false)

  // Edit state
  const [editForm, setEditForm] = useState({ username: '', email: '', full_name: '', phone: '', risk_level: '', kyc_status: '' })
  const [editMode, setEditMode] = useState(false)

  // Balance state
  const [balanceAmount, setBalanceAmount] = useState('')
  const [balanceReason, setBalanceReason] = useState('')
  const [showBalanceForm, setShowBalanceForm] = useState(false)

  // PIN state
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [showNewPin, setShowNewPin] = useState(false)
  const [showConfirmPin, setShowConfirmPin] = useState(false)
  const [showPinForm, setShowPinForm] = useState(false)
  const [pinError, setPinError] = useState('')

  // Status state
  const [newStatus, setNewStatus] = useState('')
  const [statusReason, setStatusReason] = useState('')
  const [showStatusForm, setShowStatusForm] = useState(false)

  // Lock state
  const [lockDuration, setLockDuration] = useState('')
  const [lockReason, setLockReason] = useState('')
  const [showLockForm, setShowLockForm] = useState(false)

  // Activity data
  const [userActivity, setUserActivity] = useState(null)
  const [balanceHistory, setBalanceHistory] = useState([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      let query = `/api/admin/users?page=${page}&limit=${limit}`
      if (search) query += `&search=${encodeURIComponent(search)}`
      if (activeTab === 'active') query += '&status=active'
      else if (activeTab === 'banned') query += '&status=banned'
      else if (activeTab === 'suspended') query += '&status=suspended'
      else if (activeTab === 'high-risk') query += '&riskLevel=high'
      if (filters.riskLevel) query += `&riskLevel=${filters.riskLevel}`
      if (filters.kycStatus) query += `&kycStatus=${filters.kycStatus}`
      query += `&sortBy=${filters.sortBy}&sortOrder=${filters.sortOrder}`

      const data = await apiCall(query)
      setUsers(data.users || [])
      setPagination(data.pagination || { total: 0, pages: 0 })
    } catch (err) {
      console.error('Failed to fetch users:', err)
    } finally {
      setLoading(false)
    }
  }, [page, limit, search, activeTab, filters])

  const fetchStats = useCallback(async () => {
    try {
      const data = await apiCall('/api/admin/users/stats')
      setStats(data.stats || {})
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }, [])

  useEffect(() => { fetchData(); fetchStats() }, [fetchData, fetchStats])

  const openUserModal = async (user) => {
    setSelectedUser(user)
    setActiveModalTab('info')
    setEditMode(false)
    setShowBalanceForm(false)
    setShowPinForm(false)
    setShowStatusForm(false)
    setShowLockForm(false)
    setEditForm({
      username: user.username || '',
      email: user.email || '',
      full_name: user.full_name || '',
      phone: user.phone || '',
      risk_level: user.risk_level || 'low',
      kyc_status: user.kyc_status || 'none'
    })
    setBalanceAmount('')
    setBalanceReason('')
    setNewPin('')
    setConfirmPin('')
    setPinError('')
    setNewStatus(user.status || 'active')
    setStatusReason('')
    setLockDuration('')
    setLockReason('')

    // Fetch activity and balance history
    try {
      const [activityData, balanceData] = await Promise.all([
        apiCall(`/api/admin/users/${user.id}/activity`),
        apiCall(`/api/admin/users/${user.id}/balance-history`)
      ])
      setUserActivity(activityData.activity || null)
      setBalanceHistory(balanceData.history || [])
    } catch (e) {
      console.error('Failed to fetch user activity:', e)
    }

    setShowUserModal(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedUser) return
    setActionLoading(true)
    try {
      await apiCall(`/api/admin/users/${selectedUser.id}`, {
        method: 'PUT',
        body: JSON.stringify(editForm)
      })
      setEditMode(false)
      setSelectedUser(prev => ({ ...prev, ...editForm }))
      fetchData()
    } catch (err) {
      console.error('Update failed:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleAdjustBalance = async () => {
    if (!selectedUser || !balanceAmount || !balanceReason) return
    setActionLoading(true)
    try {
      const res = await apiCall(`/api/admin/users/${selectedUser.id}/balance`, {
        method: 'POST',
        body: JSON.stringify({ amount: parseFloat(balanceAmount), reason: balanceReason })
      })
      setSelectedUser(prev => ({ ...prev, balance: res.balanceAfter }))
      setBalanceAmount('')
      setBalanceReason('')
      setShowBalanceForm(false)
      fetchData()
      // Refresh balance history
      const balanceData = await apiCall(`/api/admin/users/${selectedUser.id}/balance-history`)
      setBalanceHistory(balanceData.history || [])
    } catch (err) {
      console.error('Balance adjustment failed:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleResetPin = async () => {
    if (!selectedUser || newPin.length !== 4 || newPin !== confirmPin) {
      setPinError(newPin.length !== 4 ? 'PIN must be 4 digits' : 'PINs do not match')
      return
    }
    setActionLoading(true)
    setPinError('')
    try {
      await apiCall(`/api/admin/users/${selectedUser.id}/reset-pin`, {
        method: 'POST',
        body: JSON.stringify({ pin: newPin })
      })
      setNewPin('')
      setConfirmPin('')
      setShowPinForm(false)
      fetchData()
    } catch (err) {
      setPinError(err.message)
    } finally {
      setActionLoading(false)
    }
  }

  const handleChangeStatus = async () => {
    if (!selectedUser) return
    setActionLoading(true)
    try {
      await apiCall(`/api/admin/users/${selectedUser.id}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: newStatus, reason: statusReason || 'Changed from admin panel' })
      })
      setSelectedUser(prev => ({ ...prev, status: newStatus }))
      setShowStatusForm(false)
      setStatusReason('')
      fetchData()
      fetchStats()
    } catch (err) {
      console.error('Status change failed:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleLockUser = async (locked) => {
    if (!selectedUser) return
    setActionLoading(true)
    try {
      await apiCall(`/api/admin/users/${selectedUser.id}/lock`, {
        method: 'POST',
        body: JSON.stringify({ locked, reason: lockReason || '', duration: locked ? parseInt(lockDuration) || 24 : 0 })
      })
      setSelectedUser(prev => ({ ...prev, is_locked: locked }))
      setShowLockForm(false)
      setLockDuration('')
      setLockReason('')
      fetchData()
    } catch (err) {
      console.error('Lock action failed:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleBulkAction = async (action) => {
    if (selectedUsers.length === 0) return
    setActionLoading(true)
    try {
      await apiCall('/api/admin/users/bulk-action', {
        method: 'POST',
        body: JSON.stringify({ userIds: selectedUsers, action, reason: 'Bulk action from admin panel' })
      })
      setSelectedUsers([])
      fetchData()
      fetchStats()
    } catch (err) {
      console.error('Bulk action failed:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleExport = async () => {
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_URL}/api/admin/users/export`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(users.map(u => u.id))
    }
  }

  const handleSelectUser = (id) => {
    setSelectedUsers(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const tabs = [
    { id: 'all', label: 'All Users', icon: Users, count: stats.total },
    { id: 'active', label: 'Active', icon: UserCheck, count: stats.active },
    { id: 'suspended', label: 'Suspended', icon: AlertTriangle, count: stats.suspended },
    { id: 'banned', label: 'Banned', icon: Ban, count: stats.banned },
    { id: 'high-risk', label: 'High Risk', icon: Shield, count: stats.highRisk },
  ]

  const statusColors = {
    active: 'emerald',
    banned: 'red',
    suspended: 'amber',
    pending_verification: 'blue'
  }

  const riskColors = {
    low: 'emerald',
    medium: 'amber',
    high: 'red',
    critical: 'red'
  }

  const modalTabs = [
    { id: 'info', label: 'Info', icon: User },
    { id: 'balance', label: 'Balance', icon: Wallet },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'activity', label: 'Activity', icon: Activity },
  ]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); setPage(1) }}
            className={`p-3 rounded-xl border transition-all text-left ${
              activeTab === tab.id
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50'
            }`}>
            <div className="flex items-center gap-2 mb-1">
              <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-emerald-400' : 'text-slate-400'}`} />
              <span className="text-xs text-slate-400">{tab.label}</span>
            </div>
            <div className="text-xl font-bold text-white">{tab.count?.toLocaleString() || 0}</div>
          </button>
        ))}
      </div>

      {/* Search & Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchData() }} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by username, email, or ID..."
              className="pl-10" />
          </div>
          <Button type="submit" variant="outline">Search</Button>
        </form>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
            <Filter className="w-4 h-4" /> Filters
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4" /> Export
          </Button>
          <Button variant="outline" onClick={() => { fetchData(); fetchStats() }}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <FormField label="Risk Level">
            <Select value={filters.riskLevel} onChange={e => setFilters(f => ({ ...f, riskLevel: e.target.value }))}>
              <option value="">All</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </Select>
          </FormField>
          <FormField label="KYC Status">
            <Select value={filters.kycStatus} onChange={e => setFilters(f => ({ ...f, kycStatus: e.target.value }))}>
              <option value="">All</option>
              <option value="none">None</option>
              <option value="pending">Pending</option>
              <option value="verified">Verified</option>
              <option value="rejected">Rejected</option>
            </Select>
          </FormField>
          <FormField label="Sort By">
            <Select value={filters.sortBy} onChange={e => setFilters(f => ({ ...f, sortBy: e.target.value }))}>
              <option value="created_at">Registration Date</option>
              <option value="balance">Balance</option>
              <option value="username">Username</option>
              <option value="last_login">Last Login</option>
            </Select>
          </FormField>
          <FormField label="Order">
            <Select value={filters.sortOrder} onChange={e => setFilters(f => ({ ...f, sortOrder: e.target.value }))}>
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </Select>
          </FormField>
          <Button onClick={() => { setPage(1); fetchData() }} className="col-span-2 md:col-span-4">Apply Filters</Button>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedUsers.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 flex items-center justify-between">
          <span className="text-sm text-slate-300">{selectedUsers.length} users selected</span>
          <div className="flex gap-2">
            <Button size="sm" variant="danger" onClick={() => handleBulkAction('ban')} disabled={actionLoading}>Ban</Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction('suspend')} disabled={actionLoading}>Suspend</Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction('activate')} disabled={actionLoading}>Activate</Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction('unlock')} disabled={actionLoading}>Unlock</Button>
          </div>
        </div>
      )}

      {/* User Table */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="p-3 text-left">
                  <button onClick={handleSelectAll} className="text-slate-400 hover:text-white">
                    {selectedUsers.length === users.length && users.length > 0 ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                  </button>
                </th>
                <th className="p-3 text-left text-xs font-medium text-slate-400 uppercase">User</th>
                <th className="p-3 text-left text-xs font-medium text-slate-400 uppercase">Email</th>
                <th className="p-3 text-right text-xs font-medium text-slate-400 uppercase">Balance</th>
                <th className="p-3 text-center text-xs font-medium text-slate-400 uppercase">Status</th>
                <th className="p-3 text-center text-xs font-medium text-slate-400 uppercase">Risk</th>
                <th className="p-3 text-center text-xs font-medium text-slate-400 uppercase">PIN</th>
                <th className="p-3 text-center text-xs font-medium text-slate-400 uppercase hidden lg:table-cell">Last Login</th>
                <th className="p-3 text-center text-xs font-medium text-slate-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" className="p-8 text-center text-slate-400">Loading users...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan="9" className="p-8 text-center text-slate-400">No users found</td></tr>
              ) : users.map(user => (
                <tr key={user.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                  <td className="p-3">
                    <button onClick={() => handleSelectUser(user.id)} className="text-slate-400 hover:text-white">
                      {selectedUsers.includes(user.id) ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    </button>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs">
                        {(user.username || '?')[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-white">{user.username}</div>
                        {user.full_name && <div className="text-xs text-slate-400">{user.full_name}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-slate-300">{user.email}</td>
                  <td className="p-3 text-right font-medium text-emerald-400">₨{parseFloat(user.balance || 0).toLocaleString()}</td>
                  <td className="p-3 text-center">
                    <Badge variant={statusColors[user.status] || 'default'}>{user.status || 'active'}</Badge>
                  </td>
                  <td className="p-3 text-center">
                    <Badge variant={riskColors[user.risk_level] || 'default'}>{user.risk_level || 'low'}</Badge>
                  </td>
                  <td className="p-3 text-center">
                    {user.withdrawal_pin_set ? (
                      <span className="text-xs text-emerald-400 flex items-center justify-center gap-1"><CheckCircle className="w-3 h-3" /> Set</span>
                    ) : (
                      <span className="text-xs text-slate-500">Not set</span>
                    )}
                  </td>
                  <td className="p-3 text-center text-slate-400 hidden lg:table-cell">
                    {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openUserModal(user)}
                        className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors" title="Manage User">
                        <Eye className="w-4 h-4" />
                      </button>
                      <div className="relative group">
                        <button className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        <div className="absolute right-0 top-full mt-1 w-44 bg-slate-800 border border-slate-700/50 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                          <button onClick={() => { openUserModal(user); setTimeout(() => setActiveModalTab('balance'), 100) }}
                            className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-700/50 flex items-center gap-2 rounded-t-xl">
                            <Wallet className="w-3 h-3 text-emerald-400" /> Adjust Balance
                          </button>
                          <button onClick={() => { openUserModal(user); setTimeout(() => setActiveModalTab('security'), 100) }}
                            className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-700/50 flex items-center gap-2">
                            <Key className="w-3 h-3 text-amber-400" /> Reset PIN
                          </button>
                          <button onClick={() => { openUserModal(user); setTimeout(() => setActiveModalTab('security'), 100) }}
                            className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-700/50 flex items-center gap-2">
                            {user.status === 'banned' ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Ban className="w-3 h-3 text-red-400" />}
                            {user.status === 'banned' ? 'Activate' : 'Ban'}
                          </button>
                          <button onClick={() => { openUserModal(user); setTimeout(() => setActiveModalTab('security'), 100) }}
                            className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-700/50 flex items-center gap-2 rounded-b-xl">
                            {user.is_locked ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Lock className="w-3 h-3 text-amber-400" />}
                            {user.is_locked ? 'Unlock' : 'Lock'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="p-3 border-t border-slate-700/50 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Showing {(page - 1) * limit + 1}-{Math.min(page * limit, pagination.total)} of {pagination.total}
            </span>
            <div className="flex items-center gap-2">
              <Select value={limit} onChange={e => { setLimit(parseInt(e.target.value)); setPage(1) }} className="w-20">
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </Select>
              <Button size="sm" variant="outline" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-slate-300">{page} / {pagination.pages}</span>
              <Button size="sm" variant="outline" onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      <AnimatePresence>
        {showUserModal && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowUserModal(false)}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="relative bg-slate-800 border border-slate-700/50 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex-shrink-0 px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
                    {(selectedUser.username || '?')[0].toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{selectedUser.username}</h3>
                    <p className="text-xs text-slate-400">{selectedUser.email}</p>
                  </div>
                </div>
                <button onClick={() => setShowUserModal(false)} className="p-2 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Tabs */}
              <div className="flex-shrink-0 flex border-b border-slate-700/50 px-6">
                {modalTabs.map(tab => (
                  <button key={tab.id} onClick={() => setActiveModalTab(tab.id)}
                    className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                      activeModalTab === tab.id
                        ? 'border-emerald-500 text-emerald-400'
                        : 'border-transparent text-slate-400 hover:text-white'
                    }`}>
                    <tab.icon className="w-4 h-4 inline mr-1.5" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-6">
                {/* INFO TAB */}
                {activeModalTab === 'info' && (
                  <div className="space-y-4">
                    {editMode ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <FormField label="Username">
                            <div className="relative">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                              <Input value={editForm.username} onChange={e => setEditForm(f => ({ ...f, username: e.target.value }))} className="pl-10" />
                            </div>
                          </FormField>
                          <FormField label="Email">
                            <div className="relative">
                              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                              <Input type="email" value={editForm.email} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} className="pl-10" />
                            </div>
                          </FormField>
                          <FormField label="Full Name">
                            <Input value={editForm.full_name} onChange={e => setEditForm(f => ({ ...f, full_name: e.target.value }))} />
                          </FormField>
                          <FormField label="Phone">
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                              <Input value={editForm.phone || ''} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className="pl-10" />
                            </div>
                          </FormField>
                          <FormField label="Risk Level">
                            <Select value={editForm.risk_level} onChange={e => setEditForm(f => ({ ...f, risk_level: e.target.value }))}>
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="critical">Critical</option>
                            </Select>
                          </FormField>
                          <FormField label="KYC Status">
                            <Select value={editForm.kyc_status} onChange={e => setEditForm(f => ({ ...f, kyc_status: e.target.value }))}>
                              <option value="none">None</option>
                              <option value="pending">Pending</option>
                              <option value="verified">Verified</option>
                              <option value="rejected">Rejected</option>
                            </Select>
                          </FormField>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleSaveEdit} disabled={actionLoading}>
                            <Save className="w-4 h-4" /> Save Changes
                          </Button>
                          <Button variant="ghost" onClick={() => setEditMode(false)} disabled={actionLoading}>
                            <X className="w-4 h-4" /> Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { label: 'User ID', value: selectedUser.id, mono: true },
                            { label: 'Username', value: selectedUser.username },
                            { label: 'Email', value: selectedUser.email },
                            { label: 'Full Name', value: selectedUser.full_name || '-' },
                            { label: 'Phone', value: selectedUser.phone || '-' },
                            { label: 'Balance', value: `₨${parseFloat(selectedUser.balance || 0).toLocaleString()}`, color: 'text-emerald-400' },
                            { label: 'Status', value: <Badge variant={statusColors[selectedUser.status] || 'default'}>{selectedUser.status || 'active'}</Badge> },
                            { label: 'Risk Level', value: <Badge variant={riskColors[selectedUser.risk_level] || 'default'}>{selectedUser.risk_level || 'low'}</Badge> },
                            { label: 'KYC Status', value: <span className="capitalize">{selectedUser.kyc_status || 'none'}</span> },
                            { label: 'Withdrawal PIN', value: selectedUser.withdrawal_pin_set ? <span className="text-emerald-400 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Set</span> : <span className="text-slate-500">Not set</span> },
                            { label: 'Registered', value: new Date(selectedUser.created_at).toLocaleDateString(), icon: Calendar },
                            { label: 'Last Login', value: selectedUser.last_login ? new Date(selectedUser.last_login).toLocaleString() : 'Never' },
                            { label: 'Login Count', value: selectedUser.login_count || 0 },
                            { label: 'Total Wagered', value: `₨${parseFloat(selectedUser.total_wagered || 0).toLocaleString()}` },
                            { label: 'Total Won', value: `₨${parseFloat(selectedUser.total_won || 0).toLocaleString()}`, color: 'text-emerald-400' },
                            { label: 'Total Deposits', value: `₨${parseFloat(selectedUser.total_deposits || 0).toLocaleString()}` },
                            { label: 'Total Withdrawals', value: `₨${parseFloat(selectedUser.total_withdrawals || 0).toLocaleString()}` },
                            { label: 'Locked', value: selectedUser.is_locked ? <span className="text-red-400 flex items-center gap-1"><Lock className="w-3 h-3" /> Yes</span> : <span className="text-emerald-400">No</span> },
                          ].map(({ label, value, color, mono, icon: Icon }) => (
                            <div key={label} className="bg-slate-900/50 rounded-lg p-3">
                              <div className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</div>
                              <div className={`text-sm mt-0.5 ${color || 'text-white'} ${mono ? 'font-mono text-xs break-all' : ''}`}>
                                {Icon && <Icon className="w-3 h-3 inline mr-1 opacity-50" />}
                                {value}
                              </div>
                            </div>
                          ))}
                        </div>
                        <Button variant="outline" onClick={() => setEditMode(true)}>
                          <Pencil className="w-4 h-4" /> Edit Profile
                        </Button>
                      </>
                    )}
                  </div>
                )}

                {/* BALANCE TAB */}
                {activeModalTab === 'balance' && (
                  <div className="space-y-4">
                    {/* Current Balance */}
                    <div className="bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-xl p-6 text-center">
                      <p className="text-xs text-slate-400 uppercase tracking-wider">Current Balance</p>
                      <p className="text-4xl font-bold text-emerald-400 mt-2">₨{parseFloat(selectedUser.balance || 0).toLocaleString()}</p>
                    </div>

                    {/* Balance Adjustment */}
                    <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-emerald-400" /> Adjust Balance
                      </h4>
                      {!showBalanceForm ? (
                        <Button onClick={() => setShowBalanceForm(true)} variant="outline" className="w-full">
                          <ArrowUpRight className="w-4 h-4" /> Add / Deduct Balance
                        </Button>
                      ) : (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <FormField label="Amount (positive to add, negative to deduct)">
                              <Input type="number" value={balanceAmount} onChange={e => setBalanceAmount(e.target.value)} placeholder="e.g. 1000 or -500" />
                            </FormField>
                            <FormField label="Reason">
                              <Input value={balanceReason} onChange={e => setBalanceReason(e.target.value)} placeholder="Bonus, Refund, etc." />
                            </FormField>
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleAdjustBalance} disabled={actionLoading || !balanceAmount || !balanceReason}>
                              {actionLoading ? 'Processing...' : 'Apply'}
                            </Button>
                            <Button variant="ghost" onClick={() => setShowBalanceForm(false)}>Cancel</Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Balance History */}
                    <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <History className="w-4 h-4 text-blue-400" /> Balance History
                      </h4>
                      {balanceHistory.length === 0 ? (
                        <p className="text-sm text-slate-400 text-center py-4">No balance history</p>
                      ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {balanceHistory.map((entry, i) => (
                            <div key={i} className="flex items-center justify-between py-2 px-3 bg-slate-800/50 rounded-lg">
                              <div className="flex items-center gap-2">
                                {parseFloat(entry.amount) > 0 ? (
                                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <ArrowDownRight className="w-4 h-4 text-red-400" />
                                )}
                                <div>
                                  <p className="text-xs text-white">{entry.reason}</p>
                                  <p className="text-[10px] text-slate-500">{new Date(entry.created_at).toLocaleString()}</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className={`text-sm font-medium ${parseFloat(entry.amount) > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {parseFloat(entry.amount) > 0 ? '+' : ''}₨{Math.abs(entry.amount).toLocaleString()}
                                </p>
                                <p className="text-[10px] text-slate-500">→ ₨{parseFloat(entry.balance_after || 0).toLocaleString()}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* SECURITY TAB */}
                {activeModalTab === 'security' && (
                  <div className="space-y-4">
                    {/* Status */}
                    <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-emerald-400" /> Account Status
                      </h4>
                      <div className="flex items-center gap-3 mb-3">
                        <Badge variant={statusColors[selectedUser.status] || 'default'} className="text-sm px-3 py-1">
                          {selectedUser.status || 'active'}
                        </Badge>
                        {selectedUser.is_locked && (
                          <Badge variant="red" className="text-sm px-3 py-1">
                            <Lock className="w-3 h-3 mr-1" /> Locked
                          </Badge>
                        )}
                      </div>
                      {!showStatusForm ? (
                        <Button onClick={() => setShowStatusForm(true)} variant="outline" className="w-full">
                          <Edit className="w-4 h-4" /> Change Status
                        </Button>
                      ) : (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <FormField label="New Status">
                              <Select value={newStatus} onChange={e => setNewStatus(e.target.value)}>
                                <option value="active">Active</option>
                                <option value="suspended">Suspended</option>
                                <option value="banned">Banned</option>
                                <option value="pending_verification">Pending Verification</option>
                              </Select>
                            </FormField>
                            <FormField label="Reason (optional)">
                              <Input value={statusReason} onChange={e => setStatusReason(e.target.value)} placeholder="Reason for status change" />
                            </FormField>
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleChangeStatus} disabled={actionLoading}>Apply</Button>
                            <Button variant="ghost" onClick={() => setShowStatusForm(false)}>Cancel</Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Lock/Unlock */}
                    <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <Lock className="w-4 h-4 text-amber-400" /> Lock Account
                      </h4>
                      {!showLockForm ? (
                        <Button onClick={() => setShowLockForm(true)} variant="outline" className="w-full">
                          {selectedUser.is_locked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                          {selectedUser.is_locked ? 'Unlock Account' : 'Lock Account'}
                        </Button>
                      ) : (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <FormField label="Duration (hours, 0 = permanent)">
                              <Input type="number" value={lockDuration} onChange={e => setLockDuration(e.target.value)} placeholder="24" />
                            </FormField>
                            <FormField label="Reason (optional)">
                              <Input value={lockReason} onChange={e => setLockReason(e.target.value)} placeholder="Reason for lock" />
                            </FormField>
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={() => handleLockUser(true)} disabled={actionLoading}>
                              <Lock className="w-4 h-4" /> Lock
                            </Button>
                            <Button variant="outline" onClick={() => handleLockUser(false)} disabled={actionLoading}>
                              <Unlock className="w-4 h-4" /> Unlock
                            </Button>
                            <Button variant="ghost" onClick={() => setShowLockForm(false)}>Cancel</Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Withdrawal PIN */}
                    <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <Key className="w-4 h-4 text-cyan-400" /> Withdrawal PIN
                      </h4>
                      <div className="mb-3">
                        <p className="text-xs text-slate-400">Current Status</p>
                        <p className="text-sm text-white mt-0.5">
                          {selectedUser.withdrawal_pin_set ? (
                            <span className="text-emerald-400 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> PIN is set</span>
                          ) : (
                            <span className="text-slate-500">No PIN set</span>
                          )}
                        </p>
                      </div>
                      {!showPinForm ? (
                        <Button onClick={() => setShowPinForm(true)} variant="outline" className="w-full">
                          <Key className="w-4 h-4" /> {selectedUser.withdrawal_pin_set ? 'Reset PIN' : 'Set PIN'}
                        </Button>
                      ) : (
                        <div className="space-y-3">
                          {pinError && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-xs text-red-400">{pinError}</div>
                          )}
                          <div className="grid grid-cols-2 gap-3">
                            <FormField label="New 4-Digit PIN">
                              <div className="relative">
                                <Input type={showNewPin ? 'text' : 'password'} value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="0000" maxLength={4} className="text-center text-lg tracking-widest" />
                                <button type="button" onClick={() => setShowNewPin(!showNewPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                                  {showNewPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                            </FormField>
                            <FormField label="Confirm PIN">
                              <div className="relative">
                                <Input type={showConfirmPin ? 'text' : 'password'} value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="0000" maxLength={4} className="text-center text-lg tracking-widest" />
                                <button type="button" onClick={() => setShowConfirmPin(!showConfirmPin)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                                  {showConfirmPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                            </FormField>
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleResetPin} disabled={actionLoading || newPin.length !== 4 || confirmPin.length !== 4}>
                              {actionLoading ? 'Saving...' : 'Save PIN'}
                            </Button>
                            <Button variant="ghost" onClick={() => { setShowPinForm(false); setPinError(''); setNewPin(''); setConfirmPin('') }}>Cancel</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ACTIVITY TAB */}
                {activeModalTab === 'activity' && (
                  <div className="space-y-4">
                    {/* Audit Logs */}
                    <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <Activity className="w-4 h-4 text-blue-400" /> Audit Logs
                      </h4>
                      {!userActivity?.auditLogs?.length ? (
                        <p className="text-sm text-slate-400 text-center py-4">No audit logs</p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {userActivity.auditLogs.map((log, i) => (
                            <div key={i} className="flex items-center justify-between py-2 px-3 bg-slate-800/50 rounded-lg">
                              <div>
                                <p className="text-xs text-white">{log.action.replace(/_/g, ' ')}</p>
                                <p className="text-[10px] text-slate-500">{log.actor_username} • {new Date(log.timestamp).toLocaleString()}</p>
                              </div>
                              <Badge variant={log.severity === 'critical' ? 'red' : log.severity === 'warning' ? 'amber' : 'blue'}>{log.severity}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Balance History (also shown here) */}
                    <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-emerald-400" /> Balance History
                      </h4>
                      {!balanceHistory.length ? (
                        <p className="text-sm text-slate-400 text-center py-4">No balance history</p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {balanceHistory.map((entry, i) => (
                            <div key={i} className="flex items-center justify-between py-2 px-3 bg-slate-800/50 rounded-lg">
                              <div className="flex items-center gap-2">
                                {parseFloat(entry.amount) > 0 ? <ArrowUpRight className="w-4 h-4 text-emerald-400" /> : <ArrowDownRight className="w-4 h-4 text-red-400" />}
                                <div>
                                  <p className="text-xs text-white">{entry.reason}</p>
                                  <p className="text-[10px] text-slate-500">{entry.admin_username} • {new Date(entry.created_at).toLocaleString()}</p>
                                </div>
                              </div>
                              <p className={`text-sm font-medium ${parseFloat(entry.amount) > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {parseFloat(entry.amount) > 0 ? '+' : ''}₨{Math.abs(entry.amount).toLocaleString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Login Attempts */}
                    <div className="bg-slate-900/50 border border-slate-700/30 rounded-xl p-4">
                      <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                        <LogIn className="w-4 h-4 text-amber-400" /> Recent Login Attempts
                      </h4>
                      {!userActivity?.loginAttempts?.length ? (
                        <p className="text-sm text-slate-400 text-center py-4">No login attempts recorded</p>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {userActivity.loginAttempts.map((attempt, i) => (
                            <div key={i} className="flex items-center justify-between py-2 px-3 bg-slate-800/50 rounded-lg">
                              <div>
                                <p className="text-xs text-white">{attempt.ip_address}</p>
                                <p className="text-[10px] text-slate-500">{new Date(attempt.timestamp).toLocaleString()}</p>
                              </div>
                              {attempt.success ? (
                                <CheckCircle className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-400" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
