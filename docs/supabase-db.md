# Supabase Database Documentation

## Database Schema Overview

This document outlines the database schema for the repository management system. The database is structured to support Git provider connections, repository management, and user-specific settings.

## Tables

### 1. git_providers

Stores connections to Git hosting services like GitHub, GitLab, and Gitea.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| profile_id | uuid | Foreign key to profiles.id |
| type | text | Provider type (github, gitlab, gitea) |
| name | text | Provider name |
| display_name | text | User-friendly display name |
| server_url | text | Custom server URL (for GitLab/Gitea) |
| access_token | text | OAuth access token |
| refresh_token | text | OAuth refresh token |
| expires_at | timestamp | Token expiration time |
| is_configured | bool | Whether the provider is fully configured |
| last_synced | timestamp | Last synchronization time |
| created_at | timestamp | Creation timestamp |
| updated_at | timestamp | Last update timestamp |

### 2. repositories

Stores repository metadata fetched from Git providers.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| provider_id | uuid | Foreign key to git_providers.id |
| provider_type | text | Repository provider type |
| name | text | Repository name |
| description | text | Repository description |
| owner | text | Repository owner/organization |
| url | text | Repository URL |
| is_private | bool | Whether the repository is private |
| default_branch | text | Default branch name |
| language | text | Primary repository language |
| sync_status | text | Synchronization status |
| last_synced_at | timestamp | Last sync timestamp |
| error | text | Error message if sync failed |
| created_at | timestamp | Creation timestamp |
| updated_at | timestamp | Last update timestamp |

### 3. profile_repository_pins

Tracks which repositories are pinned by users.

| Column | Type | Description |
|--------|------|-------------|
| profile_id | uuid | Foreign key to profiles.id |
| repository_id | uuid | Foreign key to repositories.id |
| created_at | timestamp | Pin creation timestamp |

### 4. profiles

Extends the auth.users table with application-specific data.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key (matches auth.users.id) |
| avatar_url | text | User's avatar URL |
| tenant_id | text | Foreign key to tenants.id |
| role | text | User role in the system |
| tenant_name | text | Cached tenant name |
| created_at | timestamp | Creation timestamp |
| updated_at | timestamp | Last update timestamp |

### 5. tenants

Stores multi-tenant information.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Tenant name |
| domain | text | Tenant domain |
| created_at | timestamp | Creation timestamp |
| updated_at | timestamp | Last update timestamp |

### 6. hosts

Stores server/host connection information.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Host name |
| description | text | Host description |
| type | text | Host type (ssh, docker, etc.) |
| ip | text | Host IP address |
| port | int4 | Connection port |
| user | text | Username for authentication |
| password | text | Password for authentication |
| status | text | Connection status |
| is_windows | bool | Whether host is Windows-based |
| created_at | timestamp | Creation timestamp |
| updated_at | timestamp | Last update timestamp |

## Relationships

1. `git_providers.profile_id` → `profiles.id`
2. `repositories.provider_id` → `git_providers.id`
3. `profile_repository_pins.profile_id` → `profiles.id`
4. `profile_repository_pins.repository_id` → `repositories.id`
5. `profiles.tenant_id` → `tenants.id`

## Row-Level Security (RLS)

Each table is protected with row-level security policies to ensure users can only access their own data:

- Users can only see git providers connected to their profile
- Users can only see repositories from their connected git providers
- Users can only modify their own repository pins

## Indexes

Performance indexes exist on foreign key columns to optimize query performance:

- `idx_git_providers_profile_id`
- `idx_repositories_provider_id`
- `idx_profile_repository_pins_profile_id`

This schema supports the repository management system while maintaining data segregation and security.