import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { Badge, Button } from '../../components/ui/FormElements'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '../../components/ui/Dialog'
import { FormField, Input } from '../../components/ui/FormElements'
import { Search, User, Shield, X, Ban, CheckCircle, Eye, Wallet, Lock, CreditCard, Trash2, Edit, AlertTriangle } from 'lucide-react'

async function getUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, email, full_name, balance, role, is_active, created_at, withdrawal_pin_set, withdrawal_pin_hash, withdrawal_accounts')
    .order('created_at', { ascending: false })
  if (error) {
    console.error('getUsers error:', error)
    throw error
  }
  return data || []
}

async function toggleUserStatus(id, isActive) {
  const { data, error } = await supabase
    .from('users')
    .update({ is_active: !isActive, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

async function updateUserBalance(id, balance) {
  const { data, error } = await supabase
    .from('users')
    .update({ balance: parseFloat(balance), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id, balance')
    .single()
  if (error) throw error
  return data
}

async function resetUserPIN(id) {
  const { data, error } = await supabase
    .from('users')
    .update({ withdrawal_pin_set: false, withdrawal_pin_hash: null, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

async function updateUserInfo(id, updates) {
  const { data, error } = await supabase
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export default function UsersPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [selectedUser, setSelectedUser] = useState(null)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [balanceInput, setBalanceInput] = useState('')
  const [adminNote, setAdminNote] = useState('')

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: getUsers,
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }) => toggleUserStatus(id, isActive),
    onSuccess: (_, { isActive }) => {
      toast.success(isActive ? 'User blocked' : 'User unblocked')
      qc.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (e) => toast.error(e.message),
  })

  const balanceMutation = useMutation({
    mutationFn: ({ id, balance }) => updateUserBalance(id, balance),
    onSuccess: () => {
      toast.success('Balance updated')
      qc.invalidateQueries({ queryKey: ['admin-users'] })
    },
    onError: (e) => toast.error(e.message),
  })

  const resetPINMutation = useMutation({
    mutationFn: (id) => resetUserPIN(id),
    onSuccess: () => {
      toast.success('User PIN reset')
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      setSelectedUser(null)
    },
    onError: (e) => toast.error(e.message),
  })

  const updateUserMutation = useMutation({
    mutationFn: ({ id, updates }) => updateUserInfo(id, updates),
    onSuccess: () => {
      toast.success('User updated')
      qc.invalidateQueries({ queryKey: ['admin-users'] })
      setEditMode(false)
    },
    onError: (e) => toast.error(e.message),
  })

  const filtered = users.filter(u => {
    const matchSearch =
      !search ||
      u.username?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.id?.includes(search)
    const matchFilter =
      filter === 'all' ||
      (filter === 'active' && u.is_active !== false) ||
      (filter === 'blocked' && u.is_active === false) ||
      (filter === 'pin_set' && u.withdrawal_pin_set) ||
      (filter === 'no_pin' && !u.withdrawal_pin_set)
    return matchSearch && matchFilter
  })

  const totalUsers = users.length
  const activeUsers = users.filter(u => u.is_active !== false).length
  const blockedUsers = users.filter(u => u.is_active === false).length
  const withPIN = users.filter(u => u.withdrawal_pin_set).length
  const withAccounts = users.filter(u => u.withdrawal_accounts?.length > 0).length

  const handleEditUser = () => {
    if (selectedUser) {
      setEditForm({
        username: selectedUser.username || '',
        full_name: selectedUser.full_name || '',
        email: selectedUser.email || '',
        phone: selectedUser.phone || '',
      })
      setEditMode(true)
    }
  }

  const handleSaveEdit = () => {
    if (selectedUser) {
      updateUserMutation.mutate({
        id: selectedUser.id,
        updates: editForm
      })
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">User Management</h2>
        <p className="text-slate-400 mt-1">Manage and monitor all registered users</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: 'Total Users', value: totalUsers, color: 'text-blue-400' },
          { label: 'Active', value: activeUsers, color: 'text-emerald-400' },
          { label: 'Blocked', value: blockedUsers, color: 'text-red-400' },
          { label: 'PIN Set', value: withPIN, color: 'text-yellow-400' },
          { label: 'With Accounts', value: withAccounts, color: 'text-purple-400' },
        ].map((stat) => (
          <div key={stat.label} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
            <p className="text-sm text-slate-400">{stat.label}</p>
            <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by username, email, or ID..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {['all', 'active', 'blocked', 'pin_set', 'no_pin'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700/50'
              }`}
            >
              {status === 'all' ? 'All' : 
               status === 'active' ? 'Active' :
               status === 'blocked' ? 'Blocked' :
               status === 'pin_set' ? 'PIN Set' : 'No PIN'}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase">User</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Balance</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Security</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Accounts</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Status</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Registered</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-slate-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">Loading users...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">No users found</td>
                </tr>
              ) : filtered.map((user) => (
                <tr key={user.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm">
                        {user.username?.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-white">{user.username}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-white font-medium">₨{Number(user.balance || 0).toLocaleString()}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-1">
                      {user.withdrawal_pin_set ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-xs">PIN</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-slate-600/50 text-slate-400 text-xs">No PIN</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-white">{user.withdrawal_accounts?.length || 0}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      user.is_active !== false
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-red-500/15 text-red-400'
                    }`}>
                      {user.is_active !== false ? 'Active' : 'Blocked'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(user)
                          setBalanceInput(user.balance || '0')
                          setEditMode(false)
                        }}
                        className="text-slate-400 hover:text-white"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleMutation.mutate({ id: user.id, isActive: user.is_active !== false })}
                        className={user.is_active !== false ? 'text-slate-400 hover:text-red-400' : 'text-emerald-400 hover:text-emerald-300'}
                      >
                        {user.is_active !== false ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={!!selectedUser} onClose={() => { setSelectedUser(null); setEditMode(false) }} className="max-w-2xl">
        <DialogHeader onClose={() => { setSelectedUser(null); setEditMode(false) }}>
          <DialogTitle>
            {editMode ? 'Edit User' : 'User Details'}
          </DialogTitle>
        </DialogHeader>
        <DialogContent>
          {selectedUser && (
            <div className="space-y-4">
              {editMode ? (
                <div className="space-y-4">
                  <FormField label="Username">
                    <Input
                      value={editForm.username}
                      onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    />
                  </FormField>
                  <FormField label="Full Name">
                    <Input
                      value={editForm.full_name}
                      onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                    />
                  </FormField>
                  <FormField label="Email">
                    <Input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    />
                  </FormField>
                  <FormField label="Phone">
                    <Input
                      value={editForm.phone || ''}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    />
                  </FormField>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4 p-4 bg-slate-700/30 rounded-xl">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold text-xl">
                      {selectedUser.username?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{selectedUser.username}</h3>
                      <p className="text-sm text-slate-400">{selectedUser.email}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium mt-1 inline-block ${
                        selectedUser.is_active !== false ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                      }`}>
                        {selectedUser.is_active !== false ? 'Active' : 'Blocked'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-700/30 rounded-lg">
                      <p className="text-xs text-slate-400">Balance</p>
                      <p className="text-lg font-bold text-white">₨{Number(selectedUser.balance || 0).toLocaleString()}</p>
                    </div>
                    <div className="p-3 bg-slate-700/30 rounded-lg">
                      <p className="text-xs text-slate-400">Role</p>
                      <p className="text-lg font-bold text-white capitalize">{selectedUser.role || 'User'}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                    <h4 className="text-sm font-semibold text-yellow-400 mb-3 flex items-center gap-2">
                      <Lock className="w-4 h-4" /> Security
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-400">Withdrawal PIN:</span>
                        <span className={`text-sm font-medium ${selectedUser.withdrawal_pin_set ? 'text-emerald-400' : 'text-red-400'}`}>
                          {selectedUser.withdrawal_pin_set ? '✓ Set' : 'Not Set'}
                        </span>
                      </div>
                      {selectedUser.withdrawal_pin_hash && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-slate-400">PIN:</span>
                          <span className="text-sm font-mono text-emerald-300 bg-slate-700 px-3 py-1 rounded-lg">
                            {(() => {
                              try {
                                return atob(selectedUser.withdrawal_pin_hash)
                              } catch {
                                return selectedUser.withdrawal_pin_hash.slice(0, 6) + '******'
                              }
                            })()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                    <h4 className="text-sm font-semibold text-emerald-400 mb-3 flex items-center gap-2">
                      <CreditCard className="w-4 h-4" /> Withdrawal Accounts ({selectedUser.withdrawal_accounts?.length || 0})
                    </h4>
                    {selectedUser.withdrawal_accounts?.length > 0 ? (
                      <div className="space-y-2">
                        {selectedUser.withdrawal_accounts.map((acc, i) => (
                          <div key={i} className="p-3 bg-slate-700/50 rounded-lg">
                            <div className="flex justify-between mb-1">
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
                      <p className="text-sm text-slate-400">No withdrawal accounts</p>
                    )}
                  </div>

                  <div className="p-4 bg-slate-700/30 rounded-xl">
                    <h4 className="text-sm font-semibold text-white mb-3">User Information</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="text-slate-500">Full Name</p>
                        <p className="text-white">{selectedUser.full_name || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Phone</p>
                        <p className="text-white">{selectedUser.phone || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">User ID</p>
                        <p className="text-white text-xs">{selectedUser.id}</p>
                      </div>
                      <div>
                        <p className="text-slate-500">Registered</p>
                        <p className="text-white">{new Date(selectedUser.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <FormField label="Adjust Balance ($)">
                    <Input
                      type="number"
                      step="0.01"
                      value={balanceInput}
                      onChange={(e) => setBalanceInput(e.target.value)}
                      placeholder="0.00"
                    />
                  </FormField>
                </>
              )}
            </div>
          )}
        </DialogContent>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          {editMode ? (
            <>
              <Button variant="outline" onClick={() => setEditMode(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={updateUserMutation.isPending} className="w-full sm:w-auto flex-1">
                {updateUserMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </>
          ) : (
            <>
              {selectedUser?.withdrawal_pin_set && (
                <Button
                  variant="outline"
                  onClick={() => {
                    if (confirm('Reset this user\'s withdrawal PIN?')) {
                      resetPINMutation.mutate(selectedUser.id)
                    }
                  }}
                  disabled={resetPINMutation.isPending}
                  className="w-full sm:w-auto border-red-500/50 text-red-400 hover:bg-red-500/10"
                >
                  <Lock className="w-4 h-4 mr-2" />
                  Reset PIN
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleEditUser}
                className="w-full sm:w-auto"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              <Button
                variant="outline"
                onClick={() => balanceMutation.mutate({ id: selectedUser.id, balance: balanceInput })}
                disabled={balanceMutation.isPending}
                className="w-full sm:w-auto flex-1"
              >
                Update Balance
              </Button>
              <Button
                onClick={() => toggleMutation.mutate({ id: selectedUser.id, isActive: selectedUser.is_active !== false })}
                className={`w-full sm:w-auto ${selectedUser?.is_active !== false ? 'border-red-500/50 text-red-400 hover:bg-red-500/10' : 'border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10'}`}
              >
                {selectedUser?.is_active !== false ? (
                  <>
                    <Ban className="w-4 h-4 mr-2" />
                    Block
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Unblock
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </Dialog>
    </div>
  )
}
