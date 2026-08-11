/**
 * Aviator Game API Layer
 * Uses Supabase Realtime + REST API for game sync
 */

import { supabase } from '../lib/supabase';

class AviatorGameAPI {
  constructor() {
    this.ws = null;
    this.isConnected = false;
    this.isPolling = false;
    this.listeners = {};
    this.channel = null;
  }

  connect() {
    try {
      // Subscribe to realtime changes on game state
      this.channel = supabase.channel('aviator-game')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'aviator_game_state'
        }, (payload) => {
          if (payload.new) {
            this.emit('game_state', {
              type: 'game_state',
              phase: payload.new.phase,
              mult: parseFloat(payload.new.multiplier),
              countdown: parseFloat(payload.new.countdown),
              crash_point: parseFloat(payload.new.crash_point),
              roundId: payload.new.round_id,
            });
          }
        })
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'game_bets'
        }, (payload) => {
          this.emit('bets_update', { type: 'bets_update', bets: [payload.new] });
        })
        .subscribe((status) => {
          this.isConnected = status === 'SUBSCRIBED';
          if (this.isConnected) {
            this.emit('ws_connected', {});
            this.fetchGameState();
          }
        });

      this.emit('polling_active', {});
    } catch (e) {
      console.error('[AviatorAPI] Connection error:', e);
      this.isPolling = true;
    }
  }

  async fetchGameState() {
    try {
      const { data, error } = await supabase
        .from('aviator_game_state')
        .select('*')
        .eq('id', 'current')
        .single();

      if (!error && data) {
        this.emit('game_state', {
          type: 'game_state',
          phase: data.phase,
          mult: parseFloat(data.multiplier),
          countdown: parseFloat(data.countdown),
          crash_point: parseFloat(data.crash_point),
          roundId: data.round_id,
        });
      }
    } catch (e) {
      console.error('[AviatorAPI] Failed to fetch game state:', e);
    }
  }

  disconnect() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    this.isConnected = false;
  }

  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event, callback) {
    if (!this.listeners[event]) return;
    this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
  }

  emit(event, data) {
    if (!this.listeners[event]) return;
    this.listeners[event].forEach(cb => cb(data));
  }

  async placeBet(betData) {
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
        .single();

      if (error) throw error;

      this.emit('bet_result', { success: true, bet: data });
      return data;
    } catch (e) {
      console.error('[AviatorAPI] Place bet error:', e);
      this.emit('bet_result', { success: false, error: e.message });
    }
  }

  async cashout(userId, betNumber) {
    try {
      const { data: bet } = await supabase
        .from('game_bets')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .single();

      if (!bet) {
        this.emit('cashout_result', { success: false, error: 'No active bet' });
        return;
      }

      const multiplier = 1.5 + Math.random() * 2;
      const winAmount = Math.floor(multiplier * bet.amount);

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
        .eq('id', bet.id)
        .select()
        .single();

      if (error) throw error;

      this.emit('cashout_result', { success: true, winAmount, multiplier });
      return data;
    } catch (e) {
      console.error('[AviatorAPI] Cashout error:', e);
      this.emit('cashout_result', { success: false, error: e.message });
    }
  }

  async cancelBet(userId, betNumber, betId) {
    try {
      const { error } = await supabase
        .from('game_bets')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', betId)
        .eq('user_id', userId);

      if (error) throw error;

      this.emit('cancel_result', { success: true });
    } catch (e) {
      console.error('[AviatorAPI] Cancel bet error:', e);
      this.emit('cancel_result', { success: false, error: e.message });
    }
  }
}

export const aviatorWS = new AviatorGameAPI();
export default aviatorWS;