-- Create order_history table for tracking all order changes
CREATE TABLE IF NOT EXISTS order_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  item_id VARCHAR(255) NOT NULL,
  google_sheet_id VARCHAR(255) NOT NULL, -- Google Sheet ID (e.g., "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms")
  status VARCHAR(50) NOT NULL,
  order_note TEXT,
  designer VARCHAR(255),
  design_link TEXT,
  mockup_link TEXT,
  customer_image TEXT,
  personalization TEXT,
  date VARCHAR(50),
  store VARCHAR(255),
  product_image TEXT,
  product_type VARCHAR(255),
  product_name TEXT,
  change_type VARCHAR(50) CHECK (change_type IN ('design_error', 'customer_change')),
  review_accuracy VARCHAR(50) CHECK (review_accuracy IN ('correct', 'incorrect')),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for order_history table
CREATE INDEX IF NOT EXISTS idx_order_history_order_id ON order_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_history_item_id ON order_history(item_id);
CREATE INDEX IF NOT EXISTS idx_order_history_google_sheet_id ON order_history(google_sheet_id);
CREATE INDEX IF NOT EXISTS idx_order_history_status ON order_history(status);
CREATE INDEX IF NOT EXISTS idx_order_history_product_type ON order_history(product_type);
CREATE INDEX IF NOT EXISTS idx_order_history_designer ON order_history(designer);
CREATE INDEX IF NOT EXISTS idx_order_history_created_by ON order_history(created_by);
CREATE INDEX IF NOT EXISTS idx_order_history_created_at ON order_history(created_at);
CREATE INDEX IF NOT EXISTS idx_order_history_change_type ON order_history(change_type);
CREATE INDEX IF NOT EXISTS idx_order_history_review_accuracy ON order_history(review_accuracy);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_order_history_order_created ON order_history(order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_history_product_status ON order_history(product_type, status);
CREATE INDEX IF NOT EXISTS idx_order_history_sheet_status ON order_history(google_sheet_id, status);
CREATE INDEX IF NOT EXISTS idx_order_history_item_sheet ON order_history(item_id, google_sheet_id);
CREATE INDEX IF NOT EXISTS idx_order_history_accuracy_created ON order_history(review_accuracy, created_at DESC);
