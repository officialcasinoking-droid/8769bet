import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ClipboardIcon, CheckIcon } from '@heroicons/react/24/outline'

export default function UserBadge({ user, showBalance = true, showId = true }) {
  const [copied, setCopied] = useState(false)

  if (!user) return null

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const shortId = user.id?.slice(0, 8) || 'Unknown'

  return (
    <Link
      to="/profile"
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass hover:bg-white/10 transition-colors"
    >
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-sm">
        {user.username?.charAt(0).toUpperCase() || 'U'}
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-white leading-tight">{user.username}</span>
        {showId && (
          <button
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              copyToClipboard(user.id || shortId)
            }}
            className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-primary-400 transition-colors"
          >
            <span>ID: {shortId}</span>
            <span className="text-primary-400">
              {copied ? <CheckIcon className="w-3 h-3" /> : <ClipboardIcon className="w-3 h-3" />}
            </span>
          </button>
        )}
      </div>
    </Link>
  )
}

export function UserBadgeMobile({ user }) {
  const [copied, setCopied] = useState(false)

  if (!user) return null

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const shortId = user.id?.slice(0, 8) || 'Unknown'

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-dark-300/50">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-sm">
        {user.username?.charAt(0).toUpperCase() || 'U'}
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-white leading-tight">{user.username}</span>
        <button
          onClick={() => copyToClipboard(user.id || shortId)}
          className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-primary-400 transition-colors w-fit"
        >
          <span>ID: {shortId}</span>
          <span className="text-primary-400">
            {copied ? <CheckIcon className="w-3 h-3" /> : <ClipboardIcon className="w-3 h-3" />}
          </span>
        </button>
      </div>
    </div>
  )
}
