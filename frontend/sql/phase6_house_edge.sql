-- ============================================================
-- Phase 6: House Edge Logic & Bet Tracking
-- ============================================================

-- 1. Aviator Bets Table (tracks all bets for a round)
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

-- 2. RLS for aviator_bets
ALTER TABLE aviator_bets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert aviator_bets" ON aviator_bets
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public read own aviator_bets" ON aviator_bets
  FOR SELECT USING (user_id = auth.uid() OR auth.uid() IS NULL);

CREATE POLICY "Admin manage aviator_bets" ON aviator_bets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'god'))
    OR auth.uid() IS NULL
  );

-- 3. House Edge Pool Functions

-- Record a bet
CREATE OR REPLACE FUNCTION record_aviator_bet(
  p_round_id TEXT,
  p_user_id UUID,
  p_username TEXT,
  p_amount DECIMAL(15,2),
  p_is_bot BOOLEAN DEFAULT false
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  bet_id UUID;
BEGIN
  INSERT INTO aviator_bets (round_id, user_id, username, amount, is_bot)
  VALUES (p_round_id, p_user_id, p_username, p_amount, p_is_bot)
  RETURNING id INTO bet_id;

  UPDATE aviator_house_pool SET
    total_bets = total_bets + p_amount,
    last_updated = NOW()
  WHERE id = 'pool';

  RETURN bet_id;
END;
$$;

-- Record a cashout (user wins)
CREATE OR REPLACE FUNCTION record_aviator_cashout(
  p_bet_id UUID,
  p_multiplier DECIMAL(10,2)
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  bet_row aviator_bets%ROWTYPE;
  win_amount DECIMAL(15,2);
  profit DECIMAL(15,2);
BEGIN
  SELECT * INTO bet_row FROM aviator_bets WHERE id = p_bet_id;

  IF NOT FOUND OR bet_row.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Bet not found or already processed');
  END IF;

  win_amount := bet_row.amount * p_multiplier;
  profit := bet_row.amount - win_amount;

  UPDATE aviator_bets SET
    status = 'cashed_out',
    multiplier = p_multiplier,
    cashout_amount = win_amount,
    cashout_multiplier = p_multiplier
  WHERE id = p_bet_id;

  UPDATE aviator_house_pool SET
    total_winnings = total_winnings + win_amount,
    house_profit = house_profit + profit,
    last_updated = NOW()
  WHERE id = 'pool';

  RETURN json_build_object(
    'success', true,
    'bet_id', p_bet_id,
    'win_amount', win_amount,
    'profit', profit
  );
END;
$$;

-- Process round end (all pending bets lost)
CREATE OR REPLACE FUNCTION process_aviator_round_end(
  p_round_id TEXT,
  p_crash_point DECIMAL(10,2)
)
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  pending_bets DECIMAL(15,2) := 0;
  bet_count INTEGER := 0;
BEGIN
  SELECT COALESCE(SUM(amount), 0), COUNT(*)
  INTO pending_bets, bet_count
  FROM aviator_bets
  WHERE round_id = p_round_id AND status = 'pending';

  IF pending_bets > 0 THEN
    UPDATE aviator_bets SET status = 'lost' WHERE round_id = p_round_id AND status = 'pending';

    UPDATE aviator_house_pool SET
      total_winnings = total_winnings + 0,
      house_profit = house_profit + pending_bets,
      rounds_played = rounds_played + 1,
      last_updated = NOW()
    WHERE id = 'pool';
  ELSE
    UPDATE aviator_house_pool SET
      rounds_played = rounds_played + 1,
      last_updated = NOW()
    WHERE id = 'pool';
  END IF;

  RETURN json_build_object(
    'success', true,
    'pending_bets', pending_bets,
    'bet_count', bet_count,
    'house_profit', pending_bets
  );
END;
$$;

-- Get house pool stats
CREATE OR REPLACE FUNCTION get_aviator_house_stats()
RETURNS JSON
LANGUAGE plpgsql
AS $$
DECLARE
  pool_row aviator_house_pool%ROWTYPE;
BEGIN
  SELECT * INTO pool_row FROM aviator_house_pool WHERE id = 'pool';

  RETURN json_build_object(
    'total_bets', pool_row.total_bets,
    'total_winnings', pool_row.total_winnings,
    'house_profit', pool_row.house_profit,
    'rounds_played', pool_row.rounds_played
  );
END;
$$;

-- Get round bets
CREATE OR REPLACE FUNCTION get_aviator_round_bets(p_round_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN json_agg(
    json_build_object(
      'id', id,
      'username', username,
      'amount', amount,
      'status', status,
      'cashout_amount', cashout_amount,
      'is_bot', is_bot
    )
  )
  FROM aviator_bets
  WHERE round_id = p_round_id;
END;
$$;

-- Clean old bets (keep last 1000)
CREATE OR REPLACE FUNCTION cleanup_old_bets()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM aviator_bets
  WHERE id NOT IN (
    SELECT id FROM aviator_bets ORDER BY created_at DESC LIMIT 1000
  );
END;
$$;

-- Seed default values
INSERT INTO aviator_house_pool (id, total_bets, total_winnings, house_profit, rounds_played)
VALUES ('pool', 0, 0, 0, 0)
ON CONFLICT (id) DO NOTHING;

SELECT 'Phase 6: House Edge Logic added!' as result;
