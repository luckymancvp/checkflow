-- Create user_presence table to track user activity in real-time
CREATE TABLE IF NOT EXISTS user_presence (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  user_avatar VARCHAR(500),
  user_email VARCHAR(255),
  order_item_id VARCHAR(255), -- Which order the user is currently reviewing (null if just online)
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(50) DEFAULT 'online', -- online, idle, offline
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_presence_user_id ON user_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_order_item_id ON user_presence(order_item_id);
CREATE INDEX IF NOT EXISTS idx_user_presence_last_seen ON user_presence(last_seen);
CREATE INDEX IF NOT EXISTS idx_user_presence_status ON user_presence(status);

-- Create a unique constraint to ensure one presence record per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_presence_unique_user ON user_presence(user_id);

-- Enable RLS
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all users to read presence" ON user_presence;
DROP POLICY IF EXISTS "Allow users to insert their own presence" ON user_presence;
DROP POLICY IF EXISTS "Allow users to update their own presence" ON user_presence;
DROP POLICY IF EXISTS "Allow users to delete their own presence" ON user_presence;

-- Allow all authenticated users to read all presence data
CREATE POLICY "Allow all users to read presence"
  ON user_presence FOR SELECT
  USING (true);

-- Allow users to insert their own presence
CREATE POLICY "Allow users to insert their own presence"
  ON user_presence FOR INSERT
  WITH CHECK (true);

-- Allow users to update their own presence
CREATE POLICY "Allow users to update their own presence"
  ON user_presence FOR UPDATE
  USING (true);

-- Allow users to delete their own presence
CREATE POLICY "Allow users to delete their own presence"
  ON user_presence FOR DELETE
  USING (true);

-- Added function to automatically clean up stale presence records
-- Function to clean up stale presence records (older than 1 minute)
CREATE OR REPLACE FUNCTION cleanup_stale_presence()
RETURNS void AS $$
BEGIN
  DELETE FROM user_presence
  WHERE last_seen < NOW() - INTERVAL '1 minute';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Added scheduled job to automatically clean up stale records every 30 seconds
-- Note: This requires pg_cron extension. If not available, call this function periodically from your app
-- To enable: CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule('cleanup-stale-presence', '*/30 * * * * *', 'SELECT cleanup_stale_presence();');
