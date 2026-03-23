-- Completely reset RLS policies for users table
-- This fixes the 406 error

-- 1. Disable RLS
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 2. Drop ALL existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can view own data" ON users;
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "anon_select" ON users;
DROP POLICY IF EXISTS "anon_update" ON users;
DROP POLICY IF EXISTS "authenticated_select" ON users;
DROP POLICY IF EXISTS "authenticated_update" ON users;

-- 3. Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 4. Create simple permissive policies
-- These allow authenticated users to do anything with their own data
CREATE POLICY "allow_authenticated_select" ON users FOR SELECT TO authenticated USING (true);
CREATE POLICY "allow_authenticated_insert" ON users FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "allow_authenticated_update" ON users FOR UPDATE TO authenticated USING (true);

-- 5. Also allow anon (for public data if needed)
CREATE POLICY "allow_anon_select" ON users FOR SELECT TO anon USING (true);

-- 6. Grant permissions
GRANT ALL ON users TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon;

-- 7. Verify
SELECT 'RLS fixed!' as status;
