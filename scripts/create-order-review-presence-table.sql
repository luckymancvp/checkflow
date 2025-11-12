-- Create order_review_presence table for realtime presence tracking
CREATE TABLE IF NOT EXISTS order_review_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_avatar TEXT,
  status TEXT DEFAULT 'reviewing',
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(order_item_id, user_email)
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_order_review_presence_item ON order_review_presence(order_item_id);
CREATE INDEX IF NOT EXISTS idx_order_review_presence_user ON order_review_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_order_review_presence_updated ON order_review_presence(updated_at DESC);

-- Enable Row Level Security
ALTER TABLE order_review_presence ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read presence
CREATE POLICY "Allow authenticated users to read presence"
  ON order_review_presence
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy to allow users to insert their own presence
CREATE POLICY "Allow users to insert their own presence"
  ON order_review_presence
  FOR INSERT
  TO authenticated
  WITH CHECK (user_email = auth.jwt() ->> 'email');

-- Create policy to allow users to update their own presence
CREATE POLICY "Allow users to update their own presence"
  ON order_review_presence
  FOR UPDATE
  TO authenticated
  USING (user_email = auth.jwt() ->> 'email')
  WITH CHECK (user_email = auth.jwt() ->> 'email');

-- Create policy to allow users to delete their own presence
CREATE POLICY "Allow users to delete their own presence"
  ON order_review_presence
  FOR DELETE
  TO authenticated
  USING (user_email = auth.jwt() ->> 'email');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_order_review_presence_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_order_review_presence_updated_at_trigger
  BEFORE UPDATE ON order_review_presence
  FOR EACH ROW
  EXECUTE FUNCTION update_order_review_presence_updated_at();

-- Create global presence table for system-wide online users
CREATE TABLE IF NOT EXISTS global_user_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  user_email TEXT NOT NULL UNIQUE,
  user_name TEXT NOT NULL,
  user_avatar TEXT,
  status TEXT DEFAULT 'online',
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for global presence
CREATE INDEX IF NOT EXISTS idx_global_user_presence_user ON global_user_presence(user_id);
CREATE INDEX IF NOT EXISTS idx_global_user_presence_updated ON global_user_presence(updated_at DESC);

-- Enable RLS for global presence
ALTER TABLE global_user_presence ENABLE ROW LEVEL SECURITY;

-- Create policies for global presence
CREATE POLICY "Allow authenticated users to read global presence"
  ON global_user_presence
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Allow users to insert their own global presence"
  ON global_user_presence
  FOR INSERT
  TO authenticated
  WITH CHECK (user_email = auth.jwt() ->> 'email');

CREATE POLICY "Allow users to update their own global presence"
  ON global_user_presence
  FOR UPDATE
  TO authenticated
  USING (user_email = auth.jwt() ->> 'email')
  WITH CHECK (user_email = auth.jwt() ->> 'email');

CREATE POLICY "Allow users to delete their own global presence"
  ON global_user_presence
  FOR DELETE
  TO authenticated
  USING (user_email = auth.jwt() ->> 'email');

-- Create trigger for global presence
CREATE TRIGGER update_global_user_presence_updated_at_trigger
  BEFORE UPDATE ON global_user_presence
  FOR EACH ROW
  EXECUTE FUNCTION update_order_review_presence_updated_at();
