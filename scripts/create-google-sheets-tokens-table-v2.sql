-- Create google_sheets_tokens table for storing per-user Google Sheets OAuth tokens
-- This table stores individual user tokens for better tracking of sheet changes
CREATE TABLE IF NOT EXISTS google_sheets_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure only one token per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_google_sheets_tokens_user_id ON google_sheets_tokens (user_id);

-- Index for efficient user lookups
CREATE INDEX IF NOT EXISTS idx_google_sheets_tokens_user_expires ON google_sheets_tokens (user_id, expires_at);
