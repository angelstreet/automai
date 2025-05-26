-- VirtualPyTest Minimal Schema
-- This schema contains only the essential tables needed for VirtualPyTest functionality

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

-- Create test_cases table
CREATE TABLE IF NOT EXISTS test_cases (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_id VARCHAR(255) NOT NULL, -- Business identifier
    name VARCHAR(255) NOT NULL,
    test_type VARCHAR(100),
    start_node VARCHAR(255),
    steps JSONB DEFAULT '[]'::jsonb,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(test_id, team_id)
);

-- Create navigation_trees table
CREATE TABLE IF NOT EXISTS navigation_trees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tree_id VARCHAR(255) NOT NULL, -- Business identifier
    name VARCHAR(255) NOT NULL,
    description TEXT,
    nodes JSONB DEFAULT '[]'::jsonb,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tree_id, team_id)
);

-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id VARCHAR(255) NOT NULL, -- Business identifier
    name VARCHAR(255) NOT NULL,
    description TEXT,
    test_case_ids JSONB DEFAULT '[]'::jsonb,
    navigation_tree_id UUID REFERENCES navigation_trees(id),
    prioritization_enabled BOOLEAN DEFAULT FALSE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    creator_id UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(campaign_id, team_id)
);

-- Create test_results table for storing test execution results
CREATE TABLE IF NOT EXISTS test_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    test_case_id UUID REFERENCES test_cases(id) ON DELETE CASCADE,
    campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
    status VARCHAR(50), -- 'passed', 'failed', 'pending', 'skipped'
    result_data JSONB,
    execution_time INTEGER, -- in milliseconds
    error_message TEXT,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    executed_by UUID REFERENCES profiles(id),
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_test_cases_team_id ON test_cases(team_id);
CREATE INDEX IF NOT EXISTS idx_test_cases_test_id ON test_cases(test_id);
CREATE INDEX IF NOT EXISTS idx_navigation_trees_team_id ON navigation_trees(team_id);
CREATE INDEX IF NOT EXISTS idx_navigation_trees_tree_id ON navigation_trees(tree_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_team_id ON campaigns(team_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_campaign_id ON campaigns(campaign_id);
CREATE INDEX IF NOT EXISTS idx_test_results_team_id ON test_results(team_id);
CREATE INDEX IF NOT EXISTS idx_test_results_status ON test_results(status);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_profile_id ON team_members(profile_id);

-- Enable Row Level Security
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE navigation_trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for team-based access
-- Teams: Users can only see teams they belong to
CREATE POLICY "Users can view teams they belong to" ON teams
    FOR SELECT USING (
        id IN (
            SELECT team_id FROM team_members 
            WHERE profile_id = auth.uid()
        )
    );

-- Profiles: Users can view their own profile and profiles of team members
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can view team member profiles" ON profiles
    FOR SELECT USING (
        id IN (
            SELECT tm.profile_id FROM team_members tm
            JOIN team_members my_teams ON my_teams.team_id = tm.team_id
            WHERE my_teams.profile_id = auth.uid()
        )
    );

-- Team members: Users can view team memberships for their teams
CREATE POLICY "Users can view team memberships" ON team_members
    FOR SELECT USING (
        team_id IN (
            SELECT team_id FROM team_members 
            WHERE profile_id = auth.uid()
        )
    );

-- Test cases: Users can only access test cases from their teams
CREATE POLICY "Users can access team test cases" ON test_cases
    FOR ALL USING (
        team_id IN (
            SELECT team_id FROM team_members 
            WHERE profile_id = auth.uid()
        )
    );

-- Navigation trees: Users can only access trees from their teams
CREATE POLICY "Users can access team navigation trees" ON navigation_trees
    FOR ALL USING (
        team_id IN (
            SELECT team_id FROM team_members 
            WHERE profile_id = auth.uid()
        )
    );

-- Campaigns: Users can only access campaigns from their teams
CREATE POLICY "Users can access team campaigns" ON campaigns
    FOR ALL USING (
        team_id IN (
            SELECT team_id FROM team_members 
            WHERE profile_id = auth.uid()
        )
    );

-- Test results: Users can only access results from their teams
CREATE POLICY "Users can access team test results" ON test_results
    FOR ALL USING (
        team_id IN (
            SELECT team_id FROM team_members 
            WHERE profile_id = auth.uid()
        )
    );

-- Insert default data for demo purposes
INSERT INTO teams (id, name, description) VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', 'Demo Team', 'Default team for VirtualPyTest demo')
ON CONFLICT (id) DO NOTHING;

INSERT INTO profiles (id, email, full_name) VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', 'demo@virtualpytest.com', 'Demo User')
ON CONFLICT (id) DO NOTHING;

INSERT INTO team_members (team_id, profile_id, role) VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'admin')
ON CONFLICT (team_id, profile_id) DO NOTHING;

-- Create a function to automatically update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_test_cases_updated_at BEFORE UPDATE ON test_cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_navigation_trees_updated_at BEFORE UPDATE ON navigation_trees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 