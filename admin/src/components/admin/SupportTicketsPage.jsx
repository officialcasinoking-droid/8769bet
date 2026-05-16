import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Button, FormField, Input, Select, Badge } from '../../components/ui/FormElements'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '../../components/ui/Dialog'
import {
  Search, Filter, RefreshCw, ChevronLeft, ChevronRight,
  MessageSquare, Clock, CheckCircle, XCircle, AlertTriangle,
  Eye, Bot, User
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

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [pagination, setPagination] = useState({ total: 0, pages: 0 })
  const [filters, setFilters] = useState({ status: '', priority: '' })
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      let query = `/api/admin/support/tickets?page=${page}&limit=${limit}`
      if (filters.status) query += `&status=${filters.status}`
      if (filters.priority) query += `&priority=${filters.priority}`

      const data = await apiCall(query)
      setTickets(data.tickets || [])
      setPagination(data.pagination || { total: 0, pages: 0 })
    } catch (err) {
      console.error('Failed to fetch tickets:', err)
    } finally {
      setLoading(false)
    }
  }, [page, limit, filters])

  useEffect(() => { fetchData() }, [fetchData])

  const handleResolve = async (ticketId) => {
    try {
      await apiCall(`/api/admin/support/tickets/${ticketId}/resolve`, {
        method: 'POST',
        body: JSON.stringify({ resolution: 'Resolved by admin' })
      })
      fetchData()
    } catch (err) {
      console.error('Failed to resolve ticket:', err)
    }
  }

  const statusColors = {
    open: 'blue',
    ai_review: 'amber',
    pending: 'amber',
    resolved: 'emerald',
    closed: 'default'
  }

  const priorityColors = {
    low: 'blue',
    medium: 'amber',
    high: 'red',
    critical: 'red'
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-emerald-400" />
          Support Tickets
        </h2>
        <Button variant="outline" onClick={() => { setPage(1); fetchData() }}>
          <RefreshCw className="w-4 h-4" />
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={(e) => { e.preventDefault(); setPage(1); fetchData() }} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input placeholder="Search tickets..." className="pl-10" />
          </div>
          <Button type="submit" variant="outline">Search</Button>
        </form>
        <div className="flex gap-2">
          <Select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
            <option value="">All Status</option>
            <option value="open">Open</option>
            <option value="ai_review">AI Review</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </Select>
          <Select value={filters.priority} onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}>
            <option value="">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </Select>
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="p-3 text-left text-xs font-medium text-slate-400 uppercase">Subject</th>
                <th className="p-3 text-left text-xs font-medium text-slate-400 uppercase hidden md:table-cell">User</th>
                <th className="p-3 text-center text-xs font-medium text-slate-400 uppercase">Status</th>
                <th className="p-3 text-center text-xs font-medium text-slate-400 uppercase">Priority</th>
                <th className="p-3 text-center text-xs font-medium text-slate-400 uppercase hidden lg:table-cell">AI Review</th>
                <th className="p-3 text-center text-xs font-medium text-slate-400 uppercase">Created</th>
                <th className="p-3 text-center text-xs font-medium text-slate-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="p-8 text-center text-slate-400">Loading tickets...</td></tr>
              ) : tickets.length === 0 ? (
                <tr><td colSpan="7" className="p-8 text-center text-slate-400">No tickets found</td></tr>
              ) : tickets.map(ticket => (
                <tr key={ticket.id} className="border-b border-slate-700/30 hover:bg-slate-700/20 transition-colors">
                  <td className="p-3">
                    <div className="font-medium text-white">{ticket.subject}</div>
                    {ticket.description && (
                      <div className="text-xs text-slate-400 truncate max-w-xs">{ticket.description}</div>
                    )}
                  </td>
                  <td className="p-3 text-slate-300 hidden md:table-cell">
                    {ticket.users?.username || 'Anonymous'}
                  </td>
                  <td className="p-3 text-center">
                    <Badge variant={statusColors[ticket.status] || 'default'}>{ticket.status.replace('_', ' ')}</Badge>
                  </td>
                  <td className="p-3 text-center">
                    <Badge variant={priorityColors[ticket.priority] || 'default'}>{ticket.priority}</Badge>
                  </td>
                  <td className="p-3 text-center hidden lg:table-cell">
                    {ticket.ai_review_result ? (
                      <Bot className="w-4 h-4 text-blue-400 mx-auto" />
                    ) : (
                      <span className="text-xs text-slate-500">-</span>
                    )}
                  </td>
                  <td className="p-3 text-center text-slate-400 text-xs">
                    {new Date(ticket.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => { setSelectedTicket(ticket); setShowDetailModal(true) }}
                        className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors" title="View">
                        <Eye className="w-4 h-4" />
                      </button>
                      {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
                        <button onClick={() => handleResolve(ticket.id)}
                          className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-emerald-400 transition-colors" title="Resolve">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
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
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
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

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDetailModal(false)}>
          <div className="bg-slate-800 border border-slate-700/50 rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-bold text-white">{selectedTicket.subject}</h3>
              <div className="flex gap-2">
                <Badge variant={statusColors[selectedTicket.status] || 'default'}>{selectedTicket.status.replace('_', ' ')}</Badge>
                <Badge variant={priorityColors[selectedTicket.priority] || 'default'}>{selectedTicket.priority}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400">User</div>
                  <div className="text-sm text-white">{selectedTicket.users?.username || 'Anonymous'}</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400">IP Address</div>
                  <div className="text-sm text-white font-mono">{selectedTicket.ip_address || '-'}</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400">Created</div>
                  <div className="text-sm text-white">{new Date(selectedTicket.created_at).toLocaleString()}</div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400">Updated</div>
                  <div className="text-sm text-white">{new Date(selectedTicket.updated_at).toLocaleString()}</div>
                </div>
              </div>
              {selectedTicket.description && (
                <div className="bg-slate-900/50 rounded-lg p-3">
                  <div className="text-xs text-slate-400 mb-2">Description</div>
                  <div className="text-sm text-slate-300 whitespace-pre-wrap">{selectedTicket.description}</div>
                </div>
              )}
              {selectedTicket.ai_review_result && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Bot className="w-4 h-4 text-blue-400" />
                    <span className="text-xs font-bold text-blue-400">AI Review Result</span>
                  </div>
                  <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap">
                    {JSON.stringify(selectedTicket.ai_review_result, null, 2)}
                  </pre>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setShowDetailModal(false)}>Close</Button>
                {selectedTicket.status !== 'resolved' && selectedTicket.status !== 'closed' && (
                  <Button onClick={() => { handleResolve(selectedTicket.id); setShowDetailModal(false) }}>
                    <CheckCircle className="w-4 h-4" /> Resolve
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
