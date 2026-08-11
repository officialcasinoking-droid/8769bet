-- ============================================================
-- FINAL ADMIN LOGIN FIX
-- Password: admin8769
-- Hash verified: $2a$12$9vT7RnzpXhRjML2rmjmQJOK6LeFfpT.4DXGqEUPYOhKmBNGhO9Z/u
-- ============================================================

-- Step 1: Delete any existing admin
DELETE FROM admins WHERE username = 'admin';
DELETE FROM admin_accounts WHERE username = 'admin';

-- Step 2: Insert admin into admins table
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

-- Step 3: Insert admin into admin_accounts table
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

-- Step 4: Update platform_settings fallback
UPDATE platform_settings 
SET admin_username = 'admin', admin_password = 'admin8769'
WHERE id = 'main';

-- Step 5: Verify
SELECT 'admins' as source, id, username, is_active FROM admins WHERE username = 'admin'
UNION ALL
SELECT 'admin_accounts' as source, id, username, is_active FROM admin_accounts WHERE username = 'admin';