import { motion } from 'framer-motion'
import { UsersIcon, ShieldCheckIcon, NoSymbolIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'

const users = [
  { id: 1, name: 'User***847', email: 'u***@gmail.com', balance: 5240.50, vip: true, registered: '2024-10-15', status: 'active' },
  { id: 2, name: 'User***123', email: 't***@yahoo.com', balance: 1820.00, vip: false, registered: '2024-10-20', status: 'active' },
  { id: 3, name: 'User***456', email: 'f***@hotmail.com', balance: 0, vip: false, registered: '2024-11-01', status: 'suspended' },
  { id: 4, name: 'User***789', email: 's***@gmail.com', balance: 12500.75, vip: true, registered: '2024-09-25', status: 'active' },
]

export default function UsersPage() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">User Management</h1>
          <p className="text-admin-muted">Manage your platform users</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-admin-card rounded-xl border border-admin-border p-4">
          <div className="flex items-center gap-3">
            <UsersIcon className="w-8 h-8 text-primary-400" />
            <div>
              <p className="text-admin-muted text-sm">Total Users</p>
              <p className="text-2xl font-bold text-white">12,847</p>
            </div>
          </div>
        </div>
        <div className="bg-admin-card rounded-xl border border-admin-border p-4">
          <div className="flex items-center gap-3">
            <ShieldCheckIcon className="w-8 h-8 text-green-400" />
            <div>
              <p className="text-admin-muted text-sm">VIP Users</p>
              <p className="text-2xl font-bold text-green-400">842</p>
            </div>
          </div>
        </div>
        <div className="bg-admin-card rounded-xl border border-admin-border p-4">
          <div className="flex items-center gap-3">
            <UsersIcon className="w-8 h-8 text-blue-400" />
            <div>
              <p className="text-admin-muted text-sm">Active Today</p>
              <p className="text-2xl font-bold text-blue-400">2,341</p>
            </div>
          </div>
        </div>
        <div className="bg-admin-card rounded-xl border border-admin-border p-4">
          <div className="flex items-center gap-3">
            <NoSymbolIcon className="w-8 h-8 text-red-400" />
            <div>
              <p className="text-admin-muted text-sm">Suspended</p>
              <p className="text-2xl font-bold text-red-400">23</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-admin-card rounded-xl border border-admin-border p-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-admin-muted" />
            <input
              type="text"
              placeholder="Search by username, email or ID..."
              className="input-field pl-10"
            />
          </div>
          <select className="input-field w-40">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="vip">VIP</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-admin-card rounded-xl border border-admin-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-admin-border">
              <th className="text-left p-4 text-sm font-medium text-admin-muted">User</th>
              <th className="text-left p-4 text-sm font-medium text-admin-muted">Balance</th>
              <th className="text-left p-4 text-sm font-medium text-admin-muted">VIP</th>
              <th className="text-left p-4 text-sm font-medium text-admin-muted">Registered</th>
              <th className="text-left p-4 text-sm font-medium text-admin-muted">Status</th>
              <th className="text-right p-4 text-sm font-medium text-admin-muted">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-b border-admin-border/50 hover:bg-admin-border/30 transition-colors">
                <td className="p-4">
                  <div>
                    <p className="font-medium text-white">{user.name}</p>
                    <p className="text-xs text-admin-muted">{user.email}</p>
                  </div>
                </td>
                <td className="p-4 font-mono text-white">₹{user.balance.toLocaleString()}</td>
                <td className="p-4">
                  {user.vip ? (
                    <span className="px-2 py-1 rounded text-xs font-bold bg-gradient-to-r from-amber-500 to-orange-500 text-white">VIP</span>
                  ) : (
                    <span className="text-xs text-admin-muted">-</span>
                  )}
                </td>
                <td className="p-4 text-admin-muted">{user.registered}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {user.status}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button className="px-3 py-1 rounded text-xs font-medium bg-admin-sidebar hover:bg-admin-border text-admin-text transition-colors">
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}
