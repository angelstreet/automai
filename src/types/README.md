# Types Architecture

This directory contains all the TypeScript type definitions used throughout the application.

**⚠️ BREAKING CHANGES**: We have completely restructured the types organization with a consistent naming convention using suffixes. All types have been moved to their appropriate directories **without backward compatibility**. 

You **MUST** update all imports immediately to use the new file paths. Old import paths like `@/types/core/host` or `@/types/auth/user` will not work.

## Directory Structure

```
/src/types/
├── api/                          # API-related types (external APIs)
│   ├── gitCommonApiType.ts       # Common Git provider types
│   ├── githubApiType.ts          # GitHub-specific API types
│   └── gitlabApiType.ts          # GitLab-specific API types
├── component/                    # Component entity types (data models)
│   ├── cicdComponentType.ts      # CI/CD component entities
│   ├── deploymentComponentType.ts # Deployment component entities
│   ├── featuresComponentType.ts  # Feature flags and plan types
│   ├── hostComponentType.ts      # Host component entities
│   ├── repositoryComponentType.ts # Repository component entities
│   ├── scriptsComponentType.ts   # Script entities
│   └── sshComponentType.ts       # SSH component entities
├── context/                      # React context types
│   ├── appContextType.ts         # App context types
│   ├── cicdContextType.ts        # CI/CD context types
│   ├── constantsContextType.ts   # Constants context types
│   ├── dashboardContextType.ts   # Dashboard context types
│   ├── deploymentContextType.ts  # Deployment context types
│   ├── hostContextType.ts        # Host context types
│   ├── permissionsContextType.ts # Permissions context types
│   ├── repositoryContextType.ts  # Repository context types
│   ├── sidebarContextType.ts     # Sidebar context types
│   ├── teamContextType.ts        # Team context types
│   └── userContextType.ts        # User context types
├── db/                           # Database types
│   └── supabaseDbType.ts         # Supabase database schema types
├── service/                      # Service/auth types
│   ├── sessionServiceType.ts     # Session service types
│   └── userServiceType.ts        # User service types
└── index.ts                      # Main exports for component types
```

## Type Architecture

### Component Types (`/component/`)

- Component entity types represent the fundamental data models of the application
- They are pure data structures without UI or state management concerns
- These types should be used by both the database layer and the context layer
- Example: `Host`, `Repository`, `Deployment`, `CICDProvider`

### Context Types (`/context/`)

- Context types extend component types with React context specific functionality
- They include state and action interfaces for the context providers
- These types are used by the context providers and hooks
- Example: `HostContextType`, `RepositoryContextType`

### Service Types (`/service/`)

- Service types represent authentication and user session data
- They extend component types with service-specific functionality
- These types are used by authentication and session management
- Example: `UserSession`, authentication utilities

### API Types (`/api/`)

- API types represent the structure of requests and responses to external APIs
- They are organized by API provider
- Example: GitHub API types, GitLab API types

## Usage Guidelines

1. **Utilize naming suffix conventions**: Always use the appropriate suffix for each type file:
   - `*ComponentType` for core component entity types
   - `*ContextType` for React context types
   - `*ServiceType` for authentication and service types
   - `*ApiType` for external API types
   - `*DbType` for database types

2. **Import from the correct path**: Always import types from their dedicated files:
   - `import { Host } from '@/types/component/hostComponentType';`
   - `import { RepositoryContextType } from '@/types/context/repositoryContextType';`

3. **Don't recreate component types**: Context files should import and extend component types, not recreate them

4. **Keep UI-specific types in context files**: Types related to UI state should stay in context files

5. **Use descriptive interfaces**: Prefer interfaces over type aliases for better documentation

6. **Document complex types**: Add JSDoc comments to explain complex interfaces

## Example

```typescript
// /component/repositoryComponentType.ts
export interface Repository {
  id: string;
  name: string;
  // ... other core properties
}

// /context/repositoryContextType.ts
import { Repository } from '@/types/component/repositoryComponentType';

export interface RepositoryData {
  repositories: Repository[];
  selectedRepository: Repository | null;
  // ... other state properties
}

export interface RepositoryActions {
  fetchRepositories: () => Promise<Repository[]>;
  // ... other actions
}

export interface RepositoryContextType extends RepositoryData, RepositoryActions {}
```