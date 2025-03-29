# Team Permission System Implementation Instructions

This document provides step-by-step instructions for implementing the team and permission system described in the `team.md` document. These instructions cover database setup, backend implementation, and UI integration.

## Database Implementation

### 1. Create Permission Matrix Table

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

-- Add RLS policies
ALTER TABLE permission_matrix ENABLE ROW LEVEL SECURITY;

-- Only team admins can manage permissions
CREATE POLICY "permission_matrix_admin_policy" ON permission_matrix
FOR ALL USING (
  team_id IN (
    SELECT tm.team_id FROM team_members tm
    WHERE tm.profile_id = auth.uid() AND tm.role = 'admin'
  )
);

-- Users can view their own permissions
CREATE POLICY "permission_matrix_select_policy" ON permission_matrix
FOR SELECT USING (
  profile_id = auth.uid()
);
```

### 2. Create Role Permission Templates

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

### 3. Update Teams Table

The teams table already exists, but ensure it has the subscription_tier field:

```sql
-- Add subscription_tier if not exists
ALTER TABLE teams
ADD COLUMN IF NOT EXISTS subscription_tier TEXT
REFERENCES subscription_tiers(id) DEFAULT 'trial';

-- Add organization_id for enterprise teams
ALTER TABLE teams
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES teams(id);
```

### 4. Update RLS Policies for Resource Tables

Update the RLS policies for all resource tables to use the permission matrix:

```sql
-- Example for hosts table
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

DROP POLICY IF EXISTS "hosts_insert_policy" ON hosts;
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

-- Repeat for UPDATE and DELETE policies
-- Then repeat the pattern for other resources (repositories, deployments, cicd_providers, cicd_jobs)
```

### 5. Create Database Functions for Permission Management

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
```

## Backend Implementation

### 1. Create Team Database Module

Create/update the file at `/src/lib/supabase/db-teams/teams.ts`:

```typescript
// Implement CRUD operations for teams:
// - createTeam
// - getTeams
// - getTeamById
// - updateTeam
// - deleteTeam
// - getTeamMembers
// - addTeamMember
// - updateTeamMember
// - removeTeamMember
```

### 2. Create Permissions Database Module

Create the file at `/src/lib/supabase/db-teams/permissions.ts`:

```typescript
// Implement permission-related operations:
// - getPermissionsForUser
// - setPermissionsForUser
// - applyRoleTemplate
// - checkPermission
```

### 3. Create Resource Limits Module

Create/update the file at `/src/lib/supabase/db-teams/resource-limits.ts`:

```typescript
// Implement resource limit operations:
// - getResourceLimits
// - checkResourceLimit
// - incrementResourceUsage
// - decrementResourceUsage
```

### 4. Create Team Context

Create/update the file at `/src/context/teamContext.tsx`:

```typescript
// Implement the team context provider:
// - Fetch user's teams and permissions
// - Provide team switching functionality
// - Handle active team state
// - Offer permission checking helpers
```

### 5. Update Server Actions

Update action files for main resources:

- `/src/app/actions/hosts.ts`
- `/src/app/actions/repositories.ts`
- `/src/app/actions/deployments.ts`
- `/src/app/actions/cicd.ts`

Add team and permission checks to each create/update/delete action.

## UI Integration

### 1. Page-by-Page Implementation Plan

#### CICD Page

1. Update `getCICDProviders` to filter by team
2. Add team_id when creating new providers
3. Add permission checks for all provider actions
4. Update UI to show/hide actions based on permissions

```typescript
// Example permission check in server action
export async function createCICDProvider(data) {
  const user = await getUser();

  // Check permission
  const result = await checkPermission(user.id, 'cicd_providers', 'insert');
  if (!result.allowed) {
    return { success: false, error: 'Permission denied' };
  }

  // Check resource limit
  const limitCheck = await checkResourceLimit(user.tenant_id, 'cicd_providers');
  if (!limitCheck.allowed) {
    return { success: false, error: `Resource limit reached: ${limitCheck.message}` };
  }

  // Add team_id to data
  const teamContext = await getUserActiveTeam(user.id);
  data.team_id = teamContext.activeTeam.id;

  // Proceed with creation
  // ...
}
```

#### Hosts Page

1. Update `getHosts` to filter by team
2. Add team_id when creating new hosts
3. Add permission checks for all host actions
4. Update UI components to respect permissions

#### Deployments Page

1. Update `getDeployments` to filter by team
2. Add team_id when creating new deployments
3. Add permission checks for deployment creation/updates
4. Update wizard to respect team context

#### Repositories Page

1. Update `getRepositories` to filter by team
2. Add team_id when connecting repositories
3. Add permission checks for all repository actions
4. Update UI to respect permissions

### 2. Common Components to Create

1. **Team Selector Component**: Create a dropdown to switch between teams
2. **Permission Indicator**: Show permission status for resources
3. **Resource Limit Display**: Show usage against limits
4. **Team Management UI**: For administrators to manage teams

## Testing Plan

1. Test different subscription tiers
2. Test different roles within a team
3. Test cross-team memberships for enterprise users
4. Test resource limit enforcement
5. Test permission enforcement at UI and API level

## Migration Strategy

1. Create the new tables and relationships
2. Assign existing resources to appropriate teams
3. Create default permissions for existing teams
4. Test thoroughly before enabling for all users
5. Roll out incrementally, starting with new users
