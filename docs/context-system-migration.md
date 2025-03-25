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
9. [Phase 7: Code Cleanup](#phase-7-code-cleanup)
10. [Migration Checklist](#migration-checklist)

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
We'll take a comprehensive replacement approach, with no backward compatibility:

1. Set up SWR infrastructure
2. Implement new SWR-based contexts from scratch
3. Replace all context providers with new versions in one commit
4. Test thoroughly
5. Remove all legacy code

### Dependencies
- SWR library: `swr`
- Ensure Next.js App Router compatibility

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

### 1.4 Integrate SWR Provider in App Layout

Update `/src/app/layout.tsx`:

```tsx
import './globals.css';
import { Inter } from 'next/font/google';
import { Metadata } from 'next';
import { ThemeProviders } from '@/components/providers';
import { SWRProvider } from '@/components/providers/SWRProvider';
import { cookies } from 'next/headers';
import { CoreProvider, SidebarProvider } from '@/context';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'sans-serif'],
  adjustFontFallback: true,
});

// ... metadata ...

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Get theme from cookies for server-side rendering
  const cookieStore = await cookies();
  const themeCookie = cookieStore.get('theme');
  const theme = (themeCookie?.value ?? 'system') as 'light' | 'dark' | 'system';

  return (
    <html lang="en" className={`${inter.className} js-loading`} suppressHydrationWarning>
      <head>
        {/* ... */}
      </head>
      <body>
        <ThemeProviders defaultTheme={theme}>
          <SWRProvider>
            <SidebarProvider>
              <CoreProvider>{children}</CoreProvider>
            </SidebarProvider>
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
  getRepository,
  starRepositoryAction,
  unstarRepositoryAction,
  clearRepositoriesCache
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

// Toggle star status for a repository
export async function toggleStar(
  repository: Repository,
  isStarred: boolean,
  mutate: Function
) {
  try {
    // Call the appropriate action
    if (isStarred) {
      await unstarRepositoryAction(repository.id);
    } else {
      await starRepositoryAction(repository.id);
    }
    
    // Revalidate data
    await mutate();
    return true;
  } catch (error) {
    console.error('Error toggling star:', error);
    return false;
  }
}

// Clear cache and refresh data
export async function refreshRepositories(mutate: Function) {
  try {
    await clearRepositoriesCache();
    await mutate();
    return true;
  } catch (error) {
    console.error('Error refreshing repositories:', error);
    return false;
  }
}
```

### 2.2 Create New Repository Context

Create a new file at `/src/context/NewRepositoryContext.tsx`:

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
import { useRepositoriesWithStarred } from '@/hooks/useRepositoryData';
import { toggleStar, refreshRepositories } from '@/hooks/useRepositoryData';
import { Repository } from '@/app/[locale]/[tenant]/repositories/types';

// Define context type
interface RepositoryContextType {
  repositories: Repository[];
  filteredRepositories: Repository[];
  starredRepositories: Repository[];
  loading: boolean;
  error: string | null;
  connectionStatuses: { [key: string]: boolean };
  refreshRepositories: () => Promise<void>;
  filterRepositories: (options: any) => void;
  toggleStarRepository: (repository: Repository) => Promise<void>;
}

// Create context
const RepositoryContext = createContext<RepositoryContextType | null>(null);

// Provider component
export function RepositoryProvider({ children }: { children: ReactNode }) {
  // Use SWR hook
  const { data, error, mutate } = useRepositoriesWithStarred();
  
  // Local state for filtering
  const [filter, setFilter] = useState({
    query: '',
    status: 'all',
    type: 'all',
    sortBy: 'name',
    sortDir: 'asc',
  });
  
  // Extract repositories and starred IDs from data
  const repositories = useMemo(() => 
    data?.repositories || [], 
    [data?.repositories]
  );
  
  const starredRepositoryIds = useMemo(() => 
    data?.starredRepositoryIds || [], 
    [data?.starredRepositoryIds]
  );
  
  // Calculate derived data
  const starredRepositories = useMemo(() => 
    repositories.filter(repo => starredRepositoryIds.includes(repo.id)),
    [repositories, starredRepositoryIds]
  );
  
  const filteredRepositories = useMemo(() => {
    let filtered = [...repositories];
    
    // Text search filter
    if (filter.query) {
      const query = filter.query.toLowerCase();
      filtered = filtered.filter(
        repo => 
          repo.name.toLowerCase().includes(query) ||
          (repo.url && repo.url.toLowerCase().includes(query))
      );
    }
    
    // Type filter
    if (filter.type !== 'all') {
      filtered = filtered.filter(
        repo => repo.providerType === filter.type
      );
    }
    
    // Sorting
    filtered.sort((a, b) => {
      if (filter.sortBy === 'name') {
        return filter.sortDir === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      return 0;
    });
    
    return filtered;
  }, [repositories, filter]);
  
  // Connection statuses
  const connectionStatuses = useMemo(() => {
    const statuses: { [key: string]: boolean } = {};
    repositories.forEach(repo => {
      statuses[repo.id] = repo.syncStatus === 'SYNCED';
    });
    return statuses;
  }, [repositories]);
  
  // Methods
  const filterRepositories = useCallback((options: any) => {
    setFilter(prev => ({ ...prev, ...options }));
  }, []);
  
  const handleRefreshRepositories = useCallback(async () => {
    await refreshRepositories(mutate);
  }, [mutate]);
  
  const handleToggleStar = useCallback(async (repository: Repository) => {
    const isStarred = starredRepositoryIds.includes(repository.id);
    await toggleStar(repository, isStarred, mutate);
  }, [starredRepositoryIds, mutate]);
  
  // Create context value
  const contextValue = useMemo(() => ({
    repositories,
    filteredRepositories,
    starredRepositories,
    loading: !data && !error,
    error: error ? String(error) : null,
    connectionStatuses,
    refreshRepositories: handleRefreshRepositories,
    filterRepositories,
    toggleStarRepository: handleToggleStar,
  }), [
    repositories,
    filteredRepositories,
    starredRepositories,
    data,
    error,
    connectionStatuses,
    handleRefreshRepositories,
    filterRepositories,
    handleToggleStar,
  ]);
  
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
} from '@/app/[locale]/[tenant]/hosts/actions';
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

### 3.2 Create New Host Context

Create a new file at `/src/context/NewHostContext.tsx`:

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

// Host context type definition
interface HostContextType {
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
  // Use SWR hook
  const { data, error, mutate } = useHosts();
  
  // Local state for filtering
  const [filter, setFilter] = useState({
    query: '',
    status: 'all',
    type: 'all',
    sortBy: 'name',
    sortDir: 'asc'
  });
  
  // Extract hosts from data
  const hosts = useMemo(() => data || [], [data]);
  
  // Filtered hosts
  const filteredHosts = useMemo(() => {
    let filtered = [...hosts];
    
    // Apply filters here...
    
    return filtered;
  }, [hosts, filter]);
  
  // Connection statuses (simplified example)
  const connectionStatuses = useMemo(() => {
    const statuses: { [key: string]: { status: string; lastChecked: Date } } = {};
    hosts.forEach(host => {
      statuses[host.id] = { 
        status: host.status || 'unknown',
        lastChecked: new Date()
      };
    });
    return statuses;
  }, [hosts]);
  
  // Methods
  const fetchHosts = useCallback(async () => {
    await mutate();
  }, [mutate]);
  
  // Context value
  const contextValue = useMemo(() => ({
    hosts,
    filteredHosts,
    loading: !data && !error,
    error: error || null,
    connectionStatuses,
    fetchHosts,
  }), [
    hosts,
    filteredHosts,
    data,
    error,
    connectionStatuses,
    fetchHosts,
  ]);
  
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

Follow similar pattern to Host context.

## Phase 5: CICD Context Migration

Follow similar pattern to Host context.

## Phase 6: Testing and Optimization

### 6.1 Integration and Testing

Create a temporary branch for testing the new context system. Build a test plan covering:

1. Data fetching (all endpoints)
2. Data mutations (create, update, delete)
3. Page navigation performance
4. UI responsiveness
5. Error handling

### 6.2 Final Integration

Once testing is complete and all functionality verified:

1. Create a new branch for the final migration
2. Copy all new context files to their final locations
3. Update imports in the central `/src/context/index.ts` file
4. Commit and merge the changes
5. Verify in staging environment before deploying to production

### 6.3 Performance Optimization

1. Review network requests during navigation
2. Adjust SWR configuration for optimal performance
3. Implement prefetching for common navigation paths
4. Consider adding Suspense boundaries for loading states

## Phase 7: Code Cleanup

Once the new system is verified working, remove all legacy code in a single cleanup commit.

### 7.1 Files to Remove

```
/src/lib/cache.ts                        # Server-side cache implementation
/src/context/RepositoryContext.tsx       # Old repository context
/src/context/HostContext.tsx             # Old host context
/src/context/DeploymentContext.tsx       # Old deployment context
/src/context/CICDContext.tsx             # Old CICD context
```

### 7.2 Code to Remove

1. **AppContext.tsx**:
   - Remove `persistedData` object and all references to it
   - Remove any legacy initialization code

2. **Server Actions**:
   - Remove server-side cache logic 
   - Simplify server actions to focus on data fetching

3. **Components**:
   - Remove any direct persistedData references 
   - Remove any workarounds for caching issues

### 7.3 Cleanup Checklist

- [ ] Remove `persistedData` and all references
- [ ] Remove server-side cache implementation
- [ ] Remove all old context files
- [ ] Clean up imports to prevent circular dependencies
- [ ] Remove any unnecessary localStorage caching
- [ ] Remove all debug logs related to caching
- [ ] Remove any conditionals checking for cached data
- [ ] Update or remove any documentation referring to the old caching system

## Migration Checklist

### Phase 1: Infrastructure Setup
- [ ] Install SWR package
- [ ] Create SWR provider wrapper
- [ ] Create fetcher utility
- [ ] Update app layout to include SWR provider

### Phase 2: Repository Context
- [ ] Create repository SWR hooks
- [ ] Create new repository context
- [ ] Test repository context in isolation

### Phase 3: Host Context
- [ ] Create host SWR hooks
- [ ] Create new host context
- [ ] Test host context in isolation

### Phase 4: Deployment Context
- [ ] Create deployment SWR hooks
- [ ] Create new deployment context
- [ ] Test deployment context in isolation

### Phase 5: CICD Context
- [ ] Create CICD SWR hooks
- [ ] Create new CICD context
- [ ] Test CICD context in isolation

### Phase 6: Integration
- [ ] Update context exports in index.ts
- [ ] Test all contexts together
- [ ] Measure performance improvements
- [ ] Fix any integration issues

### Phase 7: Cleanup
- [ ] Remove `persistedData` from AppContext
- [ ] Remove all old context implementations
- [ ] Remove server-side cache implementation
- [ ] Clean up any remaining code

## Conclusion

This migration will completely replace our custom caching solution with SWR, a battle-tested library specifically designed for this purpose. The new system will eliminate caching inconsistencies, improve performance, and dramatically simplify our codebase.

By implementing the migration as a clean break rather than maintaining backward compatibility, we can fully remove all the problematic code and start fresh. This approach, while more disruptive in the short term, will provide a cleaner and more maintainable solution going forward.