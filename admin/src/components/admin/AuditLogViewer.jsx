import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Button, FormField, Input, Select, Badge } from '../../components/ui/FormElements'
import {
  Search, Filter, Download, RefreshCw, ChevronLeft, ChevronRight,
  Eye, Shield, AlertTriangle, CheckCircle, XCircle, Clock,
  User, Activity, BarChart3
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

export default function AuditLogViewer() {
  const [logs, setLogs] = useState([])
  const [stats, setStats] = useState({ todayLogs: 0, criticalToday: 0, failedToday: 0, uniqueActorsToday: 0 })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(50)
  const [pagination, setPagination] = useState({ total: 0, pages: 0 })
  const [filters, setFilters] = useState({
    dateFrom: '', dateTo: '', actorType: '', action: '', severity: '', targetType: '', search: ''
  })
  const [showFilters, setShowFilters] = useState(false)
  const [selectedLog, setSelectedLog] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [wsConnected, setWsConnected] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      let query = `/api/admin/audit/logs?page=${page}&limit=${limit}`
      if (filters.dateFrom) query += `&dateFrom=${filters.dateFrom}`
      if (filters.dateTo) query += `&dateTo=${filters.dateTo}`
      if (filters.actorType) query += `&actorType=${filters.actorType}`
      if (filters.action) query += `&action=${encodeURIComponent(filters.action)}`
      if (filters.severity) query += `&severity=${filters.severity}`
      if (filters.targetType) query += `&targetType=${filters.targetType}`
      if (filters.search) query += `&search=${encodeURIComponent(filters.search)}`

      const data = await apiCall(query)
      setLogs(data.logs || [])
      setPagination(data.pagination || { total: 0, pages: 0 })
    } catch (err) {
      console.error('Failed to fetch audit logs:', err)
    } finally {
      setLoading(false)
    }
  }, [page, limit, filters])

  const fetchStats = useCallback(async () => {
    try {
      const data = await apiCall('/api/admin/audit/stats')
      setStats(data.stats || {})
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }, [])

  useEffect(() => { fetchData(); fetchStats() }, [fetchData, fetchStats])

  useEffect(() => {
    const wsUrl = API_URL.replace('https', 'wss').replace('http', 'ws') + '/ws/audit'
    let ws
    try {
      ws = new WebSocket(wsUrl)
      ws.onopen = () => setWsConnected(true)
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'audit_log' && msg.log) {
            setLogs(prev => [msg.log, ...prev].slice(0, 500))
            fetchStats()
          }
        } catch (e) {}
      }
      ws.onclose = () => setWsConnected(false)
      ws.onerror = () => setWsConnected(false)
    } catch (e) {
      setWsConnected(false)
    }
    return () => { if (ws) ws.close() }
  }, [fetchStats])

  const handleExport = async () => {
    try {
      const token = getAuthToken()
      const response = await fetch(`${API_URL}/api/admin/audit/export`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('Export failed:', err)
    }
  }

  const severityColors = {
    info: 'blue',
    warning: 'amber',
    critical: 'red',
    error: 'red'
  }

  const formatAction = (action) => {
    if (action.startsWith('POST') || action.startsWith('PUT') || action.startsWith('DELETE')) {
      const [method, path] = action.split(' ')
      return `${method} ${path.split('/').slice(-2).join('/')}`
    }
    return action.replace(/_/g, ' ')
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-slate-400">Today's Logs</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.todayLogs?.toLocaleString() || 0}</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-xs text-slate-400">Critical Events</span>
          </div>
          <div className="text-2xl font-bold text-red-400">{stats.criticalToday || 0}</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <XCircle className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-slate-400">Failed Actions</span>
          </div>
          <div className="text-2xl font-bold text-amber-400">{stats.failedToday || 0}</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <User className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-slate-400">Unique Actors</span>
          </div>
          <div className="text-2xl font-bold text-emerald-400">{stats.uniqueActorsToday || 0}</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchData() }} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              placeholder="Search by username, action..." className="pl-10" />
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
          <div className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs ${
            wsConnected ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-slate-700/50 bg-slate-800/50 text-slate-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500' : 'bg-red-500 animate-pulse'}`} />
            {wsConnected ? 'Live' : 'Offline'}
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <FormField label="Date From">
            <Input type="datetime-local" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))} />
          </FormField>
          <FormField label="Date To">
            <Input type="datetime-local" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))} />
          </FormField>
          <FormField label="Actor Type">
            <Select value={filters.actorType} onChange={e => setFilters(f => ({ ...f, actorType: e.target.value }))}>
              <option value="">All</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
              <option value="system">System</option>
            </Select>
          </FormField>
          <FormField label="Severity">
            <Select value={filters.severity} onChange={e => setFilters(f => ({ ...f, severity: e.target.value }))}>
              <option value="">All</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
              <option value="error">Error</option>
            </Select>
          </FormField>
          <Button onClick={() => { setPage(1); fetchData() }} className="col-span-2 md:col-span-4">Apply Filters</Button>
        </div>
      )}

      {/* Logs Table */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="p-3 text-left text-xs font-medium text-slate-400 uppercase">Timestamp</th>
                <th className="p-3 text-left text-xs font-medium text-slate-400 uppercase">Actor</th>
                <th className="p-3 text-left text-xs font-medium text-slate-400 uppercase">Action</th>
                <th className="p-3 text-left text-xs font-medium text-slate-400 uppercase hidden lg:table-cell">Target</th>
                <th className="p-3 text-center text-xs font-medium text-slate-400 uppercase">Severity</th>
                <th className="p-3 text-center text-xs font-medium text-slate-400 uppercase">Status</th>
                <th className="p-3 text-center text-xs font-medium text-slate-400 uppercase">Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="p-8 text-center text-slate-400">Loading audit logs...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan="7" className="p-8 text-center text-slate-400">No audit logs found</td></tr>
              ) : logs.map(log => (
                <tr key={log.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                  <td className="p-3 text-slate-300 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={log.actor_type === 'admin' ? 'emerald' : log.actor_type === 'system' ? 'blue' : 'default'}>
                        {log.actor_type}
                      </Badge>
                      <span className="text-xs text-slate-300">{log.actor_username || '-'}</span>
                    </div>
                  </td>
                  <td className="p-3 text-slate-300 text-xs font-mono">{formatAction(log.action)}</td>
                  <td className="p-3 text-slate-400 hidden lg:table-cell">
                    {log.target_username || log.target_type || '-'}
                  </td>
                  <td className="p-3 text-center">
                    <Badge variant={severityColors[log.severity] || 'default'}>{log.severity}</Badge>
                  </td>
                  <td className="p-3 text-center">
                    {log.success ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 mx-auto" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400 mx-auto" />
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <button onClick={() => { setSelectedLog(log); setShowDetailModal(true) }}
                      className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination.pages > 1 && (
          <div className="p-3 border-t border-slate-700/50 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Showing {(page - 1) * limit + 1}-{Math.min(page * limit, pagination.total)} of {pagination.total}
            </span>
            <div className="flex items-center gap-2">
              <Select value={limit} onChange={e => { setLimit(parseInt(e.target.value)); setPage(1) }} className="w-20">
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

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDetailModal(false)}>
          <div className="bg-slate-800 border border-slate-700/50 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-bold text-white">Audit Log Details</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400">Timestamp</div>
                  <div className="text-sm text-white">{new Date(selectedLog.timestamp).toLocaleString()}</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400">Actor</div>
                  <div className="text-sm text-white">{selectedLog.actor_type} - {selectedLog.actor_username || 'Unknown'}</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400">Action</div>
                  <div className="text-sm text-white font-mono">{selectedLog.action}</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400">Target</div>
                  <div className="text-sm text-white">{selectedLog.target_type || '-'} {selectedLog.target_username ? `(${selectedLog.target_username})` : ''}</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400">IP Address</div>
                  <div className="text-sm text-white font-mono">{selectedLog.ip_address || '-'}</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400">User Agent</div>
                  <div className="text-xs text-white font-mono truncate">{selectedLog.user_agent || '-'}</div>
                </div>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <div className="text-xs text-slate-400 mb-2">Details</div>
                <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap overflow-x-auto">
                  {JSON.stringify(selectedLog.details || {}, null, 2)}
                </pre>
              </div>
              <div className="flex justify-end">
                <Button variant="ghost" onClick={() => setShowDetailModal(false)}>Close</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
