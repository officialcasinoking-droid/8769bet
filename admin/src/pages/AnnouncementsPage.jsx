import { useState } from 'react'
import { motion } from 'framer-motion'
import { PlusIcon, PencilIcon, TrashIcon, MegaphoneIcon } from '@heroicons/react/24/outline'

const announcements = [
  { id: 1, title: 'VIP Rain Active!', message: 'Rs 12,450 distributed to VIP members', type: 'info', active: true, expiry: '2024-12-31' },
  { id: 2, title: 'New Game Added', message: 'Lucky Jet is now available!', type: 'success', active: true, expiry: '2024-12-31' },
  { id: 3, title: 'Maintenance Notice', message: 'Server maintenance on Sunday 2AM-4AM', type: 'warning', active: false, expiry: '2024-11-20' },
]

export default function AnnouncementsPage() {
  const [showModal, setShowModal] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Announcements</h1>
          <p className="text-admin-muted">Create and manage announcements for your users</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          New Announcement
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-admin-card rounded-xl border border-admin-border p-4">
          <p className="text-admin-muted text-sm">Total</p>
          <p className="text-2xl font-bold text-white">{announcements.length}</p>
        </div>
        <div className="bg-admin-card rounded-xl border border-admin-border p-4">
          <p className="text-admin-muted text-sm">Active</p>
          <p className="text-2xl font-bold text-green-400">{announcements.filter(a => a.active).length}</p>
        </div>
        <div className="bg-admin-card rounded-xl border border-admin-border p-4">
          <p className="text-admin-muted text-sm">Expired</p>
          <p className="text-2xl font-bold text-red-400">{announcements.filter(a => !a.active).length}</p>
        </div>
      </div>

      {/* Announcements List */}
      <div className="bg-admin-card rounded-xl border border-admin-border divide-y divide-admin-border">
        {announcements.map((ann, i) => (
          <motion.div
            key={ann.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="p-4 flex items-start gap-4"
          >
            <div className={`p-2 rounded-lg ${
              ann.type === 'info' ? 'bg-blue-500/10 text-blue-400' :
              ann.type === 'success' ? 'bg-green-500/10 text-green-400' :
              'bg-amber-500/10 text-amber-400'
            }`}>
              <MegaphoneIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-medium text-white">{ann.title}</h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  ann.active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  {ann.active ? 'ACTIVE' : 'INACTIVE'}
                </span>
              </div>
              <p className="text-sm text-admin-muted">{ann.message}</p>
              <p className="text-xs text-admin-muted mt-1">Expires: {ann.expiry}</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-1.5 rounded hover:bg-admin-border text-admin-muted hover:text-white transition-colors">
                <PencilIcon className="w-4 h-4" />
              </button>
              <button className="p-1.5 rounded hover:bg-red-500/10 text-admin-muted hover:text-red-400 transition-colors">
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
