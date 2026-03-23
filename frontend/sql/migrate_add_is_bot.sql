-- Migration: Add is_bot column to game_bets table
-- Run this if you already have the aviator_schema applied

-- Add is_bot column
ALTER TABLE game_bets ADD COLUMN IF NOT EXISTS is_bot BOOLEAN DEFAULT false;

-- Update RLS policy for bot bets
DROP POLICY IF EXISTS "Users can insert their own bets" ON game_bets;
CREATE POLICY "Users can insert their own bets" ON game_bets
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR 
    auth.uid() IS NULL OR 
    (user_id IS NULL AND is_bot = true)
  );

-- Add index for is_bot
CREATE INDEX IF NOT EXISTS idx_bets_is_bot ON game_bets(is_bot);
