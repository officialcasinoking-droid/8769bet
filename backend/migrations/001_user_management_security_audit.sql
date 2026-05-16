-- ============================================================================
-- Migration 001: User Management, Security & Audit System
-- ============================================================================
-- This migration adds:
-- 1. Multi-admin support with role-based permissions
-- 2. Comprehensive audit logging
-- 3. Login attempt tracking
-- 4. IP blocking system
-- 5. Support tickets with AI review
-- 6. Balance history tracking
-- 7. Admin session management
-- 8. User notes
-- 9. Enhanced user table fields
-- ============================================================================

-- ── 1. Enhanced Users Table ─────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'banned', 'suspended', 'pending_verification'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_ip INET;
ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'none' CHECK (kyc_status IN ('none', 'pending', 'verified', 'rejected'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high', 'critical'));
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_wagered DECIMAL(14,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_won DECIMAL(14,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_deposits DECIMAL(14,2) DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS total_withdrawals DECIMAL(14,2) DEFAULT 0;

-- ── 2. Admin Accounts Table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  email TEXT UNIQUE,
  full_name TEXT,
  role TEXT DEFAULT 'admin' CHECK (role IN ('super_admin', 'admin', 'moderator', 'support')),
  permissions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES admin_accounts(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  failed_login_count INTEGER DEFAULT 0,
  locked_until TIMESTAMPTZ
);

-- Insert the existing hardcoded admin as super_admin
-- Password hash for 'admin123' using bcrypt (12 rounds)
-- This will be updated by the migration script with the actual hash
INSERT INTO admin_accounts (id, username, password_hash, email, full_name, role, permissions)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin',
  '$2b$12$LJ3m4ys3Lk0T0K.3qKqKqOqKqKqKqKqKqKqKqKqKqKqKqKqKqKqKq',
  'admin@8769bet.com',
  'Super Admin',
  'super_admin',
  '{"all": true}'::jsonb
) ON CONFLICT (id) DO UPDATE SET
  role = 'super_admin',
  permissions = '{"all": true}'::jsonb;

-- ── 3. Admin Sessions Table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES admin_accounts(id) ON DELETE CASCADE,
  admin_username TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours',
  is_active BOOLEAN DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin ON admin_sessions(admin_id, is_active);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);

-- ── 4. Audit Logs Table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  actor_type TEXT CHECK (actor_type IN ('admin', 'user', 'system')),
  actor_id UUID,
  actor_username TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id UUID,
  target_username TEXT,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical', 'error')),
  success BOOLEAN DEFAULT TRUE
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id, actor_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);

-- ── 5. Login Attempts Table ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT NOT NULL,
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_username ON login_attempts(username, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip_address, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_login_attempts_timestamp ON login_attempts(timestamp DESC);

-- ── 6. Blocked IPs Table ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blocked_ips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ip_address INET NOT NULL UNIQUE,
  reason TEXT,
  blocked_by UUID REFERENCES admin_accounts(id),
  blocked_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  review_status TEXT DEFAULT 'pending' CHECK (review_status IN ('pending', 'approved', 'rejected', 'ai_reviewed')),
  ai_review_result JSONB,
  support_ticket_id UUID
);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_ip ON blocked_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_active ON blocked_ips(is_active);
CREATE INDEX IF NOT EXISTS idx_blocked_ips_review ON blocked_ips(review_status);

-- ── 7. Support Tickets Table ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  ip_address INET,
  subject TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'ai_review', 'pending', 'resolved', 'closed')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  assigned_to UUID REFERENCES admin_accounts(id),
  ai_review_result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created ON support_tickets(created_at DESC);

-- ── 8. User Notes Table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES admin_accounts(id),
  admin_username TEXT,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_notes_user ON user_notes(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notes_admin ON user_notes(admin_id);

-- ── 9. Balance History Table ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS balance_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(14,2) NOT NULL,
  balance_before DECIMAL(14,2) NOT NULL,
  balance_after DECIMAL(14,2) NOT NULL,
  reason TEXT NOT NULL,
  reference_id UUID,
  admin_id UUID REFERENCES admin_accounts(id),
  admin_username TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_balance_history_user ON balance_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_balance_history_reason ON balance_history(reason);
CREATE INDEX IF NOT EXISTS idx_balance_history_admin ON balance_history(admin_id);

-- ── 10. Enable RLS on All New Tables ─────────────────────────────────────────

ALTER TABLE admin_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_history ENABLE ROW LEVEL SECURITY;

-- ── 11. RLS Policies ────────────────────────────────────────────────────────

-- Admin accounts: no direct client access (backend only)
DROP POLICY IF EXISTS admin_accounts_no_access ON admin_accounts;
CREATE POLICY admin_accounts_no_access ON admin_accounts FOR ALL
  USING (false)
  WITH CHECK (false);

-- Admin sessions: no direct client access
DROP POLICY IF EXISTS admin_sessions_no_access ON admin_sessions;
CREATE POLICY admin_sessions_no_access ON admin_sessions FOR ALL
  USING (false)
  WITH CHECK (false);

-- Audit logs: no direct client access (backend only via service role)
DROP POLICY IF EXISTS audit_logs_no_access ON audit_logs;
CREATE POLICY audit_logs_no_access ON audit_logs FOR ALL
  USING (false)
  WITH CHECK (false);

-- Login attempts: no direct client access
DROP POLICY IF EXISTS login_attempts_no_access ON login_attempts;
CREATE POLICY login_attempts_no_access ON login_attempts FOR ALL
  USING (false)
  WITH CHECK (false);

-- Blocked IPs: no direct client access
DROP POLICY IF EXISTS blocked_ips_no_access ON blocked_ips;
CREATE POLICY blocked_ips_no_access ON blocked_ips FOR ALL
  USING (false)
  WITH CHECK (false);

-- Support tickets: users can create their own, no read access from client
DROP POLICY IF EXISTS support_tickets_insert ON support_tickets;
CREATE POLICY support_tickets_insert ON support_tickets FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS support_tickets_no_read ON support_tickets;
CREATE POLICY support_tickets_no_read ON support_tickets FOR SELECT
  USING (false);

-- User notes: no direct client access
DROP POLICY IF EXISTS user_notes_no_access ON user_notes;
CREATE POLICY user_notes_no_access ON user_notes FOR ALL
  USING (false)
  WITH CHECK (false);

-- Balance history: no direct client access
DROP POLICY IF EXISTS balance_history_no_access ON balance_history;
CREATE POLICY balance_history_no_access ON balance_history FOR ALL
  USING (false)
  WITH CHECK (false);

-- ── 12. Helper Functions ────────────────────────────────────────────────────

-- Function to log audit entries
CREATE OR REPLACE FUNCTION log_audit(
  p_actor_type TEXT,
  p_actor_id UUID,
  p_actor_username TEXT,
  p_action TEXT,
  p_target_type TEXT DEFAULT NULL,
  p_target_id UUID DEFAULT NULL,
  p_target_username TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_severity TEXT DEFAULT 'info',
  p_success BOOLEAN DEFAULT TRUE
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO audit_logs (
    actor_type, actor_id, actor_username, action,
    target_type, target_id, target_username, details,
    ip_address, user_agent, severity, success
  ) VALUES (
    p_actor_type, p_actor_id, p_actor_username, p_action,
    p_target_type, p_target_id, p_target_username, p_details,
    p_ip_address, p_user_agent, p_severity, p_success
  ) RETURNING id INTO v_log_id;
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to record balance change
CREATE OR REPLACE FUNCTION record_balance_change(
  p_user_id UUID,
  p_amount DECIMAL(14,2),
  p_balance_before DECIMAL(14,2),
  p_balance_after DECIMAL(14,2),
  p_reason TEXT,
  p_reference_id UUID DEFAULT NULL,
  p_admin_id UUID DEFAULT NULL,
  p_admin_username TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_history_id UUID;
BEGIN
  INSERT INTO balance_history (
    user_id, amount, balance_before, balance_after,
    reason, reference_id, admin_id, admin_username
  ) VALUES (
    p_user_id, p_amount, p_balance_before, p_balance_after,
    p_reason, p_reference_id, p_admin_id, p_admin_username
  ) RETURNING id INTO v_history_id;
  RETURN v_history_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── 13. Cleanup Old Policies ────────────────────────────────────────────────

-- Fix the overly permissive users_update_own policy
DROP POLICY IF EXISTS users_update_own ON users;
CREATE POLICY users_update_own ON users FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================================
-- Migration Complete
-- ============================================================================
-- After running this migration:
-- 1. The existing admin account is converted to super_admin
-- 2. All new tables are created with proper indexes
-- 3. RLS policies are set up
-- 4. Helper functions are available for audit logging and balance tracking
--
-- Next steps:
-- - Update the super_admin password hash with actual bcrypt hash
-- - Configure Groq API key in platform_settings for AI review
-- - Deploy backend middleware and routes
-- ============================================================================
