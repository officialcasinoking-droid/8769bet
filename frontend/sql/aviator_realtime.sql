-- Real-time game state sync table
-- Used for syncing game state between game and admin panel

CREATE TABLE IF NOT EXISTS aviator_game_state (
  id TEXT PRIMARY KEY DEFAULT 'current',
  phase TEXT DEFAULT 'betting',
  mult DECIMAL(10,4) DEFAULT 1.00,
  countdown INTEGER DEFAULT 8,
  crash_point DECIMAL(10,4),
  start_time BIGINT,
  timestamp BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crash history table
CREATE TABLE IF NOT EXISTS aviator_crash_history (
  id BIGSERIAL PRIMARY KEY,
  crash_point DECIMAL(10,4) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Live bets table
CREATE TABLE IF NOT EXISTS aviator_live_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  username TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  auto_cashout_at DECIMAL(10,4),
  is_bot BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending',
  cashout_amount DECIMAL(15,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settings table
CREATE TABLE IF NOT EXISTS aviator_settings (
  id TEXT PRIMARY KEY DEFAULT 'config',
  house_edge DECIMAL(5,4) DEFAULT 0.05,
  bias_strength INTEGER DEFAULT 50,
  he_mode TEXT DEFAULT 'off',
  he_target_pct INTEGER DEFAULT 5,
  he_min_secs INTEGER DEFAULT 3,
  he_max_secs INTEGER DEFAULT 50,
  auto_target_secs INTEGER DEFAULT 8,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Manual crash signal
CREATE TABLE IF NOT EXISTS aviator_signals (
  id TEXT PRIMARY KEY DEFAULT 'crash',
  signal TEXT,
  timestamp BIGINT,
  processed BOOLEAN DEFAULT false
);

-- House edge live metrics
CREATE TABLE IF NOT EXISTS aviator_live_he (
  id TEXT PRIMARY KEY DEFAULT 'metrics',
  event TEXT,
  real_bets DECIMAL(15,2) DEFAULT 0,
  exited_amt DECIMAL(15,2) DEFAULT 0,
  pending_amt DECIMAL(15,2) DEFAULT 0,
  target_mult DECIMAL(10,4),
  live_edge DECIMAL(5,2) DEFAULT 0,
  exit_rate DECIMAL(5,2) DEFAULT 0,
  elapsed INTEGER DEFAULT 0,
  timestamp BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- Disable RLS on all tables
ALTER TABLE aviator_game_state DISABLE ROW LEVEL SECURITY;
ALTER TABLE aviator_crash_history DISABLE ROW LEVEL SECURITY;
ALTER TABLE aviator_live_bets DISABLE ROW LEVEL SECURITY;
ALTER TABLE aviator_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE aviator_signals DISABLE ROW LEVEL SECURITY;
ALTER TABLE aviator_live_he DISABLE ROW LEVEL SECURITY;

-- Seed default values
INSERT INTO aviator_settings (id) VALUES ('config') ON CONFLICT (id) DO NOTHING;
INSERT INTO aviator_game_state (id) VALUES ('current') ON CONFLICT (id) DO NOTHING;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE aviator_game_state;
ALTER PUBLICATION supabase_realtime ADD TABLE aviator_crash_history;
ALTER PUBLICATION supabase_realtime ADD TABLE aviator_live_bets;
ALTER PUBLICATION supabase_realtime ADD TABLE aviator_live_he;
