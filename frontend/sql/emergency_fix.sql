-- EMERGENCY FIX: Completely disable RLS to debug
-- If this works, we'll know it's a policy issue

-- Disable RLS on users table
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Verify
SELECT 'RLS is now DISABLED on users table' as status;

-- Check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users';
