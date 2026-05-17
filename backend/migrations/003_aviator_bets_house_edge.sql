-- Aviator bet history and house edge persistence

-- 1. Create aviator_bets table for persistent bet records
CREATE TABLE IF NOT EXISTS aviator_bets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  username TEXT NOT NULL,
  round_id TEXT NOT NULL,
  bet_number INTEGER DEFAULT 1,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  auto_cashout NUMERIC(8,2),
  cashed_out BOOLEAN DEFAULT false,
  cashout_multiplier NUMERIC(8,2),
  win_amount NUMERIC(12,2) DEFAULT 0,
  status TEXT DEFAULT 'pending', -- 'pending', 'won', 'lost', 'cancelled'
  is_bot BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_aviator_bets_user_id ON aviator_bets(user_id);
CREATE INDEX IF NOT EXISTS idx_aviator_bets_round_id ON aviator_bets(round_id);
CREATE INDEX IF NOT EXISTS idx_aviator_bets_created_at ON aviator_bets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_aviator_bets_user_created ON aviator_bets(user_id, created_at DESC);

-- 2. Create house_edge_stats table for persistent house edge tracking
CREATE TABLE IF NOT EXISTS house_edge_stats (
  id TEXT PRIMARY KEY DEFAULT 'main',
  total_bets NUMERIC(14,2) DEFAULT 0,
  total_winnings NUMERIC(14,2) DEFAULT 0,
  house_edge_amount NUMERIC(14,2) DEFAULT 0,
  rounds_played INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initialize house edge stats row
INSERT INTO house_edge_stats (id, total_bets, total_winnings, house_edge_amount, rounds_played)
VALUES ('main', 0, 0, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- 3. RLS policies
ALTER TABLE aviator_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE house_edge_stats ENABLE ROW LEVEL SECURITY;

-- Users can read their own bets
CREATE POLICY "Users can view own bets" ON aviator_bets
  FOR SELECT USING (auth.uid() = user_id);

-- Backend service role can do everything (via service key)
-- No policies needed for service role - it bypasses RLS

-- House edge stats: only readable by authenticated users (admin)
CREATE POLICY "Authenticated users can view house edge stats" ON house_edge_stats
  FOR SELECT USING (auth.role() = 'authenticated');

-- 4. Function to clean old bets (keep last 30 days)
CREATE OR REPLACE FUNCTION clean_old_aviator_bets()
RETURNS void AS $$
BEGIN
  DELETE FROM aviator_bets WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
