# Migration Execution Guide

## Step 1: Run the SQL Migration

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `rbcipnwwllkscomatqmc`
3. Go to **SQL Editor** (left sidebar)
4. Click **New Query**
5. Copy the entire contents of `backend/migrations/001_user_management_security_audit.sql`
6. Paste it into the SQL Editor
7. Click **Run** (or press Ctrl+Enter)

## Step 2: Verify Migration

After running, verify the tables were created:

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('admin_accounts', 'admin_sessions', 'audit_logs', 'login_attempts', 'blocked_ips', 'support_tickets', 'user_notes', 'balance_history')
ORDER BY table_name;
```

You should see all 8 tables listed.

## Step 3: Update Super Admin Password

The migration inserts a placeholder password hash. You need to generate a proper bcrypt hash for `admin123` and update it:

```sql
-- Generate bcrypt hash for 'admin123' using an online tool or Node.js:
-- const bcrypt = require('bcrypt');
-- bcrypt.hash('admin123', 12).then(hash => console.log(hash));

-- Then update:
UPDATE admin_accounts 
SET password_hash = '$2b$12$<YOUR_GENERATED_HASH_HERE>' 
WHERE username = 'admin';
```

## Step 4: Deploy Backend

The backend code is already committed and pushed. Render will auto-deploy.

## Step 5: Update Admin Frontend

The admin UI components need to be committed and deployed separately.

## Important Notes

- All new tables have RLS (Row Level Security) enabled with policies that block direct client access
- All operations go through the backend using the Supabase service role key
- The existing `users` table columns are added with `IF NOT EXISTS` so they're safe to run multiple times
- The `admin_accounts` table uses `ON CONFLICT` for the initial super_admin insert
