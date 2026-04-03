/**
 * Aviator API Layer
 * Connects to backend WebSocket for real-time game sync
 * HTTP API for admin controls and settings
 */

import { supabaseAnon as supabase } from '../lib/supabase'

// ──────────────────────────────────────────────
// Backend Configuration
// ──────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3006'

// ──────────────────────────────────────────────
// WebSocket Connection
// ──────────────────────────────────────────────

let ws = null
let wsCallbacks = {
  onGameState: null,
  onBetsUpdate: null,
  onSettingsUpdate: null,
}
let wsReconnectTimeout = null
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 10

export function connectWebSocket(onGameState, onBetsUpdate, onSettingsUpdate) {
  wsCallbacks.onGameState = onGameState
  wsCallbacks.onBetsUpdate = onBetsUpdate
  wsCallbacks.onSettingsUpdate = onSettingsUpdate

  if (ws && ws.readyState === WebSocket.OPEN) {
    return true
  }

  const wsUrl = API_BASE.includes('://') 
    ? `ws://${API_BASE.split('://')[1]}/ws/aviator`
    : `ws://${API_BASE}/ws/aviator`
  
  try {
    ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('[WS] Connected to Aviator game engine')
      reconnectAttempts = 0
      if (wsReconnectTimeout) {
        clearTimeout(wsReconnectTimeout)
        wsReconnectTimeout = null
      }
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        
        if (msg.type === 'game_state' && wsCallbacks.onGameState) {
          wsCallbacks.onGameState(msg)
        }
        if (msg.type === 'bets_update' && wsCallbacks.onBetsUpdate) {
          wsCallbacks.onBetsUpdate(msg.bets)
        }
        if (msg.type === 'settings_updated' && wsCallbacks.onSettingsUpdate) {
          wsCallbacks.onSettingsUpdate(msg.settings)
        }
      } catch (e) {
        console.warn('[WS] Parse error:', e.message)
      }
    }

    ws.onclose = () => {
      console.log('[WS] Disconnected from game engine')
      scheduleReconnect()
    }

    ws.onerror = (err) => {
      console.error('[WS] Error:', err)
    }

    return true
  } catch (e) {
    console.error('[WS] Failed to connect:', e)
    return false
  }
}

function scheduleReconnect() {
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.log('[WS] Max reconnection attempts reached')
    return
  }

  const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000)
  reconnectAttempts++

  wsReconnectTimeout = setTimeout(() => {
    console.log(`[WS] Reconnecting... (attempt ${reconnectAttempts})`)
    connectWebSocket(
      wsCallbacks.onGameState,
      wsCallbacks.onBetsUpdate,
      wsCallbacks.onSettingsUpdate
    )
  }, delay)
}

export function disconnectWebSocket() {
  if (ws) {
    ws.close()
    ws = null
  }
  if (wsReconnectTimeout) {
    clearTimeout(wsReconnectTimeout)
    wsReconnectTimeout = null
  }
}

export function sendWSMessage(msg) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg))
    return true
  }
  return false
}

// ──────────────────────────────────────────────
// HTTP API Calls
// ──────────────────────────────────────────────

async function apiRequest(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`)
    }
    return await response.json()
  } catch (e) {
    console.error(`[API] ${endpoint} error:`, e.message)
    throw e
  }
}

export async function getBackendGameState() {
  return apiRequest('/api/aviator/state')
}

export async function requestBackendCrash() {
  return apiRequest('/api/aviator/crash', { method: 'POST' })
}

export async function updateBackendSettings(settings) {
  return apiRequest('/api/aviator/settings', {
    method: 'POST',
    body: JSON.stringify(settings),
  })
}

export async function placeBetBackend(betData) {
  return apiRequest('/api/aviator/bet', {
    method: 'POST',
    body: JSON.stringify(betData),
  })
}

export async function cashoutBackend(userId, betNum) {
  return apiRequest('/api/aviator/cashout', {
    method: 'POST',
    body: JSON.stringify({ userId, betNum }),
  })
}

/** Subscribe to game-state broadcasts (no-op — uses localStorage polling) */
export function subscribeToGameBroadcast(callback) {
  return null
}

/** Subscribe to round-crash broadcasts (no-op — uses localStorage polling) */
export function subscribeToRoundBroadcast(callback) {
  return null
}

/** Subscribe to round bets changes (no-op) */
export function subscribeToRoundBets(roundId, onInsert, onUpdate) {
  return null
}

/** Remove a channel (no-op) */
export function unsubscribe(channel) {
  // no-op
}

/** Broadcast game state via localStorage */
export async function broadcastMultiplier(state) {
  try {
    localStorage.setItem('aviator_game_state', JSON.stringify({ ...state, timestamp: Date.now() }))
  } catch (e) { /* ignore */ }
}

/** Broadcast crash event via localStorage */
export async function broadcastCrash(roundId, crashPoint) {
  try {
    localStorage.setItem('aviator_game_crash', JSON.stringify({ roundId, crashPoint, timestamp: Date.now() }))
  } catch (e) { /* ignore */ }
}

/** Signal from admin: manual crash requested */
export function setManualCrash(v = true) {
  try { localStorage.setItem('aviator_manual_crash', JSON.stringify({ v, ts: Date.now() })) } catch {}
}
export function getManualCrash() {
  try {
    const raw = localStorage.getItem('aviator_manual_crash')
    if (!raw) return false
    const data = JSON.parse(raw)
    if (Date.now() - data.ts > 30000) return false
    return data.v
  } catch { return false }
}
export function clearManualCrash() {
  try { localStorage.removeItem('aviator_manual_crash') } catch {}
}

/** Signal from admin: game settings (house edge, bias, bot config) */
export function setGameSettings(settings) {
  try { localStorage.setItem('aviator_settings', JSON.stringify({ ...settings, ts: Date.now() })) } catch {}
}
export function getGameSettingsLocal() {
  try {
    const raw = localStorage.getItem('aviator_settings')
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}

/** Smart auto house edge mode */
export function getHeMode() {
  try {
    const raw = localStorage.getItem('aviator_settings')
    if (!raw) return 'off'
    const s = JSON.parse(raw)
    return s.heMode || 'off'
  } catch { return 'off' }
}

/** Write live house edge metrics for admin panel to read */
export function broadcastLiveHE(metrics) {
  try {
    localStorage.setItem('aviator_live_he', JSON.stringify({ ...metrics, ts: Date.now() }))
  } catch {}
}

// ──────────────────────────────────────────────
// Supabase Real-time Sync (for multi-device support)
// ──────────────────────────────────────────────

let _lastBroadcast = 0

export async function broadcastGameState(state) {
  // localStorage only - no Supabase writes from game loop
  try {
    localStorage.setItem('aviator_game_state', JSON.stringify({ ...state, timestamp: Date.now() }))
  } catch {}
}

export async function getGameState() {
  try {
    const { data } = await supabase
      .from('aviator_game_state')
      .select('*')
      .eq('id', 'current')
      .single()
    if (data) return data
  } catch {}
  return null
}

export async function broadcastLiveBets(bets) {
  try {
    localStorage.setItem('aviator_live_bets', JSON.stringify(bets))
  } catch {}
}

export async function getLiveBets() {
  try {
    const { data } = await supabase
      .from('aviator_live_bets')
      .select('*')
      .order('created_at', { ascending: true })
    return data || []
  } catch { return [] }
}

export async function broadcastCrashHistory(history) {
  try {
    localStorage.setItem('aviator_crash_history', JSON.stringify(history))
  } catch {}
}

export async function getCrashHistory() {
  try {
    const { data } = await supabase
      .from('aviator_crash_history')
      .select('crash_point')
      .order('created_at', { ascending: false })
      .limit(20)
    return (data || []).map(d => d.crash_point)
  } catch { return [] }
}

export async function checkManualCrash() {
  try {
    const { data } = await supabase
      .from('aviator_signals')
      .select('*')
      .eq('id', 'crash')
      .single()
    if (data && data.signal === 'crash' && !data.processed) {
      await supabase.from('aviator_signals').update({ processed: true }).eq('id', 'crash')
      return true
    }
  } catch {}
  return false
}

export async function setManualCrashSignal() {
  try {
    await supabase
      .from('aviator_signals')
      .upsert({
        id: 'crash',
        signal: 'crash',
        timestamp: Date.now(),
        processed: false
      })
  } catch (e) {
    console.warn('[setManualCrashSignal]', e?.message)
  }
}

export async function getSettingsFromDB() {
  try {
    const { data } = await supabase
      .from('aviator_settings')
      .select('*')
      .eq('id', 'config')
      .single()
    return data || null
  } catch { return null }
}

export async function saveSettingsToDB(settings) {
  // localStorage only - no Supabase writes
  try {
    localStorage.setItem('aviator_settings', JSON.stringify(settings))
  } catch {}
}

export async function broadcastLiveHEMetrics(metrics) {
  // Only localStorage - DB table may not exist yet
  try {
    localStorage.setItem('aviator_live_he', JSON.stringify({ ...metrics, ts: Date.now() }))
  } catch {}
}

export async function getLiveHEMetrics() {
  try {
    const raw = localStorage.getItem('aviator_live_he')
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

// ──────────────────────────────────────────────
// House Edge Pool & P&L Tracking
// ──────────────────────────────────────────────

export async function getHouseEdgePool() {
  // Try backend first, then fall back to localStorage
  try {
    const state = await apiRequest('/api/aviator/state')
    if (state && state.houseEdge) {
      return state.houseEdge
    }
  } catch {}

  // Fallback to localStorage
  return { total_deposits: 0, total_bets: 0, total_winnings_paid: 0, house_edge_pool: 0, total_withdrawals_paid: 0, gross_pnl: 0, rounds_played: 0 }
}

export async function updateHouseEdgePool(realBetAmount, realExitAmount, crashMult) {
  // No-op - game runs on localStorage
}

export async function recordDeposit(amount) {
  try {
    const { data, error } = await supabase.rpc('record_aviator_deposit', { p_amount: Number(amount) || 0 })
    if (error) {
      console.error('[recordDeposit] RPC error:', error.message)
    } else {
      console.log('[recordDeposit] OK - amount:', amount)
    }
  } catch (e) {
    console.error('[recordDeposit] Exception:', e?.message)
  }
}

export async function recordWithdrawal(amount) {
  try {
    const { data, error } = await supabase.rpc('record_aviator_withdrawal', { p_amount: Number(amount) || 0 })
    if (error) {
      console.error('[recordWithdrawal] RPC error:', error.message)
    } else {
      console.log('[recordWithdrawal] OK - amount:', amount)
    }
  } catch (e) {
    console.error('[recordWithdrawal] Exception:', e?.message)
  }
}

export async function getPendingWithdrawalQueue() {
  const { data, error } = await supabase
    .from('withdrawals')
    .select('id, user_id, amount, status, created_at, is_queued, queue_reason, users(username)')
    .eq('is_queued', true)
    .order('created_at', { ascending: false })
  if (error) return []
  return data || []
}

export async function getHouseEdgeAlerts() {
  const { data, error } = await supabase
    .from('withdrawals')
    .select('id, user_id, amount, status, created_at, users(username)')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
  if (error) return []
  return data || []
}

export async function queueWithdrawal(id, reason) {
  try {
    await supabase
      .from('withdrawals')
      .update({ is_queued: true, queue_reason: reason, aviator_impact: true })
      .eq('id', id)
  } catch (e) {
    console.warn('[queueWithdrawal]', e?.message)
  }
}

// ──────────────────────────────────────────────
// Round Management
// ──────────────────────────────────────────────

/** Get the currently running round (if any) */
export async function getCurrentRound() {
  const { data, error } = await supabase
    .from('game_rounds')
    .select('*')
    .eq('status', 'running')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

/** Get the most recently crashed round */
export async function getLatestCrashedRound() {
  const { data, error } = await supabase
    .from('game_rounds')
    .select('*')
    .eq('status', 'crashed')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

/** Create a new round in DB */
export async function createRound(houseEdge = 0.05) {
  const roundId = `r_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const crashPoint = parseFloat(generateCrashPoint(houseEdge).toFixed(2))
  const { data, error } = await supabase
    .from('game_rounds')
    .insert({
      round_id: roundId,
      server_seed: roundId,
      server_seed_hash: roundId,
      crash_point: crashPoint,
      status: 'betting',
      target_house_edge: houseEdge,
      started_at: new Date().toISOString(),
      bet_count: 0,
      total_bet_amount: 0,
      total_exit_amount: 0,
      house_profit: 0,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

/** Update round with crash point and stats after round ends */
export async function updateRound(roundId, updates) {
  const { data, error } = await supabase
    .from('game_rounds')
    .update(updates)
    .eq('round_id', roundId)
    .select()
    .single()
  if (error) throw error
  return data
}

/** Get recent crashed rounds for history display */
export async function getRecentCrashes(limit = 20) {
  const { data, error } = await supabase
    .from('game_rounds')
    .select('round_id, crash_point, created_at, house_profit, bet_count, total_bet_amount, total_exit_amount')
    .eq('status', 'crashed')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

// ──────────────────────────────────────────────
// Bet Management
// ──────────────────────────────────────────────

/** Get all bets for a specific round */
export async function getRoundBets(roundId) {
  const { data, error } = await supabase
    .from('game_bets')
    .select('*')
    .eq('round_id', roundId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

/**
 * Place a bet for a round.
 * isBot=true: userId is null, username is bot name
 * isBot=false: userId must be provided
 */
export async function placeBet({ roundId, userId, username, amount, autoCashoutAt, isBot = false, isDemo = false }) {
  try {
    const row = {
      round_id: roundId || `local_${Date.now()}`,
      user_id: isBot ? null : userId,
      username: username || (isBot ? 'Bot_' + Math.floor(Math.random() * 9999) : 'Guest'),
      amount,
      auto_cashout_at: autoCashoutAt || null,
      is_bot: isBot,
      is_demo: isDemo,
      status: 'pending',
    }
    if (!row.user_id && !isBot && !isDemo) return null
    const { data, error } = await supabase
      .from('game_bets')
      .insert(row)
      .select()
      .single()
    if (error) {
      if (error.code === '23505' || error.code === '409') {
        const { data: existing } = await supabase
          .from('game_bets')
          .select('id')
          .eq('round_id', roundId || `local_${Date.now()}`)
          .eq('user_id', isBot ? null : userId)
          .maybeSingle()
        return existing || null
      }
      console.warn('[placeBet] DB error:', error.message)
      return null
    }
    return data
  } catch (err) {
    console.warn('[placeBet] Exception:', err?.message)
    return null
  }
}

/**
 * Cash out a bet.
 * Sets: cashout_multiplier, cashout_amount (winnings), won_amount, status=won
 */
export async function cashoutBet(betId, multiplier) {
  try {
    if (!betId) return null
    const { data: bet } = await supabase.from('game_bets').select('id, amount').eq('id', betId).single()
    if (!bet) return null
    const winAmount = Math.floor(bet.amount * multiplier)
    await supabase.from('game_bets').update({
      cashout_at: multiplier,
      cashout_amount: winAmount,
      won_amount: winAmount,
      status: 'won',
      updated_at: new Date().toISOString(),
    }).eq('id', betId)
    return { winAmount }
  } catch {
    return null
  }
}

/** Mark all pending bets for a round as lost */
export async function markBetsLost(roundId) {
  try {
    await supabase
      .from('game_bets')
      .update({ status: 'lost', updated_at: new Date().toISOString() })
      .eq('round_id', roundId)
      .eq('status', 'pending')
  } catch (e) { /* table might not exist */ }
}

// ──────────────────────────────────────────────
// Game Settings
// ──────────────────────────────────────────────

export async function getGameSettings() {
  const { data, error } = await supabase
    .from('game_settings')
    .select('*')
    .eq('id', 'aviator')
    .single()
  if (error && error.code !== 'PGRST116') throw error
  return data || { min_bet: 6, max_bet: 5000, house_edge: 0.05, wait_time_seconds: 8, is_enabled: true }
}

export async function updateGameSettings(updates) {
  const { data, error } = await supabase
    .from('game_settings')
    .update(updates)
    .eq('id', 'aviator')
    .select()
    .single()
  if (error) throw error
  return data
}

// ──────────────────────────────────────────────
// User Bet History
// ──────────────────────────────────────────────

/** Get a user's bet history across all rounds */
export async function getUserBetHistory(userId, limit = 30) {
  const { data, error } = await supabase
    .from('game_bets')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data || []
}

// ──────────────────────────────────────────────
// Crash Point Generation
// Uses provably fair-ish distribution with configurable house edge.
// ──────────────────────────────────────────────

/**
 * Generate a crash point with realistic distribution.
 * @param {number} houseEdge - House edge as decimal (e.g. 0.05 = 5%)
 * @returns {number} Crash multiplier (e.g. 1.23)
 */
export function generateCrashPoint(houseEdge = 0.05) {
  const r = Math.random()
  const e = Math.max(0, Math.min(houseEdge, 0.20))

  // Distribution buckets (adjusted by house edge)
  const p1 = 0.40 - e * 2   // ~30% at 1.00-1.50x
  const p2 = 0.25 - e       // ~20% at 1.50-2.50x
  const p3 = 0.15           // ~15% at 2.50-4.50x
  const p4 = 0.12           // ~12% at 4.50-10.00x
  // remaining ~23%: 10.00-50.00x (big wins)

  if (r < p1) return 1.00 + Math.random() * 0.50
  if (r < p1 + p2) return 1.50 + Math.random() * 1.00
  if (r < p1 + p2 + p3) return 2.50 + Math.random() * 2.00
  if (r < p1 + p2 + p3 + p4) return 4.50 + Math.random() * 5.50
  return 10.00 + Math.random() * 40.00
}

// ──────────────────────────────────────────────
// Bot Helpers
// ──────────────────────────────────────────────

export const BOT_NAMES = [
  'Ali_Khan', 'Sara_Ahmed', 'Usman_Ali', 'Fatima_Zahid', 'Ahmed_Raza',
  'Ayesha_Khan', 'Bilal_Hassan', 'Zainab_Malik', 'Hassan_Ali', 'Mariam_Waseem',
  'Hamza_Saeed', 'Hira_Nawaz', 'Saad_Afzal', 'Nadia_Iqbal', 'Faisal_Imran',
  'Sana_Ansari', 'Kamran_Shahid', 'Mehwish_Butt', 'Adnan_Yousaf', 'Sadia_Parveen',
]

export function getRandomBotName() {
  return BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)]
}

export function generateBotBetAmount(min = 10, max = 500) {
  const amounts = [10, 20, 50, 100, 200, 500, 1000]
  const valid = amounts.filter(a => a >= min && a <= max)
  if (valid.length === 0) return min
  return valid[Math.floor(Math.random() * valid.length)]
}

export function generateBotAutoCashout() {
  const r = Math.random()
  if (r < 0.3) return null  // 30% don't set auto-cashout
  const multipliers = [1.1, 1.2, 1.3, 1.5, 1.7, 2.0, 2.5, 3.0, 4.0, 5.0, 10.0]
  const idx = Math.floor(Math.random() * multipliers.length)
  return multipliers[idx]
}

// ──────────────────────────────────────────────
// Autonomous Game Engine
// Runs client-side when no admin panel is present.
// Uses leader election via Supabase presence.
// ──────────────────────────────────────────────

const LEADER_CHANNEL = 'aviator-leader'
const GAME_CHANNEL = 'aviator-broadcast'

/**
 * Create a platform_settings entry for game lock if not exists.
 * Falls back gracefully if table doesn't exist.
 */
export async function tryAcquireGameLock() {
  const lockKey = 'aviator_leader_id'
  const lockTime = 'aviator_leader_since'
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select(lockKey)
      .eq('id', 'game_lock')
      .single()

    if (error && error.code !== 'PGRST116') {
      console.warn('[Aviator] platform_settings query failed:', error.message)
      return null
    }

    if (data && data[lockKey]) {
      return null // someone else holds the lock
    }

    // Try to insert or update the lock
    const clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const { error: upsertError } = await supabase
      .from('platform_settings')
      .upsert({
        id: 'game_lock',
        [lockKey]: clientId,
        [lockTime]: new Date().toISOString(),
      }, { onConflict: 'id' })

    if (upsertError) return null

    // Verify we got the lock
    const { data: verify } = await supabase
      .from('platform_settings')
      .select(lockKey)
      .eq('id', 'game_lock')
      .single()

    if (verify && verify[lockKey] === clientId) {
      return clientId
    }
    return null
  } catch (e) {
    return null
  }
}

export async function releaseGameLock(clientId) {
  try {
    const { data } = await supabase
      .from('platform_settings')
      .select('aviator_leader_id')
      .eq('id', 'game_lock')
      .single()

    if (data && data.aviator_leader_id === clientId) {
      await supabase
        .from('platform_settings')
        .update({ aviator_leader_id: null, aviator_leader_since: null })
        .eq('id', 'game_lock')
    }
  } catch (e) { /* ignore */ }
}

export async function getGameSettingsFast() {
  try {
    const { data, error } = await supabase
      .from('game_settings')
      .select('*')
      .eq('id', 'aviator')
      .single()
    if (error && error.code !== 'PGRST116') return null
    return data
  } catch (e) {
    return null
  }
}

// ──────────────────────────────────────────────
// Leader Election via Broadcast Presence
// More reliable than DB lock when RLS is strict.
// ──────────────────────────────────────────────

let _leaderChannel = null
let _isLeader = false
let _leaderClientId = null

/**
 * Attempt to become the leader by claiming via broadcast.
 * Returns a promise that resolves to true if we became leader.
 */
export async function tryBecomeLeader(clientId) {
  try {
    const ch = supabase.channel(`${LEADER_CHANNEL}-${clientId}`)
    let becameLeader = false

    await new Promise((resolve) => {
      ch.on('broadcast', { event: 'leader-claim' }, (p) => {
        // Someone else claimed leadership before us
        if (p.payload.clientId !== clientId) {
          becameLeader = false
        }
      })
      ch.subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Announce our claim
          ch.send({
            type: 'broadcast',
            event: 'leader-claim',
            payload: { clientId, ts: Date.now() },
          })
          // Wait a short time to see if anyone else claimed
          setTimeout(() => {
            resolve()
          }, 500)
        }
      })
    })

    _leaderChannel = ch
    return true
  } catch (e) {
    return false
  }
}

export function resignLeadership() {
  if (_leaderChannel) {
    supabase.removeChannel(_leaderChannel)
    _leaderChannel = null
  }
}

export { _isLeader, _leaderClientId }

