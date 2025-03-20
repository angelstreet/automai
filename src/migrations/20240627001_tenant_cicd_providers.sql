-- Migration for tenant-level CI/CD providers
-- Creates a new table for storing tenant-level CI/CD provider configurations

-- Create the tenant_cicd_providers table
CREATE TABLE IF NOT EXISTS tenant_cicd_providers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- jenkins, github, gitlab, azure_devops, etc.
    url TEXT NOT NULL,
    config JSONB DEFAULT '{}'::jsonb, -- Contains auth_type and credentials
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id)
);

-- Add indexes
CREATE INDEX idx_tenant_cicd_providers_tenant_id ON tenant_cicd_providers(tenant_id);
CREATE INDEX idx_tenant_cicd_providers_type ON tenant_cicd_providers(type);

-- Add RLS policies
ALTER TABLE tenant_cicd_providers ENABLE ROW LEVEL SECURITY;

-- Policy: Tenants can see their own providers
CREATE POLICY tenant_select_cicd_providers
    ON tenant_cicd_providers
    FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants 
            WHERE user_id = auth.uid()
        )
    );

-- Policy: Tenants can insert their own providers
CREATE POLICY tenant_insert_cicd_providers
    ON tenant_cicd_providers
    FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants 
            WHERE user_id = auth.uid() 
            AND (role = 'owner' OR role = 'admin')
        )
    );

-- Policy: Tenants can update their own providers
CREATE POLICY tenant_update_cicd_providers
    ON tenant_cicd_providers
    FOR UPDATE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants 
            WHERE user_id = auth.uid() 
            AND (role = 'owner' OR role = 'admin')
        )
    );

-- Policy: Tenants can delete their own providers
CREATE POLICY tenant_delete_cicd_providers
    ON tenant_cicd_providers
    FOR DELETE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM user_tenants 
            WHERE user_id = auth.uid() 
            AND (role = 'owner' OR role = 'admin')
        )
    );

-- Add a foreign key to the deployments table to reference the CI/CD provider
ALTER TABLE deployments
    ADD COLUMN IF NOT EXISTS cicd_provider_id UUID REFERENCES tenant_cicd_providers(id); 