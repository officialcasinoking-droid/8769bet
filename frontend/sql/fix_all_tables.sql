-- ============================================================
-- Comprehensive fix for existing tables
-- ============================================================

-- Fix aviator_game_state: Add missing columns
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'aviator_game_state' AND column_name = 'multiplier') THEN
    ALTER TABLE aviator_game_state ADD COLUMN multiplier DECIMAL(10,2) DEFAULT 1.00;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'aviator_game_state' AND column_name = 'countdown') THEN
    ALTER TABLE aviator_game_state ADD COLUMN countdown DECIMAL(5,2) DEFAULT 8.00;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'aviator_game_state' AND column_name = 'round_id') THEN
    ALTER TABLE aviator_game_state ADD COLUMN round_id TEXT DEFAULT 'init';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'aviator_game_state' AND column_name = 'flight_start_time') THEN
    ALTER TABLE aviator_game_state ADD COLUMN flight_start_time BIGINT;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'aviator_game_state' AND column_name = 'created_at') THEN
    ALTER TABLE aviator_game_state ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'aviator_game_state' AND column_name = 'phase') THEN
    ALTER TABLE aviator_game_state ADD COLUMN phase TEXT DEFAULT 'betting';
  END IF;
END $$;

-- Update existing row with correct values
UPDATE aviator_game_state SET 
  phase = COALESCE(phase, 'betting'),
  multiplier = COALESCE(multiplier, mult, 1.00),
  countdown = COALESCE(countdown, 8.00),
  round_id = COALESCE(round_id, 'init'),
  start_time = COALESCE(start_time, EXTRACT(EPOCH FROM NOW())::BIGINT * 1000)
WHERE id = 'current';

-- Seed default values
INSERT INTO aviator_game_state (id, phase, multiplier, countdown, round_id, start_time)
VALUES ('current', 'betting', 1.00, 8.00, 'init', EXTRACT(EPOCH FROM NOW())::BIGINT * 1000)
ON CONFLICT (id) DO NOTHING;

-- Fix aviator_settings: Add missing columns
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'aviator_settings' AND column_name = 'he_mode') THEN
    ALTER TABLE aviator_settings ADD COLUMN he_mode TEXT DEFAULT 'off';
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'aviator_settings' AND column_name = 'min_bet') THEN
    ALTER TABLE aviator_settings ADD COLUMN min_bet INTEGER DEFAULT 10;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'aviator_settings' AND column_name = 'max_bet') THEN
    ALTER TABLE aviator_settings ADD COLUMN max_bet INTEGER DEFAULT 5000;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'aviator_settings' AND column_name = 'wait_time_seconds') THEN
    ALTER TABLE aviator_settings ADD COLUMN wait_time_seconds INTEGER DEFAULT 8;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'aviator_settings' AND column_name = 'is_enabled') THEN
    ALTER TABLE aviator_settings ADD COLUMN is_enabled BOOLEAN DEFAULT true;
  END IF;
END $$;

-- Update settings row
UPDATE aviator_settings SET 
  he_mode = COALESCE(he_mode, 'off'),
  min_bet = COALESCE(min_bet, 10),
  max_bet = COALESCE(max_bet, 5000),
  wait_time_seconds = COALESCE(wait_time_seconds, 8)
WHERE id = 'config';

-- Seed default settings
INSERT INTO aviator_settings (id, house_edge, he_mode, min_bet, max_bet, wait_time_seconds, is_enabled)
VALUES ('config', 5.00, 'off', 10, 5000, 8, true)
ON CONFLICT (id) DO NOTHING;

-- Create aviator_house_pool if it doesn't exist (may already have aviator_house_edge)
CREATE TABLE IF NOT EXISTS aviator_house_pool (
  id TEXT PRIMARY KEY DEFAULT 'pool',
  total_bets DECIMAL(15,2) DEFAULT 0,
  total_winnings DECIMAL(15,2) DEFAULT 0,
  house_profit DECIMAL(15,2) DEFAULT 0,
  rounds_played INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO aviator_house_pool (id, total_bets, total_winnings, house_profit, rounds_played)
VALUES ('pool', 0, 0, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- Create aviator_bots if it doesn't exist
CREATE TABLE IF NOT EXISTS aviator_bots (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true
);

INSERT INTO aviator_bots (name) VALUES
  ('Ali_Khan'), ('Sara_Ahmed'), ('Usman_Ali'), ('Fatima_Zahid'), ('Ahmed_Raza'),
  ('Ayesha_Khan'), ('Bilal_Hassan'), ('Zainab_Malik'), ('Hassan_Ali'), ('Mariam_Waseem'),
  ('Hamza_Saeed'), ('Hira_Nawaz'), ('Saad_Afzal'), ('Nadia_Iqbal'), ('Faisal_Imran')
ON CONFLICT DO NOTHING;

SELECT 'All tables fixed!' as result;
