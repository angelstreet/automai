# Migration Plan: Moving from Custom Context Cache to SWR

This document outlines a comprehensive plan to migrate the AutomAI application from our current custom context-based caching system to SWR, a more standardized and robust client-side caching solution.

## Table of Contents
1. [Background and Motivation](#background-and-motivation)
2. [Migration Overview](#migration-overview)
3. [Phase 1: Infrastructure Setup](#phase-1-infrastructure-setup)
4. [Phase 2: Repository Context Migration](#phase-2-repository-context-migration)
5. [Phase 3: Host Context Migration](#phase-3-host-context-migration) 
6. [Phase 4: Deployment Context Migration](#phase-4-deployment-context-migration)
7. [Phase 5: CICD Context Migration](#phase-5-cicd-context-migration)
8. [Phase 6: Testing and Optimization](#phase-6-testing-and-optimization)
9. [Rollback Plan](#rollback-plan)
10. [Best Practices](#best-practices)

## Background and Motivation

Our current caching implementation relies on:
- A custom global `persistedData` object for cross-page data persistence
- Server-side caching with custom TTL management
- Multiple context providers with complex state management
- Manual cache invalidation logic

This approach has led to:
- Slow page navigation (up to 30s+ loading times)
- Complicated cache invalidation logic
- Multiple refactoring attempts to fix caching issues
- Hard-to-debug cache inconsistencies

SWR (stale-while-revalidate) offers:
- A standardized caching pattern with proven performance
- Automatic revalidation on page focus/reconnect
- Simple API for data fetching and management
- Built-in deduplication of requests
- Persistence between page navigations

## Migration Overview

### Timeline
- Total estimated time: 3-5 days
- Complexity: Medium
- Risk: Medium (with proper testing)

### Approach
We'll take a phased approach, migrating one context at a time while maintaining backward compatibility:

1. Set up SWR infrastructure
2. Migrate Repository context (highest priority due to performance issues)
3. Migrate Host context
4. Migrate Deployment context
5. Migrate CICD context
6. Final testing and optimization
7. Clean up legacy code

### Dependencies
- SWR library: `swr`
- Ensure Next.js App Router compatibility
- Update any components that directly access the context

## Phase 1: Infrastructure Setup

### 1.1 Install and Configure SWR

```bash
npm install swr
```

### 1.2 Create SWR Provider Wrapper

Create a file at `/src/components/providers/SWRProvider.tsx`:

```tsx
import { SWRConfig } from 'swr';

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
        revalidateOnReconnect: true,
        dedupingInterval: 60000, // 1 minute
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

### 1.3 Create Fetcher Utility

Create a file at `/src/lib/fetcher.ts`:

```typescript
// Generic fetcher for server actions
export async function actionFetcher<T>(
  action: (...args: any[]) => Promise<{ success: boolean; data?: T; error?: string }>,
  ...args: any[]
): Promise<T> {
  const response = await action(...args);
  
  if (!response.success) {
    throw new Error(response.error || 'Failed to fetch data');
  }
  
  return response.data as T;
}
```

### 1.4 Add SWR Provider to Layout

Ensure SWR provider is present in the app layout:

```tsx
// In src/app/layout.tsx
import { SWRProvider } from '@/components/providers/SWRProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProviders>
          <SWRProvider>
            <CoreProvider>{children}</CoreProvider>
          </SWRProvider>
        </ThemeProviders>
      </body>
    </html>
  );
}
```

## Phase 2: Repository Context Migration

### 2.1 Create Repository SWR Hooks

Create a file at `/src/hooks/useRepositoryData.ts`:

```typescript
import useSWR from 'swr';
import { actionFetcher } from '@/lib/fetcher';
import { 
  getRepositoriesWithStarred,
  getRepositories,
  getRepository
} from '@/app/[locale]/[tenant]/repositories/actions';
import type { Repository } from '@/app/[locale]/[tenant]/repositories/types';

// Hook for fetching all repositories with starred info
export function useRepositoriesWithStarred() {
  return useSWR(
    'repositories-with-starred',
    () => actionFetcher(getRepositoriesWithStarred),
    {
      dedupingInterval: 15 * 60 * 1000, // 15 minutes
      revalidateOnFocus: false
    }
  );
}

// Hook for fetching a single repository
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

// Utility functions for managing repository state
export function getStarredRepositories(
  repositories: Repository[],
  starredIds: string[]
): Repository[] {
  return repositories.filter(repo => starredIds.includes(repo.id));
}
```

### 2.2 Update Repository Context Provider

Refactor `/src/context/RepositoryContext.tsx`:

```typescript
'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useMemo,
} from 'react';
import { 
  useRepositoriesWithStarred,
  useRepositoryById
} from '@/hooks/useRepositoryData';
import { 
  Repository, 
  RepositoryFilter
} from '@/app/[locale]/[tenant]/repositories/types';
import {
  toggleStarRepositoryAction,
  clearRepositoriesCache
} from '@/app/[locale]/[tenant]/repositories/actions';

// Define interface
export interface RepositoryContextType {
  repositories: Repository[];
  filteredRepositories: Repository[];
  starredRepositories: Repository[];
  loading: boolean;
  error: string | null;
  connectionStatuses: { [key: string]: boolean };
  refreshRepositories: () => Promise<void>;
  filterRepositories: (options: RepositoryFilter) => void;
  toggleStarRepository: (repository: Repository) => Promise<void>;
}

// Create context
const RepositoryContext = createContext<RepositoryContextType | null>(null);

// Provider component
export function RepositoryProvider({ children }: { children: ReactNode }) {
  // Use the SWR hook
  const { 
    data, 
    error, 
    mutate: refreshData 
  } = useRepositoriesWithStarred();
  
  // Setup filter state
  const [filter, setFilter] = useState<RepositoryFilter>({
    query: '',
    status: 'all',
    type: 'all',
    sortBy: 'name',
    sortDir: 'asc'
  });
  
  // Extract data from SWR response
  const repositories = useMemo(() => 
    data?.repositories || [], 
    [data?.repositories]
  );
  
  const starredRepositoryIds = useMemo(() => 
    data?.starredRepositoryIds || [], 
    [data?.starredRepositoryIds]
  );
  
  // Calculate starredRepositories
  const starredRepositories = useMemo(() => 
    repositories.filter(repo => starredRepositoryIds.includes(repo.id)),
    [repositories, starredRepositoryIds]
  );
  
  // Apply filters
  const filteredRepositories = useMemo(() => {
    let filtered = [...repositories];
    
    // Apply text search
    if (filter.query) {
      const query = filter.query.toLowerCase();
      filtered = filtered.filter(
        repo => 
          repo.name.toLowerCase().includes(query) ||
          (repo.url && repo.url.toLowerCase().includes(query))
      );
    }
    
    // Apply type filter
    if (filter.type !== 'all') {
      filtered = filtered.filter(
        repo => repo.providerType === filter.type
      );
    }
    
    // Apply sorting
    return filtered.sort((a, b) => {
      if (filter.sortBy === 'name') {
        return filter.sortDir === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      return 0;
    });
  }, [repositories, filter]);
  
  // Filter repositories
  const filterRepositories = useCallback((options: RepositoryFilter) => {
    setFilter(prev => ({ ...prev, ...options }));
  }, []);
  
  // Toggle star repository
  const toggleStarRepository = useCallback(async (repository: Repository) => {
    try {
      const isCurrentlyStarred = starredRepositoryIds.includes(repository.id);
      
      // Optimistic update
      const newStarredIds = isCurrentlyStarred
        ? starredRepositoryIds.filter(id => id !== repository.id)
        : [...starredRepositoryIds, repository.id];
      
      // Update local state immediately
      mutate(
        { 
          repositories, 
          starredRepositoryIds: newStarredIds 
        },
        false
      );
      
      // Call API
      await toggleStarRepositoryAction(repository.id, !isCurrentlyStarred);
      
      // Refresh data in background
      refreshData();
    } catch (error) {
      console.error('Error toggling star:', error);
      // Revert optimistic update on error
      refreshData();
    }
  }, [repositories, starredRepositoryIds, refreshData]);
  
  // Refresh repositories
  const refreshRepositories = useCallback(async () => {
    try {
      // Clear server cache
      await clearRepositoriesCache();
      // Revalidate SWR data
      await refreshData();
    } catch (err) {
      console.error('Error refreshing repositories:', err);
    }
  }, [refreshData]);
  
  // Connection statuses
  const connectionStatuses = useMemo(() => {
    const statuses: { [key: string]: boolean } = {};
    repositories.forEach(repo => {
      statuses[repo.id] = repo.syncStatus === 'SYNCED';
    });
    return statuses;
  }, [repositories]);
  
  // Create context value
  const contextValue = useMemo(
    () => ({
      repositories,
      filteredRepositories,
      starredRepositories,
      loading: !data && !error,
      error: error ? String(error) : null,
      connectionStatuses,
      refreshRepositories,
      filterRepositories,
      toggleStarRepository,
    }),
    [
      repositories,
      filteredRepositories,
      starredRepositories,
      data,
      error,
      connectionStatuses,
      refreshRepositories,
      filterRepositories,
      toggleStarRepository,
    ],
  );
  
  return (
    <RepositoryContext.Provider value={contextValue}>
      {children}
    </RepositoryContext.Provider>
  );
}

// Hook to use the context
export function useRepository() {
  const context = useContext(RepositoryContext);
  
  if (!context) {
    console.warn('[useRepository] Repository context is null, returning fallback');
    return {
      repositories: [],
      filteredRepositories: [],
      starredRepositories: [],
      loading: true,
      error: null,
      connectionStatuses: {},
      refreshRepositories: async () => {},
      filterRepositories: () => {},
      toggleStarRepository: async () => {},
    };
  }
  
  return context;
}
```

### 2.3 Update Server Actions for SWR Compatibility

Ensure `/src/app/[locale]/[tenant]/repositories/actions.ts` has consistent return types for SWR:

```typescript
// Add a function to toggle star status
export async function toggleStarRepositoryAction(
  repositoryId: string,
  shouldStar: boolean
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    if (shouldStar) {
      return await starRepositoryAction(repositoryId);
    } else {
      return await unstarRepositoryAction(repositoryId);
    }
  } catch (error: any) {
    console.error('Error toggling star status:', error);
    return { success: false, error: error.message || 'Failed to toggle star status' };
  }
}
```

## Phase 3: Host Context Migration

### 3.1 Create Host SWR Hooks

Create a file at `/src/hooks/useHostData.ts`:

```typescript
import useSWR from 'swr';
import { actionFetcher } from '@/lib/fetcher';
import { 
  getHosts,
  getHost,
  testHostConnection
} from '@/app/[locale]/[tenant]/hosts/types';
import type { Host } from '@/app/[locale]/[tenant]/hosts/types';

// Hook for fetching all hosts
export function useHosts() {
  return useSWR(
    'hosts',
    () => actionFetcher(getHosts),
    {
      dedupingInterval: 15 * 60 * 1000, // 15 minutes
      revalidateOnFocus: false
    }
  );
}

// Hook for fetching a single host
export function useHostById(id: string | null) {
  return useSWR(
    id ? `host-${id}` : null,
    () => id ? actionFetcher(getHost, id) : null,
    {
      dedupingInterval: 60 * 1000, // 1 minute
      revalidateOnFocus: false
    }
  );
}

// Hook for host connection status
export function useHostConnectionStatus(id: string | null) {
  return useSWR(
    id ? `host-connection-${id}` : null,
    () => id ? actionFetcher(testHostConnection, id) : null,
    {
      dedupingInterval: 30 * 1000, // 30 seconds
      revalidateOnFocus: false,
      refreshInterval: 60 * 1000, // Refresh every minute
    }
  );
}
```

### 3.2 Update Host Context Provider

Similar pattern to the Repository context migration:

```typescript
'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useMemo,
} from 'react';
import { useHosts } from '@/hooks/useHostData';
import { Host } from '@/app/[locale]/[tenant]/hosts/types';

// Define context type
export interface HostContextType {
  hosts: Host[];
  filteredHosts: Host[];
  loading: boolean;
  error: any | null;
  connectionStatuses: { [key: string]: { status: string; lastChecked: Date } };
  fetchHosts: () => Promise<void>;
  // Add other methods as needed
}

// Create context
const HostContext = createContext<HostContextType | undefined>(undefined);

// Provider component
export function HostProvider({ children }: { children: ReactNode }) {
  // Use the SWR hook
  const { data, error, mutate: refreshData } = useHosts();
  
  // Setup filter state
  const [filter, setFilter] = useState({
    query: '',
    status: 'all',
    type: 'all',
    sortBy: 'name',
    sortDir: 'asc'
  });
  
  // Implement the rest of the provider similar to the Repository context
  // ...
  
  return (
    <HostContext.Provider value={contextValue}>
      {children}
    </HostContext.Provider>
  );
}

// Hook to use the context
export function useHost() {
  const context = useContext(HostContext);
  
  if (context === undefined) {
    throw new Error('useHost must be used within a HostProvider');
  }
  
  return context;
}
```

## Phase 4: Deployment Context Migration

Similar pattern to Repository and Host context migrations.

## Phase 5: CICD Context Migration

Similar pattern to previous context migrations.

## Phase 6: Testing and Optimization

### 6.1 Performance Testing

1. Measure and compare page load times before and after migration
2. Check network request count and timing
3. Test navigation between pages for caching effectiveness
4. Test under simulated slow network conditions

### 6.2 Functional Testing

1. Create test cases for each workflow
2. Verify all CRUD operations work correctly
3. Test cache invalidation scenarios
4. Test error handling and recovery

### 6.3 Optimization

1. Review SWR configuration for optimal performance
2. Adjust deduping intervals based on data volatility
3. Optimize data selectors to minimize re-renders
4. Implement data prefetching for common navigation paths

## Rollback Plan

If issues are encountered:

1. Keep both implementations side by side during migration
2. Add feature flags to toggle between implementations
3. Document any data migration concerns
4. Have a clear rollback process for each phase

## Best Practices

1. **Consistent API Responses**: Ensure all server actions return data in the same format
2. **Error Handling**: Implement proper error handling at all levels
3. **Data Normalization**: Normalize data for efficient caching
4. **Prefetching**: For predictable navigation patterns, implement prefetching
5. **Monitoring**: Add performance monitoring to track improvements
6. **Documentation**: Document the new caching strategy for future developers

---

## Conclusion

This migration will significantly improve application performance, especially navigation between pages. By leveraging SWR, we'll benefit from a standardized caching solution with automatic revalidation, simpler code, and improved user experience.

The phased approach allows us to migrate one context at a time, minimizing risk and allowing for testing at each stage. Most importantly, it will provide a more maintainable solution going forward, eliminating the need for further refactoring of the caching system.