/**
 * Aviator Game Client
 * WebSocket primary, HTTP polling fallback for Render free tier compatibility.
 */

const API_URL = import.meta.env.VITE_API_URL || 'https://eight769bet-backend.onrender.com'

class AviatorGameClient {
  constructor() {
    this.ws = null
    this.reconnectTimer = null
    this.isConnected = false
    this.isPolling = false
    this.pollingTimer = null
    this.reconnectAttempts = 0
    this.wsFailAttempts = 0
    this.maxReconnectDelay = 15000
    this.maxWsFailBeforePoll = 2
    this.listeners = {
      game_state: [],
      bets_update: [],
      settings_updated: [],
      bet_result: [],
      cashout_result: [],
      cancel_result: [],
      ws_connected: [],
      ping: [],
      polling_active: [],
    }
    const envUrl = import.meta.env.VITE_BACKEND_WS_URL
    if (envUrl) {
      let cleanUrl = envUrl.trim().replace(/\/$/, '')
      if (cleanUrl.includes('/ws/aviator')) {
        cleanUrl = cleanUrl.substring(0, cleanUrl.indexOf('/ws/aviator'))
      }
      this.wsUrl = `${cleanUrl}/ws/aviator`
    } else {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      this.wsUrl = `${proto}//${window.location.host}/ws/aviator`
    }
  }

  connect() {
    if (this.isPolling) return
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return
    if (this.ws) { try { this.ws.close() } catch {} this.ws = null }

    try {
      this.ws = new WebSocket(this.wsUrl)

      this.ws.onopen = () => {
        this.isConnected = true
        this.wsFailAttempts = 0
        this.resetReconnectAttempts()
        if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null }
        this.emit('ws_connected')
      }

      this.ws.onmessage = (event) => {
        try { this.emit(JSON.parse(event.data)) } catch {}
      }

      this.ws.onclose = () => {
        this.isConnected = false
        this.wsFailAttempts++
        if (this.wsFailAttempts >= this.maxWsFailBeforePoll && !this.isPolling) {
          this.startPolling()
        } else {
          this.scheduleReconnect()
        }
      }

      this.ws.onerror = () => {
        this.isConnected = false
      }
    } catch {
      this.wsFailAttempts++
      if (this.wsFailAttempts >= this.maxWsFailBeforePoll) {
        this.startPolling()
      } else {
        this.scheduleReconnect()
      }
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer || this.isPolling) return
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), this.maxReconnectDelay)
    this.reconnectAttempts++
    this.reconnectTimer = setTimeout(() => this.connect(), delay)
  }

  resetReconnectAttempts() {
    this.reconnectAttempts = 0
    this.wsFailAttempts = 0
  }

  // ── HTTP Polling fallback ──

  startPolling() {
    if (this.isPolling) return
    if (this.ws) { try { this.ws.close() } catch {} this.ws = null }
    this.isPolling = true
    this.isConnected = true
    console.log('[Game] WebSocket unavailable — switching to HTTP polling')
    this.emit('polling_active')
    this.emit('ws_connected')
    this.fetchState()
    this.pollingTimer = setInterval(() => this.fetchState(), 1000)
  }

  async fetchState() {
    try {
      const res = await fetch(`${API_URL}/api/aviator/state`)
      if (!res.ok) return
      const data = await res.json()
      this.emit({
        type: 'game_state',
        phase: data.phase,
        mult: data.mult || data.multiplier,
        countdown: data.countdown,
        crash_point: data.crash_point || data.crashPoint,
        roundId: data.roundId,
        crashHistory: data.crashHistory,
        bets: data.bets,
        settings: data.settings,
      })
    } catch {}
  }

  // ── Event system ──

  emit(data) {
    if (typeof data === 'string') data = { type: data }
    const { type, ...payload } = data
    if (this.listeners[type]) {
      this.listeners[type].forEach(cb => cb(payload))
    }
  }

  on(eventType, callback) {
    if (this.listeners[eventType]) this.listeners[eventType].push(callback)
  }

  off(eventType, callback) {
    if (this.listeners[eventType]) {
      this.listeners[eventType] = this.listeners[eventType].filter(cb => cb !== callback)
    }
  }

  clearListeners() {
    Object.keys(this.listeners).forEach(k => { this.listeners[k] = [] })
  }

  // ── Actions ──

  send(msg) {
    if (this.ws && this.isConnected && !this.isPolling) {
      this.ws.send(JSON.stringify(msg))
      return true
    }
    return false
  }

  async postAction(path, body) {
    try {
      const res = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      return await res.json()
    } catch { return { success: false, error: 'Network error' } }
  }

  placeBet(betData) {
    if (this.send({ type: 'place_bet', ...betData })) return { success: true }
    this.postAction('/api/aviator/bet', betData).then(r => this.emit({ type: 'bet_result', ...r }))
    return { success: true, pending: true }
  }

  cashout(userId, betNum) {
    if (this.send({ type: 'cashout', userId, betNum })) return { success: true }
    this.postAction('/api/aviator/cashout', { userId, betNum }).then(r => this.emit({ type: 'cashout_result', ...r, betNum }))
    return { success: true, pending: true }
  }

  cancelBet(userId, betNum, betId) {
    if (this.send({ type: 'cancel_bet', userId, betNum, betId })) return { success: true }
    this.postAction('/api/aviator/cancel-bet', { userId, betNum, betId }).then(r => this.emit({ type: 'cancel_result', ...r }))
    return { success: true, pending: true }
  }

  requestManualCrash() { this.send({ type: 'manual_crash' }) }
  updateSettings(settings) { this.send({ type: 'update_settings', settings }) }

  disconnect() {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null }
    if (this.pollingTimer) { clearInterval(this.pollingTimer); this.pollingTimer = null }
    if (this.ws) { try { this.ws.close() } catch {} this.ws = null }
    this.isConnected = false
    this.isPolling = false
    this.clearListeners()
  }
}

export const aviatorWS = new AviatorGameClient()
export default aviatorWS
