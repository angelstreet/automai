-- This file needs to be run in Supabase SQL Editor to create the database tables

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create the tables

-- Host table
CREATE TABLE IF NOT EXISTS "hosts" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "type" TEXT NOT NULL,
  "ip" TEXT NOT NULL,
  "port" INTEGER,
  "user" TEXT,
  "password" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "is_windows" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tenant table
CREATE TABLE IF NOT EXISTS "tenants" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" TEXT NOT NULL,
  "domain" TEXT UNIQUE,
  "plan" TEXT NOT NULL DEFAULT 'admin',
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- User table
CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" TEXT,
  "email" TEXT UNIQUE,
  "emailVerified" TIMESTAMP WITH TIME ZONE,
  "password" TEXT,
  "image" TEXT,
  "role" TEXT NOT NULL DEFAULT 'user',
  "tenantId" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "provider" TEXT,
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE SET NULL
);

-- Account table
CREATE TABLE IF NOT EXISTS "accounts" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "refresh_token" TEXT,
  "access_token" TEXT,
  "expires_at" INTEGER,
  "token_type" TEXT,
  "scope" TEXT,
  "id_token" TEXT,
  "session_state" TEXT,
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE,
  UNIQUE ("provider", "providerAccountId")
);

-- VerificationToken table
CREATE TABLE IF NOT EXISTS "verificationtokens" (
  "identifier" TEXT NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "expires" TIMESTAMP WITH TIME ZONE NOT NULL,
  UNIQUE ("identifier", "token")
);

-- Connection table
CREATE TABLE IF NOT EXISTS "connections" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" TEXT NOT NULL,
  "host" TEXT NOT NULL,
  "port" INTEGER NOT NULL DEFAULT 22,
  "username" TEXT NOT NULL,
  "password" TEXT,
  "privateKey" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT NOT NULL,
  "tenantId" TEXT,
  FOREIGN KEY ("userId") REFERENCES "users"("id"),
  FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
);

-- GitProvider table
CREATE TABLE IF NOT EXISTS "git_providers" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" TEXT NOT NULL,
  "displayName" TEXT,
  "type" TEXT NOT NULL,
  "serverUrl" TEXT,
  "accessToken" TEXT,
  "refreshToken" TEXT,
  "expiresAt" TIMESTAMP WITH TIME ZONE,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Repository table
CREATE TABLE IF NOT EXISTS "repositories" (
  "id" TEXT PRIMARY KEY DEFAULT uuid_generate_v4(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "url" TEXT,
  "defaultBranch" TEXT,
  "providerId" TEXT NOT NULL,
  "syncStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "lastSyncedAt" TIMESTAMP WITH TIME ZONE,
  "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("providerId") REFERENCES "git_providers"("id") ON DELETE CASCADE
);

-- Triggers for updatedAt
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables
CREATE TRIGGER update_hosts_timestamp
BEFORE UPDATE ON "hosts"
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_tenants_timestamp
BEFORE UPDATE ON "tenants"
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_users_timestamp
BEFORE UPDATE ON "users"
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_connections_timestamp
BEFORE UPDATE ON "connections"
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_git_providers_timestamp
BEFORE UPDATE ON "git_providers"
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_repositories_timestamp
BEFORE UPDATE ON "repositories"
FOR EACH ROW
EXECUTE FUNCTION update_timestamp();

-- Enable Row Level Security
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "hosts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "connections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "git_providers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "repositories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "verificationtokens" ENABLE ROW LEVEL SECURITY;

-- Create basic policies to allow service role access
CREATE POLICY "Service role can do all on users"
ON "users"
USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do all on tenants"
ON "tenants"
USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do all on hosts"
ON "hosts"
USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do all on connections"
ON "connections"
USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do all on git_providers"
ON "git_providers"
USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do all on repositories"
ON "repositories"
USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do all on accounts"
ON "accounts"
USING (auth.role() = 'service_role');

CREATE POLICY "Service role can do all on verificationtokens"
ON "verificationtokens"
USING (auth.role() = 'service_role');