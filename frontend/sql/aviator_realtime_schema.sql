-- ============================================================
-- Phase 1: Supabase Tables for Realtime Game Engine
-- ============================================================

-- 1. Aviator Game State (Single source of truth for live game)
CREATE TABLE IF NOT EXISTS aviator_game_state (
  id TEXT PRIMARY KEY DEFAULT 'current',
  phase TEXT NOT NULL DEFAULT 'betting' CHECK (phase IN ('betting', 'flying', 'crashed')),
  multiplier DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  countdown DECIMAL(5,2) NOT NULL DEFAULT 8.00,
  crash_point DECIMAL(10,2) DEFAULT 1.00,
  round_id TEXT NOT NULL,
  start_time BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW())::BIGINT * 1000),
  flight_start_time BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Aviator Settings
CREATE TABLE IF NOT EXISTS aviator_settings (
  id TEXT PRIMARY KEY DEFAULT 'config',
  house_edge DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  he_mode TEXT DEFAULT 'off' CHECK (he_mode IN ('off', 'smart', 'aggressive')),
  he_target_pct INTEGER DEFAULT 5,
  he_min_secs INTEGER DEFAULT 3,
  he_max_secs INTEGER DEFAULT 50,
  auto_target_secs INTEGER DEFAULT 8,
  min_bet INTEGER DEFAULT 10,
  max_bet INTEGER DEFAULT 5000,
  wait_time_seconds INTEGER DEFAULT 8,
  is_enabled BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Aviator House Edge Pool (Tracking)
CREATE TABLE IF NOT EXISTS aviator_house_pool (
  id TEXT PRIMARY KEY DEFAULT 'pool',
  total_bets DECIMAL(15,2) DEFAULT 0,
  total_winnings DECIMAL(15,2) DEFAULT 0,
  house_profit DECIMAL(15,2) DEFAULT 0,
  rounds_played INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Bot Names (for generating fake bets)
CREATE TABLE IF NOT EXISTS aviator_bots (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true
);

-- Insert default bot names
INSERT INTO aviator_bots (name) VALUES
  ('Ali_Khan'), ('Sara_Ahmed'), ('Usman_Ali'), ('Fatima_Zahid'), ('Ahmed_Raza'),
  ('Ayesha_Khan'), ('Bilal_Hassan'), ('Zainab_Malik'), ('Hassan_Ali'), ('Mariam_Waseem'),
  ('Hamza_Saeed'), ('Hira_Nawaz'), ('Saad_Afzal'), ('Nadia_Iqbal'), ('Faisal_Imran')
ON CONFLICT DO NOTHING;

-- 5. Crash History
CREATE TABLE IF NOT EXISTS aviator_crash_history (
  id SERIAL PRIMARY KEY,
  round_id TEXT NOT NULL,
  crash_point DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Enable RLS
-- ============================================================

ALTER TABLE aviator_game_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE aviator_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE aviator_house_pool ENABLE ROW LEVEL SECURITY;
ALTER TABLE aviator_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE aviator_crash_history ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS Policies
-- ============================================================

-- aviator_game_state: Public read, Admin write
CREATE POLICY "Public read aviator_game_state" ON aviator_game_state
  FOR SELECT USING (true);

CREATE POLICY "Admin update aviator_game_state" ON aviator_game_state
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'god'))
    OR auth.uid() IS NULL
  );

-- aviator_settings: Public read, Admin write
CREATE POLICY "Public read aviator_settings" ON aviator_settings
  FOR SELECT USING (true);

CREATE POLICY "Admin update aviator_settings" ON aviator_settings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'god'))
    OR auth.uid() IS NULL
  );

-- aviator_house_pool: Admin only
CREATE POLICY "Admin read aviator_house_pool" ON aviator_house_pool
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'god'))
    OR auth.uid() IS NULL
  );

CREATE POLICY "Admin update aviator_house_pool" ON aviator_house_pool
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'god'))
    OR auth.uid() IS NULL
  );

-- aviator_bots: Public read
CREATE POLICY "Public read aviator_bots" ON aviator_bots
  FOR SELECT USING (true);

-- aviator_crash_history: Public read
CREATE POLICY "Public read aviator_crash_history" ON aviator_crash_history
  FOR SELECT USING (true);

-- ============================================================
-- Default Values
-- ============================================================

INSERT INTO aviator_game_state (id, phase, multiplier, countdown, round_id, start_time)
VALUES ('current', 'betting', 1.00, 8.00, 'init', EXTRACT(EPOCH FROM NOW())::BIGINT * 1000)
ON CONFLICT (id) DO NOTHING;

INSERT INTO aviator_settings (id, house_edge, he_mode, min_bet, max_bet, wait_time_seconds, is_enabled)
VALUES ('config', 5.00, 'off', 10, 5000, 8, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO aviator_house_pool (id, total_bets, total_winnings, house_profit, rounds_played)
VALUES ('pool', 0, 0, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Game Engine Functions
-- ============================================================

-- Generate crash point based on house edge
CREATE OR REPLACE FUNCTION generate_crash_point(house_edge DECIMAL(5,2) DEFAULT 5.00)
RETURNS DECIMAL(10,2)
LANGUAGE plpgsql
AS $$
DECLARE
  r DECIMAL;
  e DECIMAL;
  p1 DECIMAL;
  p2 DECIMAL;
  p3 DECIMAL;
  p4 DECIMAL;
  crash DECIMAL(10,2);
BEGIN
  r := random();
  e := greatest(0, least(house_edge, 20));
  
  p1 := 0.40 - e * 2;
  p2 := 0.25 - e;
  p3 := 0.15;
  p4 := 0.12;
  
  IF r < p1 THEN
    crash := 1.00 + random() * 0.50;
  ELSIF r < p1 + p2 THEN
    crash := 1.50 + random() * 1.00;
  ELSIF r < p1 + p2 + p3 THEN
    crash := 2.50 + random() * 2.00;
  ELSIF r < p1 + p2 + p3 + p4 THEN
    crash := 4.50 + random() * 5.50;
  ELSE
    crash := 10.00 + random() * 40.00;
  END IF;
  
  RETURN round(crash, 2);
END;
$$;

-- Start new betting round
CREATE OR REPLACE FUNCTION start_aviator_betting_round()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  new_round_id TEXT;
  crash_pt DECIMAL(10,2);
  settings_row aviator_settings%ROWTYPE;
BEGIN
  -- Get settings
  SELECT * INTO settings_row FROM aviator_settings WHERE id = 'config';
  
  -- Generate new round ID
  new_round_id := 'r_' || EXTRACT(EPOCH FROM NOW())::BIGINT || '_' || substr(md5(random()::text), 1, 6);
  
  -- Generate crash point
  crash_pt := generate_crash_point(settings_row.house_edge);
  
  -- Update game state
  UPDATE aviator_game_state SET
    phase = 'betting',
    multiplier = 1.00,
    countdown = settings_row.wait_time_seconds,
    crash_point = crash_pt,
    round_id = new_round_id,
    start_time = EXTRACT(EPOCH FROM NOW())::BIGINT * 1000,
    flight_start_time = NULL,
    updated_at = NOW()
  WHERE id = 'current';
  
  RETURN json_build_object(
    'success', true,
    'round_id', new_round_id,
    'crash_point', crash_pt,
    'phase', 'betting',
    'countdown', settings_row.wait_time_seconds
  );
END;
$$;

-- Start flying phase
CREATE OR REPLACE FUNCTION start_aviator_flying()
RETURNS JSON
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE aviator_game_state SET
    phase = 'flying',
    multiplier = 1.00,
    flight_start_time = EXTRACT(EPOCH FROM NOW())::BIGINT * 1000,
    updated_at = NOW()
  WHERE id = 'current';
  
  RETURN json_build_object('success', true, 'phase', 'flying');
END;
$$;

-- Crash the game
CREATE OR REPLACE FUNCTION crash_aviator_game(crash_point_val DECIMAL(10,2))
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  state_row aviator_game_state%ROWTYPE;
  bet_row RECORD;
  total_bet DECIMAL(15,2) := 0;
  total_won DECIMAL(15,2) := 0;
  profit DECIMAL(15,2);
BEGIN
  -- Get current state
  SELECT * INTO state_row FROM aviator_game_state WHERE id = 'current';
  
  IF state_row.phase != 'flying' THEN
    RETURN json_build_object('success', false, 'error', 'Game not flying');
  END IF;
  
  -- Update game state to crashed
  UPDATE aviator_game_state SET
    phase = 'crashed',
    multiplier = crash_point_val,
    updated_at = NOW()
  WHERE id = 'current';
  
  -- Add to crash history
  INSERT INTO aviator_crash_history (round_id, crash_point)
  VALUES (state_row.round_id, crash_point_val);
  
  -- Keep only last 30 crash points
  DELETE FROM aviator_crash_history 
  WHERE id NOT IN (SELECT id FROM aviator_crash_history ORDER BY created_at DESC LIMIT 30);
  
  -- Calculate house edge (simplified - all pending bets are lost)
  -- In real implementation, would calculate based on actual bet outcomes
  
  RETURN json_build_object(
    'success', true,
    'phase', 'crashed',
    'crash_point', crash_point_val,
    'round_id', state_row.round_id
  );
END;
$$;

-- Get current game state
CREATE OR REPLACE FUNCTION get_aviator_state()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  state_row aviator_game_state%ROWTYPE;
  settings_row aviator_settings%ROWTYPE;
BEGIN
  SELECT * INTO state_row FROM aviator_game_state WHERE id = 'current';
  SELECT * INTO settings_row FROM aviator_settings WHERE id = 'config';
  
  RETURN json_build_object(
    'phase', state_row.phase,
    'multiplier', state_row.multiplier,
    'countdown', state_row.countdown,
    'crash_point', state_row.crash_point,
    'round_id', state_row.round_id,
    'start_time', state_row.start_time,
    'flight_start_time', state_row.flight_start_time,
    'settings', json_build_object(
      'house_edge', settings_row.house_edge,
      'he_mode', settings_row.he_mode,
      'wait_time_seconds', settings_row.wait_time_seconds
    )
  );
END;
$$;

-- Update settings
CREATE OR REPLACE FUNCTION update_aviator_settings(
  p_house_edge DECIMAL(5,2) DEFAULT NULL,
  p_he_mode TEXT DEFAULT NULL,
  p_wait_time INTEGER DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE aviator_settings SET
    house_edge = COALESCE(p_house_edge, house_edge),
    he_mode = COALESCE(p_he_mode, he_mode),
    wait_time_seconds = COALESCE(p_wait_time, wait_time_seconds),
    updated_at = NOW()
  WHERE id = 'config';
  
  RETURN json_build_object('success', true);
END;
$$;

-- Admin: Force crash
CREATE OR REPLACE FUNCTION admin_force_crash()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  state_row aviator_game_state%ROWTYPE;
BEGIN
  SELECT * INTO state_row FROM aviator_game_state WHERE id = 'current';
  
  IF state_row.phase != 'flying' THEN
    RETURN json_build_object('success', false, 'error', 'Game not flying');
  END IF;
  
  RETURN crash_aviator_game(state_row.multiplier);
END;
$$;

-- Admin: Force new round
CREATE OR REPLACE FUNCTION admin_new_round()
RETURNS JSON
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN start_aviator_betting_round();
END;
$$;