import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { Button, FormField, Input, Select } from '../../components/ui/FormElements'
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from '../../components/ui/Dialog'
import { uploadImage } from '../../api/admin'
import {
  Plus, Pencil, Trash2, Search,
} from 'lucide-react'
import AviatorControlPanel from './AviatorControlPanel'

async function getGames() {
  const { data, error } = await supabase.from('games').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

async function createGame(game) {
  const { data, error } = await supabase.from('games').insert(game).select().single()
  if (error) throw error
  return data
}

async function updateGame(id, updates) {
  const { data, error } = await supabase.from('games').update(updates).eq('id', id).select().single()
  if (error) throw error
  return data
}

async function deleteGame(id) {
  const { error } = await supabase.from('games').delete().eq('id', id)
  if (error) throw error
}

const CATEGORIES = ['Slots', 'Crash', 'Live', 'Fishing', 'Table', 'Lottery']
const PROVIDERS = ['Spribe', 'JILI', 'SmartSoft', '3 Oaks', 'WG', 'Pragmatic Play', 'Evolution', 'Other']

const EMPTY_FORM = {
  name: '', slug: '', provider: '', category: 'Slots', thumbnail: '',
  is_active: true, description: '',
}

export default function GamesPageAdmin() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editGame, setEditGame] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [uploading, setUploading] = useState(false)

  const { data: games = [], isLoading } = useQuery({
    queryKey: ['admin-games'],
    queryFn: getGames,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  })

  const createMutation = useMutation({
    mutationFn: createGame,
    onSuccess: () => {
      toast.success('Game added')
      qc.invalidateQueries({ queryKey: ['admin-games'] })
      closeModal()
    },
    onError: (e) => toast.error(e.message),
  })

  const updateMutation = useMutation({
    mutationFn: (data) => updateGame(data.id, data),
    onSuccess: () => {
      toast.success('Game updated')
      qc.invalidateQueries({ queryKey: ['admin-games'] })
      closeModal()
    },
    onError: (e) => toast.error(e.message),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteGame,
    onSuccess: () => {
      toast.success('Game deleted')
      qc.invalidateQueries({ queryKey: ['admin-games'] })
    },
    onError: (e) => toast.error(e.message),
  })

  const closeModal = () => {
    setShowModal(false)
    setEditGame(null)
    setForm(EMPTY_FORM)
  }

  const openEdit = (game) => {
    setEditGame(game)
    setForm({
      name: game.name || '',
      slug: game.slug || '',
      provider: game.provider || '',
      category: game.category || 'Slots',
      thumbnail: game.thumbnail || '',
      is_active: game.is_active ?? true,
      description: game.description || '',
    })
    setShowModal(true)
  }

  const handleSubmit = () => {
    if (!form.name.trim()) return toast.error('Game name is required')
    const payload = { ...form }
    if (editGame) {
      updateMutation.mutate({ id: editGame.id, ...payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const url = await uploadImage(file)
      setForm(f => ({ ...f, thumbnail: url }))
      toast.success('Image uploaded')
    } catch (err) {
      toast.error('Upload failed: ' + err.message)
    } finally {
      setUploading(false)
    }
  }

  const filtered = games.filter(g => {
    const matchSearch = !search ||
      g.name?.toLowerCase().includes(search.toLowerCase()) ||
      g.provider?.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' ||
      g.category?.toLowerCase() === filter.toLowerCase() ||
      (filter === 'active' && g.is_active) ||
      (filter === 'inactive' && !g.is_active)
    return matchSearch && matchFilter
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Game Management</h2>
          <p className="text-slate-400 mt-1">Manage your game catalog and live game controls</p>
        </div>
        <Button onClick={() => { setForm(EMPTY_FORM); setShowModal(true) }}>
          <Plus className="w-4 h-4" />
          Add Game
        </Button>
      </div>

      <AviatorControlPanel />

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search games or providers..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/30"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {['all', 'active', 'inactive', ...CATEGORIES].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                filter === cat
                  ? 'bg-emerald-500 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700/50'
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700/50">
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Game</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Provider</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Slug</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">No games found</td></tr>
              ) : filtered.map((game) => (
                <tr key={game.id} className="hover:bg-slate-700/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {game.thumbnail ? (
                        <img src={game.thumbnail} alt={game.name} className="w-10 h-10 rounded-lg object-cover bg-slate-700" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 flex items-center justify-center text-emerald-400 text-lg">
                          🎮
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-white">{game.name}</p>
                        <p className="text-xs text-slate-500">{game.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-300">{game.provider}</td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full bg-slate-700 text-xs font-medium text-slate-300">
                      {game.category}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-400 font-mono">{game.slug || '—'}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      game.is_active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                    }`}>
                      {game.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(game)} className="text-slate-400 hover:text-white">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm(`Delete "${game.name}"?`)) deleteMutation.mutate(game.id)
                        }}
                        className="text-slate-400 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-3 border-t border-slate-700/50">
          <p className="text-sm text-slate-500">Showing {filtered.length} of {games.length} games</p>
        </div>
      </div>

      <Dialog open={showModal} onClose={closeModal} className="max-w-lg">
        <DialogHeader onClose={closeModal}>
          <DialogTitle>{editGame ? 'Edit Game' : 'Add New Game'}</DialogTitle>
        </DialogHeader>
        <DialogContent>
          <div className="space-y-4">
            <div className="space-y-3">
              <FormField label="Game Name *">
                <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Aviator" />
              </FormField>
              <FormField label="Slug">
                <Input value={form.slug} onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="e.g. aviator" />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Provider">
                  <Select value={form.provider} onChange={(e) => setForm(f => ({ ...f, provider: e.target.value }))}>
                    <option value="">Select provider</option>
                    {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
                  </Select>
                </FormField>
                <FormField label="Category">
                  <Select value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </FormField>
              </div>
              <FormField label="Thumbnail URL">
                <div className="flex items-center gap-3">
                  {form.thumbnail && (
                    <img src={form.thumbnail} alt="thumb" className="w-12 h-12 rounded-lg object-cover bg-slate-700" />
                  )}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="text-sm text-slate-400" disabled={uploading} />
                  {uploading && <span className="text-xs text-slate-500">Uploading...</span>}
                </div>
                <Input value={form.thumbnail} onChange={(e) => setForm(f => ({ ...f, thumbnail: e.target.value }))} placeholder="https://..." className="mt-2" />
              </FormField>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                  form.is_active ? 'bg-emerald-500/15 border-emerald-500/30' : 'bg-slate-800/50 border-slate-700/50'
                }`}
              >
                <span className={`text-sm font-medium ${form.is_active ? 'text-white' : 'text-slate-300'}`}>
                  {form.is_active ? 'Active' : 'Inactive'}
                </span>
                <div className={`relative w-11 h-6 rounded-full transition-colors ${form.is_active ? 'bg-emerald-500' : 'bg-slate-700'}`}>
                  <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.is_active ? 'translate-x-5' : ''}`} />
                </div>
              </button>
            </div>
          </div>
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={closeModal}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            {editGame ? 'Save Changes' : 'Add Game'}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
