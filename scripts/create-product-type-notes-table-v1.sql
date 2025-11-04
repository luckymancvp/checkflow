-- Create product_type_notes table
CREATE TABLE IF NOT EXISTS product_type_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_type VARCHAR(255) NOT NULL UNIQUE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_product_type_notes_product_type ON product_type_notes(product_type);

-- Add comments
COMMENT ON TABLE product_type_notes IS 'Stores notes for specific product types in the review system';
COMMENT ON COLUMN product_type_notes.product_type IS 'The product type identifier';
COMMENT ON COLUMN product_type_notes.content IS 'The note content, can include text and image URLs';
