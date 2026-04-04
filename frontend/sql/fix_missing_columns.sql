-- Add missing columns to existing tables for Phase 6 compatibility

-- aviator_game_state: Add missing columns
ALTER TABLE aviator_game_state ADD COLUMN IF NOT EXISTS multiplier DECIMAL(10,2) DEFAULT 1.00;
ALTER TABLE aviator_game_state ADD COLUMN IF NOT EXISTS countdown DECIMAL(5,2) DEFAULT 8.00;
ALTER TABLE aviator_game_state ADD COLUMN IF NOT EXISTS round_id TEXT DEFAULT 'init';
ALTER TABLE aviator_game_state ADD COLUMN IF NOT EXISTS flight_start_time BIGINT;
ALTER TABLE aviator_game_state ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Update existing row
UPDATE aviator_game_state SET 
  multiplier = COALESCE(multiplier, mult, 1.00),
  countdown = COALESCE(countdown, 8.00),
  round_id = COALESCE(round_id, 'init'),
  start_time = COALESCE(start_time, (EXTRACT(EPOCH FROM NOW())::BIGINT * 1000))
WHERE id = 'current';

-- aviator_settings: Add missing columns
ALTER TABLE aviator_settings ADD COLUMN IF NOT EXISTS he_mode TEXT DEFAULT 'off';
ALTER TABLE aviator_settings ADD COLUMN IF NOT EXISTS wait_time_seconds INTEGER DEFAULT 8;
ALTER TABLE aviator_settings ADD COLUMN IF NOT EXISTS min_bet INTEGER DEFAULT 10;
ALTER TABLE aviator_settings ADD COLUMN IF NOT EXISTS max_bet INTEGER DEFAULT 5000;
ALTER TABLE aviator_settings ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT true;

-- Update settings row
UPDATE aviator_settings SET 
  he_mode = COALESCE(he_mode, 'off'),
  min_bet = COALESCE(min_bet, 10),
  max_bet = COALESCE(max_bet, 5000),
  wait_time_seconds = COALESCE(wait_time_seconds, 8)
WHERE id = 'config';

-- aviator_bets: Create if not exists
CREATE TABLE IF NOT EXISTS aviator_bets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id TEXT NOT NULL,
  user_id UUID,
  username TEXT NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  multiplier DECIMAL(10,2),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost', 'cashed_out')),
  cashout_amount DECIMAL(15,2),
  cashout_multiplier DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_bot BOOLEAN DEFAULT false
);

-- aviator_house_pool: Create if not exists
CREATE TABLE IF NOT EXISTS aviator_house_pool (
  id TEXT PRIMARY KEY DEFAULT 'pool',
  total_bets DECIMAL(15,2) DEFAULT 0,
  total_winnings DECIMAL(15,2) DEFAULT 0,
  house_profit DECIMAL(15,2) DEFAULT 0,
  rounds_played INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default values
INSERT INTO aviator_game_state (id, phase, multiplier, countdown, round_id, start_time)
VALUES ('current', 'betting', 1.00, 8.00, 'init', (EXTRACT(EPOCH FROM NOW())::BIGINT * 1000))
ON CONFLICT (id) DO NOTHING;

INSERT INTO aviator_settings (id, house_edge, he_mode, min_bet, max_bet, wait_time_seconds, is_enabled)
VALUES ('config', 5.00, 'off', 10, 5000, 8, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO aviator_house_pool (id, total_bets, total_winnings, house_profit, rounds_played)
VALUES ('pool', 0, 0, 0, 0)
ON CONFLICT (id) DO NOTHING;

SELECT 'All tables fixed!' as result;
