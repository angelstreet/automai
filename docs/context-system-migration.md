# Context System Migration Plan

## Overview

This document outlines a comprehensive plan to optimize our Next.js application's context system to resolve redundant API calls, prevent excessive re-rendering, and improve overall application performance. The focus is on implementing a true singleton pattern for context providers, ensuring data is fetched only once and properly shared across components.

## Current Architecture Issues

1. **Redundant API calls** - The same data (especially user data) is fetched multiple times across different pages
2. **Inconsistent context access patterns** - Direct imports from specific context files instead of the centralized entry point
3. **Missing cross-context communication** - Contexts don't effectively share data, causing duplicate fetching
4. **Non-singleton context instances** - Multiple instances of the same context provider in the component tree
5. **Inefficient state management** - Excessive re-renders due to unoptimized context values and dependency arrays
6. **Inadequate request protection** - No mechanism to prevent duplicate API calls for the same data
7. **Complex persistence logic** - Direct localStorage access with inefficient serialization

## Migration Phases

### Phase 1: Immediate Improvements (1-2 days)

#### Objectives
- Memoize context values to prevent unnecessary re-renders
- Optimize Bridge component to reduce cascading updates
- Fix initialization checks to prevent multiple data fetches

#### Files Impacted
- `src/context/AppContext.tsx`
- `src/context/HostContext.tsx`
- `src/context/RepositoryContext.tsx`
- `src/context/DeploymentContext.tsx`
- `src/context/CICDContext.tsx`

#### Implementation Details

1. **Memoize Context Values in Each Provider**

```javascript
// Example for HostContext.tsx
const memoizedValue = useMemo(() => ({
  // State properties
  hosts: state.hosts,
  filteredHosts: state.filteredHosts,
  selectedHost: state.selectedHost,
  // ... other state properties
  
  // Action methods
  fetchHosts,
  getHostById,
  addHost,
  // ... other methods
}), [
  state.hosts, 
  state.filteredHosts,
  state.selectedHost,
  // ... minimal dependencies
  fetchHosts,
  getHostById,
  addHost
]);

return (
  <HostContext.Provider value={memoizedValue}>
    {children}
  </HostContext.Provider>
);
```

2. **Optimize Bridge Component**

```javascript
// In AppContext.tsx
const AppContextBridge = React.memo(({ children }) => {
  const { contextState } = useContext(AppContext);
  const renderCount = useRef(0);
  
  useEffect(() => {
    renderCount.current++;
    console.log(`[AppContext] Bridge render count: ${renderCount.current}`);
  });
  
  // Get values from each context, with safety checks
  const hostContext = contextState.host ? useHostContext() : null;
  const deploymentContext = contextState.deployment ? useDeploymentContext() : null;
  const repositoryContext = contextState.repository ? useRepositoryContext() : null;
  const cicdContext = contextState.cicd ? useCICDContext() : null;
  const userContext = useUserContext();
  
  // Memoize the combined context value
  const appContextValue = useMemo(() => ({
    host: hostContext,
    deployment: deploymentContext,
    repository: repositoryContext,
    cicd: cicdContext,
    user: userContext
  }), [hostContext, deploymentContext, repositoryContext, cicdContext, userContext]);
  
  return (
    <InnerAppContext.Provider value={appContextValue}>
      {children}
    </InnerAppContext.Provider>
  );
});
```

3. **Fix Initialization Logic**

```javascript
// In AppContext.tsx
useEffect(() => {
  // Check if we've already run the initialization using globalInitStatus
  const allInitialized = 
    globalInitStatus.repository && 
    globalInitStatus.deployment && 
    globalInitStatus.host && 
    globalInitStatus.cicd;
    
  if (PERSIST_CONTEXTS && !allInitialized) {
    // Initialize contexts only once
    initContext('repository');
    initContext('deployment');
    initContext('host');
    initContext('cicd');
    
    log('[AppContext] Pre-initializing all contexts for persistence');
  }
}, [initContext]);
```

### Phase 2: Context Registry Implementation (2-3 days)

#### Objectives
- Create a centralized context registry
- Implement batch initialization
- Eliminate direct dependency on globalInitStatus

#### Files Impacted
- New: `src/context/registry.ts`
- `src/context/AppContext.tsx`
- `src/context/index.ts`

#### Implementation Details

1. **Create Context Registry**

```typescript
// src/context/registry.ts
export type ContextType = 'host' | 'repository' | 'deployment' | 'cicd' | 'user';

interface ContextRegistry {
  initialized: Record<ContextType, boolean>;
  data: Record<ContextType, any>;
  initialize: (type: ContextType) => void;
  batchInitialize: (types: ContextType[]) => void;
  registerData: (type: ContextType, data: any) => void;
  getData: <T>(type: ContextType) => T | null;
}

export const contextRegistry: ContextRegistry = {
  initialized: {
    host: false,
    repository: false,
    deployment: false,
    cicd: false,
    user: true
  },
  data: {},
  initialize(type) {
    this.initialized[type] = true;
    console.log(`[Registry] Initialized ${type} context`);
  },
  batchInitialize(types) {
    types.forEach(type => this.initialized[type] = true);
    console.log(`[Registry] Batch initialized contexts: ${types.join(', ')}`);
  },
  registerData(type, data) {
    this.data[type] = data;
  },
  getData<T>(type: ContextType): T | null {
    return this.data[type] as T || null;
  }
};
```

2. **Update AppContext to Use Registry**

```typescript
// In AppContext.tsx
import { contextRegistry, ContextType } from './registry';

// Remove globalInitStatus and use contextRegistry instead

// In AppProvider
// Provider component that composes all other providers
export function AppProvider({ children }: { children: ReactNode }) {
  const [contextState, setContextState] = useState<Record<ContextType, boolean>>(() => 
    ({...contextRegistry.initialized}));
  
  const initContext = useCallback((name: ContextType) => {
    if (!contextState[name]) {
      contextRegistry.initialize(name);
      setContextState({...contextRegistry.initialized});
    }
  }, [contextState]);

  useEffect(() => {
    // Only initialize if not already done
    const needsInitialization = !Object.values(contextRegistry.initialized)
      .every(initialized => initialized);
      
    if (PERSIST_CONTEXTS && needsInitialization) {
      contextRegistry.batchInitialize(['repository', 'deployment', 'host', 'cicd']);
      setContextState({...contextRegistry.initialized});
      console.log('[AppContext] Completed context batch initialization');
    }
  }, []);
  
  // Rest of the component remains similar
}
```

3. **Update Context Index**

```typescript
// src/context/index.ts
export { AppProvider } from './AppContext';
export { contextRegistry } from './registry';
export { useHost, useHostList, useHostActions } from './HostContext';
// ... other exports
```

### Phase 3: Persistence Layer Optimization (3-4 days)

#### Objectives
- Create a unified storage service
- Eliminate direct localStorage access
- Implement batched persistence updates

#### Files Impacted
- New: `src/services/storage.ts`
- `src/context/HostContext.tsx`
- `src/context/RepositoryContext.tsx`
- `src/context/DeploymentContext.tsx`
- `src/context/CICDContext.tsx`

#### Implementation Details

1. **Create NextStorage Service**

```typescript
// src/services/storage.ts
export interface StorageService {
  getItem<T>(key: string): T | null;
  setItem<T>(key: string, value: T): void;
  removeItem(key: string): void;
  clear(): void;
}

class NextStorage implements StorageService {
  private cache: Record<string, any> = {};
  private initialized = false;
  private pendingUpdates: Set<string> = new Set();
  private updateTimer: NodeJS.Timeout | null = null;
  
  constructor() {
    if (typeof window !== 'undefined') {
      this.hydrate();
      this.initialized = true;
    }
  }
  
  private hydrate() {
    // Load all relevant keys
    const contextKeys = ['host_data', 'repository_data', 'cicd_data', 'deployment_data'];
    
    contextKeys.forEach(key => {
      try {
        const item = localStorage.getItem(key);
        if (item) this.cache[key] = JSON.parse(item);
      } catch (e) {
        console.error(`[Storage] Failed to hydrate ${key}`, e);
      }
    });
    
    console.log('[Storage] Hydrated cache with keys:', Object.keys(this.cache));
  }
  
  getItem<T>(key: string): T | null {
    return this.cache[key] || null;
  }
  
  setItem<T>(key: string, value: T): void {
    this.cache[key] = value;
    this.scheduleUpdate(key);
  }
  
  removeItem(key: string): void {
    delete this.cache[key];
    this.scheduleUpdate(key);
  }
  
  clear(): void {
    this.cache = {};
    this.pendingUpdates.clear();
    
    if (this.initialized && typeof window !== 'undefined') {
      const contextKeys = ['host_data', 'repository_data', 'cicd_data', 'deployment_data'];
      contextKeys.forEach(key => localStorage.removeItem(key));
    }
  }
  
  private scheduleUpdate(key: string): void {
    this.pendingUpdates.add(key);
    
    if (!this.updateTimer) {
      this.updateTimer = setTimeout(() => {
        this.flushUpdates();
      }, 500); // Batch updates with 500ms delay
    }
  }
  
  private flushUpdates(): void {
    if (!this.initialized || typeof window === 'undefined') {
      return;
    }
    
    this.pendingUpdates.forEach(key => {
      try {
        localStorage.setItem(key, JSON.stringify(this.cache[key]));
      } catch (e) {
        console.error(`[Storage] Failed to persist ${key}`, e);
      }
    });
    
    console.log('[Storage] Flushed updates for keys:', Array.from(this.pendingUpdates));
    
    this.pendingUpdates.clear();
    this.updateTimer = null;
  }
}

// Create singleton instance
export const storageService = new NextStorage();
```

2. **Update Host Context**

```typescript
// In HostContext.tsx
import { storageService } from '@/services/storage';

// Replace persistedData and localStorage usage with storageService

// Initialize state from storage
const [state, setState] = useState<HostData>(() => {
  const cached = storageService.getItem<HostData>('host_data');
  if (cached) {
    console.log('[HostContext] Using cached host data from storage service');
    return cached;
  }
  return initialHostData;
});

// Persist data changes
useEffect(() => {
  if (state.hosts.length > 0 && !state.loading) {
    storageService.setItem('host_data', {
      hosts: state.hosts,
      filteredHosts: state.filteredHosts,
      loading: false,
      error: state.error
    });
    
    console.log('[HostContext] Updated host data in storage service');
  }
}, [state.hosts, state.loading, state.error]);
```

3. **Similar Updates for Other Contexts**
Apply the same pattern to Repository, Deployment, and CICD contexts, using the appropriate storage keys.

### Phase 4: Context Selectors (3-4 days)

#### Objectives
- Create granular selectors for specific context data
- Prevent unnecessary re-renders when unrelated state changes
- Improve component performance

#### Files Impacted
- New: `src/context/utils.ts`
- `src/context/HostContext.tsx`
- `src/context/RepositoryContext.tsx`
- `src/context/DeploymentContext.tsx`
- `src/context/CICDContext.tsx`
- Various components that consume contexts

#### Implementation Details

1. **Create Selector Utils**

```typescript
// src/context/utils.ts
import { useContext, useCallback, useMemo } from 'react';

export function createSelector<Context, Selected>(
  useContextHook: () => Context, 
  selector: (state: Context) => Selected
) {
  return function useContextSelector(): Selected {
    const context = useContextHook();
    
    if (!context) {
      throw new Error('Context not available in selector');
    }
    
    return useMemo(() => selector(context), [context]);
  };
}
```

2. **Implement Host Context Selectors**

```typescript
// In HostContext.tsx
// Add granular selectors
export const useHostList = createSelector(
  useHostContext,
  (context) => ({
    hosts: context.hosts,
    filteredHosts: context.filteredHosts,
    loading: context.loading,
    error: context.error
  })
);

export const useHostActions = createSelector(
  useHostContext,
  (context) => ({
    fetchHosts: context.fetchHosts,
    addHost: context.addHost,
    updateHostById: context.updateHostById,
    removeHost: context.removeHost,
    testConnection: context.testConnection,
    testAllConnections: context.testAllConnections
  })
);

export const useHostFilters = createSelector(
  useHostContext,
  (context) => ({
    filter: context.filter,
    applyFilter: (filter) => {
      // Your filter implementation
    }
  })
);
```

3. **Update Component Usage**

```typescript
// In a component file
import { useHostList, useHostActions } from '@/context';

function HostComponent() {
  // Only re-renders when hosts or loading change
  const { hosts, loading } = useHostList();
  
  // Only gets action references, doesn't re-render when hosts change
  const { fetchHosts, testConnection } = useHostActions();
  
  // Component logic
}
```

### Phase 5: Implement Data Fetching with SWR/React Query (4-5 days)

#### Objectives
- Replace custom fetch with battle-tested data fetching libraries
- Leverage built-in caching, deduplication, and revalidation
- Support Suspense for better loading UX

#### Files Impacted
- `package.json` (new dependencies)
- `src/context/HostContext.tsx`
- `src/context/RepositoryContext.tsx`
- `src/context/DeploymentContext.tsx`
- `src/context/CICDContext.tsx`
- New: `src/hooks/useHosts.ts`, etc.

#### Implementation Details

1. **Install Dependencies**

```bash
npm install swr
# or for React Query
npm install @tanstack/react-query
```

2. **Create SWR Data Hooks**

```typescript
// src/hooks/useHosts.ts
import useSWR from 'swr';
import { storageService } from '@/services/storage';
import { getHosts } from '@/app/[locale]/[tenant]/hosts/actions';
import type { Host } from '@/app/[locale]/[tenant]/hosts/types';

export function useHostData() {
  const { data, error, mutate, isLoading, isValidating } = useSWR(
    'hosts',
    async () => {
      const response = await getHosts();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch hosts');
      }
      return response.data;
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 30000,
      fallbackData: storageService.getItem('host_data')?.hosts || [],
      onSuccess: (data) => {
        storageService.setItem('host_data', {
          hosts: data,
          filteredHosts: data,
          loading: false,
          error: null
        });
      }
    }
  );
  
  return {
    hosts: data || [],
    isLoading,
    isValidating,
    error,
    mutate
  };
}
```

3. **Update Host Context to Use SWR**

```typescript
// In HostContext.tsx
import { useHostData } from '@/hooks/useHosts';

export const HostProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { hosts, isLoading, error, mutate } = useHostData();
  
  // Use the SWR-managed state
  const [state, setState] = useState<HostData>(() => ({
    ...initialHostData,
    hosts: hosts,
    filteredHosts: hosts,
    loading: isLoading,
    error: error ? { code: 'FETCH_ERROR', message: error.message } : null
  }));
  
  // Update state when SWR data changes
  useEffect(() => {
    setState(prev => ({
      ...prev,
      hosts,
      filteredHosts: applyFilters(hosts),
      loading: isLoading,
      error: error ? { code: 'FETCH_ERROR', message: error.message } : null
    }));
  }, [hosts, isLoading, error]);
  
  // Refactor fetchHosts to use SWR's mutate
  const fetchHosts = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      const updatedHosts = await mutate();
      return updatedHosts || [];
    } catch (e) {
      console.error('[HostContext] Error in fetchHosts:', e);
      return [];
    }
  }, [mutate]);
  
  // Rest of provider remains similar
};
```

4. **Create Suspense-Compatible Hooks**

```typescript
// In hooks/useHosts.ts
export function useHostsWithSuspense() {
  const { hosts, isLoading, error, mutate } = useHostData();
  
  if (isLoading) {
    throw new Promise(resolve => {
      // This will be caught by Suspense boundary
      const checkData = () => {
        if (!isLoading) {
          resolve(null);
        } else {
          setTimeout(checkData, 100);
        }
      };
      checkData();
    });
  }
  
  if (error) {
    throw error;
  }
  
  return { hosts, mutate };
}
```

## Files Impacted Summary

| File | Changes |
|------|---------|
| `src/context/AppContext.tsx` | Optimize initialization, memoize context bridge, fix dependency tracking |
| `src/context/HostContext.tsx` | Add selectors, improve persistence, optimize data fetching |
| `src/context/RepositoryContext.tsx` | Add selectors, improve persistence, optimize data fetching |
| `src/context/DeploymentContext.tsx` | Add selectors, improve persistence, optimize data fetching |
| `src/context/CICDContext.tsx` | Add selectors, improve persistence, optimize data fetching |
| `src/context/registry.ts` (new) | Implement context registry for centralized tracking |
| `src/context/utils.ts` (new) | Add selector utilities |
| `src/services/storage.ts` (new) | Implement storage service |
| `src/hooks/useHosts.ts` (new) | Create SWR-based data hooks |
| `src/hooks/useRepositories.ts` (new) | Create SWR-based data hooks |
| `src/hooks/useDeployments.ts` (new) | Create SWR-based data hooks |
| `src/hooks/useCICD.ts` (new) | Create SWR-based data hooks |
| `src/app/[locale]/[tenant]/hosts/_components/HostList.tsx` | Update to use selectors and optimized hooks |
| `src/app/[locale]/[tenant]/repositories/_components/RepositoryList.tsx` | Update to use selectors and optimized hooks |
| `src/app/[locale]/[tenant]/deployments/_components/DeploymentList.tsx` | Update to use selectors and optimized hooks |

## Migration Timeline

1. **Week 1**: Implement Phases 1-2
   - Add memoization to all contexts
   - Optimize the Bridge component 
   - Create context registry

2. **Week 2**: Implement Phase 3
   - Build storage service
   - Convert all contexts to use new storage

3. **Week 3**: Implement Phases 4-5
   - Add selectors to all contexts
   - Begin SWR integration

4. **Week 4**: Testing & Refinement
   - Component testing
   - Performance testing
   - Final optimization

## Testing Strategy

1. **Unit Testing**
   - Test storage service persistence
   - Test context selectors
   - Test SWR data hooks

2. **Integration Testing**
   - Test context composition
   - Test data flow through multiple contexts
   - Verify proper initialization order

3. **Performance Testing**
   - Measure render counts before and after
   - Track network request frequency
   - Validate memory usage

4. **User Experience Testing**
   - Verify loading states are appropriate
   - Ensure error handling works correctly
   - Check that UI is responsive during data operations

## Conclusion

This migration will significantly improve application performance by reducing unnecessary renders, preventing redundant network requests, and optimizing data flow between components. By leveraging well-established libraries and patterns, we'll also make the codebase more maintainable and easier to extend in the future.