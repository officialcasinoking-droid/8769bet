import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { uploadImage } from '../../api/admin'
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogContent, DialogFooter } from '../../components/ui/Dialog'
import { Button, FormField, Input, Select, Textarea, Toggle, Badge } from '../../components/ui/FormElements'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Pencil, Trash2, Search, Download, Eye, EyeOff,
  Gamepad2, Filter, ChevronLeft, ChevronRight, X, Check,
  Upload, Loader2, AlertTriangle, Shield, Zap, BarChart3,
  Users, TrendingUp, Clock, Star, GripVertical, Image, FileText,
  Settings, Gauge, ExternalLink
} from 'lucide-react'

// ── Constants ────────────────────────────────────────────────
const CATEGORIES = ['Crash', 'Slots', 'Live', 'Fishing', 'Table', 'Lottery', 'Mines']
const PROVIDERS = ['Spribe', 'JILI', 'SmartSoft', '3 Oaks', 'WG', 'Pragmatic Play', 'Evolution', 'Other', 'Internal']
const RISK_LEVELS = ['Low', 'Medium', 'High']

// ── API Functions ────────────────────────────────────────────
async function getGames() {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .order('order_index', { ascending: true })
  if (error) throw error
  return data || []
}

async function createGame(game) {
  const { data, error } = await supabase
    .from('games')
    .insert(game)
    .select()
    .single()
  if (error) throw error
  return data
}

async function updateGame(id, updates) {
  const { data, error } = await supabase
    .from('games')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

async function deleteGameById(id) {
  const { error } = await supabase.from('games').delete().eq('id', id)
  if (error) throw error
}

async function uploadGameImage(file) {
  const ext = file.name.split('.').pop()
  const path = `games/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`

  try {
    await supabase.storage.createBucket('game-thumbnails', { public: true })
  } catch {}

  const { data, error } = await supabase.storage
    .from('game-thumbnails')
    .upload(path, file, { cacheControl: '3600', upsert: true })
  if (error) throw error

  const { data: urlData } = supabase.storage.from('game-thumbnails').getPublicUrl(data.path)
  return urlData.publicUrl
}

// ── Empty Form ───────────────────────────────────────────────
const EMPTY_FORM = {
  name: '',
  slug: '',
  provider: '',
  category: 'Crash',
  thumbnail_url: '',
  description: '',
  rtp: 97.00,
  min_bet: 10,
  max_bet: 10000,
  max_multiplier: '10000',
  ai_enabled: false,
  provably_fair: true,
  is_active: true,
  maintenance_mode: false,
  maintenance_reason: '',
  order_index: 0,
  risk_level: 'Medium',
}

// ── Image Upload Component ───────────────────────────────────
function GameImageUpload({ value, onChange, label }) {
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

    const progressInterval = setInterval(() => {
      setProgress(p => Math.min(p + 15, 85))
    }, 200)

    try {
      const url = await uploadGameImage(file)
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

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-slate-300">{label}</label>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
        onClick={() => inputRef.current?.click()}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all overflow-hidden ${
          dragOver ? 'border-emerald-500 bg-emerald-500/10' : 'border-slate-600 hover:border-emerald-500/50 bg-slate-800/40'
        }`}
      >
        {value ? (
          <div className="relative group">
            <img src={value} alt="" className="w-full h-32 object-cover" onError={e => e.target.src = ''} />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-sm font-medium flex items-center gap-1">
                <Upload className="w-4 h-4" /> Replace
              </span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400">
            <Image className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm font-medium">Drop image here or click to upload</p>
            <p className="text-xs text-slate-500 mt-1">PNG, JPG, WebP up to 5MB</p>
          </div>
        )}
        {uploading && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-700">
            <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files[0])} />
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-slate-500">or paste URL:</span>
        <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} placeholder="https://..."
          className="flex-1 bg-slate-800/50 border border-slate-700/50 rounded-lg px-2 py-1 text-xs text-white" />
      </div>
    </div>
  )
}

// ── Tabbed Game Modal ────────────────────────────────────────
function GameModal({ open, onClose, game, onSaved }) {
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState('basic')
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && game) {
      setForm({
        name: game.name || '',
        slug: game.slug || '',
        provider: game.provider || '',
        category: game.category || 'Crash',
        thumbnail_url: game.thumbnail_url || game.thumbnail || '',
        description: game.description || '',
        rtp: Number(game.rtp) || 97.00,
        min_bet: Number(game.min_bet) || 10,
        max_bet: Number(game.max_bet) || 10000,
        max_multiplier: String(game.max_multiplier || '10000'),
        ai_enabled: game.ai_enabled || false,
        provably_fair: game.provably_fair !== false,
        is_active: game.is_active !== false,
        maintenance_mode: game.maintenance_mode || false,
        maintenance_reason: game.maintenance_reason || '',
        order_index: Number(game.order_index) || 0,
        risk_level: game.risk_level || 'Medium',
      })
    } else if (open) {
      setForm(EMPTY_FORM)
    }
  }, [open, game])

  const set = (key, value) => setForm(f => ({ ...f, [key]: value }))

  const autoSlug = (name) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  }

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error('Game name is required')
    if (!form.slug.trim()) {
      set('slug', autoSlug(form.name))
    }

    setSaving(true)
    try {
      const payload = {
        ...form,
        rtp: Number(form.rtp),
        min_bet: Number(form.min_bet),
        max_bet: Number(form.max_bet),
        order_index: Number(form.order_index),
      }

      if (game) {
        await updateGame(game.id, payload)
        toast.success('Game updated')
      } else {
        await createGame(payload)
        toast.success('Game added')
      }

      qc.invalidateQueries({ queryKey: ['admin-games'] })
      onSaved?.()
      onClose()
    } catch (e) {
      toast.error(`Save failed: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  const TABS = [
    { id: 'basic', label: 'Basic Info', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'risk', label: 'Risk & Control', icon: Shield },
    { id: 'preview', label: 'Preview', icon: Eye },
  ]

  const renderTab = () => {
    switch (activeTab) {
      case 'basic':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Game Name *">
                <Input value={form.name} onChange={e => {
                  set('name', e.target.value)
                  if (!game && !form.slug) set('slug', autoSlug(e.target.value))
                }} placeholder="e.g. Aviator" />
              </FormField>
              <FormField label="Slug" hint="URL: /play/{slug}">
                <Input value={form.slug} onChange={e => set('slug', e.target.value)} placeholder="e.g. aviator" />
              </FormField>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Provider">
                <Select value={form.provider} onChange={e => set('provider', e.target.value)}>
                  <option value="">Select provider</option>
                  {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                </Select>
              </FormField>
              <FormField label="Category">
                <Select value={form.category} onChange={e => set('category', e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
              </FormField>
            </div>
            <GameImageUpload label="Thumbnail Image" value={form.thumbnail_url} onChange={v => set('thumbnail_url', v)} />
            <FormField label="Description">
              <Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="Game description..." />
            </FormField>
            <FormField label="Sort Order" hint="Lower numbers appear first">
              <Input type="number" value={form.order_index} onChange={e => set('order_index', e.target.value)} />
            </FormField>
          </div>
        )
      case 'settings':
        return (
          <div className="space-y-4">
            <FormField label={`RTP % (${form.rtp}%)`} hint="Return to Player percentage">
              <div className="flex items-center gap-3">
                <input type="range" min="85" max="99" step="0.1" value={form.rtp}
                  onChange={e => set('rtp', e.target.value)}
                  className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
                <Input type="number" min="85" max="99" step="0.1" value={form.rtp}
                  onChange={e => set('rtp', e.target.value)} className="w-20" />
              </div>
            </FormField>
            <div className="grid grid-cols-3 gap-4">
              <FormField label="Min Bet (₹)">
                <Input type="number" value={form.min_bet} onChange={e => set('min_bet', e.target.value)} />
              </FormField>
              <FormField label="Max Bet (₹)">
                <Input type="number" value={form.max_bet} onChange={e => set('max_bet', e.target.value)} />
              </FormField>
              <FormField label="Max Multiplier">
                <Input value={form.max_multiplier} onChange={e => set('max_multiplier', e.target.value)} placeholder="10000x" />
              </FormField>
            </div>
            <div className="space-y-3 pt-2">
              <Toggle checked={form.ai_enabled} onChange={v => set('ai_enabled', v)}
                label="AI Agent Support" description="Enable smart cashout suggestions for this game" />
              <Toggle checked={form.provably_fair} onChange={v => set('provably_fair', v)}
                label="Provably Fair" description="Enable provably fair verification" variant={form.provably_fair ? 'emerald' : 'orange'} />
            </div>
          </div>
        )
      case 'risk':
        return (
          <div className="space-y-4">
            <FormField label="Risk Level">
              <div className="flex gap-2">
                {RISK_LEVELS.map(level => {
                  const isActive = form.risk_level === level
                  const colors = { Low: 'emerald', Medium: 'amber', High: 'red' }
                  return (
                    <button key={level} onClick={() => set('risk_level', level)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                        isActive
                          ? colors[level] === 'emerald' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                          : colors[level] === 'amber' ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                          : 'bg-red-500/15 border-red-500/30 text-red-400'
                          : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600'
                      }`}>
                      {level}
                    </button>
                  )
                })}
              </div>
            </FormField>
            <div className="space-y-3 pt-2">
              <Toggle checked={form.is_active} onChange={v => set('is_active', v)}
                label={form.is_active ? 'Active - Visible to players' : 'Disabled - Hidden from players'}
                variant={form.is_active ? 'emerald' : 'red'} />
              <Toggle checked={form.maintenance_mode} onChange={v => set('maintenance_mode', v)}
                label="Maintenance Mode" description="Show maintenance message to players"
                variant={form.maintenance_mode ? 'orange' : 'emerald'} />
            </div>
            {form.maintenance_mode && (
              <FormField label="Maintenance Reason">
                <Input value={form.maintenance_reason} onChange={e => set('maintenance_reason', e.target.value)}
                  placeholder="e.g. Server upgrade in progress" />
              </FormField>
            )}
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-400">Risk Management</p>
                  <p className="text-xs text-slate-400 mt-1">
                    High risk games are monitored against the 20% drawdown limit. Emergency stop will instantly disable betting.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )
      case 'preview':
        return (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">Preview how this game card appears on the user landing page</p>
            <div className="bg-slate-950 rounded-xl p-4 border border-slate-800">
              <div className="w-40 mx-auto">
                <div className="bg-slate-800/60 rounded-xl overflow-hidden">
                  <div className="aspect-square bg-slate-700/50 flex items-center justify-center relative">
                    {form.thumbnail_url ? (
                      <img src={form.thumbnail_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl">🎮</span>
                    )}
                    {form.ai_enabled && (
                      <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-500 text-white">🤖 AI</span>
                    )}
                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-slate-800/80 text-emerald-400">
                      {form.max_multiplier}x
                    </div>
                  </div>
                  <div className="p-2">
                    <h3 className="text-xs font-semibold text-white truncate">{form.name || 'Game Name'}</h3>
                    <p className="text-[10px] text-slate-400">{form.provider || 'Provider'}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-emerald-400">{form.rtp}%</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        form.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                      }`}>
                        {form.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </div>
                    <button className="w-full mt-1.5 py-1 rounded bg-emerald-500 text-white text-[10px] font-bold">
                      {form.maintenance_mode ? 'MAINTENANCE' : 'PLAY'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <Dialog open={open} onClose={onClose} className="max-w-2xl">
      <DialogHeader onClose={onClose}>
        <DialogTitle>{game ? 'Edit Game' : 'Add New Game'}</DialogTitle>
        <DialogDescription>
          {game ? 'Update game configuration and settings.' : 'Add a new game to your platform.'}
        </DialogDescription>
      </DialogHeader>

      {/* Tabs */}
      <div className="flex gap-1 px-5 pt-3">
        {TABS.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive ? 'bg-emerald-500/15 text-emerald-400' : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}>
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      <DialogContent>
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.15 }}>
            {renderTab()}
          </motion.div>
        </AnimatePresence>
      </DialogContent>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Check className="w-4 h-4" /> {game ? 'Update' : 'Create'}</>}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

// ── Delete Confirmation Modal ────────────────────────────────
function DeleteModal({ open, onClose, game, onConfirm }) {
  const [loading, setLoading] = useState(false)

  const handleDelete = async () => {
    setLoading(true)
    try {
      await deleteGameById(game.id)
      toast.success('Game deleted')
      onConfirm()
      onClose()
    } catch (e) {
      toast.error(`Delete failed: ${e.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} className="max-w-sm">
      <DialogHeader onClose={onClose}>
        <DialogTitle>Delete Game</DialogTitle>
        <DialogDescription>
          Delete "{game?.name}"? This cannot be undone.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button variant="danger" onClick={handleDelete} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Delete
        </Button>
      </DialogFooter>
    </Dialog>
  )
}

// ── CSV Export ───────────────────────────────────────────────
function exportCSV(games) {
  if (!games.length) return
  const headers = ['Name', 'Slug', 'Provider', 'Category', 'RTP', 'Min Bet', 'Max Bet', 'Status', 'AI Enabled']
  const csv = [
    headers.join(','),
    ...games.map(g => [
      `"${g.name}"`, g.slug, g.provider, g.category, g.rtp, g.min_bet, g.max_bet,
      g.is_active ? 'Active' : 'Inactive', g.ai_enabled ? 'Yes' : 'No'
    ].join(','))
  ].join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'games-export.csv'
  a.click()
  URL.revokeObjectURL(url)
}

// ── Main Component ───────────────────────────────────────────
export default function GamesPageAdmin() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [sortBy, setSortBy] = useState('order_index')
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [editGame, setEditGame] = useState(null)
  const [deleteGameItem, setDeleteGameItem] = useState(null)

  const { data: games = [], isLoading } = useQuery({
    queryKey: ['admin-games'],
    queryFn: getGames,
    staleTime: 30000,
    refetchOnWindowFocus: true,
    retry: 1,
  })

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('games-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'games' }, () => {
        qc.invalidateQueries({ queryKey: ['admin-games'] })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [qc])

  // Filter + Sort
  const filtered = useMemo(() => {
    let result = games.filter(g => {
      const matchSearch = !search ||
        g.name?.toLowerCase().includes(search.toLowerCase()) ||
        g.slug?.toLowerCase().includes(search.toLowerCase()) ||
        g.provider?.toLowerCase().includes(search.toLowerCase())
      const matchFilter = filter === 'all' ||
        g.category?.toLowerCase() === filter.toLowerCase() ||
        (filter === 'active' && g.is_active) ||
        (filter === 'disabled' && !g.is_active)
      return matchSearch && matchFilter
    })

    result.sort((a, b) => {
      let aVal = a[sortBy]
      let bVal = b[sortBy]
      if (typeof aVal === 'string') aVal = aVal.toLowerCase()
      if (typeof bVal === 'string') bVal = bVal.toLowerCase()
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })

    return result
  }, [games, search, filter, sortBy, sortDir])

  // Pagination
  const pageSize = 10
  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice(page * pageSize, (page + 1) * pageSize)

  const handleSort = (col) => {
    if (sortBy === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(col)
      setSortDir('asc')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Gamepad2 className="w-6 h-6 text-purple-400" />
            Game Management
          </h2>
          <p className="text-slate-400 mt-1">Manage your game catalog and controls</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportCSV(filtered)}>
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
          <Button onClick={() => { setEditGame(null); setShowModal(true) }}>
            <Plus className="w-4 h-4" /> Add Game
          </Button>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(0) }}
            placeholder="Search games, providers, or slugs..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/30" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'active', 'disabled', ...CATEGORIES.slice(0, 4)].map(f => (
            <button key={f} onClick={() => { setFilter(f); setPage(0) }}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                filter === f ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700/50'
              }`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                {[
                  { key: 'name', label: 'Game' },
                  { key: 'provider', label: 'Provider' },
                  { key: 'category', label: 'Type' },
                  { key: 'rtp', label: 'RTP' },
                  { key: 'is_active', label: 'Status' },
                ].map(col => (
                  <th key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors">
                    <div className="flex items-center gap-1">
                      {col.label}
                      {sortBy === col.key && (
                        <span className="text-emerald-400">{sortDir === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </div>
                  </th>
                ))}
                <th className="text-right px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}><td colSpan={6} className="px-6 py-4">
                    <div className="h-12 bg-slate-700/30 rounded animate-pulse" />
                  </td></tr>
                ))
              ) : paginated.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                  <Gamepad2 className="w-12 h-12 mx-auto mb-2 text-slate-700" />
                  <p>No games found</p>
                </td></tr>
              ) : paginated.map((game) => (
                <motion.tr key={game.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {game.thumbnail_url || game.thumbnail ? (
                        <img src={game.thumbnail_url || game.thumbnail} alt={game.name}
                          className="w-10 h-10 rounded-lg object-cover bg-slate-700" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-600/20 flex items-center justify-center text-lg">
                          🎮
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-white">{game.name}</p>
                        <p className="text-xs text-slate-500 font-mono">/{game.slug || '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">{game.provider || '—'}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full bg-slate-700 text-xs font-medium text-slate-300">
                      {game.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-emerald-400">{Number(game.rtp || 0).toFixed(1)}%</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        game.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                      }`}>
                        {game.is_active ? 'Active' : 'Disabled'}
                      </span>
                      {game.ai_enabled && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/15 text-indigo-400">🤖 AI</span>
                      )}
                      {game.maintenance_mode && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-400">🔧</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/games/${game.slug || game.id}`)}
                        className="text-emerald-400 hover:text-emerald-300" title="Game Control">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setEditGame(game); setShowModal(true) }}
                        className="text-slate-400 hover:text-white" title="Edit">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteGameItem(game)}
                        className="text-slate-400 hover:text-red-400" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-700/50 flex items-center justify-between">
          <p className="text-sm text-slate-500">Showing {paginated.length} of {filtered.length} games</p>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700 disabled:opacity-30">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-slate-400">{page + 1} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-700 disabled:opacity-30">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <GameModal open={showModal} onClose={() => { setShowModal(false); setEditGame(null) }}
        game={editGame} onSaved={() => qc.invalidateQueries({ queryKey: ['admin-games'] })} />
      <DeleteModal open={!!deleteGameItem} onClose={() => setDeleteGameItem(null)}
        game={deleteGameItem} onConfirm={() => qc.invalidateQueries({ queryKey: ['admin-games'] })} />
    </div>
  )
}
