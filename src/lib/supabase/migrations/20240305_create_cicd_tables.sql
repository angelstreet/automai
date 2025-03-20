-- Create table for CI/CD providers
CREATE TABLE IF NOT EXISTS "cicd_providers" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" VARCHAR(255) NOT NULL,
  "type" VARCHAR(50) NOT NULL,
  "url" VARCHAR(255) NOT NULL,
  "auth_type" VARCHAR(50) NOT NULL,
  "credentials" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "status" VARCHAR(50) NOT NULL DEFAULT 'configured',
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for CI/CD providers
ALTER TABLE "cicd_providers" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cicd_providers_tenant_isolation_select" 
  ON "cicd_providers" 
  FOR SELECT 
  USING (auth.uid() IN (
    SELECT "user_id" FROM "tenant_users" 
    WHERE "tenant_id" = "cicd_providers"."tenant_id"
  ));

CREATE POLICY "cicd_providers_tenant_isolation_insert" 
  ON "cicd_providers" 
  FOR INSERT 
  WITH CHECK (auth.uid() IN (
    SELECT "user_id" FROM "tenant_users" 
    WHERE "tenant_id" = "cicd_providers"."tenant_id"
  ));

CREATE POLICY "cicd_providers_tenant_isolation_update" 
  ON "cicd_providers" 
  FOR UPDATE 
  USING (auth.uid() IN (
    SELECT "user_id" FROM "tenant_users" 
    WHERE "tenant_id" = "cicd_providers"."tenant_id"
  ));

CREATE POLICY "cicd_providers_tenant_isolation_delete" 
  ON "cicd_providers" 
  FOR DELETE 
  USING (auth.uid() IN (
    SELECT "user_id" FROM "tenant_users" 
    WHERE "tenant_id" = "cicd_providers"."tenant_id"
  ));

-- Create indexes for CI/CD providers
CREATE INDEX IF NOT EXISTS "idx_cicd_providers_tenant_id" ON "cicd_providers" ("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_cicd_providers_type" ON "cicd_providers" ("type");

-- Create table for deployment CI/CD mappings
CREATE TABLE IF NOT EXISTS "deployment_cicd_mappings" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "deployment_id" UUID NOT NULL REFERENCES "deployments"("id") ON DELETE CASCADE,
  "provider_id" UUID NOT NULL REFERENCES "cicd_providers"("id") ON DELETE CASCADE,
  "job_name" VARCHAR(255) NOT NULL,
  "job_parameters" JSONB DEFAULT '{}'::jsonb,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add RLS policies for deployment CI/CD mappings
ALTER TABLE "deployment_cicd_mappings" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deployment_cicd_mappings_select" 
  ON "deployment_cicd_mappings" 
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM "deployments" 
      WHERE "deployments"."id" = "deployment_cicd_mappings"."deployment_id"
      AND EXISTS (
        SELECT 1 FROM "tenant_users" 
        WHERE "tenant_users"."tenant_id" = "deployments"."tenant_id"
        AND "tenant_users"."user_id" = auth.uid()
      )
    )
  );

CREATE POLICY "deployment_cicd_mappings_insert" 
  ON "deployment_cicd_mappings" 
  FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "deployments" 
      WHERE "deployments"."id" = "deployment_cicd_mappings"."deployment_id"
      AND EXISTS (
        SELECT 1 FROM "tenant_users" 
        WHERE "tenant_users"."tenant_id" = "deployments"."tenant_id"
        AND "tenant_users"."user_id" = auth.uid()
      )
    )
  );

CREATE POLICY "deployment_cicd_mappings_update" 
  ON "deployment_cicd_mappings" 
  FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM "deployments" 
      WHERE "deployments"."id" = "deployment_cicd_mappings"."deployment_id"
      AND EXISTS (
        SELECT 1 FROM "tenant_users" 
        WHERE "tenant_users"."tenant_id" = "deployments"."tenant_id"
        AND "tenant_users"."user_id" = auth.uid()
      )
    )
  );

CREATE POLICY "deployment_cicd_mappings_delete" 
  ON "deployment_cicd_mappings" 
  FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM "deployments" 
      WHERE "deployments"."id" = "deployment_cicd_mappings"."deployment_id"
      AND EXISTS (
        SELECT 1 FROM "tenant_users" 
        WHERE "tenant_users"."tenant_id" = "deployments"."tenant_id"
        AND "tenant_users"."user_id" = auth.uid()
      )
    )
  );

-- Create indexes for deployment CI/CD mappings
CREATE INDEX IF NOT EXISTS "idx_deployment_cicd_mappings_deployment_id" ON "deployment_cicd_mappings" ("deployment_id");
CREATE INDEX IF NOT EXISTS "idx_deployment_cicd_mappings_provider_id" ON "deployment_cicd_mappings" ("provider_id"); 