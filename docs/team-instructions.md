# Team Permission System Implementation Instructions

This document provides step-by-step instructions for implementing the team and permission system described in the `team.md` document. These instructions cover database setup, backend implementation, and UI integration.

## Database Implementation

### 1. Create Permission Matrix Table

```sql
DO $$
BEGIN
  -- Check if the table exists
  IF NOT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'permission_matrix'
  ) THEN
    -- Create the table if it doesn't exist
    CREATE TABLE permission_matrix (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
      profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
      resource_type TEXT NOT NULL,
      can_select BOOLEAN DEFAULT false,
      can_insert BOOLEAN DEFAULT false,
      can_update BOOLEAN DEFAULT false,
      can_delete BOOLEAN DEFAULT false,
      can_update_own BOOLEAN DEFAULT true,
      can_delete_own BOOLEAN DEFAULT true,
      can_execute BOOLEAN DEFAULT false,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(team_id, profile_id, resource_type)
    );
  ELSE
    -- Alter the table if it exists but needs new columns
    -- Add can_update_own, can_delete_own, and can_execute if they don't exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'permission_matrix'
      AND column_name = 'can_update_own'
    ) THEN
      ALTER TABLE permission_matrix ADD COLUMN can_update_own BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'permission_matrix'
      AND column_name = 'can_delete_own'
    ) THEN
      ALTER TABLE permission_matrix ADD COLUMN can_delete_own BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'permission_matrix'
      AND column_name = 'can_execute'
    ) THEN
      ALTER TABLE permission_matrix ADD COLUMN can_execute BOOLEAN DEFAULT false;
    END IF;
  END IF;
END $$;

-- Add RLS policies if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_policies
    WHERE tablename = 'permission_matrix'
    AND policyname = 'permission_matrix_admin_policy'
  ) THEN
    ALTER TABLE permission_matrix ENABLE ROW LEVEL SECURITY;

    -- Only team admins can manage permissions
    CREATE POLICY "permission_matrix_admin_policy" ON permission_matrix
    FOR ALL USING (
      team_id IN (
        SELECT tm.team_id FROM team_members tm
        WHERE tm.profile_id = auth.uid() AND tm.role = 'admin'
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT FROM pg_policies
    WHERE tablename = 'permission_matrix'
    AND policyname = 'permission_matrix_select_policy'
  ) THEN
    -- Users can view their own permissions
    CREATE POLICY "permission_matrix_select_policy" ON permission_matrix
    FOR SELECT USING (
      profile_id = auth.uid()
    );
  END IF;
END $$;
```

### 2. Create Role Permission Templates

```sql
DO $$
BEGIN
  -- Check if the table exists
  IF NOT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'role_templates'
  ) THEN
    -- Create the table if it doesn't exist
    CREATE TABLE role_templates (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      name TEXT NOT NULL,
      permissions JSONB NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- Insert default role templates only if they don't exist
DO $$
BEGIN
  -- For each role template, check if it exists and insert if not
  IF NOT EXISTS (SELECT FROM role_templates WHERE name = 'Admin') THEN
    INSERT INTO role_templates (name, permissions) VALUES
    (
      'Admin',
      '{
        "hosts": {"select": true, "insert": true, "update": true, "delete": true, "update_own": true, "delete_own": true, "execute": true},
        "repositories": {"select": true, "insert": true, "update": true, "delete": true, "update_own": true, "delete_own": true, "execute": true},
        "deployments": {"select": true, "insert": true, "update": true, "delete": true, "update_own": true, "delete_own": true, "execute": true},
        "cicd_providers": {"select": true, "insert": true, "update": true, "delete": true, "update_own": true, "delete_own": true, "execute": true},
        "cicd_jobs": {"select": true, "insert": true, "update": true, "delete": true, "update_own": true, "delete_own": true, "execute": true}
      }'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM role_templates WHERE name = 'Developer') THEN
    INSERT INTO role_templates (name, permissions) VALUES
    (
      'Developer',
      '{
        "hosts": {"select": true, "insert": true, "update": true, "delete": false, "update_own": true, "delete_own": true, "execute": true},
        "repositories": {"select": true, "insert": true, "update": true, "delete": false, "update_own": true, "delete_own": true, "execute": true},
        "deployments": {"select": true, "insert": true, "update": true, "delete": false, "update_own": true, "delete_own": true, "execute": true},
        "cicd_providers": {"select": true, "insert": true, "update": true, "delete": false, "update_own": true, "delete_own": true, "execute": true},
        "cicd_jobs": {"select": true, "insert": true, "update": true, "delete": false, "update_own": true, "delete_own": true, "execute": true}
      }'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM role_templates WHERE name = 'Viewer') THEN
    INSERT INTO role_templates (name, permissions) VALUES
    (
      'Viewer',
      '{
        "hosts": {"select": true, "insert": false, "update": false, "delete": false, "update_own": false, "delete_own": false, "execute": false},
        "repositories": {"select": true, "insert": false, "update": false, "delete": false, "update_own": false, "delete_own": false, "execute": false},
        "deployments": {"select": true, "insert": false, "update": false, "delete": false, "update_own": false, "delete_own": false, "execute": false},
        "cicd_providers": {"select": true, "insert": false, "update": false, "delete": false, "update_own": false, "delete_own": false, "execute": false},
        "cicd_jobs": {"select": true, "insert": false, "update": false, "delete": false, "update_own": false, "delete_own": false, "execute": false}
      }'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM role_templates WHERE name = 'Tester') THEN
    INSERT INTO role_templates (name, permissions) VALUES
    (
      'Tester',
      '{
        "hosts": {"select": true, "insert": true, "update": false, "delete": false, "update_own": true, "delete_own": true, "execute": true},
        "repositories": {"select": true, "insert": true, "update": false, "delete": false, "update_own": true, "delete_own": true, "execute": true},
        "deployments": {"select": true, "insert": true, "update": false, "delete": false, "update_own": true, "delete_own": true, "execute": true},
        "cicd_providers": {"select": true, "insert": true, "update": false, "delete": false, "update_own": true, "delete_own": true, "execute": true},
        "cicd_jobs": {"select": true, "insert": true, "update": false, "delete": false, "update_own": true, "delete_own": true, "execute": true}
      }'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM role_templates WHERE name = 'Contributor') THEN
    INSERT INTO role_templates (name, permissions) VALUES
    (
      'Contributor',
      '{
        "hosts": {"select": true, "insert": true, "update": false, "delete": false, "update_own": true, "delete_own": true, "execute": true},
        "repositories": {"select": true, "insert": true, "update": false, "delete": false, "update_own": true, "delete_own": true, "execute": true},
        "deployments": {"select": true, "insert": true, "update": false, "delete": false, "update_own": true, "delete_own": true, "execute": true},
        "cicd_providers": {"select": true, "insert": true, "update": false, "delete": false, "update_own": true, "delete_own": true, "execute": true},
        "cicd_jobs": {"select": true, "insert": true, "update": false, "delete": false, "update_own": true, "delete_own": true, "execute": true}
      }'
    );
  END IF;
END $$;
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
-- First, ensure all resource tables have a creator/owner column
DO $$
BEGIN
  -- Check if hosts table exists
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'hosts'
  ) THEN
    -- Add creator_id to hosts if it doesn't exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'hosts'
      AND column_name = 'creator_id'
    ) THEN
      ALTER TABLE hosts ADD COLUMN creator_id UUID REFERENCES profiles(id);
    END IF;
  END IF;

  -- Check if repositories table exists
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'repositories'
  ) THEN
    -- Add creator_id to repositories if it doesn't exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'repositories'
      AND column_name = 'creator_id'
    ) THEN
      ALTER TABLE repositories ADD COLUMN creator_id UUID REFERENCES profiles(id);
    END IF;
  END IF;

  -- Check if deployments table exists
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'deployments'
  ) THEN
    -- Add creator_id to deployments if it doesn't exist (note: it already has user_id)
    IF NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'deployments'
      AND column_name = 'creator_id'
    ) THEN
      -- Use user_id as creator_id since deployments already has user_id column
      ALTER TABLE deployments ADD COLUMN creator_id UUID REFERENCES profiles(id);

      -- Populate creator_id from user_id
      UPDATE deployments SET creator_id = user_id WHERE creator_id IS NULL;
    END IF;
  END IF;

  -- Check if cicd_providers table exists
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'cicd_providers'
  ) THEN
    -- Add creator_id to cicd_providers if it doesn't exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'cicd_providers'
      AND column_name = 'creator_id'
    ) THEN
      ALTER TABLE cicd_providers ADD COLUMN creator_id UUID REFERENCES profiles(id);
    END IF;
  END IF;

  -- Check if cicd_jobs table exists
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'cicd_jobs'
  ) THEN
    -- Add creator_id to cicd_jobs if it doesn't exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'cicd_jobs'
      AND column_name = 'creator_id'
    ) THEN
      ALTER TABLE cicd_jobs ADD COLUMN creator_id UUID REFERENCES profiles(id);
    END IF;
  END IF;
END $$;

-- Update the policy templates to account for table-specific creator columns
-- For hosts table
DROP POLICY IF EXISTS "hosts_update_policy" ON hosts;
CREATE POLICY "hosts_update_policy" ON hosts
FOR UPDATE USING (
  -- Can update if you have team-wide update permission
  (team_id IN (
    SELECT tm.team_id FROM team_members tm
    WHERE tm.profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM permission_matrix pm
      WHERE pm.profile_id = auth.uid()
      AND pm.team_id = tm.team_id
      AND pm.resource_type = 'hosts'
      AND pm.can_update = true
    )
  ))
  OR
  -- OR can update your own resources if you have update_own permission
  (creator_id = auth.uid()
   AND EXISTS (
     SELECT 1 FROM permission_matrix pm
     JOIN team_members tm ON pm.team_id = tm.team_id AND pm.profile_id = tm.profile_id
     WHERE pm.profile_id = auth.uid()
     AND tm.team_id = hosts.team_id
     AND pm.resource_type = 'hosts'
     AND pm.can_update_own = true
   )
  )
);

DROP POLICY IF EXISTS "hosts_delete_policy" ON hosts;
CREATE POLICY "hosts_delete_policy" ON hosts
FOR DELETE USING (
  -- Can delete if you have team-wide delete permission
  (team_id IN (
    SELECT tm.team_id FROM team_members tm
    WHERE tm.profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM permission_matrix pm
      WHERE pm.profile_id = auth.uid()
      AND pm.team_id = tm.team_id
      AND pm.resource_type = 'hosts'
      AND pm.can_delete = true
    )
  ))
  OR
  -- OR can delete your own resources if you have delete_own permission
  (creator_id = auth.uid()
   AND EXISTS (
     SELECT 1 FROM permission_matrix pm
     JOIN team_members tm ON pm.team_id = tm.team_id AND pm.profile_id = tm.profile_id
     WHERE pm.profile_id = auth.uid()
     AND tm.team_id = hosts.team_id
     AND pm.resource_type = 'hosts'
     AND pm.can_delete_own = true
   )
  )
);

-- For repositories table
DROP POLICY IF EXISTS "repositories_update_policy" ON repositories;
CREATE POLICY "repositories_update_policy" ON repositories
FOR UPDATE USING (
  -- Can update if you have team-wide update permission
  (team_id IN (
    SELECT tm.team_id FROM team_members tm
    WHERE tm.profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM permission_matrix pm
      WHERE pm.profile_id = auth.uid()
      AND pm.team_id = tm.team_id
      AND pm.resource_type = 'repositories'
      AND pm.can_update = true
    )
  ))
  OR
  -- OR can update your own resources if you have update_own permission
  (creator_id = auth.uid()
   AND EXISTS (
     SELECT 1 FROM permission_matrix pm
     JOIN team_members tm ON pm.team_id = tm.team_id AND pm.profile_id = tm.profile_id
     WHERE pm.profile_id = auth.uid()
     AND tm.team_id = repositories.team_id
     AND pm.resource_type = 'repositories'
     AND pm.can_update_own = true
   )
  )
);

DROP POLICY IF EXISTS "repositories_delete_policy" ON repositories;
CREATE POLICY "repositories_delete_policy" ON repositories
FOR DELETE USING (
  -- Can delete if you have team-wide delete permission
  (team_id IN (
    SELECT tm.team_id FROM team_members tm
    WHERE tm.profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM permission_matrix pm
      WHERE pm.profile_id = auth.uid()
      AND pm.team_id = tm.team_id
      AND pm.resource_type = 'repositories'
      AND pm.can_delete = true
    )
  ))
  OR
  -- OR can delete your own resources if you have delete_own permission
  (creator_id = auth.uid()
   AND EXISTS (
     SELECT 1 FROM permission_matrix pm
     JOIN team_members tm ON pm.team_id = tm.team_id AND pm.profile_id = tm.profile_id
     WHERE pm.profile_id = auth.uid()
     AND tm.team_id = repositories.team_id
     AND pm.resource_type = 'repositories'
     AND pm.can_delete_own = true
   )
  )
);

-- For deployments table
DROP POLICY IF EXISTS "deployments_update_policy" ON deployments;
CREATE POLICY "deployments_update_policy" ON deployments
FOR UPDATE USING (
  -- Can update if you have team-wide update permission
  (team_id IN (
    SELECT tm.team_id FROM team_members tm
    WHERE tm.profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM permission_matrix pm
      WHERE pm.profile_id = auth.uid()
      AND pm.team_id = tm.team_id
      AND pm.resource_type = 'deployments'
      AND pm.can_update = true
    )
  ))
  OR
  -- OR can update your own resources if you have update_own permission
  (creator_id = auth.uid()
   AND EXISTS (
     SELECT 1 FROM permission_matrix pm
     JOIN team_members tm ON pm.team_id = tm.team_id AND pm.profile_id = tm.profile_id
     WHERE pm.profile_id = auth.uid()
     AND tm.team_id = deployments.team_id
     AND pm.resource_type = 'deployments'
     AND pm.can_update_own = true
   )
  )
);

DROP POLICY IF EXISTS "deployments_delete_policy" ON deployments;
CREATE POLICY "deployments_delete_policy" ON deployments
FOR DELETE USING (
  -- Can delete if you have team-wide delete permission
  (team_id IN (
    SELECT tm.team_id FROM team_members tm
    WHERE tm.profile_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM permission_matrix pm
      WHERE pm.profile_id = auth.uid()
      AND pm.team_id = tm.team_id
      AND pm.resource_type = 'deployments'
      AND pm.can_delete = true
    )
  ))
  OR
  -- OR can delete your own resources if you have delete_own permission
  (creator_id = auth.uid()
   AND EXISTS (
     SELECT 1 FROM permission_matrix pm
     JOIN team_members tm ON pm.team_id = tm.team_id AND pm.profile_id = tm.profile_id
     WHERE pm.profile_id = auth.uid()
     AND tm.team_id = deployments.team_id
     AND pm.resource_type = 'deployments'
     AND pm.can_delete_own = true
   )
  )
);

-- Add policies for cicd_providers and cicd_jobs in a safer way:
DO $$
BEGIN
  -- For cicd_providers table
  IF EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'cicd_providers'
  ) THEN
    BEGIN
      DROP POLICY IF EXISTS "cicd_providers_update_policy" ON cicd_providers;
      CREATE POLICY "cicd_providers_update_policy" ON cicd_providers
      FOR UPDATE USING (
        -- Can update if you have team-wide update permission
        (team_id IN (
          SELECT tm.team_id FROM team_members tm
          WHERE tm.profile_id = auth.uid()
          AND EXISTS (
            SELECT 1 FROM permission_matrix pm
            WHERE pm.profile_id = auth.uid()
            AND pm.team_id = tm.team_id
            AND pm.resource_type = 'cicd_providers'
            AND pm.can_update = true
          )
        ))
        OR
        -- OR can update your own resources if you have update_own permission
        (creator_id = auth.uid()
         AND EXISTS (
           SELECT 1 FROM permission_matrix pm
           JOIN team_members tm ON pm.team_id = tm.team_id AND pm.profile_id = tm.profile_id
           WHERE pm.profile_id = auth.uid()
           AND tm.team_id = cicd_providers.team_id
           AND pm.resource_type = 'cicd_providers'
           AND pm.can_update_own = true
         )
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error creating update policy for cicd_providers: %', SQLERRM;
    END;

    BEGIN
      DROP POLICY IF EXISTS "cicd_providers_delete_policy" ON cicd_providers;
      CREATE POLICY "cicd_providers_delete_policy" ON cicd_providers
      FOR DELETE USING (
        -- Can delete if you have team-wide delete permission
        (team_id IN (
          SELECT tm.team_id FROM team_members tm
          WHERE tm.profile_id = auth.uid()
          AND EXISTS (
            SELECT 1 FROM permission_matrix pm
            WHERE pm.profile_id = auth.uid()
            AND pm.team_id = tm.team_id
            AND pm.resource_type = 'cicd_providers'
            AND pm.can_delete = true
          )
        ))
        OR
        -- OR can delete your own resources if you have delete_own permission
        (creator_id = auth.uid()
         AND EXISTS (
           SELECT 1 FROM permission_matrix pm
           JOIN team_members tm ON pm.team_id = tm.team_id AND pm.profile_id = tm.profile_id
           WHERE pm.profile_id = auth.uid()
           AND tm.team_id = cicd_providers.team_id
           AND pm.resource_type = 'cicd_providers'
           AND pm.can_delete_own = true
         )
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Error creating delete policy for cicd_providers: %', SQLERRM;
    END;
  END IF;
END $$;

-- First, ensure all resource tables have creator_id and team_id columns
DO $$
BEGIN
  -- Define array of resource types
  DECLARE
    v_res_types TEXT[] := ARRAY['hosts', 'repositories', 'deployments', 'cicd_providers', 'cicd_jobs'];
    v_res_type TEXT;
  BEGIN
    -- Loop through all resource types
    FOREACH v_res_type IN ARRAY v_res_types LOOP
      -- Check if table exists
      IF EXISTS (
        SELECT FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = v_res_type
      ) THEN
        -- Add creator_id column if it doesn't exist
        IF NOT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = v_res_type
          AND column_name = 'creator_id'
        ) THEN
          EXECUTE format('ALTER TABLE %I ADD COLUMN creator_id UUID REFERENCES profiles(id);', v_res_type);
          RAISE NOTICE 'Added creator_id column to %', v_res_type;
        END IF;

        -- Add team_id column if it doesn't exist
        IF NOT EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = v_res_type
          AND column_name = 'team_id'
        ) THEN
          EXECUTE format('ALTER TABLE %I ADD COLUMN team_id UUID REFERENCES teams(id);', v_res_type);
          RAISE NOTICE 'Added team_id column to %', v_res_type;
        END IF;

        -- Special case for deployments: populate creator_id from user_id if it exists
        IF v_res_type = 'deployments' AND EXISTS (
          SELECT FROM information_schema.columns
          WHERE table_schema = 'public'
          AND table_name = 'deployments'
          AND column_name = 'user_id'
        ) THEN
          EXECUTE 'UPDATE deployments SET creator_id = user_id WHERE creator_id IS NULL;';
          RAISE NOTICE 'Populated creator_id from user_id in deployments';
        END IF;
      END IF;
    END LOOP;
  END;
END $$;

-- Now create RLS policies for all resource tables using dynamic SQL
DO $$
DECLARE
  v_sql TEXT;
  v_res_types TEXT[] := ARRAY['hosts', 'repositories', 'deployments', 'cicd_providers', 'cicd_jobs'];
  v_res_type TEXT;
  v_has_team_id BOOLEAN;
  v_has_creator_id BOOLEAN;
BEGIN
  -- Loop through all resource types
  FOREACH v_res_type IN ARRAY v_res_types LOOP
    -- Check if table exists
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = v_res_type) THEN

      -- Check if table has team_id column
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = v_res_type
        AND column_name = 'team_id'
      ) INTO v_has_team_id;

      -- Check if table has creator_id column
      SELECT EXISTS (
        SELECT FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = v_res_type
        AND column_name = 'creator_id'
      ) INTO v_has_creator_id;

      -- Skip tables without team_id column
      IF NOT v_has_team_id THEN
        RAISE NOTICE 'Skipping policy creation for %: missing team_id column', v_res_type;
        CONTINUE;
      END IF;

      -- Create update policy with safe error handling
      IF v_has_creator_id THEN
        -- Full policy with creator_id support
        v_sql := format('
          DROP POLICY IF EXISTS "%1$s_update_policy" ON %1$s;
          CREATE POLICY "%1$s_update_policy" ON %1$s
          FOR UPDATE USING (
            -- Can update if you have team-wide update permission
            (team_id IN (
              SELECT tm.team_id FROM team_members tm
              WHERE tm.profile_id = auth.uid()
              AND EXISTS (
                SELECT 1 FROM permission_matrix pm
                WHERE pm.profile_id = auth.uid()
                AND pm.team_id = tm.team_id
                AND pm.resource_type = ''%1$s''
                AND pm.can_update = true
              )
            ))
            OR
            -- OR can update your own resources if you have update_own permission
            (creator_id = auth.uid()
             AND EXISTS (
               SELECT 1 FROM permission_matrix pm
               JOIN team_members tm ON pm.team_id = tm.team_id AND pm.profile_id = tm.profile_id
               WHERE pm.profile_id = auth.uid()
               AND tm.team_id = %1$s.team_id
               AND pm.resource_type = ''%1$s''
               AND pm.can_update_own = true
             )
            )
          );
        ', v_res_type);
      ELSE
        -- Simplified policy without creator_id support
        v_sql := format('
          DROP POLICY IF EXISTS "%1$s_update_policy" ON %1$s;
          CREATE POLICY "%1$s_update_policy" ON %1$s
          FOR UPDATE USING (
            -- Can update if you have team-wide update permission
            team_id IN (
              SELECT tm.team_id FROM team_members tm
              WHERE tm.profile_id = auth.uid()
              AND EXISTS (
                SELECT 1 FROM permission_matrix pm
                WHERE pm.profile_id = auth.uid()
                AND pm.team_id = tm.team_id
                AND pm.resource_type = ''%1$s''
                AND pm.can_update = true
              )
            )
          );
        ', v_res_type);
      END IF;

      -- Execute with error handling
      BEGIN
        EXECUTE v_sql;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error creating update policy for %: %', v_res_type, SQLERRM;
      END;

      -- Create delete policy with safe error handling
      IF v_has_creator_id THEN
        -- Full policy with creator_id support
        v_sql := format('
          DROP POLICY IF EXISTS "%1$s_delete_policy" ON %1$s;
          CREATE POLICY "%1$s_delete_policy" ON %1$s
          FOR DELETE USING (
            -- Can delete if you have team-wide delete permission
            (team_id IN (
              SELECT tm.team_id FROM team_members tm
              WHERE tm.profile_id = auth.uid()
              AND EXISTS (
                SELECT 1 FROM permission_matrix pm
                WHERE pm.profile_id = auth.uid()
                AND pm.team_id = tm.team_id
                AND pm.resource_type = ''%1$s''
                AND pm.can_delete = true
              )
            ))
            OR
            -- OR can delete your own resources if you have delete_own permission
            (creator_id = auth.uid()
             AND EXISTS (
               SELECT 1 FROM permission_matrix pm
               JOIN team_members tm ON pm.team_id = tm.team_id AND pm.profile_id = tm.profile_id
               WHERE pm.profile_id = auth.uid()
               AND tm.team_id = %1$s.team_id
               AND pm.resource_type = ''%1$s''
               AND pm.can_delete_own = true
             )
            )
          );
        ', v_res_type);
      ELSE
        -- Simplified policy without creator_id support
        v_sql := format('
          DROP POLICY IF EXISTS "%1$s_delete_policy" ON %1$s;
          CREATE POLICY "%1$s_delete_policy" ON %1$s
          FOR DELETE USING (
            -- Can delete if you have team-wide delete permission
            team_id IN (
              SELECT tm.team_id FROM team_members tm
              WHERE tm.profile_id = auth.uid()
              AND EXISTS (
                SELECT 1 FROM permission_matrix pm
                WHERE pm.profile_id = auth.uid()
                AND pm.team_id = tm.team_id
                AND pm.resource_type = ''%1$s''
                AND pm.can_delete = true
              )
            )
          );
        ', v_res_type);
      END IF;

      -- Execute with error handling
      BEGIN
        EXECUTE v_sql;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error creating delete policy for %: %', v_res_type, SQLERRM;
      END;

      -- Add execute policy for operations if needed
      v_sql := format('
        DROP POLICY IF EXISTS "%1$s_execute_policy" ON %1$s;
        CREATE POLICY "%1$s_execute_policy" ON %1$s
        FOR SELECT USING (
          EXISTS (
            SELECT tm.team_id FROM team_members tm
            JOIN permission_matrix pm ON tm.team_id = pm.team_id
            WHERE tm.profile_id = auth.uid()
            AND pm.profile_id = auth.uid()
            AND pm.resource_type = ''%1$s''
            AND pm.can_execute = true
            AND %1$s.team_id = tm.team_id
          )
        );
      ', v_res_type);

      -- Execute with error handling
      BEGIN
        EXECUTE v_sql;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Error creating execute policy for %: %', v_res_type, SQLERRM;
      END;
    END IF;
  END LOOP;
END $$;
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
      can_delete,
      can_update_own,
      can_delete_own,
      can_execute
    ) VALUES (
      p_team_id,
      p_profile_id,
      v_resource_type,
      (v_permissions_obj->>'select')::boolean,
      (v_permissions_obj->>'insert')::boolean,
      (v_permissions_obj->>'update')::boolean,
      (v_permissions_obj->>'delete')::boolean,
      (v_permissions_obj->>'update_own')::boolean,
      (v_permissions_obj->>'delete_own')::boolean,
      (v_permissions_obj->>'execute')::boolean
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to check specific permission (including own-resource permissions)
CREATE OR REPLACE FUNCTION check_permission(
  p_profile_id UUID,
  p_team_id UUID,
  p_resource_type TEXT,
  p_operation TEXT,
  p_is_own_resource BOOLEAN DEFAULT FALSE
) RETURNS BOOLEAN AS $$
DECLARE
  v_has_permission BOOLEAN;
BEGIN
  IF p_is_own_resource = TRUE AND
     (p_operation = 'update' OR p_operation = 'delete') THEN
    -- Check own-resource specific permissions
    SELECT
      CASE
        WHEN p_operation = 'update' THEN can_update_own
        WHEN p_operation = 'delete' THEN can_delete_own
        ELSE FALSE
      END INTO v_has_permission
    FROM permission_matrix
    WHERE
      profile_id = p_profile_id AND
      team_id = p_team_id AND
      resource_type = p_resource_type;
  ELSE
    -- Check regular permissions
    SELECT
      CASE
        WHEN p_operation = 'select' THEN can_select
        WHEN p_operation = 'insert' THEN can_insert
        WHEN p_operation = 'update' THEN can_update
        WHEN p_operation = 'delete' THEN can_delete
        WHEN p_operation = 'execute' THEN can_execute
        ELSE FALSE
      END INTO v_has_permission
    FROM permission_matrix
    WHERE
      profile_id = p_profile_id AND
      team_id = p_team_id AND
      resource_type = p_resource_type;
  END IF;

  RETURN COALESCE(v_has_permission, FALSE);
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
// - checkPermission with creator-specific logic:

/**
 * Check if a user has permission for a specific operation
 * @param profileId The user's profile ID
 * @param teamId The team ID
 * @param resourceType The type of resource (hosts, repositories, etc.)
 * @param operation The operation (select, insert, update, delete, execute)
 * @param creatorId The creator of the resource (optional)
 * @returns boolean indicating if permission is granted
 */
async function checkPermission(
  profileId: string,
  teamId: string,
  resourceType: string,
  operation: 'select' | 'insert' | 'update' | 'delete' | 'execute',
  creatorId?: string,
): Promise<boolean> {
  // If operation is update/delete and creatorId matches profileId,
  // check for "own resource" permission
  const isOwnResource =
    (operation === 'update' || operation === 'delete') && creatorId === profileId;

  // Call the database function
  const { data } = await supabase.rpc('check_permission', {
    p_profile_id: profileId,
    p_team_id: teamId,
    p_resource_type: resourceType,
    p_operation: operation,
    p_is_own_resource: isOwnResource,
  });

  return data === true;
}
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
// - Offer permission checking helpers including own-resource checks:

/**
 * Hook to check if the current user has permission for a specific operation
 */
function usePermission() {
  const { activeTeam, currentUser } = useTeamContext();

  const checkPermission = useCallback(
    async (
      resourceType: string,
      operation: 'select' | 'insert' | 'update' | 'delete' | 'execute',
      resourceCreatorId?: string,
    ) => {
      if (!activeTeam || !currentUser) return false;

      // Use the permissions module's checkPermission function
      return checkPermissionFn(
        currentUser.id,
        activeTeam.id,
        resourceType,
        operation,
        resourceCreatorId,
      );
    },
    [activeTeam, currentUser],
  );

  return { checkPermission };
}
```

### 5. Update Server Actions

Update action files for main resources:

- `/src/app/actions/hosts.ts`
- `/src/app/actions/repositories.ts`
- `/src/app/actions/deployments.ts`
- `/src/app/actions/cicd.ts`

Add team and permission checks to each create/update/delete action, with special handling for own-resource permissions:

```typescript
// Example for update action with own-resource permission check
export async function updateHost(id: string, updates: Partial<Host>) {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Find the host to get its team_id and creator_id
    const host = await getHostById(id);
    if (!host.success || !host.data) {
      return { success: false, error: 'Host not found' };
    }

    // Check permission, passing creator_id to enable own-resource permission check
    const canUpdate = await checkPermission(
      user.id,
      host.data.team_id,
      'hosts',
      'update',
      host.data.creator_id, // Pass the creator_id for own-resource check
    );

    if (!canUpdate) {
      return { success: false, error: 'Permission denied' };
    }

    // Proceed with update
    // ...
  } catch (error) {
    // Error handling
  }
}
```

## UI Integration

### 1. Page-by-Page Implementation Plan

#### CICD Page

1. Update `getCICDProviders` to filter by team
2. Add team_id when creating new providers
3. Add permission checks for all provider actions
4. Update UI to show/hide actions based on permissions
5. Add visual indicators for resources created by the current user

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

  // Add team_id and creator_id to data
  const teamContext = await getUserActiveTeam(user.id);
  data.team_id = teamContext.activeTeam.id;
  data.creator_id = user.id; // Track who created this resource

  // Proceed with creation
  // ...
}
```

#### Hosts Page

1. Update `getHosts` to filter by team
2. Add team_id and creator_id when creating new hosts
3. Add permission checks for all host actions
4. Update UI components to respect permissions
5. Add visual indicators for resources the user created

```tsx
// UI component that shows different actions based on creator status
function HostActions({ host }) {
  const { checkPermission } = usePermission();
  const { user } = useUser();
  const isCreator = host.creator_id === user.id;

  const [canUpdate, setCanUpdate] = useState(false);
  const [canDelete, setCanDelete] = useState(false);

  useEffect(() => {
    const checkPermissions = async () => {
      // Check permissions, passing creator_id for own-resource permission checks
      const updatePermission = await checkPermission('hosts', 'update', host.creator_id);
      const deletePermission = await checkPermission('hosts', 'delete', host.creator_id);

      setCanUpdate(updatePermission);
      setCanDelete(deletePermission);
    };

    checkPermissions();
  }, [host, checkPermission, user]);

  return (
    <div>
      {isCreator && <Badge>Created by you</Badge>}

      {canUpdate && <Button onClick={() => handleEdit(host)}>Edit</Button>}

      {canDelete && (
        <Button variant="danger" onClick={() => handleDelete(host)}>
          Delete
        </Button>
      )}
    </div>
  );
}
```

#### Deployments Page

1. Update `getDeployments` to filter by team
2. Add team_id and creator_id when creating new deployments
3. Add permission checks for deployment creation/updates
4. Update wizard to respect team context
5. Add visual indicators for own deployments

#### Repositories Page

1. Update `getRepositories` to filter by team
2. Add team_id and creator_id when connecting repositories
3. Add permission checks for all repository actions
4. Update UI to respect permissions including own-resource permissions
5. Add visual indicators for own repositories

### 2. Common Components to Create

1. **Team Selector Component**: Create a dropdown to switch between teams
2. **Permission Indicator**: Show permission status for resources
3. **Resource Limit Display**: Show usage against limits
4. **Team Management UI**: For administrators to manage teams
5. **CreatorBadge Component**: Badge indicating resources created by the current user
6. **PermissionAwareActions**: Action buttons that adapt based on permissions and creator status

```tsx
// CreatorBadge.tsx
export function CreatorBadge({ creatorId }) {
  const { user } = useUser();

  if (creatorId === user.id) {
    return <Badge variant="outline">Created by you</Badge>;
  }

  return null;
}

// PermissionAwareActions.tsx
export function PermissionAwareActions({ resource, resourceType, onEdit, onDelete, onExecute }) {
  const { checkPermission } = usePermission();
  const [permissions, setPermissions] = useState({
    canUpdate: false,
    canDelete: false,
    canExecute: false,
  });

  useEffect(() => {
    const loadPermissions = async () => {
      const canUpdate = await checkPermission(resourceType, 'update', resource.creator_id);
      const canDelete = await checkPermission(resourceType, 'delete', resource.creator_id);
      const canExecute = await checkPermission(resourceType, 'execute');

      setPermissions({ canUpdate, canDelete, canExecute });
    };

    loadPermissions();
  }, [resource, resourceType, checkPermission]);

  return (
    <div className="flex gap-2">
      {permissions.canUpdate && (
        <Button size="sm" onClick={() => onEdit(resource)}>
          Edit
        </Button>
      )}

      {permissions.canDelete && (
        <Button size="sm" variant="destructive" onClick={() => onDelete(resource)}>
          Delete
        </Button>
      )}

      {permissions.canExecute && (
        <Button size="sm" variant="primary" onClick={() => onExecute(resource)}>
          Run
        </Button>
      )}
    </div>
  );
}

// Example in Deployment component
function DeploymentActions({ deployment }) {
  const { checkPermission } = usePermission();
  const [canExecute, setCanExecute] = useState(false);

  useEffect(() => {
    const checkExecutePermission = async () => {
      const hasPermission = await checkPermission('deployments', 'execute');
      setCanExecute(hasPermission);
    };

    checkExecutePermission();
  }, [deployment, checkPermission]);

  const handleRun = async () => {
    if (!canExecute) {
      toast.error("You don't have permission to run deployments");
      return;
    }

    // Execute deployment logic
    await executeDeployment(deployment.id);
  };

  return (
    <div>
      {canExecute ? (
        <Button onClick={handleRun}>Run Deployment</Button>
      ) : (
        <Button disabled tooltip="You don't have permission to run deployments">
          Run Deployment
        </Button>
      )}
    </div>
  );
}
```

## Testing Plan

1. Test different subscription tiers
2. Test different roles within a team
3. Test cross-team memberships for enterprise users
4. Test resource limit enforcement
5. Test permission enforcement at UI and API level
6. Test own-resource permissions specifically:
   - Create resources as different users
   - Verify users can only modify their own resources when they have own-resource permissions
   - Verify admins can modify all resources

## Migration Strategy

1. Create the new tables and relationships
2. Update existing tables with creator_id field
3. Assign existing resources to appropriate teams
4. Create default permissions for existing teams
5. Test thoroughly before enabling for all users
6. Roll out incrementally, starting with new users
7. Backfill creator_id for existing resources (use audit logs if available, or default to team admin)
