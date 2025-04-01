# Library Directory Structure

This directory contains the core libraries, utilities, and services for the AutomAI application. It follows a consistent, flat structure with no more than two levels of depth.

## Directory Structure

```
/src/lib/
├── db/                     # Database access layer
│   ├── repositoryDb.ts     # Repository database operations
│   ├── deploymentDb.ts     # Deployment database operations
│   ├── hostDb.ts           # Host database operations
│   ├── teamDb.ts           # Team database operations
│   ├── userDb.ts           # User database operations
│   ├── cicdDb.ts           # CI/CD database operations
│   ├── permissionDb.ts     # Permission database operations
│   └── dbUtils.ts          # Common database utilities
│
├── services/               # Business logic services
│   ├── authService.ts      # Authentication services
│   ├── cicdService.ts      # CI/CD services
│   ├── deploymentService.ts # Deployment services
│   ├── hostService.ts      # Host management services
│   ├── teamService.ts      # Team management services
│   ├── repositoryService.ts # Repository services
│   ├── sshService.ts       # SSH connection services
│   ├── terminalService.ts  # Terminal functionality
│   ├── websocketService.ts # WebSocket services
│   ├── httpService.ts      # HTTP utilities
│   └── oauthService.ts     # OAuth functionality
│
├── supabase/               # Supabase-specific code
│   ├── client.ts           # Supabase client
│   ├── server.ts           # Supabase server-side client
│   ├── middleware.ts       # Supabase middleware
│   ├── auth.ts             # Supabase auth helpers
│   └── admin.ts            # Supabase admin
│
├── git/                    # Git provider APIs
│   ├── githubApi.ts        # GitHub API integration
│   ├── gitlabApi.ts        # GitLab API integration
│   └── giteaApi.ts         # Gitea API integration
│
├── utils/                  # Utility functions
│   ├── cacheUtils.ts       # Caching utilities
│   ├── logUtils.ts         # Logging utilities
│   ├── envUtils.ts         # Environment utilities
│   ├── chartUtils.ts       # Chart generation utilities
│   ├── fetchUtils.ts       # Fetch utilities
│   ├── sessionUtils.ts     # Session utilities
│   ├── apiUtils.ts         # API utilities
│   └── commonUtils.ts      # General utilities
│
└── config/                 # Configuration
    ├── featureConfig.ts    # Feature flags configuration
    ├── envConfig.ts        # Environment configuration
    ├── authConfig.ts       # Authentication configuration
    └── appConfig.ts        # Application configuration
```

## Naming Convention

This library follows a consistent naming convention with suffixes:

- Database files: `*Db.ts` (e.g., `repositoryDb.ts`)
- Service files: `*Service.ts` (e.g., `hostService.ts`)
- API files: `*Api.ts` (e.g., `githubApi.ts`)
- Utility files: `*Utils.ts` (e.g., `cacheUtils.ts`)
- Configuration files: `*Config.ts` (e.g., `featureConfig.ts`)

## Usage Guidelines

1. **Keep the structure flat**: No more than 2 levels of depth (`/src/lib/[category]/[file].ts`)
2. **Follow the naming convention**: Use appropriate suffixes for each type of file
3. **Avoid circular dependencies**: Structure your imports to avoid circular references
4. **Maintain clear boundaries**: Each directory has a specific responsibility
5. **Export consistent interfaces**: Each module should provide a consistent interface

## Importing from lib

Import from lib using the appropriate path:

```typescript
// Import a database module
import repositoryDb from '@/lib/db/repositoryDb';

// Import a service
import hostService from '@/lib/services/hostService';

// Import utilities
import { cn } from '@/lib/utils/commonUtils';
import cacheUtils from '@/lib/utils/cacheUtils';

// Import configuration
import featureConfig from '@/lib/config/featureConfig';
import { env } from '@/lib/config/envConfig';
```

## Design Principles

1. **Database Layer**: Direct database operations, returns standard `DbResponse<T>`
2. **Service Layer**: Business logic and operations, returns standard `ServiceResponse<T>`
3. **Supabase Layer**: Supabase-specific functionality and clients
4. **Git Layer**: External Git provider API integrations
5. **Utils Layer**: Reusable utility functions
6. **Config Layer**: Application configuration and settings