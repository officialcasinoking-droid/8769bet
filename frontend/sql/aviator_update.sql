-- Aviator House Edge Pool Updates
-- Run this in Supabase SQL Editor to update RPC functions

-- Drop existing functions
DROP FUNCTION IF EXISTS update_aviator_he_pool(NUMERIC, NUMERIC, DECIMAL);
DROP FUNCTION IF EXISTS record_aviator_deposit(NUMERIC);
DROP FUNCTION IF EXISTS record_aviator_withdrawal(NUMERIC);

-- 1. Ensure the aviator_house_edge table exists
CREATE TABLE IF NOT EXISTS aviator_house_edge (
  id TEXT PRIMARY KEY DEFAULT 'pool',
  total_deposits NUMERIC DEFAULT 0,
  total_bets NUMERIC DEFAULT 0,
  total_winnings_paid NUMERIC DEFAULT 0,
  house_edge_pool NUMERIC DEFAULT 0,
  total_withdrawals_paid NUMERIC DEFAULT 0,
  gross_pnl NUMERIC DEFAULT 0,
  rounds_played INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed the pool row if missing
INSERT INTO aviator_house_edge (id) VALUES ('pool')
ON CONFLICT (id) DO NOTHING;

-- Disable RLS
ALTER TABLE aviator_house_edge DISABLE ROW LEVEL SECURITY;

-- 2. Update house edge pool after a round ends
-- gross_pnl = total_deposits + total_bets - total_winnings_paid - total_withdrawals_paid
-- This reflects real platform P&L
CREATE OR REPLACE FUNCTION update_aviator_he_pool(
  p_real_bet NUMERIC,
  p_real_exit NUMERIC,
  p_crash_mult DECIMAL
) RETURNS void AS $$
DECLARE
  v_pending NUMERIC;
  v_round_edge NUMERIC;
  v_new_bets NUMERIC;
  v_new_winnings NUMERIC;
  v_new_withdrawals NUMERIC;
  v_new_pool NUMERIC;
BEGIN
  v_pending := p_real_bet - p_real_exit;
  v_round_edge := v_pending * 0.05;

  UPDATE aviator_house_edge SET
    total_bets = total_bets + p_real_bet,
    total_winnings_paid = total_winnings_paid + p_real_exit,
    house_edge_pool = house_edge_pool + v_round_edge,
    gross_pnl = (total_deposits + total_bets + p_real_bet) - (total_winnings_paid + p_real_exit) - (total_withdrawals_paid),
    rounds_played = rounds_played + 1,
    updated_at = NOW()
  WHERE id = 'pool';
END;
$$ LANGUAGE plpgsql;

-- 3. Record user deposit
CREATE OR REPLACE FUNCTION record_aviator_deposit(p_amount NUMERIC) RETURNS void AS $$
BEGIN
  UPDATE aviator_house_edge SET
    total_deposits = total_deposits + p_amount,
    gross_pnl = (total_deposits + p_amount) - total_winnings_paid - total_withdrawals_paid,
    updated_at = NOW()
  WHERE id = 'pool';
END;
$$ LANGUAGE plpgsql;

-- 4. Record withdrawal (deducted from house edge pool)
CREATE OR REPLACE FUNCTION record_aviator_withdrawal(p_amount NUMERIC) RETURNS void AS $$
BEGIN
  UPDATE aviator_house_edge SET
    total_withdrawals_paid = total_withdrawals_paid + p_amount,
    house_edge_pool = house_edge_pool - p_amount,
    gross_pnl = total_deposits + total_bets - total_winnings_paid - (total_withdrawals_paid + p_amount),
    updated_at = NOW()
  WHERE id = 'pool';
END;
$$ LANGUAGE plpgsql;
