import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronRightIcon,
  ChevronDownIcon,
  PhotoIcon,
  PencilSquareIcon,
  CubeIcon,
  CurrencyRupeeIcon,
  EyeIcon,
  ArrowPathIcon,
  PlusIcon,
  TrashIcon,
  PencilIcon,
  CheckIcon,
  XMarkIcon,
  ChevronUpDownIcon
} from '@heroicons/react/24/outline'
import { useToast } from '../context/ToastContext'

// Mock landing page data
const initialData = {
  topBar: {
    logo: '399bet',
    searchPlaceholder: 'Search games, news or Aviator...',
    showBalance: true,
    showDeposit: true,
    showAI: true,
  },
  hero: {
    title: 'Invite A Friend',
    subtitle: 'Get Rs 500 Bonus!',
    background: 'gradient',
    enabled: true,
  },
  categories: [
    { id: 1, name: 'Hot', icon: '🔥', enabled: true },
    { id: 2, name: 'Slots', icon: '🤑', enabled: true },
    { id: 3, name: 'Crash', icon: '🚀', enabled: true },
    { id: 4, name: 'Fishing', icon: '🎣', enabled: true },
    { id: 5, name: 'Live', icon: '♠️', enabled: true },
    { id: 6, name: 'AI Pick', icon: '🤖', enabled: true },
  ],
  jackpot: {
    enabled: true,
    tiers: [
      { name: 'Mini', amount: 847.50 },
      { name: 'Minor', amount: 12847.25 },
      { name: 'Major', amount: 127458.00 },
      { name: 'Grand', amount: 1847293.75 },
    ],
    lastWinner: 'User***847',
    lastWinAmount: 247583.50,
    lastWinGame: 'Aviator',
  },
  games: [
    { id: 1, name: 'Aviator', provider: 'Spribe', multiplier: '10000x', rtp: '97%', hot: true, ai: true, cat: 'crash', enabled: true },
    { id: 2, name: 'Fortune Gems 3', provider: 'JILI', multiplier: '5000x', rtp: '96%', hot: true, ai: false, cat: 'slots', enabled: true },
    { id: 3, name: 'Money Coming', provider: 'JILI', multiplier: '10000x', rtp: '95%', hot: true, ai: true, cat: 'slots', enabled: true },
    { id: 4, name: 'Crazy777', provider: 'WG', multiplier: '7777x', rtp: '94%', hot: false, ai: false, cat: 'slots', enabled: true },
    { id: 5, name: 'JetX', provider: 'SmartSoft', multiplier: '10000x', rtp: '97%', hot: true, ai: true, cat: 'crash', enabled: true },
    { id: 6, name: 'Lucky Jet', provider: '3 Oaks', multiplier: '10000x', rtp: '96%', hot: true, ai: true, cat: 'crash', enabled: true },
  ],
  bottomNav: {
    showHome: true,
    showDeposit: true,
    showOffers: true,
    showWithdraw: true,
    showProfile: true,
  },
}

const sections = [
  { id: 'topbar', name: 'Top Bar', icon: PhotoIcon },
  { id: 'hero', name: 'Hero Banner', icon: PencilSquareIcon },
  { id: 'categories', name: 'Categories', icon: TagIcon },
  { id: 'jackpot', name: 'Jackpot Banner', icon: CurrencyRupeeIcon },
  { id: 'games', name: 'Game Cards', icon: CubeIcon },
  { id: 'bottomnav', name: 'Bottom Navigation', icon: PhotoIcon },
]

function TagIcon() {
  return <div className="w-5 h-5 bg-admin-muted/20 rounded text-admin-muted text-xs flex items-center justify-center">#</div>
}

function MobilePreview({ data }) {
  return (
    <div className="w-72 bg-white rounded-[2.5rem] overflow-hidden border-4 border-gray-800 shadow-2xl">
      {/* Phone Frame Header */}
      <div className="bg-gray-900 py-2 px-4 flex items-center justify-center">
        <div className="w-20 h-6 bg-gray-800 rounded-full" />
      </div>
      
      {/* Screen Content */}
      <div className="h-[500px] overflow-y-auto bg-gray-50">
        {/* Mini Top Bar */}
        <div className="bg-white border-b border-gray-200 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center">
                <span className="text-xs font-bold text-white">8</span>
              </div>
              <span className="text-sm font-bold text-gray-900">399bet</span>
            </div>
            <div className="flex items-center gap-2">
              {data.topBar.showBalance && (
                <div className="text-xs text-emerald-600 font-mono">5.56</div>
              )}
              {data.topBar.showDeposit && (
                <div className="px-2 py-1 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
                  Deposit
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Hero Banner */}
        {data.hero.enabled && (
          <div className="mx-3 mt-3 p-4 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl">
            <h2 className="text-base font-bold text-white">{data.hero.title}</h2>
            <p className="text-sm text-white/90">{data.hero.subtitle}</p>
            <div className="flex gap-1 mt-2 text-lg">🤝 💰 💰</div>
          </div>
        )}

        {/* Categories */}
        <div className="px-3 mt-4 flex gap-2 overflow-x-auto">
          {data.categories.filter(c => c.enabled).map(cat => (
            <div key={cat.id} className="flex-shrink-0 flex flex-col items-center gap-1 px-3 py-2 bg-gray-100 rounded-xl">
              <span className="text-base">{cat.icon}</span>
              <span className="text-[10px] font-medium text-gray-600">{cat.name}</span>
            </div>
          ))}
        </div>

        {/* Jackpot */}
        {data.jackpot.enabled && (
          <div className="mx-3 mt-4 p-3 bg-gradient-to-br from-amber-50 to-white border border-amber-200 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-lg">💎</span>
              <span className="text-xs font-bold text-amber-600">PROGRESSIVE JACKPOT</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {data.jackpot.tiers.map(tier => (
                <div key={tier.name} className="text-center p-1.5 bg-gray-50 rounded-lg">
                  <div className="text-[8px] text-gray-500">{tier.name}</div>
                  <div className="text-[10px] font-mono font-bold text-gray-900">
                    ₹{tier.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Game Grid */}
        <div className="px-3 mt-4">
          <div className="flex gap-3 mb-3 border-b border-gray-200">
            {['Hot', 'All', 'Favorites'].map((tab, i) => (
              <button key={tab} className={`pb-2 px-2 text-xs font-medium ${i === 0 ? 'text-emerald-600 border-b-2 border-emerald-500' : 'text-gray-500'}`}>
                {tab}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {data.games.filter(g => g.enabled).slice(0, 6).map(game => (
              <div key={game.id} className="bg-white rounded-lg overflow-hidden shadow-sm">
                <div className="aspect-square bg-gray-100 flex items-center justify-center relative">
                  <span className="text-2xl">{game.cat === 'crash' ? '🚀' : '💎'}</span>
                  {game.hot && (
                    <div className="absolute top-1 left-1 px-1 py-0.5 rounded bg-gradient-to-r from-orange-500 to-red-500 text-[8px] font-bold text-white">
                      HOT
                    </div>
                  )}
                  {game.ai && (
                    <div className="absolute top-1 right-1 px-1 py-0.5 rounded bg-emerald-500 text-[8px] font-bold text-white">
                      🤖
                    </div>
                  )}
                </div>
                <div className="p-1.5">
                  <p className="text-[10px] font-semibold text-gray-900 truncate">{game.name}</p>
                  <p className="text-[8px] text-gray-500">{game.provider}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Nav Placeholder */}
        <div className="mt-4 h-16 bg-white border-t border-gray-200 flex items-center justify-around">
          {['🏠', '💰', '🎁', '📈', '👤'].map((icon, i) => (
            <div key={i} className="text-lg opacity-50">{icon}</div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SectionEditor({ section, data, onUpdate }) {
  const [expanded, setExpanded] = useState(false)

  const renderEditor = () => {
    switch (section.id) {
      case 'topbar':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-admin-text mb-2">Logo Text</label>
              <input
                type="text"
                value={data.topBar.logo}
                onChange={(e) => onUpdate({ ...data, topBar: { ...data.topBar, logo: e.target.value } })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-admin-text mb-2">Search Placeholder</label>
              <input
                type="text"
                value={data.topBar.searchPlaceholder}
                onChange={(e) => onUpdate({ ...data, topBar: { ...data.topBar, searchPlaceholder: e.target.value } })}
                className="input-field"
              />
            </div>
            <div className="space-y-2">
              {['showBalance', 'showDeposit', 'showAI'].map(key => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.topBar[key]}
                    onChange={(e) => onUpdate({ ...data, topBar: { ...data.topBar, [key]: e.target.checked } })}
                    className="w-4 h-4 rounded border-admin-border bg-admin-sidebar text-primary-500"
                  />
                  <span className="text-sm text-admin-text capitalize">{key.replace('show', '')}</span>
                </label>
              ))}
            </div>
          </div>
        )

      case 'hero':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-admin-text mb-2">Title</label>
              <input
                type="text"
                value={data.hero.title}
                onChange={(e) => onUpdate({ ...data, hero: { ...data.hero, title: e.target.value } })}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-admin-text mb-2">Subtitle</label>
              <input
                type="text"
                value={data.hero.subtitle}
                onChange={(e) => onUpdate({ ...data, hero: { ...data.hero, subtitle: e.target.value } })}
                className="input-field"
              />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={data.hero.enabled}
                onChange={(e) => onUpdate({ ...data, hero: { ...data.hero, enabled: e.target.checked } })}
                className="w-4 h-4 rounded border-admin-border bg-admin-sidebar text-primary-500"
              />
              <span className="text-sm text-admin-text">Enable Hero Banner</span>
            </label>
          </div>
        )

      case 'jackpot':
        return (
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={data.jackpot.enabled}
                onChange={(e) => onUpdate({ ...data, jackpot: { ...data.jackpot, enabled: e.target.checked } })}
                className="w-4 h-4 rounded border-admin-border bg-admin-sidebar text-primary-500"
              />
              <span className="text-sm text-admin-text">Enable Jackpot Banner</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-admin-muted mb-1">Last Winner</label>
                <input
                  type="text"
                  value={data.jackpot.lastWinner}
                  onChange={(e) => onUpdate({ ...data, jackpot: { ...data.jackpot, lastWinner: e.target.value } })}
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-admin-muted mb-1">Win Amount</label>
                <input
                  type="number"
                  value={data.jackpot.lastWinAmount}
                  onChange={(e) => onUpdate({ ...data, jackpot: { ...data.jackpot, lastWinAmount: Number(e.target.value) } })}
                  className="input-field text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-admin-muted mb-2">Tier Amounts</label>
              <div className="grid grid-cols-2 gap-2">
                {data.jackpot.tiers.map((tier, i) => (
                  <div key={tier.name} className="flex items-center gap-2">
                    <span className="text-xs text-admin-muted w-12">{tier.name}</span>
                    <input
                      type="number"
                      value={tier.amount}
                      onChange={(e) => {
                        const newTiers = [...data.jackpot.tiers]
                        newTiers[i] = { ...newTiers[i], amount: Number(e.target.value) }
                        onUpdate({ ...data, jackpot: { ...data.jackpot, tiers: newTiers } })
                      }}
                      className="input-field text-sm flex-1"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )

      case 'games':
        return (
          <div className="space-y-3">
            <p className="text-sm text-admin-muted">Manage game cards. Click to edit.</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {data.games.map((game, i) => (
                <div key={game.id} className="flex items-center gap-3 p-3 bg-admin-sidebar rounded-lg">
                  <div className="text-2xl">{game.cat === 'crash' ? '🚀' : '💎'}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-white">{game.name}</p>
                    <p className="text-xs text-admin-muted">{game.provider} • {game.rtp} RTP</p>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={game.enabled}
                      onChange={(e) => {
                        const newGames = [...data.games]
                        newGames[i] = { ...newGames[i], enabled: e.target.checked }
                        onUpdate({ ...data, games: newGames })
                      }}
                      className="w-4 h-4 rounded border-admin-border bg-admin-card text-primary-500"
                    />
                  </label>
                  <button className="p-1.5 rounded hover:bg-admin-border text-admin-muted hover:text-white transition-colors">
                    <PencilIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button className="w-full btn-secondary flex items-center justify-center gap-2">
              <PlusIcon className="w-4 h-4" /> Add New Game
            </button>
          </div>
        )

      case 'categories':
        return (
          <div className="space-y-3">
            <p className="text-sm text-admin-muted">Toggle categories visibility.</p>
            <div className="space-y-2">
              {data.categories.map((cat, i) => (
                <div key={cat.id} className="flex items-center gap-3 p-2 bg-admin-sidebar rounded-lg">
                  <span className="text-xl">{cat.icon}</span>
                  <span className="flex-1 text-sm text-white">{cat.name}</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cat.enabled}
                      onChange={(e) => {
                        const newCats = [...data.categories]
                        newCats[i] = { ...newCats[i], enabled: e.target.checked }
                        onUpdate({ ...data, categories: newCats })
                      }}
                      className="w-4 h-4 rounded border-admin-border bg-admin-card text-primary-500"
                    />
                  </label>
                </div>
              ))}
            </div>
          </div>
        )

      case 'bottomnav':
        return (
          <div className="space-y-2">
            {['showHome', 'showDeposit', 'showOffers', 'showWithdraw', 'showProfile'].map(key => (
              <label key={key} className="flex items-center gap-3 cursor-pointer p-2 bg-admin-sidebar rounded-lg">
                <input
                  type="checkbox"
                  checked={data.bottomNav[key]}
                  onChange={(e) => onUpdate({ ...data, bottomNav: { ...data.bottomNav, [key]: e.target.checked } })}
                  className="w-4 h-4 rounded border-admin-border bg-admin-card text-primary-500"
                />
                <span className="text-sm text-admin-text capitalize">{key.replace('show', '')}</span>
              </label>
            ))}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="border border-admin-border rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 bg-admin-sidebar hover:bg-admin-border transition-colors"
      >
        <div className="flex items-center gap-3">
          <section.icon className="w-5 h-5 text-primary-400" />
          <span className="font-medium text-white">{section.name}</span>
        </div>
        {expanded ? (
          <ChevronDownIcon className="w-5 h-5 text-admin-muted" />
        ) : (
          <ChevronRightIcon className="w-5 h-5 text-admin-muted" />
        )}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 border-t border-admin-border">
              {renderEditor()}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function LandingPageEditor() {
  const toast = useToast()
  const [data, setData] = useState(initialData)
  const [activeSection, setActiveSection] = useState('topbar')
  const [showPreview, setShowPreview] = useState(true)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000))
    toast.success('Changes saved successfully!')
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Landing Page Editor</h1>
          <p className="text-admin-muted">God Mode - Control every aspect of your landing page</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`btn-secondary flex items-center gap-2 ${showPreview ? 'border-primary-500 text-primary-400' : ''}`}
          >
            <EyeIcon className="w-4 h-4" />
            {showPreview ? 'Hide Preview' : 'Show Preview'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <CheckIcon className="w-4 h-4" />
            )}
            Save Changes
          </button>
        </div>
      </div>

      {/* Main Content - Split View */}
      <div className={`flex gap-6 ${showPreview ? 'grid grid-cols-1 lg:grid-cols-2' : ''}`}>
        {/* Editor Panel */}
        <div className={showPreview ? '' : 'max-w-2xl'}>
          <div className="bg-admin-card rounded-xl border border-admin-border overflow-hidden">
            <div className="p-4 border-b border-admin-border">
              <h2 className="text-lg font-semibold text-white">Page Sections</h2>
              <p className="text-sm text-admin-muted mt-1">Click to expand and edit each section</p>
            </div>
            <div className="p-4 space-y-2">
              {sections.map(section => (
                <SectionEditor
                  key={section.id}
                  section={section}
                  data={data}
                  onUpdate={setData}
                />
              ))}
            </div>
          </div>

          {/* Global Settings */}
          <div className="mt-6 bg-admin-card rounded-xl border border-admin-border p-4">
            <h3 className="text-lg font-semibold text-white mb-4">Global Settings</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-admin-text mb-2">Default Theme</label>
                <select className="input-field">
                  <option value="light">Light Mode</option>
                  <option value="dark">Dark Mode</option>
                  <option value="system">System Default</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-admin-text mb-2">Primary Color</label>
                <div className="flex items-center gap-2">
                  <input type="color" value="#10b981" className="w-10 h-10 rounded cursor-pointer" />
                  <input type="text" value="#10b981" className="input-field flex-1" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="hidden lg:block"
          >
            <div className="sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-admin-muted">Live Preview</h3>
                <div className="flex items-center gap-2">
                  <button className="p-1.5 rounded hover:bg-admin-border text-admin-muted hover:text-white transition-colors">
                    <ArrowPathIcon className="w-4 h-4" />
                  </button>
                  <ChevronUpDownIcon className="w-4 h-4 text-admin-muted" />
                </div>
              </div>
              <div className="flex justify-center">
                <MobilePreview data={data} />
              </div>
              <p className="text-center text-xs text-admin-muted mt-4">Preview updates in real-time</p>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
