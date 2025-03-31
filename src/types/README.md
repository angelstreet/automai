# TypeScript Types Organization

This directory contains all the TypeScript types used throughout the application, organized in a structured way to improve maintainability and reduce duplication.

## Directory Structure

```
src/types/
├── api/                 # API-related types (responses, requests)
│   ├── git/             # Git provider API types
│   │   ├── common.ts    # Shared Git types
│   │   ├── github.ts    # GitHub-specific types
│   │   ├── gitlab.ts    # GitLab-specific types
│   │   └── gitea.ts     # Gitea-specific types
│   └── cicd/            # CI/CD provider types
├── auth/                # Authentication related types
│   ├── user.ts          # User, Role, etc.
│   └── session.ts       # Session, Token, etc.
├── core/                # Core entities shared across the application
│   ├── host.ts          # Host definitions
│   ├── repository.ts    # Repository definitions
│   ├── deployment.ts    # Deployment definitions
│   └── tenant.ts        # Tenant definitions
├── context/             # React context-specific types
│   ├── host.ts          # Host context types
│   ├── user.ts          # User context types
│   └── ...
├── db/                  # Database schema types
│   └── supabase.ts      # Supabase schema types
├── ui/                  # UI-specific types (props, state, etc.)
│   └── forms.ts         # Form data types
└── index.ts             # Export commonly used types
```

## Naming Conventions

- **Interfaces**: PascalCase descriptive names (e.g., `Host`, `Repository`)
- **Type aliases**: PascalCase with descriptive suffixes (e.g., `HostStatus`, `DeploymentType`)
- **Enums**: PascalCase (e.g., `DeploymentStatus`)
- **Context types**: Suffix with "Context" (e.g., `HostContext`)
- **Form data**: Suffix with "FormData" (e.g., `HostFormData`)
- **API responses**: Suffix with "Response" (e.g., `GitHubRepositoryResponse`)
- **API requests**: Suffix with "Request" (e.g., `CreateHostRequest`)

## Usage Guidelines

### Import Best Practices

Prefer importing directly from the type file:

```typescript
// Good
import { Host } from '@/types/core/host';

// Avoid (unless importing many types)
import { Host } from '@/types';
```

For frequently used types across the application, you can import from the index:

```typescript
import { User, Role } from '@/types';
```

### Creating New Types

1. Place types in the appropriate directory based on their domain
2. Follow the naming conventions
3. Document the type with JSDoc comments
4. Export the type from the appropriate index file if it's commonly used

### Type Organization Guidelines

1. **Core vs. Context types**:

   - Core types define the shape of data
   - Context types include actions and state for React contexts

2. **API vs. UI types**:

   - API types match the API response/request structure
   - UI types are specific to the React component needs

3. **Domain-specific types**:
   - Keep related types together in the same file
   - Split files when they become too large (>200 lines)

## Migration

If you need to update imports after a type has moved, you can use the migration script:

```bash
node scripts/update-type-imports.js
```

## Versioning

Types evolution should be backward compatible whenever possible. When breaking changes are necessary, update all usages in the same PR.
