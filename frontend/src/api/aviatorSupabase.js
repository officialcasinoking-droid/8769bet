/**
 * Aviator Game API - Supabase Realtime Integration
 * Single source of truth for game state via Supabase
 * Both users and admin subscribe to the same channel for perfect sync
 */

import { supabaseAnon as supabase } from '../lib/supabase'

// ──────────────────────────────────────────────
// Realtime Subscriptions
// ──────────────────────────────────────────────

let gameChannel = null
let betsChannel = null
let settingsChannel = null

/**
 * Subscribe to game state changes
 * Called by both user game and admin panel
 */
export function subscribeToGameState(onGameState, onBetsUpdate, onSettingsUpdate) {
  // Get current state immediately
  fetchGameState().then(state => {
    if (state && onGameState) {
      onGameState({
        type: 'game_state',
        phase: state.phase,
        mult: parseFloat(state.multiplier || 1.00),
        countdown: parseFloat(state.countdown || 8.00),
        crash_point: state.crash_point ? parseFloat(state.crash_point) : null,
        roundId: state.round_id,
      })
    }
  })

  // Subscribe to game state changes
  if (gameChannel) {
    supabase.removeChannel(gameChannel)
  }

  gameChannel = supabase
    .channel('aviator-game-state')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'aviator_game_state',
        filter: 'id=eq.current'
      },
      (payload) => {
        console.log('[Supabase] Game state changed:', payload)
        if (onGameState && payload.new) {
          onGameState({
            type: 'game_state',
            phase: payload.new.phase,
            mult: parseFloat(payload.new.multiplier || 1.00),
            countdown: parseFloat(payload.new.countdown || 0),
            crash_point: payload.new.crash_point ? parseFloat(payload.new.crash_point) : null,
            roundId: payload.new.round_id,
          })
        }
      }
    )
    .subscribe((status) => {
      console.log('[Supabase] Game state subscription:', status)
    })

  // Subscribe to bets changes
  if (betsChannel) {
    supabase.removeChannel(betsChannel)
  }

  betsChannel = supabase
    .channel('aviator-bets')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'player_bets'
      },
      async (payload) => {
        if (onBetsUpdate) {
          const bets = await fetchCurrentBets()
          onBetsUpdate(bets)
        }
      }
    )
    .subscribe((status) => {
      console.log('[Supabase] Bets subscription:', status)
    })

  // Subscribe to settings changes
  if (settingsChannel) {
    supabase.removeChannel(settingsChannel)
  }

  settingsChannel = supabase
    .channel('aviator-settings')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'aviator_settings',
        filter: 'id=eq.config'
      },
      (payload) => {
        console.log('[Supabase] Settings updated:', payload)
        if (onSettingsUpdate && payload.new) {
          onSettingsUpdate(payload.new)
        }
      }
    )
    .subscribe((status) => {
      console.log('[Supabase] Settings subscription:', status)
    })

  // Cleanup function
  return () => {
    unsubscribeAll()
  }
}

/**
 * Unsubscribe from all channels
 */
export function unsubscribeAll() {
  if (gameChannel) {
    supabase.removeChannel(gameChannel)
    gameChannel = null
  }
  if (betsChannel) {
    supabase.removeChannel(betsChannel)
    betsChannel = null
  }
  if (settingsChannel) {
    supabase.removeChannel(settingsChannel)
    settingsChannel = null
  }
}

// ──────────────────────────────────────────────
// Fetch Functions
// ──────────────────────────────────────────────

/**
 * Get current game state from database
 */
export async function fetchGameState() {
  try {
    const { data, error } = await supabase
      .from('aviator_game_state')
      .select('*')
      .eq('id', 'current')
      .single()

    if (error) {
      console.warn('[Supabase] No game state found:', error.message)
      return null
    }
    return data
  } catch (error) {
    console.error('[Supabase] Failed to fetch game state:', error)
    return null
  }
}

/**
 * Get current round bets
 */
export async function fetchCurrentBets() {
  try {
    const gameState = await fetchGameState()
    if (!gameState) return []

    const { data, error } = await supabase
      .from('player_bets')
      .select('*')
      .eq('round_id', gameState.round_id)
      .order('created_at', { ascending: true })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('[Supabase] Failed to fetch bets:', error)
    return []
  }
}

/**
 * Get crash history
 */
export async function fetchCrashHistory() {
  try {
    const { data, error } = await supabase
      .from('aviator_crash_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('[Supabase] Failed to fetch crash history:', error)
    return []
  }
}

/**
 * Get game settings
 */
export async function fetchSettings() {
  try {
    const { data, error } = await supabase
      .from('aviator_settings')
      .select('*')
      .eq('id', 'config')
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('[Supabase] Failed to fetch settings:', error)
    return null
  }
}

/**
 * Get admin wallet stats
 */
export async function fetchAdminWallet() {
  try {
    const { data, error } = await supabase
      .from('admin_wallet')
      .select('*')
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('[Supabase] Failed to fetch admin wallet:', error)
    return null
  }
}

// ──────────────────────────────────────────────
// Player Actions
// ──────────────────────────────────────────────

/**
 * Place a bet
 */
export async function placeBet(betData) {
  try {
    const { userId, username, amount, autoCashout, betNumber = 1 } = betData
    
    const gameState = await fetchGameState()
    if (!gameState || gameState.phase !== 'betting') {
      return { success: false, error: 'Game is not in betting phase' }
    }

    const { data, error } = await supabase
      .from('player_bets')
      .insert({
        round_id: gameState.round_id,
        user_id: userId,
        username,
        bet_number: betNumber,
        amount,
        auto_cashout: autoCashout || null,
        cashed_out: false,
        win_amount: 0,
        status: 'pending',
        is_bot: false
      })
      .select()
      .single()

    if (error) throw error

    // Deduct from user balance (handled by backend or edge function)
    // This should be done in a transaction in production

    return { success: true, bet: data }
  } catch (error) {
    console.error('[Supabase] Failed to place bet:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Cash out a bet
 */
export async function cashoutBet(userId, betNumber) {
  try {
    const gameState = await fetchGameState()
    if (!gameState || gameState.phase !== 'flying') {
      return { success: false, error: 'Game is not flying' }
    }

    // Find the bet
    const { data: bet, error: betError } = await supabase
      .from('player_bets')
      .select('*')
      .eq('user_id', userId)
      .eq('bet_number', betNumber)
      .eq('round_id', gameState.round_id)
      .eq('cashed_out', false)
      .single()

    if (betError || !bet) {
      return { success: false, error: 'No active bet found' }
    }

    const winAmount = Math.floor(bet.amount * gameState.multiplier)

    // Update bet
    const { error: updateError } = await supabase
      .from('player_bets')
      .update({
        cashed_out: true,
        cashout_multiplier: gameState.multiplier,
        win_amount: winAmount,
        status: 'won',
        updated_at: new Date().toISOString()
      })
      .eq('id', bet.id)

    if (updateError) throw updateError

    // Update user balance
    const { data: user } = await supabase
      .from('users')
      .select('balance')
      .eq('id', userId)
      .single()

    if (user) {
      await supabase
        .from('users')
        .update({ balance: user.balance + winAmount })
        .eq('id', userId)
    }

    return { success: true, winAmount, multiplier: gameState.multiplier }
  } catch (error) {
    console.error('[Supabase] Failed to cash out:', error)
    return { success: false, error: error.message }
  }
}

// ──────────────────────────────────────────────
// Admin Controls
// ──────────────────────────────────────────────

/**
 * Admin: Force crash the current round
 */
export async function adminForceCrash() {
  try {
    // Method 1: Via Edge Function (preferred for production)
    const { data, error } = await supabase.functions.invoke('aviator-game-engine', {
      body: { action: 'force_crash' }
    })

    if (error) {
      console.warn('[Edge Function] Force crash failed, using fallback:', error)
      // Fallback: Write to admin signals table
      return await adminSignalForceCrash()
    }

    return data
  } catch (error) {
    console.error('[Admin] Force crash error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Fallback: Force crash via admin signals table
 */
async function adminSignalForceCrash() {
  try {
    const { data, error } = await supabase
      .from('aviator_admin_signals')
      .upsert({
        id: 'control',
        action: 'force_crash',
        processed: false,
        updated_at: new Date().toISOString()
      })

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('[Admin] Signal force crash error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Admin: Start new round immediately
 */
export async function adminNewRound() {
  try {
    const { data, error } = await supabase.functions.invoke('aviator-game-engine', {
      body: { action: 'new_round' }
    })

    if (error) {
      console.warn('[Edge Function] New round failed, using fallback:', error)
      return await adminSignalNewRound()
    }

    return data
  } catch (error) {
    console.error('[Admin] New round error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Fallback: New round via admin signals table
 */
async function adminSignalNewRound() {
  try {
    const { data, error } = await supabase
      .from('aviator_admin_signals')
      .upsert({
        id: 'control',
        action: 'new_round',
        processed: false,
        updated_at: new Date().toISOString()
      })

    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('[Admin] Signal new round error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Admin: Update game settings
 */
export async function adminUpdateSettings(settings) {
  try {
    const { data, error } = await supabase
      .from('aviator_settings')
      .update({
        house_edge: settings.houseEdge,
        he_mode: settings.heMode,
        he_target_pct: settings.heTargetPct,
        he_min_secs: settings.heMinSecs,
        he_max_secs: settings.heMaxSecs,
        auto_target_secs: settings.autoTargetSecs,
        wait_time_seconds: settings.waitTimeSeconds,
        updated_at: new Date().toISOString()
      })
      .eq('id', 'config')
      .select()
      .single()

    if (error) throw error
    return { success: true, settings: data }
  } catch (error) {
    console.error('[Admin] Update settings error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Admin: Pause game
 */
export async function adminPause() {
  try {
    const { data, error } = await supabase.functions.invoke('aviator-game-engine', {
      body: { action: 'pause' }
    })

    if (error) throw error
    return data
  } catch (error) {
    console.error('[Admin] Pause error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Admin: Resume game
 */
export async function adminResume() {
  try {
    const { data, error } = await supabase.functions.invoke('aviator-game-engine', {
      body: { action: 'resume' }
    })

    if (error) throw error
    return data
  } catch (error) {
    console.error('[Admin] Resume error:', error)
    return { success: false, error: error.message }
  }
}

// ──────────────────────────────────────────────
// Utility Functions
// ──────────────────────────────────────────────

/**
 * Generate crash point (provably fair)
 * Used for verification only, not for game logic
 */
export function generateCrashPoint(serverSeed, clientSeed) {
  // Implementation of provably fair algorithm
  // This should match the server-side implementation
  const hash = serverSeed + clientSeed
  // Simplified version - real implementation should use HMAC
  const h = parseInt(hash.substring(0, 13), 16)
  const e = Math.pow(2, 52)
  return Math.floor((100 * e - h) / (e - h)) / 100
}

/**
 * Get user's bet history
 */
export async function getUserBetHistory(userId, limit = 50) {
  try {
    const { data, error } = await supabase
      .from('player_bets')
      .select('*, game_rounds(crash_point, created_at)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('[Supabase] Failed to fetch user bet history:', error)
    return []
  }
}

/**
 * Get current stats for display
 */
export async function getGameStats() {
  try {
    const wallet = await fetchAdminWallet()
    const crashHistory = await fetchCrashHistory()
    
    return {
      wallet,
      crashHistory,
      totalRounds: wallet?.rounds_played || 0,
      houseEdgeEarned: wallet?.house_edge_earned || 0
    }
  } catch (error) {
    console.error('[Supabase] Failed to fetch stats:', error)
    return null
  }
}
