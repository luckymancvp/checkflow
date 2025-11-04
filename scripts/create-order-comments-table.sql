-- Create order_comments table for order discussion/comments
CREATE TABLE IF NOT EXISTS order_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_avatar TEXT,
  comment_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_order_comments_item_id ON order_comments(order_item_id);
CREATE INDEX IF NOT EXISTS idx_order_comments_email ON order_comments(user_email);
CREATE INDEX IF NOT EXISTS idx_order_comments_created_at ON order_comments(created_at DESC);

-- Enable Row Level Security
ALTER TABLE order_comments ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to read all comments
CREATE POLICY "Allow authenticated users to read comments"
  ON order_comments
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy to allow authenticated users to insert comments
CREATE POLICY "Allow authenticated users to insert comments"
  ON order_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create policy to allow users to update their own comments
CREATE POLICY "Allow users to update own comments"
  ON order_comments
  FOR UPDATE
  TO authenticated
  USING (user_email = auth.jwt() ->> 'email')
  WITH CHECK (user_email = auth.jwt() ->> 'email');

-- Create policy to allow users to delete their own comments
CREATE POLICY "Allow users to delete own comments"
  ON order_comments
  FOR DELETE
  TO authenticated
  USING (user_email = auth.jwt() ->> 'email');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_order_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_order_comments_updated_at_trigger
  BEFORE UPDATE ON order_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_order_comments_updated_at();
