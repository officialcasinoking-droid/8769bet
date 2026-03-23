import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ChatBubbleLeftRightIcon, ChatBubbleLeftIcon, EyeIcon, EyeSlashIcon, CogIcon } from '@heroicons/react/24/outline'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'

export default function SupportPage() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState({
    chatEnabled: true,
    chatPosition: 'bottom-right',
    autoOpenChat: false,
    autoOpenDelay: 30,
    greeting: 'Hi! How can we help you today?',
    offlineMessage: 'We are currently offline. Please leave a message.',
    quickReplies: [
      { id: 1, trigger: 'deposit', response: 'To deposit, go to Wallet > Add Funds. We accept JazzCash, EasyPaisa, and Bank Transfer.' },
      { id: 2, trigger: 'withdraw', response: 'To withdraw, go to Wallet > Withdraw. Minimum withdrawal is Rs 500.' },
      { id: 3, trigger: 'bonus', response: 'We offer welcome bonus, referral bonus, and regular reload bonuses!' },
      { id: 4, trigger: 'aviator', response: 'Aviator is our crash game. Place your bet and cash out before the plane crashes!' },
    ]
  })

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const { data } = await supabase
        .from('platform_settings')
        .select('*')
        .eq('key', 'support_settings')
        .single()
      
      if (data?.value) {
        setSettings(prev => ({ ...prev, ...data.value }))
      }
    } catch (err) {
      console.error('Error loading settings:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await supabase
        .from('platform_settings')
        .upsert({
          key: 'support_settings',
          value: settings,
          updated_at: new Date().toISOString()
        })
      
      toast.success('Support settings saved!')
    } catch (err) {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const chatPositions = [
    { id: 'bottom-right', name: 'Bottom Right', desc: 'Classic position for chat icon' },
    { id: 'bottom-left', name: 'Bottom Left', desc: 'Alternative position' },
    { id: 'bottom-center', name: 'Bottom Center', desc: 'Centered at bottom' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Support Settings</h1>
          <p className="text-admin-muted">Configure chat widget and support options</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 font-medium"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-admin-card rounded-xl border border-admin-border p-6">
            <h2 className="text-lg font-semibold text-white mb-6">Chat Widget</h2>
            
            <div className="flex items-center justify-between p-4 bg-admin-sidebar rounded-xl border-2 border-primary-500/30">
              <div className="flex items-center gap-4">
                {settings.chatEnabled ? (
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                    <EyeIcon className="w-6 h-6 text-green-400" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                    <EyeSlashIcon className="w-6 h-6 text-red-400" />
                  </div>
                )}
                <div>
                  <p className="text-white font-medium text-lg">Show Floating Support Icon</p>
                  <p className="text-admin-muted text-sm">
                    {settings.chatEnabled ? 'Chat icon is visible on user side' : 'Chat icon is hidden from user side'}
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.chatEnabled}
                  onChange={(e) => setSettings({ ...settings, chatEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-14 h-8 bg-admin-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary-500"></div>
              </label>
            </div>

            {settings.chatEnabled && (
              <>
                <div className="mt-6">
                  <label className="block text-sm font-medium text-admin-text mb-3">Chat Icon Position</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {chatPositions.map(pos => (
                      <button
                        key={pos.id}
                        onClick={() => setSettings({ ...settings, chatPosition: pos.id })}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          settings.chatPosition === pos.id
                            ? 'border-primary-500 bg-primary-500/10'
                            : 'border-admin-border bg-admin-sidebar hover:border-admin-muted'
                        }`}
                      >
                        <p className="text-sm font-medium text-white">{pos.name}</p>
                        <p className="text-xs text-admin-muted">{pos.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between p-4 bg-admin-sidebar rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-admin-text">Auto Open Chat</p>
                    <p className="text-xs text-admin-muted">Automatically open chat after delay</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoOpenChat}
                      onChange={(e) => setSettings({ ...settings, autoOpenChat: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-admin-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                  </label>
                </div>

                {settings.autoOpenChat && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-admin-text mb-2">Auto Open Delay (seconds)</label>
                    <input
                      type="number"
                      value={settings.autoOpenDelay}
                      onChange={(e) => setSettings({ ...settings, autoOpenDelay: parseInt(e.target.value) || 30 })}
                      className="input-field max-w-xs"
                    />
                  </div>
                )}
              </>
            )}
          </div>

          <div className="bg-admin-card rounded-xl border border-admin-border p-6">
            <h2 className="text-lg font-semibold text-white mb-6">Messages</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-admin-text mb-2">Welcome Message</label>
                <textarea
                  value={settings.greeting}
                  onChange={(e) => setSettings({ ...settings, greeting: e.target.value })}
                  rows={3}
                  className="input-field w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-admin-text mb-2">Offline Message</label>
                <textarea
                  value={settings.offlineMessage}
                  onChange={(e) => setSettings({ ...settings, offlineMessage: e.target.value })}
                  rows={3}
                  className="input-field w-full"
                />
              </div>
            </div>
          </div>

          <div className="bg-admin-card rounded-xl border border-admin-border p-6">
            <h2 className="text-lg font-semibold text-white mb-6">Quick Replies</h2>
            <div className="space-y-3">
              {settings.quickReplies.map(reply => (
                <div key={reply.id} className="p-4 bg-admin-sidebar rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-primary-400 font-mono text-sm">/{reply.trigger}</span>
                    <button
                      onClick={() => setSettings({
                        ...settings,
                        quickReplies: settings.quickReplies.filter(r => r.id !== reply.id)
                      })}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                  <p className="text-sm text-admin-text">{reply.response}</p>
                </div>
              ))}
              <button
                onClick={() => setSettings({
                  ...settings,
                  quickReplies: [
                    ...settings.quickReplies,
                    { id: Date.now(), trigger: 'new', response: 'New quick reply response' }
                  ]
                })}
                className="w-full p-3 border-2 border-dashed border-admin-border rounded-lg text-admin-muted hover:border-primary-500 hover:text-primary-400 transition-colors"
              >
                + Add Quick Reply
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-admin-card rounded-xl border border-admin-border p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Preview</h3>
            <div className="relative h-72 bg-gradient-to-b from-admin-sidebar to-admin-card rounded-xl p-4">
              <div className={`absolute bottom-4 ${
                settings.chatPosition === 'bottom-left' ? 'left-4' : 
                settings.chatPosition === 'bottom-center' ? 'left-1/2 -translate-x-1/2' : 'right-4'
              }`}>
                {settings.chatEnabled ? (
                  <button className="w-14 h-14 bg-primary-500 rounded-full shadow-lg shadow-primary-500/30 flex items-center justify-center animate-pulse">
                    <ChatBubbleLeftRightIcon className="w-7 h-7 text-white" />
                  </button>
                ) : (
                  <div className="w-14 h-14 bg-gray-500/50 rounded-full flex items-center justify-center">
                    <EyeSlashIcon className="w-7 h-7 text-gray-400" />
                  </div>
                )}
              </div>
              
              {settings.chatEnabled && (
                <div className={`absolute bottom-24 ${settings.chatPosition === 'bottom-left' ? 'left-4' : settings.chatPosition === 'bottom-center' ? 'left-1/2 -translate-x-1/2' : 'right-4'} w-72 bg-admin-card rounded-xl shadow-xl border border-admin-border overflow-hidden`}>
                  <div className="bg-primary-500 p-3">
                    <p className="text-white font-medium">Support Chat</p>
                  </div>
                  <div className="p-4">
                    <div className="bg-admin-sidebar p-3 rounded-lg rounded-tl-none mb-3">
                      <p className="text-sm text-white">{settings.greeting}</p>
                    </div>
                    <input
                      type="text"
                      placeholder="Type a message..."
                      className="w-full bg-admin-sidebar text-white text-sm px-3 py-2 rounded-lg border border-admin-border"
                      disabled
                    />
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-admin-muted mt-3 text-center">
              {settings.chatEnabled ? 'Chat widget is VISIBLE to users' : 'Chat widget is HIDDEN from users'}
            </p>
          </div>

          <div className="bg-admin-card rounded-xl border border-admin-border p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Status</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-admin-sidebar rounded-lg">
                <span className="text-sm text-admin-text">Chat Enabled</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  settings.chatEnabled ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {settings.chatEnabled ? 'ON' : 'OFF'}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-admin-sidebar rounded-lg">
                <span className="text-sm text-admin-text">Position</span>
                <span className="text-sm text-admin-muted">{chatPositions.find(p => p.id === settings.chatPosition)?.name}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-admin-sidebar rounded-lg">
                <span className="text-sm text-admin-text">Quick Replies</span>
                <span className="text-sm text-admin-muted">{settings.quickReplies.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
