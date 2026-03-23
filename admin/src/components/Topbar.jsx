import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MagnifyingGlassIcon, BellIcon, Bars3Icon } from '@heroicons/react/24/outline'
import { useAuth } from '../context/AuthContext'

export default function Topbar({ onMenuClick }) {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <header className="h-16 bg-admin-sidebar border-b border-admin-border flex items-center justify-between px-6">
      {/* Mobile Menu Button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg hover:bg-admin-border text-admin-muted"
      >
        <Bars3Icon className="w-6 h-6" />
      </button>

      {/* Search */}
      <div className="hidden md:flex items-center flex-1 max-w-md">
        <div className="relative w-full">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search... (Ctrl+K)"
            className="w-full pl-10 pr-4 py-2 rounded-lg bg-admin-card border border-admin-border text-admin-text placeholder-admin-muted focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
          />
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-4">
        {/* God Mode Badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-500/20 border border-primary-500/30">
          <span className="text-primary-400 text-xs font-bold uppercase tracking-wider">God Mode</span>
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-admin-border text-admin-muted hover:text-white transition-colors">
          <BellIcon className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* User */}
        <Link to="/admin/settings" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-sm">
            {user?.name?.charAt(0) || 'A'}
          </div>
          <div className="hidden lg:block">
            <p className="text-sm font-medium text-white">{user?.name || 'Admin'}</p>
            <p className="text-xs text-admin-muted">{user?.role === 'god' ? 'God Mode' : 'Admin'}</p>
          </div>
        </Link>
      </div>
    </header>
  )
}
