import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { toast } from 'react-hot-toast'
import {
  Palette, Eye, Save, Globe, Image, Layout,
  Tag, Gamepad2, FileText,
  Check, X, Plus, Trash2, ExternalLink, Loader2, Upload, Cloud
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
  },
  showJackpot: true,
  showCategories: true,
  showGameCards: true,
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

async function uploadImage(file) {
  const ext = file.name.split('.').pop()
  const path = `landing/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`
  const { data, error } = await supabase.storage.from('landing-images').upload(path, file, { cacheControl: '3600', upsert: true })
  if (error) throw error
  const { data: urlData } = supabase.storage.from('landing-images').getPublicUrl(data.path)
  return urlData.publicUrl
}

// ── Tab Config ───────────────────────────────────────────────
const TABS = [
  { id: 'header', label: 'Header', icon: Layout },
  { id: 'hero', label: 'Hero', icon: Image },
  { id: 'colors', label: 'Colors', icon: Palette },
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

// ── Image Upload Component ───────────────────────────────────
function ImageUpload({ value, onChange, label, accept = 'image/*' }) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  const handleFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large (max 5MB)')
      return
    }

    setUploading(true)
    setProgress(0)

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(p => Math.min(p + 15, 85))
    }, 200)

    try {
      const url = await uploadImage(file)
      clearInterval(progressInterval)
      setProgress(100)
      onChange(url)
      toast.success('Image uploaded')
    } catch (e) {
      clearInterval(progressInterval)
      toast.error(`Upload failed: ${e.message}`)
    } finally {
      setTimeout(() => {
        setUploading(false)
        setProgress(0)
      }, 500)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    handleFile(file)
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-slate-300">{label}</label>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all overflow-hidden ${
          dragOver ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-600 hover:border-emerald-500/50 bg-slate-800/40'
        }`}
      >
        {value ? (
          <div className="relative group">
            <img src={value} alt="" className="w-full h-40 object-cover" onError={e => e.target.src = ''} />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-sm font-medium flex items-center gap-1"><Upload className="w-4 h-4" /> Replace</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
            <Cloud className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm font-medium">Drop image here or click to upload</p>
            <p className="text-xs text-slate-500 mt-1">PNG, JPG, WebP up to 5MB</p>
          </div>
        )}

        {/* Progress Bar */}
        {uploading && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-700">
            <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>

      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={e => handleFile(e.target.files[0])} />

      {/* Manual URL Input */}
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate-500">or paste URL:</span>
        <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder="https://..."
          className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-lg px-2 py-1 text-xs text-white" />
      </div>
    </div>
  )
}

// ── Color Picker Component ───────────────────────────────────
function ColorPicker({ label, value, onChange }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-slate-300">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" value={value || '#000000'} onChange={e => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg cursor-pointer border-2 border-slate-600 hover:border-emerald-500 transition-colors" />
        <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder="#000000"
          className="flex-1 bg-slate-800/80 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-white font-mono" />
        <div className="w-10 h-10 rounded-lg border border-slate-700 shadow-inner" style={{ backgroundColor: value }} />
      </div>
    </div>
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
        <ColorPicker label="Header Background" value={data.headerBg || '#0f172a'} onChange={v => onChange('headerBg', v)} />
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">Search Placeholder</label>
          <input type="text" value={data.headerSearchPlaceholder || ''} onChange={e => onChange('headerSearchPlaceholder', e.target.value)} className="w-full bg-slate-800/80 border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm text-white" />
        </div>
        <ImageUpload label="Header Logo" value={data.headerLogoUrl || ''} onChange={v => onChange('headerLogoUrl', v)} />
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
        <ImageUpload label="Hero Banner Image" value={data.heroImage || ''} onChange={v => onChange('heroImage', v)} />
        <ImageUpload label="Site Logo" value={data.logoUrl || ''} onChange={v => onChange('logoUrl', v)} />
      </div>
    </div>
  )
}

function ColorsEditor({ data, onChange }) {
  const colorFields = [
    { key: 'primary', label: 'Primary (CTA, links, accents)' },
    { key: 'accent', label: 'Accent (gradients, secondary)' },
    { key: 'background', label: 'Background' },
    { key: 'text', label: 'Text' },
    { key: 'success', label: 'Success (green states)' },
    { key: 'warning', label: 'Warning (alerts, jackpot)' },
  ]

  return (
    <div className="space-y-5">
      <h3 className="text-lg font-bold text-white flex items-center gap-2">
        <Palette className="w-5 h-5 text-emerald-400" /> Color Theme
      </h3>
      <p className="text-xs text-slate-400">Colors are applied to the user landing page instantly after publish.</p>

      {/* Live Preview Strip */}
      <div className="flex gap-2 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
        {colorFields.map(({ key, label }) => (
          <div key={key} className="flex-1 text-center">
            <div className="w-full h-8 rounded-lg mb-1 border border-slate-600" style={{ backgroundColor: data.colors?.[key] || '#000' }} />
            <span className="text-[9px] text-slate-500 truncate block">{key}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {colorFields.map(({ key, label }) => (
          <ColorPicker
            key={key}
            label={label}
            value={data.colors?.[key] || '#000000'}
            onChange={v => onChange(`colors.${key}`, v)}
          />
        ))}
      </div>

      {/* Presets */}
      <div>
        <label className="block text-xs font-medium text-slate-300 mb-2">Quick Presets</label>
        <div className="flex gap-2 flex-wrap">
          {[
            { name: 'Emerald', primary: '#10b981', accent: '#6366f1' },
            { name: 'Blue', primary: '#3b82f6', accent: '#8b5cf6' },
            { name: 'Red', primary: '#ef4444', accent: '#f59e0b' },
            { name: 'Purple', primary: '#a855f7', accent: '#ec4899' },
            { name: 'Cyan', primary: '#06b6d4', accent: '#10b981' },
            { name: 'Orange', primary: '#f97316', accent: '#ef4444' },
          ].map(preset => (
            <button
              key={preset.name}
              onClick={() => {
                onChange('colors.primary', preset.primary)
                onChange('colors.accent', preset.accent)
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-700 hover:border-emerald-500 transition-colors"
            >
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: preset.primary }} />
              <div className="w-4 h-4 rounded-full -ml-2" style={{ backgroundColor: preset.accent }} />
              <span className="text-xs text-slate-300">{preset.name}</span>
            </button>
          ))}
        </div>
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

// ── Live Preview Component (Device Frame) ────────────────────
function LivePreview({ data }) {
  const colors = data.colors || DEFAULT_DATA.colors
  const primaryColor = colors.primary || '#10b981'
  const accentColor = colors.accent || '#6366f1'

  return (
    <div className="w-full h-full overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-950 shadow-2xl">
      {/* Device Frame */}
      <div className="bg-slate-800 px-3 py-1.5 flex items-center gap-2">
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500/60" />
          <div className="w-2 h-2 rounded-full bg-yellow-500/60" />
          <div className="w-2 h-2 rounded-full bg-green-500/60" />
        </div>
        <div className="flex-1 bg-slate-700/50 rounded px-2 py-0.5 text-[9px] text-slate-400 text-center">8769bet.com</div>
      </div>

      <div className="overflow-y-auto h-[calc(100%-32px)]" style={{ color: colors.text || '#f1f5f9' }}>
        {/* Header Preview */}
        <div className="p-2.5 flex items-center justify-between" style={{ backgroundColor: data.headerBg || '#0f172a' }}>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded flex items-center justify-center text-white text-[8px] font-bold" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}>8</div>
            <span className="text-[9px] font-bold text-white">8769bet</span>
          </div>
          <div className="flex items-center gap-1">
            {data.headerShowLogin !== false && <span className="text-[8px] px-1.5 py-0.5 border border-slate-600 rounded text-slate-400">Login</span>}
            {data.headerShowSignup !== false && <span className="text-[8px] px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: primaryColor }}>Sign Up</span>}
          </div>
        </div>

        {/* Hero Preview */}
        <div className="p-3 text-center" style={{ background: `linear-gradient(135deg, ${primaryColor}20, ${accentColor}15)` }}>
          {data.heroImage ? (
            <img src={data.heroImage} alt="" className="w-full h-16 object-cover rounded mb-1.5 opacity-80" />
          ) : (
            <div className="w-full h-16 rounded mb-1.5 flex items-center justify-center text-slate-500 text-[10px]" style={{ background: `linear-gradient(135deg, ${primaryColor}15, ${accentColor}10)` }}>
              Hero Image
            </div>
          )}
          <h2 className="text-[11px] font-bold text-white mb-0.5">{data.title || 'Title'}</h2>
          <p className="text-[8px] text-slate-400 mb-1.5">{data.subtitle || 'Subtitle'}</p>
          <span className="text-[8px] px-2 py-0.5 rounded text-white" style={{ backgroundColor: primaryColor }}>Play Now</span>
        </div>

        {/* Categories Preview */}
        {data.showCategories && data.categories?.length > 0 && (
          <div className="flex gap-1.5 p-2.5 overflow-x-auto">
            {data.categories.map(c => (
              <div key={c.id} className="flex-shrink-0 w-12 h-10 bg-slate-800/60 rounded flex flex-col items-center justify-center">
                <span className="text-xs">{c.icon}</span>
                <span className="text-[7px] text-slate-400 mt-0.5">{c.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Jackpot Preview */}
        {data.showJackpot && (
          <div className="mx-2.5 my-1.5 p-2 rounded" style={{ backgroundColor: (colors.warning || '#f59e0b') + '15' }}>
            <p className="text-[7px] text-amber-400 font-bold mb-1">💎 Progressive Jackpot</p>
            <div className="flex gap-1.5">
              {['Mini: 847', 'Minor: 12K', 'Major: 1.2L', 'Grand: 18L'].map(j => (
                <div key={j} className="flex-1 text-center bg-slate-800/60 rounded p-1">
                  <p className="text-[6px] text-slate-400">{j.split(':')[0]}</p>
                  <p className="text-[7px] text-amber-400 font-bold">{j.split(':')[1]}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Game Cards Preview */}
        {data.showGameCards && (
          <div className="grid grid-cols-3 gap-1.5 p-2.5">
            {['Aviator', 'Lucky Jet', 'Sweet Bonanza', 'Fortune Gems', 'Money Coming', 'Crazy777'].map(g => (
              <div key={g} className="bg-slate-800/60 rounded p-1.5 text-center">
                <div className="w-full h-10 bg-slate-700/50 rounded mb-0.5 flex items-center justify-center text-sm">🎮</div>
                <p className="text-[6px] text-slate-400 truncate">{g}</p>
                <button className="w-full mt-0.5 py-0.5 rounded text-white text-[6px] font-bold" style={{ backgroundColor: primaryColor }}>
                  PLAY
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Footer Preview */}
        <div className="p-1.5 text-center border-t border-slate-800">
          <p className="text-[6px] text-slate-500">{data.footerText || 'Footer text'}</p>
        </div>
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

  const { isLoading } = useQuery({
    queryKey: ['landing-draft'],
    queryFn: getDraft,
    onSuccess: (data) => {
      setDraft({ ...DEFAULT_DATA, ...data })
      setHasChanges(false)
    },
  })

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

  const handlePublish = async () => {
    setPublishing(true)
    try {
      await publishContent(draft)
      qc.invalidateQueries({ queryKey: ['landing-content'] })
      qc.invalidateQueries({ queryKey: ['landing-draft'] })
      toast.success('Published to live site!')
      setHasChanges(false)
    } catch (e) {
      toast.error(`Publish failed: ${e.message}`)
    } finally {
      setPublishing(false)
    }
  }

  const renderEditor = () => {
    switch (activeTab) {
      case 'header': return <HeaderEditor data={draft} onChange={onChange} />
      case 'hero': return <HeroEditor data={draft} onChange={onChange} />
      case 'colors': return <ColorsEditor data={draft} onChange={onChange} />
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
