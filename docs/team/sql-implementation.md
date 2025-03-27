# Team Feature SQL Implementation

This document contains the SQL statements required to implement the team feature and configurable resource limitations in Supabase.

## 1. Create New Tables

```sql
-- Subscription tiers
CREATE TABLE subscription_tiers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Resource limits configuration
CREATE TABLE resource_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tier_id TEXT NOT NULL REFERENCES subscription_tiers(id),
    resource_type TEXT NOT NULL,
    max_count INTEGER NOT NULL,
    is_unlimited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tier_id, resource_type)
);

-- Teams table
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    tenant_id TEXT NOT NULL REFERENCES tenants(id),
    created_by UUID REFERENCES profiles(id),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Team members junction table
CREATE TABLE team_members (
    team_id UUID NOT NULL REFERENCES teams(id),
    profile_id UUID NOT NULL REFERENCES profiles(id),
    role TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(team_id, profile_id)
);

-- Resource ownership table (for tracking team ownership of resources)
CREATE TABLE team_resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID NOT NULL REFERENCES teams(id),
    resource_type TEXT NOT NULL,
    resource_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(resource_type, resource_id)
);
```

## 2. Add Columns to Existing Tables

```sql
-- Add subscription_tier_id to tenants table
ALTER TABLE tenants 
ADD COLUMN subscription_tier_id TEXT REFERENCES subscription_tiers(id);

-- Add team_id to resource tables
ALTER TABLE deployments ADD COLUMN team_id UUID REFERENCES teams(id);
ALTER TABLE repositories ADD COLUMN team_id UUID REFERENCES teams(id);
ALTER TABLE cicd_providers ADD COLUMN team_id UUID REFERENCES teams(id);
ALTER TABLE hosts ADD COLUMN team_id UUID REFERENCES teams(id);
```

## 3. Populate Default Data

```sql
-- Insert default subscription tiers
INSERT INTO subscription_tiers (id, name, description) VALUES
('trial', 'Trial', 'Limited resources for trial users'),
('pro', 'Professional', 'Standard resources for professional users'),
('enterprise', 'Enterprise', 'Customizable resources for enterprise users');

-- Insert default resource limits
INSERT INTO resource_limits (tier_id, resource_type, max_count, is_unlimited) VALUES
-- Trial tier limits
('trial', 'hosts', 2, false),
('trial', 'repositories', 3, false),
('trial', 'deployments', 5, false),
('trial', 'cicd_providers', 1, false),

-- Pro tier limits
('pro', 'hosts', 20, false),
('pro', 'repositories', 50, false),
('pro', 'deployments', 100, false),
('pro', 'cicd_providers', 5, false),

-- Enterprise tier limits (set high defaults but not unlimited)
('enterprise', 'hosts', 1000, false),
('enterprise', 'repositories', 1000, false),
('enterprise', 'deployments', 1000, false),
('enterprise', 'cicd_providers', 20, false);

-- Update existing tenants based on current name field
UPDATE tenants SET subscription_tier_id = name 
WHERE name IN ('trial', 'pro', 'enterprise');

-- Create default teams for existing Pro tenants
INSERT INTO teams (name, tenant_id, is_default)
SELECT 'Default Team', id, true FROM tenants WHERE subscription_tier_id = 'pro';

-- Add existing users to their default teams
INSERT INTO team_members (team_id, profile_id, role)
SELECT t.id, p.id, p.role
FROM profiles p
JOIN tenants tn ON p.tenant_id = tn.id
JOIN teams t ON t.tenant_id = tn.id AND t.is_default = true
WHERE tn.subscription_tier_id = 'pro';
```

## 4. Set Up Row-Level Security Policies

```sql
-- Teams RLS policies
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Allow users to see teams in their tenant
CREATE POLICY team_tenant_select_policy ON teams
    FOR SELECT USING (tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid()
    ));

-- Allow admin users to insert teams in their tenant
CREATE POLICY team_tenant_insert_policy ON teams
    FOR INSERT WITH CHECK (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Clean RLS policies for resources tables without backward compatibility
-- Example for deployments:
DROP POLICY IF EXISTS deployments_select_policy ON deployments;
CREATE POLICY deployments_select_policy ON deployments
    FOR SELECT USING (
        -- User has access to this deployment through team membership
        team_id IN (
            SELECT tm.team_id FROM team_members tm
            WHERE tm.profile_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS deployments_insert_policy ON deployments;
CREATE POLICY deployments_insert_policy ON deployments
    FOR INSERT WITH CHECK (
        -- Can insert if user is in the specified team with appropriate role
        team_id IN (
            SELECT tm.team_id FROM team_members tm
            WHERE tm.profile_id = auth.uid()
            AND tm.role IN ('developer', 'admin')
        )
    );

-- Example for hosts:
DROP POLICY IF EXISTS hosts_select_policy ON hosts;
CREATE POLICY hosts_select_policy ON hosts
    FOR SELECT USING (
        -- User has access to this host through team membership
        team_id IN (
            SELECT tm.team_id FROM team_members tm
            WHERE tm.profile_id = auth.uid()
        )
    );

-- Similar clean policy updates would be needed for repositories and cicd_providers tables



-- Allow admin users to update teams in their tenant
CREATE POLICY team_tenant_update_policy ON teams
    FOR UPDATE USING (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Allow admin users to delete teams in their tenant
CREATE POLICY team_tenant_delete_policy ON teams
    FOR DELETE USING (
        tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Team members RLS policies
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Allow users to see members in their teams
CREATE POLICY team_members_select_policy ON team_members
    FOR SELECT USING (
        team_id IN (
            SELECT tm.team_id FROM team_members tm
            WHERE tm.profile_id = auth.uid()
        ) OR team_id IN (
            SELECT t.id FROM teams t
            JOIN profiles p ON t.tenant_id = p.tenant_id
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Allow admin users to manage team members
CREATE POLICY team_members_insert_policy ON team_members
    FOR INSERT WITH CHECK (
        team_id IN (
            SELECT t.id FROM teams t
            JOIN profiles p ON t.tenant_id = p.tenant_id
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Allow admin users to update team members
CREATE POLICY team_members_update_policy ON team_members
    FOR UPDATE USING (
        team_id IN (
            SELECT t.id FROM teams t
            JOIN profiles p ON t.tenant_id = p.tenant_id
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Allow admin users to delete team members
CREATE POLICY team_members_delete_policy ON team_members
    FOR DELETE USING (
        team_id IN (
            SELECT t.id FROM teams t
            JOIN profiles p ON t.tenant_id = p.tenant_id
            WHERE p.id = auth.uid() AND p.role = 'admin'
        )
    );

-- Resource limits policies
ALTER TABLE resource_limits ENABLE ROW LEVEL SECURITY;

-- Everyone can view resource limits
CREATE POLICY resource_limits_select_policy ON resource_limits
    FOR SELECT USING (true);

-- Only service role can modify resource limits
CREATE POLICY resource_limits_insert_policy ON resource_limits
    FOR INSERT WITH CHECK (auth.jwt() ? 'role' AND auth.jwt()->>'role' = 'service_role');
CREATE POLICY resource_limits_update_policy ON resource_limits
    FOR UPDATE USING (auth.jwt() ? 'role' AND auth.jwt()->>'role' = 'service_role');
CREATE POLICY resource_limits_delete_policy ON resource_limits
    FOR DELETE USING (auth.jwt() ? 'role' AND auth.jwt()->>'role' = 'service_role');

-- Team resources policies
ALTER TABLE team_resources ENABLE ROW LEVEL SECURITY;

-- Users can see resources in their teams
CREATE POLICY team_resources_select_policy ON team_resources
    FOR SELECT USING (
        team_id IN (
            SELECT tm.team_id FROM team_members tm
            WHERE tm.profile_id = auth.uid()
        )
    );

-- Allow team members with developer or admin roles to add resources to their team
CREATE POLICY team_resources_insert_policy ON team_resources
    FOR INSERT WITH CHECK (
        team_id IN (
            SELECT tm.team_id FROM team_members tm
            WHERE tm.profile_id = auth.uid()
            AND tm.role IN ('developer', 'admin')
        )
    );

-- Allow team members with developer or admin roles to remove resources from their team
CREATE POLICY team_resources_delete_policy ON team_resources
    FOR DELETE USING (
        team_id IN (
            SELECT tm.team_id FROM team_members tm
            WHERE tm.profile_id = auth.uid()
            AND tm.role IN ('developer', 'admin')
        )
    );