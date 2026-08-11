-- Phase 3: Performance - Add Missing Database Indexes
-- Run this in Supabase SQL Editor
-- Safe: every index checks both table AND column existence

DO $$
BEGIN
  -- Users table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_users_balance ON users(balance DESC);
    CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
  END IF;

  -- Transactions table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN
    CREATE INDEX IF NOT EXISTS idx_transactions_user_id_created_at ON transactions(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
    CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference);
    CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
  END IF;

  -- Withdrawals table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'withdrawals') THEN
    CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id_status ON withdrawals(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
    CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON withdrawals(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_withdrawals_method ON withdrawals(method);
  END IF;

  -- Deposits table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'deposits') THEN
    CREATE INDEX IF NOT EXISTS idx_deposits_user_id_status ON deposits(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status);
    CREATE INDEX IF NOT EXISTS idx_deposits_created_at ON deposits(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_deposits_method ON deposits(method);
  END IF;

  -- Audit Logs table (uses 'timestamp' not 'created_at')
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id_timestamp ON audit_logs(actor_id, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_type ON audit_logs(actor_type);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_target_type_target_id ON audit_logs(target_type, target_id);
  END IF;

  -- Game Bets table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'game_bets') THEN
    CREATE INDEX IF NOT EXISTS idx_game_bets_user_id_created_at ON game_bets(user_id, created_at DESC);
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_bets' AND column_name = 'round_id') THEN
      CREATE INDEX IF NOT EXISTS idx_game_bets_round_id ON game_bets(round_id);
    END IF;
    CREATE INDEX IF NOT EXISTS idx_game_bets_status ON game_bets(status);
    CREATE INDEX IF NOT EXISTS idx_game_bets_is_bot ON game_bets(is_bot);
    CREATE INDEX IF NOT EXISTS idx_game_bets_is_demo ON game_bets(is_demo);
  END IF;

  -- Game Rounds table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'game_rounds') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_rounds' AND column_name = 'game_slug') THEN
      CREATE INDEX IF NOT EXISTS idx_game_rounds_game_slug_created_at ON game_rounds(game_slug, created_at DESC);
    END IF;
    CREATE INDEX IF NOT EXISTS idx_game_rounds_status ON game_rounds(status);
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'game_rounds' AND column_name = 'round_id') THEN
      CREATE INDEX IF NOT EXISTS idx_game_rounds_round_id ON game_rounds(round_id);
    END IF;
  END IF;

  -- Player Bets table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'player_bets') THEN
    CREATE INDEX IF NOT EXISTS idx_player_bets_user_id_created_at ON player_bets(user_id, created_at DESC);
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'player_bets' AND column_name = 'round_id') THEN
      CREATE INDEX IF NOT EXISTS idx_player_bets_round_id ON player_bets(round_id);
    END IF;
    CREATE INDEX IF NOT EXISTS idx_player_bets_status ON player_bets(status);
    CREATE INDEX IF NOT EXISTS idx_player_bets_is_bot ON player_bets(is_bot);
  END IF;

  -- Referrals table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'referrals') THEN
    CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
    CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);
    CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
  END IF;

  -- Bonuses table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bonuses') THEN
    CREATE INDEX IF NOT EXISTS idx_bonuses_user_id_status ON bonuses(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_bonuses_type ON bonuses(type);
  END IF;

  -- Support Tickets table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'support_tickets') THEN
    CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id_status ON support_tickets(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
    CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);
  END IF;

  -- Admin Wallet table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_wallet') THEN
    CREATE INDEX IF NOT EXISTS idx_admin_wallet_updated_at ON admin_wallet(updated_at DESC);
  END IF;

  -- Platform Settings table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'platform_settings') THEN
    CREATE INDEX IF NOT EXISTS idx_platform_settings_updated_at ON platform_settings(updated_at DESC);
  END IF;

  -- Landing Content table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'landing_content') THEN
    CREATE INDEX IF NOT EXISTS idx_landing_content_updated_at ON landing_content(updated_at DESC);
  END IF;

  -- Payment Methods table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_methods') THEN
    CREATE INDEX IF NOT EXISTS idx_payment_methods_country_active ON payment_methods(country, is_active);
    CREATE INDEX IF NOT EXISTS idx_payment_methods_type ON payment_methods(type);
  END IF;

  -- Jackpot Tiers table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'jackpot_tiers') THEN
    CREATE INDEX IF NOT EXISTS idx_jackpot_tiers_is_active ON jackpot_tiers(is_active);
  END IF;

  -- Password Reset Tokens table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'password_reset_tokens') THEN
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
    CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);
  END IF;

  -- Admin Accounts table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_accounts') THEN
    CREATE INDEX IF NOT EXISTS idx_admin_accounts_username ON admin_accounts(username);
    CREATE INDEX IF NOT EXISTS idx_admin_accounts_is_active ON admin_accounts(is_active);
    CREATE INDEX IF NOT EXISTS idx_admin_accounts_role ON admin_accounts(role);
  END IF;

  -- Admins table
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admins') THEN
    CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
    CREATE INDEX IF NOT EXISTS idx_admins_is_active ON admins(is_active);
    CREATE INDEX IF NOT EXISTS idx_admins_role ON admins(role);
  END IF;
END $$;