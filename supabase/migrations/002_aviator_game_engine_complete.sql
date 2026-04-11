-- Aviator Game Engine Tables - Complete Schema
-- This replaces the WebSocket-based architecture with Supabase Realtime

-- ──────────────────────────────────────────────
-- 1. GAME ROUNDS TABLE
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id VARCHAR(50) NOT NULL UNIQUE,
  phase VARCHAR(20) NOT NULL DEFAULT 'betting', -- 'betting' | 'flying' | 'crashed'
  multiplier DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
  crash_point DECIMAL(10, 2),
  countdown DECIMAL(5, 2) DEFAULT 8.00,
  server_seed VARCHAR(255),
  server_seed_hash VARCHAR(255),
  client_seed VARCHAR(255),
  started_at TIMESTAMP WITH TIME ZONE,
  crashed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Index for faster queries
  CONSTRAINT valid_phase CHECK (phase IN ('betting', 'flying', 'crashed'))
);

-- Create indexes
CREATE INDEX idx_game_rounds_round_id ON game_rounds(round_id);
CREATE INDEX idx_game_rounds_phase ON game_rounds(phase);
CREATE INDEX idx_game_rounds_created_at ON game_rounds(created_at DESC);

-- Enable Realtime
ALTER TABLE game_rounds ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view game rounds" ON game_rounds
  FOR SELECT USING (true);

CREATE POLICY "Only service role can modify game rounds" ON game_rounds
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Enable Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE game_rounds;


-- ──────────────────────────────────────────────
-- 2. PLAYER BETS TABLE
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS player_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id VARCHAR(50) NOT NULL REFERENCES game_rounds(round_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  username VARCHAR(50) NOT NULL,
  bet_number INTEGER NOT NULL DEFAULT 1, -- 1 or 2 (dual bet panels)
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  auto_cashout DECIMAL(10, 2),
  cashed_out BOOLEAN DEFAULT FALSE,
  cashout_multiplier DECIMAL(10, 2),
  win_amount DECIMAL(10, 2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending' | 'won' | 'lost'
  is_bot BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_status CHECK (status IN ('pending', 'won', 'lost'))
);

-- Create indexes
CREATE INDEX idx_player_bets_round_id ON player_bets(round_id);
CREATE INDEX idx_player_bets_user_id ON player_bets(user_id);
CREATE INDEX idx_player_bets_status ON player_bets(status);
CREATE INDEX idx_player_bets_created_at ON player_bets(created_at DESC);

-- Enable Realtime
ALTER TABLE player_bets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view player bets" ON player_bets
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own bets" ON player_bets
  FOR INSERT WITH CHECK (auth.uid() = user_id OR is_bot = true);

CREATE POLICY "Only service role can modify bets" ON player_bets
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Enable Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE player_bets;


-- ──────────────────────────────────────────────
-- 3. ADMIN WALLET TABLE (House Edge Tracking)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_wallet (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  balance DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_bets DECIMAL(15, 2) NOT NULL DEFAULT 0,
  total_payouts DECIMAL(15, 2) NOT NULL DEFAULT 0,
  house_edge_earned DECIMAL(15, 2) NOT NULL DEFAULT 0,
  rounds_played INTEGER NOT NULL DEFAULT 0,
  drawdown_protection_active BOOLEAN DEFAULT FALSE,
  max_drawdown_threshold DECIMAL(15, 2) DEFAULT 10000, -- 20% protection
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial wallet record
INSERT INTO admin_wallet (balance, max_drawdown_threshold) 
VALUES (100000, 10000)
ON CONFLICT (id) DO NOTHING;

-- Enable Realtime
ALTER TABLE admin_wallet ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can view wallet" ON admin_wallet
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'god')
    )
  );

CREATE POLICY "Only service role can modify wallet" ON admin_wallet
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Enable Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE admin_wallet;


-- ──────────────────────────────────────────────
-- 4. GAME STATE TABLE (Single Source of Truth)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS aviator_game_state (
  id VARCHAR(20) PRIMARY KEY, -- 'current'
  round_id VARCHAR(50) NOT NULL UNIQUE,
  phase VARCHAR(20) NOT NULL DEFAULT 'betting',
  multiplier DECIMAL(10, 2) NOT NULL DEFAULT 1.00,
  crash_point DECIMAL(10, 2),
  countdown DECIMAL(5, 2) DEFAULT 8.00,
  server_seed VARCHAR(255),
  server_seed_hash VARCHAR(255),
  started_at TIMESTAMP WITH TIME ZONE,
  crashed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_phase CHECK (phase IN ('betting', 'flying', 'crashed'))
);

-- Enable Realtime
ALTER TABLE aviator_game_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view game state" ON aviator_game_state
  FOR SELECT USING (true);

CREATE POLICY "Only service role can modify game state" ON aviator_game_state
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Enable Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE aviator_game_state;


-- ──────────────────────────────────────────────
-- 5. GAME SETTINGS TABLE
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS aviator_settings (
  id VARCHAR(20) PRIMARY KEY, -- 'config'
  house_edge DECIMAL(5, 4) DEFAULT 0.05, -- 5%
  he_mode VARCHAR(20) DEFAULT 'off', -- 'off' | 'smart' | 'aggressive'
  he_target_pct DECIMAL(5, 2) DEFAULT 5.00,
  he_min_secs INTEGER DEFAULT 3,
  he_max_secs INTEGER DEFAULT 50,
  auto_target_secs INTEGER DEFAULT 8,
  wait_time_seconds INTEGER DEFAULT 8,
  tick_interval_ms INTEGER DEFAULT 50,
  min_bet DECIMAL(10, 2) DEFAULT 6.00,
  max_bet DECIMAL(10, 2) DEFAULT 50000.00,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT valid_he_mode CHECK (he_mode IN ('off', 'smart', 'aggressive'))
);

-- Insert initial settings
INSERT INTO aviator_settings (id, house_edge, he_mode, wait_time_seconds)
VALUES ('config', 0.05, 'off', 8)
ON CONFLICT (id) DO NOTHING;

-- Enable Realtime
ALTER TABLE aviator_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view settings" ON aviator_settings
  FOR SELECT USING (true);

CREATE POLICY "Admins can update settings" ON aviator_settings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'god')
    )
  );

-- Enable Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE aviator_settings;


-- ──────────────────────────────────────────────
-- 6. CRASH HISTORY TABLE (For quick access)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS aviator_crash_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id VARCHAR(50) NOT NULL,
  crash_point DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_crash_history_round_id ON aviator_crash_history(round_id);
CREATE INDEX idx_crash_history_created_at ON aviator_crash_history(created_at DESC);

-- Enable Realtime
ALTER TABLE aviator_crash_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view crash history" ON aviator_crash_history
  FOR SELECT USING (true);

CREATE POLICY "Only service role can modify crash history" ON aviator_crash_history
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Enable Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE aviator_crash_history;


-- ──────────────────────────────────────────────
-- 7. ADMIN CONTROL SIGNALS TABLE
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS aviator_admin_signals (
  id VARCHAR(20) PRIMARY KEY, -- 'control'
  action VARCHAR(50), -- 'force_crash' | 'pause' | 'resume' | 'new_round'
  triggered_by UUID REFERENCES users(id),
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Realtime
ALTER TABLE aviator_admin_signals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view signals" ON aviator_admin_signals
  FOR SELECT USING (true);

CREATE POLICY "Admins can create signals" ON aviator_admin_signals
  FOR INSERT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'god')
    )
  );

CREATE POLICY "Only service role can modify signals" ON aviator_admin_signals
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Enable Realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE aviator_admin_signals;
