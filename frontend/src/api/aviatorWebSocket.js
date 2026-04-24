/**
 * WebSocket Client for Aviator Game
 * Connects to backend WebSocket server for real-time game state
 */

class AviatorWebSocketClient {
  constructor() {
    this.ws = null
    this.reconnectTimer = null
    this.isConnected = false
    this.listeners = {
      game_state: [],
      bets_update: [],
      settings_updated: [],
      bet_result: [],
      cashout_result: []
    }
    // Build WebSocket URL with path
    const envUrl = import.meta.env.VITE_BACKEND_WS_URL
    if (envUrl) {
      // Clean URL - remove any trailing slashes and /ws/aviator if already present
      let cleanUrl = envUrl.trim()
      if (cleanUrl.endsWith('/')) {
        cleanUrl = cleanUrl.slice(0, -1)
      }
      // Remove /ws/aviator if already present to avoid duplication
      if (cleanUrl.includes('/ws/aviator')) {
        // Find the base URL before /ws/aviator
        const idx = cleanUrl.indexOf('/ws/aviator')
        cleanUrl = cleanUrl.substring(0, idx)
      }
      // Now add the path
      this.backendUrl = `${cleanUrl}/ws/aviator`
    } else {
      // Auto-detect from current location
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
      this.backendUrl = `${wsProtocol}//${window.location.host}/ws/aviator`
    }
  }

  /**
   * Connect to WebSocket server
   */
  connect() {
    console.log('[WS] Connecting to:', this.backendUrl)
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('[WS] Already connected')
      return
    }

    try {
      this.ws = new WebSocket(this.backendUrl)

      this.ws.onopen = () => {
        console.log('[WS] Connected to game server')
        this.isConnected = true
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer)
          this.reconnectTimer = null
        }
      }

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          this.handleMessage(data)
        } catch (error) {
          console.error('[WS] Failed to parse message:', error)
        }
      }

      this.ws.onclose = () => {
        console.log('[WS] Connection closed')
        this.isConnected = false
        this.scheduleReconnect()
      }

      this.ws.onerror = (error) => {
        console.error('[WS] Connection error:', error)
        this.isConnected = false
      }
    } catch (error) {
      console.error('[WS] Failed to connect:', error)
      this.scheduleReconnect()
    }
  }

  /**
   * Schedule reconnection attempt
   */
  scheduleReconnect() {
    if (this.reconnectTimer) return
    
    console.log('[WS] Reconnecting in 3 seconds...')
    this.reconnectTimer = setTimeout(() => {
      this.connect()
    }, 3000)
  }

  /**
   * Handle incoming messages
   */
  handleMessage(data) {
    const { type, ...payload } = data

    if (this.listeners[type]) {
      this.listeners[type].forEach(callback => callback(payload))
    }
  }

  /**
   * Subscribe to game events
   */
  on(eventType, callback) {
    if (this.listeners[eventType]) {
      this.listeners[eventType].push(callback)
    }
  }

  /**
   * Remove listener
   */
  off(eventType, callback) {
    if (this.listeners[eventType]) {
      this.listeners[eventType] = this.listeners[eventType].filter(cb => cb !== callback)
    }
  }

  /**
   * Clear all listeners
   */
  clearListeners() {
    Object.keys(this.listeners).forEach(key => {
      this.listeners[key] = []
    })
  }

  /**
   * Place a bet
   */
  placeBet(betData) {
    if (!this.isConnected) {
      console.error('[WS] Not connected')
      return { success: false, error: 'Not connected' }
    }

    const message = {
      type: 'place_bet',
      ...betData
    }

    this.ws.send(JSON.stringify(message))
    return { success: true }
  }

  /**
   * Cash out
   */
  cashout(userId, betNum) {
    if (!this.isConnected) {
      console.error('[WS] Not connected')
      return { success: false, error: 'Not connected' }
    }

    const message = {
      type: 'cashout',
      userId,
      betNum
    }

    this.ws.send(JSON.stringify(message))
    return { success: true }
  }

  /**
   * Request manual crash (admin only)
   */
  requestManualCrash() {
    if (!this.isConnected) {
      console.error('[WS] Not connected')
      return
    }

    this.ws.send(JSON.stringify({ type: 'manual_crash' }))
  }

  /**
   * Update settings (admin only)
   */
  updateSettings(settings) {
    if (!this.isConnected) {
      console.error('[WS] Not connected')
      return
    }

    this.ws.send(JSON.stringify({
      type: 'update_settings',
      settings
    }))
  }

  /**
   * Disconnect
   */
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }

    if (this.ws) {
      this.ws.close()
      this.ws = null
    }

    this.isConnected = false
    this.clearListeners()
  }

  /**
   * Get connection state
   */
  getConnectionState() {
    if (!this.ws) return 'closed'
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting'
      case WebSocket.OPEN:
        return 'open'
      case WebSocket.CLOSING:
        return 'closing'
      case WebSocket.CLOSED:
        return 'closed'
      default:
        return 'unknown'
    }
  }
}

// Singleton instance
export const aviatorWS = new AviatorWebSocketClient()

export default aviatorWS
