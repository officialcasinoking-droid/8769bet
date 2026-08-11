-- ============================================================
-- Fix Admin Login - Run this in Supabase SQL Editor
-- This creates the admin user in all possible tables
-- ============================================================

-- 1. Create admins table if it doesn't exist (from migration 003)
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'super_admin' CHECK (role IN ('super_admin', 'admin', 'moderator', 'support')),
  permissions JSONB DEFAULT '{"all": true}',
  is_active BOOLEAN DEFAULT TRUE,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create admin_accounts table if it doesn't exist (from migration 003)
CREATE TABLE IF NOT EXISTS admin_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  email TEXT,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'super_admin' CHECK (role IN ('super_admin', 'admin', 'moderator', 'support')),
  permissions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  failed_login_count INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Insert admin into admins table
INSERT INTO admins (id, username, password_hash, email, full_name, role, permissions, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin',
  '$2a$12$0NvRi/6LFLoPzAXHzJvTF.yfo8RKJ9Fbs151our6OPVqDd4Bhd.tK',
  'admin@8769bet.com',
  'Super Admin',
  'super_admin',
  '{"all": true}',
  true
)
ON CONFLICT (id) DO UPDATE SET
  password_hash = '$2a$12$0NvRi/6LFLoPzAXHzJvTF.yfo8RKJ9Fbs151our6OPVqDd4Bhd.tK',
  username = 'admin',
  is_active = true;

-- 4. Insert admin into admin_accounts table
INSERT INTO admin_accounts (id, username, password_hash, email, full_name, role, permissions, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin',
  '$2a$12$0NvRi/6LFLoPzAXHzJvTF.yfo8RKJ9Fbs151our6OPVqDd4Bhd.tK',
  'admin@8769bet.com',
  'Super Admin',
  'super_admin',
  '{"all": true}',
  true
)
ON CONFLICT (id) DO UPDATE SET
  password_hash = '$2a$12$0NvRi/6LFLoPzAXHzJvTF.yfo8RKJ9Fbs151our6OPVqDd4Bhd.tK',
  username = 'admin',
  is_active = true;

-- 5. Also update platform_settings (fallback method)
UPDATE platform_settings 
SET admin_username = 'admin', admin_password = 'admin8769'
WHERE id = 'main';

-- 6. Verify the admin exists
SELECT 'admins' as table_name, id, username, role, is_active 
FROM admins WHERE username = 'admin'
UNION ALL
SELECT 'admin_accounts' as table_name, id, username, role, is_active 
FROM admin_accounts WHERE username = 'admin';