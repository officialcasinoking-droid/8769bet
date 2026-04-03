/**
 * Aviator API Layer - localStorage only (no Supabase calls)
 * All game state is shared via localStorage between tabs.
 */

// ──────────────────────────────────────────────
// Broadcast via localStorage
// ──────────────────────────────────────────────

/** Broadcast game state via localStorage */
export async function broadcastMultiplier(state) {
  try {
    localStorage.setItem('aviator_game_state', JSON.stringify({ ...state, timestamp: Date.now() }))
  } catch {}
}

/** Broadcast crash event via localStorage */
export async function broadcastCrash(roundId, crashPoint) {
  try {
    localStorage.setItem('aviator_game_crash', JSON.stringify({ roundId, crashPoint, timestamp: Date.now() }))
  } catch {}
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
// Admin reads from localStorage
// ──────────────────────────────────────────────

export async function getGameState() {
  try {
    const raw = localStorage.getItem('aviator_game_state')
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

export async function getLiveBets() {
  try {
    const raw = localStorage.getItem('aviator_live_bets')
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

export async function getCrashHistory() {
  try {
    const raw = localStorage.getItem('aviator_crash_history')
    if (raw) return JSON.parse(raw)
  } catch {}
  return []
}

export async function getLiveHEMetrics() {
  try {
    const raw = localStorage.getItem('aviator_live_he')
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

export async function getSettingsFromDB() {
  try {
    const raw = localStorage.getItem('aviator_settings')
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

export async function saveSettingsToDB(settings) {
  try {
    localStorage.setItem('aviator_settings', JSON.stringify({ ...settings, ts: Date.now() }))
  } catch {}
}

export async function broadcastLiveHEMetrics(metrics) {
  try {
    localStorage.setItem('aviator_live_he', JSON.stringify({ ...metrics, ts: Date.now() }))
  } catch {}
}

// ──────────────────────────────────────────────
// House Edge Pool (localStorage)
// ──────────────────────────────────────────────

export async function getHouseEdgePool() {
  try {
    const raw = localStorage.getItem('aviator_he_pool')
    if (raw) return JSON.parse(raw)
  } catch {}
  return {
    total_deposits: 0, total_bets: 0, total_winnings_paid: 0,
    house_edge_pool: 0, total_withdrawals_paid: 0, gross_pnl: 0, rounds_played: 0,
  }
}

export async function updateHouseEdgePool(realBetAmount, realExitAmount, crashMult) {
  try {
    const raw = localStorage.getItem('aviator_he_pool')
    const pool = raw ? JSON.parse(raw) : {
      total_deposits: 0, total_bets: 0, total_winnings_paid: 0,
      house_edge_pool: 0, total_withdrawals_paid: 0, gross_pnl: 0, rounds_played: 0,
    }
    pool.total_bets += Number(realBetAmount) || 0
    pool.total_winnings_paid += Number(realExitAmount) || 0
    pool.house_edge_pool = pool.total_bets - pool.total_winnings_paid
    pool.rounds_played = (pool.rounds_played || 0) + 1
    pool.gross_pnl = pool.house_edge_pool - pool.total_withdrawals_paid
    localStorage.setItem('aviator_he_pool', JSON.stringify(pool))
  } catch {}
}

export async function recordDeposit(amount) {
  try {
    const raw = localStorage.getItem('aviator_he_pool')
    const pool = raw ? JSON.parse(raw) : {
      total_deposits: 0, total_bets: 0, total_winnings_paid: 0,
      house_edge_pool: 0, total_withdrawals_paid: 0, gross_pnl: 0, rounds_played: 0,
    }
    pool.total_deposits += Number(amount) || 0
    localStorage.setItem('aviator_he_pool', JSON.stringify(pool))
  } catch {}
}

export async function recordWithdrawal(amount) {
  try {
    const raw = localStorage.getItem('aviator_he_pool')
    const pool = raw ? JSON.parse(raw) : {
      total_deposits: 0, total_bets: 0, total_winnings_paid: 0,
      house_edge_pool: 0, total_withdrawals_paid: 0, gross_pnl: 0, rounds_played: 0,
    }
    pool.total_withdrawals_paid += Number(amount) || 0
    pool.gross_pnl = pool.house_edge_pool - pool.total_withdrawals_paid
    localStorage.setItem('aviator_he_pool', JSON.stringify(pool))
  } catch {}
}

export async function getPendingWithdrawalQueue() { return [] }
export async function getHouseEdgeAlerts() { return [] }
export async function queueWithdrawal() {}

// ──────────────────────────────────────────────
// Round Management (localStorage)
// ──────────────────────────────────────────────

export async function getCurrentRound() { return null }
export async function getLatestCrashedRound() { return null }
export async function createRound() { return null }
export async function updateRound() {}
export async function getRecentCrashes() { return [] }

// ──────────────────────────────────────────────
// Bet Management (localStorage)
// ──────────────────────────────────────────────

export async function getRoundBets() { return [] }
export async function placeBet() { return null }
export async function cashoutBet() { return null }
export async function markBetsLost() {}

// ──────────────────────────────────────────────
// Game Settings (localStorage)
// ──────────────────────────────────────────────

export async function getGameSettings() { return null }
export async function updateGameSettings() {}

// ──────────────────────────────────────────────
// User Bet History
// ──────────────────────────────────────────────

export async function getUserBetHistory() { return [] }

// ──────────────────────────────────────────────
// Crash Point Generation
// ──────────────────────────────────────────────

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
  if (r < 0.3) return null
  const multipliers = [1.1, 1.2, 1.3, 1.5, 1.7, 2.0, 2.5, 3.0, 4.0, 5.0, 10.0]
  return multipliers[Math.floor(Math.random() * multipliers.length)]
}

// ──────────────────────────────────────────────
// Leader Election (localStorage)
// ──────────────────────────────────────────────

export async function tryAcquireGameLock() { return null }
export async function releaseGameLock() {}
export async function getGameSettingsFast() { return null }
export async function tryBecomeLeader() { return true }
export function resignLeadership() {}
