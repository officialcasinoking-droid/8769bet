import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useQueryClient } from '@tanstack/react-query'

// ── Realtime Counts with pending tracking ────────────────────
export function useRealtimeCounts(table, filter, queryKey) {
  const [count, setCount] = useState(0)
  const [pending, setPending] = useState(0)
  const qc = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel(`${table}-count-${filter || 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        if (queryKey) qc.invalidateQueries({ queryKey })
        if (payload.eventType === 'INSERT') {
          setCount(c => c + 1)
          setPending(p => p + 1)
        }
        if (payload.eventType === 'DELETE') {
          setCount(c => Math.max(0, c - 1))
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [table, filter, queryKey, qc])

  return { count, pending }
}

// ── Realtime Table with direct row tracking ──────────────────
export function useRealtimeTable(table, filter) {
  const qc = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel(`${table}-rt-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        qc.invalidateQueries({ queryKey: [table] })
        qc.invalidateQueries({ queryKey: [`${table}-all`] })
        qc.invalidateQueries({ queryKey: [`${table}-pending`] })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [table, qc])

  return { pending: 0 }
}

// ── Landing Realtime ─────────────────────────────────────────
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

// ── Multi-Table Realtime ─────────────────────────────────────
export function useMultiRealtime(tables) {
  const qc = useQueryClient()
  const [counts, setCounts] = useState({})

  useEffect(() => {
    const channels = tables.map(table => {
      return supabase
        .channel(`multi-rt-${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
          qc.invalidateQueries({ queryKey: [table] })
          setCounts(prev => ({
            ...prev,
            [table]: (prev[table] || 0) + 1,
          }))
        })
        .subscribe()
    })

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch))
    }
  }, [tables.join(','), qc])

  return { counts }
}

// ── Pending Count Realtime (for withdrawal/transaction approvals) ──
export function usePendingRealtime(table, statusField = 'status', pendingValue = 'pending') {
  const [pendingCount, setPendingCount] = useState(0)
  const qc = useQueryClient()

  // Fetch initial count
  useEffect(() => {
    const fetchCount = async () => {
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq(statusField, pendingValue)
      setPendingCount(count || 0)
    }
    fetchCount()
  }, [table, statusField, pendingValue])

  // Subscribe to changes
  useEffect(() => {
    const channel = supabase
      .channel(`pending-${table}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table }, () => {
        setPendingCount(c => c + 1)
        qc.invalidateQueries({ queryKey: [`${table}-pending`] })
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table }, (payload) => {
        const newStatus = payload.new?.[statusField]
        const oldStatus = payload.old?.[statusField]
        if (newStatus !== pendingValue && oldStatus === pendingValue) {
          setPendingCount(c => Math.max(0, c - 1))
        }
        if (newStatus === pendingValue && oldStatus !== pendingValue) {
          setPendingCount(c => c + 1)
        }
        qc.invalidateQueries({ queryKey: [table] })
        qc.invalidateQueries({ queryKey: [`${table}-pending`] })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [table, statusField, pendingValue, qc])

  return { pendingCount }
}
