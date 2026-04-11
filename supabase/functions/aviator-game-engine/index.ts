// Supabase Edge Function: aviator-game-engine
// Runs the Aviator game loop 24/7 in the cloud
// Broadcasts state via Supabase Realtime

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

// ── Configuration ───────────────────────────────────────
const TICK_INTERVAL_MS = 50 // 20fps game tick
const WAIT_TIME_SECONDS = 8 // Betting phase duration

// ── Bot Configuration ────────────────────────────────────
const BOT_NAMES = [
  'Ali_Khan', 'Sara_Ahmed', 'Usman_Ali', 'Fatima_Zahid', 'Ahmed_Raza',
  'Ayesha_Khan', 'Bilal_Hassan', 'Zainab_Malik', 'Hassan_Ali', 'Mariam_Waseem',
  'Hamza_Saeed', 'Hira_Nawaz', 'Saad_Afzal', 'Nadia_Iqbal', 'Faisal_Imran',
  'Sana_Ansari', 'Kamran_Shahid', 'Mehwish_Butt', 'Adnan_Yousaf', 'Sadia_Parveen',
]

const AUTO_CASHOUT_VALUES = [1.1, 1.2, 1.3, 1.5, 1.7, 2.0, 2.5, 3.0, 4.0, 5.0, 10.0]

// ── Game State ───────────────────────────────────────────
let gameState = {
  phase: 'betting',
  multiplier: 1.00,
  crashPoint: 0,
  countdown: WAIT_TIME_SECONDS,
  roundId: '',
  startTime: 0,
}

// ── Settings ─────────────────────────────────────────────
let settings = {
  houseEdge: 0.05,
  heMode: 'off',
  heMinSecs: 3,
  heMaxSecs: 50,
}

// ── Bets ─────────────────────────────────────────────────
let currentBets: any[] = []

// ── Supabase Client ──────────────────────────────────────
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// ── Crash Point Generation ───────────────────────────────
function generateCrashPoint(houseEdge: number): number {
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

// ── Generate Bot Bet ─────────────────────────────────────
function generateBotBetAmount(): number {
  const amounts = [6, 10, 20, 50, 100, 200, 500]
  return amounts[Math.floor(Math.random() * amounts.length)]
}

function generateBotAutoCashout(): number | null {
  if (Math.random() < 0.3) return null
  return AUTO_CASHOUT_VALUES[Math.floor(Math.random() * AUTO_CASHOUT_VALUES.length)]
}

function getRandomBotName(): string {
  return BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)]
}

// ── Broadcast Game State to Supabase ─────────────────────
async function broadcastGameState() {
  const { error } = await supabase
    .from('aviator_game_state')
    .upsert({
      id: 'current',
      round_id: gameState.roundId,
      phase: gameState.phase,
      multiplier: gameState.multiplier,
      crash_point: gameState.phase === 'crashed' ? gameState.crashPoint : null,
      countdown: gameState.countdown,
      started_at: new Date(gameState.startTime).toISOString(),
      crashed_at: gameState.phase === 'crashed' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    })

  if (error) {
    console.error('Failed to broadcast game state:', error)
  }
}

// ── Place Bot Bet in Database ────────────────────────────
async function placeBotBet(botName: string, amount: number, autoCashout: number | null) {
  const { data, error } = await supabase
    .from('player_bets')
    .insert({
      round_id: gameState.roundId,
      user_id: '00000000-0000-0000-0000-000000000000', // Bot user ID
      username: botName,
      bet_number: 1,
      amount,
      auto_cashout: autoCashout,
      cashed_out: false,
      win_amount: 0,
      status: 'pending',
      is_bot: true
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to place bot bet:', error)
    return null
  }

  return data
}

// ── Update Admin Wallet ──────────────────────────────────
async function updateAdminWallet(stats: {
  totalBets: number
  totalPayouts: number
  houseEdgeEarned: number
  roundsPlayed: number
}) {
  const { data: wallet } = await supabase
    .from('admin_wallet')
    .select('*')
    .single()

  if (!wallet) return

  const newBalance = wallet.balance + stats.houseEdgeEarned
  const newTotalBets = wallet.total_bets + stats.totalBets
  const newTotalPayouts = wallet.total_payouts + stats.totalPayouts
  const newHouseEdgeEarned = wallet.house_edge_earned + stats.houseEdgeEarned
  const newRoundsPlayed = wallet.rounds_played + stats.roundsPlayed

  // Check drawdown protection
  const drawdownActive = newBalance < wallet.max_drawdown_threshold

  await supabase
    .from('admin_wallet')
    .update({
      balance: newBalance,
      total_bets: newTotalBets,
      total_payouts: newTotalPayouts,
      house_edge_earned: newHouseEdgeEarned,
      rounds_played: newRoundsPlayed,
      drawdown_protection_active: drawdownActive,
      last_updated: new Date().toISOString()
    })
}

// ── Process Auto-Cashouts ────────────────────────────────
async function processAutoCashouts(currentMultiplier: number) {
  const betsToCashout = currentBets.filter(bet => 
    !bet.cashedOut && bet.autoCashout && currentMultiplier >= bet.autoCashout
  )

  for (const bet of betsToCashout) {
    bet.cashedOut = true
    bet.cashoutMultiplier = currentMultiplier
    bet.winAmount = Math.floor(bet.amount * currentMultiplier)
    bet.status = 'won'

    // Update in database
    await supabase
      .from('player_bets')
      .update({
        cashed_out: true,
        cashout_multiplier: currentMultiplier,
        win_amount: bet.winAmount,
        status: 'won',
        updated_at: new Date().toISOString()
      })
      .eq('id', bet.id)

    // If not a bot bet, update user balance
    if (!bet.is_bot) {
      const { data: user } = await supabase
        .from('users')
        .select('balance')
        .eq('id', bet.user_id)
        .single()

      if (user) {
        await supabase
          .from('users')
          .update({ balance: user.balance + bet.winAmount })
          .eq('id', bet.user_id)
      }
    }
  }
}

// ── Check Admin Signals ──────────────────────────────────
async function checkAdminSignals() {
  const { data: signal } = await supabase
    .from('aviator_admin_signals')
    .select('*')
    .eq('id', 'control')
    .eq('processed', false)
    .single()

  if (!signal) return

  if (signal.action === 'force_crash' && gameState.phase === 'flying') {
    await crashRound(gameState.multiplier, 'admin_force')
  } else if (signal.action === 'new_round' && gameState.phase === 'betting') {
    await startNewRound()
  } else if (signal.action === 'pause') {
    // Pause logic - stop the game loop
    console.log('Game paused by admin')
  } else if (signal.action === 'resume') {
    // Resume logic
    console.log('Game resumed by admin')
  }

  // Mark signal as processed
  await supabase
    .from('aviator_admin_signals')
    .update({ processed: true, updated_at: new Date().toISOString() })
    .eq('id', 'control')
}

// ── Start New Round ──────────────────────────────────────
async function startNewRound() {
  const roundId = `r_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  
  gameState = {
    phase: 'betting',
    multiplier: 1.00,
    crashPoint: generateCrashPoint(settings.houseEdge),
    countdown: WAIT_TIME_SECONDS,
    roundId,
    startTime: Date.now(),
  }

  currentBets = []

  // Create round in database
  await supabase
    .from('game_rounds')
    .insert({
      round_id: roundId,
      phase: 'betting',
      multiplier: 1.00,
      countdown: WAIT_TIME_SECONDS,
      started_at: new Date().toISOString()
    })

  // Clear old bets
  await supabase
    .from('player_bets')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  // Reset admin signals
  await supabase
    .from('aviator_admin_signals')
    .upsert({
      id: 'control',
      action: null,
      processed: true,
      updated_at: new Date().toISOString()
    })

  // Broadcast initial state
  await broadcastGameState()

  // Place bot bets
  await scheduleBotBets()

  console.log(`[Round ${roundId}] New round started`)
}

// ── Schedule Bot Bets ────────────────────────────────────
async function scheduleBotBets() {
  const botCount = 15

  for (let i = 0; i < botCount; i++) {
    // Random delay during betting phase
    const delay = Math.random() * WAIT_TIME_SECONDS * 800
    
    setTimeout(async () => {
      if (gameState.phase !== 'betting') return

      const botName = getRandomBotName()
      const amount = generateBotBetAmount()
      const autoCashout = generateBotAutoCashout()

      const bet = await placeBotBet(botName, amount, autoCashout)
      if (bet) {
        currentBets.push(bet)
      }
    }, delay)
  }
}

// ── Crash Round ──────────────────────────────────────────
async function crashRound(crashPoint: number, reason: string = 'natural') {
  gameState.phase = 'crashed'
  gameState.crashPoint = crashPoint

  // Process remaining auto-cashouts
  await processAutoCashouts(crashPoint)

  // Mark uncashed bets as lost
  const lostBets = currentBets.filter(bet => !bet.cashedOut)
  for (const bet of lostBets) {
    bet.status = 'lost'

    await supabase
      .from('player_bets')
      .update({
        status: 'lost',
        updated_at: new Date().toISOString()
      })
      .eq('id', bet.id)
  }

  // Calculate house edge stats
  const totalBets = currentBets.reduce((sum, bet) => sum + bet.amount, 0)
  const totalPayouts = currentBets.reduce((sum, bet) => sum + (bet.winAmount || 0), 0)
  const houseEdgeEarned = totalBets - totalPayouts

  // Update admin wallet
  await updateAdminWallet({
    totalBets,
    totalPayouts,
    houseEdgeEarned,
    roundsPlayed: 1
  })

  // Save to crash history
  await supabase
    .from('aviator_crash_history')
    .insert({
      round_id: gameState.roundId,
      crash_point: crashPoint
    })

  // Update round record
  await supabase
    .from('game_rounds')
    .update({
      phase: 'crashed',
      crash_point: crashPoint,
      crashed_at: new Date().toISOString()
    })
    .eq('round_id', gameState.roundId)

  // Broadcast final state
  await broadcastGameState()

  console.log(`[Round ${gameState.roundId}] Crashed at ${crashPoint}x (${reason})`)

  // Start new round after delay
  setTimeout(async () => {
    await startNewRound()
  }, 3000)
}

// ── Game Loop ────────────────────────────────────────────
async function gameLoop() {
  setInterval(async () => {
    const now = Date.now()

    // Check admin signals
    await checkAdminSignals()

    if (gameState.phase === 'betting') {
      const elapsed = (now - gameState.startTime) / 1000
      const remaining = Math.max(0, WAIT_TIME_SECONDS - elapsed)
      gameState.countdown = remaining

      await broadcastGameState()

      if (remaining <= 0) {
        // Transition to flying phase
        gameState.phase = 'flying'
        gameState.startTime = now

        await supabase
          .from('game_rounds')
          .update({ phase: 'flying' })
          .eq('round_id', gameState.roundId)

        await broadcastGameState()
      }
    } else if (gameState.phase === 'flying') {
      const elapsed = (now - gameState.startTime) / 1000
      const multiplier = parseFloat(Math.pow(Math.E, 0.06 * elapsed).toFixed(2))
      gameState.multiplier = multiplier

      // Process auto-cashouts
      await processAutoCashouts(multiplier)

      // Check house edge modes
      if (settings.heMode !== 'off') {
        if (elapsed >= settings.heMinSecs && multiplier >= gameState.crashPoint) {
          await crashRound(multiplier, settings.heMode)
          return
        }
        if (elapsed >= settings.heMaxSecs) {
          await crashRound(multiplier, 'max_time')
          return
        }
      } else {
        // Natural crash
        if (multiplier >= gameState.crashPoint) {
          await crashRound(gameState.crashPoint, 'natural')
          return
        }
      }

      // Update round
      await supabase
        .from('game_rounds')
        .update({ multiplier })
        .eq('round_id', gameState.roundId)

      await broadcastGameState()
    }
  }, TICK_INTERVAL_MS)
}

// ── Handle HTTP Requests ─────────────────────────────────
Deno.serve(async (req: Request) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'force_crash':
        if (gameState.phase === 'flying') {
          await crashRound(gameState.multiplier, 'admin_force')
          return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
          })
        }
        return new Response(JSON.stringify({ success: false, error: 'Game not flying' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })

      case 'new_round':
        if (gameState.phase === 'betting') {
          await startNewRound()
          return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
          })
        }
        return new Response(JSON.stringify({ success: false, error: 'Game not in betting phase' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })

      case 'pause':
        // Implement pause logic
        return new Response(JSON.stringify({ success: true, message: 'Game paused' }), {
          headers: { 'Content-Type': 'application/json' }
        })

      case 'resume':
        // Implement resume logic
        return new Response(JSON.stringify({ success: true, message: 'Game resumed' }), {
          headers: { 'Content-Type': 'application/json' }
        })

      case 'get_state':
        return new Response(JSON.stringify({ success: true, state: gameState }), {
          headers: { 'Content-Type': 'application/json' }
        })

      default:
        return new Response(JSON.stringify({ success: false, error: 'Unknown action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        })
    }
  } catch (error) {
    console.error('Edge Function error:', error)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})

// ── Start the Game Engine ────────────────────────────────
console.log('[Aviator Engine] Starting game engine...')
await startNewRound()
gameLoop()
console.log('[Aviator Engine] Game engine started successfully')
