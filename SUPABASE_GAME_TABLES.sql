-- ============================================================
-- 399BET - GAME CONTROL TABLES & COLUMNS
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── Add missing columns to games table ───────────────────────
ALTER TABLE games ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE games ADD COLUMN IF NOT EXISTS min_bet NUMERIC DEFAULT 10;
ALTER TABLE games ADD COLUMN IF NOT EXISTS max_bet NUMERIC DEFAULT 10000;
ALTER TABLE games ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT false;
ALTER TABLE games ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN DEFAULT false;
ALTER TABLE games ADD COLUMN IF NOT EXISTS maintenance_reason TEXT DEFAULT '';
ALTER TABLE games ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
ALTER TABLE games ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'Medium';
ALTER TABLE games ADD COLUMN IF NOT EXISTS provably_fair BOOLEAN DEFAULT true;

-- Update existing games with slugs
UPDATE games SET slug = 'aviator' WHERE name = 'Aviator' AND slug IS NULL;
UPDATE games SET slug = 'fortune-gems-3' WHERE name = 'Fortune Gems 3' AND slug IS NULL;
UPDATE games SET slug = 'money-coming' WHERE name = 'Money Coming' AND slug IS NULL;
UPDATE games SET slug = 'crazy777' WHERE name = 'Crazy777' AND slug IS NULL;
UPDATE games SET slug = 'lucky-jet' WHERE name = 'Lucky Jet' AND slug IS NULL;
UPDATE games SET slug = 'jetx' WHERE name = 'JetX' AND slug IS NULL;
UPDATE games SET slug = 'sweet-bonanza' WHERE name = 'Sweet Bonanza' AND slug IS NULL;
UPDATE games SET slug = 'lightning-roulette' WHERE name = 'Lightning Roulette' AND slug IS NULL;

-- ── Game Rounds (crash history & provably fair) ─────────────
CREATE TABLE IF NOT EXISTS game_rounds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id TEXT UNIQUE NOT NULL,
  game_slug TEXT DEFAULT 'aviator',
  server_seed TEXT,
  server_seed_hash TEXT,
  crash_point DECIMAL(10,2) DEFAULT 1.00,
  status TEXT DEFAULT 'betting' CHECK (status IN ('betting', 'running', 'crashed', 'cancelled')),
  target_house_edge DECIMAL(5,2) DEFAULT 5.00,
  bet_count INTEGER DEFAULT 0,
  total_bet_amount DECIMAL(14,2) DEFAULT 0,
  total_exit_amount DECIMAL(14,2) DEFAULT 0,
  house_profit DECIMAL(14,2) DEFAULT 0,
  started_at TIMESTAMPTZ,
  crashed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Game Bets (all bets with bot/real separation) ────────────
CREATE TABLE IF NOT EXISTS game_bets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_id TEXT NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  username TEXT,
  amount DECIMAL(14,2) NOT NULL,
  auto_cashout_at DECIMAL(10,2),
  cashout_at DECIMAL(10,2),
  cashout_multiplier DECIMAL(10,2),
  cashout_amount DECIMAL(14,2),
  is_bot BOOLEAN DEFAULT false,
  is_demo BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost', 'cancelled')),
  won_amount DECIMAL(14,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Aviator Game State (live game state) ─────────────────────
CREATE TABLE IF NOT EXISTS aviator_game_state (
  id TEXT PRIMARY KEY DEFAULT 'current',
  phase TEXT DEFAULT 'betting',
  mult DECIMAL(10,2) DEFAULT 1.00,
  countdown INTEGER DEFAULT 0,
  crash_point DECIMAL(10,2),
  start_time TIMESTAMPTZ,
  timestamp BIGINT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Aviator Settings (admin game config) ─────────────────────
CREATE TABLE IF NOT EXISTS aviator_settings (
  id TEXT PRIMARY KEY DEFAULT 'config',
  house_edge DECIMAL(5,2) DEFAULT 5.00,
  bias_strength INTEGER DEFAULT 50,
  he_mode TEXT DEFAULT 'off' CHECK (he_mode IN ('off', 'smart', 'aggressive')),
  he_target_pct INTEGER DEFAULT 5,
  he_min_secs INTEGER DEFAULT 3,
  he_max_secs INTEGER DEFAULT 50,
  auto_target_secs INTEGER DEFAULT 8,
  min_bet INTEGER DEFAULT 10,
  max_bet INTEGER DEFAULT 5000,
  max_crash INTEGER DEFAULT 1000,
  wait_time_seconds INTEGER DEFAULT 8,
  is_enabled BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Aviator Signals (admin crash commands) ───────────────────
CREATE TABLE IF NOT EXISTS aviator_signals (
  id TEXT PRIMARY KEY DEFAULT 'crash',
  signal TEXT,
  timestamp BIGINT,
  processed BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Aviator House Edge Pool (cumulative tracking) ────────────
CREATE TABLE IF NOT EXISTS aviator_house_edge (
  id TEXT PRIMARY KEY DEFAULT 'pool',
  total_deposits DECIMAL(14,2) DEFAULT 0,
  total_bets DECIMAL(14,2) DEFAULT 0,
  total_winnings_paid DECIMAL(14,2) DEFAULT 0,
  house_edge_pool DECIMAL(14,2) DEFAULT 0,
  total_withdrawals_paid DECIMAL(14,2) DEFAULT 0,
  gross_pnl DECIMAL(14,2) DEFAULT 0,
  rounds_played INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Aviator Live HE Metrics (real-time) ──────────────────────
CREATE TABLE IF NOT EXISTS aviator_live_he (
  id TEXT PRIMARY KEY DEFAULT 'metrics',
  event TEXT,
  mode TEXT,
  mult DECIMAL(10,2),
  elapsed DECIMAL(10,2),
  live_edge DECIMAL(5,2),
  pending_amt DECIMAL(14,2),
  exited_amt DECIMAL(14,2),
  exit_rate DECIMAL(5,2),
  real_bets DECIMAL(14,2),
  target_mult DECIMAL(10,2),
  timestamp BIGINT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Add admin_username and admin_password to platform_settings
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS admin_username TEXT DEFAULT 'admin';
ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS admin_password TEXT DEFAULT 'admin123';

-- ── RLS Policies ─────────────────────────────────────────────
ALTER TABLE game_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE aviator_game_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE aviator_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE aviator_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE aviator_house_edge ENABLE ROW LEVEL SECURITY;
ALTER TABLE aviator_live_he ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "game_rounds_all" ON game_rounds;
CREATE POLICY "game_rounds_all" ON game_rounds FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "game_bets_all" ON game_bets;
CREATE POLICY "game_bets_all" ON game_bets FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "aviator_state_all" ON aviator_game_state;
CREATE POLICY "aviator_state_all" ON aviator_game_state FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "aviator_settings_all" ON aviator_settings;
CREATE POLICY "aviator_settings_all" ON aviator_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "aviator_signals_all" ON aviator_signals;
CREATE POLICY "aviator_signals_all" ON aviator_signals FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "aviator_he_all" ON aviator_house_edge;
CREATE POLICY "aviator_he_all" ON aviator_house_edge FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "aviator_live_he_all" ON aviator_live_he;
CREATE POLICY "aviator_live_he_all" ON aviator_live_he FOR ALL USING (true) WITH CHECK (true);

-- ── Realtime Publication ─────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE IF EXISTS game_rounds;
ALTER PUBLICATION supabase_realtime ADD TABLE IF EXISTS game_bets;
ALTER PUBLICATION supabase_realtime ADD TABLE IF EXISTS aviator_game_state;
ALTER PUBLICATION supabase_realtime ADD TABLE IF EXISTS aviator_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE IF EXISTS aviator_signals;
ALTER PUBLICATION supabase_realtime ADD TABLE IF EXISTS aviator_house_edge;
ALTER PUBLICATION supabase_realtime ADD TABLE IF EXISTS aviator_live_he;

-- ── Seed default data ────────────────────────────────────────
INSERT INTO aviator_settings (id) VALUES ('config') ON CONFLICT (id) DO NOTHING;
INSERT INTO aviator_signals (id) VALUES ('crash') ON CONFLICT (id) DO NOTHING;
INSERT INTO aviator_house_edge (id) VALUES ('pool') ON CONFLICT (id) DO NOTHING;
INSERT INTO aviator_live_he (id) VALUES ('metrics') ON CONFLICT (id) DO NOTHING;

-- ── Storage bucket for game thumbnails ───────────────────────
INSERT INTO storage.buckets (id, name, public) VALUES ('game-thumbnails', 'game-thumbnails', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "game_thumbnails_public_read" ON storage.objects;
CREATE POLICY "game_thumbnails_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'game-thumbnails');

DROP POLICY IF EXISTS "game_thumbnails_public_insert" ON storage.objects;
CREATE POLICY "game_thumbnails_public_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'game-thumbnails');

DROP POLICY IF EXISTS "game_thumbnails_public_update" ON storage.objects;
CREATE POLICY "game_thumbnails_public_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'game-thumbnails');

DROP POLICY IF EXISTS "game_thumbnails_public_delete" ON storage.objects;
CREATE POLICY "game_thumbnails_public_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'game-thumbnails');
