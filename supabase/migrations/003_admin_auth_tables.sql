-- Admin Auth Tables
-- Creates admins (login) and admin_accounts (auth middleware) tables

-- ── Admins (login credentials) ─────────────────────────────────
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

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins_select_service" ON admins FOR SELECT USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "admins_all_service" ON admins FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ── Admin Accounts (JWT auth middleware) ─────────────────────
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

ALTER TABLE admin_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_accounts_select_service" ON admin_accounts FOR SELECT USING (auth.jwt() ->> 'role' = 'service_role');
CREATE POLICY "admin_accounts_all_service" ON admin_accounts FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- ── Realtime publication ─────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'admins'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE admins;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'admin_accounts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE admin_accounts;
  END IF;
END $$;
