
-- Remove auth_id column if it exists (we'll use users.id directly)
ALTER TABLE users DROP COLUMN IF EXISTS auth_id;

-- Make sure users.id is UUID type to match auth.uid()
-- Note: This will only work if you don't have existing data or if you migrate it first
-- ALTER TABLE users ALTER COLUMN id TYPE UUID USING id::UUID;

-- Update RLS policies for users table to use users.id directly
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;

CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid()::text = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid()::text = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid()::text = id);
