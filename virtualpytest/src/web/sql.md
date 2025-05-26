# VirtualPyTest Supabase Database Schema

This file contains all SQL commands needed to set up the VirtualPyTest database in Supabase PostgreSQL.

## 1. Core Tables

### 1.1 Teams Table
```sql
-- Create teams table
CREATE TABLE teams (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for teams
CREATE INDEX idx_teams_created_by ON teams(created_by);
CREATE INDEX idx_teams_created_at ON teams(created_at);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 1.2 Team Memberships Table
```sql
-- Create team_memberships table
CREATE TABLE team_memberships (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique membership per user per team
    UNIQUE(team_id, user_id)
);

-- Indexes for team_memberships
CREATE INDEX idx_team_memberships_team_id ON team_memberships(team_id);
CREATE INDEX idx_team_memberships_user_id ON team_memberships(user_id);
CREATE INDEX idx_team_memberships_role ON team_memberships(role);
```

### 1.3 Test Cases Table
```sql
-- Create test_cases table
CREATE TABLE test_cases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    test_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    test_type VARCHAR(50) CHECK (test_type IN ('functional', 'performance', 'endurance', 'robustness')) NOT NULL,
    start_node VARCHAR(255) NOT NULL,
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for test_cases
CREATE INDEX idx_test_cases_test_id ON test_cases(test_id);
CREATE INDEX idx_test_cases_test_type ON test_cases(test_type);
CREATE INDEX idx_test_cases_team_id ON test_cases(team_id);
CREATE INDEX idx_test_cases_created_by ON test_cases(created_by);
CREATE INDEX idx_test_cases_created_at ON test_cases(created_at);

-- Trigger for updated_at
CREATE TRIGGER update_test_cases_updated_at BEFORE UPDATE ON test_cases
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 1.4 Navigation Trees Table
```sql
-- Create navigation_trees table
CREATE TABLE navigation_trees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tree_id VARCHAR(255) UNIQUE NOT NULL,
    device VARCHAR(255) NOT NULL,
    version VARCHAR(255) NOT NULL,
    nodes JSONB NOT NULL DEFAULT '{}'::jsonb,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for navigation_trees
CREATE INDEX idx_trees_tree_id ON navigation_trees(tree_id);
CREATE INDEX idx_trees_device ON navigation_trees(device);
CREATE INDEX idx_trees_version ON navigation_trees(version);
CREATE INDEX idx_trees_team_id ON navigation_trees(team_id);
CREATE INDEX idx_trees_created_by ON navigation_trees(created_by);
CREATE INDEX idx_trees_created_at ON navigation_trees(created_at);

-- Trigger for updated_at
CREATE TRIGGER update_navigation_trees_updated_at BEFORE UPDATE ON navigation_trees
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 1.5 Campaigns Table
```sql
-- Create campaigns table
CREATE TABLE campaigns (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    campaign_id VARCHAR(255) UNIQUE NOT NULL,
    campaign_name VARCHAR(255) NOT NULL,
    navigation_tree_id VARCHAR(255) NOT NULL,
    remote_controller VARCHAR(255),
    audio_video_acquisition VARCHAR(255),
    test_case_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    auto_tests JSONB DEFAULT '{"mode": "manual", "nodes": []}'::jsonb,
    prioritize BOOLEAN DEFAULT FALSE,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Foreign key constraint
    CONSTRAINT fk_campaign_tree FOREIGN KEY (navigation_tree_id) REFERENCES navigation_trees(tree_id) ON DELETE CASCADE
);

-- Indexes for campaigns
CREATE INDEX idx_campaigns_campaign_id ON campaigns(campaign_id);
CREATE INDEX idx_campaigns_tree_id ON campaigns(navigation_tree_id);
CREATE INDEX idx_campaigns_prioritize ON campaigns(prioritize);
CREATE INDEX idx_campaigns_team_id ON campaigns(team_id);
CREATE INDEX idx_campaigns_created_by ON campaigns(created_by);
CREATE INDEX idx_campaigns_created_at ON campaigns(created_at);

-- Trigger for updated_at
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 2. Results and Logging Tables

### 2.1 Test Results Table
```sql
-- Create test_results table
CREATE TABLE test_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    test_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    test_type VARCHAR(50) NOT NULL,
    node VARCHAR(255) NOT NULL,
    outcome VARCHAR(50) CHECK (outcome IN ('pass', 'fail', 'error', 'skip')) NOT NULL,
    duration DECIMAL(10,3) NOT NULL, -- Duration in seconds with millisecond precision
    steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    -- Foreign key constraint
    CONSTRAINT fk_result_test FOREIGN KEY (test_id) REFERENCES test_cases(test_id) ON DELETE CASCADE
);

-- Indexes for test_results (optimized for analytics)
CREATE INDEX idx_results_test_id ON test_results(test_id);
CREATE INDEX idx_results_node ON test_results(node);
CREATE INDEX idx_results_outcome ON test_results(outcome);
CREATE INDEX idx_results_timestamp ON test_results(timestamp);
CREATE INDEX idx_results_duration ON test_results(duration);
CREATE INDEX idx_results_test_type ON test_results(test_type);
CREATE INDEX idx_results_team_id ON test_results(team_id);

-- Composite indexes for common queries
CREATE INDEX idx_results_node_outcome ON test_results(node, outcome);
CREATE INDEX idx_results_test_id_timestamp ON test_results(test_id, timestamp);
CREATE INDEX idx_results_team_id_outcome ON test_results(team_id, outcome);
```

### 2.2 Test Logs Table
```sql
-- Create test_logs table
CREATE TABLE test_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    test_id VARCHAR(255) NOT NULL,
    level VARCHAR(20) CHECK (level IN ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL')) NOT NULL,
    message TEXT NOT NULL,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    -- Foreign key constraint
    CONSTRAINT fk_log_test FOREIGN KEY (test_id) REFERENCES test_cases(test_id) ON DELETE CASCADE
);

-- Indexes for test_logs
CREATE INDEX idx_logs_test_id ON test_logs(test_id);
CREATE INDEX idx_logs_level ON test_logs(level);
CREATE INDEX idx_logs_timestamp ON test_logs(timestamp);
CREATE INDEX idx_logs_team_id ON test_logs(team_id);

-- Composite index for common queries
CREATE INDEX idx_logs_test_id_level ON test_logs(test_id, level);
CREATE INDEX idx_logs_team_id_level ON test_logs(team_id, level);
```

### 2.3 Client Data Table (Prioritization)
```sql
-- Create client_data table
CREATE TABLE client_data (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    node VARCHAR(255) NOT NULL,
    priority DECIMAL(5,4) DEFAULT 0.0,
    metadata JSONB DEFAULT '{}'::jsonb,
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure unique node per team
    UNIQUE(team_id, node)
);

-- Indexes for client_data
CREATE INDEX idx_client_data_node ON client_data(node);
CREATE INDEX idx_client_data_priority ON client_data(priority);
CREATE INDEX idx_client_data_team_id ON client_data(team_id);
CREATE INDEX idx_client_data_created_at ON client_data(created_at);

-- Trigger for updated_at
CREATE TRIGGER update_client_data_updated_at BEFORE UPDATE ON client_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## 3. Team-Based Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE navigation_trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_data ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is member of a team
CREATE OR REPLACE FUNCTION is_team_member(team_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM team_memberships 
        WHERE team_id = team_uuid 
        AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is team owner/admin
CREATE OR REPLACE FUNCTION is_team_admin(team_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM team_memberships 
        WHERE team_id = team_uuid 
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Teams policies
CREATE POLICY "Users can view teams they belong to" ON teams 
    FOR SELECT TO authenticated 
    USING (
        id IN (
            SELECT team_id FROM team_memberships 
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create teams" ON teams 
    FOR INSERT TO authenticated 
    WITH CHECK (created_by = auth.uid());

CREATE POLICY "Team admins can update teams" ON teams 
    FOR UPDATE TO authenticated 
    USING (is_team_admin(id))
    WITH CHECK (is_team_admin(id));

CREATE POLICY "Team owners can delete teams" ON teams 
    FOR DELETE TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM team_memberships 
            WHERE team_id = id 
            AND user_id = auth.uid() 
            AND role = 'owner'
        )
    );

-- Team memberships policies
CREATE POLICY "Users can view memberships of their teams" ON team_memberships 
    FOR SELECT TO authenticated 
    USING (is_team_member(team_id));

CREATE POLICY "Team admins can manage memberships" ON team_memberships 
    FOR ALL TO authenticated 
    USING (is_team_admin(team_id))
    WITH CHECK (is_team_admin(team_id));

-- Test Cases policies
CREATE POLICY "Team members can view test cases" ON test_cases 
    FOR SELECT TO authenticated 
    USING (is_team_member(team_id));

CREATE POLICY "Team members can create test cases" ON test_cases 
    FOR INSERT TO authenticated 
    WITH CHECK (is_team_member(team_id) AND created_by = auth.uid());

CREATE POLICY "Team members can update test cases" ON test_cases 
    FOR UPDATE TO authenticated 
    USING (is_team_member(team_id))
    WITH CHECK (is_team_member(team_id));

CREATE POLICY "Team admins can delete test cases" ON test_cases 
    FOR DELETE TO authenticated 
    USING (is_team_admin(team_id));

-- Navigation Trees policies
CREATE POLICY "Team members can view navigation trees" ON navigation_trees 
    FOR SELECT TO authenticated 
    USING (is_team_member(team_id));

CREATE POLICY "Team members can create navigation trees" ON navigation_trees 
    FOR INSERT TO authenticated 
    WITH CHECK (is_team_member(team_id) AND created_by = auth.uid());

CREATE POLICY "Team members can update navigation trees" ON navigation_trees 
    FOR UPDATE TO authenticated 
    USING (is_team_member(team_id))
    WITH CHECK (is_team_member(team_id));

CREATE POLICY "Team admins can delete navigation trees" ON navigation_trees 
    FOR DELETE TO authenticated 
    USING (is_team_admin(team_id));

-- Campaigns policies
CREATE POLICY "Team members can view campaigns" ON campaigns 
    FOR SELECT TO authenticated 
    USING (is_team_member(team_id));

CREATE POLICY "Team members can create campaigns" ON campaigns 
    FOR INSERT TO authenticated 
    WITH CHECK (is_team_member(team_id) AND created_by = auth.uid());

CREATE POLICY "Team members can update campaigns" ON campaigns 
    FOR UPDATE TO authenticated 
    USING (is_team_member(team_id))
    WITH CHECK (is_team_member(team_id));

CREATE POLICY "Team admins can delete campaigns" ON campaigns 
    FOR DELETE TO authenticated 
    USING (is_team_admin(team_id));

-- Test Results policies
CREATE POLICY "Team members can view test results" ON test_results 
    FOR SELECT TO authenticated 
    USING (is_team_member(team_id));

CREATE POLICY "Team members can create test results" ON test_results 
    FOR INSERT TO authenticated 
    WITH CHECK (is_team_member(team_id));

CREATE POLICY "Team members can update test results" ON test_results 
    FOR UPDATE TO authenticated 
    USING (is_team_member(team_id))
    WITH CHECK (is_team_member(team_id));

CREATE POLICY "Team admins can delete test results" ON test_results 
    FOR DELETE TO authenticated 
    USING (is_team_admin(team_id));

-- Test Logs policies
CREATE POLICY "Team members can view test logs" ON test_logs 
    FOR SELECT TO authenticated 
    USING (is_team_member(team_id));

CREATE POLICY "Team members can create test logs" ON test_logs 
    FOR INSERT TO authenticated 
    WITH CHECK (is_team_member(team_id));

CREATE POLICY "Team admins can delete test logs" ON test_logs 
    FOR DELETE TO authenticated 
    USING (is_team_admin(team_id));

-- Client Data policies
CREATE POLICY "Team members can view client data" ON client_data 
    FOR SELECT TO authenticated 
    USING (is_team_member(team_id));

CREATE POLICY "Team members can manage client data" ON client_data 
    FOR ALL TO authenticated 
    USING (is_team_member(team_id))
    WITH CHECK (is_team_member(team_id));
```

## 4. Useful Views for Analytics

### 4.1 Test Results Summary View
```sql
-- Create view for test results summary (team-aware)
CREATE OR REPLACE VIEW test_results_summary AS
SELECT 
    tr.team_id,
    tr.test_id,
    tc.name as test_name,
    tc.test_type,
    COUNT(*) as total_runs,
    COUNT(CASE WHEN tr.outcome = 'pass' THEN 1 END) as passes,
    COUNT(CASE WHEN tr.outcome = 'fail' THEN 1 END) as failures,
    COUNT(CASE WHEN tr.outcome = 'error' THEN 1 END) as errors,
    COUNT(CASE WHEN tr.outcome = 'skip' THEN 1 END) as skips,
    ROUND(
        (COUNT(CASE WHEN tr.outcome = 'pass' THEN 1 END)::DECIMAL / COUNT(*)) * 100, 
        2
    ) as pass_rate,
    AVG(tr.duration) as avg_duration,
    MIN(tr.duration) as min_duration,
    MAX(tr.duration) as max_duration,
    MAX(tr.timestamp) as last_run
FROM test_results tr
JOIN test_cases tc ON tr.test_id = tc.test_id
GROUP BY tr.team_id, tr.test_id, tc.name, tc.test_type;
```

### 4.2 Node Failure Rates View
```sql
-- Create view for node failure rates (team-aware)
CREATE OR REPLACE VIEW node_failure_rates AS
SELECT 
    team_id,
    node,
    COUNT(*) as total_executions,
    COUNT(CASE WHEN outcome = 'fail' THEN 1 END) as failures,
    COUNT(CASE WHEN outcome = 'error' THEN 1 END) as errors,
    ROUND(
        (COUNT(CASE WHEN outcome IN ('fail', 'error') THEN 1 END)::DECIMAL / COUNT(*)) * 100, 
        2
    ) as failure_rate,
    AVG(duration) as avg_duration
FROM test_results
GROUP BY team_id, node
ORDER BY team_id, failure_rate DESC;
```

## 5. Sample Data

### 5.1 Sample Teams and Memberships
```sql
-- Insert sample teams (replace with actual user IDs)
INSERT INTO teams (name, description, created_by) VALUES
('QA Team Alpha', 'Primary QA testing team', auth.uid()),
('Development Team', 'Internal development testing', auth.uid());

-- Get the team IDs for sample data
-- Note: Replace these with actual team IDs after creating teams
-- You can get them with: SELECT id, name FROM teams;

-- Insert team memberships (replace team_id and user_id with actual values)
-- INSERT INTO team_memberships (team_id, user_id, role) VALUES
-- ('your-team-id-here', auth.uid(), 'owner');
```

### 5.2 Sample Test Cases
```sql
-- Insert sample test cases (replace team_id with actual team ID)
-- INSERT INTO test_cases (test_id, name, test_type, start_node, team_id, created_by, steps) VALUES
-- ('test_001', 'Login Flow Test', 'functional', 'home', 'your-team-id-here', auth.uid(), '[
--     {
--         "target_node": "login_page",
--         "verify": {
--             "type": "single",
--             "conditions": [
--                 {
--                     "type": "element_exists",
--                     "condition": "#username",
--                     "timeout": 5000
--                 }
--             ]
--         }
--     }
-- ]'::jsonb);
```

## 6. Useful Functions

### 6.1 Function to Get Team Statistics
```sql
-- Function to get team-specific test statistics
CREATE OR REPLACE FUNCTION get_team_test_statistics(team_uuid UUID)
RETURNS TABLE(
    test_id VARCHAR,
    test_name VARCHAR,
    total_runs BIGINT,
    pass_rate DECIMAL,
    avg_duration DECIMAL,
    last_run TIMESTAMPTZ
) AS $$
BEGIN
    -- Check if user is team member
    IF NOT is_team_member(team_uuid) THEN
        RAISE EXCEPTION 'Access denied: User is not a member of this team';
    END IF;
    
    RETURN QUERY
    SELECT 
        tr.test_id,
        tc.name,
        COUNT(*) as total_runs,
        ROUND(
            (COUNT(CASE WHEN tr.outcome = 'pass' THEN 1 END)::DECIMAL / COUNT(*)) * 100, 
            2
        ) as pass_rate,
        ROUND(AVG(tr.duration), 3) as avg_duration,
        MAX(tr.timestamp) as last_run
    FROM test_results tr
    JOIN test_cases tc ON tr.test_id = tc.test_id
    WHERE tr.team_id = team_uuid
    GROUP BY tr.test_id, tc.name
    ORDER BY last_run DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 6.2 Function to Create Team with Owner
```sql
-- Function to create a team and automatically add creator as owner
CREATE OR REPLACE FUNCTION create_team_with_owner(
    team_name VARCHAR,
    team_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    new_team_id UUID;
BEGIN
    -- Create the team
    INSERT INTO teams (name, description, created_by)
    VALUES (team_name, team_description, auth.uid())
    RETURNING id INTO new_team_id;
    
    -- Add creator as owner
    INSERT INTO team_memberships (team_id, user_id, role)
    VALUES (new_team_id, auth.uid(), 'owner');
    
    RETURN new_team_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 7. Verification Queries

```sql
-- Verify all tables are created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('teams', 'team_memberships', 'test_cases', 'navigation_trees', 'campaigns', 'test_results', 'test_logs', 'client_data');

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check team membership functions
SELECT routine_name, routine_type 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('is_team_member', 'is_team_admin', 'create_team_with_owner', 'get_team_test_statistics');
```

## Usage Instructions

1. **Copy and paste each section** into your Supabase SQL editor
2. **Run sections in order** (1 through 6)
3. **Create your first team** using: `SELECT create_team_with_owner('Your Team Name', 'Description');`
4. **Verify the setup** using the queries in section 7
5. **Add team members** by inserting into team_memberships table
6. **Test the RLS policies** by creating test data

## Team-Based Access Summary

- **Team Owners**: Can delete teams, manage all team data
- **Team Admins**: Can manage team memberships, delete test cases/trees/campaigns
- **Team Members**: Can view and create/update most data, cannot delete or manage memberships
- **Non-members**: Cannot access any team data

## Notes

- All data is now scoped to teams via `team_id` foreign keys
- RLS policies ensure users can only access data from teams they belong to
- Helper functions `is_team_member()` and `is_team_admin()` simplify policy definitions
- Use `create_team_with_owner()` function to properly set up new teams
- Foreign key constraints ensure data integrity across team boundaries

## 8. Cleanup Commands (Use with caution)

```sql
-- Drop all tables (WARNING: This will delete all data)
/*
DROP TABLE IF EXISTS test_logs CASCADE;
DROP TABLE IF EXISTS test_results CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS client_data CASCADE;
DROP TABLE IF EXISTS navigation_trees CASCADE;
DROP TABLE IF EXISTS test_cases CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS get_node_failure_rates() CASCADE;
DROP FUNCTION IF EXISTS get_test_statistics(VARCHAR) CASCADE;
DROP VIEW IF EXISTS test_results_summary CASCADE;
DROP VIEW IF EXISTS node_failure_rates CASCADE;
*/
```

## 9. Verification Queries

```sql
-- Verify all tables are created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('test_cases', 'navigation_trees', 'campaigns', 'test_results', 'test_logs', 'client_data');

-- Check indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('test_cases', 'navigation_trees', 'campaigns', 'test_results', 'test_logs', 'client_data');

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

## Usage Instructions

1. **Copy and paste each section** into your Supabase SQL editor
2. **Run sections in order** (1 through 6)
3. **Verify the setup** using the queries in section 9
4. **Customize RLS policies** based on your authentication requirements
5. **Add sample data** if needed for testing

## Notes

- All tables use UUID primary keys for better performance and security
- JSONB columns are used for flexible schema storage (steps, nodes, metadata)
- Indexes are optimized for common query patterns
- RLS policies are basic - customize based on your auth requirements
- Foreign key constraints ensure data integrity
- Triggers automatically update `updated_at` timestamps 