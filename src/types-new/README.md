# Optimized Types Architecture

This directory contains a simplified and flattened TypeScript type definitions structure with better organization and lower coupling.

## Key Principles

1. **One Level Structure**: Files are organized in a single level without deep nesting to improve discoverability
2. **Domain-Specific Files**: Types are organized by domain, not by kind of type
3. **File Size Optimization**: Each file is kept under 500 lines for maintainability
4. **Consistent Naming**: Clear naming conventions without redundant type suffixes
5. **Proper Documentation**: All types have clear JSDoc documentation

## Directory Structure

```
/types-new/
  # Core entity types
  /host-types.ts            # Host-related types
  /repository-types.ts      # Repository-related types
  /deployment-types.ts      # Deployment-related types
  /user-types.ts            # User and auth related types
  /team-types.ts            # Team-related types
  /cicd-types.ts            # CICD entity types
  
  # Context types
  /dashboard-context.ts     # Dashboard context types
  
  # Database types
  /db-common.ts             # Common database types
  /db-hosts.ts              # Host database tables
  /db-auth.ts               # Auth database tables
  /db-git.ts                # Git/repository database tables
  /db-teams.ts              # Team database tables
  /db-cicd.ts               # CICD database tables
  /db-deployments.ts        # Deployment database tables
  
  # Utility types
  /base-types.ts            # Common base types and utility types
  
  # Main export
  /index.ts                 # Re-exports common types
```

## Usage Guidelines

### Importing Types

1. **For Entity Types**: Import directly from specific type files
   ```typescript
   import { Host, HostStatus } from '@/types-new/host-types';
   import { Repository } from '@/types-new/repository-types';
   ```

2. **For Context Types**: Always import from context-specific files
   ```typescript
   import { DashboardContext } from '@/types-new/dashboard-context';
   ```

3. **For Database Types**: Import from db-specific files
   ```typescript
   import { HostsTable } from '@/types-new/db-hosts'; 
   ```

4. **For Common Utilities**: Import from base-types
   ```typescript
   import { ApiResponse, PaginatedResult } from '@/types-new/base-types';
   ```

5. **Multiple Entity Types**: You can use index.ts for importing multiple core types
   ```typescript
   import { Host, Repository, Deployment } from '@/types-new';
   ```

### Type Conventions

1. **Entity Types**: Base data structures like `Host`, `Repository`, `User`
2. **Context Types**: End with 'Context' (`DashboardContext`)  
3. **Database Types**: End with 'Table' (`HostsTable`)
4. **Input/Payload Types**: Use descriptive action prefixes (`CreateTeamInput`, `UpdateHostInput`)

## Migration Path

This structure is designed to replace the previous nested types directories. Migration should be done incrementally:

1. Import types from the new structure in new code
2. Gradually update imports in existing code
3. Once all imports are updated, remove the old structure

## Best Practices

1. **Keep Types DRY**: Reuse types through composition instead of duplication
2. **Use TypeScript Features**: Leverage interfaces, extends, Partial<>, Pick<>, Omit<>, etc.
3. **Document Complex Types**: Add JSDoc comments to explain complex interfaces
4. **Default Exports**: Avoid default exports, use named exports for all types
5. **Minimal Coupling**: Minimize cross-imports between type files