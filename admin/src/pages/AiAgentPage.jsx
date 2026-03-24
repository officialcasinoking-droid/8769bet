import { motion } from 'framer-motion'
import { SparklesIcon, CpuChipIcon, BeakerIcon } from '@heroicons/react/24/outline'

export default function AiAgentPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Agent Settings</h1>
          <p className="text-admin-muted">Configure AI-powered features</p>
        </div>
      </div>

      <div className="bg-admin-card rounded-xl border border-admin-border p-8 text-center">
        <CpuChipIcon className="w-12 h-12 text-admin-muted mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">AI Agent Coming Soon</h3>
        <p className="text-admin-muted">
          AI-powered predictions and automation features are under development.
        </p>
      </div>
    </motion.div>
  )
}
