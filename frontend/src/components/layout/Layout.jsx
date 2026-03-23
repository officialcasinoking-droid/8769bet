import { useState, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from './Navbar'
import Footer from './Footer'
import BottomBar from './BottomBar'
import { FloatingSupport, SupportChatWidget } from '../FloatingSupport'
import { supabase } from '../../lib/supabase'

export default function Layout() {
  const [showChat, setShowChat] = useState(false)
  const [showSupport, setShowSupport] = useState(true)
  const location = useLocation()
  const isHome = location.pathname === '/'
  const isAdmin = location.pathname.startsWith('/admin')
  const isGame = location.pathname.startsWith('/play/')

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data } = await supabase
          .from('platform_settings')
          .select('support_icon_enabled')
          .single()
        if (data && data.support_icon_enabled !== undefined) {
          setShowSupport(data.support_icon_enabled !== false)
        }
      } catch {}
    }
    loadSettings()
  }, [])

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-dark-400">
      {!isGame && <Navbar />}
      <main className={isGame ? 'flex-1 p-0' : 'flex-1 pt-16 pb-20 md:pb-6'}>
        <Outlet />
      </main>
      {!isAdmin && isHome && !isGame && <Footer />}
      {!isAdmin && !isGame && <BottomBar />}
      {showSupport && !isAdmin && !isGame && <FloatingSupport onClick={() => setShowChat(true)} />}
      {showSupport && !isAdmin && !isGame && (
        <SupportChatWidget
          open={showChat}
          onClose={() => setShowChat(false)}
          onMinimize={() => setShowChat(false)}
        />
      )}
    </div>
  )
}
