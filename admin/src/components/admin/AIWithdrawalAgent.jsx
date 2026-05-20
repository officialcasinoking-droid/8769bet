import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Bot, User, Loader2, Sparkles, CheckCircle, XCircle, RefreshCw, AlertTriangle } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'https://eight769bet-backend.onrender.com'

function getAuthToken() {
  return localStorage.getItem('admin_token')
}

function getAdminUser() {
  try {
    return JSON.parse(localStorage.getItem('admin_user') || '{}')
  } catch {
    return {}
  }
}

export default function AIWithdrawalAgent() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      role: 'assistant',
      content: '👋 Hello! I\'m your AI withdrawal management assistant. I can help you:\n\n• **Query withdrawals** - "show pending withdrawals"\n• **Approve withdrawals** - "approve withdrawal ID abc-123"\n• **Reject withdrawals** - "reject withdrawal ID abc-123 with reason \'suspicious\'"\n• **Get statistics** - "how many pending withdrawals today"\n• **User info** - "show withdrawal history for user X"\n\nHow can I help you today?',
      timestamp: new Date().toISOString(),
      action: null
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState(null)
  const [authError, setAuthError] = useState(false)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    fetchStats()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchStats = useCallback(async () => {
    const token = getAuthToken()
    if (!token) {
      setAuthError(true)
      return
    }
    try {
      const response = await fetch(`${API_URL}/api/admin/ai/withdrawal/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setStats(data)
        setAuthError(false)
      } else if (response.status === 401) {
        setAuthError(true)
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err)
    }
  }, [])

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const token = getAuthToken()
    if (!token) {
      setAuthError(true)
      return
    }

    const adminUser = getAdminUser()
    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)
    setAuthError(false)

    try {
      const response = await fetch(`${API_URL}/api/admin/ai/withdrawal/assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: input,
          adminId: adminUser?.id,
          adminUsername: adminUser?.username
        })
      })

      if (response.status === 401) {
        setAuthError(true)
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          role: 'assistant',
          content: '🔐 **Session expired.** Please log out and log back in to refresh your session, then try again.',
          timestamp: new Date().toISOString(),
          isError: true
        }])
        return
      }

      const data = await response.json()

      if (data.success) {
        const assistantMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: data.response,
          timestamp: new Date().toISOString(),
          action: data.action,
          execution: data.execution
        }
        setMessages(prev => [...prev, assistantMessage])
        
        if (data.execution?.executed) {
          fetchStats()
        }
      } else {
        const errorMsg = data.error || data.response || 'Sorry, I encountered an error. Please try again.'
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          role: 'assistant',
          content: `❌ ${errorMsg}`,
          timestamp: new Date().toISOString(),
          isError: true
        }])
      }
    } catch (err) {
      console.error('AI assistant error:', err)
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: `❌ Network error: ${err.message}`,
        timestamp: new Date().toISOString(),
        isError: true
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const quickActions = [
    { label: 'Show pending', command: 'Show all pending withdrawals' },
    { label: 'Today\'s stats', command: 'Show withdrawal statistics for today' },
    { label: 'Approve all <500', command: 'Approve all pending withdrawals under 500' },
    { label: 'High value', command: 'Show all pending withdrawals over 1000' },
  ]

  const formatContent = (content) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>')
  }

  if (authError) {
    return (
      <div className="flex flex-col h-full bg-gray-900 items-center justify-center p-8">
        <AlertTriangle className="w-16 h-16 text-amber-400 mb-4" />
        <h3 className="text-white text-lg font-semibold mb-2">Session Expired</h3>
        <p className="text-gray-400 text-sm text-center mb-4">
          Your admin session has expired. Please log out and log back in to use the AI assistant.
        </p>
        <button
          onClick={() => window.location.hash = '/login'}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Go to Login
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-semibold">AI Withdrawal Assistant</h2>
              <p className="text-xs text-gray-400">Powered by Groq AI</p>
            </div>
          </div>
          <button
            onClick={fetchStats}
            className="p-2 rounded-lg hover:bg-gray-700 transition-colors"
            title="Refresh stats"
          >
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Stats cards */}
        {stats && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="bg-gray-700/50 rounded-lg p-2 text-center">
              <p className="text-xs text-gray-400">Pending</p>
              <p className="text-lg font-bold text-amber-400">{stats.pending_count}</p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-2 text-center">
              <p className="text-xs text-gray-400">Total Pending</p>
              <p className="text-lg font-bold text-emerald-400">₨{stats.pending_total?.toLocaleString() || 0}</p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-2 text-center">
              <p className="text-xs text-gray-400">Today</p>
              <p className="text-lg font-bold text-blue-400">{stats.today_approved}✓ {stats.today_rejected}✗</p>
            </div>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="bg-gray-800/50 border-b border-gray-700 p-2">
        <div className="flex gap-2 overflow-x-auto">
          {quickActions.map((action, i) => (
            <button
              key={i}
              onClick={() => setInput(action.command)}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 text-xs rounded-full whitespace-nowrap transition-colors"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {/* Avatar */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === 'assistant' 
                ? 'bg-gradient-to-br from-purple-500 to-blue-500' 
                : 'bg-gray-600'
            }`}>
              {msg.role === 'assistant' ? (
                <Bot className="w-4 h-4 text-white" />
              ) : (
                <User className="w-4 h-4 text-white" />
              )}
            </div>

            {/* Message bubble */}
            <div className={`max-w-[80%] rounded-lg p-3 ${
              msg.role === 'assistant' 
                ? 'bg-gray-800 text-gray-200' 
                : 'bg-blue-600 text-white'
            } ${msg.isError ? 'border border-red-500' : ''}`}>
              <div 
                className="text-sm whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }}
              />
              
              {/* Action execution indicator */}
              {msg.execution?.executed && (
                <div className="mt-2 pt-2 border-t border-gray-700 flex items-center gap-2">
                  {msg.execution.action === 'approve' ? (
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-xs text-gray-400">
                    {msg.execution.action === 'approve' ? 'Approved' : 'Rejected'} {msg.execution.ids.length} withdrawal(s)
                  </span>
                </div>
              )}
              
              {/* Timestamp */}
              <p className="text-[10px] text-gray-500 mt-1">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-gray-800 rounded-lg p-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
              <span className="text-xs text-gray-400">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-gray-800 border-t border-gray-700 p-4">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me to manage withdrawals..."
            className="flex-1 bg-gray-700 text-white text-sm rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-gray-500 mt-2 text-center">
          AI can make mistakes. Always verify important actions.
        </p>
      </div>
    </div>
  )
}
