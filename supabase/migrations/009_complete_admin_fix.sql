-- ============================================================
-- COMPLETE ADMIN LOGIN FIX
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================================

-- Step 1: Create admins table
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'super_admin',
  permissions JSONB DEFAULT '{"all": true}',
  is_active BOOLEAN DEFAULT TRUE,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create admin_accounts table
CREATE TABLE IF NOT EXISTS admin_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  email TEXT,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'super_admin',
  permissions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  failed_login_count INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Enable RLS and create policies
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_select_service" ON admins;
CREATE POLICY "admins_select_service" ON admins FOR SELECT USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "admins_all_service" ON admins FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "admin_accounts_select_service" ON admin_accounts FOR SELECT USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "admin_accounts_all_service" ON admin_accounts FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Step 4: Delete any existing admin
DELETE FROM admins WHERE username = 'admin';
DELETE FROM admin_accounts WHERE username = 'admin';

-- Step 5: Insert admin with VERIFIED bcrypt hash (password: admin8769)
INSERT INTO admins (id, username, password_hash, email, full_name, role, permissions, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin',
  '$2a$12$9vT7RnzpXhRjML2rmjmQJOK6LeFfpT.4DXGqEUPYOhKmBNGhO9Z/u',
  'admin@8769bet.com',
  'Super Admin',
  'super_admin',
  '{"all": true}',
  true
);

INSERT INTO admin_accounts (id, username, password_hash, email, full_name, role, permissions, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin',
  '$2a$12$9vT7RnzpXhRjML2rmjmQJOK6LeFfpT.4DXGqEUPYOhKmBNGhO9Z/u',
  'admin@8769bet.com',
  'Super Admin',
  'super_admin',
  '{"all": true}',
  true
);

-- Step 6: Ensure platform_settings has admin columns
ALTER TABLE platform_settings 
ADD COLUMN IF NOT EXISTS admin_username TEXT DEFAULT 'admin',
ADD COLUMN IF NOT EXISTS admin_password TEXT DEFAULT 'admin8769';

-- Step 7: Update platform_settings
UPDATE platform_settings 
SET admin_username = 'admin', admin_password = 'admin8769'
WHERE id = 'main';

-- Step 8: Verify
SELECT 'admins' as source, id, username, is_active FROM admins WHERE username = 'admin'
UNION ALL
SELECT 'admin_accounts' as source, id, username, is_active FROM admin_accounts WHERE username = 'admin';