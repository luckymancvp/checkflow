-- Create google_sheets_tokens table for storing system-wide Google Sheets OAuth tokens
-- This table is designed to hold a single row for the global Google Sheets connection.
CREATE TABLE IF NOT EXISTS google_sheets_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure only one row can exist in this table for global settings
CREATE UNIQUE INDEX IF NOT EXISTS idx_google_sheets_tokens_single_row ON google_sheets_tokens ((1));
