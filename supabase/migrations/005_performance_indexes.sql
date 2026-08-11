-- Phase 3: Performance - Add Missing Database Indexes
-- Run this in Supabase SQL Editor
-- Safe to re-run: uses IF NOT EXISTS and DO blocks for safety

-- ── Users table ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_balance ON users(balance DESC);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- ── Transactions table ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_transactions_user_id_created_at ON transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- ── Withdrawals table ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id_status ON withdrawals(user_id, status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON withdrawals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawals_method ON withdrawals(method);

-- ── Deposits table ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_deposits_user_id_status ON deposits(user_id, status);
CREATE INDEX IF NOT EXISTS idx_deposits_status ON deposits(status);
CREATE INDEX IF NOT EXISTS idx_deposits_created_at ON deposits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deposits_method ON deposits(method);

-- ── Audit Logs table (uses 'timestamp' not 'created_at') ─────
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id_timestamp ON audit_logs(actor_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_type ON audit_logs(actor_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target_type_target_id ON audit_logs(target_type, target_id);

-- ── Game Bets table ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_game_bets_user_id_created_at ON game_bets(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_bets_round_id ON game_bets(round_id);
CREATE INDEX IF NOT EXISTS idx_game_bets_status ON game_bets(status);
CREATE INDEX IF NOT EXISTS idx_game_bets_is_bot ON game_bets(is_bot);
CREATE INDEX IF NOT EXISTS idx_game_bets_is_demo ON game_bets(is_demo);

-- ── Game Rounds table ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_game_rounds_game_slug_created_at ON game_rounds(game_slug, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_game_rounds_status ON game_rounds(status);
CREATE INDEX IF NOT EXISTS idx_game_rounds_round_id ON game_rounds(round_id);

-- ── Player Bets (only if table exists) ───────────────────────
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'player_bets') THEN
    CREATE INDEX IF NOT EXISTS idx_player_bets_user_id_created_at ON player_bets(user_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_player_bets_round_id ON player_bets(round_id);
    CREATE INDEX IF NOT EXISTS idx_player_bets_status ON player_bets(status);
    CREATE INDEX IF NOT EXISTS idx_player_bets_is_bot ON player_bets(is_bot);
  END IF;
END $$;

-- ── Referrals ────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);

-- ── Bonuses ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_bonuses_user_id_status ON bonuses(user_id, status);
CREATE INDEX IF NOT EXISTS idx_bonuses_type ON bonuses(type);

-- ── Support Tickets ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id_status ON support_tickets(user_id, status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON support_tickets(priority);

-- ── Admin Wallet (uses 'updated_at') ─────────────────────────
CREATE INDEX IF NOT EXISTS idx_admin_wallet_updated_at ON admin_wallet(updated_at DESC);

-- ── Platform Settings (uses 'updated_at') ────────────────────
CREATE INDEX IF NOT EXISTS idx_platform_settings_updated_at ON platform_settings(updated_at DESC);

-- ── Landing Content (uses 'updated_at') ──────────────────────
CREATE INDEX IF NOT EXISTS idx_landing_content_updated_at ON landing_content(updated_at DESC);

-- ── Payment Methods ──────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_payment_methods_country_active ON payment_methods(country, is_active);
CREATE INDEX IF NOT EXISTS idx_payment_methods_type ON payment_methods(type);

-- ── Jackpot Tiers ────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_jackpot_tiers_is_active ON jackpot_tiers(is_active);

-- ── Password Reset Tokens ────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- ── Admin Accounts ───────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_admin_accounts_username ON admin_accounts(username);
CREATE INDEX IF NOT EXISTS idx_admin_accounts_is_active ON admin_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_accounts_role ON admin_accounts(role);

-- ── Admins ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);
CREATE INDEX IF NOT EXISTS idx_admins_is_active ON admins(is_active);
CREATE INDEX IF NOT EXISTS idx_admins_role ON admins(role);