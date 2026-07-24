-- Fix RLS policy on aviator_settings table
-- Only service_role and admins should be able to modify settings

-- Drop existing overly permissive policy
DROP POLICY IF EXISTS "Admins can update settings" ON aviator_settings;
DROP POLICY IF EXISTS "Anyone can view settings" ON aviator_settings;

-- Recreate with proper permissions
CREATE POLICY "Anyone can view settings" ON aviator_settings 
  FOR SELECT USING (true);

CREATE POLICY "Service role can modify settings" ON aviator_settings 
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Also fix admin_wallet policy to be consistent
DROP POLICY IF EXISTS "Admins can view wallet" ON admin_wallet;
DROP POLICY IF EXISTS "Only service role can modify wallet" ON admin_wallet;

CREATE POLICY "Admins can view wallet" ON admin_wallet 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'god')
    )
  );

CREATE POLICY "Service role can modify wallet" ON admin_wallet 
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Fix player_bets RLS - currently allows any authenticated user to insert
DROP POLICY IF EXISTS "Users can insert their own bets" ON player_bets;

CREATE POLICY "Users can insert their own bets" ON player_bets 
  FOR INSERT WITH CHECK (
    auth.uid() = user_id OR is_bot = true
  );

-- Fix game_rounds policy
DROP POLICY IF EXISTS "Only service role can modify game rounds" ON game_rounds;

CREATE POLICY "Only service role can modify game rounds" ON game_rounds 
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Fix aviator_admin_signals policy
DROP POLICY IF EXISTS "Admins can create signals" ON aviator_admin_signals;

CREATE POLICY "Admins can create signals" ON aviator_admin_signals 
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('admin', 'god')
    )
  );