/**
 * Aviator Game Engine
 * Runs on the backend server. Manages game rounds, crash points, and broadcasts state via WebSocket.
 * All clients (users + admin) connect to this WebSocket and receive synchronized game state.
 */

import { WebSocketServer } from 'ws'

// ── Game Configuration ───────────────────────────────────────
const WAIT_TIME_SECONDS = 8 // Betting phase duration
const TICK_INTERVAL_MS = 33 // ~30fps

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
  const pendingBets = realBets.filter(b => b.status === 'pending')
  const wonBets = realBets.filter(b => b.status === 'won')

  const roundBetAmount = realBets.reduce((sum, b) => sum + b.amount, 0)
  const roundWinnings = wonBets.reduce((sum, b) => sum + (b.winAmount || 0), 0)

  if (realBets.length > 0) {
    houseEdgePool.totalBets += roundBetAmount
    houseEdgePool.totalWinnings += roundWinnings
    // House edge is 5% of pending bets when they lose
    const pendingAmount = pendingBets.reduce((sum, b) => sum + b.amount, 0)
    const heFromRound = pendingAmount * 0.05
    houseEdgePool.houseEdgeAmount += heFromRound
  }
  houseEdgePool.roundsPlayed++
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
let manualCrashRequested = false

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
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(msg)
    }
  })
}

// ── Game Loop ────────────────────────────────────────────────
function startGameLoop() {
  if (gameLoop) {
    clearInterval(gameLoop)
  }

  gameLoop = setInterval(() => {
    const now = Date.now()

    if (gameState.phase === 'betting') {
      const elapsed = (now - gameState.startTime) / 1000
      const remaining = Math.max(0, WAIT_TIME_SECONDS - elapsed)
      gameState.countdown = remaining

      broadcast({
        type: 'game_state',
        phase: 'betting',
        countdown: remaining,
        roundId: gameState.roundId,
      })

      if (remaining <= 0) {
        startFlying()
      }
    } else if (gameState.phase === 'flying') {
      const elapsed = (now - gameState.startTime) / 1000
      const mult = parseFloat(Math.pow(Math.E, 0.06 * elapsed).toFixed(2))

      // Check auto-cashouts
      currentBets.forEach(bet => {
        if (!bet.cashedOut && bet.autoCashout && mult >= bet.autoCashout) {
          bet.cashedOut = true
          bet.cashoutMult = mult
          bet.winAmount = Math.floor(bet.amount * mult)
          bet.status = 'won'
        }
      })

      // Broadcast bet updates
      broadcast({ type: 'bets_update', bets: currentBets })

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

      broadcast({
        type: 'game_state',
        phase: 'flying',
        mult: gameState.mult,
        roundId: gameState.roundId,
      })
    }
  }, TICK_INTERVAL_MS)
}

function startFlying() {
  gameState.phase = 'flying'
  gameState.mult = 1.00
  gameState.startTime = Date.now()

  broadcast({
    type: 'game_state',
    phase: 'flying',
    mult: 1.00,
    roundId: gameState.roundId,
  })
}

function crashRound(crashPoint, reason = 'natural') {
  gameState.phase = 'crashed'
  gameState.crashPoint = parseFloat(crashPoint.toFixed(2))
  gameState.crashedAt = Date.now()

  // Clear bot bet timeouts
  botBetTimeouts.forEach(clearTimeout)
  botBetTimeouts = []

  // Process auto-cashouts for bots that reached their target
  const now = Date.now()
  const elapsed = (now - gameState.startTime) / 1000
  const currentMult = parseFloat(Math.pow(Math.E, 0.06 * elapsed).toFixed(2))

  currentBets.forEach(bet => {
    if (!bet.cashedOut) {
      // Check if this bet had auto-cashout and reached it
      if (bet.autoCashout && currentMult >= bet.autoCashout) {
        bet.cashedOut = true
        bet.cashoutMult = currentMult
        bet.winAmount = Math.floor(bet.amount * currentMult)
        bet.status = 'won'
      } else {
        // Lost
        bet.status = 'lost'
      }
    }
  })

  // Add to history
  crashHistory.unshift(gameState.crashPoint)
  if (crashHistory.length > 30) crashHistory = crashHistory.slice(0, 30)

  broadcast({
    type: 'game_state',
    phase: 'crashed',
    crash_point: gameState.crashPoint,
    reason,
    roundId: gameState.roundId,
    bets: currentBets,
    houseEdge: houseEdgePool,
  })

  // Update house edge stats
  updateHouseEdgeStats()

  // Start new round after delay
  setTimeout(() => {
    startNewRound()
  }, 3000)
}

function startNewRound() {
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
  })

  // Schedule bot bets during betting phase
  scheduleBotBets()
}

let botBetTimeouts = []

function scheduleBotBets() {
  // Clear previous bot bet timeouts
  botBetTimeouts.forEach(clearTimeout)
  botBetTimeouts = []

  if (gameState.phase !== 'betting') return

  // Generate bot bets with random delays
  for (let i = 0; i < BOT_COUNT; i++) {
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
function placeBet(betData) {
  if (gameState.phase !== 'betting') {
    return { success: false, error: 'Game is not in betting phase' }
  }

  const bet = {
    id: `bet_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    userId: betData.userId,
    username: betData.username,
    amount: betData.amount,
    autoCashout: betData.autoCashout || null,
    cashedOut: false,
    cashoutMult: null,
    winAmount: 0,
    status: 'pending',
  }

  currentBets.push(bet)

  // Broadcast updated bets
  broadcast({
    type: 'bets_update',
    bets: currentBets,
  })

  return { success: true, bet }
}

function cashoutBet(userId, betNum) {
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

  // Broadcast updated bets
  broadcast({
    type: 'bets_update',
    bets: currentBets,
  })

  return { success: true, winAmount: bet.winAmount, multiplier: gameState.mult }
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
    settings: { ...settings },
    crashHistory: [...crashHistory],
    bets: [...currentBets],
  }
}

// ── Initialize WebSocket Server ──────────────────────────────
function initGameEngine(server) {
  wss = new WebSocketServer({ server, path: '/ws/aviator' })

  wss.on('connection', (ws) => {
    clients.add(ws)
    console.log(`[GameEngine] Client connected. Total clients: ${clients.size}`)

    // Send current state immediately
    ws.send(JSON.stringify({
      type: 'game_state',
      ...gameState,
      settings: { ...settings },
      crashHistory: [...crashHistory],
      bets: [...currentBets],
    }))

    // Handle client messages
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data)

        if (msg.type === 'place_bet') {
          const result = placeBet(msg)
          ws.send(JSON.stringify({ type: 'bet_result', ...result }))
        }

        if (msg.type === 'cashout') {
          const result = cashoutBet(msg.userId, msg.betNum)
          ws.send(JSON.stringify({ type: 'cashout_result', ...result }))
        }

        if (msg.type === 'manual_crash') {
          requestManualCrash()
          ws.send(JSON.stringify({ type: 'crash_signal_sent' }))
        }

        if (msg.type === 'update_settings') {
          updateSettings(msg.settings)
          broadcast({ type: 'settings_updated', settings: { ...settings } })
        }
      } catch (e) {
        console.warn('[WS] Invalid message:', e.message)
      }
    })

    ws.on('close', () => {
      clients.delete(ws)
      console.log(`[GameEngine] Client disconnected. Total clients: ${clients.size}`)
    })

    ws.on('error', (err) => {
      console.error('[WS] Error:', err.message)
      clients.delete(ws)
    })
  })

  // Start the game
  startNewRound()
  startGameLoop()

  console.log('[GameEngine] WebSocket server started on /ws/aviator')
  console.log(`[GameEngine] Connected clients: 0`)
}

// ── Export ───────────────────────────────────────────────────
export { initGameEngine, getCurrentState, requestManualCrash, updateSettings, gameState, settings, placeBet, cashoutBet }
