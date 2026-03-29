import { useState } from 'react'
import { motion } from 'framer-motion'

export default function LandingPageEditor() {
  const [selectedSection, setSelectedSection] = useState(null)

  const sections = [
    { id: 1, name: 'Hero Banner', type: 'banner', status: 'active', lastEdited: '2024-01-20' },
    { id: 2, name: 'Featured Games', type: 'games', status: 'active', lastEdited: '2024-01-19' },
    { id: 3, name: 'Jackpot Ticker', type: 'ticker', status: 'active', lastEdited: '2024-01-18' },
    { id: 4, name: 'Promotions Banner', type: 'banner', status: 'inactive', lastEdited: '2024-01-15' },
    { id: 5, name: 'AI Predictions', type: 'ai', status: 'active', lastEdited: '2024-01-20' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Landing Page Editor</h2>
          <p className="text-slate-400 mt-1">Customize your homepage sections and content</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-medium transition-colors">
          <span>➕</span>
          Add Section
        </button>
      </div>

      {/* Preview Toggle */}
      <div className="flex items-center gap-4 p-4 bg-slate-800 rounded-xl border border-slate-700">
        <div className="flex items-center gap-2">
          <span className="text-emerald-400">✏️</span>
          <span className="text-white font-medium">Edit Mode</span>
        </div>
        <div className="h-6 w-px bg-slate-600" />
        <div className="flex items-center gap-2 text-slate-400">
          <span>👁️</span>
          <span>Preview changes before publishing</span>
        </div>
      </div>

      {/* Sections List */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="p-4 border-b border-slate-700">
          <h3 className="text-lg font-semibold text-white">Page Sections</h3>
          <p className="text-sm text-slate-400 mt-1">Drag to reorder sections</p>
        </div>
        <div className="divide-y divide-slate-700">
          {sections.map((section) => (
            <div 
              key={section.id}
              className="flex items-center justify-between p-4 hover:bg-slate-700/50 transition-colors cursor-pointer"
              onClick={() => setSelectedSection(section)}
            >
              <div className="flex items-center gap-4">
                <span className="text-slate-500 cursor-grab">☰</span>
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 flex items-center justify-center text-emerald-400 text-lg">
                  📄
                </div>
                <div>
                  <p className="font-medium text-white">{section.name}</p>
                  <p className="text-xs text-slate-400">Last edited: {section.lastEdited}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                  section.status === 'active' 
                    ? 'bg-emerald-500/20 text-emerald-400' 
                    : 'bg-slate-600 text-slate-400'
                }`}>
                  {section.status}
                </span>
                <button className="p-2 rounded-lg hover:bg-slate-600 text-slate-400 hover:text-white transition-colors">
                  <span>✏️</span>
                </button>
                <button className="p-2 rounded-lg hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors">
                  <span>🗑️</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Section Editor */}
      {selectedSection && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Edit: {selectedSection.name}</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Section Title</label>
              <input 
                type="text" 
                defaultValue={selectedSection.name}
                className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Content</label>
              <textarea 
                rows={4}
                defaultValue="Edit your section content here..."
                className="w-full px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-white focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>
            <div className="flex items-center justify-between">
              <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors">
                Cancel
              </button>
              <button className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
