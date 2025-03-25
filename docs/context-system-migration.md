# Context System Migration

## Migration from Custom Caching to SWR

This document outlines the migration from our custom context-based caching system to SWR (stale-while-revalidate), which has been completed successfully.

## Migration Overview

- **Start Date**: March 26, 2025
- **Completion Date**: March 26, 2025
- **Status**: Complete ✅

## Summary

All context providers have been migrated to use SWR for data fetching and caching:

1. Repository Context - Complete ✅
2. Host Context - Complete ✅
3. Deployment Context - Complete ✅
4. CICD Context - Complete ✅
5. Integration Testing - Complete ✅
6. Code Cleanup - Complete ✅

The migration involved:
- Creating dedicated SWR hooks for each data fetching operation
- Reimplementing context providers to use these hooks
- Maintaining the same API interfaces for backward compatibility
- Replacing the server-side cache with stub implementations
- Removing dependencies on global state like `persistedData`
- Thorough testing and verification

## Benefits of SWR

The migration to SWR provides several benefits over our custom caching system:

1. **Simplified Caching Logic**: SWR handles cache invalidation and revalidation automatically, eliminating complex manual cache management.

2. **Improved Performance**: SWR's built-in caching reduces unnecessary data fetching and provides a smoother user experience.

3. **Optimistic Updates**: SWR makes it easy to implement optimistic updates, providing immediate UI feedback while updating in the background.

4. **Automatic Revalidation**: SWR can automatically revalidate data when the user focuses the window or reconnects to the network.

5. **Pagination and Infinite Loading**: SWR provides built-in support for pagination and infinite loading patterns.

6. **Error Handling**: SWR has built-in error handling and retry mechanisms.

7. **Easier Testing**: Components using SWR hooks are easier to test because they have simpler dependencies.

8. **Reduced Boilerplate**: SWR reduces the amount of code needed for data fetching and state management.

## Implementation Details

### SWR Hooks

We created a set of dedicated SWR hooks for each context domain:

- `useRepositoryData.ts`: Hooks for repository data
- `useHostData.ts`: Hooks for host data
- `useDeploymentData.ts`: Hooks for deployment data
- `useCICDData.ts`: Hooks for CICD data

Each hook file contains multiple specialized hooks for different data fetching scenarios, allowing for more efficient and targeted data fetching.

### Context Providers

Context providers were reimplemented to use SWR hooks for data fetching. The new implementations:

- Maintain the same API interfaces for backward compatibility
- Use SWR's built-in caching instead of our custom server-side cache
- Implement optimistic updates for a better user experience
- Use proper memoization to prevent unnecessary re-renders
- Provide improved error handling and loading states

### Cleanup

The following cleanup steps were completed:

- Removed `persistedData` usage from `AppContext` (replaced with empty object + deprecation notice)
- Replaced `cache.ts` with stub implementation showing deprecation warnings
- Removed global window references in `useUser` hook
- Updated context index to use SWR-based context implementations

## Usage Guidelines

1. **Import contexts from the centralized index**:
   ```tsx
   // ✅ Correct
   import { useRepository, useHost } from '@/context';
   
   // ❌ Incorrect
   import { useRepository } from '@/context/RepositoryContext';
   ```

2. **Use SWR's mutation API for updating data**:
   ```tsx
   import { mutate } from 'swr';
   
   // Revalidate specific data
   await mutate('repositories');
   ```

3. **Take advantage of SWR's built-in features**:
   - Use SWR's pagination hooks for paginated data
   - Use the `optimisticData` option for immediate UI updates
   - Use SWR's error retrying and focus revalidation

4. **Use selectors for optimized rendering**:
   ```tsx
   // Only re-render when repositories change
   const repositories = useRepository(ctx => ctx.repositories);
   ```

## Next Steps

The migration is complete, but there are opportunities for further improvements:

1. **Performance Monitoring**: Continue monitoring performance to ensure the SWR implementation performs as expected in production.

2. **Advanced SWR Features**: Explore additional SWR features like prefetching, preloading, and suspense mode.

3. **Concurrent Loading States**: Implement more sophisticated loading states and progress indicators using SWR's loading states.

4. **Further Code Cleanup**: Continue removing any remaining references to the old caching system in the codebase.

5. **Documentation**: Update documentation to reflect the new data fetching patterns and best practices.