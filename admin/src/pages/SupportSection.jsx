import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  getSupportTickets, getMessages, sendMessage,
  closeTicket, reopenTicket, deleteTicket, getAiSupportReply, markMessagesRead, getUserContext,
  deleteMessage, editMessage, updateTicketPriority, assignTicket,
  getPlatformSettings, updatePlatformSettings
} from '../api/referrals'
import { Button } from '../components/ui/FormElements'
import { useToast } from '../components/ui/Toast'
import {
  MessageCircle, Send, RefreshCw, CheckCircle, XCircle,
  ChevronLeft, Sparkles, User, Bot, MoreVertical,
  Trash2, Edit2, AlertTriangle, Clock, CheckCheck, Eye,
  ToggleRight, ToggleLeft
} from 'lucide-react'

const PRIORITY_COLORS = {
  low: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  medium: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  high: 'bg-red-500/15 text-red-400 border-red-500/30',
  urgent: 'bg-rose-500/15 text-rose-400 border-rose-500/30 animate-pulse',
}

const STATUS_COLORS = {
  open: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  resolved: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  closed: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
}

function MessageBubble({ msg, isOwn, onEdit, onDelete, isAdmin }) {
  const [showMenu, setShowMenu] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(msg.message)
  const isAi = msg.sender_role === 'ai'
  const menuRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSaveEdit = () => {
    if (editText.trim() && editText !== msg.message) {
      onEdit(msg.id, editText.trim())
    }
    setIsEditing(false)
  }

  return (
    <div className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`} ref={menuRef}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs ${
        isAi ? 'bg-purple-500/30 text-purple-300' :
        isOwn ? 'bg-emerald-500/30 text-emerald-300' :
        'bg-slate-600 text-slate-300'
      }`}>
        {isAi ? <Bot className="w-4 h-4" /> : isOwn ? 'A' : <User className="w-4 h-4" />}
      </div>
      <div className={`max-w-md flex flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-medium">
            {msg.sender_name || 'Unknown'}
          </span>
          {msg.is_ai && (
            <span className="px-1 py-0.5 rounded bg-purple-500/20 text-purple-400 text-[8px] font-medium">AI</span>
          )}
          {msg.is_edited && (
            <span className="text-[8px] text-slate-600">edited</span>
          )}
        </div>
        <div className="relative group">
          {isEditing ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveEdit()
                  if (e.key === 'Escape') setIsEditing(false)
                }}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                autoFocus
              />
              <Button size="sm" onClick={handleSaveEdit}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
            </div>
          ) : (
            <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed ${
              isOwn ? 'bg-emerald-500 text-white rounded-br-md' :
              isAi ? 'bg-purple-500/20 text-slate-200 rounded-bl-md border border-purple-500/20' :
              'bg-slate-700 text-slate-200 rounded-bl-md'
            }`}>
              {msg.message}
            </div>
          )}
          {isAdmin && !isEditing && (
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="absolute -right-10 top-0 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-700 transition-opacity"
              title="Message options"
            >
              <MoreVertical className="w-4 h-4 text-slate-400" />
            </button>
          )}
          {showMenu && isAdmin && (
            <div className="absolute right-0 top-6 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10 overflow-hidden min-w-[100px]">
              {isOwn && (
                <button
                  onClick={() => { setIsEditing(true); setShowMenu(false); }}
                  className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-700 w-full"
                >
                  <Edit2 className="w-3 h-3" /> Edit
                </button>
              )}
              <button
                onClick={() => { 
                  if (confirm('Delete this message?')) {
                    onDelete(msg.id)
                  }
                  setShowMenu(false); 
                }}
                className="flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 w-full"
              >
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 text-[9px] text-slate-600 px-0.5">
          <span>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {msg.is_read && isOwn && <CheckCheck className="w-3 h-3 text-emerald-500" />}
        </div>
      </div>
    </div>
  )
}

function UserInfoSidebar({ ticket, onPriorityChange, onAssign }) {
  const { data: ctx } = useQuery({
    queryKey: ['user-context', ticket?.user_id],
    queryFn: () => ticket?.user_id ? getUserContext(ticket.user_id) : getUserContext(null, { username: ticket?.user_name, email: '', balance: 0 }),
    enabled: !!ticket,
  })

  const priorities = ['low', 'medium', 'high', 'urgent']

  return (
    <div className="w-72 flex-shrink-0 bg-slate-900/50 border border-slate-700/50 rounded-2xl overflow-hidden">
      <div className="px-4 py-3 bg-slate-900/80 border-b border-slate-700/50">
        <h3 className="text-xs font-semibold text-white uppercase tracking-wider">User Info</h3>
      </div>
      <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: '520px' }}>
        {ctx ? (
          <>
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-bold text-xl mx-auto">
                {ctx.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <p className="text-sm font-medium text-white mt-2">{ctx.username}</p>
              <p className="text-xs text-slate-500">{ctx.email || 'No email'}</p>
            </div>

            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
              <p className="text-[10px] text-emerald-400 uppercase tracking-wider">Balance</p>
              <p className="text-xl font-bold text-white mt-1">₨{ctx.balance?.toFixed(2) || '0.00'}</p>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">Priority</p>
              <div className="flex flex-wrap gap-1">
                {priorities.map(p => (
                  <button
                    key={p}
                    onClick={() => onPriorityChange(p)}
                    className={`px-2 py-1 rounded-lg text-[10px] font-medium capitalize border ${
                      ticket?.priority === p ? PRIORITY_COLORS[p] : 'bg-slate-800 text-slate-500 border-slate-700'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              {[
                ['Account Age', `${ctx.accountAge} days`],
                ['Recent Tx', ctx.recentTx.toString()],
                ['Bonuses', `${ctx.recentBonuses} received`],
                ['Referral Earned', `₨${ctx.referralEarnings?.toFixed(2) || '0.00'}`],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between py-1.5 border-b border-slate-800 last:border-0">
                  <span className="text-[10px] text-slate-500">{label}</span>
                  <span className="text-xs font-medium text-white">{value}</span>
                </div>
              ))}
            </div>

            {ctx.recentTxList && ctx.recentTxList !== 'No recent transactions' && (
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">Recent Activity</p>
                <div className="bg-slate-800/60 rounded-lg p-2 space-y-1">
                  {ctx.recentTxList.split('; ').map((tx, i) => (
                    <p key={i} className="text-[10px] text-slate-400 leading-relaxed">{tx}</p>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-5 h-5 text-slate-500 animate-spin" />
          </div>
        )}
      </div>
    </div>
  )
}

function ChatPanel({ ticket, onBack }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [input, setInput] = useState('')
  const [aiTyping, setAiTyping] = useState(false)
  const [editingMsg, setEditingMsg] = useState(null)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['ticket-messages', ticket.id],
    queryFn: () => getMessages(ticket.id),
    refetchInterval: 3000,
    enabled: !!ticket,
  })

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (ticket) markMessagesRead(ticket.id)
  }, [ticket?.id])

  const sendMsg = useMutation({
    mutationFn: (msg) => sendMessage({
      ticketId: ticket.id,
      senderId: 'admin',
      senderName: 'Admin',
      senderRole: 'admin',
      message: msg,
      language: 'english',
    }),
    onSuccess: () => {
      setInput('')
      qc.invalidateQueries({ queryKey: ['ticket-messages', ticket.id] })
      qc.invalidateQueries({ queryKey: ['admin-support-tickets'] })
      inputRef.current?.focus()
    },
    onError: () => toast.error('Failed to send message'),
  })

  const editMsg = useMutation({
    mutationFn: ({ id, message }) => editMessage(id, message),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket-messages', ticket.id] })
      toast.success('Message edited')
      setEditingMsg(null)
    },
    onError: () => toast.error('Failed to edit message'),
  })

  const deleteMsg = useMutation({
    mutationFn: (id) => deleteMessage(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket-messages', ticket.id] })
      toast.success('Message deleted')
    },
    onError: () => toast.error('Failed to delete message'),
  })

  const aiReply = useMutation({
    mutationFn: async () => {
      setAiTyping(true)
      try {
        const reply = await getAiSupportReply(messages, 'english', null)
        await sendMessage({
          ticketId: ticket.id,
          senderId: null,
          senderName: '399bet AI',
          senderRole: 'ai',
          message: reply,
          language: 'english',
          isAi: true,
        })
        qc.invalidateQueries({ queryKey: ['ticket-messages', ticket.id] })
        qc.invalidateQueries({ queryKey: ['admin-support-tickets'] })
      } finally {
        setAiTyping(false)
      }
    },
    onError: () => toast.error('AI reply failed'),
  })

  const handleClose = useMutation({
    mutationFn: () => closeTicket(ticket.id),
    onSuccess: () => {
      toast.success('Ticket closed')
      qc.invalidateQueries({ queryKey: ['admin-support-tickets'] })
      onBack()
    },
    onError: () => toast.error('Failed to close ticket'),
  })

  const handleReopen = useMutation({
    mutationFn: () => reopenTicket(ticket.id),
    onSuccess: () => {
      toast.success('Ticket reopened')
      qc.invalidateQueries({ queryKey: ['admin-support-tickets'] })
    },
    onError: () => toast.error('Failed to reopen ticket'),
  })

  const handlePriorityChange = useMutation({
    mutationFn: (priority) => updateTicketPriority(ticket.id, priority),
    onSuccess: () => {
      toast.success('Priority updated')
      qc.invalidateQueries({ queryKey: ['admin-support-tickets'] })
    },
    onError: () => toast.error('Failed to update priority'),
  })

  const handleDelete = useMutation({
    mutationFn: () => deleteTicket(ticket.id),
    onSuccess: () => {
      toast.success('Ticket deleted')
      qc.invalidateQueries({ queryKey: ['admin-support-tickets'] })
      onBack()
    },
    onError: () => toast.error('Failed to delete ticket'),
  })

  if (!ticket) return null

  return (
    <div className="flex gap-4 h-[650px]">
      <div className="flex-1 flex flex-col bg-slate-900/50 border border-slate-700/50 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-900/80">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-white">{ticket.user_name || 'Guest'}</p>
                <span className="px-1.5 py-0.5 rounded bg-slate-700/50 text-[10px] text-slate-400 font-mono">
                  #{ticket.user_identifier || 'guest'}
                </span>
              </div>
              <p className="text-xs text-slate-500">{ticket.subject}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (confirm('Delete this ticket and all messages? This cannot be undone.')) {
                  handleDelete.mutate()
                }
              }}
              className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
              title="Delete ticket"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold capitalize ${STATUS_COLORS[ticket.status]}`}>
              {ticket.status}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => aiReply.mutate()}
              disabled={aiTyping || aiReply.isPending}
              className="text-purple-400 border-purple-500/30 hover:text-purple-300 hover:border-purple-400"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {aiTyping ? 'AI...' : 'AI Reply'}
            </Button>
            {ticket.status === 'closed' ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleReopen.mutate()}
                className="text-amber-400 hover:text-amber-300"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reopen
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleClose.mutate()}
                className="text-emerald-400 hover:text-emerald-300"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                Resolve
              </Button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw className="w-5 h-5 text-slate-500 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <MessageCircle className="w-12 h-12 mb-3 opacity-50" />
              <p className="text-sm">No messages yet</p>
            </div>
          ) : (
            <>
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  isOwn={msg.sender_role === 'admin'}
                  isAdmin={true}
                  onEdit={(id, text) => editMsg.mutate({ id, message: text })}
                  onDelete={(id) => deleteMsg.mutate(id)}
                />
              ))}
              {aiTyping && (
                <div className="flex gap-2">
                  <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-purple-300" />
                  </div>
                  <div className="px-3 py-2 rounded-2xl rounded-bl-md bg-purple-500/20 border border-purple-500/20">
                    <div className="flex gap-1">
                      {[0,1,2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {ticket.status !== 'closed' && (
          <div className="p-3 border-t border-slate-700/50">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && input.trim()) {
                    e.preventDefault()
                    sendMsg.mutate(input.trim())
                  }
                }}
                placeholder="Type a message... (Enter to send)"
                className="flex-1 bg-slate-800/80 border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20"
              />
              <Button
                onClick={() => input.trim() && sendMsg.mutate(input.trim())}
                disabled={sendMsg.isPending || !input.trim()}
                className="px-4"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <UserInfoSidebar
        ticket={ticket}
        onPriorityChange={(p) => handlePriorityChange.mutate(p)}
      />
    </div>
  )
}

export default function SupportSection() {
  const qc = useQueryClient()
  const toast = useToast()
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [supportIconEnabled, setSupportIconEnabled] = useState(true)

  const { data: settings } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: getPlatformSettings,
  })

  useEffect(() => {
    if (settings?.support_icon_enabled !== undefined) {
      setSupportIconEnabled(settings.support_icon_enabled !== false)
    }
  }, [settings])

  const toggleSupportIcon = useMutation({
    mutationFn: (val) => updatePlatformSettings({ support_icon_enabled: val }),
    onSuccess: (_, val) => {
      toast.success(val ? 'Floating chat icon enabled' : 'Floating chat icon disabled')
      qc.invalidateQueries({ queryKey: ['platform-settings'] })
    },
    onError: () => toast.error('Failed to update'),
  })

  const { data: tickets = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-support-tickets'],
    queryFn: getSupportTickets,
    refetchInterval: 5000,
  })

  const filtered = tickets.filter(t => {
    const matchSearch = !search ||
      t.subject?.toLowerCase().includes(search.toLowerCase()) ||
      t.user_name?.toLowerCase().includes(search.toLowerCase()) ||
      t.user_identifier?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || t.status === filter
    return matchSearch && matchFilter
  })

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === 'open').length,
    pending: tickets.filter(t => t.status === 'pending').length,
    resolved: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
  }

  if (selected) {
    return (
      <div className="space-y-4">
        <ChatPanel ticket={selected} onBack={() => setSelected(null)} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            Support Center
          </h2>
          <p className="text-slate-400 mt-1">Manage all user support requests</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              const newVal = !supportIconEnabled
              setSupportIconEnabled(newVal)
              toggleSupportIcon.mutate(newVal)
            }}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all ${
              supportIconEnabled ? 'bg-emerald-500/15 border-emerald-500/30' : 'bg-slate-800/50 border-slate-700/50'
            }`}
          >
            {supportIconEnabled
              ? <ToggleRight className="w-6 h-6 text-emerald-400" />
              : <ToggleLeft className="w-6 h-6 text-slate-500" />}
            <div>
              <p className={`text-xs font-medium ${supportIconEnabled ? 'text-white' : 'text-slate-300'}`}>
                Floating Chat {supportIconEnabled ? 'ON' : 'OFF'}
              </p>
              <p className="text-[10px] text-slate-500">
                {supportIconEnabled ? 'Visible on all pages' : 'Hidden from all pages'}
              </p>
            </div>
          </button>
          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: MessageCircle, color: 'text-white', bg: 'bg-slate-800/50' },
          { label: 'Open', value: stats.open, icon: AlertTriangle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Resolved', value: stats.resolved, icon: CheckCircle, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={`${bg} border border-slate-700/50 rounded-xl p-4`}>
            <div className="flex items-center gap-2">
              <Icon className={`w-4 h-4 ${color}`} />
              <p className="text-xs text-slate-400">{label}</p>
            </div>
            <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or ID..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/50 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>
        <div className="flex gap-1 bg-slate-900/80 border border-slate-800/50 rounded-xl p-1">
          {['all', 'open', 'pending', 'resolved', 'closed'].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                filter === s ? 'bg-emerald-500/15 text-emerald-400' : 'text-slate-400 hover:text-white'
              }`}>
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <div className="text-center py-12 text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading tickets...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500">No tickets found</p>
          </div>
        ) : filtered.map((ticket) => (
          <motion.div
            key={ticket.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => setSelected(ticket)}
            className={`flex items-center gap-4 p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl cursor-pointer hover:bg-slate-800/80 hover:border-slate-600/50 transition-all ${
              ticket.status === 'open' ? 'border-l-2 border-l-emerald-500' :
              ticket.status === 'pending' ? 'border-l-2 border-l-amber-500' : ''
            }`}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
              ticket.status === 'open' ? 'bg-emerald-500/20 text-emerald-400' :
              ticket.status === 'pending' ? 'bg-amber-500/20 text-amber-400' :
              'bg-slate-700/50 text-slate-400'
            }`}>
              {(ticket.user_name || 'U').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-medium text-white">{ticket.user_name || 'Guest'}</p>
                <span className="px-1.5 py-0.5 rounded bg-slate-700/50 text-[10px] text-slate-400 font-mono">
                  #{ticket.user_identifier || 'guest'}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${STATUS_COLORS[ticket.status]}`}>
                  {ticket.status}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize ${PRIORITY_COLORS[ticket.priority]}`}>
                  {ticket.priority}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate mt-0.5">{ticket.subject}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs text-slate-600">
                {new Date(ticket.created_at).toLocaleDateString()}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
