# Supabase Database Documentation

## Database Schema Overview

This document outlines the database schema for the system. The database is structured to support Git provider connections, repository management, host management, deployments, and CI/CD integrations.

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

### 4. hosts

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

### 5. deployments

Stores deployment information.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Deployment name |
| description | text | Deployment description |
| repository_id | uuid | Foreign key to repositories.id |
| status | text | Deployment status (pending, in_progress, success, failed, etc.) |
| schedule | text | Schedule type (now, later) |
| scheduled_time | timestamp | When deployment is scheduled to run |
| script_ids | uuid[] | Array of script IDs to run |
| host_ids | uuid[] | Array of target host IDs |
| created_by | uuid | Foreign key to profiles.id |
| created_at | timestamp | Creation timestamp |
| started_at | timestamp | When deployment started |
| completed_at | timestamp | When deployment completed |
| updated_at | timestamp | Last update timestamp |

### 6. deployment_logs

Stores logs for deployment executions.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| deployment_id | uuid | Foreign key to deployments.id |
| level | text | Log level (INFO, WARNING, ERROR, etc.) |
| message | text | Log message content |
| timestamp | timestamp | When log was created |

### 7. deployment_scripts

Tracks script execution within deployments.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| deployment_id | uuid | Foreign key to deployments.id |
| script_id | uuid | Script identifier |
| name | text | Script name |
| path | text | Script path |
| status | text | Script execution status |
| started_at | timestamp | When script started |
| completed_at | timestamp | When script completed |
| output | text | Script output |
| exit_code | integer | Exit code from script |
| created_at | timestamp | Creation timestamp |
| updated_at | timestamp | Last update timestamp |

### 8. cicd_providers

Stores CI/CD provider connections.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| type | text | Provider type (jenkins, circle, github_actions, etc.) |
| name | text | Provider name |
| url | text | Provider URL |
| config | jsonb | Provider-specific configuration |
| profile_id | uuid | Foreign key to profiles.id |
| created_at | timestamp | Creation timestamp |
| updated_at | timestamp | Last update timestamp |

### 9. cicd_jobs

Stores available jobs from CI/CD providers.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| provider_id | uuid | Foreign key to cicd_providers.id |
| external_id | text | ID in the external CI/CD system |
| name | text | Job name |
| path | text | Job path (for hierarchical systems) |
| description | text | Job description |
| parameters | jsonb | Available job parameters |
| created_at | timestamp | Creation timestamp |
| updated_at | timestamp | Last update timestamp |

### 10. deployment_cicd_mappings

Links deployments to CI/CD jobs.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| deployment_id | uuid | Foreign key to deployments.id |
| cicd_job_id | uuid | Foreign key to cicd_jobs.id |
| parameters | jsonb | Parameters passed to the job |
| build_number | text | CI/CD build/run number |
| build_url | text | URL to the CI/CD build |
| created_at | timestamp | Creation timestamp |
| updated_at | timestamp | Last update timestamp |

### 11. profiles

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

### 12. tenants

Stores multi-tenant information.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| name | text | Tenant name |
| domain | text | Tenant domain |
| created_at | timestamp | Creation timestamp |
| updated_at | timestamp | Last update timestamp |

## Relationships

1. `git_providers.profile_id` → `profiles.id`
2. `repositories.provider_id` → `git_providers.id`
3. `profile_repository_pins.profile_id` → `profiles.id`
4. `profile_repository_pins.repository_id` → `repositories.id`
5. `profiles.tenant_id` → `tenants.id`
6. `deployments.repository_id` → `repositories.id`
7. `deployments.created_by` → `profiles.id` 
8. `deployment_logs.deployment_id` → `deployments.id`
9. `deployment_scripts.deployment_id` → `deployments.id`
10. `cicd_providers.profile_id` → `profiles.id`
11. `cicd_jobs.provider_id` → `cicd_providers.id`
12. `deployment_cicd_mappings.deployment_id` → `deployments.id`
13. `deployment_cicd_mappings.cicd_job_id` → `cicd_jobs.id`

## Indexes

Various indexes are created on foreign key columns to optimize query performance.

This schema supports the full application functionality while maintaining data integrity and relationships between different components of the system.