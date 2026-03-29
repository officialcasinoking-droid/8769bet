import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { toast } from 'react-hot-toast'
import {
  Palette, Eye, Save, Upload, Globe, Image, Type, Layout,
  Megaphone, Tag, Gamepad2, Trophy, FileText, ChevronRight,
  Check, X, Plus, Trash2, RefreshCw, ExternalLink, Pencil, Loader2
} from 'lucide-react'

// ── Default Landing Data ─────────────────────────────────────
const DEFAULT_DATA = {
  title: 'Welcome to 8769bet',
  subtitle: 'Best AI-powered bets with AI Agent',
  heroImage: '',
  logoUrl: '',
  colors: {
    primary: '#10b981',
    accent: '#6366f1',
    background: '#0f172a',
    text: '#f1f5f9',
    success: '#22c55e',
    warning: '#f59e0b',
    jackpot: '#f59e0b',
  },
  showAnnouncements: true,
  showJackpot: true,
  showCategories: true,
  showGameCards: true,
  announcements: [
    { id: '1', text: 'New users get 100% bonus on first deposit!', expiry: '2026-12-31' },
    { id: '2', text: 'AI Agent accuracy is now 94%!', expiry: '2026-12-31' },
  ],
  categories: [
    { id: '1', name: 'Slots', icon: '🤑' },
    { id: '2', name: 'Crash', icon: '🚀' },
    { id: '3', name: 'Live', icon: '♠️' },
    { id: '4', name: 'AI Pick', icon: '🤖' },
  ],
  footerText: '© 2026 8769bet. All rights reserved.',
  headerBg: '#0f172a',
  headerLogoUrl: '',
  headerSearchPlaceholder: 'Search games...',
  headerShowLogin: true,
  headerShowSignup: true,
}

// ── API ──────────────────────────────────────────────────────
async function getDraft() {
  const { data } = await supabase.from('landing_content').select('draft_json').eq('id', 'main').single()
  return data?.draft_json || DEFAULT_DATA
}

async function getLive() {
  const { data } = await supabase.from('landing_content').select('live_json').eq('id', 'main').single()
  return data?.live_json || DEFAULT_DATA
}

async function saveDraft(draft) {
  const { error } = await supabase.from('landing_content').update({ draft_json: draft, updated_at: new Date().toISOString() }).eq('id', 'main')
  if (error) throw error
}

async function publishContent(content) {
  const { error } = await supabase.from('landing_content').update({ live_json: content, draft_json: content, updated_at: new Date().toISOString() }).eq('id', 'main')
  if (error) throw error
}

// ── Tab Config ───────────────────────────────────────────────
const TABS = [
  { id: 'header', label: 'Header', icon: Layout },
  { id: 'hero', label: 'Hero', icon: Image },
  { id: 'colors', label: 'Colors', icon: Palette },
  { id: 'announcements', label: 'Announcements', icon: Megaphone },
  { id: 'categories', label: 'Categories', icon: Tag },
  { id: 'settings', label: 'Display', icon: Gamepad2 },
  { id: 'footer', label: 'Footer', icon: FileText },
]

// ── Toggle Component ─────────────────────────────────────────
function Toggle({ checked, onChange, label }) {
  return (
    <button onClick={() => onChange(!checked)} className="flex items-center gap-3 w-full text-left">
      <div className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-emerald-500' : 'bg-slate-700'}`}>
        <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </div>
      <span className={`text-sm ${checked ? 'text-white' : 'text-slate-400'}`}>{label}</span>
    </button>
  )
}

// ── Section Editors ──────────────────────────────────────────
function HeaderEditor({ data, onChange }) {
  return (
    <div className="space-y-5">
      <h3 className="text-lg font-bold text-white flex items-center gap-2">
        <Layout className="w-5 h-5 text-emerald-400" /> Header Settings
      </h3>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">Header Background Color</label>
          <div className="flex items-center gap-3">
            <input type="color" value={data.headerBg || '#0f172a'} onChange={e => onChange('headerBg', e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer border border-slate-700" />
            <input type="text" value={data.headerBg || '#0f172a'} onChange={e => onChange('headerBg', e.target.value)} className="flex-1 bg-slate-800/80 border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm text-white" />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">Search Placeholder</label>
          <input type="text" value={data.headerSearchPlaceholder || ''} onChange={e => onChange('headerSearchPlaceholder', e.target.value)} className="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm text-white" placeholder="Search games..." />
        </div>
        <Toggle checked={data.headerShowLogin !== false} onChange={v => onChange('headerShowLogin', v)} label="Show Login Button" />
        <Toggle checked={data.headerShowSignup !== false} onChange={v => onChange('headerShowSignup', v)} label="Show Signup Button" />
      </div>
    </div>
  )
}

function HeroEditor({ data, onChange }) {
  return (
    <div className="space-y-5">
      <h3 className="text-lg font-bold text-white flex items-center gap-2">
        <Image className="w-5 h-5 text-emerald-400" /> Hero Section
      </h3>
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">Title</label>
          <input type="text" value={data.title || ''} onChange={e => onChange('title', e.target.value)} className="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm text-white" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">Subtitle</label>
          <input type="text" value={data.subtitle || ''} onChange={e => onChange('subtitle', e.target.value)} className="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm text-white" />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">Hero Image URL</label>
          <input type="text" value={data.heroImage || ''} onChange={e => onChange('heroImage', e.target.value)} className="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm text-white" placeholder="https://..." />
          {data.heroImage && <img src={data.heroImage} alt="preview" className="mt-2 w-full h-32 object-cover rounded-xl border border-slate-700" />}
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">Logo URL</label>
          <input type="text" value={data.logoUrl || ''} onChange={e => onChange('logoUrl', e.target.value)} className="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm text-white" placeholder="https://..." />
        </div>
      </div>
    </div>
  )
}

function ColorsEditor({ data, onChange }) {
  const colorFields = [
    { key: 'primary', label: 'Primary' },
    { key: 'accent', label: 'Accent' },
    { key: 'background', label: 'Background' },
    { key: 'text', label: 'Text' },
    { key: 'success', label: 'Success' },
    { key: 'warning', label: 'Warning' },
    { key: 'jackpot', label: 'Jackpot' },
  ]

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-bold text-white flex items-center gap-2">
        <Palette className="w-5 h-5 text-emerald-400" /> Color Theme
      </h3>
      <div className="grid grid-cols-2 gap-4">
        {colorFields.map(({ key, label }) => (
          <div key={key}>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">{label}</label>
            <div className="flex items-center gap-2">
              <input type="color" value={data.colors?.[key] || '#000000'} onChange={e => onChange(`colors.${key}`, e.target.value)} className="w-8 h-8 rounded cursor-pointer border border-slate-700" />
              <input type="text" value={data.colors?.[key] || ''} onChange={e => onChange(`colors.${key}`, e.target.value)} className="flex-1 bg-slate-800/80 border border-slate-700/50 rounded-lg px-2 py-1.5 text-xs text-white" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AnnouncementsEditor({ data, onChange }) {
  const addAnnouncement = () => {
    const items = [...(data.announcements || [])]
    items.push({ id: Date.now().toString(), text: 'New announcement', expiry: '2026-12-31' })
    onChange('announcements', items)
  }

  const updateItem = (id, field, value) => {
    const items = (data.announcements || []).map(a => a.id === id ? { ...a, [field]: value } : a)
    onChange('announcements', items)
  }

  const removeItem = (id) => {
    onChange('announcements', (data.announcements || []).filter(a => a.id !== id))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Megaphone className="w-5 h-5 text-emerald-400" /> Announcements
        </h3>
        <button onClick={addAnnouncement} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/15 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/25 transition-colors">
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>
      <div className="space-y-3">
        {(data.announcements || []).map((item) => (
          <div key={item.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Announcement #{item.id}</span>
              <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-300">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <input type="text" value={item.text} onChange={e => updateItem(item.id, 'text', e.target.value)} className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-white" placeholder="Announcement text..." />
            <input type="date" value={item.expiry || ''} onChange={e => updateItem(item.id, 'expiry', e.target.value)} className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-white" />
          </div>
        ))}
      </div>
    </div>
  )
}

function CategoriesEditor({ data, onChange }) {
  const addCategory = () => {
    const items = [...(data.categories || [])]
    items.push({ id: Date.now().toString(), name: 'New Category', icon: '🎮' })
    onChange('categories', items)
  }

  const updateItem = (id, field, value) => {
    const items = (data.categories || []).map(c => c.id === id ? { ...c, [field]: value } : c)
    onChange('categories', items)
  }

  const removeItem = (id) => {
    onChange('categories', (data.categories || []).filter(c => c.id !== id))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Tag className="w-5 h-5 text-emerald-400" /> Game Categories
        </h3>
        <button onClick={addCategory} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/15 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/25 transition-colors">
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>
      <div className="space-y-3">
        {(data.categories || []).map((cat) => (
          <div key={cat.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 flex items-center gap-3">
            <input type="text" value={cat.icon} onChange={e => updateItem(cat.id, 'icon', e.target.value)} className="w-12 h-12 bg-slate-700/50 border border-slate-600/50 rounded-lg text-center text-xl" />
            <input type="text" value={cat.name} onChange={e => updateItem(cat.id, 'name', e.target.value)} className="flex-1 bg-slate-700/50 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-white" />
            <button onClick={() => removeItem(cat.id)} className="text-red-400 hover:text-red-300 p-2">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function DisplaySettingsEditor({ data, onChange }) {
  return (
    <div className="space-y-5">
      <h3 className="text-lg font-bold text-white flex items-center gap-2">
        <Gamepad2 className="w-5 h-5 text-emerald-400" /> Display Settings
      </h3>
      <div className="space-y-3 bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
        <Toggle checked={data.showAnnouncements !== false} onChange={v => onChange('showAnnouncements', v)} label="Show Announcements Banner" />
        <Toggle checked={data.showJackpot !== false} onChange={v => onChange('showJackpot', v)} label="Show Jackpot Ticker" />
        <Toggle checked={data.showCategories !== false} onChange={v => onChange('showCategories', v)} label="Show Game Categories" />
        <Toggle checked={data.showGameCards !== false} onChange={v => onChange('showGameCards', v)} label="Show Game Cards" />
      </div>
    </div>
  )
}

function FooterEditor({ data, onChange }) {
  return (
    <div className="space-y-5">
      <h3 className="text-lg font-bold text-white flex items-center gap-2">
        <FileText className="w-5 h-5 text-emerald-400" /> Footer
      </h3>
      <div>
        <label className="block text-xs font-medium text-slate-300 mb-1.5">Footer Text</label>
        <textarea value={data.footerText || ''} onChange={e => onChange('footerText', e.target.value)} rows={3} className="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm text-white resize-none" />
      </div>
    </div>
  )
}

// ── Live Preview Component ───────────────────────────────────
function LivePreview({ data }) {
  const colors = data.colors || DEFAULT_DATA.colors

  return (
    <div className="w-full h-full overflow-y-auto rounded-xl border border-slate-700/50 bg-slate-950" style={{ color: colors.text }}>
      {/* Header Preview */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between" style={{ backgroundColor: data.headerBg || '#0f172a' }}>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white text-[10px] font-bold">8</div>
          <span className="text-xs font-bold text-white">8769bet</span>
        </div>
        <div className="flex items-center gap-1.5">
          {data.headerShowLogin !== false && <span className="text-[9px] px-2 py-0.5 border border-slate-600 rounded text-slate-400">Login</span>}
          {data.headerShowSignup !== false && <span className="text-[9px] px-2 py-0.5 rounded text-white" style={{ backgroundColor: colors.primary }}>Sign Up</span>}
        </div>
      </div>

      {/* Hero Preview */}
      <div className="p-4 text-center" style={{ background: `linear-gradient(135deg, ${colors.primary}15, ${colors.accent}10)` }}>
        {data.heroImage && <img src={data.heroImage} alt="" className="w-full h-20 object-cover rounded-lg mb-2 opacity-50" />}
        <h2 className="text-sm font-bold text-white mb-1">{data.title || 'Title'}</h2>
        <p className="text-[10px] text-slate-400 mb-2">{data.subtitle || 'Subtitle'}</p>
        <span className="text-[9px] px-3 py-1 rounded text-white" style={{ backgroundColor: colors.primary }}>Play Now</span>
      </div>

      {/* Announcements Preview */}
      {data.showAnnouncements && data.announcements?.length > 0 && (
        <div className="px-3 py-2" style={{ backgroundColor: colors.warning + '15' }}>
          {data.announcements.slice(0, 2).map(a => (
            <p key={a.id} className="text-[9px] text-amber-400 truncate">📢 {a.text}</p>
          ))}
        </div>
      )}

      {/* Categories Preview */}
      {data.showCategories && data.categories?.length > 0 && (
        <div className="flex gap-2 p-3 overflow-x-auto">
          {data.categories.map(c => (
            <div key={c.id} className="flex-shrink-0 w-14 h-12 bg-slate-800/60 rounded-lg flex flex-col items-center justify-center">
              <span className="text-sm">{c.icon}</span>
              <span className="text-[8px] text-slate-400 mt-0.5">{c.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Jackpot Preview */}
      {data.showJackpot && (
        <div className="mx-3 my-2 p-3 rounded-lg" style={{ backgroundColor: colors.jackpot + '15' }}>
          <p className="text-[9px] text-amber-400 font-bold mb-1">💎 Progressive Jackpot</p>
          <div className="flex gap-2">
            {['Mini: ₹847', 'Minor: ₹12K', 'Major: ₹1.2L', 'Grand: ₹18L'].map(j => (
              <div key={j} className="flex-1 text-center bg-slate-800/60 rounded p-1">
                <p className="text-[8px] text-slate-400">{j.split(':')[0]}</p>
                <p className="text-[9px] text-amber-400 font-bold">{j.split(':')[1]}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Game Cards Preview */}
      {data.showGameCards && (
        <div className="grid grid-cols-3 gap-2 p-3">
          {['Aviator', 'Lucky Jet', 'Sweet Bonanza', 'Fortune Gems', 'Money Coming', 'Crazy777'].map(g => (
            <div key={g} className="bg-slate-800/60 rounded-lg p-2 text-center">
              <div className="w-full h-12 bg-slate-700/50 rounded mb-1 flex items-center justify-center text-lg">🎮</div>
              <p className="text-[8px] text-slate-400 truncate">{g}</p>
            </div>
          ))}
        </div>
      )}

      {/* Footer Preview */}
      <div className="p-2 text-center border-t border-slate-800">
        <p className="text-[8px] text-slate-500">{data.footerText || 'Footer text'}</p>
      </div>
    </div>
  )
}

// ── Main Component ───────────────────────────────────────────
export default function LandingPageEditor() {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('header')
  const [draft, setDraft] = useState(DEFAULT_DATA)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)

  // Load draft on mount
  const { isLoading } = useQuery({
    queryKey: ['landing-draft'],
    queryFn: getDraft,
    onSuccess: (data) => {
      setDraft({ ...DEFAULT_DATA, ...data })
      setHasChanges(false)
    },
  })

  // Update nested field
  const onChange = useCallback((path, value) => {
    setDraft(prev => {
      const newData = { ...prev }
      if (path.includes('.')) {
        const [parent, child] = path.split('.')
        newData[parent] = { ...newData[parent], [child]: value }
      } else {
        newData[path] = value
      }
      return newData
    })
    setHasChanges(true)
  }, [])

  // Save draft
  const handleSave = async () => {
    setSaving(true)
    try {
      await saveDraft(draft)
      toast.success('Draft saved')
      setHasChanges(false)
    } catch (e) {
      toast.error(`Save failed: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  // Publish to live
  const handlePublish = async () => {
    setPublishing(true)
    try {
      await publishContent(draft)
      toast.success('Published to live site!')
      setHasChanges(false)
    } catch (e) {
      toast.error(`Publish failed: ${e.message}`)
    } finally {
      setPublishing(false)
    }
  }

  // Tab editor component
  const renderEditor = () => {
    switch (activeTab) {
      case 'header': return <HeaderEditor data={draft} onChange={onChange} />
      case 'hero': return <HeroEditor data={draft} onChange={onChange} />
      case 'colors': return <ColorsEditor data={draft} onChange={onChange} />
      case 'announcements': return <AnnouncementsEditor data={draft} onChange={onChange} />
      case 'categories': return <CategoriesEditor data={draft} onChange={onChange} />
      case 'settings': return <DisplaySettingsEditor data={draft} onChange={onChange} />
      case 'footer': return <FooterEditor data={draft} onChange={onChange} />
      default: return null
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Layout className="w-6 h-6 text-emerald-400" />
            Landing Page Editor
          </h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {hasChanges ? '• Unsaved changes' : 'All changes saved'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSave} disabled={saving || !hasChanges} className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Draft
          </button>
          <button onClick={handlePublish} disabled={publishing} className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors shadow-lg shadow-emerald-500/20 disabled:opacity-50">
            {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
            Publish Live
          </button>
        </div>
      </div>

      {/* Split Pane: Editor + Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Editor */}
        <div className="space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-slate-800/60 rounded-xl border border-slate-700/50 overflow-x-auto">
            {TABS.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                    isActive ? 'bg-emerald-500/15 text-emerald-400' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Editor Content */}
          <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/50 rounded-2xl p-5 min-h-[500px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
              >
                {renderEditor()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Right: Live Preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Eye className="w-4 h-4" />
              <span>Live Preview</span>
            </div>
            <a href="https://8769bet.com" target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300">
              View live site <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="h-[600px] sticky top-20">
            <LivePreview data={draft} />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
