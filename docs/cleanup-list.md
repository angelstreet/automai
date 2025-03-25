# Migration Cleanup List

This document lists the files and code that should be removed or modified during the Phase 7 cleanup after the SWR context migration is complete and tested.

## Files to Remove

### 1. Old Context Implementations

- `/src/context/RepositoryContext.tsx` - Replaced by `/src/context/NewRepositoryContext.tsx`
- `/src/context/HostContext.tsx` - Replaced by `/src/context/NewHostContext.tsx`
- `/src/context/DeploymentContext.tsx` - Replaced by `/src/context/NewDeploymentContext.tsx`
- `/src/context/CICDContext.tsx` - Replaced by `/src/context/NewCICDContext.tsx`

### 2. Server-Side Cache Implementation

- `/src/lib/cache.ts` - All server-side caching now handled by SWR

## Code to Modify

### 1. AppContext.tsx

- Remove `persistedData` object and all references to it
- Remove or refactor these provider exports to use the new SWR contexts:
  - `HostContextProvider`
  - `RepositoryContextProvider`
  - `DeploymentContextProvider`
  - `CICDContextProvider`

### 2. Server Actions

The following files need to be modified to remove server-side cache logic:

- `/src/app/[locale]/[tenant]/repositories/actions.ts`
- `/src/app/[locale]/[tenant]/hosts/actions.ts`
- `/src/app/[locale]/[tenant]/deployment/actions.ts`
- `/src/app/[locale]/[tenant]/cicd/actions.ts`

Remove all references to `serverCache`, including:
- `serverCache.getOrSet()`
- `serverCache.set()`
- `serverCache.get()`
- `serverCache.delete()`
- `serverCache.deleteByTag()`
- `serverCache.deletePattern()`
- `serverCache.tenantKey()`
- `serverCache.userKey()`

### 3. Context Index

- Replace `/src/context/index.ts` with the new version at `/src/context/indexNew.ts`

## File Renaming

After testing is complete, rename the new context files to replace the old ones:

1. `/src/context/NewRepositoryContext.tsx` → `/src/context/RepositoryContext.tsx`
2. `/src/context/NewHostContext.tsx` → `/src/context/HostContext.tsx`
3. `/src/context/NewDeploymentContext.tsx` → `/src/context/DeploymentContext.tsx`
4. `/src/context/NewCICDContext.tsx` → `/src/context/CICDContext.tsx`

## Commit Strategy

The cleanup should be done in a single commit to ensure a clean transition:

1. First, ensure all tests pass with the new contexts
2. Create a new branch for the cleanup
3. Remove all files and code listed above
4. Rename the new context files to replace the old ones
5. Update the context index file
6. Run all tests again to ensure everything works
7. Commit and merge the changes