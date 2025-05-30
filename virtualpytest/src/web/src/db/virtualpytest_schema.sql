-- VirtualPyTest Enhanced Schema
-- This schema contains the essential tables for VirtualPyTest with device management capabilities

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create teams table for basic multi-tenancy
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create profiles table for user management
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create team_members table for team membership
CREATE TABLE IF NOT EXISTS team_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(team_id, profile_id)
);

-- Create devices table for device under test management
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL, -- android_phone, firetv, appletv, stb_eos, linux, windows, stb
    model VARCHAR(255),
    version VARCHAR(100),
    environment VARCHAR(50) DEFAULT 'dev', -- prod, preprod, dev, staging
    connection_config JSONB DEFAULT '{}', -- IP, ports, credentials, etc.
    status VARCHAR(50) DEFAULT 'offline', -- online, offline, busy, error
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create controllers table for controller configuration
CREATE TABLE IF NOT EXISTS controllers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL, -- remote, audio_video, verification
    config JSONB DEFAULT '{}', -- Controller-specific configuration
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create environment_profiles table for complete test environment setup
CREATE TABLE IF NOT EXISTS environment_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    remote_controller_id UUID REFERENCES controllers(id) ON DELETE SET NULL,
    av_controller_id UUID REFERENCES controllers(id) ON DELETE SET NULL,
    verification_controller_id UUID REFERENCES controllers(id) ON DELETE SET NULL,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create navigation_trees table
CREATE TABLE IF NOT EXISTS navigation_trees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    device_type VARCHAR(100), -- Should match devices.type for compatibility
    tree_data JSONB NOT NULL, -- Complete navigation tree structure
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create test_cases table
CREATE TABLE IF NOT EXISTS test_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    test_type VARCHAR(50) DEFAULT 'functional', -- functional, performance, endurance, robustness
    navigation_tree_id UUID REFERENCES navigation_trees(id) ON DELETE SET NULL,
    start_node VARCHAR(255),
    steps JSONB DEFAULT '[]', -- Test steps with verification conditions
    expected_duration INTEGER DEFAULT 0, -- Expected duration in seconds
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    environment_profile_id UUID REFERENCES environment_profiles(id) ON DELETE SET NULL,
    navigation_tree_id UUID REFERENCES navigation_trees(id) ON DELETE SET NULL,
    test_case_ids UUID[] DEFAULT '{}', -- Array of test case IDs
    auto_generation_config JSONB DEFAULT '{}', -- Auto-test generation settings
    prioritization_enabled BOOLEAN DEFAULT false,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create test_results table for execution results
CREATE TABLE IF NOT EXISTS test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_case_id UUID REFERENCES test_cases(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    environment_profile_id UUID REFERENCES environment_profiles(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL, -- pass, fail, error, timeout
    duration INTEGER DEFAULT 0, -- Actual duration in seconds
    error_message TEXT,
    execution_log JSONB DEFAULT '[]', -- Detailed execution steps and results
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_devices_team_id ON devices(team_id);
CREATE INDEX IF NOT EXISTS idx_devices_type ON devices(type);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_controllers_team_id ON controllers(team_id);
CREATE INDEX IF NOT EXISTS idx_controllers_device_id ON controllers(device_id);
CREATE INDEX IF NOT EXISTS idx_controllers_type ON controllers(type);
CREATE INDEX IF NOT EXISTS idx_environment_profiles_team_id ON environment_profiles(team_id);
CREATE INDEX IF NOT EXISTS idx_navigation_trees_team_id ON navigation_trees(team_id);
CREATE INDEX IF NOT EXISTS idx_navigation_trees_device_type ON navigation_trees(device_type);
CREATE INDEX IF NOT EXISTS idx_test_cases_team_id ON test_cases(team_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_navigation_tree_id ON test_cases(navigation_tree_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_team_id ON campaigns(team_id);
CREATE INDEX IF NOT EXISTS idx_test_results_team_id ON test_results(team_id);
CREATE INDEX IF NOT EXISTS idx_test_results_test_case_id ON test_results(test_case_id);
CREATE INDEX IF NOT EXISTS idx_test_results_campaign_id ON test_results(campaign_id);

-- Enable Row Level Security (RLS)
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE controllers ENABLE ROW LEVEL SECURITY;
ALTER TABLE environment_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE navigation_trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for team-based access
-- Teams policies
CREATE POLICY "Users can view teams they belong to" ON teams FOR SELECT USING (
    id IN (SELECT team_id FROM team_members WHERE profile_id = auth.uid())
);

CREATE POLICY "Users can update teams they belong to" ON teams FOR UPDATE USING (
    id IN (SELECT team_id FROM team_members WHERE profile_id = auth.uid())
);

-- Profiles policies  
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (id = auth.uid());

-- Team members policies
CREATE POLICY "Users can view team members of their teams" ON team_members FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE profile_id = auth.uid())
);

-- Device management policies
CREATE POLICY "Users can manage devices in their teams" ON devices FOR ALL USING (
    team_id IN (SELECT team_id FROM team_members WHERE profile_id = auth.uid())
);

CREATE POLICY "Users can manage controllers in their teams" ON controllers FOR ALL USING (
    team_id IN (SELECT team_id FROM team_members WHERE profile_id = auth.uid())
);

CREATE POLICY "Users can manage environment profiles in their teams" ON environment_profiles FOR ALL USING (
    team_id IN (SELECT team_id FROM team_members WHERE profile_id = auth.uid())
);

-- Test management policies
CREATE POLICY "Users can manage navigation trees in their teams" ON navigation_trees FOR ALL USING (
    team_id IN (SELECT team_id FROM team_members WHERE profile_id = auth.uid())
);

CREATE POLICY "Users can manage test cases in their teams" ON test_cases FOR ALL USING (
    team_id IN (SELECT team_id FROM team_members WHERE profile_id = auth.uid())
);

CREATE POLICY "Users can manage campaigns in their teams" ON campaigns FOR ALL USING (
    team_id IN (SELECT team_id FROM team_members WHERE profile_id = auth.uid())
);

CREATE POLICY "Users can view test results in their teams" ON test_results FOR ALL USING (
    team_id IN (SELECT team_id FROM team_members WHERE profile_id = auth.uid())
);

-- Insert demo data for immediate testing
INSERT INTO teams (id, name, description) VALUES 
('550e8400-e29b-41d4-a716-446655440000', 'Demo Team', 'Default team for testing VirtualPyTest')
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, email, full_name) VALUES 
('550e8400-e29b-41d4-a716-446655440001', 'demo@virtualpytest.com', 'Demo User')
ON CONFLICT (id) DO NOTHING;

INSERT INTO team_members (team_id, profile_id, role) VALUES 
('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'admin')
ON CONFLICT (team_id, profile_id) DO NOTHING;

-- Insert sample devices
INSERT INTO devices (id, name, type, model, version, environment, team_id) VALUES 
('550e8400-e29b-41d4-a716-446655440010', 'Android Phone Test Device', 'android_phone', 'Samsung Galaxy S21', 'Android 12', 'dev', '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440011', 'Fire TV Stick 4K', 'firetv', 'Fire TV Stick 4K Max', 'Fire OS 7', 'dev', '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440012', 'Apple TV 4K', 'appletv', 'Apple TV 4K (3rd gen)', 'tvOS 16', 'dev', '550e8400-e29b-41d4-a716-446655440000')
ON CONFLICT (id) DO NOTHING;

-- Insert sample controllers
INSERT INTO controllers (id, name, type, config, device_id, team_id) VALUES 
('550e8400-e29b-41d4-a716-446655440020', 'Android Remote Controller', 'remote', '{"protocol": "adb", "commands": {"left": "input keyevent 21", "right": "input keyevent 22", "ok": "input keyevent 23"}}', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440021', 'HDMI Audio/Video Controller', 'audio_video', '{"capture_device": "hdmi", "resolution": "1920x1080", "fps": 30}', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440000'),
('550e8400-e29b-41d4-a716-446655440022', 'Image Verification Controller', 'verification', '{"image_threshold": 0.8, "timeout_default": 5}', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440000')
ON CONFLICT (id) DO NOTHING;

-- Insert sample environment profile
INSERT INTO environment_profiles (id, name, description, device_id, remote_controller_id, av_controller_id, verification_controller_id, team_id) VALUES 
('550e8400-e29b-41d4-a716-446655440030', 'Android Test Environment', 'Complete test setup for Android device testing', '550e8400-e29b-41d4-a716-446655440010', '550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440021', '550e8400-e29b-41d4-a716-446655440022', '550e8400-e29b-41d4-a716-446655440000')
ON CONFLICT (id) DO NOTHING; 