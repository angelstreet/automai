# Repository Management Functionality

This document provides a technical overview of the repository management feature in AutomAI, including the database organization, architecture, API endpoints, and UI integrations.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Database Structure](#database-structure)
4. [Backend Implementation](#backend-implementation)
   - [Database Layer](#database-layer)
   - [Server Actions](#server-actions)
   - [API Endpoints](#api-endpoints)
5. [Frontend Implementation](#frontend-implementation)
   - [Pages and Components](#pages-and-components)
   - [User Flows](#user-flows)
6. [Current Status](#current-status)
7. [Remaining Work](#remaining-work)

## Overview

The Repository Management feature allows users to:

- Connect to various Git providers (GitHub, GitLab, Gitea)
- Browse available repositories
- Add repositories via direct URLs (quick clone)
- View, filter, and search repositories
- Pin important repositories for quick access
- Sync repositories with their source

The implementation follows the project's three-layer architecture (DB Layer → Server Actions → Client Hooks/Components) and organizes code by feature.

## Architecture

### Three-Layer Architecture

1. **Database Layer (Core)**
   - `/src/lib/supabase/db-repositories/` - Contains all repository-related database operations
   - Handles tenant isolation and provides consistent response format

2. **Server Actions (Bridge)**
   - `/src/app/[locale]/[tenant]/repositories/actions.ts` - Contains server-only logic
   - Handles authentication, authorization, validation, and business logic

3. **API Routes**
   - `/src/app/api/repositories/...` - Provides HTTP endpoints for frontend
   - Maps HTTP requests to server actions

4. **Client Components (Interface)**
   - `/src/app/[locale]/[tenant]/repositories/...` - UI components
   - Communicates with backend via API endpoints

### Data Flow

```
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│               │       │               │       │               │
│  UI Component │───┬──▶│ API Endpoint  │──────▶│ Server Action │
│               │   │   │               │       │               │
└───────────────┘   │   └───────────────┘       └───────┬───────┘
                    │                                   │
                    │   ┌───────────────┐       ┌───────▼───────┐
                    │   │               │       │               │
                    └──▶│ Client Hook   │──────▶│  DB Function  │
                        │               │       │               │
                        └───────────────┘       └───────────────┘
```

## Database Structure

### Tables

1. **git_providers**
   - Stores connections to Git hosting services
   - Key fields: `id`, `profile_id`, `type`, `name`, `access_token`, `server_url`

2. **repositories**
   - Stores repository metadata
   - Key fields: `id`, `provider_id`, `name`, `full_name`, `url`, `default_branch`

3. **profile_repository_pins**
   - Tracks pinned repositories
   - Key fields: `profile_id`, `repository_id`

### Relationships

- `git_providers.profile_id → profiles.id`
- `repositories.provider_id → git_providers.id`
- `profile_repository_pins.profile_id → profiles.id`
- `profile_repository_pins.repository_id → repositories.id`

## Backend Implementation

### Database Layer

The repository DB layer is organized into three main files:

1. **git-provider.ts**
   - Functions for working with Git providers
   - Handles CRUD operations for git_providers table

   ```typescript
   // Key functions
   async getGitProviders(profileId: string): Promise<DbResponse<GitProvider[]>>
   async getGitProvider(id: string, profileId: string): Promise<DbResponse<GitProvider>>
   async createGitProvider(data: GitProviderCreateData): Promise<DbResponse<GitProvider>>
   async updateGitProvider(id: string, data: Partial<GitProviderCreateData>, profileId: string): Promise<DbResponse<GitProvider>>
   async deleteGitProvider(id: string, profileId: string): Promise<DbResponse<null>>
   ```

2. **repository.ts**
   - Functions for working with repositories
   - Handles CRUD operations for repositories table

   ```typescript
   // Key functions
   async getRepositories(profileId: string, providerId?: string): Promise<DbResponse<Repository[]>>
   async getRepository(id: string, profileId: string): Promise<DbResponse<Repository>>
   async createRepository(data: RepositoryCreateData, profileId: string): Promise<DbResponse<Repository>>
   async updateRepository(id: string, data: Partial<RepositoryCreateData>, profileId: string): Promise<DbResponse<Repository>>
   async deleteRepository(id: string, profileId: string): Promise<DbResponse<null>>
   async updateSyncTimestamp(id: string, profileId: string): Promise<DbResponse<Repository>>
   async createRepositoryFromUrl(data: QuickCloneRepositoryData, profileId: string): Promise<DbResponse<Repository>>
   ```

3. **pin-repository.ts**
   - Functions for managing pinned repositories
   - Handles operations for profile_repository_pins table

   ```typescript
   // Key functions
   async getPinnedRepositories(profileId: string): Promise<DbResponse<RepositoryPin[]>>
   async pinRepository(repositoryId: string, profileId: string): Promise<DbResponse<RepositoryPin>>
   async unpinRepository(repositoryId: string, profileId: string): Promise<DbResponse<null>>
   ```

4. **utils.ts**
   - Helper functions for repository operations
   - Includes provider detection from URLs

   ```typescript
   // Key functions
   function detectProviderFromUrl(url: string): GitProviderType | null
   function extractRepoNameFromUrl(url: string): string
   function extractOwnerFromUrl(url: string): string
   ```

### Server Actions

The server actions located in `/src/app/[locale]/[tenant]/repositories/actions.ts` provide the business logic layer:

```typescript
// Repository actions
export async function getRepositories(filter?: RepositoryFilter): Promise<{ success: boolean; error?: string; data?: Repository[] }>
export async function getRepository(id: string): Promise<{ success: boolean; error?: string; data?: Repository }>
export async function createRepository(data: Partial<Repository>): Promise<{ success: boolean; error?: string; data?: Repository }>
export async function updateRepository(id: string, updates: Partial<Repository>): Promise<{ success: boolean; error?: string; data?: Repository }>
export async function deleteRepository(id: string): Promise<{ success: boolean; error?: string }>
export async function syncRepository(id: string): Promise<{ success: boolean; error?: string; data?: Repository }>
export async function createRepositoryFromUrl(url: string, isPrivate?: boolean, description?: string): Promise<{ success: boolean; error?: string; data?: Repository }>

// Git Provider actions
export async function getGitProviders(): Promise<{ success: boolean; error?: string; data?: any[] }>
export async function getGitProvider(id: string): Promise<{ success: boolean; error?: string; data?: any }>
export async function deleteGitProvider(id: string): Promise<{ success: boolean; error?: string }>
export async function addGitProvider(provider: Omit<GitProvider, 'id'>): Promise<GitProvider>
export async function updateGitProvider(id: string, updates: Partial<GitProvider>): Promise<GitProvider>
export async function refreshGitProvider(id: string): Promise<GitProvider>
export async function testGitProviderConnection(data: TestConnectionInput): Promise<{ success: boolean; error?: string; message?: string }>
export async function createGitProvider(data: GitProviderCreateInput): Promise<{ success: boolean; error?: string; data?: any; authUrl?: string }>
export async function handleOAuthCallback(code: string, state: string): Promise<{ success: boolean; error?: string; redirectUrl?: string }>
```

### API Endpoints

The API endpoints provide HTTP access to the server actions:

1. **Repository Endpoints**
   - `GET /api/repositories` - List repositories (with optional filtering)
   - `POST /api/repositories` - Create a repository (supports direct URL quick cloning)
   - `GET /api/repositories/[id]` - Get repository details
   - `PATCH /api/repositories/[id]` - Update repository
   - `DELETE /api/repositories/[id]` - Delete repository
   - `POST /api/repositories/[id]/sync` - Sync repository with git provider
   - `POST /api/repositories/refresh-all` - Refresh all repositories

2. **Git Provider Endpoints**
   - `GET /api/git-providers` - List git providers
   - `POST /api/git-providers` - Create a git provider
   - `GET /api/git-providers/[id]` - Get provider details
   - `DELETE /api/git-providers/[id]` - Delete provider
   - `POST /api/git-providers/test-connection` - Test provider connection
   - `GET /api/git-providers/callback` - OAuth callback handler

## Frontend Implementation

### Pages and Components

The main UI components are:

1. **Repository Page** (`/src/app/[locale]/[tenant]/repositories/page.tsx`)
   - Main repositories browsing interface
   - Features filtering, searching, and categorization
   - Triggers sync and refresh operations

2. **Repository Cards** (`EnhancedRepositoryCard.tsx`)
   - Displays repository information
   - Provides quick access to actions (pin, sync)

3. **Connect Repository Dialog** (`EnhancedConnectRepositoryDialog.tsx`)
   - Multi-tab interface for adding repositories
   - Supports OAuth, access token, and direct URL clone

4. **Repository Explorer** (`RepositoryExplorer.tsx`)
   - File browser for repository contents
   - Displays code and directory structures

### User Flows

1. **Browsing Repositories**
   - User visits `/[locale]/[tenant]/repositories`
   - Backend fetches repositories associated with the user
   - UI presents a filterable, searchable grid of repository cards

2. **Adding a Repository by URL (Quick Clone)**
   - User clicks "+ Add Provider" and selects "Public Repository" tab
   - User enters repository URL and clicks "Clone and Explore"
   - Backend:
     1. Detects the provider type from URL pattern
     2. Creates default provider if needed
     3. Extracts repository name and owner
     4. Creates repository record
   - User is redirected back to repository list with the new repository visible

3. **Syncing a Repository**
   - User clicks sync icon on a repository card
   - Backend updates timestamp and syncs with provider if possible
   - UI updates to show new sync status and timestamp

## Current Status

Completed functionality:

1. **Backend**
   - ✅ Three-layer architecture implementation (DB → Actions → API)
   - ✅ Feature-based DB module organization
   - ✅ Repository DB functions with tenant isolation
   - ✅ Git provider connectivity operations
   - ✅ URL-based repository auto-detection
   - ✅ API endpoints for core operations
   - ✅ Server actions for business logic

2. **Frontend**
   - ✅ Repository browsing UI with filtering and search
   - ✅ Quick clone UI integrated with backend
   - ✅ Sync and refresh functionality
   - ✅ Responsive repository cards

## Remaining Work

1. **Backend**
   - 🔲 Actual Git provider API integrations (GitHub, GitLab, Gitea)
   - 🔲 Repository content retrieval from provider APIs
   - 🔲 OAuth flow implementation for GitHub and GitLab
   - 🔲 Proper error handling for API rate limits
   - 🔲 Scheduled syncing for keeping repositories up to date
   - 🔲 Caching of repository data for performance

2. **Frontend**
   - 🔲 Complete OAuth integration with provider selection UI
   - 🔲 Token-based provider authentication UI
   - 🔲 Repository settings management
   - 🔲 Advanced filtering (by language, update time, etc.)
   - 🔲 Pagination for large repository lists
   - 🔲 Rich repository content explorer
   - 🔲 Repository activity timeline

3. **Testing**
   - 🔲 Unit tests for repository DB layer
   - 🔲 Integration tests for server actions
   - 🔲 End-to-end tests for full user flows
   - 🔲 Mock server for Git provider APIs

## Conclusion

The repository management functionality is partially implemented with a solid architectural foundation. The core three-layer architecture is in place, and the basic UI integration is working. The next stages involve completing the Git provider integrations and enhancing the UI with rich repository exploration features.

This feature follows the project's architectural and organizational guidelines, with proper separation of concerns, feature-based organization, and standardized response formats.