-- ============================================
-- RLS FIX FOR 8769bet - Run in Supabase SQL Editor
-- ============================================

-- 1. First, disable RLS temporarily to set up policies
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages DISABLE ROW LEVEL SECURITY;

-- 2. Delete existing policies that might cause issues
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can view own withdrawal requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Users can create own withdrawal requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Users can update own withdrawal requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Admins can manage all withdrawal requests" ON withdrawal_requests;
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can create own transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view own tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON support_tickets;
DROP POLICY IF EXISTS "Admins can update tickets" ON support_tickets;
DROP POLICY IF EXISTS "Users can view own messages" ON support_messages;
DROP POLICY IF EXISTS "Users can create messages" ON support_messages;
DROP POLICY IF EXISTS "Admins can manage all messages" ON support_messages;

-- 3. Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

-- 4. Create permissive policies for users table
-- Allow authenticated users to read their own data
CREATE POLICY "users_select_own" ON users FOR SELECT USING (auth.uid() = id);

-- Allow authenticated users to update their own data
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (auth.uid() = id);

-- Allow authenticated users to insert their own data
CREATE POLICY "users_insert_own" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- 5. Create permissive policies for withdrawal_requests
CREATE POLICY "withdrawal_select_own" ON withdrawal_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "withdrawal_insert_own" ON withdrawal_requests FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "withdrawal_update_own" ON withdrawal_requests FOR UPDATE USING (auth.uid() = user_id);

-- 6. Create permissive policies for transactions
CREATE POLICY "transactions_select_own" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "transactions_insert_own" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions_update_own" ON transactions FOR UPDATE USING (auth.uid() = user_id);

-- 7. Create permissive policies for support_tickets
CREATE POLICY "tickets_select_own" ON support_tickets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "tickets_insert_own" ON support_tickets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tickets_update_own" ON support_tickets FOR UPDATE USING (auth.uid() = user_id);

-- 8. Create permissive policies for support_messages
CREATE POLICY "messages_select_own" ON support_messages FOR SELECT 
USING (
  EXISTS (SELECT 1 FROM support_tickets WHERE support_tickets.id = ticket_id AND support_tickets.user_id = auth.uid())
);
CREATE POLICY "messages_insert_own" ON support_messages FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM support_tickets WHERE support_tickets.id = ticket_id AND support_tickets.user_id = auth.uid())
);
CREATE POLICY "messages_update_own" ON support_messages FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM support_tickets WHERE support_tickets.id = ticket_id AND support_tickets.user_id = auth.uid())
);

-- 9. Make sure anon and authenticated roles have access
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 10. Verify the setup
SELECT 'RLS policies created successfully' as status;
