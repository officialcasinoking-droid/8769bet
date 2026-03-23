import { useState } from 'react'
import { motion } from 'framer-motion'
import { KeyIcon, UserIcon, BellIcon, ShieldCheckIcon } from '@heroicons/react/24/outline'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function SettingsPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [activeTab, setActiveTab] = useState('profile')

  const tabs = [
    { id: 'profile', name: 'Profile', icon: UserIcon },
    { id: 'security', name: 'Security', icon: KeyIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'permissions', name: 'Permissions', icon: ShieldCheckIcon },
  ]

  const handleSave = () => {
    toast.success('Settings saved successfully!')
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-admin-muted">Manage your admin account and preferences</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tabs */}
        <div className="lg:col-span-1">
          <div className="bg-admin-card rounded-xl border border-admin-border p-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-primary-500/20 text-primary-400'
                    : 'text-admin-muted hover:bg-admin-border hover:text-white'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          {activeTab === 'profile' && (
            <div className="bg-admin-card rounded-xl border border-admin-border p-6">
              <h2 className="text-lg font-semibold text-white mb-6">Profile Settings</h2>
              
              <div className="flex items-center gap-6 mb-6">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white text-3xl font-bold">
                  {user?.name?.charAt(0) || 'A'}
                </div>
                <div>
                  <button className="btn-secondary text-sm">Change Avatar</button>
                  <p className="text-xs text-admin-muted mt-2">JPG, PNG or GIF. Max 2MB.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-2">Username</label>
                  <input type="text" defaultValue={user?.username || 'admin'} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-2">Display Name</label>
                  <input type="text" defaultValue={user?.name || 'Administrator'} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-2">Email</label>
                  <input type="email" defaultValue="admin@399bet.com" className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-admin-text mb-2">Role</label>
                  <input type="text" defaultValue="God Mode" disabled className="input-field opacity-50" />
                </div>
              </div>

              <button onClick={handleSave} className="btn-primary mt-6">Save Changes</button>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="bg-admin-card rounded-xl border border-admin-border p-6">
                <h2 className="text-lg font-semibold text-white mb-6">Change Password</h2>
                <div className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-sm font-medium text-admin-text mb-2">Current Password</label>
                    <input type="password" className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-admin-text mb-2">New Password</label>
                    <input type="password" className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-admin-text mb-2">Confirm New Password</label>
                    <input type="password" className="input-field" />
                  </div>
                </div>
                <button className="btn-primary mt-6">Update Password</button>
              </div>

              <div className="bg-admin-card rounded-xl border border-admin-border p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Two-Factor Authentication</h2>
                <p className="text-sm text-admin-muted mb-4">Add an extra layer of security to your account</p>
                <button className="btn-secondary">Enable 2FA</button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="bg-admin-card rounded-xl border border-admin-border p-6">
              <h2 className="text-lg font-semibold text-white mb-6">Notification Preferences</h2>
              <div className="space-y-4">
                {['Email notifications', 'User registrations', 'Large transactions', 'System alerts', 'Daily reports'].map(item => (
                  <label key={item} className="flex items-center justify-between p-3 bg-admin-sidebar rounded-lg cursor-pointer">
                    <span className="text-sm text-admin-text">{item}</span>
                    <input type="checkbox" defaultChecked className="w-5 h-5 rounded border-admin-border bg-admin-card text-primary-500" />
                  </label>
                ))}
              </div>
              <button onClick={handleSave} className="btn-primary mt-6">Save Preferences</button>
            </div>
          )}

          {activeTab === 'permissions' && (
            <div className="bg-admin-card rounded-xl border border-admin-border p-6">
              <h2 className="text-lg font-semibold text-white mb-6">God Mode Permissions</h2>
              <div className="space-y-4">
                {[
                  { name: 'Edit Landing Page', granted: true },
                  { name: 'Manage Games', granted: true },
                  { name: 'Manage Users', granted: true },
                  { name: 'View Transactions', granted: true },
                  { name: 'Withdraw Funds', granted: true },
                  { name: 'System Settings', granted: true },
                ].map((perm, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-admin-sidebar rounded-lg">
                    <span className="text-sm text-admin-text">{perm.name}</span>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      perm.granted ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {perm.granted ? 'GRANTED' : 'DENIED'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
