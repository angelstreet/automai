# Supabase Database Schema for Team Permission System

This document provides a comprehensive overview of the Supabase database schema required for the team permission system, including table definitions, relationships, RLS policies, and database functions.

## Entity Relationship Diagram

```
┌───────────────┐     ┌────────────┐     ┌───────────────┐
│   profiles    │     │   teams    │     │subscription_  │
├───────────────┤     ├────────────┤     │    tiers      │
│ id (PK)       │     │ id (PK)    │     ├───────────────┤
│ tenant_id     │◄────┤ tenant_id  │     │ id (PK)       │
│ role          │     │ name       │     │ name          │
└─────┬─────────┘     │ created_by │◄────┤ description   │
      │               │ is_default │     └──────┬────────┘
      │               │ sub_tier   │◄───────────┘
      │               └──────┬─────┘
      │                      │
      │ ┌──────────────────┐ │
      │ │   team_members   │ │
      └─┤                  │◄┘
        │ team_id (PK)     │
        │ profile_id (PK)  │
        │ role             │
        └───────┬──────────┘
                │
                │
    ┌───────────▼────────────┐
    │   permission_matrix    │
    ├──────────────────────┬─┘
    │ team_id              │
    │ profile_id           │
    │ resource_type        │
    │ can_select           │
    │ can_insert           │
    │ can_update           │
    │ can_delete           │
    └──────────────────────┘

               ┌────────────────┐
               │ role_templates │
               ├────────────────┤
               │ id (PK)        │
               │ name           │
               │ permissions    │
               └────────────────┘

 ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐
 │   hosts    │  │repositories│  │deployments │  │cicd_providers│
 ├────────────┤  ├────────────┤  ├────────────┤  ├────────────┤
 │ id (PK)    │  │ id (PK)    │  │ id (PK)    │  │ id (PK)    │
 │ team_id    │  │ team_id    │  │ team_id    │  │ team_id    │
 │ creator_id │  │ provider_id│  │ user_id    │  │ tenant_id  │
 │ ...        │  │ ...        │  │ ...        │  │ ...        │
 └────────────┘  └────────────┘  └────────────┘  └────────────┘

 ┌────────────────┐
 │resource_limits │
 ├────────────────┤
 │ id (PK)        │
 │ tier_id        │
 │ resource_type  │
 │ max_count      │
 │ is_unlimited   │
 └────────────────┘
```

## Core Tables

### `profiles`

Represents user profiles in the system.

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  avatar_url TEXT,
  tenant_id TEXT NOT NULL,
  role TEXT,
  tenant_name TEXT,
  updated_at TIMESTAMPTZ
);

-- RLS policies for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);
```

### `teams`

Represents teams within the system.

```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  tenant_id TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  is_default BOOLEAN DEFAULT FALSE,
  subscription_tier TEXT REFERENCES subscription_tiers(id) DEFAULT 'trial',
  organization_id UUID REFERENCES teams(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies for teams
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view teams they are members of"
  ON teams FOR SELECT
  USING (
    id IN (
      SELECT team_id FROM team_members
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert teams"
  ON teams FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM profiles
      WHERE id = auth.uid()
    )
  );
```

### `team_members`

Represents membership of users in teams with roles.

```sql
CREATE TABLE team_members (
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (team_id, profile_id)
);

-- RLS policies for team_members
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own team memberships"
  ON team_members FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "Team admins can manage team members"
  ON team_members FOR ALL
  USING (
    team_id IN (
      SELECT team_id FROM team_members
      WHERE profile_id = auth.uid()
      AND role = 'admin'
    )
  );
```

### `subscription_tiers`

Defines available subscription tiers.

```sql
CREATE TABLE subscription_tiers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default subscription tiers
INSERT INTO subscription_tiers (id, name, description)
VALUES
  ('trial', 'Trial', 'Free trial with limited resources'),
  ('pro', 'Pro', 'Single team with multiple users'),
  ('enterprise', 'Enterprise', 'Multiple teams with organization-level access');
```

### `resource_limits`

Defines resource limits for each subscription tier.

```sql
CREATE TABLE resource_limits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tier_id TEXT REFERENCES subscription_tiers(id),
  resource_type TEXT NOT NULL,
  max_count INTEGER NOT NULL,
  is_unlimited BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tier_id, resource_type)
);

-- Insert default resource limits
INSERT INTO resource_limits (tier_id, resource_type, max_count, is_unlimited)
VALUES
  -- Trial tier
  ('trial', 'hosts', 3, FALSE),
  ('trial', 'repositories', 5, FALSE),
  ('trial', 'deployments', 10, FALSE),
  ('trial', 'cicd_providers', 1, FALSE),
  -- Pro tier
  ('pro', 'hosts', 10, FALSE),
  ('pro', 'repositories', 20, FALSE),
  ('pro', 'deployments', 50, FALSE),
  ('pro', 'cicd_providers', 5, FALSE),
  -- Enterprise tier
  ('enterprise', 'hosts', 0, TRUE),
  ('enterprise', 'repositories', 0, TRUE),
  ('enterprise', 'deployments', 0, TRUE),
  ('enterprise', 'cicd_providers', 0, TRUE);
```

### `permission_matrix`

Stores granular permissions for team members across resource types.

```sql
CREATE TABLE permission_matrix (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  can_select BOOLEAN DEFAULT false,
  can_insert BOOLEAN DEFAULT false,
  can_update BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, profile_id, resource_type)
);

-- RLS policies for permission_matrix
ALTER TABLE permission_matrix ENABLE ROW LEVEL SECURITY;

CREATE POLICY "permission_matrix_admin_policy" ON permission_matrix
FOR ALL USING (
  team_id IN (
    SELECT tm.team_id FROM team_members tm
    WHERE tm.profile_id = auth.uid() AND tm.role = 'admin'
  )
);

CREATE POLICY "permission_matrix_select_policy" ON permission_matrix
FOR SELECT USING (
  profile_id = auth.uid()
);
```

### `role_templates`

Defines permission templates for standard roles.

```sql
CREATE TABLE role_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  permissions JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default role templates
INSERT INTO role_templates (name, permissions) VALUES
(
  'Admin',
  '{
    "hosts": {"select": true, "insert": true, "update": true, "delete": true},
    "repositories": {"select": true, "insert": true, "update": true, "delete": true},
    "deployments": {"select": true, "insert": true, "update": true, "delete": true},
    "cicd_providers": {"select": true, "insert": true, "update": true, "delete": true},
    "cicd_jobs": {"select": true, "insert": true, "update": true, "delete": true}
  }'
),
(
  'Developer',
  '{
    "hosts": {"select": true, "insert": true, "update": true, "delete": false},
    "repositories": {"select": true, "insert": true, "update": true, "delete": false},
    "deployments": {"select": true, "insert": true, "update": true, "delete": false},
    "cicd_providers": {"select": true, "insert": true, "update": true, "delete": false},
    "cicd_jobs": {"select": true, "insert": true, "update": true, "delete": false}
  }'
),
(
  'Viewer',
  '{
    "hosts": {"select": true, "insert": false, "update": false, "delete": false},
    "repositories": {"select": true, "insert": false, "update": false, "delete": false},
    "deployments": {"select": true, "insert": false, "update": false, "delete": false},
    "cicd_providers": {"select": true, "insert": false, "update": false, "delete": false},
    "cicd_jobs": {"select": true, "insert": false, "update": false, "delete": false}
  }'
);
```

## Resource Tables

### `hosts`

Represents infrastructure hosts.

```sql
CREATE TABLE hosts (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  ip TEXT NOT NULL,
  port INTEGER NOT NULL,
  user TEXT,
  password TEXT,
  status TEXT,
  is_windows BOOLEAN DEFAULT FALSE,
  team_id UUID REFERENCES teams(id),
  creator_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies for hosts
ALTER TABLE hosts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hosts_select_policy" ON hosts
FOR SELECT USING (
  team_id IN (
    SELECT tm.team_id FROM team_members tm
    WHERE tm.profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM permission_matrix pm
      WHERE pm.profile_id = auth.uid()
      AND pm.team_id = tm.team_id
      AND pm.resource_type = 'hosts'
      AND pm.can_select = true
    )
  )
);

CREATE POLICY "hosts_insert_policy" ON hosts
FOR INSERT WITH CHECK (
  team_id IN (
    SELECT tm.team_id FROM team_members tm
    WHERE tm.profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM permission_matrix pm
      WHERE pm.profile_id = auth.uid()
      AND pm.team_id = tm.team_id
      AND pm.resource_type = 'hosts'
      AND pm.can_insert = true
    )
  )
);

CREATE POLICY "hosts_update_policy" ON hosts
FOR UPDATE USING (
  team_id IN (
    SELECT tm.team_id FROM team_members tm
    WHERE tm.profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM permission_matrix pm
      WHERE pm.profile_id = auth.uid()
      AND pm.team_id = tm.team_id
      AND pm.resource_type = 'hosts'
      AND pm.can_update = true
    )
  )
);

CREATE POLICY "hosts_delete_policy" ON hosts
FOR DELETE USING (
  team_id IN (
    SELECT tm.team_id FROM team_members tm
    WHERE tm.profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM permission_matrix pm
      WHERE pm.profile_id = auth.uid()
      AND pm.team_id = tm.team_id
      AND pm.resource_type = 'hosts'
      AND pm.can_delete = true
    )
  )
);
```

### `git_providers`

Represents Git providers.

```sql
CREATE TABLE git_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id),
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  display_name TEXT,
  server_url TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  is_configured BOOLEAN DEFAULT FALSE,
  last_synced TIMESTAMPTZ,
  team_id UUID REFERENCES teams(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies for git_providers following same pattern as hosts
ALTER TABLE git_providers ENABLE ROW LEVEL SECURITY;

-- Add similar RLS policies for git_providers (SELECT, INSERT, UPDATE, DELETE)
```

### `repositories`

Represents code repositories.

```sql
CREATE TABLE repositories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID REFERENCES git_providers(id),
  provider_type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  owner TEXT,
  url TEXT,
  is_private BOOLEAN DEFAULT FALSE,
  default_branch TEXT DEFAULT 'main',
  language TEXT,
  sync_status TEXT,
  last_synced_at TIMESTAMPTZ,
  error TEXT,
  team_id UUID REFERENCES teams(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies for repositories following same pattern as hosts
ALTER TABLE repositories ENABLE ROW LEVEL SECURITY;

-- Add similar RLS policies for repositories (SELECT, INSERT, UPDATE, DELETE)
```

### `cicd_providers`

Represents CI/CD provider connections.

```sql
CREATE TABLE cicd_providers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  url TEXT NOT NULL,
  auth_type TEXT,
  config JSONB,
  tenant_id TEXT NOT NULL,
  team_id UUID REFERENCES teams(id),
  creator_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS policies for cicd_providers following same pattern as hosts
ALTER TABLE cicd_providers ENABLE ROW LEVEL SECURITY;

-- Add similar RLS policies for cicd_providers (SELECT, INSERT, UPDATE, DELETE)
```

### `deployments`

Represents deployment configurations.

```sql
CREATE TABLE deployments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  repository_id UUID REFERENCES repositories(id),
  status TEXT DEFAULT 'pending',
  user_id UUID REFERENCES profiles(id),
  tenant_id TEXT NOT NULL,
  team_id UUID REFERENCES teams(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  scheduled_time TIMESTAMPTZ,
  schedule_type TEXT,
  cron_expression TEXT,
  repeat_count INTEGER,
  scripts_path TEXT[],
  scripts_parameters TEXT[],
  host_ids TEXT[],
  environment_vars JSONB
);

-- RLS policies for deployments following same pattern as hosts
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;

-- Add similar RLS policies for deployments (SELECT, INSERT, UPDATE, DELETE)
```

## Database Functions

### Permission Management Functions

```sql
-- Function to apply role template
CREATE OR REPLACE FUNCTION apply_role_template(
  p_team_id UUID,
  p_profile_id UUID,
  p_role_name TEXT
) RETURNS VOID AS $$
DECLARE
  v_template_id UUID;
  v_permissions JSONB;
  v_resource_type TEXT;
  v_permissions_obj JSONB;
BEGIN
  -- Get the role template
  SELECT id, permissions INTO v_template_id, v_permissions
  FROM role_templates
  WHERE name = p_role_name;

  IF v_template_id IS NULL THEN
    RAISE EXCEPTION 'Role template % not found', p_role_name;
  END IF;

  -- Delete existing permissions
  DELETE FROM permission_matrix
  WHERE team_id = p_team_id AND profile_id = p_profile_id;

  -- For each resource type in the template
  FOR v_resource_type, v_permissions_obj IN
    SELECT * FROM jsonb_each(v_permissions)
  LOOP
    -- Insert new permissions
    INSERT INTO permission_matrix (
      team_id,
      profile_id,
      resource_type,
      can_select,
      can_insert,
      can_update,
      can_delete
    ) VALUES (
      p_team_id,
      p_profile_id,
      v_resource_type,
      (v_permissions_obj->>'select')::boolean,
      (v_permissions_obj->>'insert')::boolean,
      (v_permissions_obj->>'update')::boolean,
      (v_permissions_obj->>'delete')::boolean
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to check specific permission
CREATE OR REPLACE FUNCTION check_permission(
  p_profile_id UUID,
  p_team_id UUID,
  p_resource_type TEXT,
  p_operation TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_has_permission BOOLEAN;
BEGIN
  SELECT
    CASE
      WHEN p_operation = 'select' THEN can_select
      WHEN p_operation = 'insert' THEN can_insert
      WHEN p_operation = 'update' THEN can_update
      WHEN p_operation = 'delete' THEN can_delete
      ELSE FALSE
    END INTO v_has_permission
  FROM permission_matrix
  WHERE
    profile_id = p_profile_id AND
    team_id = p_team_id AND
    resource_type = p_resource_type;

  RETURN COALESCE(v_has_permission, FALSE);
END;
$$ LANGUAGE plpgsql;

-- Function to get active team for a user
CREATE OR REPLACE FUNCTION get_user_active_team(
  p_profile_id UUID
) RETURNS UUID AS $$
DECLARE
  v_team_id UUID;
BEGIN
  -- First try to get the last active team from user metadata
  SELECT meta->>'active_team_id' INTO v_team_id
  FROM profiles
  WHERE id = p_profile_id;

  -- If not set, get the default team
  IF v_team_id IS NULL THEN
    SELECT team_id INTO v_team_id
    FROM team_members tm
    JOIN teams t ON tm.team_id = t.id
    WHERE tm.profile_id = p_profile_id
    AND t.is_default = TRUE
    LIMIT 1;
  END IF;

  -- If still not found, get any team
  IF v_team_id IS NULL THEN
    SELECT team_id INTO v_team_id
    FROM team_members
    WHERE profile_id = p_profile_id
    LIMIT 1;
  END IF;

  RETURN v_team_id;
END;
$$ LANGUAGE plpgsql;
```

### Resource Limit Functions

```sql
-- Function to check if a resource limit is reached
CREATE OR REPLACE FUNCTION check_resource_limit(
  p_tenant_id TEXT,
  p_resource_type TEXT
) RETURNS JSONB AS $$
DECLARE
  v_tier_id TEXT;
  v_max_count INTEGER;
  v_is_unlimited BOOLEAN;
  v_current_count INTEGER;
  v_result JSONB;
BEGIN
  -- Get tenant's subscription tier
  SELECT subscription_tier INTO v_tier_id
  FROM teams t
  JOIN profiles p ON p.tenant_id = t.tenant_id
  WHERE t.tenant_id = p_tenant_id
  LIMIT 1;

  -- Get resource limits for this tier and resource type
  SELECT max_count, is_unlimited INTO v_max_count, v_is_unlimited
  FROM resource_limits
  WHERE tier_id = v_tier_id AND resource_type = p_resource_type;

  -- If unlimited, allow creation
  IF v_is_unlimited THEN
    RETURN jsonb_build_object(
      'allowed', TRUE,
      'current', 0,
      'maximum', 'unlimited',
      'message', 'No limit for this resource type'
    );
  END IF;

  -- Count current resources for the tenant
  EXECUTE 'SELECT COUNT(*) FROM ' || p_resource_type || ' WHERE tenant_id = $1'
    INTO v_current_count
    USING p_tenant_id;

  -- Check if limit reached
  IF v_current_count >= v_max_count THEN
    RETURN jsonb_build_object(
      'allowed', FALSE,
      'current', v_current_count,
      'maximum', v_max_count,
      'message', 'Resource limit reached'
    );
  ELSE
    RETURN jsonb_build_object(
      'allowed', TRUE,
      'current', v_current_count,
      'maximum', v_max_count,
      'message', 'Resource creation allowed'
    );
  END IF;
END;
$$ LANGUAGE plpgsql;
```

## Implementation Instructions

### Default Data

```sql
-- Insert default subscription tiers
INSERT INTO subscription_tiers (id, name, description)
VALUES
  ('trial', 'Trial', 'Free trial with limited resources'),
  ('pro', 'Pro', 'Single team with multiple users'),
  ('enterprise', 'Enterprise', 'Multiple teams with organization-level access');

-- Insert default resource limits
INSERT INTO resource_limits (tier_id, resource_type, max_count, is_unlimited)
VALUES
  -- Trial tier
  ('trial', 'hosts', 3, FALSE),
  ('trial', 'repositories', 5, FALSE),
  ('trial', 'deployments', 10, FALSE),
  ('trial', 'cicd_providers', 1, FALSE),
  -- Pro tier
  ('pro', 'hosts', 10, FALSE),
  ('pro', 'repositories', 20, FALSE),
  ('pro', 'deployments', 50, FALSE),
  ('pro', 'cicd_providers', 5, FALSE),
  -- Enterprise tier
  ('enterprise', 'hosts', 0, TRUE),
  ('enterprise', 'repositories', 0, TRUE),
  ('enterprise', 'deployments', 0, TRUE),
  ('enterprise', 'cicd_providers', 0, TRUE);

-- Insert default role templates
INSERT INTO role_templates (name, permissions) VALUES
(
  'Admin',
  '{
    "hosts": {"select": true, "insert": true, "update": true, "delete": true},
    "repositories": {"select": true, "insert": true, "update": true, "delete": true},
    "deployments": {"select": true, "insert": true, "update": true, "delete": true},
    "cicd_providers": {"select": true, "insert": true, "update": true, "delete": true},
    "cicd_jobs": {"select": true, "insert": true, "update": true, "delete": true}
  }'
),
(
  'Developer',
  '{
    "hosts": {"select": true, "insert": true, "update": true, "delete": false},
    "repositories": {"select": true, "insert": true, "update": true, "delete": false},
    "deployments": {"select": true, "insert": true, "update": true, "delete": false},
    "cicd_providers": {"select": true, "insert": true, "update": true, "delete": false},
    "cicd_jobs": {"select": true, "insert": true, "update": true, "delete": false}
  }'
),
(
  'Viewer',
  '{
    "hosts": {"select": true, "insert": false, "update": false, "delete": false},
    "repositories": {"select": true, "insert": false, "update": false, "delete": false},
    "deployments": {"select": true, "insert": false, "update": false, "delete": false},
    "cicd_providers": {"select": true, "insert": false, "update": false, "delete": false},
    "cicd_jobs": {"select": true, "insert": false, "update": false, "delete": false}
  }'
);
```

### Migration Steps

```sql
-- Step 1: Ensure uuid-ossp extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 2: Create permission_matrix table if not exists
CREATE TABLE IF NOT EXISTS permission_matrix (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL,
  can_select BOOLEAN DEFAULT false,
  can_insert BOOLEAN DEFAULT false,
  can_update BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, profile_id, resource_type)
);

-- Step 3: Create role_templates table if not exists
CREATE TABLE IF NOT EXISTS role_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  permissions JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 4: Update existing resource tables with team_id
ALTER TABLE hosts ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id);
ALTER TABLE repositories ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id);
ALTER TABLE deployments ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id);
ALTER TABLE cicd_providers ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id);

-- Step 5: Create database functions
-- Apply role template function
CREATE OR REPLACE FUNCTION apply_role_template(
  p_team_id UUID,
  p_profile_id UUID,
  p_role_name TEXT
) RETURNS VOID AS $$
-- Function body as defined above
$$ LANGUAGE plpgsql;

-- Step 6: Insert default role templates
INSERT INTO role_templates (name, permissions) VALUES
-- Values as above
ON CONFLICT (name) DO NOTHING;

-- Step 7: Update RLS policies
-- hosts policies
DROP POLICY IF EXISTS "hosts_select_policy" ON hosts;
CREATE POLICY "hosts_select_policy" ON hosts
FOR SELECT USING (
  team_id IN (
    SELECT tm.team_id FROM team_members tm
    WHERE tm.profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM permission_matrix pm
      WHERE pm.profile_id = auth.uid()
      AND pm.team_id = tm.team_id
      AND pm.resource_type = 'hosts'
      AND pm.can_select = true
    )
  )
);

-- Step 8: Create special handler for trial users resources
-- Initially assign resources to default teams
UPDATE hosts
SET team_id = (
  SELECT t.id
  FROM teams t
  WHERE t.tenant_id = (
    SELECT p.tenant_id
    FROM profiles p
    WHERE p.id = hosts.creator_id
  )
  AND t.is_default = TRUE
)
WHERE team_id IS NULL;
```
