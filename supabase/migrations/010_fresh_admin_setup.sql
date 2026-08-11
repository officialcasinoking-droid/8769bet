-- ============================================================
-- FRESH ADMIN SETUP
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================================

-- Step 1: Drop existing tables (clean slate)
DROP TABLE IF EXISTS admins CASCADE;
DROP TABLE IF EXISTS admin_accounts CASCADE;

-- Step 2: Create admins table
CREATE TABLE admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'super_admin' CHECK (role IN ('super_admin', 'admin', 'moderator', 'support')),
  permissions JSONB DEFAULT '{"all": true}',
  is_active BOOLEAN DEFAULT TRUE,
  locked_until TIMESTAMPTZ,
  last_login TIMESTAMPTZ,
  failed_login_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Create admin_accounts table
CREATE TABLE admin_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  email TEXT,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'super_admin' CHECK (role IN ('super_admin', 'admin', 'moderator', 'support')),
  permissions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  locked_until TIMESTAMPTZ,
  last_login TIMESTAMPTZ,
  failed_login_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Enable RLS
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_accounts ENABLE ROW LEVEL SECURITY;

-- Step 5: Create policies (service role can do anything)
CREATE POLICY "service_role_all_admins" ON admins FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "service_role_all_admin_accounts" ON admin_accounts FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Step 6: Insert admin user (password: admin8769)
-- Hash: $2a$12$9vT7RnzpXhRjML2rmjmQJOK6LeFfpT.4DXGqEUPYOhKmBNGhO9Z/u
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

-- Step 7: Ensure platform_settings has admin columns
ALTER TABLE platform_settings 
ADD COLUMN IF NOT EXISTS admin_username TEXT DEFAULT 'admin',
ADD COLUMN IF NOT EXISTS admin_password TEXT DEFAULT 'admin8769';

UPDATE platform_settings 
SET admin_username = 'admin', admin_password = 'admin8769'
WHERE id = 'main';

-- Step 8: Verify
SELECT 'admins' as source, id, username, role, is_active FROM admins WHERE username = 'admin'
UNION ALL
SELECT 'admin_accounts' as source, id, username, role, is_active FROM admin_accounts WHERE username = 'admin';