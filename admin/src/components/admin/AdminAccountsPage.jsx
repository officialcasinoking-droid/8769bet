import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Button, FormField, Input, Select } from '../../components/ui/FormElements'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '../../components/ui/Dialog'
import {
  UserPlus, RefreshCw, Eye, Lock, Unlock, Trash2, Key,
  Shield, CheckCircle, XCircle, Clock
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

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [formData, setFormData] = useState({ username: '', password: '', email: '', full_name: '', role: 'admin' })
  const [actionLoading, setActionLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiCall('/api/admin/accounts')
      setAccounts(data.accounts || [])
    } catch (err) {
      console.error('Failed to fetch admin accounts:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCreate = async () => {
    if (!formData.username || !formData.password) return
    setActionLoading(true)
    try {
      await apiCall('/api/admin/accounts', {
        method: 'POST',
        body: JSON.stringify(formData)
      })
      setShowCreateModal(false)
      setFormData({ username: '', password: '', email: '', full_name: '', role: 'admin' })
      fetchData()
    } catch (err) {
      console.error('Failed to create admin:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!selectedAccount || !newPassword) return
    setActionLoading(true)
    try {
      await apiCall(`/api/admin/accounts/${selectedAccount.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword })
      })
      setShowResetModal(false)
      setNewPassword('')
    } catch (err) {
      console.error('Failed to reset password:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleLock = async (id, locked) => {
    setActionLoading(true)
    try {
      await apiCall(`/api/admin/accounts/${id}/lock`, {
        method: 'POST',
        body: JSON.stringify({ locked })
      })
      fetchData()
    } catch (err) {
      console.error('Failed to lock/unlock:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleDeactivate = async (id) => {
    if (!confirm('Are you sure you want to deactivate this admin account?')) return
    setActionLoading(true)
    try {
      await apiCall(`/api/admin/accounts/${id}`, { method: 'DELETE' })
      fetchData()
    } catch (err) {
      console.error('Failed to deactivate:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const roleColors = {
    super_admin: 'red',
    admin: 'emerald',
    moderator: 'amber',
    support: 'blue'
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-400" />
          Admin Accounts
        </h2>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreateModal(true)}>
            <UserPlus className="w-4 h-4" /> Create Admin
          </Button>
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="p-3 text-left text-xs font-medium text-slate-400 uppercase">Username</th>
                <th className="p-3 text-left text-xs font-medium text-slate-400 uppercase hidden md:table-cell">Email</th>
                <th className="p-3 text-left text-xs font-medium text-slate-400 uppercase hidden lg:table-cell">Full Name</th>
                <th className="p-3 text-center text-xs font-medium text-slate-400 uppercase">Role</th>
                <th className="p-3 text-center text-xs font-medium text-slate-400 uppercase">Status</th>
                <th className="p-3 text-center text-xs font-medium text-slate-400 uppercase hidden lg:table-cell">Last Login</th>
                <th className="p-3 text-center text-xs font-medium text-slate-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="p-8 text-center text-slate-400">Loading...</td></tr>
              ) : accounts.length === 0 ? (
                <tr><td colSpan="7" className="p-8 text-center text-slate-400">No admin accounts</td></tr>
              ) : accounts.map(account => (
                <tr key={account.id} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                  <td className="p-3 font-medium text-white">{account.username}</td>
                  <td className="p-3 text-slate-300 hidden md:table-cell">{account.email || '-'}</td>
                  <td className="p-3 text-slate-300 hidden lg:table-cell">{account.full_name || '-'}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                      account.role === 'super_admin' ? 'bg-red-500/20 text-red-400' :
                      account.role === 'admin' ? 'bg-emerald-500/20 text-emerald-400' :
                      account.role === 'moderator' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-blue-500/20 text-blue-400'
                    }`}>
                      {account.role}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    {account.is_active ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 mx-auto" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400 mx-auto" />
                    )}
                  </td>
                  <td className="p-3 text-center text-slate-400 text-xs hidden lg:table-cell">
                    {account.last_login ? new Date(account.last_login).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => { setSelectedAccount(account); setShowResetModal(true) }}
                        className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-amber-400 transition-colors" title="Reset Password">
                        <Key className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleLock(account.id, !account.locked_until)}
                        className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors" title={account.locked_until ? 'Unlock' : 'Lock'}>
                        {account.locked_until ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleDeactivate(account.id)}
                        className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-red-400 transition-colors" title="Deactivate">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Admin Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Admin Account</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="Username">
              <Input value={formData.username} onChange={e => setFormData(f => ({ ...f, username: e.target.value }))} placeholder="admin_username" />
            </FormField>
            <FormField label="Password">
              <Input type="password" value={formData.password} onChange={e => setFormData(f => ({ ...f, password: e.target.value }))} placeholder="Secure password" />
            </FormField>
            <FormField label="Email">
              <Input type="email" value={formData.email} onChange={e => setFormData(f => ({ ...f, email: e.target.value }))} placeholder="admin@example.com" />
            </FormField>
            <FormField label="Full Name">
              <Input value={formData.full_name} onChange={e => setFormData(f => ({ ...f, full_name: e.target.value }))} placeholder="John Doe" />
            </FormField>
            <FormField label="Role">
              <Select value={formData.role} onChange={e => setFormData(f => ({ ...f, role: e.target.value }))}>
                <option value="admin">Admin</option>
                <option value="moderator">Moderator</option>
                <option value="support">Support</option>
              </Select>
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={actionLoading || !formData.username || !formData.password}>
              {actionLoading ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Modal */}
      <Dialog open={showResetModal} onOpenChange={setShowResetModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password - {selectedAccount?.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <div className="text-xs text-amber-400">Warning: This will invalidate all active sessions for this admin.</div>
            </div>
            <FormField label="New Password">
              <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New secure password" />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowResetModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleResetPassword} disabled={actionLoading || !newPassword}>
              {actionLoading ? 'Resetting...' : 'Reset Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
