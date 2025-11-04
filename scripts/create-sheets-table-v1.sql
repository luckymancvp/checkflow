-- Create sheets table for storing Google Sheet configurations
CREATE TABLE IF NOT EXISTS sheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    google_sheet_id VARCHAR(255) NOT NULL,
    tab_name VARCHAR(255) NOT NULL,
    configuration JSONB NOT NULL, -- Stores the detailed configuration object
    created_by UUID REFERENCES users(id) ON DELETE SET NULL, -- Link to the user who created it
    last_access TIMESTAMP WITH TIME ZONE, -- When data was last accessed/updated from this sheet
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for common lookup fields
CREATE INDEX IF NOT EXISTS idx_sheets_name ON sheets(name);
CREATE INDEX IF NOT EXISTS idx_sheets_google_sheet_id ON sheets(google_sheet_id);
CREATE INDEX IF NOT EXISTS idx_sheets_created_by ON sheets(created_by);
