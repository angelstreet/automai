-- =====================================================
-- SUPABASE SCHEMA BACKUP
-- Generated: 2025-01-04
-- Project: VirtualPyTest Migration
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================================
-- CUSTOM FUNCTIONS
-- =====================================================

-- Function to check if user is team member
CREATE OR REPLACE FUNCTION public.is_team_member(user_id uuid, team_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM team_members 
    WHERE profile_id = user_id AND team_id = $2
  );
$function$;

-- Function to handle updated_at timestamps
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$function$;

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

-- Function to update timestamp
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS trigger
LANGUAGE plpgsql
AS $function$BEGIN
  NEW."updated_at" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;$function$;

-- Function to create profile on user creation
CREATE OR REPLACE FUNCTION public.create_profile_on_user_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$BEGIN
  INSERT INTO public.profiles (id, active_team, avatar_url)
  VALUES (
    NEW.id,
    '2211d930-8f20-4654-a0ca-699084e7917f',
    ''
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;$function$;

-- Function to handle new user team creation
CREATE OR REPLACE FUNCTION public.handle_new_user_team()
RETURNS trigger
LANGUAGE plpgsql
AS $function$DECLARE
  new_team_id UUID;
BEGIN
  INSERT INTO public.teams (id,name, description, tenant_id, created_by, is_default)
  VALUES (
    gen_random_uuid(),
    'Personal Team',
    'Personal workspace for ' || NEW.id,
    'f2e65010-506c-40bc-9d24-d26e5c04dad6',
    NEW.id,
    TRUE
  )
  RETURNING id INTO new_team_id;

  INSERT INTO public.team_members (team_id, profile_id, role)
  VALUES (new_team_id, NEW.id,'admin');

  UPDATE public.profiles
  SET active_team = new_team_id
  WHERE id = NEW.id;

  RETURN NEW;
END;$function$;

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Tenants table
CREATE TABLE IF NOT EXISTS public.tenants (
    id text NOT NULL,
    name text NOT NULL,
    subscription_tier_id uuid,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT tenants_pkey PRIMARY KEY (id)
);

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL,
    active_team uuid,
    avatar_url text DEFAULT ''::text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

-- Teams table
CREATE TABLE IF NOT EXISTS public.teams (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    tenant_id text NOT NULL,
    created_by uuid NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT teams_pkey PRIMARY KEY (id),
    CONSTRAINT teams_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE,
    CONSTRAINT teams_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- Team members table
CREATE TABLE IF NOT EXISTS public.team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    profile_id uuid NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT team_members_pkey PRIMARY KEY (id),
    CONSTRAINT team_members_team_id_profile_id_key UNIQUE (team_id, profile_id),
    CONSTRAINT team_members_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE,
    CONSTRAINT team_members_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

-- =====================================================
-- VIRTUALPYTEST TABLES
-- =====================================================

-- Test cases table
CREATE TABLE IF NOT EXISTS public.test_cases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    steps jsonb DEFAULT '[]'::jsonb,
    verification_conditions jsonb DEFAULT '[]'::jsonb,
    priority integer DEFAULT 1,
    tags text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT test_cases_pkey PRIMARY KEY (id),
    CONSTRAINT test_cases_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE
);

-- Navigation trees table
CREATE TABLE IF NOT EXISTS public.navigation_trees (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    tree_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT navigation_trees_pkey PRIMARY KEY (id),
    CONSTRAINT navigation_trees_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE
);

-- Campaigns table
CREATE TABLE IF NOT EXISTS public.campaigns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    test_case_ids uuid[] DEFAULT '{}'::uuid[],
    priority_weights jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT campaigns_pkey PRIMARY KEY (id),
    CONSTRAINT campaigns_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE
);

-- Test results table
CREATE TABLE IF NOT EXISTS public.test_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    team_id uuid NOT NULL,
    test_case_id uuid,
    campaign_id uuid,
    status text DEFAULT 'pending'::text,
    execution_time numeric,
    error_message text,
    logs jsonb DEFAULT '[]'::jsonb,
    screenshots text[] DEFAULT '{}'::text[],
    executed_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT test_results_pkey PRIMARY KEY (id),
    CONSTRAINT test_results_team_id_fkey FOREIGN KEY (team_id) REFERENCES public.teams(id) ON DELETE CASCADE,
    CONSTRAINT test_results_test_case_id_fkey FOREIGN KEY (test_case_id) REFERENCES public.test_cases(id) ON DELETE SET NULL,
    CONSTRAINT test_results_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL
);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navigation_trees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Tenants policies
CREATE POLICY "Enable read access for all users" ON public.tenants
    FOR SELECT USING (true);

CREATE POLICY "Service role can do all on tenants" ON public.tenants
    FOR ALL USING (auth.role() = 'service_role'::text);

-- Profiles policies
CREATE POLICY "Enable insert for authenticated users only" ON public.profiles
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "profiles_team_members_select_policy" ON public.profiles
    FOR SELECT TO authenticated USING (
        (id = auth.uid()) OR 
        (id IN (
            SELECT tm.profile_id
            FROM team_members tm
            WHERE tm.team_id IN (
                SELECT team_members.team_id
                FROM team_members
                WHERE team_members.profile_id = auth.uid()
            )
        ))
    );

CREATE POLICY "Service role can do all on users" ON public.profiles
    FOR ALL USING (auth.role() = 'service_role'::text);

-- Teams policies
CREATE POLICY "teams_insert_policy" ON public.teams
    FOR INSERT WITH CHECK (true);

CREATE POLICY "teams_select_policy" ON public.teams
    FOR SELECT USING (
        EXISTS (
            SELECT 1
            FROM team_members
            WHERE team_members.team_id = teams.id 
            AND team_members.profile_id = auth.uid()
        )
    );

CREATE POLICY "teams_update_policy" ON public.teams
    FOR UPDATE USING (
        EXISTS (
            SELECT 1
            FROM team_members
            WHERE team_members.profile_id = auth.uid() 
            AND team_members.team_id = teams.id 
            AND team_members.role = 'admin'::text
        )
    );

CREATE POLICY "teams_delete_policy" ON public.teams
    FOR DELETE USING (
        EXISTS (
            SELECT 1
            FROM team_members
            WHERE team_members.profile_id = auth.uid() 
            AND team_members.team_id = teams.id 
            AND team_members.role = 'admin'::text
        )
    );

-- Team members policies
CREATE POLICY "team_members_insert_policy" ON public.team_members
    FOR INSERT WITH CHECK (true);

CREATE POLICY "team_members_basic_select_policy" ON public.team_members
    FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "team_members_view_teammates_policy" ON public.team_members
    FOR SELECT USING (is_team_member(auth.uid(), team_id));

CREATE POLICY "team_members_update_policy" ON public.team_members
    FOR UPDATE USING (
        EXISTS (
            SELECT 1
            FROM team_members tm
            WHERE tm.profile_id = auth.uid() 
            AND tm.team_id = team_members.team_id 
            AND tm.role = 'admin'::text
        )
    );

CREATE POLICY "team_members_delete_policy" ON public.team_members
    FOR DELETE USING (
        EXISTS (
            SELECT 1
            FROM team_members tm
            WHERE tm.profile_id = auth.uid() 
            AND tm.team_id = team_members.team_id 
            AND tm.role = 'admin'::text
        )
    );

-- Test cases policies
CREATE POLICY "Users can view test cases from their teams" ON public.test_cases
    FOR SELECT USING (
        team_id IN (
            SELECT team_members.team_id
            FROM team_members
            WHERE team_members.profile_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert test cases for their teams" ON public.test_cases
    FOR INSERT WITH CHECK (
        team_id IN (
            SELECT team_members.team_id
            FROM team_members
            WHERE team_members.profile_id = auth.uid()
        )
    );

CREATE POLICY "Users can update test cases from their teams" ON public.test_cases
    FOR UPDATE USING (
        team_id IN (
            SELECT team_members.team_id
            FROM team_members
            WHERE team_members.profile_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete test cases from their teams" ON public.test_cases
    FOR DELETE USING (
        team_id IN (
            SELECT team_members.team_id
            FROM team_members
            WHERE team_members.profile_id = auth.uid()
        )
    );

-- Navigation trees policies
CREATE POLICY "Users can view navigation trees from their teams" ON public.navigation_trees
    FOR SELECT USING (
        team_id IN (
            SELECT team_members.team_id
            FROM team_members
            WHERE team_members.profile_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert navigation trees for their teams" ON public.navigation_trees
    FOR INSERT WITH CHECK (
        team_id IN (
            SELECT team_members.team_id
            FROM team_members
            WHERE team_members.profile_id = auth.uid()
        )
    );

CREATE POLICY "Users can update navigation trees from their teams" ON public.navigation_trees
    FOR UPDATE USING (
        team_id IN (
            SELECT team_members.team_id
            FROM team_members
            WHERE team_members.profile_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete navigation trees from their teams" ON public.navigation_trees
    FOR DELETE USING (
        team_id IN (
            SELECT team_members.team_id
            FROM team_members
            WHERE team_members.profile_id = auth.uid()
        )
    );

-- Campaigns policies
CREATE POLICY "Users can view campaigns from their teams" ON public.campaigns
    FOR SELECT USING (
        team_id IN (
            SELECT team_members.team_id
            FROM team_members
            WHERE team_members.profile_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert campaigns for their teams" ON public.campaigns
    FOR INSERT WITH CHECK (
        team_id IN (
            SELECT team_members.team_id
            FROM team_members
            WHERE team_members.profile_id = auth.uid()
        )
    );

CREATE POLICY "Users can update campaigns from their teams" ON public.campaigns
    FOR UPDATE USING (
        team_id IN (
            SELECT team_members.team_id
            FROM team_members
            WHERE team_members.profile_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete campaigns from their teams" ON public.campaigns
    FOR DELETE USING (
        team_id IN (
            SELECT team_members.team_id
            FROM team_members
            WHERE team_members.profile_id = auth.uid()
        )
    );

-- Test results policies
CREATE POLICY "Users can view test results from their teams" ON public.test_results
    FOR SELECT USING (
        team_id IN (
            SELECT team_members.team_id
            FROM team_members
            WHERE team_members.profile_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert test results for their teams" ON public.test_results
    FOR INSERT WITH CHECK (
        team_id IN (
            SELECT team_members.team_id
            FROM team_members
            WHERE team_members.profile_id = auth.uid()
        )
    );

CREATE POLICY "Users can update test results from their teams" ON public.test_results
    FOR UPDATE USING (
        team_id IN (
            SELECT team_members.team_id
            FROM team_members
            WHERE team_members.profile_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete test results from their teams" ON public.test_results
    FOR DELETE USING (
        team_id IN (
            SELECT team_members.team_id
            FROM team_members
            WHERE team_members.profile_id = auth.uid()
        )
    );

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Profiles trigger
CREATE TRIGGER on_user_created
    AFTER INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user_team();

-- Updated at triggers
CREATE TRIGGER update_test_cases_updated_at
    BEFORE UPDATE ON public.test_cases
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_navigation_trees_updated_at
    BEFORE UPDATE ON public.navigation_trees
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON public.campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DEFAULT DATA
-- =====================================================

-- Insert default tenant
INSERT INTO public.tenants (id, name) 
VALUES ('f2e65010-506c-40bc-9d24-d26e5c04dad6', 'Default Tenant')
ON CONFLICT (id) DO NOTHING;

-- Insert default team for VirtualPyTest demo
INSERT INTO public.teams (id, name, description, tenant_id, created_by, is_default)
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    'VirtualPyTest Demo Team',
    'Default team for VirtualPyTest demonstration',
    'f2e65010-506c-40bc-9d24-d26e5c04dad6',
    '550e8400-e29b-41d4-a716-446655440001',
    true
)
ON CONFLICT (id) DO NOTHING;

-- Insert default profile for demo
INSERT INTO public.profiles (id, active_team, avatar_url)
VALUES (
    '550e8400-e29b-41d4-a716-446655440001',
    '550e8400-e29b-41d4-a716-446655440000',
    ''
)
ON CONFLICT (id) DO NOTHING;

-- Insert default team member
INSERT INTO public.team_members (team_id, profile_id, role)
VALUES (
    '550e8400-e29b-41d4-a716-446655440000',
    '550e8400-e29b-41d4-a716-446655440001',
    'admin'
)
ON CONFLICT (team_id, profile_id) DO NOTHING;

-- =====================================================
-- SCHEMA BACKUP COMPLETE
-- =====================================================
-- This backup includes:
-- ✅ All required extensions
-- ✅ Custom functions used by policies and triggers
-- ✅ Core tables (tenants, profiles, teams, team_members)
-- ✅ VirtualPyTest tables (test_cases, navigation_trees, campaigns, test_results)
-- ✅ Row Level Security enabled on all tables
-- ✅ Complete RLS policies for team-based access control
-- ✅ Triggers for automatic timestamp updates and user management
-- ✅ Default data for demo purposes
-- 
-- To restore this schema:
-- 1. Create a new Supabase project
-- 2. Run this SQL script in the SQL editor
-- 3. Configure your application with the new connection details
-- ===================================================== 