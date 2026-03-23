-- Add phone column to users table if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
