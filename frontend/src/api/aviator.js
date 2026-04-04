/**
 * Aviator API Layer
 * Uses Supabase Realtime for real-time game sync
 */

import { supabaseAnon as supabase, supabaseAdmin } from '../lib/supabase'

// ──────────────────────────────────────────────
// Supabase Realtime Game State
// ──────────────────────────────────────────────

let realtimeChannel = null

export function subscribeToGameState(onGameState, onBetsUpdate, onSettingsUpdate) {
  // First, get current state from DB
  fetchGameState().then(state => {
    if (state && onGameState) {
      onGameState({
        type: 'game_state',
        phase: state.phase,
        mult: parseFloat(state.multiplier),
        countdown: parseFloat(state.countdown),
        crash_point: parseFloat(state.crash_point),
        roundId: state.round_id,
      })
    }
  })

  // Subscribe to realtime changes
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel)
  }

  realtimeChannel = supabase.channel('aviator-game')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'aviator_game_state'
    }, (payload) => {
      console.log('[Supabase] Game state changed:', payload)
      if (onGameState && payload.new) {
        onGameState({
          type: 'game_state',
          phase: payload.new.phase,
          mult: parseFloat(payload.new.multiplier),
          countdown: parseFloat(payload.new.countdown),
          crash_point: parseFloat(payload.new.crash_point),
          roundId: payload.new.round_id,
        })
      }
    })
    .subscribe((status) => {
      console.log('[Supabase] Realtime subscription status:', status)
    })

  return () => {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel)
      realtimeChannel = null
    }
  }
}

export async function fetchGameState() {
  try {
    const { data, error } = await supabase
      .from('aviator_game_state')
      .select('*')
      .eq('id', 'current')
      .single()

    if (error) throw error
    return data
  } catch (e) {
    console.error('[Supabase] Failed to fetch game state:', e)
    return null
  }
}

export async function fetchCrashHistory() {
  try {
    const { data, error } = await supabase
      .from('aviator_crash_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) throw error
    return data || []
  } catch (e) {
    console.error('[Supabase] Failed to fetch crash history:', e)
    return []
  }
}

export async function fetchSettings() {
  try {
    const { data, error } = await supabase
      .from('aviator_settings')
      .select('*')
      .eq('id', 'config')
      .single()

    if (error) throw error
    return data
  } catch (e) {
    console.error('[Supabase] Failed to fetch settings:', e)
    return null
  }
}

// ──────────────────────────────────────────────
// Admin Controls via Supabase Functions
// ──────────────────────────────────────────────

export async function adminForceCrash() {
  try {
    const { data, error } = await supabase.functions.invoke('aviator-game-engine', {
      body: { action: 'force_crash' }
    })
    if (error) throw error
    return data
  } catch (e) {
    console.error('[Admin] Failed to force crash:', e)
    return { success: false, error: e.message }
  }
}

export async function adminNewRound() {
  try {
    const { data, error } = await supabase.functions.invoke('aviator-game-engine', {
      body: { action: 'new_round' }
    })
    if (error) throw error
    return data
  } catch (e) {
    console.error('[Admin] Failed to start new round:', e)
    return { success: false, error: e.message }
  }
}

export async function adminUpdateSettings(settings) {
  try {
    const { data, error } = await supabase
      .from('aviator_settings')
      .update({
        house_edge: settings.houseEdge,
        he_mode: settings.heMode,
        wait_time_seconds: settings.waitTimeSeconds,
        updated_at: new Date().toISOString()
      })
      .eq('id', 'config')
      .select()
      .single()

    if (error) throw error
    return { success: true, settings: data }
  } catch (e) {
    console.error('[Admin] Failed to update settings:', e)
    return { success: false, error: e.message }
  }
}

// ──────────────────────────────────────────────
// Place Bet (User)
// ──────────────────────────────────────────────

export async function placeBetBackend(betData) {
  try {
    const { data, error } = await supabase
      .from('game_bets')
      .insert({
        round_id: betData.roundId,
        user_id: betData.userId,
        username: betData.username,
        amount: betData.amount,
        auto_cashout_at: betData.autoCashout || null,
        status: 'pending'
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, bet: data }
  } catch (e) {
    console.error('[Bet] Failed to place bet:', e)
    return { success: false, error: e.message }
  }
}

export async function cashoutBackend(betId, multiplier) {
  try {
    const winAmount = Math.floor(multiplier * 100)
    
    const { data, error } = await supabase
      .from('game_bets')
      .update({
        status: 'won',
        cashout_at: multiplier,
        cashout_multiplier: multiplier,
        cashout_amount: winAmount,
        won_amount: winAmount,
        updated_at: new Date().toISOString()
      })
      .eq('id', betId)
      .select()
      .single()

    if (error) throw error
    return { success: true, winAmount, multiplier }
  } catch (e) {
    console.error('[Cashout] Failed:', e)
    return { success: false, error: e.message }
  }
}

// ──────────────────────────────────────────────
// Legacy/Compatibility Exports
// ──────────────────────────────────────────────

export function connectWebSocket(onGameState, onBetsUpdate, onSettingsUpdate) {
  return subscribeToGameState(onGameState, onBetsUpdate, onSettingsUpdate)
}

export function disconnectWebSocket() {
  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel)
    realtimeChannel = null
  }
}

export function sendWSMessage() { return false }

export async function getBackendGameState() { return fetchGameState() }
export async function requestBackendCrash() { return adminForceCrash() }
export async function updateBackendSettings(settings) { return adminUpdateSettings(settings) }

export async function getHouseEdgePool() {
  try {
    const { data, error } = await supabase
      .from('aviator_house_pool')
      .select('*')
      .eq('id', 'pool')
      .single()
    if (error) throw error
    return data
  } catch {
    return { total_bets: 0, total_winnings: 0, house_profit: 0 }
  }
}

export const BOT_NAMES = [
  'Ali_Khan', 'Sara_Ahmed', 'Usman_Ali', 'Fatima_Zahid', 'Ahmed_Raza',
  'Ayesha_Khan', 'Bilal_Hassan', 'Zainab_Malik', 'Hassan_Ali', 'Mariam_Waseem',
  'Hamza_Saeed', 'Hira_Nawaz', 'Saad_Afzal', 'Nadia_Iqbal', 'Faisal_Imran',
  'Sana_Ansari', 'Kamran_Shahid', 'Mehwish_Butt', 'Adnan_Yousaf', 'Sadia_Parveen',
]

export function generateCrashPoint(houseEdge = 0.05) {
  const r = Math.random()
  const e = Math.max(0, Math.min(houseEdge, 0.20))
  const p1 = 0.40 - e * 2
  const p2 = 0.25 - e
  const p3 = 0.15
  const p4 = 0.12

  if (r < p1) return 1.00 + Math.random() * 0.50
  if (r < p1 + p2) return 1.50 + Math.random() * 1.00
  if (r < p1 + p2 + p3) return 2.50 + Math.random() * 2.00
  if (r < p1 + p2 + p3 + p4) return 4.50 + Math.random() * 5.50
  return 10.00 + Math.random() * 40.00
}

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
  if (Math.random() < 0.3) return null
  const multipliers = [1.1, 1.2, 1.3, 1.5, 1.7, 2.0, 2.5, 3.0]
  return multipliers[Math.floor(Math.random() * multipliers.length)]
}

// Legacy no-op functions for compatibility
export function subscribeToGameBroadcast() { return null }
export function subscribeToRoundBroadcast() { return null }
export function subscribeToRoundBets() { return null }
export function unsubscribe() {}
export async function broadcastMultiplier() {}
export async function broadcastCrash() {}
export function setManualCrash() {}
export function getManualCrash() { return false }
export function clearManualCrash() {}
export function setGameSettings() {}
export function getGameSettingsLocal() { return null }
export function getHeMode() { return 'off' }
export function broadcastLiveHE() {}
export async function broadcastGameState() {}
export async function getSettingsFromDB() { return null }
export async function checkManualCrash() { return false }
export async function broadcastLiveHEMetrics() {}
export async function getLiveHEMetrics() { return null }
export async function updateHouseEdgePool() {}
export async function recordDeposit() {}
export async function recordWithdrawal() {}
export async function getPendingWithdrawalQueue() { return [] }
export async function getHouseEdgeAlerts() { return [] }
export async function queueWithdrawal() {}
export async function getCurrentRound() { return null }
export async function getLatestCrashedRound() { return null }
export async function createRound() { return null }
export async function updateRound() { return null }
export async function getRecentCrashes() { return [] }
export async function getRoundBets() { return [] }
export async function placeBet() { return null }
export async function cashoutBet() { return null }
export async function markBetsLost() {}
export async function getGameSettings() { return null }
export async function updateGameSettings() { return null }
export async function getUserBetHistory() { return [] }
export async function tryAcquireGameLock() { return null }
export async function releaseGameLock() {}
export async function getGameSettingsFast() { return null }
export async function tryBecomeLeader() { return false }
export function resignLeadership() {}