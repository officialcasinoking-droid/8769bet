import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { Button, FormField, Input, Select, Badge } from '../../components/ui/FormElements'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '../../components/ui/Dialog'
import {
  Search, User, Shield, X, Ban, CheckCircle, Eye, Wallet, Lock,
  CreditCard, Edit, AlertTriangle, Users, UserCheck, UserX,
  Filter, ChevronLeft, ChevronRight, Download, CheckSquare, Square,
  MoreVertical, RefreshCw, TrendingUp, Clock
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
  const navigate = useNavigate()
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
  const [showBalanceModal, setShowBalanceModal] = useState(false)
  const [balanceAmount, setBalanceAmount] = useState('')
  const [balanceReason, setBalanceReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      let query = `/api/admin/users?page=${page}&limit=${limit}`
      if (search) query += `&search=${encodeURIComponent(search)}`
      if (activeTab === 'active') query += '&status=active'
      else if (activeTab === 'banned') query += '&status=banned'
      else if (activeTab === 'suspended') query += '&status=suspended'
      else if (activeTab === 'high-risk') query += '&riskLevel=high'
      else if (activeTab === 'new') {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        query += `&dateFrom=${yesterday}`
      }
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

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    fetchData()
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

  const handleAdjustBalance = async () => {
    if (!selectedUser || !balanceAmount || !balanceReason) return
    setActionLoading(true)
    try {
      await apiCall(`/api/admin/users/${selectedUser.id}/balance`, {
        method: 'POST',
        body: JSON.stringify({ amount: parseFloat(balanceAmount), reason: balanceReason })
      })
      setShowBalanceModal(false)
      setBalanceAmount('')
      setBalanceReason('')
      fetchData()
    } catch (err) {
      console.error('Balance adjustment failed:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleChangeStatus = async (userId, newStatus) => {
    setActionLoading(true)
    try {
      await apiCall(`/api/admin/users/${userId}/status`, {
        method: 'POST',
        body: JSON.stringify({ status: newStatus, reason: 'Changed from admin panel' })
      })
      fetchData()
      fetchStats()
    } catch (err) {
      console.error('Status change failed:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const tabs = [
    { id: 'all', label: 'All Users', icon: Users, count: stats.total },
    { id: 'active', label: 'Active', icon: UserCheck, count: stats.active },
    { id: 'suspended', label: 'Suspended', icon: AlertTriangle, count: stats.suspended },
    { id: 'banned', label: 'Banned', icon: Ban, count: stats.banned },
    { id: 'high-risk', label: 'High Risk', icon: Shield, count: stats.highRisk },
    { id: 'new', label: 'New (24h)', icon: Clock, count: stats.newLast24h },
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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
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
        <form onSubmit={handleSearch} className="flex-1 flex gap-2">
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
              <option value="login_count">Login Count</option>
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
                <th className="p-3 text-center text-xs font-medium text-slate-400 uppercase hidden lg:table-cell">Last Login</th>
                <th className="p-3 text-center text-xs font-medium text-slate-400 uppercase hidden xl:table-cell">Logins</th>
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
                  <td className="p-3 text-center text-slate-400 hidden lg:table-cell">
                    {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="p-3 text-center text-slate-400 hidden xl:table-cell">{user.login_count || 0}</td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => { setSelectedUser(user); setShowUserModal(true) }}
                        className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors" title="View">
                        <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setSelectedUser(user); setShowBalanceModal(true) }}
                        className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-emerald-400 transition-colors" title="Adjust Balance">
                        <Wallet className="w-4 h-4" />
                      </button>
                      <div className="relative group">
                        <button className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        <div className="absolute right-0 top-full mt-1 w-40 bg-slate-800 border border-slate-700/50 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                          <button onClick={() => handleChangeStatus(user.id, 'active')}
                            className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-700/50 flex items-center gap-2 rounded-t-xl">
                            <CheckCircle className="w-3 h-3 text-emerald-400" /> Activate
                          </button>
                          <button onClick={() => handleChangeStatus(user.id, 'suspended')}
                            className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-700/50 flex items-center gap-2">
                            <AlertTriangle className="w-3 h-3 text-amber-400" /> Suspend
                          </button>
                          <button onClick={() => handleChangeStatus(user.id, 'banned')}
                            className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:bg-slate-700/50 flex items-center gap-2 rounded-b-xl">
                            <Ban className="w-3 h-3 text-red-400" /> Ban
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

      {/* Balance Adjustment Modal */}
      <Dialog open={showBalanceModal} onOpenChange={setShowBalanceModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Balance - {selectedUser?.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-slate-900/50 rounded-lg p-3">
              <div className="text-xs text-slate-400">Current Balance</div>
              <div className="text-xl font-bold text-emerald-400">₨{parseFloat(selectedUser?.balance || 0).toLocaleString()}</div>
            </div>
            <FormField label="Amount (positive to add, negative to deduct)">
              <Input type="number" value={balanceAmount} onChange={e => setBalanceAmount(e.target.value)} placeholder="e.g. 1000 or -500" />
            </FormField>
            <FormField label="Reason">
              <Input value={balanceReason} onChange={e => setBalanceReason(e.target.value)} placeholder="e.g. Bonus, Refund, Adjustment" />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowBalanceModal(false)}>Cancel</Button>
            <Button onClick={handleAdjustBalance} disabled={actionLoading || !balanceAmount || !balanceReason}>
              {actionLoading ? 'Processing...' : 'Apply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Detail Modal */}
      <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>User Details - {selectedUser?.username}</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400">Email</div>
                  <div className="text-sm text-white">{selectedUser.email}</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400">Full Name</div>
                  <div className="text-sm text-white">{selectedUser.full_name || '-'}</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400">Balance</div>
                  <div className="text-sm font-bold text-emerald-400">₨{parseFloat(selectedUser.balance || 0).toLocaleString()}</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400">Status</div>
                  <Badge variant={statusColors[selectedUser.status] || 'default'}>{selectedUser.status || 'active'}</Badge>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400">Risk Level</div>
                  <Badge variant={riskColors[selectedUser.risk_level] || 'default'}>{selectedUser.risk_level || 'low'}</Badge>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400">KYC Status</div>
                  <div className="text-sm text-white capitalize">{selectedUser.kyc_status || 'none'}</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400">Registered</div>
                  <div className="text-sm text-white">{new Date(selectedUser.created_at).toLocaleDateString()}</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400">Last Login</div>
                  <div className="text-sm text-white">{selectedUser.last_login ? new Date(selectedUser.last_login).toLocaleString() : 'Never'}</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400">Login Count</div>
                  <div className="text-sm text-white">{selectedUser.login_count || 0}</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400">User ID</div>
                  <div className="text-xs text-white font-mono">{selectedUser.id}</div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowUserModal(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
