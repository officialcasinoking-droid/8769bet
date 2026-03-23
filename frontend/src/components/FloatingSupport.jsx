import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send, Bot, Loader2, User, Bell, BellOff, Minus, RefreshCw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { getUserContext, sendMessage, createChatTicket, getAiSupportReply } from '../api/referrals'
import { useToast } from './ui/Toast'

function generateId() { return Date.now().toString(36) + Math.random().toString(36).substring(2) }

function ChatBubble({ msg, isOwn }) {
  const isAi = msg.sender_role === 'ai'
  const isSystem = msg.is_system || msg.sender_role === 'system'
  return (
    <div className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] ${
        isSystem ? 'bg-amber-500/30 text-amber-300' :
        isAi ? 'bg-purple-500/30 text-purple-300' :
        isOwn ? 'bg-emerald-500/30 text-emerald-300' :
        'bg-slate-600 text-slate-300'
      }`}>
        {isSystem ? '📢' : isAi ? <Bot className="w-3 h-3" /> : isOwn ? 'A' : <User className="w-3 h-3" />}
      </div>
      <div className={`max-w-[200px] flex flex-col gap-0.5 ${isOwn ? 'items-end' : 'items-start'}`}>
        <div className={`px-2.5 py-1.5 rounded-2xl text-xs leading-relaxed ${
          isOwn ? 'bg-emerald-500 text-white rounded-br-md' :
          isSystem ? 'bg-amber-500/20 text-amber-200 rounded-bl-md border border-amber-500/20' :
          isAi ? 'bg-purple-500/20 text-slate-200 rounded-bl-md border border-purple-500/20' :
          'bg-slate-700 text-slate-200 rounded-bl-md'
        }`}>
          {msg.message}
        </div>
        <span className="text-[9px] text-slate-600 px-0.5">
          {new Date(msg.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  )
}

export function FloatingSupport({ onClick }) {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [recentNotifications, setRecentNotifications] = useState([])
  
  useEffect(() => {
    if (!user?.id) return
    
    const fetchNotifications = async () => {
      // Get unread messages count from support tickets
      const { data: tickets } = await supabase
        .from('support_tickets')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'open')
      
      if (tickets && tickets.length > 0) {
        const ticketIds = tickets.map(t => t.id)
        const { data: messages } = await supabase
          .from('support_messages')
          .select('id, is_read, sender_role, is_system')
          .in('ticket_id', ticketIds)
          .neq('sender_role', 'user')
        
        if (messages) {
          const unread = messages.filter(m => !m.is_read && m.sender_role !== 'user').length
          setUnreadCount(Math.min(unread, 5)) // Cap at 5 for display
          
          // Get recent system notifications for quick access
          const systemMsgs = messages
            .filter(m => m.is_system)
            .slice(-3)
          setRecentNotifications(systemMsgs)
        }
      }
      
      // Also check for withdrawal request updates
      const { data: withdrawals } = await supabase
        .from('withdrawals')
        .select('status, rejection_reason, processed_at')
        .eq('user_id', user.id)
        .neq('status', 'pending')
        .order('processed_at', { ascending: false })
        .limit(3)

      if (withdrawals && withdrawals.length > 0) {
        const pendingNotifications = withdrawals.filter(w => !w.rejection_reason).length
        setUnreadCount(prev => Math.min(prev + pendingNotifications, 5))
      }
    }
    
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 10000)
    return () => clearInterval(interval)
  }, [user?.id])

  return (
    <motion.button
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      onClick={onClick}
      className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 shadow-lg shadow-emerald-500/30 flex items-center justify-center hover:shadow-emerald-500/50 transition-shadow"
    >
      <MessageCircle className="w-6 h-6 text-white" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-slate-950">
          {unreadCount}
        </span>
      )}
    </motion.button>
  )
}

export function SupportChatWidget({ open, onClose, onMinimize }) {
  const { user } = useAuth()
  const toast = useToast()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [aiTyping, setAiTyping] = useState(false)
  const [userContext, setUserContext] = useState(null)
  const [ticketId, setTicketId] = useState(null)
  const [receiveAdminReplies, setReceiveAdminReplies] = useState(true)
  const [loadingPrefs, setLoadingPrefs] = useState(false)
  const [greeted, setGreeted] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const realtimeRef = useRef(null)
  const widgetRef = useRef(null)

  useEffect(() => {
    if (open) setGreeted(false)
  }, [open])

  const loadExistingMessages = async () => {
    if (!user?.id) return
    setLoadingMessages(true)
    try {
      // Get user's support tickets
      const { data: tickets } = await supabase
        .from('support_tickets')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'open')
        .limit(1)
      
      if (tickets && tickets.length > 0) {
        const ticket = tickets[0]
        setTicketId(ticket.id)
        
        // Load messages from this ticket
        const { data: msgs } = await supabase
          .from('support_messages')
          .select('*')
          .eq('ticket_id', ticket.id)
          .order('created_at', { ascending: true })
        
        if (msgs && msgs.length > 0) {
          setMessages(msgs)
          
          // Mark messages as read
          const unreadIds = msgs
            .filter(m => !m.is_read && m.sender_role !== 'user')
            .map(m => m.id)
          
          if (unreadIds.length > 0) {
            await supabase
              .from('support_messages')
              .update({ is_read: true })
              .in('id', unreadIds)
          }
        }
      }
      
      // Also check withdrawal request updates and add them as messages
      const { data: withdrawals } = await supabase
        .from('withdrawals')
        .select('id, amount, status, admin_note, processed_at, created_at')
        .eq('user_id', user.id)
        .neq('status', 'pending')
        .order('processed_at', { ascending: false })
        .limit(5)
      
      if (withdrawals && withdrawals.length > 0) {
        const withdrawalMessages = withdrawals.map(w => ({
          id: `wd-${w.id}`,
          sender_role: 'system',
          sender_name: 'System',
          is_system: true,
          message: w.status === 'approved'
            ? `✅ Your withdrawal request for ₨${Number(w.amount).toLocaleString()} has been APPROVED.`
            : `❌ Your withdrawal request for ₨${Number(w.amount).toLocaleString()} has been REJECTED.${w.admin_note ? ` Reason: ${w.admin_note}` : ''}`,
          created_at: w.processed_at || w.created_at,
          is_read: true
        }))
        
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id))
          const newMsgs = withdrawalMessages.filter(m => !existingIds.has(m.id))
          return [...prev, ...newMsgs]
        })
      }
    } catch (err) {
      console.error('Error loading messages:', err)
    } finally {
      setLoadingMessages(false)
    }
  }

  useEffect(() => {
    if (open) {
      setMessages([])
      setInput('')
      setTicketId(null)
      if (user) {
        loadUserContext()
        loadAdminReplyPref()
        loadExistingMessages()
      }
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (widgetRef.current && !widgetRef.current.contains(e.target)) {
        onMinimize ? onMinimize() : onClose()
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open, onClose, onMinimize])

  useEffect(() => {
    if (user && ticketId && receiveAdminReplies) {
      realtimeRef.current = supabase
        .channel(`support-${ticketId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${ticketId}`,
        }, (payload) => {
          const newMsg = payload.new
          if (newMsg.sender_role !== 'user') {
            setMessages(prev => {
              if (prev.some(m => m.id === newMsg.id)) return prev
              return [...prev, newMsg]
            })
          }
        })
        .subscribe()
    }
    return () => {
      if (realtimeRef.current) {
        supabase.removeChannel(realtimeRef.current)
        realtimeRef.current = null
      }
    }
  }, [user, ticketId, receiveAdminReplies])

  const loadUserContext = async () => {
    if (!user?.id) return
    try {
      const ctx = await getUserContext(user.id, user)
      setUserContext(ctx)
    } catch {
      setUserContext(null)
    }
  }

  const loadAdminReplyPref = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('receive_admin_replies')
        .eq('id', user.id)
        .single()
      if (error) { setReceiveAdminReplies(true); return }
      if (data !== null && data.receive_admin_replies !== undefined) setReceiveAdminReplies(data.receive_admin_replies !== false)
    } catch {
      setReceiveAdminReplies(true)
    }
  }

  const toggleAdminReplies = async () => {
    if (!user) return
    setLoadingPrefs(true)
    const next = !receiveAdminReplies
    setReceiveAdminReplies(next)
    try {
      await supabase.from('users').update({ receive_admin_replies: next }).eq('id', user.id)
    } catch {
      setReceiveAdminReplies(!next)
    } finally {
      setLoadingPrefs(false)
    }
  }

  const addMsg = (msg) => setMessages(prev => [...prev, { id: generateId(), created_at: new Date().toISOString(), ...msg }])

  const greeting = user
    ? `Hello! I can see your account: ${user.username}, Balance: ₨${user.balance?.toFixed(2) || '0.00'}. How can I help you today?`
    : 'Hello! Welcome to 399bet Support. How can I help you today?'

  useEffect(() => {
    if (open && messages.length === 0 && !greeted) {
      addMsg({ sender_role: 'ai', sender_name: '399bet Support', message: greeting })
      setGreeted(true)
    } else if (open && messages.length > 0 && !greeted) {
      setGreeted(true)
    }
  }, [open])

  const handleSend = async () => {
    if (!input.trim() || sending) return
    const text = input.trim()
    setInput('')
    setSending(true)
    const senderName = user?.username || 'Guest'
    addMsg({ sender_role: 'user', sender_name: senderName, message: text })

    const history = [...messages, { sender_role: 'user', message: text }]

    let currentTicketId = ticketId
    if (!currentTicketId && user) {
      try {
        const ticket = await createChatTicket(user.id, senderName, 'User Chat', text, 'english')
        currentTicketId = ticket.id
        setTicketId(currentTicketId)
        console.log('[Support] Ticket created:', currentTicketId)
      } catch (err) {
        console.error('[Support] Failed to create ticket:', err)
        toast.error('Failed to create support ticket')
      }
    }

    if (currentTicketId) {
      try {
        await sendMessage({
          ticketId: currentTicketId,
          senderId: user?.id,
          senderName,
          senderRole: 'user',
          message: text,
          language: 'english',
        })
      } catch (err) {
        console.error('[Support] Failed to send message:', err)
      }
    }

    setAiTyping(true)
    try {
      const reply = await getAiSupportReply(history, 'english', userContext)
      addMsg({ sender_role: 'ai', sender_name: '399bet Support', message: reply })

      if (currentTicketId) {
        try {
          await sendMessage({
            ticketId: currentTicketId,
            senderId: null,
            senderName: '399bet AI',
            senderRole: 'ai',
            message: reply,
            language: 'english',
            isAi: true,
          })
        } catch (err) {
          console.error('[Support] Failed to save AI reply:', err)
        }
      }
    } catch (err) {
      console.error('[Support] AI reply error:', err)
      addMsg({
        sender_role: 'ai',
        sender_name: '399bet Support',
        message: "Sorry, I couldn't process that. Please try again.",
      })
    } finally {
      setSending(false)
      setAiTyping(false)
    }
  }

  const quickQuestions = [
    'How do I withdraw?',
    'Where is my bonus?',
    'How to deposit?',
    'What games are available?',
  ]

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed bottom-36 sm:bottom-24 right-4 sm:right-6 z-50" ref={widgetRef}>
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            style={{ width: '340px', maxHeight: '65vh' }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50 bg-slate-900/80">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">Live Support</p>
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse inline-block" />
                    Online
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={toggleAdminReplies}
                  disabled={loadingPrefs}
                  className={`p-1.5 rounded-lg transition-colors ${receiveAdminReplies ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-slate-500 hover:bg-slate-800'}`}
                  title={receiveAdminReplies ? 'Admin replies ON' : 'Admin replies OFF'}
                >
                  {receiveAdminReplies ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={onMinimize}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Minimize"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ maxHeight: '480px' }}>
              {loadingMessages ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-slate-500 animate-spin" />
                </div>
              ) : messages.map((msg) => (
                <ChatBubble key={msg.id} msg={msg} isOwn={msg.sender_role === 'admin'} />
              ))}
              {aiTyping && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-purple-500/30 flex items-center justify-center">
                    <Bot className="w-3 h-3 text-purple-300" />
                  </div>
                  <div className="px-2.5 py-1.5 rounded-2xl rounded-bl-md bg-purple-500/20 border border-purple-500/20">
                    <div className="flex gap-1">
                      {[0,1,2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />

              {messages.length <= 2 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[10px] text-slate-600 uppercase tracking-wider px-1">Quick Questions</p>
                  {quickQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setInput(q)
                        setTimeout(handleSend, 100)
                      }}
                      className="w-full text-left px-2.5 py-1.5 text-xs bg-slate-800/60 border border-slate-700/30 rounded-lg text-slate-300 hover:bg-slate-700/60 hover:text-white transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-2 border-t border-slate-700/50 bg-slate-900/80">
              <div className="flex gap-1.5">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && input.trim()) { e.preventDefault(); handleSend() } }}
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-800/80 border border-slate-700/50 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !input.trim()}
                  className="w-9 h-9 rounded-xl bg-emerald-500 hover:bg-emerald-400 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  {sending ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
