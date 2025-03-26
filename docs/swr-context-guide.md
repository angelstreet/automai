# SWR Context System Guide

## Overview

The AutomAI application uses SWR (stale-while-revalidate) for data fetching and caching within its React context system. This guide explains how the SWR-based context system works, best practices for using it, and implementation details.

## Migration Status (Completed March 2025)

The application has been fully migrated from the previous server-side cache implementation to SWR's client-side caching system. The following changes were made:

1. Removed `serverCache` usage from all server actions
2. Removed the deprecated cache module (`src/lib/cache.ts`) 
3. Implemented SWR hooks in `src/hooks/` directory
4. Updated context providers to use SWR hooks
5. Removed all Next.js cache invalidation code (`revalidatePath`, `revalidateTag`)
6. Replaced cache clearing functions with placeholder messages

All server actions now focus solely on data fetching and CRUD operations, while caching is handled by SWR on the client side. The migration is 100% complete with no backward compatibility code remaining.

## Architecture

The SWR context architecture follows a clean separation of concerns with three distinct layers:

1. **Data Fetching Layer (Hooks)**: SWR hooks that communicate with server actions
2. **State Management Layer (Contexts)**: React contexts that use SWR hooks and expose domain logic
3. **UI Layer (Components)**: React components that consume contexts

This separation makes the codebase more maintainable, easier to test, and more performant.

## Directory Structure

```
src/
  ├── hooks/                       // SWR data fetching hooks
  │   ├── useRepositoryData.ts     // Repository data hooks
  │   ├── useHostData.ts           // Host data hooks
  │   ├── useDeploymentData.ts     // Deployment data hooks
  │   └── useCICDData.ts           // CI/CD data hooks
  │
  ├── context/                     // React contexts using SWR hooks
  │   ├── index.ts                 // Centralized context exports
  │   ├── AppContext.tsx           // Root context composition
  │   ├── RepositoryContext.tsx    // Repository context with SWR
  │   ├── HostContext.tsx          // Host context with SWR
  │   ├── DeploymentContext.tsx    // Deployment context with SWR
  │   └── CICDContext.tsx          // CI/CD context with SWR
  │
  └── components/                  // Components consuming contexts
      └── providers/
          └── SWRProvider.tsx      // SWR configuration provider
```

## SWR Data Fetching Hooks

SWR hooks are responsible for data fetching and provide a clean API for contexts to consume. Each hook is focused on a specific data fetching operation.

### Example: Repository Hooks

```typescript
// src/hooks/useRepositoryData.ts

import useSWR, { mutate } from 'swr';
import { actionFetcher } from '@/lib/fetcher';
import { 
  getRepositories,
  getRepository,
  starRepository,
  unstarRepository
} from '@/app/[locale]/[tenant]/repositories/actions';

/**
 * Hook for fetching all repositories with optional filtering
 */
export function useRepositories(filter?: RepositoryFilter) {
  return useSWR(
    filter ? ['repositories', JSON.stringify(filter)] : 'repositories',
    () => actionFetcher(getRepositories, filter),
    {
      dedupingInterval: 15 * 60 * 1000, // 15 minutes
      revalidateOnFocus: false
    }
  );
}

/**
 * Hook for fetching a single repository
 */
export function useRepositoryById(id: string | null) {
  return useSWR(
    id ? `repository-${id}` : null,
    () => id ? actionFetcher(getRepository, id) : null,
    {
      dedupingInterval: 60 * 1000, // 1 minute
      revalidateOnFocus: false
    }
  );
}

/**
 * Toggle star status for a repository with optimistic updates
 */
export async function toggleRepositoryStar(
  repositoryId: string, 
  isStarred: boolean
) {
  try {
    // Optimistic update
    const key = `repository-${repositoryId}`;
    
    // Get current data
    const currentData = useSWR.cache.get(key)?.data;
    
    if (currentData) {
      // Optimistically update the cache
      mutate(
        key,
        { ...currentData, starred: !isStarred },
        false // Don't revalidate yet
      );
    }
    
    // Call the appropriate action
    const action = isStarred ? unstarRepository : starRepository;
    const result = await action(repositoryId);
    
    // Revalidate data after the action
    await mutate(key);
    await mutate('repositories');
    await mutate('starred-repositories');
    
    return result;
  } catch (error) {
    console.error('Error toggling repository star:', error);
    
    // Revalidate to restore correct data on error
    await mutate(`repository-${repositoryId}`);
    await mutate('repositories');
    await mutate('starred-repositories');
    
    return { success: false, error: String(error) };
  }
}
```

## React Context with SWR

Contexts use the SWR hooks to fetch data and provide domain-specific logic. They maintain a consistent API for backward compatibility.

### Example: Repository Context

```typescript
// src/context/RepositoryContext.tsx

import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { 
  useRepositories, 
  useRepositoryById,
  toggleRepositoryStar 
} from '@/hooks/useRepositoryData';
import type { Repository, RepositoryFilter } from '@/types/context/repository';

// Context type definition
interface RepositoryContextType {
  repositories: Repository[];
  starredRepositories: Repository[];
  filteredRepositories: Repository[];
  selectedRepository: Repository | null;
  loading: boolean;
  error: Error | null;
  filter: RepositoryFilter;
  
  // Methods
  fetchRepositories: () => Promise<Repository[]>;
  getRepositoryById: (id: string) => Promise<Repository | null>;
  toggleStar: (id: string) => Promise<boolean>;
  selectRepository: (repo: Repository | null) => void;
  filterRepositories: (filter: Partial<RepositoryFilter>) => void;
  // ... other methods
}

// Create the context
const RepositoryContext = createContext<RepositoryContextType | undefined>(undefined);

// Provider component
export function RepositoryProvider({ children }: { children: React.ReactNode }) {
  // Use SWR hooks for data fetching
  const [filter, setFilter] = useState<RepositoryFilter>({
    query: '',
    type: 'all',
    visibility: 'all',
    sort: 'updated',
    sortDirection: 'desc'
  });
  
  const { data, error, mutate } = useRepositories(filter);
  const [selectedRepository, setSelectedRepository] = useState<Repository | null>(null);
  
  // Derived state with memoization
  const repositories = useMemo(() => data || [], [data]);
  
  const starredRepositories = useMemo(() => 
    repositories.filter(repo => repo.starred), 
    [repositories]
  );
  
  const filteredRepositories = useMemo(() => {
    // Apply additional client-side filtering logic if needed
    return [...repositories];
  }, [repositories, filter]);
  
  // Methods that use SWR hooks
  const fetchRepositories = useCallback(async () => {
    await mutate();
    return repositories;
  }, [mutate, repositories]);
  
  const getRepositoryById = useCallback(async (id: string) => {
    const { data } = await useRepositoryById(id);
    return data || null;
  }, []);
  
  const toggleStar = useCallback(async (id: string) => {
    const repo = repositories.find(r => r.id === id);
    if (!repo) return false;
    
    const result = await toggleRepositoryStar(id, !!repo.starred);
    return result.success;
  }, [repositories]);
  
  const selectRepository = useCallback((repo: Repository | null) => {
    setSelectedRepository(repo);
  }, []);
  
  const filterRepositories = useCallback((newFilter: Partial<RepositoryFilter>) => {
    setFilter(prev => ({ ...prev, ...newFilter }));
  }, []);
  
  // Create context value with memoization
  const contextValue = useMemo(() => ({
    repositories,
    starredRepositories,
    filteredRepositories,
    selectedRepository,
    loading: !data && !error,
    error,
    filter,
    
    fetchRepositories,
    getRepositoryById,
    toggleStar,
    selectRepository,
    filterRepositories,
    // ... other methods
  }), [
    repositories,
    starredRepositories,
    filteredRepositories,
    selectedRepository,
    data,
    error,
    filter,
    fetchRepositories,
    getRepositoryById,
    toggleStar,
    selectRepository,
    filterRepositories,
  ]);
  
  return (
    <RepositoryContext.Provider value={contextValue}>
      {children}
    </RepositoryContext.Provider>
  );
}

// Hook for consuming the context
export function useRepository() {
  const context = useContext(RepositoryContext);
  if (context === undefined) {
    throw new Error('useRepository must be used within a RepositoryProvider');
  }
  return context;
}
```

## SWR Configuration Provider

The SWR provider configures global settings for all SWR hooks:

```typescript
// src/components/providers/SWRProvider.tsx

import { SWRConfig } from 'swr';

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        dedupingInterval: 60000, // 1 minute between identical requests
        errorRetryCount: 3,
        onError: (error) => {
          console.error('SWR Error:', error);
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
```

## Centralized Context Exports

All contexts are exported from a central location:

```typescript
// src/context/index.ts

// Export the root provider that composes all other providers
export { CoreProvider, createContextProvider } from './AppContext';

// Export specialized context providers
export { 
  FullContextProvider,
  HostContextProvider,
  RepositoryContextProvider,
  DeploymentContextProvider,
  CICDContextProvider
} from './AppContext';

// Export SWR-based providers 
export { HostProvider } from './HostContext';
export { RepositoryProvider } from './RepositoryContext';
export { DeploymentProvider } from './DeploymentContext';
export { CICDProvider } from './CICDContext';

// Hooks exports
export { useAppContext, useUser } from './AppContext';
export { useHost } from './HostContext';
export { useRepository } from './RepositoryContext';
export { useDeployment } from './DeploymentContext';
export { useCICD } from './CICDContext';
export { useSidebar } from './SidebarContext';
export { useTheme } from './ThemeContext';

// Other exports...
```

## Using Contexts in Components

Components use the contexts through the exported hooks:

```tsx
// Example component using repositories
import { useRepository } from '@/context';

function RepositoryList() {
  const { 
    repositories, 
    loading, 
    error, 
    toggleStar,
    filterRepositories 
  } = useRepository();
  
  if (loading) return <div>Loading repositories...</div>;
  if (error) return <div>Error loading repositories: {error.message}</div>;
  
  return (
    <div>
      <h2>Repositories</h2>
      <div className="filter-controls">
        <input 
          type="text" 
          placeholder="Search repositories..."
          onChange={(e) => filterRepositories({ query: e.target.value })}
        />
      </div>
      <ul>
        {repositories.map(repo => (
          <li key={repo.id}>
            <span>{repo.name}</span>
            <button onClick={() => toggleStar(repo.id)}>
              {repo.starred ? 'Unstar' : 'Star'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Advanced SWR Features

### Optimistic Updates

Optimistic updates provide immediate feedback to users:

```typescript
import { mutate } from 'swr';

async function updateHostName(hostId: string, newName: string) {
  // Get the current cache key
  const key = `host-${hostId}`;
  
  // Get current data from cache
  const currentData = useSWR.cache.get(key)?.data;
  
  if (currentData) {
    // Optimistically update cache
    mutate(
      key,
      { ...currentData, name: newName },
      false // Don't revalidate yet
    );
  }
  
  try {
    // Perform the actual update
    const result = await updateHost(hostId, { name: newName });
    
    // Revalidate the cache
    await mutate(key);
    await mutate('hosts');
    
    return result;
  } catch (error) {
    // If there's an error, revalidate to restore correct data
    await mutate(key);
    await mutate('hosts');
    throw error;
  }
}
```

### Conditional Fetching

Fetch data only when needed:

```typescript
function useConditionalRepository(id: string | null) {
  const { data, error } = useSWR(
    id ? `repository-${id}` : null, // Only fetch when id is provided
    () => id ? getRepository(id) : null
  );
  
  return {
    repository: data,
    loading: id !== null && !data && !error,
    error,
  };
}
```

### Dependent Fetching

Chain data fetching operations:

```typescript
function useUserRepositories(userId: string | null) {
  // First, fetch user data
  const { data: user } = useSWR(
    userId ? `user-${userId}` : null,
    () => userId ? getUser(userId) : null
  );
  
  // Then, use the user's repositories field to fetch repositories
  const { data: repositories } = useSWR(
    user?.repositories ? `repositories-${userId}` : null,
    () => getRepositoriesByIds(user.repositories)
  );
  
  return {
    user,
    repositories,
    loading: (!user && userId !== null) || (!repositories && user?.repositories?.length > 0),
  };
}
```

## Best Practices

### 1. Always Import from Centralized Context

```typescript
// CORRECT
import { useRepository, useHost } from '@/context';

// INCORRECT
import { useRepository } from '@/context/RepositoryContext';
import { useHost } from '@/context/HostContext';
```

### 2. Use Direct SWR When Possible

For simple data fetching, prefer direct SWR usage with consistent key prefixes to help with debugging and avoid provider collisions:

```typescript
// CORRECT: Direct SWR with domain prefix
import useSWR from 'swr';

function UserProfileCard() {
  // Use domain prefix for all user-related data
  const { data: user } = useSWR('user:profile', fetchUserProfile);
  
  // Different domain for different data
  const { data: settings } = useSWR('settings:display', fetchDisplaySettings);
  
  return <div>{user?.name}</div>;
}
```

Using consistent key prefixes offers several advantages:
- Clear separation between different data domains
- Better debugging (errors show which domain is affected)
- Ability to target revalidation for specific domains
- Prevents unintended configuration collisions

#### Recommended Domain Prefixes

Use these prefixes for all SWR keys:

| Domain | Prefix | Example |
|--------|--------|---------|
| User data | `user:` | `user:profile`, `user:preferences` |
| Repository | `repo:` | `repo:list`, `repo:${id}` |
| Deployment | `deployment:` | `deployment:list`, `deployment:${id}` |
| Host | `host:` | `host:list`, `host:${id}` |
| CI/CD | `cicd:` | `cicd:providers`, `cicd:pipelines` |
| Settings | `settings:` | `settings:theme`, `settings:notifications` |

### 3. Avoid Provider Collisions

When using multiple SWR configurations, be aware of unintended collisions:

```typescript
// PROBLEMATIC: Custom error handling affects all SWR requests
function CustomProvider({ children }) {
  return (
    <SWRConfig value={{
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        // This will affect ALL SWR requests in the entire app!
        // ...custom retry logic
      }
    }}>
      {children}
    </SWRConfig>
  );
}

// BETTER: Scope to specific keys or use a separate cache
function UserDataProvider({ children }) {
  // Create a separate cache for user data
  const [userSWRCache] = useState(() => new Map());
  
  return (
    <SWRConfig 
      value={{
        provider: () => userSWRCache,
        onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
          // Only apply to user-related data
          if (!key.startsWith('user:')) return;
          // Custom retry logic for user data
        }
      }}
    >
      {children}
    </SWRConfig>
  );
}
```

### 4. Memoize Complex Calculations

```typescript
const filteredData = useMemo(() => {
  return data.filter(item => item.status === filter);
}, [data, filter]);
```

### 5. Proper Dependency Arrays

```typescript
// Make sure to include all dependencies in useCallback
const handleSubmit = useCallback(() => {
  submitData(formData, user.id);
}, [formData, user.id]); // Include all variables used inside
```

### 6. Avoid Nested Context Providers

```tsx
// CORRECT: Use the FullContextProvider from AppContext
function AppWithContexts({ children }) {
  return (
    <SWRProvider>
      <FullContextProvider>
        {children}
      </FullContextProvider>
    </SWRProvider>
  );
}

// INCORRECT: Nesting providers manually can lead to performance issues
function AppWithContexts({ children }) {
  return (
    <SWRProvider>
      <UserProvider>
        <HostProvider>
          <RepositoryProvider>
            <DeploymentProvider>
              <CICDProvider>
                {children}
              </CICDProvider>
            </DeploymentProvider>
          </RepositoryProvider>
        </HostProvider>
      </UserProvider>
    </SWRProvider>
  );
}
```

### 7. Use Selectors for Performance

Use selectors to prevent unnecessary renders:

```tsx
// Only re-render when repositories change, not when other context values change
const repositories = useRepository(state => state.repositories);
```

### 8. Error Boundaries for SWR Errors

```tsx
import { ErrorBoundary } from 'react-error-boundary';

function RepositoriesPage() {
  return (
    <ErrorBoundary fallback={<div>Failed to load repositories</div>}>
      <RepositoryList />
    </ErrorBoundary>
  );
}
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Data Not Refreshing

**Problem**: Data isn't refreshing when expected.

**Solution**: 
- Call `mutate` manually after operations that change data
- Check that your cache keys are consistent
- Verify that your SWR configuration is correct

```typescript
// After creating a new repository
await createRepository(newRepo);
await mutate('repositories'); // Refresh the repositories list
```

#### 2. Infinite Fetching Loop

**Problem**: Component enters an infinite fetching loop.

**Solution**:
- Check your dependency arrays in useEffect and useCallback
- Ensure you're not changing cache keys on every render
- Use stable references for objects/arrays in cache keys

```typescript
// CORRECT: Stringifying the filter object for stable keys
const key = ['repositories', JSON.stringify(filter)];

// INCORRECT: New object reference on every render
const key = ['repositories', { query: 'test' }];
```

#### 3. Missing Data After Navigation

**Problem**: Data disappears after navigating between pages.

**Solution**:
- Check that your SWR cache persists between page navigations
- Ensure that SWRProvider is at the root level
- Consider using `revalidateOnFocus: true` in your SWR config

#### 4. Multiple API Calls for the Same Data

**Problem**: The same API call is made multiple times.

**Solution**:
- Check for duplicate SWR hooks in your component tree
- Ensure dedupingInterval is set correctly
- Use the SWR cache for sharing data between components

```typescript
// Set a longer deduping interval for stable data
useSWR('repositories', getRepositories, {
  dedupingInterval: 15 * 60 * 1000, // 15 minutes
});
```

## Migration Guide

For developers working with existing code, follow these steps to use the SWR-based context system:

1. **Update Imports**: Change imports to use the centralized context system
   ```typescript
   // Old
   import { useHostContext } from '@/context/HostContext';
   
   // New
   import { useHost } from '@/context';
   ```

2. **Access Data via Hooks**: Use the hook API for accessing data
   ```typescript
   // Old
   const hostContext = useHostContext();
   const hosts = hostContext.hosts;
   
   // New
   const { hosts, loading, error } = useHost();
   ```

3. **Handle Loading and Error States**: SWR provides loading and error states
   ```typescript
   const { data, loading, error } = useRepository();
   
   if (loading) return <LoadingSpinner />;
   if (error) return <ErrorMessage error={error} />;
   ```

4. **Use Mutate for Cache Invalidation**: Use SWR's mutate function for updates
   ```typescript
   import { mutate } from 'swr';
   
   // After a successful operation
   await addHost(newHost);
   await mutate('hosts'); // Refresh hosts list
   ```

## Conclusion

The SWR-based context system provides a clean, efficient way to manage application state and data fetching. By following these patterns and best practices, you can build performant and maintainable features that leverage the power of SWR's caching and revalidation capabilities.

## Migration Notes

During the migration from the server-side caching system to SWR, we made the following changes:

1. **Server Actions**: All server actions were simplified to focus only on data operations. Cache-related code like `serverCache.get()`, `serverCache.set()`, TTL settings, and tags were removed.

2. **Cache Functions**: Cache clearing functions were replaced with placeholders that return simple messages acknowledging that SWR now handles caching.

3. **Next.js Cache API**: All references to `revalidatePath` and `revalidateTag` were removed since client-side caching with SWR eliminates the need for server-side cache invalidation.

4. **Context Providers**: Updated to use SWR hooks, providing a consistent interface while improving performance with automatic revalidation.

The result is a more efficient, maintainable codebase with better separation of concerns:
- Server actions focus solely on data operations
- SWR handles caching, revalidation, and optimistic updates
- Context providers expose a clean API for components

This enables better performance, improved developer experience, and more responsive UI updates.