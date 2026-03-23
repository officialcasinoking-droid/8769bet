import { useState } from 'react'
import { motion } from 'framer-motion'
import { CurrencyRupeeIcon, PlusIcon, PencilIcon } from '@heroicons/react/24/outline'

const jackpotTiers = [
  { name: 'Grand', startAmount: 1000000, currentAmount: 1847293.75, rate: 5, color: 'from-purple-500 to-pink-500' },
  { name: 'Major', startAmount: 50000, currentAmount: 127458.00, rate: 2, color: 'from-amber-500 to-orange-500' },
  { name: 'Minor', startAmount: 5000, currentAmount: 12847.25, rate: 0.5, color: 'from-gray-400 to-gray-500' },
  { name: 'Mini', startAmount: 500, currentAmount: 847.50, rate: 0.1, color: 'from-amber-700 to-amber-800' },
]

export default function JackpotPage() {
  const [enabled, setEnabled] = useState(true)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Jackpot Settings</h1>
          <p className="text-admin-muted">Configure your progressive jackpot system</p>
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <span className="text-sm text-admin-muted">Enable Jackpot</span>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-primary-500' : 'bg-admin-border'}`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : ''}`}
            />
          </button>
        </label>
      </div>

      {/* Current Jackpots */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {jackpotTiers.map((tier, i) => (
          <motion.div
            key={tier.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-gradient-to-br from-admin-sidebar to-admin-card rounded-xl border border-admin-border p-5 overflow-hidden relative"
          >
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${tier.color}`} />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">{tier.name}</h3>
              <button className="p-1.5 rounded hover:bg-admin-border text-admin-muted hover:text-white transition-colors">
                <PencilIcon className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-admin-muted mb-1">Current Amount</p>
                <p className="text-2xl font-bold font-mono text-white">
                  ₹{tier.currentAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-admin-muted">Starting</p>
                  <p className="text-sm font-medium text-admin-text">₹{tier.startAmount.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-admin-muted">Rate/sec</p>
                  <p className="text-sm font-medium text-green-400">+₹{tier.rate}</p>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Last Winner */}
      <div className="bg-admin-card rounded-xl border border-admin-border p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Last Winner Display</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-admin-muted mb-2">Winner Username</label>
            <input type="text" defaultValue="User***847" className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-admin-muted mb-2">Win Amount</label>
            <input type="number" defaultValue={247583.50} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-admin-muted mb-2">Game Name</label>
            <input type="text" defaultValue="Aviator" className="input-field" />
          </div>
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="bg-admin-card rounded-xl border border-admin-border p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Advanced Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-admin-muted mb-2">Growth Multiplier</label>
            <input type="number" defaultValue={1.0} step={0.1} className="input-field" />
            <p className="text-xs text-admin-muted mt-1">Multiplier for all jackpot growth rates</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-admin-muted mb-2">Reset Schedule</label>
            <select className="input-field">
              <option value="never">Never</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>
        <button className="btn-primary mt-4">Save Settings</button>
      </div>
    </motion.div>
  )
}
