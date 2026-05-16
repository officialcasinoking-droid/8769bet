import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Button, FormField, Input } from '../../components/ui/FormElements'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '../../components/ui/Dialog'
import {
  Shield, AlertTriangle, Ban, Unlock, Search, RefreshCw,
  Clock, Eye, X, CheckCircle, Activity, Lock
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

export default function SecurityDashboard() {
  const [blockedIPs, setBlockedIPs] = useState([])
  const [alerts, setAlerts] = useState({ criticalEvents: [], pendingIPReviews: [], suspiciousFailedLogins: [] })
  const [loading, setLoading] = useState(true)
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [newIP, setNewIP] = useState('')
  const [blockReason, setBlockReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [ipsData, alertsData] = await Promise.all([
        apiCall('/api/admin/security/blocked-ips'),
        apiCall('/api/admin/security/alerts')
      ])
      setBlockedIPs(ipsData.blockedIPs || [])
      setAlerts(alertsData.alerts || { criticalEvents: [], pendingIPReviews: [], suspiciousFailedLogins: [] })
    } catch (err) {
      console.error('Failed to fetch security data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleBlockIP = async () => {
    if (!newIP || !blockReason) return
    setActionLoading(true)
    try {
      await apiCall('/api/admin/security/block-ip', {
        method: 'POST',
        body: JSON.stringify({ ip_address: newIP, reason: blockReason })
      })
      setShowBlockModal(false)
      setNewIP('')
      setBlockReason('')
      fetchData()
    } catch (err) {
      console.error('Failed to block IP:', err)
    } finally {
      setActionLoading(false)
    }
  }

  const handleUnblockIP = async (ip) => {
    setActionLoading(true)
    try {
      await apiCall('/api/admin/security/unblock-ip', {
        method: 'POST',
        body: JSON.stringify({ ip_address: ip })
      })
      fetchData()
    } catch (err) {
      console.error('Failed to unblock IP:', err)
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-400" />
          Security Dashboard
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowBlockModal(true)}>
            <Ban className="w-4 h-4" /> Block IP
          </Button>
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Critical Events */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            Critical Events Today
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {alerts.criticalEvents?.length === 0 ? (
              <p className="text-xs text-slate-500">No critical events today</p>
            ) : (
              alerts.criticalEvents?.slice(0, 10).map(event => (
                <div key={event.id} className="bg-slate-900/50 rounded-lg p-2 border border-red-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white font-medium">{event.action.replace(/_/g, ' ')}</span>
                    <span className="text-[10px] text-slate-400">{new Date(event.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">by {event.actor_username || 'unknown'}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pending IP Reviews */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-amber-400" />
            Pending IP Reviews
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {alerts.pendingIPReviews?.length === 0 ? (
              <p className="text-xs text-slate-500">No pending reviews</p>
            ) : (
              alerts.pendingIPReviews?.slice(0, 10).map(ip => (
                <div key={ip.id} className="bg-slate-900/50 rounded-lg p-2 border border-amber-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white font-mono">{ip.ip_address}</span>
                    <span className="text-[10px] text-slate-400">{new Date(ip.blocked_at).toLocaleDateString()}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">{ip.reason}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Suspicious Failed Logins */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
            <Lock className="w-4 h-4 text-blue-400" />
            Suspicious Failed Logins
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {alerts.suspiciousFailedLogins?.length === 0 ? (
              <p className="text-xs text-slate-500">No suspicious activity</p>
            ) : (
              alerts.suspiciousFailedLogins?.slice(0, 10).map((login, i) => (
                <div key={i} className="bg-slate-900/50 rounded-lg p-2 border border-blue-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white">{login.username}</span>
                    <span className="text-[10px] text-red-400">{login.count || 0} attempts</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">{login.ip_address}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Blocked IPs Table */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-700/50">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Ban className="w-4 h-4 text-red-400" />
            Blocked IPs ({blockedIPs.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="p-3 text-left text-xs font-medium text-slate-400 uppercase">IP Address</th>
                <th className="p-3 text-left text-xs font-medium text-slate-400 uppercase">Reason</th>
                <th className="p-3 text-center text-xs font-medium text-slate-400 uppercase">Status</th>
                <th className="p-3 text-center text-xs font-medium text-slate-400 uppercase">Review</th>
                <th className="p-3 text-center text-xs font-medium text-slate-400 uppercase">Blocked At</th>
                <th className="p-3 text-center text-xs font-medium text-slate-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="6" className="p-8 text-center text-slate-400">Loading...</td></tr>
              ) : blockedIPs.length === 0 ? (
                <tr><td colSpan="6" className="p-8 text-center text-slate-400">No blocked IPs</td></tr>
              ) : blockedIPs.map(ip => (
                <tr key={ip.id} className="border-b border-slate-700/30 hover:bg-slate-700/20">
                  <td className="p-3 font-mono text-white text-xs">{ip.ip_address}</td>
                  <td className="p-3 text-slate-300 text-xs max-w-xs truncate">{ip.reason}</td>
                  <td className="p-3 text-center">
                    {ip.is_active ? (
                      <span className="px-2 py-1 rounded-lg text-xs bg-red-500/20 text-red-400">Active</span>
                    ) : (
                      <span className="px-2 py-1 rounded-lg text-xs bg-slate-700/50 text-slate-400">Inactive</span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 rounded-lg text-xs ${
                      ip.review_status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' :
                      ip.review_status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                      ip.review_status === 'ai_reviewed' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-amber-500/20 text-amber-400'
                    }`}>
                      {ip.review_status}
                    </span>
                  </td>
                  <td className="p-3 text-center text-slate-400 text-xs">
                    {new Date(ip.blocked_at).toLocaleString()}
                  </td>
                  <td className="p-3 text-center">
                    {ip.is_active && (
                      <button onClick={() => handleUnblockIP(ip.ip_address)} disabled={actionLoading}
                        className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-emerald-400 transition-colors" title="Unblock">
                        <Unlock className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Block IP Modal */}
      <Dialog open={showBlockModal} onOpenChange={setShowBlockModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block IP Address</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <FormField label="IP Address">
              <Input value={newIP} onChange={e => setNewIP(e.target.value)} placeholder="e.g. 192.168.1.1" />
            </FormField>
            <FormField label="Reason">
              <Input value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="e.g. Suspicious activity, brute force" />
            </FormField>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowBlockModal(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleBlockIP} disabled={actionLoading || !newIP || !blockReason}>
              {actionLoading ? 'Blocking...' : 'Block IP'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
