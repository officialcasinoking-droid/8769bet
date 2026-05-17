/**
 * Aviator Game Engine
 * Runs on the backend server. Manages game rounds, crash points, and broadcasts state via WebSocket.
 * All clients (users + admin) connect to this WebSocket and receive synchronized game state.
 */

import { WebSocketServer } from 'ws'
import { supabase } from './lib/supabase.js'

let supabaseAvailable = true

// ── Game Configuration ───────────────────────────────────────
const WAIT_TIME_SECONDS = 8
const TICK_INTERVAL_MS = 50
const CRASH_DELAY_MS = 3000
const STATE_BROADCAST_MS = 150
const SAVE_INTERVAL_MS = 5000

// ── Game State ───────────────────────────────────────────────
let gameState = {
  phase: 'betting', // 'betting' | 'flying' | 'crashed'
  mult: 1.00,
  countdown: WAIT_TIME_SECONDS,
  crashPoint: 0,
  startTime: 0,
  crashedAt: 0,
  roundId: '',
}

// ── Settings ─────────────────────────────────────────────────
let settings = {
  houseEdge: 0.05,
  heMode: 'off', // 'off' | 'smart' | 'aggressive'
  heTargetPct: 5,
  heMinSecs: 3,
  heMaxSecs: 50,
  autoTargetSecs: 8,
}

// ── Bets for Current Round ───────────────────────────────────
let currentBets = []

// ── Crash History ────────────────────────────────────────────
let crashHistory = []

// ── Bot Configuration ──────────────────────────────────────────
const BOT_NAMES = [
  'Ali_Khan', 'Sara_Ahmed', 'Usman_Ali', 'Fatima_Zahid', 'Ahmed_Raza',
  'Ayesha_Khan', 'Bilal_Hassan', 'Zainab_Malik', 'Hassan_Ali', 'Mariam_Waseem',
  'Hamza_Saeed', 'Hira_Nawaz', 'Saad_Afzal', 'Nadia_Iqbal', 'Faisal_Imran',
  'Sana_Ansari', 'Kamran_Shahid', 'Mehwish_Butt', 'Adnan_Yousaf', 'Sadia_Parveen',
]
const BOT_BET_MIN = 6
const BOT_BET_MAX = 500
const BOT_COUNT = 15
const AUTO_CASHOUT_VALUES = [1.1, 1.2, 1.3, 1.5, 1.7, 2.0, 2.5, 3.0, 4.0, 5.0, 10.0]

// ── House Edge Tracking ───────────────────────────────────────
let houseEdgePool = {
  totalBets: 0,
  totalWinnings: 0,
  houseEdgeAmount: 0,
  roundsPlayed: 0,
}

function updateHouseEdgeStats() {
  const realBets = currentBets.filter(b => !b.is_bot)
  const pendingBets = realBets.filter(b => b.status === 'pending' || b.status === 'lost')
  const wonBets = realBets.filter(b => b.status === 'won')

  const roundBetAmount = realBets.reduce((sum, b) => sum + b.amount, 0)
  const roundWinnings = wonBets.reduce((sum, b) => sum + (b.winAmount || 0), 0)

  if (realBets.length > 0) {
    houseEdgePool.totalBets += roundBetAmount
    houseEdgePool.totalWinnings += roundWinnings
    const pendingAmount = pendingBets.reduce((sum, b) => sum + b.amount, 0)
    const heFromRound = pendingAmount * 0.05
    houseEdgePool.houseEdgeAmount += heFromRound
  }
  houseEdgePool.roundsPlayed++

  // Persist house edge to DB
  persistHouseEdgeStats()
}

async function persistHouseEdgeStats() {
  if (!supabaseAvailable) return
  try {
    await supabase
      .from('house_edge_stats')
      .upsert({
        id: 'main',
        total_bets: houseEdgePool.totalBets,
        total_winnings: houseEdgePool.totalWinnings,
        house_edge_amount: houseEdgePool.houseEdgeAmount,
        rounds_played: houseEdgePool.roundsPlayed,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })
  } catch (e) {
    console.error('[House Edge] Failed to persist:', e.message)
  }
}

async function creditUserBalance(userId, winAmount, bet) {
  try {
    const { data: user } = await supabase
      .from('users')
      .select('balance')
      .eq('id', userId)
      .single()

    if (user) {
      const currentBalance = Number(user.balance) || 0
      await supabase
        .from('users')
        .update({ balance: currentBalance + winAmount, updated_at: new Date().toISOString() })
        .eq('id', userId)
    }

    if (bet) {
      await supabase
        .from('aviator_bets')
        .update({
          cashed_out: true,
          cashout_multiplier: bet.cashoutMult,
          win_amount: bet.winAmount,
          status: 'won',
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('round_id', gameState.roundId)
        .eq('bet_number', bet.betNum)
        .eq('cashed_out', false)
    }
  } catch (e) {
    console.error('[creditUserBalance] DB error:', e.message)
  }
}

async function loadHouseEdgeStats() {
  if (!supabaseAvailable) return
  try {
    const { data } = await supabase
      .from('house_edge_stats')
      .select('*')
      .eq('id', 'main')
      .single()
    if (data) {
      houseEdgePool.totalBets = Number(data.total_bets) || 0
      houseEdgePool.totalWinnings = Number(data.total_winnings) || 0
      houseEdgePool.houseEdgeAmount = Number(data.house_edge_amount) || 0
      houseEdgePool.roundsPlayed = Number(data.rounds_played) || 0
    }
  } catch (e) {
    console.error('[House Edge] Failed to load:', e.message)
  }
}

function generateBotBetAmount() {
  const amounts = [6, 10, 20, 50, 100, 200, 500]
  return amounts[Math.floor(Math.random() * amounts.length)]
}

function generateBotAutoCashout() {
  if (Math.random() < 0.3) return null
  return AUTO_CASHOUT_VALUES[Math.floor(Math.random() * AUTO_CASHOUT_VALUES.length)]
}

function getRandomBotName() {
  return BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)]
}

// ── WebSocket Server ─────────────────────────────────────────
let wss = null
const clients = new Set()
let gameLoop = null
let saveInterval = null
let manualCrashRequested = false
let lastStateBroadcast = 0

// ── Crash Point Generation ───────────────────────────────────
function generateCrashPoint(houseEdge = 0.05) {
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

// ── Broadcast to All Clients ─────────────────────────────────
function broadcast(data) {
  const msg = JSON.stringify(data)
  clients.forEach(client => {
    try {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(msg)
      }
    } catch (err) {
      console.error('[Broadcast] Error sending to client:', err.message)
      clients.delete(client)
    }
  })
}

// ── Game State Persistence ────────────────────────────
async function saveGameState() {
  if (!supabaseAvailable) return
  try {
    const stateToSave = {
      id: 'current',
      phase: gameState.phase,
      mult: gameState.mult,
      countdown: gameState.countdown,
      crash_point: gameState.crashPoint,
      round_id: gameState.roundId,
      start_time: new Date(gameState.startTime).toISOString(),
      timestamp: gameState.startTime,
      bets: currentBets,
      settings: settings,
      crash_history: crashHistory.slice(0, 30),
      house_edge_pool: houseEdgePool,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('aviator_game_state')
      .upsert(stateToSave, { onConflict: 'id' })

    if (error) {
      console.error('[GameEngine] Failed to save state:', error.message)
      supabaseAvailable = false
    }
  } catch (err) {
    console.error('[GameEngine] Save state exception:', err.message)
    supabaseAvailable = false
  }
}

async function loadGameState() {
  if (!supabaseAvailable) return false
  try {
    const { data, error } = await supabase
      .from('aviator_game_state')
      .select('*')
      .eq('id', 'current')
      .single()

    if (error || !data) {
      console.log('[GameEngine] No saved state found')
      return false
    }

    const now = Date.now()
    const isBetting = data.phase === 'betting'
    
    // Only restore betting phase - flying/crashed states should start fresh
    if (!isBetting) {
      console.log('[GameEngine] Saved state is not betting, starting fresh')
      return false
    }
    
    const startTime = data.start_time ? new Date(data.start_time).getTime() : data.timestamp || now
    const ageMs = now - startTime
    const isNotExpired = ageMs < 120000

    if (isNotExpired) {
      gameState.phase = 'betting'
      gameState.mult = 1.00
      gameState.crashPoint = data.crash_point || 0
      gameState.roundId = data.round_id || ''
      gameState.startTime = Date.now()
      gameState.countdown = WAIT_TIME_SECONDS
      
      // Keep settings and crash history from saved state
      if (data.settings) Object.assign(settings, data.settings)
      if (data.crash_history) crashHistory = data.crash_history
      if (data.house_edge_pool) Object.assign(houseEdgePool, data.house_edge_pool)
      
      // Clear bets for new round
      currentBets = []

      console.log(`[GameEngine] Restored betting state: round=${gameState.roundId}, age=${Math.round(ageMs/1000)}s`)
      return true
    }

    console.log('[GameEngine] Saved state expired, starting fresh')
    return false
  } catch (err) {
    console.error('[GameEngine] Load state exception:', err.message)
    supabaseAvailable = false
    return false
  }
}

// ── Game Loop ────────────────────────────────────────
function startGameLoop() {
  if (gameLoop) {
    clearInterval(gameLoop)
  }
  if (saveInterval) {
    clearInterval(saveInterval)
  }

  // Start periodic state saving
  saveInterval = setInterval(() => {
    if (gameState.phase !== 'crashed') {
      saveGameState()
    }
  }, SAVE_INTERVAL_MS)

  gameLoop = setInterval(() => {
    try {
      const now = Date.now()

      if (gameState.phase === 'betting') {
        const elapsed = (now - gameState.startTime) / 1000
        const remaining = Math.max(0, WAIT_TIME_SECONDS - elapsed)
        gameState.countdown = parseFloat(remaining.toFixed(1))

        if (now - lastStateBroadcast >= STATE_BROADCAST_MS) {
          lastStateBroadcast = now
          broadcast({
            type: 'game_state',
            phase: 'betting',
            countdown: gameState.countdown,
            roundId: gameState.roundId,
            houseEdge: houseEdgePool,
          })
        }

        if (remaining <= 0) {
          startFlying()
        }
      } else if (gameState.phase === 'flying') {
        const elapsed = (now - gameState.startTime) / 1000
        const mult = parseFloat(Math.pow(Math.E, 0.06 * elapsed).toFixed(2))

        // Check auto-cashouts and track if any changed
        let betsChanged = false
        for (const bet of currentBets) {
          if (!bet.cashedOut && bet.autoCashout && mult >= bet.autoCashout) {
            bet.cashedOut = true
            bet.cashoutMult = parseFloat(bet.autoCashout.toFixed(2))
            bet.winAmount = Math.floor(bet.amount * bet.autoCashout)
            bet.status = 'won'
            betsChanged = true

            // Credit winnings to user balance in DB (always attempt)
            if (!bet.is_bot) {
              creditUserBalance(bet.userId, bet.winAmount, bet)
            }
          }
        }

        // Only broadcast bets when something actually changed
        if (betsChanged) {
          broadcast({ type: 'bets_update', bets: currentBets })
        }

        // Check manual crash
        if (manualCrashRequested) {
          manualCrashRequested = false
          crashRound(mult, 'manual')
          return
        }

        // Check auto house edge
        if (settings.heMode !== 'off') {
          if (elapsed >= settings.heMinSecs && mult >= gameState.crashPoint) {
            crashRound(mult, settings.heMode)
            return
          }
          // Max flight safety
          if (elapsed >= settings.heMaxSecs) {
            crashRound(mult, 'max_time')
            return
          }
        } else {
          // Normal mode - crash at predetermined point
          if (mult >= gameState.crashPoint) {
            crashRound(gameState.crashPoint, 'natural')
            return
          }
        }

        gameState.mult = parseFloat(mult.toFixed(2))

        // Throttle state broadcast to reduce network load
        if (now - lastStateBroadcast >= STATE_BROADCAST_MS) {
          lastStateBroadcast = now
          broadcast({
            type: 'game_state',
            phase: 'flying',
            mult: gameState.mult,
            roundId: gameState.roundId,
            houseEdge: houseEdgePool,
          })
        }
      }
    } catch (err) {
      console.error('[GameLoop] Unhandled error:', err.message, err.stack)
    }
  }, TICK_INTERVAL_MS)
}

function startFlying() {
  try {
    gameState.phase = 'flying'
    gameState.mult = 1.00
    gameState.startTime = Date.now()

    broadcast({
      type: 'game_state',
      phase: 'flying',
      mult: 1.00,
      crashPoint: gameState.crashPoint,
      roundId: gameState.roundId,
      houseEdge: houseEdgePool,
    })
  } catch (err) {
    console.error('[startFlying] Error:', err.message)
  }
}

function crashRound(crashPoint, reason = 'natural') {
  try {
    gameState.phase = 'crashed'
    gameState.crashPoint = parseFloat(crashPoint.toFixed(2))
    gameState.crashedAt = Date.now()

    // Save final state
    saveGameState().catch(err => console.error('[crashRound] Save state error:', err.message))

    // Clear bot bet timeouts
    botBetTimeouts.forEach(clearTimeout)
    botBetTimeouts = []

    // Process auto-cashouts for bots that reached their target
    const now = Date.now()
    const elapsed = (now - gameState.startTime) / 1000
    const currentMult = parseFloat(Math.pow(Math.E, 0.06 * elapsed).toFixed(2))

    currentBets.forEach(bet => {
      if (!bet.cashedOut) {
        if (bet.autoCashout && currentMult >= bet.autoCashout) {
          bet.cashedOut = true
          bet.cashoutMult = currentMult
          bet.winAmount = Math.floor(bet.amount * currentMult)
          bet.status = 'won'
          // Credit winnings (always attempt)
          if (!bet.is_bot) {
            creditUserBalance(bet.userId, bet.winAmount, bet)
          }
        } else {
          bet.status = 'lost'
        }
      }

      // Update bet record in DB (always attempt)
      if (!bet.is_bot) {
        supabase
          .from('aviator_bets')
          .update({
            cashed_out: bet.cashedOut,
            cashout_multiplier: bet.cashoutMult,
            win_amount: bet.winAmount,
            status: bet.status,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', bet.userId)
          .eq('round_id', gameState.roundId)
          .eq('bet_number', bet.betNum)
          .then(({ error }) => {
            if (error) console.error('[crashRound] Failed to update bet:', error.message)
          })
          .catch(e => console.error('[crashRound] Failed to update bet:', e.message))
      }
    })

    // Add to history
    crashHistory.unshift(gameState.crashPoint)
    if (crashHistory.length > 30) crashHistory = crashHistory.slice(0, 30)

    broadcast({
      type: 'game_state',
      phase: 'crashed',
      crash_point: gameState.crashPoint,
      crashPoint: gameState.crashPoint,
      reason,
      roundId: gameState.roundId,
      bets: currentBets,
      houseEdge: houseEdgePool,
    })

    // Update house edge stats
    updateHouseEdgeStats()

    // Start new round after delay
    setTimeout(() => {
      try {
        startNewRound()
      } catch (err) {
        console.error('[crashRound] startNewRound error:', err.message)
      }
    }, 3000)
  } catch (err) {
    console.error('[crashRound] Unhandled error:', err.message, err.stack)
  }
}

function startNewRound() {
  try {
    currentBets = []
    gameState.roundId = `r_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    gameState.phase = 'betting'
    gameState.countdown = WAIT_TIME_SECONDS
    gameState.startTime = Date.now()
    gameState.crashPoint = generateCrashPoint(settings.houseEdge)

    broadcast({
      type: 'game_state',
      phase: 'betting',
      countdown: WAIT_TIME_SECONDS,
      roundId: gameState.roundId,
      houseEdge: houseEdgePool,
    })

    // Schedule bot bets during betting phase
    scheduleBotBets()
  } catch (err) {
    console.error('[startNewRound] Error:', err.message, err.stack)
  }
}

let botBetTimeouts = []

function scheduleBotBets() {
  // Clear previous bot bet timeouts
  botBetTimeouts.forEach(clearTimeout)
  botBetTimeouts = []

  if (gameState.phase !== 'betting') return

  // Vary bot count between 10-15
  const botCount = Math.floor(Math.random() * 6) + 10

  // Generate bot bets with random delays
  for (let i = 0; i < botCount; i++) {
    const delay = Math.random() * WAIT_TIME_SECONDS * 800
    const timeout = setTimeout(() => {
      if (gameState.phase === 'betting') {
        const bet = {
          id: `bot_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          userId: null,
          username: getRandomBotName(),
          amount: generateBotBetAmount(),
          autoCashout: generateBotAutoCashout(),
          cashedOut: false,
          cashoutMult: null,
          winAmount: 0,
          status: 'pending',
          is_bot: true,
        }
        currentBets.push(bet)
        broadcast({ type: 'bets_update', bets: currentBets })
      }
    }, delay)
    botBetTimeouts.push(timeout)
  }
}

// ── Bet Handling ─────────────────────────────────────────────
async function placeBet(betData) {
  if (gameState.phase !== 'betting') {
    return { success: false, error: 'Game is not in betting phase' }
  }

  const { userId, username, amount, autoCashout, betNumber } = betData

  if (!userId || !amount || amount <= 0) {
    return { success: false, error: 'Invalid bet data' }
  }

  // Check and deduct balance from DB (always attempt, regardless of supabaseAvailable)
  try {
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('balance')
      .eq('id', userId)
      .single()

    if (fetchError || !user) {
      return { success: false, error: 'User not found' }
    }

    const currentBalance = Number(user.balance) || 0
    if (currentBalance < amount) {
      return { success: false, error: 'Insufficient balance' }
    }

    // Deduct balance
    const { error: updateError } = await supabase
      .from('users')
      .update({ balance: currentBalance - amount, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (updateError) {
      console.error('[placeBet] Balance update error:', updateError.message)
      return { success: false, error: 'Failed to update balance' }
    }
  } catch (e) {
    console.error('[placeBet] DB error:', e.message)
    return { success: false, error: 'Database error' }
  }

  const bet = {
    id: `bet_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId,
    username: username || 'Unknown',
    amount,
    autoCashout: autoCashout || null,
    cashedOut: false,
    cashoutMult: null,
    winAmount: 0,
    status: 'pending',
    betNum: betNumber || 1,
    is_bot: !userId || userId.startsWith('bot_'),
  }

  currentBets.push(bet)

  // Save bet to DB
  try {
    await supabase.from('aviator_bets').insert({
      user_id: userId,
      username: bet.username,
      round_id: gameState.roundId,
      bet_number: bet.betNum,
      amount: bet.amount,
      auto_cashout: bet.autoCashout,
      cashed_out: false,
      win_amount: 0,
      status: 'pending',
      is_bot: bet.is_bot
    })
  } catch (e) {
    console.error('[placeBet] Failed to save bet:', e.message)
  }

  // Broadcast updated bets
  broadcast({
    type: 'bets_update',
    bets: currentBets,
  })

  return { success: true, bet }
}

async function cashoutBet(userId, betNum) {
  if (gameState.phase !== 'flying') {
    return { success: false, error: 'Game is not flying' }
  }

  // Find the bet
  const bet = currentBets.find(b => b.userId === userId && b.betNum === betNum && !b.cashedOut)
  if (!bet) {
    return { success: false, error: 'No active bet found' }
  }

  // Cash out
  bet.cashedOut = true
  bet.cashoutMult = gameState.mult
  bet.winAmount = Math.floor(bet.amount * gameState.mult)
  bet.status = 'won'

  // Credit winnings to user balance in DB (always attempt)
  try {
    const { data: user } = await supabase
      .from('users')
      .select('balance')
      .eq('id', userId)
      .single()

    if (user) {
      const currentBalance = Number(user.balance) || 0
      await supabase
        .from('users')
        .update({ balance: currentBalance + bet.winAmount, updated_at: new Date().toISOString() })
        .eq('id', userId)
    }

    // Update bet record in DB
    await supabase
      .from('aviator_bets')
      .update({
        cashed_out: true,
        cashout_multiplier: bet.cashoutMult,
        win_amount: bet.winAmount,
        status: 'won',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('round_id', gameState.roundId)
      .eq('bet_number', betNum)
      .eq('cashed_out', false)
  } catch (e) {
    console.error('[cashoutBet] DB error:', e.message)
  }

  // Broadcast updated bets
  broadcast({
    type: 'bets_update',
    bets: currentBets,
  })

  return { success: true, winAmount: bet.winAmount, multiplier: gameState.mult }
}

// ── Cancel Bet ─────────────────────────────────────────────
function cancelBet(userId, betNum, betId) {
  if (gameState.phase !== 'betting') {
    return { success: false, error: 'Not in betting phase' }
  }

  const betIndex = currentBets.findIndex(b => b.userId === userId && b.betNum === betNum && b.status === 'pending')
  if (betIndex === -1) {
    return { success: false, error: 'Bet not found' }
  }

  const bet = currentBets[betIndex]
  
  // Refund balance
  if (supabaseAvailable) {
    supabase.from('users').select('balance').eq('id', userId).single()
      .then(({ data: user, error }) => {
        if (user && !error) {
          supabase.from('users').update({ balance: Number(user.balance) + bet.amount, updated_at: new Date().toISOString() }).eq('id', userId)
        }
      })
      .catch(() => {})
    
    supabase.from('aviator_bets').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', betId)
      .catch(() => {})
  }

  currentBets.splice(betIndex, 1)
  broadcast({ type: 'bets_update', bets: currentBets })
  
  return { success: true }
}

// ── Manual Crash ─────────────────────────────────────────────
function requestManualCrash() {
  if (gameState.phase === 'flying') {
    manualCrashRequested = true
  }
}

// ── Update Settings ──────────────────────────────────────────
function updateSettings(newSettings) {
  Object.assign(settings, newSettings)
}

// ── Get Current State ────────────────────────────────────────
function getCurrentState() {
  return {
    ...gameState,
    crashPoint: gameState.crashPoint,
    crash_point: gameState.crashPoint,
    settings: { ...settings },
    crashHistory: [...crashHistory],
    bets: [...currentBets],
  }
}

// ── Initialize WebSocket Server ──────────────────────────────
async function initGameEngine(server) {
  try {
    // Load persisted house edge stats
    await loadHouseEdgeStats()

    wss = new WebSocketServer({ server, path: '/ws/aviator' })

    wss.on('error', (err) => {
      console.error('[GameEngine] WebSocket server error:', err.message)
    })

    wss.on('connection', (ws) => {
      clients.add(ws)
      console.log(`[GameEngine] Client connected. Total clients: ${clients.size}`)

      // Send current state immediately
      try {
        ws.send(JSON.stringify({
          type: 'game_state',
          phase: gameState.phase,
          mult: gameState.mult,
          countdown: gameState.countdown,
          crash_point: gameState.crashPoint,
          roundId: gameState.roundId,
          settings: { ...settings },
          crashHistory: [...crashHistory],
          bets: [...currentBets],
          houseEdge: houseEdgePool,
        }))
      } catch (err) {
        console.error('[GameEngine] Failed to send initial state:', err.message)
      }

      // Handle client messages
      ws.on('message', async (data) => {
        try {
          const msg = JSON.parse(data)

          if (msg.type === 'place_bet') {
            const result = await placeBet(msg)
            ws.send(JSON.stringify({ type: 'bet_result', ...result }))
          }

          if (msg.type === 'cashout') {
            const result = await cashoutBet(msg.userId, msg.betNum)
            ws.send(JSON.stringify({ type: 'cashout_result', ...result, betNum: msg.betNum }))
          }

          if (msg.type === 'cancel_bet') {
            const result = cancelBet(msg.userId, msg.betNum, msg.betId)
            ws.send(JSON.stringify({ type: 'cancel_result', ...result }))
          }

          if (msg.type === 'manual_crash') {
            requestManualCrash()
            ws.send(JSON.stringify({ type: 'crash_signal_sent' }))
          }

          if (msg.type === 'update_settings') {
            updateSettings(msg.settings)
            broadcast({ type: 'settings_updated', settings: { ...settings } })
          }

          if (msg.type === 'get_state') {
            ws.send(JSON.stringify({
              type: 'game_state',
              phase: gameState.phase,
              mult: gameState.mult,
              countdown: gameState.countdown,
              crash_point: gameState.crashPoint,
              roundId: gameState.roundId,
              settings: { ...settings },
              crashHistory: [...crashHistory],
              bets: [...currentBets],
              houseEdge: houseEdgePool,
            }))
          }
        } catch (e) {
          console.warn('[WS] Invalid message:', e.message)
        }
      })

      // Send ping every 30 seconds to keep connection alive
      const pingInterval = setInterval(() => {
        try {
          if (ws.readyState === 1) {
            ws.send(JSON.stringify({ type: 'ping' }))
          } else {
            clearInterval(pingInterval)
          }
        } catch (err) {
          clearInterval(pingInterval)
        }
      }, 30000)

      ws.on('close', () => {
        clearInterval(pingInterval)
        clients.delete(ws)
        console.log(`[GameEngine] Client disconnected. Total clients: ${clients.size}`)
      })

      ws.on('error', (err) => {
        console.error('[WS] Error:', err.message)
        clearInterval(pingInterval)
        clients.delete(ws)
      })
    })

    // Try to restore game state from database
    const stateRestored = await loadGameState()

    // Always start the game loop
    startGameLoop()

    if (stateRestored) {
      // Restored valid betting state - broadcast it
      console.log('[GameEngine] Starting with restored betting state')
      broadcast({
        type: 'game_state',
        phase: 'betting',
        countdown: gameState.countdown,
        roundId: gameState.roundId,
        houseEdge: houseEdgePool,
      })
    } else {
      // No saved state or invalid - start fresh round
      console.log('[GameEngine] Starting fresh game')
      startNewRound()
    }

    console.log('[GameEngine] WebSocket server started on /ws/aviator')
    console.log(`[GameEngine] Connected clients: 0`)
  } catch (err) {
    console.error('[GameEngine] Failed to initialize:', err.message, err.stack)
  }
}

// ── Export ───────────────────────────────────────────────────
export { initGameEngine, getCurrentState, requestManualCrash, startNewRound, updateSettings, gameState, settings, placeBet, cashoutBet, cancelBet, houseEdgePool }
