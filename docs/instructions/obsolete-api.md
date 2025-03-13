Repository API Implementation Guide

Database Schema Overview

The system consists of these key tables:

- profiles: Extends auth.users with application-specific data

- git_providers: Stores connections to Git hosting services 

- repositories: Stores repository metadata fetched from Git providers

- profile_repository_pins: Tracks which repositories are pinned by users



Relationships:



git_providers.profile_id → profiles.id

repositories.provider_id → git_providers.id

profile_repository_pins.profile_id → profiles.id

profile_repository_pins.repository_id → repositories.id



Three-Layer Architecture

Implement all API endpoints following the three-layer architecture:

1. Server DB Layer



Location: src/lib/supabase/db.ts

Purpose: Direct interaction with Supabase database

Functions should be generic and reusable

Always returns format: {success: boolean, data?: T, error?: string}

Include tenant isolation where appropriate



2. Server Actions Layer



Location: src/app/[locale]/[tenant]/repositories/actions.ts

Purpose: Business logic and orchestration

Calls Server DB Layer functions

Includes validation, error handling, and authorization

Provider-specific adaptations happen here



3. Client Hooks Layer



Location: src/app/[locale]/[tenant]/repositories/hooks.ts

Purpose: React hooks for frontend components

Calls Server Actions

Handles loading/error states

Manages client-side state and caching



API Endpoints to Implement

Git Provider APIs





List Providers



Purpose: List all git providers for current user

Endpoint: GET /api/git-providers

DB Layer: Query git_providers for current user







Create Provider



Purpose: Create a new git provider connection

Endpoint: POST /api/git-providers

DB Layer: Insert into git_providers table

Include OAuth flow support (GitHub, GitLab)







Get Provider Details



Purpose: Get details for a specific provider

Endpoint: GET /api/git-providers/[id]

DB Layer: Query git_providers by ID







Delete Provider



Purpose: Delete a provider and associated repositories

Endpoint: DELETE /api/git-providers/[id]

DB Layer: Delete from git_providers table and cascade to repositories







Test Provider Connection



Purpose: Test connection to a provider

Endpoint: POST /api/git-providers/test-connection

Use provider adapter to test API connectivity







Repository APIs





List Repositories



Purpose: List all repositories for current user

Endpoint: GET /api/repositories

Parameters: providerId (optional filter)

DB Layer: Query repositories table, join with git_providers







Get Repository Details



Purpose: Get details for a specific repository

Endpoint: GET /api/repositories/[id]

DB Layer: Query repositories by ID







Create/Register Repository



Purpose: Register a repository from a provider

Endpoint: POST /api/repositories

DB Layer: Insert into repositories table







Update Repository



Purpose: Update repository metadata

Endpoint: PATCH /api/repositories/[id]

DB Layer: Update repositories table







Delete Repository



Purpose: Delete a repository registration

Endpoint: DELETE /api/repositories/[id]

DB Layer: Delete from repositories table







Sync Repository



Purpose: Sync repository data from provider

Endpoint: POST /api/repositories/sync/[id]

Use provider adapter to fetch latest data

Update repository in database







Repository Content APIs





Get Repository Contents



Purpose: Get files/folders at path

Endpoint: GET /api/repositories/[id]/contents/[path]

Use provider adapter to fetch content







Get File Content



Purpose: Get specific file content

Endpoint: GET /api/repositories/[id]/file/[path]

Use provider adapter to fetch file content







Pin Management APIs





Pin Repository



Purpose: Pin a repository for quick access

Endpoint: POST /api/repositories/pins

Body: { repositoryId: string }

DB Layer: Insert into profile_repository_pins table







Unpin Repository



Purpose: Remove repository pin

Endpoint: DELETE /api/repositories/pins/[id]

DB Layer: Delete from profile_repository_pins table







Provider Adapter Implementation

Create a services layer for Git provider-specific code:

src/lib/services/git-providers/

  ├── interfaces.ts  - Common interface all adapters implement

  ├── github.ts      - GitHub implementation

  ├── gitlab.ts      - GitLab implementation

  ├── gitea.ts       - Gitea implementation

  └── factory.ts     - Factory to get appropriate adapter



Each adapter should implement:





Authentication methods



OAuth flow handling

Token validation

Token refresh







Repository methods



List repositories

Get repository details

Sync repository data







Content methods



List directory contents

Get file content

Get repository structure







Implementation Steps





Complete Server DB Layer



Add repository-related functions to src/lib/supabase/db.ts

Include proper type safety and error handling







Implement Provider Adapters



Create the adapter interfaces and implementations

Handle provider-specific API details







Create Server Actions



Implement repository-related actions in actions.ts

Orchestrate between DB and adapters







Build API Routes



Create API route handlers in src/app/api/

Connect routes to server actions







Develop Client Hooks



Create custom hooks for repository features

Include proper caching and state management







Important Guidelines





Always isolate tenant data



All queries should filter by the current user's profile or tenant







Handle provider-specific details in adapters



Keep provider differences isolated from the main application







Implement proper caching



Cache repository data in the database

Use SWR for client-side caching







Follow error handling patterns



Consistent error format across all layers

Proper user-facing error messages







Secure API endpoints



Validate all inputs

Check user permissions for each request







Rate-limit provider API calls



Implement throttling for external API calls

Handle rate limit errors gracefully