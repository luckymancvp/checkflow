CREATE TABLE IF NOT EXISTS users (
id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
email VARCHAR(255) UNIQUE NOT NULL,
name VARCHAR(255) NOT NULL,
role VARCHAR(50) DEFAULT 'user',
avatar_url TEXT,
created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);


-- Create auth_logs table for tracking authentication events
CREATE TABLE IF NOT EXISTS auth_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('login', 'logout', 'error')),
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_auth_logs_user_id ON auth_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_logs_event_type ON auth_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_auth_logs_created_at ON auth_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_auth_logs_success ON auth_logs(success);





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





INSERT INTO "public"."users" ("id", "email", "name", "role", "avatar_url", "created_at", "updated_at", "last_login") VALUES ('00000000-0000-0000-0000-000000000001', 'testuser@example.com', 'Test User', 'user', '/placeholder.svg?height=80&width=80', '2025-07-22 02:17:12.371389+00', '2025-07-22 03:22:09.523+00', '2025-07-22 03:22:09.523+00');


INSERT INTO "public"."google_sheets_tokens" ("id", "access_token", "refresh_token", "expires_at", "updated_at") VALUES ('00000000-0000-0000-0000-000000000001', 'ya29.a0AS3H6Nx7qAIAKpdcVB8hc5sW7L0QCuLoeWxymMO2RREjAPYTxm6ICUbiThgwXe8-iZtBrPCmtP3LrlIcyhGpIL5LpZ5DhDpZtCRdF1PIBYlRi5zFnGMriWe1EVqux10vpuwW345g_hBR1pSdpD1TwUVk1tpYS0NXeZnTow2qaCgYKATISARUSFQHGX2Mi9TrBwhuE7xWGxVZEG6-hkA0175', '1//05Dq4AUnNL0YMCgYIARAAGAUSNwF-L9IrNsj76JGVaBoScF6KltHbSyMJTZza6wlVoFXwqGyC44X0XhKMf_N9ebFHRbE2cWWqbBw', '2025-07-21 04:39:25.634+00', '2025-07-21 03:39:26.635+00');
 
INSERT INTO "public"."sheets" ("id", "name", "description", "google_sheet_id", "tab_name", "configuration", "created_by", "last_access", "created_at", "updated_at") VALUES ('0645365e-7dfc-4f1e-ac48-8bca9c9a2af0', 'BIG DADDY -- V2', '', '1g75aI0cACUiYhFoHrn0-ptqzbB-q75vMXxFaT3_OrjQ', 'Order', '{"dataRange":{"endRow":null,"columns":"A:N","startRow":2,"headerRow":1},"syncRange":"60-days","syncStrategy":"date-based","columnMapping":{"date":"Date","image":"Image Link","store":"Store","design":"Designer","itemId":"Item ID","status":"Status","designer":"Designer","orderNote":"Order Note","productName":"Product Name","productType":"Product Type","customerImage":"Image Link","personalization":"Personalization"},"readDirection":"top-to-bottom","maxRowsPerLoad":500}', '00000000-0000-0000-0000-000000000001', null, '2025-07-21 04:18:46.177104+00', '2025-08-15 13:03:23.296+00'), ('1fc0a1cb-470a-4bb0-8f76-bf80527aa432', 'test tool', '', '1513SRg-C1NVmPVBgNIJzmvUjVI1lrvyhVJ0VmttsS2Y', 'Order', '{"dataRange":{"endRow":null,"columns":"A:AN","startRow":2,"headerRow":1},"syncRange":"60-days","syncStrategy":"date-based","columnMapping":{"date":"Date","image":"Image","store":"Store","design":"Design","itemId":"Item ID","status":"Status","designer":"Designer","orderNote":"Order Note","productName":"Product Name","productType":"Product Type","customerImage":"Customer Image","personalization":"Personalization"},"readDirection":"top-to-bottom","maxRowsPerLoad":500}', '00000000-0000-0000-0000-000000000001', null, '2025-08-25 16:58:59.334272+00', '2025-08-25 17:18:29.891+00'), ('223f7464-e807-46ae-a0ed-1681ffedfc7e', 'IRON MAN - Etsy Tool', '', '1V6xFDsHZ46_JfPCTyBkLfxp-8QyJBp3qirgiOZEj6cg', 'Order', '{"dataRange":{"endRow":null,"columns":"A:AN","startRow":2,"headerRow":1},"syncRange":"60-days","syncStrategy":"date-based","columnMapping":{"date":"Date","image":"Image Link","store":"Store","design":"Designer","itemId":"Item ID","status":"Status","designer":"Designer","orderNote":"Order Note","productName":"Product Name","productType":"Product Type","customerImage":"Customer Image","personalization":"Personalization"},"readDirection":"top-to-bottom","maxRowsPerLoad":500}', '00000000-0000-0000-0000-000000000001', null, '2025-07-21 04:26:50.517695+00', '2025-08-25 15:50:14.02+00');
