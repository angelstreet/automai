-- Migration to convert all column names from camelCase to snake_case
-- This script drops and recreates tables with snake_case column names

-- Disable triggers temporarily
SET session_replication_role = 'replica';

-- Drop existing tables (in reverse order of dependencies)
DROP TABLE IF EXISTS "verificationtokens";
DROP TABLE IF EXISTS "accounts";
DROP TABLE IF EXISTS "connections";
DROP TABLE IF EXISTS "repositories";
DROP TABLE IF EXISTS "git_providers";
DROP TABLE IF EXISTS "users";
DROP TABLE IF EXISTS "tenants";
DROP TABLE IF EXISTS "hosts";

-- Create tables with snake_case column names

-- Tenants table
CREATE TABLE IF NOT EXISTS "tenants" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" TEXT NOT NULL,
  "domain" TEXT,
  "plan" TEXT NOT NULL DEFAULT 'free',
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" TEXT,
  "email" TEXT UNIQUE,
  "email_verified" TIMESTAMP WITH TIME ZONE,
  "password" TEXT,
  "image" TEXT,
  "user_role" TEXT NOT NULL DEFAULT 'user',
  "tenant_id" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "provider" TEXT,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL
);

-- Hosts table (combined with connections)
CREATE TABLE IF NOT EXISTS "hosts" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" TEXT NOT NULL,
  "ip" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "description" TEXT,
  "username" TEXT,
  "password" TEXT,
  "private_key" TEXT,
  "port" INTEGER DEFAULT 22,
  "is_windows" BOOLEAN DEFAULT false,
  "status" TEXT DEFAULT 'active',
  "user_id" TEXT NOT NULL,
  "tenant_id" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL
);

-- Git providers table
CREATE TABLE IF NOT EXISTS "git_providers" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "server_url" TEXT,
  "access_token" TEXT,
  "refresh_token" TEXT,
  "expires_at" TIMESTAMP WITH TIME ZONE,
  "display_name" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

-- Repositories table
CREATE TABLE IF NOT EXISTS "repositories" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" TEXT NOT NULL,
  "provider_id" TEXT NOT NULL,
  "description" TEXT,
  "url" TEXT,
  "default_branch" TEXT,
  "sync_status" TEXT DEFAULT 'pending',
  "last_synced_at" TIMESTAMP WITH TIME ZONE,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("provider_id") REFERENCES "git_providers"("id") ON DELETE CASCADE
);

-- Re-enable triggers
SET session_replication_role = 'origin';

-- Add RLS policies
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "hosts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "git_providers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "repositories" ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own data" ON "users"
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" ON "users"
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can view their tenant" ON "tenants"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.tenant_id = tenants.id
      AND users.id = auth.uid()
    )
  );

CREATE POLICY "Users can view their hosts" ON "hosts"
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users
      WHERE users.tenant_id = hosts.tenant_id
      AND users.id = auth.uid()
    )
  );

CREATE POLICY "Service role can do all on users"
  ON "users" FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do all on tenants"
  ON "tenants" FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do all on hosts"
  ON "hosts" FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do all on git_providers"
  ON "git_providers" FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do all on repositories"
  ON "repositories" FOR ALL USING (auth.role() = 'service_role');

-- Create indexes
CREATE INDEX IF NOT EXISTS "users_tenant_id_idx" ON "users" ("tenant_id");
CREATE INDEX IF NOT EXISTS "hosts_user_id_idx" ON "hosts" ("user_id");
CREATE INDEX IF NOT EXISTS "hosts_tenant_id_idx" ON "hosts" ("tenant_id");
CREATE INDEX IF NOT EXISTS "repositories_provider_id_idx" ON "repositories" ("provider_id"); 