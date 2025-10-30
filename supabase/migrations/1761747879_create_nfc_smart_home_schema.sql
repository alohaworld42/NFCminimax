-- Migration: create_nfc_smart_home_schema
-- Created at: 1761747879

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- NFC Tags table
CREATE TABLE IF NOT EXISTS nfc_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Devices table (Hue bridges and Meross plugs)
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_type TEXT NOT NULL CHECK (device_type IN ('hue_bridge', 'meross_plug')),
  name TEXT NOT NULL,
  connection_details JSONB NOT NULL,
  is_online BOOLEAN DEFAULT FALSE,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Actions table
CREATE TABLE IF NOT EXISTS actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  action_params JSONB NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tag Actions (many-to-many linking)
CREATE TABLE IF NOT EXISTS tag_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL,
  action_id UUID NOT NULL,
  execution_order INTEGER DEFAULT 0,
  time_restrictions JSONB,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tag_id, action_id)
);

-- Activity Log
CREATE TABLE IF NOT EXISTS activity_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tag_id UUID,
  action_id UUID,
  status TEXT NOT NULL CHECK (status IN ('success', 'failure', 'pending')),
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

-- API Credentials (encrypted storage)
CREATE TABLE IF NOT EXISTS api_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL CHECK (service_type IN ('hue', 'meross')),
  credentials JSONB NOT NULL,
  is_valid BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, service_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_nfc_tags_user_id ON nfc_tags(user_id);
CREATE INDEX IF NOT EXISTS idx_nfc_tags_tag_id ON nfc_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);
CREATE INDEX IF NOT EXISTS idx_actions_user_id ON actions(user_id);
CREATE INDEX IF NOT EXISTS idx_actions_device_id ON actions(device_id);
CREATE INDEX IF NOT EXISTS idx_tag_actions_user_id ON tag_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_tag_actions_tag_id ON tag_actions(tag_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_executed_at ON activity_log(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_credentials_user_id ON api_credentials(user_id);

-- RLS Policies (allow both anon and service_role as per best practices)

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- NFC Tags
ALTER TABLE nfc_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tags" ON nfc_tags
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tags" ON nfc_tags
  FOR INSERT WITH CHECK (auth.uid() = user_id AND auth.role() IN ('anon', 'service_role'));

CREATE POLICY "Users can update own tags" ON nfc_tags
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tags" ON nfc_tags
  FOR DELETE USING (auth.uid() = user_id);

-- Devices
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own devices" ON devices
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own devices" ON devices
  FOR INSERT WITH CHECK (auth.uid() = user_id AND auth.role() IN ('anon', 'service_role'));

CREATE POLICY "Users can update own devices" ON devices
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own devices" ON devices
  FOR DELETE USING (auth.uid() = user_id);

-- Actions
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own actions" ON actions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own actions" ON actions
  FOR INSERT WITH CHECK (auth.uid() = user_id AND auth.role() IN ('anon', 'service_role'));

CREATE POLICY "Users can update own actions" ON actions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own actions" ON actions
  FOR DELETE USING (auth.uid() = user_id);

-- Tag Actions
ALTER TABLE tag_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tag actions" ON tag_actions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tag actions" ON tag_actions
  FOR INSERT WITH CHECK (auth.uid() = user_id AND auth.role() IN ('anon', 'service_role'));

CREATE POLICY "Users can update own tag actions" ON tag_actions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tag actions" ON tag_actions
  FOR DELETE USING (auth.uid() = user_id);

-- Activity Log
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity" ON activity_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity" ON activity_log
  FOR INSERT WITH CHECK (auth.uid() = user_id AND auth.role() IN ('anon', 'service_role'));

-- API Credentials
ALTER TABLE api_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own credentials" ON api_credentials
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own credentials" ON api_credentials
  FOR INSERT WITH CHECK (auth.uid() = user_id AND auth.role() IN ('anon', 'service_role'));

CREATE POLICY "Users can update own credentials" ON api_credentials
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own credentials" ON api_credentials
  FOR DELETE USING (auth.uid() = user_id);;