-- ============================================================
-- Professional Admin Login Fix
-- Run this ENTIRE script in Supabase SQL Editor
-- Password: admin8769
-- ============================================================

-- Step 1: Ensure tables exist
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

-- Step 2: Delete any existing admin with conflicting IDs
DELETE FROM admins WHERE username = 'admin';
DELETE FROM admin_accounts WHERE username = 'admin';

-- Step 3: Insert admin with VERIFIED bcrypt hash (password: admin8769)
-- Hash generated with bcryptjs, 12 rounds, verified to match
INSERT INTO admins (id, username, password_hash, email, full_name, role, permissions, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin',
  '$2a$12$XLsb7jZDMatWcberkvmOaOZoKzu5ZytGxqBJ7cK.0pTusLtGw0ZRW',
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
  '$2a$12$XLsb7jZDMatWcberkvmOaOZoKzu5ZytGxqBJ7cK.0pTusLtGw0ZRW',
  'admin@8769bet.com',
  'Super Admin',
  'super_admin',
  '{"all": true}',
  true
);

-- Step 4: Update platform_settings fallback (plaintext)
UPDATE platform_settings 
SET admin_username = 'admin', admin_password = 'admin8769'
WHERE id = 'main';

-- Step 5: Verify the setup
SELECT 
  'admins' as source,
  id,
  username,
  role,
  is_active,
  CASE WHEN password_hash IS NOT NULL THEN 'hash_set' ELSE 'no_hash' END as hash_status
FROM admins 
WHERE username = 'admin'
UNION ALL
SELECT 
  'admin_accounts' as source,
  id,
  username,
  role,
  is_active,
  CASE WHEN password_hash IS NOT NULL THEN 'hash_set' ELSE 'no_hash' END as hash_status
FROM admin_accounts 
WHERE username = 'admin';