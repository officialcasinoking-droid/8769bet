import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useQueryClient } from '@tanstack/react-query'

export function useRealtimeCounts(table, filter, queryKey) {
  const [count, setCount] = useState(0)
  const [change, setChange] = useState(0)
  const prevCount = useRef(0)

  useEffect(() => {
    const channel = supabase
      .channel(`${table}-count-${filter}`)
      .on('postgres_changes', { event: '*', schema: 'public', table, filter }, (payload) => {
        setChange(prev => prev + 1)
        prevCount.current = count
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [table, filter])

  return { count, change }
}

export function useRealtimeTable(table, filter) {
  const [pending, setPending] = useState(0)
  const qc = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel(`${table}-rt`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        qc.invalidateQueries({ queryKey: [table] })
        qc.invalidateQueries({ queryKey: [`${table}-all`] })
        qc.invalidateQueries({ queryKey: [`${table}-pending`] })
        if (payload.eventType === 'INSERT') setPending(p => p + 1)
        if (payload.eventType === 'DELETE') setPending(p => Math.max(0, p - 1))
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [table, qc])

  return { pending }
}

export function useLandingRealtime() {
  const qc = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel('landing-rt')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'landing_content', filter: 'id=eq.main' }, () => {
        qc.invalidateQueries({ queryKey: ['landing-theme'] })
        qc.invalidateQueries({ queryKey: ['landing-content'] })
        qc.invalidateQueries({ queryKey: ['landing-overview'] })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [qc])
}
