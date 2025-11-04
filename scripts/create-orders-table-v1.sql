-- Create orders table for storing current order state
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
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
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique item_id per Google Sheet
  UNIQUE(item_id, google_sheet_id)
);

-- Create indexes for orders table
CREATE INDEX IF NOT EXISTS idx_orders_google_sheet_id ON orders(google_sheet_id);
CREATE INDEX IF NOT EXISTS idx_orders_item_id ON orders(item_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_product_type ON orders(product_type);
CREATE INDEX IF NOT EXISTS idx_orders_designer ON orders(designer);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_updated_at ON orders(updated_at);
CREATE INDEX IF NOT EXISTS idx_orders_change_type ON orders(change_type);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_orders_sheet_status ON orders(google_sheet_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_product_status ON orders(product_type, status);
CREATE INDEX IF NOT EXISTS idx_orders_item_sheet ON orders(item_id, google_sheet_id);
