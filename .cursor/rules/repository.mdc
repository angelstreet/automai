# Repository Integration Guidelines

## Overview
This document outlines the implementation plan for the Repositories feature that simulates a Gitea interface for integrating with different Git providers (GitHub, GitLab, Gitea).

## Architecture Plan

### 1. File Structure
```
src/
  app/
    [locale]/
      [tenant]/
        repositories/
          _components/
            GitProviderIntegration.tsx
            RepositoryList.tsx
            RepositoryCard.tsx
            RepositorySyncStatus.tsx
            NewRepositoryDialog.tsx
          page.tsx
          loading.tsx
  components/
    Repositories/
      ProviderIcon.tsx
      SyncIndicator.tsx
  lib/
    services/
      git-providers/
        base.ts       # Base provider interface
        github.ts     # GitHub implementation
        gitlab.ts     # GitLab implementation  
        gitea.ts      # Gitea implementation
      repositories.ts # Repository service for CRUD operations
  types/
    repositories.ts   # Type definitions
  prisma/
    schema.prisma     # Add repository models
```

### 2. Database Schema Changes
```prisma
// New models to add to schema.prisma
model GitProvider {
  id                String   @id @default(cuid())
  name              String   // "github", "gitlab", "gitea"
  displayName       String   // "GitHub", "GitLab", "Gitea"
  userId            String
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  accessToken       String?
  refreshToken      String?
  expiresAt         DateTime?
  repositories      Repository[]
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}

model Repository {
  id                String   @id @default(cuid())
  name              String
  description       String?
  url               String
  defaultBranch     String   @default("main")
  providerId        String
  provider          GitProvider @relation(fields: [providerId], references: [id], onDelete: Cascade)
  projectId         String?
  project           Project? @relation(fields: [projectId], references: [id])
  lastSyncedAt      DateTime?
  syncStatus        String   @default("IDLE") // "IDLE", "SYNCING", "ERROR", "SYNCED"
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  @@unique([providerId, name])
}
```

### 3. API Endpoints
```
/api/repositories             # GET, POST
/api/repositories/[id]        # GET, PATCH, DELETE
/api/repositories/sync/[id]   # POST
/api/git-providers            # GET, POST 
/api/git-providers/[id]       # GET, DELETE
/api/git-providers/callback   # GET (OAuth callback)
```

## Implementation Phases

### Phase 1: Core Infrastructure
1. Update Prisma schema with new models
2. Create base Git provider service interface
3. Implement authentication flows for each provider (OAuth)
4. Add API routes for repository and provider management
5. Add navigation link to Repositories in the main sidebar

### Phase 2: UI Implementation
1. Create Repositories page with list view of all repositories
2. Implement "Connect Provider" workflow for GitHub, GitLab, Gitea
3. Add repository detail view
4. Build UI for repository sync status
5. Create "New Repository" dialog for adding existing repositories

### Phase 3: Git Integration Features
1. Implement repository synchronization (metadata only)
2. Add webhooks for real-time updates
3. Connect repositories to projects
4. Implement basic repository browse functionality
5. Add error handling and retry logic for sync failures

## Best Practices

### UI/UX Guidelines
- Use consistent design with existing project pages
- Provider-specific branding and icons
- Clear sync status indicators
- Filter repositories by provider, status, and project
- Clean table view with card alternative
- Responsive design for all screen sizes

### Authentication Flow
1. User clicks "Connect to [Provider]"
2. Redirect to OAuth flow for the provider
3. Capture access/refresh tokens
4. Store securely in database
5. Use tokens for API requests to provider

### Security Considerations
- Encrypt provider tokens in database
- Implement proper scope limitations for OAuth
- Rate limit API requests
- Validate all repository operations against user permissions

### Performance Optimizations
- Lazy load repository data
- Cache provider API responses
- Implement background sync using Next.js API routes
- Use React Server Components where appropriate
- Implement efficient pagination for repository lists

## Component Specifications

### RepositoryList Component
- Should support filtering by provider, status, and project
- Implement sorting by name, last updated, and sync status
- Include search functionality
- Support both table and card views

### GitProviderIntegration Component
- Handle OAuth flow initialization
- Display connection status
- Allow disconnecting providers
- Show provider-specific metadata and limits

### RepositorySyncStatus Component
- Visual indicator of sync status
- Last sync timestamp
- Manual sync trigger button
- Error details when applicable

## Testing Strategy
- Unit tests for provider services
- Integration tests for API endpoints
- E2E tests for authentication flows
- Component tests for UI elements

## Implementation Milestones

1. Database schema update and migration
2. Core service implementation
3. Basic UI with provider connection
4. Repository listing and management
5. Synchronization features
6. Project integration
7. Advanced features and optimizations

## References
- GitHub OAuth: https://docs.github.com/en/developers/apps/building-oauth-apps
- GitLab OAuth: https://docs.gitlab.com/ee/api/oauth2.html
- Gitea API: https://try.gitea.io/api/swagger 