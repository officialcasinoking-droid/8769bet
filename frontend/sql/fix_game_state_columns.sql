-- Fix: Add missing columns to existing aviator_game_state table

-- Add multiplier column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'aviator_game_state' AND column_name = 'multiplier') THEN
    ALTER TABLE aviator_game_state ADD COLUMN multiplier DECIMAL(10,2) DEFAULT 1.00;
  END IF;
END $$;

-- Add countdown column if it doesn't exist (as decimal)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'aviator_game_state' AND column_name = 'countdown') THEN
    ALTER TABLE aviator_game_state ADD COLUMN countdown DECIMAL(5,2) DEFAULT 8.00;
  END IF;
END $$;

-- Add round_id column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'aviator_game_state' AND column_name = 'round_id') THEN
    ALTER TABLE aviator_game_state ADD COLUMN round_id TEXT DEFAULT 'init';
  END IF;
END $$;

-- Add flight_start_time column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'aviator_game_state' AND column_name = 'flight_start_time') THEN
    ALTER TABLE aviator_game_state ADD COLUMN flight_start_time BIGINT;
  END IF;
END $$;

-- Add created_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'aviator_game_state' AND column_name = 'created_at') THEN
    ALTER TABLE aviator_game_state ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- Update existing row with new columns if needed
UPDATE aviator_game_state SET 
  multiplier = COALESCE(multiplier, mult, 1.00),
  countdown = COALESCE(countdown, 8.00),
  round_id = COALESCE(round_id, 'init'),
  start_time = COALESCE(start_time, EXTRACT(EPOCH FROM NOW())::BIGINT * 1000)
WHERE id = 'current';

-- Seed default values (use correct column names)
INSERT INTO aviator_game_state (id, phase, multiplier, countdown, round_id, start_time)
VALUES ('current', 'betting', 1.00, 8.00, 'init', EXTRACT(EPOCH FROM NOW())::BIGINT * 1000)
ON CONFLICT (id) DO NOTHING;

SELECT 'Game state columns fixed!' as result;
