-- Aviator Crash Game Database Schema

-- Game rounds table
CREATE TABLE IF NOT EXISTS game_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id TEXT UNIQUE NOT NULL,
  server_seed_hash TEXT NOT NULL,
  server_seed TEXT NOT NULL,
  client_seed TEXT,
  crash_point DECIMAL(10,4) NOT NULL DEFAULT 1.00,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'running', 'crashed')),
  started_at TIMESTAMP WITH TIME ZONE,
  crashed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game bets table
CREATE TABLE IF NOT EXISTS game_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id TEXT REFERENCES game_rounds(round_id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  username TEXT,
  amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  auto_cashout_at DECIMAL(10,4),
  cashout_at DECIMAL(10,4),
  cashout_multiplier DECIMAL(10,4),
  cashout_amount DECIMAL(15,2),
  is_bot BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'betting', 'running', 'won', 'lost', 'cashed_out', 'crashed')),
  won_amount DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game settings table (admin configurable)
CREATE TABLE IF NOT EXISTS game_settings (
  id TEXT PRIMARY KEY DEFAULT 'aviator',
  min_bet DECIMAL(15,2) DEFAULT 5,
  max_bet DECIMAL(15,2) DEFAULT 50000,
  max_crash DECIMAL(10,4) DEFAULT 50.00,
  house_edge DECIMAL(5,4) DEFAULT 0.0400,
  wait_time_seconds INTEGER DEFAULT 10,
  is_enabled BOOLEAN DEFAULT true,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bets_round ON game_bets(round_id);
CREATE INDEX IF NOT EXISTS idx_bets_user ON game_bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_status ON game_bets(status);
CREATE INDEX IF NOT EXISTS idx_bets_is_bot ON game_bets(is_bot);
CREATE INDEX IF NOT EXISTS idx_rounds_status ON game_rounds(status);
CREATE INDEX IF NOT EXISTS idx_rounds_created ON game_rounds(created_at DESC);

-- Enable RLS
ALTER TABLE game_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for game_rounds (public read)
CREATE POLICY "Public read game_rounds" ON game_rounds
  FOR SELECT USING (true);

CREATE POLICY "Admin insert game_rounds" ON game_rounds
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'god'))
  );

CREATE POLICY "Admin update game_rounds" ON game_rounds
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'god'))
  );

-- RLS Policies for game_bets
CREATE POLICY "Public read game_bets" ON game_bets
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own bets" ON game_bets
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    auth.uid() IS NULL OR 
    (user_id IS NULL AND is_bot = true)
  );

CREATE POLICY "Users can update their own bets" ON game_bets
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admin can update all bets" ON game_bets
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'god'))
  );

-- RLS Policies for game_settings
CREATE POLICY "Public read game_settings" ON game_settings
  FOR SELECT USING (true);

CREATE POLICY "Admin can update game_settings" ON game_settings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'god'))
  );

-- Insert default settings
INSERT INTO game_settings (id, min_bet, max_bet, max_crash, house_edge, wait_time_seconds)
VALUES ('aviator', 5, 50000, 50.00, 0.0400, 10)
ON CONFLICT (id) DO NOTHING;

-- Function to get current round
CREATE OR REPLACE FUNCTION get_current_round()
RETURNS TABLE (
  round_id TEXT,
  crash_point DECIMAL(10,4),
  status TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  server_seed_hash TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT r.round_id, r.crash_point, r.status, r.started_at, r.server_seed_hash
  FROM game_rounds r
  WHERE r.status IN ('waiting', 'running')
  ORDER BY r.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get recent crash points
CREATE OR REPLACE FUNCTION get_recent_crashes(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (crash_point DECIMAL(10,4), round_id TEXT, created_at TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
  RETURN QUERY
  SELECT r.crash_point, r.round_id, r.created_at
  FROM game_rounds r
  WHERE r.status = 'crashed'
  ORDER BY r.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get bets for a round
CREATE OR REPLACE FUNCTION get_round_bets(target_round_id TEXT)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  username TEXT,
  amount DECIMAL(15,2),
  auto_cashout_at DECIMAL(10,4),
  cashout_at DECIMAL(10,4),
  cashout_amount DECIMAL(15,2),
  status TEXT,
  won_amount DECIMAL(15,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.user_id,
    b.username,
    b.amount,
    b.auto_cashout_at,
    b.cashout_at,
    b.cashout_amount,
    b.status,
    b.won_amount
  FROM game_bets b
  WHERE b.round_id = target_round_id
  ORDER BY b.created_at DESC
  LIMIT 100;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
