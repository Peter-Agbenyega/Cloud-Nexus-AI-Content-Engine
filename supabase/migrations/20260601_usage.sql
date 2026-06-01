-- Add usage columns to users if not present
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS plan text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS campaigns_this_month integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_reset_date date,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- Function to safely increment campaign count
CREATE OR REPLACE FUNCTION increment_campaign_count(user_id uuid)
RETURNS void AS $$
  UPDATE users
  SET campaigns_this_month = campaigns_this_month + 1
  WHERE id = user_id;
$$ LANGUAGE sql;

-- RLS policies for users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_own_data" ON users;
CREATE POLICY "users_own_data" ON users
  FOR ALL USING (auth.uid() = id);
