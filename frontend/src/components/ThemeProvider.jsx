import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase, getLanding } from '../api/landing'
import { ThemeProvider } from '../context/ThemeContext'

export default function ThemeProviderWrapper({ children }) {
  const queryClient = useQueryClient()

  useEffect(() => {
    function applyColors(colors) {
      if (!colors) return
      Object.entries(colors).forEach(([key, value]) => {
        if (value) {
          document.documentElement.style.setProperty(`--color-${key}`, value)
          document.documentElement.style.setProperty(`--${key}`, value)
        }
      })
    }

    async function loadInitialColors() {
      const data = await getLanding()
      if (data?.colors) applyColors(data.colors)
    }

    loadInitialColors()

    const channel = supabase
      .channel('landing-realtime')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'landing_content',
          filter: 'id=eq.main',
        },
        (payload) => {
          const colors = payload.new?.live_json?.colors
          if (colors) {
            applyColors(colors)
            queryClient.setQueryData(['landing-theme'], payload.new?.live_json)
            queryClient.invalidateQueries(['landing-content'])
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [queryClient])

  return <ThemeProvider>{children}</ThemeProvider>
}
