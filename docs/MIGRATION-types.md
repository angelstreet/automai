# Types Migration Guide

This document outlines the steps for migrating to the new types organization structure.

## What We've Accomplished

1. Created a new, structured types organization with a flat directory structure and consistent naming with suffixes:

   - `src/types/component/[domain]ComponentType.ts` - Component entity types (data models)
   - `src/types/service/[domain]ServiceType.ts` - Service/authentication types
   - `src/types/api/[domain]ApiType.ts` - API types (external APIs)
   - `src/types/context/[domain]ContextType.ts` - Context types (React context)
   - `src/types/db/[domain]DbType.ts` - Database types

2. Consolidated duplicate types:

   - Merged multiple `Host` interfaces into a single source of truth
   - Unified Git provider types with shared base interfaces
   - Organized authentication and user types logically
   - Created missing core types (repository.ts, cicd.ts)
   - Separated core entity types from context-specific types

3. Set up transition mechanisms:
   - Updated context files to import from core
   - Updated type documentation
   - Documented the new structure in README.md

## Migration Roadmap

### Phase 1: Setup and Structure (✅ Completed)

- Created folder structure
- Defined consolidated types for hosts
- Created new component type files

### Phase 2: Expand Component Types (✅ Completed)

- Created missing component type files with proper suffixes
- Updated context types to import from component types
- Added documentation on type organization

### Phase 3: Naming Convention with Suffixes (✅ Completed)

- Renamed all type files to use the suffix naming convention:
  - Component types: `[domain]ComponentType.ts`
  - Context types: `[domain]ContextType.ts`
  - Service types: `[domain]ServiceType.ts`
  - API types: `[domain]ApiType.ts`
  - DB types: `[domain]DbType.ts`
- Created a flat directory structure with one level of organization
- Updated documentation to reflect the new naming convention

### Phase 4: Import Updates (✅ Completed)

1. Created and ran an automated script to update imports:
   - Updated imports from old paths to new paths with proper suffixes
   - Successfully updated 85 files across the codebase
   - Ensured all imports use the correct suffixed names

2. Tested the codebase to ensure correct typing
3. Updated documentation and README with new import patterns

## How to Update Your Code

### Component vs. Context Type Usage

**Component Types** (`@/types/component/`):
- Used for data models and entity definitions
- Import these when working with database or service layers
- Use in hooks as return types and parameters

```typescript
// Good practice - Using component types for data models
import { Repository } from '@/types/component/repositoryComponentType';

function processRepository(repo: Repository) {
  // ...
}
```

**Context Types** (`@/types/context/`):
- Used for UI state, actions, and component props
- Import these when working with React components
- Use for context-specific interfaces

```typescript
// Good practice - Using context types for UI components
import { RepositoryContextType } from '@/types/context/repositoryContextType';
import { useContext } from 'react';
import { RepositoryContext } from '@/context/RepositoryContext';

function MyComponent() {
  const repository = useContext<RepositoryContextType>(RepositoryContext);
  // ...
}
```

### Manual Update Process

If you're working on a specific file:

1. Check the README for the new location of types with appropriate suffixes
2. Update your imports to use component types for data models:
   ```typescript
   // OLD
   import { Repository } from '@/types/core/repository';
   // NEW
   import { Repository } from '@/types/component/repositoryComponentType';
   ```
3. Keep using context types with the new suffix for UI-specific needs:
   ```typescript
   // OLD
   import { RepositoryContextType } from '@/types/context/repository';
   // NEW
   import { RepositoryContextType } from '@/types/context/repositoryContextType';
   ```
4. Test to ensure everything works correctly

### When Creating New Types

1. First define component entities in `@/types/component/[domain]ComponentType.ts`
2. Extend component types with context-specific types in `@/types/context/[domain]ContextType.ts`
3. Follow the suffix naming conventions in the README
4. Document with JSDoc comments

## Example Migrations

### Example 1: Repository Type Migration

#### Original Setup (Before)

Before our changes, repository types were defined in a single file with mixed responsibilities:

```typescript
// src/types/context/repository.ts
export interface Repository {
  id: string;
  name: string;
  // ... core properties
}

export interface RepositoryContextType {
  repositories: Repository[];
  // ... state and actions
}
```

#### New Type Organization (After)

Now we have a cleaner separation of concerns with suffix naming:

```typescript
// src/types/component/repositoryComponentType.ts
export interface Repository {
  id: string;
  name: string;
  // ... core properties
}

// src/types/context/repositoryContextType.ts
import { Repository } from '@/types/component/repositoryComponentType';

export interface RepositoryData {
  repositories: Repository[];
  // ... state
}

export interface RepositoryActions {
  // ... actions
}

export interface RepositoryContextType extends RepositoryData, RepositoryActions {}
```

### Example 2: User Type Migration

#### Original Setup (Before)

User types were scattered across multiple files with duplicated definitions:

```typescript
// src/types/user.ts (Root file with mixed concerns)
export interface User {
  id: string;
  // ... properties
}

export interface UserContextType {
  // ... properties and functions
}

// src/types/auth/user.ts (Duplicate definitions)
export interface User {
  id: string;
  // ... same properties
}
```

#### New Type Organization (After)

We've reorganized into a clean structure with consistent naming:

```typescript
// src/types/component/userComponentType.ts
export interface User {
  id: string;
  // ... properties
}

// src/types/context/userContextType.ts
import { User } from '@/types/component/userComponentType';

export interface UserContextType {
  user: User | null;
  // ... other context properties
}

// src/types/service/userServiceType.ts
import { User } from '@/types/component/userComponentType';

export interface UserAuthService {
  // Auth-specific functionality
}
```

## Removed Files

We've completely restructured the types organization:

1. Removed root-level type files that have been moved to their appropriate directories
2. Applied consistent naming convention with suffixes for all type files:
   - Component types: `[domain]ComponentType.ts`
   - Context types: `[domain]ContextType.ts`
   - Service types: `[domain]ServiceType.ts`
   - API types: `[domain]ApiType.ts`
   - DB types: `[domain]DbType.ts`

Examples of renamed files:
- `/src/types/user.ts` → `/src/types/component/userComponentType.ts` and `/src/types/context/userContextType.ts`
- `/src/types/sidebar.ts` → `/src/types/context/sidebarContextType.ts` 
- `/src/types/ssh.ts` → `/src/types/component/sshComponentType.ts`
- `/src/types/scripts.ts` → `/src/types/component/scriptsComponentType.ts` 
- `/src/types/features.ts` → `/src/types/component/featuresComponentType.ts`
- `/src/types/supabase.ts` → `/src/types/db/supabaseDbType.ts`

This means you'll need to update your imports to use the new locations directly.

## Completed Migration

We have successfully completed the following import updates across the codebase:

1. Replaced all imports from original locations to the new suffixed naming convention:
   - `@/types/auth/user` → `@/types/service/userServiceType`
   - `@/types/auth/session` → `@/types/service/sessionServiceType`
   - `@/types/core/host` → `@/types/component/hostComponentType`
   - `@/types/context/host` → `@/types/context/hostContextType`
   - And so on for all other type imports

2. Established the pattern for all type files:
   - Component types: `[domain]ComponentType.ts`
   - Context types: `[domain]ContextType.ts`
   - Service types: `[domain]ServiceType.ts`
   - API types: `[domain]ApiType.ts`
   - DB types: `[domain]DbType.ts`

3. Created an automated migration script that updated 85 files with references to the old import paths

4. Updated documentation to reflect the new naming convention and import patterns

All changes have been applied across the entire codebase to maintain build integrity. No backward compatibility layers have been created, ensuring a clean codebase without legacy code. 

## Breaking Changes Approach

We've deliberately implemented these changes as breaking changes without backward compatibility:

1. **No backward compatibility layers**: We do not provide re-export files or compatibility layers
2. **Direct migration required**: All imports must be updated to use the new file paths
3. **No gradual migration**: The changes must be applied all at once to prevent broken builds

This approach ensures:
1. Clean codebase without legacy/compatibility code
2. Consistent imports across the application
3. Forced adoption of the new naming convention
4. No technical debt from maintaining compatibility layers

The project team should coordinate the migration to ensure all developers are aware of the changes and update their imports accordingly. This might require a coordinated code freeze period to implement the changes across the codebase.

## Need Help?

If you encounter issues during migration:

1. Check the `src/types/README.md` for guidance on the new structure
2. Review this migration guide for best practices and examples
3. Examine the core type files we've created as reference implementations
