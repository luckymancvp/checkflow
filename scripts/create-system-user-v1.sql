-- Create system user for automated operations
INSERT INTO users (id, email, name, role, avatar_url, created_at, updated_at, last_login)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  'system@checkflow.com',
  'System',
  'system',
  'https://via.placeholder.com/150?text=SYS',
  NOW(),
  NOW(),
  NOW()
) ON CONFLICT (email) DO NOTHING;

-- Create indexes for users table if not exists (for performance)
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login);
