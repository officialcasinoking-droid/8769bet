import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CubeIcon, PlusIcon, PencilIcon, TrashIcon, EyeIcon as ViewIcon, XMarkIcon, RocketLaunchIcon } from '@heroicons/react/24/outline'
import { Link } from 'react-router-dom'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'

const DEFAULT_GAMES = [
  { id: 1, name: 'Aviator', slug: 'aviator', provider: 'Spribe', category: 'Crash', rtp: 97, minBet: 6, maxBet: 50000, status: 'active', hot: true, ai: true, description: 'The original crash game - watch the plane fly and cash out before it crashes!', thumbnail: '/images/aviator logo.jpg' },
  { id: 2, name: 'Fortune Gems 3', slug: 'fortune-gems-3', provider: 'JILI', category: 'Slots', rtp: 96, minBet: 5, maxBet: 10000, status: 'active', hot: true, ai: false, description: 'Match gems to win big prizes in this exciting slot game.', thumbnail: null },
  { id: 3, name: 'Money Coming', slug: 'money-coming', provider: 'JILI', category: 'Slots', rtp: 95, minBet: 5, maxBet: 10000, status: 'active', hot: true, ai: true, description: 'Watch the money flow and hit massive jackpots!', thumbnail: null },
  { id: 4, name: 'Crazy777', slug: 'crazy777', provider: 'WG', category: 'Slots', rtp: 94, minBet: 5, maxBet: 5000, status: 'active', hot: false, ai: false, description: 'Classic slot machine action with 777 jackpots.', thumbnail: null },
  { id: 5, name: 'JetX', slug: 'jetx', provider: 'SmartSoft', category: 'Crash', rtp: 97, minBet: 10, maxBet: 25000, status: 'coming', hot: true, ai: true, description: 'Another exciting crash game variant.', thumbnail: null },
  { id: 6, name: 'Lucky Jet', slug: 'lucky-jet', provider: '3 Oaks', category: 'Crash', rtp: 96, minBet: 10, maxBet: 25000, status: 'coming', hot: true, ai: true, description: 'Fly with Lucky Jet and multiply your wins!', thumbnail: null },
]

export default function GamesPage() {
  const toast = useToast()
  const [games, setGames] = useState(DEFAULT_GAMES)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [editingGame, setEditingGame] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadGames()
  }, [])

  const loadGames = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .order('name')
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error loading games:', error)
      }
      
      if (data && data.length > 0) {
        setGames(data)
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveGame = async () => {
    if (!editingGame.name || !editingGame.slug) {
      toast.error('Name and slug are required')
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('games')
        .upsert(editingGame)

      if (error) throw error

      if (editingGame.id) {
        setGames(prev => prev.map(g => g.id === editingGame.id ? editingGame : g))
      } else {
        setGames(prev => [...prev, { ...editingGame, id: Date.now() }])
      }

      toast.success(editingGame.id ? 'Game updated successfully!' : 'Game created successfully!')
      setIsModalOpen(false)
      setEditingGame(null)
    } catch (err) {
      toast.error('Failed to save game')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteGame = async (game) => {
    if (!confirm(`Are you sure you want to delete "${game.name}"?`)) return

    try {
      await supabase.from('games').delete().eq('id', game.id)
      setGames(prev => prev.filter(g => g.id !== game.id))
      toast.success('Game deleted successfully!')
    } catch (err) {
      toast.error('Failed to delete game')
    }
  }

  const handleEditGame = (game) => {
    setEditingGame({ ...game })
    setIsModalOpen(true)
  }

  const handleAddGame = () => {
    setEditingGame({
      name: '',
      slug: '',
      provider: '',
      category: 'Crash',
      rtp: 97,
      minBet: 6,
      maxBet: 50000,
      status: 'coming',
      hot: false,
      ai: false,
      description: '',
      thumbnail: null
    })
    setIsModalOpen(true)
  }

  const filteredGames = games.filter(game => {
    const matchesSearch = game.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         game.provider?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !categoryFilter || game.category?.toLowerCase() === categoryFilter.toLowerCase()
    return matchesSearch && matchesCategory
  })

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400">Active</span>
      case 'coming':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">Coming Soon</span>
      case 'inactive':
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500/20 text-red-400">Inactive</span>
      default:
        return null
    }
  }

  const getCategoryIcon = (category) => {
    switch (category?.toLowerCase()) {
      case 'crash': return '🚀'
      case 'slots': return '💎'
      case 'fishing': return '🎣'
      case 'live': return '🎰'
      default: return '🎮'
    }
  }

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
          <h1 className="text-2xl font-bold text-white">Game Management</h1>
          <p className="text-admin-muted">Manage your game catalog and settings</p>
        </div>
        <button
          onClick={handleAddGame}
          className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center gap-2 font-medium"
        >
          <PlusIcon className="w-5 h-5" />
          Add New Game
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-admin-card rounded-xl border border-admin-border p-4">
          <p className="text-admin-muted text-sm">Total Games</p>
          <p className="text-2xl font-bold text-white">{games.length}</p>
        </div>
        <div className="bg-admin-card rounded-xl border border-admin-border p-4">
          <p className="text-admin-muted text-sm">Active</p>
          <p className="text-2xl font-bold text-green-400">{games.filter(g => g.status === 'active').length}</p>
        </div>
        <div className="bg-admin-card rounded-xl border border-admin-border p-4">
          <p className="text-admin-muted text-sm">Hot Games</p>
          <p className="text-2xl font-bold text-orange-400">{games.filter(g => g.hot).length}</p>
        </div>
        <div className="bg-admin-card rounded-xl border border-admin-border p-4">
          <p className="text-admin-muted text-sm">AI Enhanced</p>
          <p className="text-2xl font-bold text-primary-400">{games.filter(g => g.ai).length}</p>
        </div>
      </div>

      <div className="bg-admin-card rounded-xl border border-admin-border overflow-hidden">
        <div className="p-4 border-b border-admin-border flex items-center justify-between gap-4">
          <input
            type="text"
            placeholder="Search games..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field max-w-xs"
          />
          <select 
            className="input-field"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="crash">Crash</option>
            <option value="slots">Slots</option>
            <option value="fishing">Fishing</option>
            <option value="live">Live</option>
          </select>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-admin-border bg-admin-sidebar/50">
                <th className="text-left p-4 text-sm font-medium text-admin-muted">Game</th>
                <th className="text-left p-4 text-sm font-medium text-admin-muted">Provider</th>
                <th className="text-left p-4 text-sm font-medium text-admin-muted">Category</th>
                <th className="text-left p-4 text-sm font-medium text-admin-muted">RTP</th>
                <th className="text-left p-4 text-sm font-medium text-admin-muted">Min/Max Bet</th>
                <th className="text-left p-4 text-sm font-medium text-admin-muted">Badges</th>
                <th className="text-left p-4 text-sm font-medium text-admin-muted">Status</th>
                <th className="text-right p-4 text-sm font-medium text-admin-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredGames.map(game => (
                <tr key={game.id} className="border-b border-admin-border/50 hover:bg-admin-border/30 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-admin-sidebar flex items-center justify-center text-xl overflow-hidden">
                        {game.thumbnail ? (
                          <img src={game.thumbnail} alt={game.name} className="w-full h-full object-cover" />
                        ) : (
                          getCategoryIcon(game.category)
                        )}
                      </div>
                      <div>
                        <span className="font-medium text-white">{game.name}</span>
                        {game.slug === 'aviator' && (
                          <Link
                            to="/aviator"
                            className="ml-2 px-2 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30"
                          >
                            LIVE
                          </Link>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-admin-muted">{game.provider || '-'}</td>
                  <td className="p-4 text-admin-muted">{game.category || '-'}</td>
                  <td className="p-4 text-green-400 font-mono">{game.rtp || 97}%</td>
                  <td className="p-4 text-admin-muted">
                    <span className="text-white">Rs{game.minBet || 0}</span>
                    <span className="text-admin-muted mx-1">/</span>
                    <span className="text-white">Rs{(game.maxBet || 0).toLocaleString()}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      {game.hot && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gradient-to-r from-orange-500 to-red-500 text-white">
                          HOT
                        </span>
                      )}
                      {game.ai && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary-500 text-white">
                          🤖 AI
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    {getStatusBadge(game.status)}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-1">
                      {game.slug === 'aviator' && (
                        <Link
                          to="/aviator"
                          className="p-2 rounded hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                          title="Game Controls"
                        >
                          <RocketLaunchIcon className="w-4 h-4" />
                        </Link>
                      )}
                      <button
                        onClick={() => handleEditGame(game)}
                        className="p-2 rounded hover:bg-admin-border text-admin-muted hover:text-white transition-colors"
                        title="Edit"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteGame(game)}
                        className="p-2 rounded hover:bg-red-500/10 text-admin-muted hover:text-red-400 transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredGames.length === 0 && (
          <div className="text-center py-12">
            <CubeIcon className="w-12 h-12 text-admin-muted mx-auto mb-4" />
            <p className="text-admin-muted">No games found matching your criteria</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && editingGame && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-admin-card rounded-xl border border-admin-border w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-admin-card border-b border-admin-border p-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">
                  {editingGame.id ? 'Edit Game' : 'Add New Game'}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 hover:bg-admin-border rounded"
                >
                  <XMarkIcon className="w-5 h-5 text-admin-muted" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-admin-text mb-2">Game Name *</label>
                    <input
                      type="text"
                      value={editingGame.name}
                      onChange={(e) => setEditingGame({ ...editingGame, name: e.target.value })}
                      className="input-field w-full"
                      placeholder="Aviator"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-admin-text mb-2">Slug *</label>
                    <input
                      type="text"
                      value={editingGame.slug}
                      onChange={(e) => setEditingGame({ ...editingGame, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                      className="input-field w-full"
                      placeholder="aviator"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-admin-text mb-2">Provider</label>
                    <input
                      type="text"
                      value={editingGame.provider}
                      onChange={(e) => setEditingGame({ ...editingGame, provider: e.target.value })}
                      className="input-field w-full"
                      placeholder="Spribe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-admin-text mb-2">Category</label>
                    <select
                      value={editingGame.category}
                      onChange={(e) => setEditingGame({ ...editingGame, category: e.target.value })}
                      className="input-field w-full"
                    >
                      <option value="Crash">Crash</option>
                      <option value="Slots">Slots</option>
                      <option value="Fishing">Fishing</option>
                      <option value="Live">Live</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-admin-text mb-2">RTP (%)</label>
                    <input
                      type="number"
                      value={editingGame.rtp}
                      onChange={(e) => setEditingGame({ ...editingGame, rtp: parseFloat(e.target.value) || 0 })}
                      className="input-field w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-admin-text mb-2">Min Bet</label>
                    <input
                      type="number"
                      value={editingGame.minBet}
                      onChange={(e) => setEditingGame({ ...editingGame, minBet: parseFloat(e.target.value) || 0 })}
                      className="input-field w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-admin-text mb-2">Max Bet</label>
                    <input
                      type="number"
                      value={editingGame.maxBet}
                      onChange={(e) => setEditingGame({ ...editingGame, maxBet: parseFloat(e.target.value) || 0 })}
                      className="input-field w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-admin-text mb-2">Status</label>
                  <select
                    value={editingGame.status}
                    onChange={(e) => setEditingGame({ ...editingGame, status: e.target.value })}
                    className="input-field w-full"
                  >
                    <option value="active">Active</option>
                    <option value="coming">Coming Soon</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-admin-text mb-2">Description</label>
                  <textarea
                    value={editingGame.description}
                    onChange={(e) => setEditingGame({ ...editingGame, description: e.target.value })}
                    rows={3}
                    className="input-field w-full"
                    placeholder="Game description..."
                  />
                </div>

                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingGame.hot}
                      onChange={(e) => setEditingGame({ ...editingGame, hot: e.target.checked })}
                      className="w-4 h-4 rounded bg-admin-sidebar border-admin-border text-primary-500"
                    />
                    <span className="text-sm text-admin-text">Hot Game</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingGame.ai}
                      onChange={(e) => setEditingGame({ ...editingGame, ai: e.target.checked })}
                      className="w-4 h-4 rounded bg-admin-sidebar border-admin-border text-primary-500"
                    />
                    <span className="text-sm text-admin-text">AI Enhanced</span>
                  </label>
                </div>
              </div>

              <div className="sticky bottom-0 bg-admin-card border-t border-admin-border p-4 flex justify-end gap-3">
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-admin-muted hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveGame}
                  disabled={saving}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 font-medium"
                >
                  {saving ? 'Saving...' : 'Save Game'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
