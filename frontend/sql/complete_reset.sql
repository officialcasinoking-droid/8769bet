-- ============================================
-- COMPLETE DATABASE RESET FOR 8769bet
-- WARNING: This will DELETE ALL DATA!
-- ============================================

-- 1. Drop existing tables (ignore errors if they don't exist)
DROP TABLE IF EXISTS withdrawal_requests CASCADE;
DROP TABLE IF EXISTS support_messages CASCADE;
DROP TABLE IF EXISTS support_tickets CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS referral_logs CASCADE;
DROP TABLE IF EXISTS referral_codes CASCADE;
DROP TABLE IF EXISTS game_bets CASCADE;
DROP TABLE IF EXISTS games CASCADE;
DROP TABLE IF EXISTS jackpot_entries CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. Create users table with withdrawal columns
CREATE TABLE users (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  password_hash TEXT,
  role TEXT DEFAULT 'user',
  balance DECIMAL(15, 2) DEFAULT 0,
  avatar_url TEXT,
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  email_verified BOOLEAN DEFAULT false,
  referred_by TEXT,
  referral_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Withdrawal columns
  withdrawal_pin_set BOOLEAN DEFAULT false,
  withdrawal_pin_hash TEXT,
  withdrawal_accounts JSONB DEFAULT '[]'::jsonb
);

-- 3. Create transactions table
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'bonus', 'refund', 'bet', 'win')),
  amount DECIMAL(15, 2) NOT NULL,
  balance_after DECIMAL(15, 2),
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
  reference TEXT,
  description TEXT,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create withdrawal_requests table
CREATE TABLE withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  username TEXT,
  amount DECIMAL(15, 2) NOT NULL,
  method TEXT DEFAULT 'unknown',
  account_type TEXT DEFAULT 'unknown',
  account_number TEXT,
  account_name TEXT,
  cnic TEXT,
  real_name TEXT,
  bank_name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create support_tickets table
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT,
  user_identifier TEXT,
  subject TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'pending', 'resolved', 'closed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assigned_to TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create support_messages table
CREATE TABLE support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE,
  sender_id TEXT,
  sender_name TEXT,
  sender_role TEXT CHECK (sender_role IN ('user', 'admin', 'ai', 'system')),
  message TEXT NOT NULL,
  is_edited BOOLEAN DEFAULT false,
  is_read BOOLEAN DEFAULT false,
  is_system BOOLEAN DEFAULT false,
  is_ai BOOLEAN DEFAULT false,
  language TEXT DEFAULT 'english',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Create other tables (simplified)
CREATE TABLE games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  category TEXT,
  provider TEXT,
  thumbnail TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Create indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_withdrawal_requests_user_id ON withdrawal_requests(user_id);
CREATE INDEX idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_messages_ticket_id ON support_messages(ticket_id);

-- 9. Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies (permissive for now)
-- Users table
CREATE POLICY "users_select" ON users FOR SELECT USING (true);
CREATE POLICY "users_update" ON users FOR UPDATE USING (true);
CREATE POLICY "users_insert" ON users FOR INSERT WITH CHECK (true);

-- Transactions table
CREATE POLICY "transactions_select" ON transactions FOR SELECT USING (true);
CREATE POLICY "transactions_insert" ON transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "transactions_update" ON transactions FOR UPDATE USING (true);

-- Withdrawal requests table
CREATE POLICY "withdrawal_requests_select" ON withdrawal_requests FOR SELECT USING (true);
CREATE POLICY "withdrawal_requests_insert" ON withdrawal_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "withdrawal_requests_update" ON withdrawal_requests FOR UPDATE USING (true);

-- Support tickets table
CREATE POLICY "support_tickets_select" ON support_tickets FOR SELECT USING (true);
CREATE POLICY "support_tickets_insert" ON support_tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "support_tickets_update" ON support_tickets FOR UPDATE USING (true);

-- Support messages table
CREATE POLICY "support_messages_select" ON support_messages FOR SELECT USING (true);
CREATE POLICY "support_messages_insert" ON support_messages FOR INSERT WITH CHECK (true);
CREATE POLICY "support_messages_update" ON support_messages FOR UPDATE USING (true);

-- Games table (public read)
CREATE POLICY "games_select" ON games FOR SELECT USING (true);
CREATE POLICY "games_insert" ON games FOR INSERT WITH CHECK (true);
CREATE POLICY "games_update" ON games FOR UPDATE USING (true);

-- Announcements table (public read)
CREATE POLICY "announcements_select" ON announcements FOR SELECT USING (true);
CREATE POLICY "announcements_insert" ON announcements FOR INSERT WITH CHECK (true);
CREATE POLICY "announcements_update" ON announcements FOR UPDATE USING (true);

-- 11. Grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 12. Verify
SELECT 'Database reset complete!' as status;
SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
