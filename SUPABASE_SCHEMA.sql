-- ============================================================
-- 399BET - COMPLETE RESET & REBUILD
-- Run this ONCE in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Drop existing tables (safe to re-run) ────────────────────
DROP TABLE IF EXISTS support_tickets CASCADE;
DROP TABLE IF EXISTS bonuses CASCADE;
DROP TABLE IF EXISTS referrals CASCADE;
DROP TABLE IF EXISTS platform_settings CASCADE;
DROP TABLE IF EXISTS jackpot_tiers CASCADE;
DROP TABLE IF EXISTS withdrawals CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS payment_methods CASCADE;
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS admin_wallet CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS landing_content CASCADE;

-- ── Landing Content (hero, colors, header, footer) ──────────
CREATE TABLE landing_content (
  id TEXT PRIMARY KEY DEFAULT 'main',
  draft_json JSONB DEFAULT '{
    "title": "Welcome to 399bet",
    "subtitle": "Best AI-powered bets with AI Agent",
    "heroImage": "",
    "logoUrl": "",
    "colors": {
      "primary": "#10b981",
      "accent": "#6366f1",
      "background": "#0f172a",
      "text": "#f1f5f9",
      "success": "#22c55e",
      "warning": "#f59e0b",
      "jackpot": "#f59e0b"
    },
    "showAnnouncements": true,
    "showJackpot": true,
    "showCategories": true,
    "showGameCards": true,
    "gameCards": [],
    "footerText": "© 2026 399bet. All rights reserved.",
    "announcements": [
      {"id": "1", "text": "New users get 100% bonus on first deposit!", "expiry": "2026-12-31"},
      {"id": "2", "text": "AI Agent accuracy is now 94%!", "expiry": "2026-12-31"}
    ],
    "categories": [
      {"id": "1", "name": "Slots", "icon": "🤑"},
      {"id": "2", "name": "Crash", "icon": "🚀"},
      {"id": "3", "name": "Live", "icon": "♠️"},
      {"id": "4", "name": "AI Pick", "icon": "🤖"}
    ],
    "headerBg": "#0f172a",
    "headerLogoUrl": "",
    "headerSearchPlaceholder": "Search games...",
    "headerShowLogin": true,
    "headerShowSignup": true
  }',
  live_json JSONB DEFAULT '{
    "title": "Welcome to 399bet",
    "subtitle": "Best AI-powered bets with AI Agent",
    "heroImage": "",
    "logoUrl": "",
    "colors": {
      "primary": "#10b981",
      "accent": "#6366f1",
      "background": "#0f172a",
      "text": "#f1f5f9",
      "success": "#22c55e",
      "warning": "#f59e0b",
      "jackpot": "#f59e0b"
    },
    "showAnnouncements": true,
    "showJackpot": true,
    "showCategories": true,
    "showGameCards": true,
    "gameCards": [],
    "footerText": "© 2026 399bet. All rights reserved.",
    "announcements": [
      {"id": "1", "text": "New users get 100% bonus on first deposit!", "expiry": "2026-12-31"},
      {"id": "2", "text": "AI Agent accuracy is now 94%!", "expiry": "2026-12-31"}
    ],
    "categories": [
      {"id": "1", "name": "Slots", "icon": "🤑"},
      {"id": "2", "name": "Crash", "icon": "🚀"},
      {"id": "3", "name": "Live", "icon": "♠️"},
      {"id": "4", "name": "AI Pick", "icon": "🤖"}
    ],
    "headerBg": "#0f172a",
    "headerLogoUrl": "",
    "headerSearchPlaceholder": "Search games...",
    "headerShowLogin": true,
    "headerShowSignup": true
  }',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Users (mirrors Supabase Auth + app-specific fields) ─────
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  balance DECIMAL(14,2) DEFAULT 0.00,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Admin Wallet ─────────────────────────────────────────────
CREATE TABLE admin_wallet (
  id TEXT PRIMARY KEY DEFAULT 'main',
  balance DECIMAL(14,2) DEFAULT 100000.00,
  drawdown_percent INTEGER DEFAULT 12,
  min_deposit DECIMAL(14,2) DEFAULT 10.00,
  max_deposit DECIMAL(14,2) DEFAULT 10000.00,
  min_withdrawal DECIMAL(14,2) DEFAULT 10.00,
  max_withdrawal DECIMAL(14,2) DEFAULT 5000.00,
  withdrawal_fee_percent DECIMAL(5,2) DEFAULT 1.00,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── Transactions (deposits, withdrawals, bets, wins) ───────────
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'bet', 'win', 'bonus', 'refund')),
  amount DECIMAL(14,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed', 'failed')),
  reference TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- ── Withdrawals ──────────────────────────────────────────────
CREATE TABLE withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  amount DECIMAL(14,2) NOT NULL,
  fee DECIMAL(14,2) DEFAULT 0,
  net_amount DECIMAL(14,2) NOT NULL,
  method TEXT DEFAULT 'upi',
  details JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- ── Payment Methods ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT DEFAULT 'wallet' CHECK (type IN ('upi', 'bank', 'crypto', 'wallet')),
  country TEXT DEFAULT 'pakistan' CHECK (country IN ('pakistan', 'india', 'global')),
  logo_url TEXT,
  min_amount DECIMAL(14,2) DEFAULT 100.00,
  max_amount DECIMAL(14,2) DEFAULT 50000.00,
  fee_percent DECIMAL(5,2) DEFAULT 0.00,
  daily_limit DECIMAL(14,2) DEFAULT 100000.00,
  auto_approve BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default payment methods (Pakistan + India + Crypto)
INSERT INTO payment_methods (name, type, country, min_amount, max_amount, fee_percent, auto_approve, is_active) VALUES
  ('JazzCash', 'wallet', 'pakistan', 100, 50000, 0, true, true),
  ('EasyPaisa', 'wallet', 'pakistan', 100, 50000, 0, true, true),
  ('Bank Transfer (PK)', 'bank', 'pakistan', 500, 200000, 0, false, true),
  ('UPI (India)', 'upi', 'india', 100, 50000, 0, true, true),
  ('Paytm', 'wallet', 'india', 100, 50000, 0, true, true),
  ('PhonePe', 'wallet', 'india', 100, 50000, 0, true, true),
  ('USDT (TRC20)', 'crypto', 'global', 500, 500000, 1, false, true),
  ('Bitcoin (BTC)', 'crypto', 'global', 1000, 1000000, 2, false, true);

-- ── Games ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  provider TEXT DEFAULT '',
  category TEXT DEFAULT 'Slots' CHECK (category IN ('Slots', 'Crash', 'Live', 'Fishing', 'Table', 'Lottery')),
  rtp DECIMAL(5,2) DEFAULT 97.00,
  thumbnail_url TEXT,
  max_multiplier TEXT DEFAULT '10000',
  is_active BOOLEAN DEFAULT TRUE,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO games (name, provider, category, rtp, max_multiplier, is_active) VALUES
  ('Aviator', 'Spribe', 'Crash', 97.00, '10000', TRUE),
  ('Fortune Gems 3', 'JILI', 'Slots', 96.00, '5000', TRUE),
  ('Money Coming', 'JILI', 'Slots', 95.00, '10000', TRUE),
  ('Crazy777', 'WG', 'Slots', 94.00, '7777', TRUE),
  ('Lucky Jet', '3 Oaks', 'Crash', 96.00, '10000', TRUE),
  ('JetX', 'SmartSoft', 'Crash', 97.00, '10000', FALSE),
  ('Sweet Bonanza', 'Pragmatic Play', 'Slots', 96.50, '21175', TRUE),
  ('Lightning Roulette', 'Evolution', 'Live', 97.30, '500', TRUE);

DROP POLICY IF EXISTS "games_all" ON games;
CREATE POLICY "games_all" ON games FOR ALL USING (true) WITH CHECK (true);

-- ── Jackpot Tiers ───────────────────────────────────────────
CREATE TABLE jackpot_tiers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  seed_amount DECIMAL(14,2) DEFAULT 0,
  current_amount DECIMAL(14,2) DEFAULT 0,
  increment_percent DECIMAL(5,2) DEFAULT 0.01,
  is_active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed jackpot tiers
INSERT INTO jackpot_tiers (id, name, seed_amount, current_amount) VALUES
  ('mini', 'Mini', 500, 847.50),
  ('minor', 'Minor', 5000, 12847.25),
  ('major', 'Major', 50000, 127458.00),
  ('grand', 'Grand', 1000000, 1847293.75);

-- Seed admin wallet (will be overwritten by RLS section)
INSERT INTO admin_wallet (id, balance, drawdown_percent) VALUES ('main', 100000, 12);

-- ── Seed demo + admin users ─────────────────────────────────
INSERT INTO users (id, username, email, full_name, role, balance) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin', 'admin@399bet.com', 'Admin User', 'admin', 100000.00),
  ('00000000-0000-0000-0000-000000000002', 'demo', 'demo@399bet.com', 'Demo User', 'user', 5000.00);

-- ── Row Level Security (open for admin tool) ────────────────────
ALTER TABLE landing_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE jackpot_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;

-- Landing content: everyone full access (admin editor)
DROP POLICY IF EXISTS "landing_read_all" ON landing_content;
DROP POLICY IF EXISTS "landing_admin_update" ON landing_content;
CREATE POLICY "landing_all" ON landing_content FOR ALL USING (true) WITH CHECK (true);
INSERT INTO landing_content (id) VALUES ('main') ON CONFLICT (id) DO NOTHING;

-- Jackpot: everyone read
DROP POLICY IF EXISTS "jackpot_read_all" ON jackpot_tiers;
CREATE POLICY "jackpot_read_all" ON jackpot_tiers FOR SELECT USING (true);

-- Admin wallet: everyone read/write (admin editor)
DROP POLICY IF EXISTS "wallet_read_all" ON admin_wallet;
DROP POLICY IF EXISTS "wallet_update_admin" ON admin_wallet;
CREATE POLICY "wallet_all" ON admin_wallet FOR ALL USING (true) WITH CHECK (true);
INSERT INTO admin_wallet (id, balance, drawdown_percent) VALUES ('main', 100000, 12) ON CONFLICT (id) DO NOTHING;

-- Users: everyone read, auth users update own
DROP POLICY IF EXISTS "users_read_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
CREATE POLICY "users_read_all" ON users FOR SELECT USING (true);
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (true) WITH CHECK (true);

-- Transactions: everyone read/write (admin editor)
DROP POLICY IF EXISTS "tx_read_own" ON transactions;
DROP POLICY IF EXISTS "tx_insert_auth" ON transactions;
CREATE POLICY "tx_all" ON transactions FOR ALL USING (true) WITH CHECK (true);

-- Withdrawals: everyone read/write
DROP POLICY IF EXISTS "wd_read_own" ON withdrawals;
DROP POLICY IF EXISTS "wd_insert_auth" ON withdrawals;
CREATE POLICY "wd_all" ON withdrawals FOR ALL USING (true) WITH CHECK (true);

-- Payment methods: everyone full access
DROP POLICY IF EXISTS "pm_all" ON payment_methods;
CREATE POLICY "pm_all" ON payment_methods FOR ALL USING (true) WITH CHECK (true);

-- ── Storage Policies (public read/write for landing-images) ───
DROP POLICY IF EXISTS "landing_images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "landing_images_public_insert" ON storage.objects;
DROP POLICY IF EXISTS "landing_images_public_update" ON storage.objects;
DROP POLICY IF EXISTS "landing_images_public_delete" ON storage.objects;

CREATE POLICY "landing_images_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'landing-images');

CREATE POLICY "landing_images_public_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'landing-images');

CREATE POLICY "landing_images_public_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'landing-images');

CREATE POLICY "landing_images_public_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'landing-images');

-- ── Platform Settings ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_settings (
  id TEXT PRIMARY KEY DEFAULT 'main',
  groq_api_key TEXT DEFAULT '',
  support_icon_enabled BOOLEAN DEFAULT TRUE,
  referral_settings JSONB DEFAULT '{
    "level1_percent": 5,
    "level2_percent": 2,
    "level3_percent": 1,
    "deposit_bonus_percent": 10,
    "min_deposit_for_bonus": 100,
    "max_bonus": 1000,
    "active": true
  }',
  bonus_rules JSONB DEFAULT '{
    "deposit_bonus_enabled": true,
    "deposit_tiers": [
      {"min": 100, "max": 499, "percent": 5},
      {"min": 500, "max": 1999, "percent": 10},
      {"min": 2000, "max": 9999, "percent": 15},
      {"min": 10000, "max": 9999999, "percent": 20}
    ],
    "referral_bonus_enabled": true
  }',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO platform_settings (id) VALUES ('main') ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "settings_all" ON platform_settings;
CREATE POLICY "settings_all" ON platform_settings FOR ALL USING (true) WITH CHECK (true);

-- ── Referrals ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID REFERENCES users(id) ON DELETE CASCADE,
  referred_id UUID REFERENCES users(id) ON DELETE CASCADE,
  level INTEGER DEFAULT 1 CHECK (level BETWEEN 1 AND 3),
  bonus_paid DECIMAL(14,2) DEFAULT 0.00,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed some demo referrals
INSERT INTO referrals (referrer_id, referred_id, level, bonus_paid, status)
SELECT
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002',
  1, 50.00, 'active'
ON CONFLICT DO NOTHING;

DROP POLICY IF EXISTS "referrals_all" ON referrals;
CREATE POLICY "referrals_all" ON referrals FOR ALL USING (true) WITH CHECK (true);

-- ── Bonuses ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bonuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(14,2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'referral', 'manual', 'signup', 'promo')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  reason TEXT,
  paid_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

DROP POLICY IF EXISTS "bonuses_all" ON bonuses;
CREATE POLICY "bonuses_all" ON bonuses FOR ALL USING (true) WITH CHECK (true);

-- ── Support Tickets ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'pending', 'resolved', 'closed')),
  admin_reply TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DROP POLICY IF EXISTS "tickets_all" ON support_tickets;
CREATE POLICY "tickets_all" ON support_tickets FOR ALL USING (true) WITH CHECK (true);

-- ── Support Messages (real-time chat) ────────────────────────
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sender_name TEXT DEFAULT 'User',
  sender_role TEXT DEFAULT 'user' CHECK (sender_role IN ('user', 'admin', 'ai')),
  message TEXT NOT NULL,
  language TEXT DEFAULT 'english',
  is_ai BOOLEAN DEFAULT FALSE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DROP POLICY IF EXISTS "messages_all" ON support_messages;
CREATE POLICY "messages_all" ON support_messages FOR ALL USING (true) WITH CHECK (true);

-- ── Realtime ─────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE landing_content;
ALTER PUBLICATION supabase_realtime ADD TABLE jackpot_tiers;
ALTER PUBLICATION supabase_realtime ADD TABLE referrals;
ALTER PUBLICATION supabase_realtime ADD TABLE bonuses;
ALTER PUBLICATION supabase_realtime ADD TABLE support_tickets;
ALTER PUBLICATION supabase_realtime ADD TABLE support_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE platform_settings;
