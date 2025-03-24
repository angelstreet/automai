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

### Phase 1: Enforcing Singleton Pattern & Context Centralization (1-2 days)

#### Objectives
- Implement true singleton pattern for all contexts
- Create a centralized import mechanism
- Add request protection to prevent duplicate API calls
- Establish cross-context communication

#### Files Impacted
- `src/context/index.ts` (major update)
- `src/context/AppContext.tsx`
- `src/context/UserContext.tsx` (priority focus)
- `src/hooks/useRequestProtection.ts` (new)
- All context consumer components

#### Implementation Details

1. **Create Centralized Context Exports**

```typescript
// src/context/index.ts
// Single entry point for all context hooks
import { useUserContext } from './UserContext';
import { useHostContext } from './HostContext';
import { useRepositoryContext } from './RepositoryContext';
import { useDeploymentContext } from './DeploymentContext';
import { useCICDContext } from './CICDContext';

// Re-export with standardized names - THIS IS THE ONLY WAY COMPONENTS SHOULD ACCESS CONTEXT
export const useUser = useUserContext;
export const useHost = useHostContext;
export const useRepository = useRepositoryContext;
export const useDeployment = useDeploymentContext;
export const useCICD = useCICDContext;

// Export the provider for composition
export { AppProvider } from './AppContext';
```

2. **Create Request Protection Hook**

```typescript
// src/hooks/useRequestProtection.ts
import { useRef, useCallback } from 'react';

interface RequestState {
  inProgress: boolean;
  timestamp: number;
  result: any;
}

// Keep track of in-flight requests across the application
const requestCache: Record<string, RequestState> = {};

export function useRequestProtection() {
  const requestsRef = useRef<Set<string>>(new Set());
  
  // Hook to protect against duplicate requests
  const protectedFetch = useCallback(<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlMs: number = 2000
  ): Promise<T> => {
    // Add to component instance tracking
    requestsRef.current.add(key);
    
    const now = Date.now();
    const existing = requestCache[key];
    
    // If request is in progress, return the existing promise
    if (existing && existing.inProgress) {
      console.log(`[RequestProtection] Reusing in-flight request for ${key}`);
      return existing.result;
    }
    
    // If we have a cached result that's still fresh, use it
    if (existing && (now - existing.timestamp < ttlMs)) {
      console.log(`[RequestProtection] Using cached result for ${key} (age: ${now - existing.timestamp}ms)`);
      return Promise.resolve(existing.result);
    }
    
    // Start new request
    console.log(`[RequestProtection] Starting new request for ${key}`);
    
    // Create request state entry
    const requestState: RequestState = {
      inProgress: true,
      timestamp: now,
      result: fetchFn().then(result => {
        // Update cache when request completes
        if (requestCache[key]) {
          requestCache[key].inProgress = false;
          requestCache[key].result = result;
        }
        return result;
      }).catch(error => {
        // Clean up on error
        if (requestCache[key]) {
          requestCache[key].inProgress = false;
        }
        throw error;
      })
    };
    
    // Store in global cache
    requestCache[key] = requestState;
    
    return requestState.result;
  }, []);
  
  return { protectedFetch };
}
```

3. **Update UserContext with Request Protection**

```typescript
// src/context/UserContext.tsx - The most critical context to fix first
import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { getUser } from '@/app/actions/user';
import { useRequestProtection } from '@/hooks/useRequestProtection';

// Make sure there's only ONE instance of this context
const UserContext = createContext<UserContextType | undefined>(undefined);

// Flag to avoid double-initialization
let USER_CONTEXT_INITIALIZED = false;

export function UserProvider({ children }: { children: React.ReactNode }) {
  // Only log on first instance creation
  if (!USER_CONTEXT_INITIALIZED) {
    console.log('[UserContext] Creating singleton instance');
    USER_CONTEXT_INITIALIZED = true;
  }
  
  const [state, setState] = useState({
    user: null,
    loading: true,
    error: null,
    initialized: false
  });
  
  const { protectedFetch } = useRequestProtection();
  
  // Use protected fetch to prevent duplicate API calls
  const fetchUserData = useCallback(async (force = false) => {
    // Skip if we already have data and aren't forcing
    if (state.user && !force && state.initialized) {
      console.log('[UserContext] Using existing user data, skipping fetch');
      return state.user;
    }
    
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      // Use protected fetch with a unique key
      const result = await protectedFetch('user.getUser', async () => {
        console.log('[UserContext] Fetching user data from server');
        return await getUser();
      });
      
      if (result.success) {
        setState({
          user: result.data,
          loading: false,
          error: null,
          initialized: true
        });
        
        return result.data;
      } else {
        setState({
          user: null,
          loading: false,
          error: result.error,
          initialized: true
        });
        
        return null;
      }
    } catch (error) {
      setState({
        user: null,
        loading: false,
        error: 'Failed to fetch user data',
        initialized: true
      });
      
      return null;
    }
  }, [protectedFetch, state.user, state.initialized]);
  
  // Fetch user data on mount - only ONCE
  useEffect(() => {
    if (!state.initialized) {
      fetchUserData();
    }
  }, [fetchUserData, state.initialized]);
  
  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    user: state.user,
    loading: state.loading,
    error: state.error,
    fetchUserData
  }), [state.user, state.loading, state.error, fetchUserData]);
  
  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

// Hook for consuming user context
export function useUserContext() {
  const context = useContext(UserContext);
  
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserProvider');
  }
  
  return context;
}
```

4. **Ensure Single Provider in AppContext**

```typescript
// src/context/AppContext.tsx
export function AppProvider({ children }: { children: React.ReactNode }) {
  // Detect and warn about multiple instances
  useEffect(() => {
    if ((window as any).__APP_PROVIDER_MOUNTED) {
      console.error(
        '[AppProvider] CRITICAL ERROR: Multiple AppProvider instances detected!',
        'This will cause duplicate contexts and API calls.',
        'Ensure AppProvider is only mounted ONCE at the root level.'
      );
    }
    
    (window as any).__APP_PROVIDER_MOUNTED = true;
    
    return () => {
      (window as any).__APP_PROVIDER_MOUNTED = false;
    };
  }, []);
  
  return (
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
  );
}
```

5. **Update CICD Context for Cross-Context Communication**

```typescript
// src/context/CICDContext.tsx
// Example of consuming user data from UserContext without refetching
import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import { useUser } from '@/context'; // Import from centralized location

export function CICDProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState({
    // CICD state...
  });
  
  // Get user from UserContext instead of fetching it again
  const userContext = useUser();
  
  // Use user data from context, with fallback to local state
  const user = userContext?.user || state.currentUser;
  
  // When fetching CICD data, pass the user from context to avoid refetching
  const fetchCICDData = useCallback(async () => {
    if (!user) {
      console.log('[CICDContext] No user available, cannot fetch CICD data');
      return;
    }
    
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      // Pass user directly to action to avoid another getUser() call
      const result = await getCICDProvidersAction(user);
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          providers: result.data,
          loading: false
        }));
      } else {
        setState(prev => ({
          ...prev,
          error: result.error,
          loading: false
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to fetch CICD providers',
        loading: false
      }));
    }
  }, [user]);
  
  // Rest of provider implementation...
}
```

### Phase 2: Component Updates & Cross-Context Communication (2-3 days)

#### Objectives
- Update key components to use centralized context imports
- Fix components with direct context file imports
- Implement cross-context communication in all providers
- Optimize props passing for frequently re-rendered components

#### Files Impacted
- `src/components/layout/AppSidebar.tsx`
- `src/components/layout/WorkspaceHeader.tsx`
- `src/components/layout/RoleSwitcher.tsx`
- `src/components/profile/UserProfile.tsx`
- All feature pages that use contexts directly

#### Implementation Details

1. **Update AppSidebar Component**

```tsx
// src/components/layout/AppSidebar.tsx
'use client';

import { useUser, useRepository } from '@/context'; // Centralized import
import { UserProfile } from '@/components/profile/UserProfile';

export function AppSidebar({ tenant }: { tenant: string }) {
  const userContext = useUser();
  const repositoryContext = useRepository();
  
  // Debug logging to track render cycles
  useEffect(() => {
    console.log('[AppSidebar] Rendering with user:', 
      userContext?.user?.id ? `${userContext.user.id} (${userContext.user.role})` : 'not loaded');
  }, [userContext?.user?.id, userContext?.user?.role]);
  
  return (
    <aside className="sidebar">
      {/* Pass user data to child components to avoid them having to access context */}
      <UserProfile tenant={tenant} user={userContext?.user} />
      
      {/* Sidebar content */}
      <nav>
        {/* Navigation items */}
      </nav>
    </aside>
  );
}
```

2. **Update UserProfile Component with Proper Props**

```tsx
// src/components/profile/UserProfile.tsx
'use client';

import { useUser } from '@/context'; // Fallback import
import type { User } from '@/types/user';
import { RoleSwitcher } from '../layout/RoleSwitcher';

interface UserProfileProps {
  tenant: string;
  user?: User | null; // Accept user as prop
}

export function UserProfile({ tenant, user: propUser }: UserProfileProps) {
  // Use context as fallback if no user prop is provided
  const userContext = useUser();
  const user = propUser || userContext?.user;
  
  // Early return for loading state
  if (!user) {
    return <div className="user-profile-skeleton" />;
  }
  
  return (
    <div className="user-profile">
      <div className="user-info">
        <span className="user-name">{user.name || user.email}</span>
        <span className="user-email">{user.email}</span>
      </div>
      
      {/* Pass user to role switcher */}
      <RoleSwitcher tenant={tenant} user={user} />
    </div>
  );
}
```

3. **Fix RoleSwitcher Component with Explicit User Data**

```tsx
// src/components/layout/RoleSwitcher.tsx
'use client';

import { useUser } from '@/context'; // For updates only
import type { User } from '@/types/user';

interface RoleSwitcherProps {
  tenant: string;
  user: User; // Required prop
}

export function RoleSwitcher({ tenant, user }: RoleSwitcherProps) {
  const userContext = useUser();
  
  // Use the role from user prop, with clear fallbacks
  const role = user.role || user.user_metadata?.role || 'viewer';
  
  // Log role info for debugging
  useEffect(() => {
    console.log('[RoleSwitcher] Current role:', role);
  }, [role]);
  
  // Role switching logic...
  
  return (
    <div className="role-switcher">
      <span className="current-role">Role: {role}</span>
      {/* Role switching UI */}
    </div>
  );
}
```

4. **Update Feature Pages to Use Centralized Contexts**

```tsx
// src/app/[locale]/[tenant]/cicd/page.tsx
'use client';

import { useUser, useCICD } from '@/context'; // Centralized import

export default function CICDPage() {
  const userContext = useUser();
  const cicdContext = useCICD();
  
  // User data is already available from context, no need to fetch again
  const user = userContext?.user;
  
  // Render UI based on available data
  return (
    <div className="cicd-page">
      {/* CICD provider components */}
    </div>
  );
}
```

5. **Update Component Props to Include User Data**

```tsx
// src/app/[locale]/[tenant]/dashboard/page.tsx
'use client';

import { useUser } from '@/context';
import { DashboardMetrics } from './_components/DashboardMetrics';
import { ProjectList } from './_components/ProjectList';

export default function DashboardPage() {
  const userContext = useUser();
  
  return (
    <div className="dashboard">
      {/* Pass user data down explicitly */}
      <DashboardMetrics user={userContext?.user} />
      <ProjectList user={userContext?.user} />
    </div>
  );
}
```

### Phase 3: Server Actions Optimization (2-3 days)

#### Objectives
- Update server actions to accept user parameter
- Avoid redundant authentication in server functions
- Add optional caching at the server action level
- Implement consistent error handling

#### Files Impacted
- `src/app/actions/user.ts`
- `src/app/[locale]/[tenant]/cicd/actions.ts`
- `src/app/[locale]/[tenant]/deployment/actions.ts`
- `src/app/[locale]/[tenant]/hosts/actions.ts`
- `src/app/[locale]/[tenant]/repositories/actions.ts`
- `src/lib/cache.ts` (new or update)

#### Implementation Details

1. **Update Server Actions to Accept User Parameter**

```typescript
// Example: src/app/[locale]/[tenant]/cicd/actions.ts
'use server';

import { getUser } from '@/app/actions/user';
import { getCICDProviders } from '@/lib/supabase/db-cicd/cicd';
import type { User } from '@/types/user';
import type { CICDProvider } from './types';

// Add optional user parameter to avoid redundant authentication
export async function getCICDProvidersAction(
  user?: User // Accept user from context to avoid redundant fetching
): Promise<ActionResult<CICDProvider[]>> {
  try {
    // Get user if not provided (reuse pattern)
    if (!user) {
      console.log('[CICD] No user provided, fetching from auth...');
      const userResult = await getUser();
      if (!userResult.success) {
        return { success: false, error: userResult.error || 'Authentication required' };
      }
      user = userResult.data;
    } else {
      console.log('[CICD] Using provided user, skipping auth check');
    }
    
    // Use tenant from user for data isolation
    const result = await getCICDProviders(user.tenant_id);
    
    if (result.success) {
      return { success: true, data: result.data };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('[CICD] Error in getCICDProvidersAction:', error);
    return { success: false, error: 'Failed to fetch CICD providers' };
  }
}
```

2. **Create Simple Server-Side Cache Utility**

```typescript
// src/lib/cache.ts
interface CacheEntry<T> {
  value: T;
  expiry: number;
}

// Simple in-memory cache for server components
class ServerCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  
  constructor() {
    // Clean up expired items periodically
    setInterval(() => this.cleanup(), 60000); // Every minute
  }
  
  private cleanup() {
    const now = Date.now();
    let expiredCount = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiry < now) {
        this.cache.delete(key);
        expiredCount++;
      }
    }
    
    if (expiredCount > 0) {
      console.log(`[ServerCache] Cleaned up ${expiredCount} expired items`);
    }
  }
  
  // Get a value from the cache
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    const now = Date.now();
    
    if (!entry) return null;
    
    // Return null if expired
    if (entry.expiry < now) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.value as T;
  }
  
  // Set a value in the cache with TTL in ms
  set<T>(key: string, value: T, ttlMs = 30000): void {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlMs
    });
  }
  
  // Invalidate a specific key or pattern
  invalidate(keyPattern: string | RegExp): void {
    if (typeof keyPattern === 'string') {
      this.cache.delete(keyPattern);
    } else {
      for (const key of this.cache.keys()) {
        if (keyPattern.test(key)) {
          this.cache.delete(key);
        }
      }
    }
  }
  
  // Clear all cache
  clear(): void {
    this.cache.clear();
  }
}

// Export singleton
export const serverCache = new ServerCache();
```

3. **Use Cache in Server Actions (Optional)**

```typescript
// Optional caching in server actions for expensive operations
// src/app/[locale]/[tenant]/repositories/actions.ts
'use server';

import { getUser } from '@/app/actions/user';
import { getRepositories } from '@/lib/supabase/db-repositories/repository';
import { serverCache } from '@/lib/cache';
import type { User } from '@/types/user';

export async function getRepositoriesAction(
  user?: User,
  useCache = true // Allow caller to bypass cache
): Promise<ActionResult<Repository[]>> {
  try {
    // Get user if not provided
    if (!user) {
      const userResult = await getUser();
      if (!userResult.success) {
        return { success: false, error: 'Authentication required' };
      }
      user = userResult.data;
    }
    
    // Try cache first if enabled
    if (useCache) {
      const cacheKey = `repositories:${user.tenant_id}`;
      const cached = serverCache.get<ActionResult<Repository[]>>(cacheKey);
      
      if (cached) {
        console.log('[Repositories] Using cached repository data');
        return cached;
      }
    }
    
    // Fetch from database
    const result = await getRepositories(user.tenant_id);
    
    if (result.success) {
      // Cache successful result for 30 seconds
      if (useCache) {
        const cacheKey = `repositories:${user.tenant_id}`;
        serverCache.set(cacheKey, { success: true, data: result.data }, 30000);
      }
      
      return { success: true, data: result.data };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('[Repositories] Error in getRepositoriesAction:', error);
    return { success: false, error: 'Failed to fetch repositories' };
  }
}

// Cache invalidation for mutations
export async function addRepositoryAction(
  data: RepositoryInput,
  user?: User
): Promise<ActionResult<Repository>> {
  try {
    // Implementation...
    
    // On success, invalidate related cache
    if (result.success) {
      serverCache.invalidate(new RegExp(`^repositories:${user.tenant_id}`));
    }
    
    return result;
  } catch (error) {
    console.error('[Repositories] Error in addRepositoryAction:', error);
    return { success: false, error: 'Failed to add repository' };
  }
}
```

4. **Update User Action for Consistent Interface**

```typescript
// src/app/actions/user.ts
'use server';

import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase/server';
import { serverCache } from '@/lib/cache';
import type { User } from '@/types/user';

// Core user fetching function used by all server actions
export async function getUser(): Promise<ActionResult<User>> {
  try {
    // Check cache for short-lived requests (beneficial for server components)
    const cached = serverCache.get<ActionResult<User>>('current_user');
    if (cached) {
      return cached;
    }
    
    const cookieStore = cookies();
    const supabase = createServerClient(cookieStore);
    
    const { data: { user: authUser }, error } = await supabase.auth.getUser();
    
    if (error || !authUser) {
      return { 
        success: false, 
        error: error?.message || 'User not authenticated' 
      };
    }
    
    // Process user data
    const role = (authUser as any).role || authUser?.user_metadata?.role || 'viewer';
    const tenant_id = authUser?.user_metadata?.tenant_id || 'default';
    
    const user: User = {
      id: authUser.id,
      email: authUser.email || '',
      name: authUser.user_metadata?.name || authUser.email || '',
      role,
      tenant_id,
      // Other user properties...
    };
    
    // Cache user for 5 seconds to prevent redundant auth checks
    serverCache.set('current_user', { success: true, data: user }, 5000);
    
    return { success: true, data: user };
  } catch (error) {
    console.error('[User] Error in getUser:', error);
    return { success: false, error: 'Failed to authenticate user' };
  }
}
```

### Phase 4: Performance Optimization & Monitoring (3-4 days)

#### Objectives
- Create granular selectors for fine-grained context consumption
- Add performance monitoring to track improvement
- Implement component memoization
- Add developer tools for context debugging

#### Files Impacted
- New: `src/context/utils.ts`
- New: `src/hooks/useContextMonitor.ts`
- `src/context/HostContext.tsx`
- `src/context/RepositoryContext.tsx`
- `src/context/DeploymentContext.tsx`
- `src/context/CICDContext.tsx`
- `src/context/UserContext.tsx`
- Various components consuming contexts

#### Implementation Details

1. **Create Context Monitor Hook**

```typescript
// src/hooks/useContextMonitor.ts
import { useEffect, useRef } from 'react';

export interface PerformanceMetrics {
  requestCount: number;
  renderCount: number;
  firstRenderTimestamp: number;
  lastRenderTimestamp: number;
  renderTimes: number[];
}

// Global metrics tracking
const globalMetrics: Record<string, PerformanceMetrics> = {
  user: { requestCount: 0, renderCount: 0, firstRenderTimestamp: 0, lastRenderTimestamp: 0, renderTimes: [] },
  host: { requestCount: 0, renderCount: 0, firstRenderTimestamp: 0, lastRenderTimestamp: 0, renderTimes: [] },
  repository: { requestCount: 0, renderCount: 0, firstRenderTimestamp: 0, lastRenderTimestamp: 0, renderTimes: [] },
  deployment: { requestCount: 0, renderCount: 0, firstRenderTimestamp: 0, lastRenderTimestamp: 0, renderTimes: [] },
  cicd: { requestCount: 0, renderCount: 0, firstRenderTimestamp: 0, lastRenderTimestamp: 0, renderTimes: [] },
};

// Track API request count
export function trackRequest(contextType: string): void {
  if (globalMetrics[contextType]) {
    globalMetrics[contextType].requestCount++;
  }
}

// Hook to monitor context performance
export function useContextMonitor(
  contextType: string,
  componentName: string,
  enabled: boolean = true
): void {
  const renderCountRef = useRef(0);
  const startTimeRef = useRef<number>(0);
  
  // Monitor renders and timing
  useEffect(() => {
    if (!enabled) return;
    
    renderCountRef.current++;
    const now = performance.now();
    
    if (!startTimeRef.current) {
      startTimeRef.current = now;
    }
    
    if (globalMetrics[contextType]) {
      const metrics = globalMetrics[contextType];
      metrics.renderCount++;
      
      if (!metrics.firstRenderTimestamp) {
        metrics.firstRenderTimestamp = now;
      }
      
      metrics.lastRenderTimestamp = now;
      metrics.renderTimes.push(now);
      
      // Keep only last 100 render times
      if (metrics.renderTimes.length > 100) {
        metrics.renderTimes.shift();
      }
    }
    
    console.log(
      `[ContextMonitor] ${componentName} using ${contextType} context rendered ` +
      `(${renderCountRef.current} times, ` +
      `${Math.round(now - startTimeRef.current)}ms since first render)`
    );
  });
  
  // Log metrics on unmount
  useEffect(() => {
    return () => {
      if (!enabled) return;
      
      console.log(
        `[ContextMonitor] ${componentName} unmounted after ${renderCountRef.current} renders ` +
        `(used ${contextType} context)`
      );
    };
  }, [contextType, componentName, enabled]);
}

// Global metrics accessor for debugging
(window as any).__CONTEXT_METRICS__ = globalMetrics;

// Add console command for checking metrics
if (typeof window !== 'undefined') {
  (window as any).showContextMetrics = () => {
    console.table(
      Object.entries(globalMetrics).map(([key, metrics]) => ({
        context: key,
        requests: metrics.requestCount,
        renders: metrics.renderCount,
        lastRender: metrics.lastRenderTimestamp ? 
          new Date(metrics.lastRenderTimestamp).toISOString() : 'never',
        avgRenderInterval: metrics.renderTimes.length > 1 ? 
          Math.round(
            metrics.renderTimes
              .slice(1)
              .reduce((acc, time, i) => acc + (time - metrics.renderTimes[i]), 0) / 
            (metrics.renderTimes.length - 1)
          ) + 'ms' : 'N/A'
      }))
    );
  };
}
```

2. **Create Selector Utils with Performance Tracking**

```typescript
// src/context/utils.ts
import { useContext, useMemo } from 'react';
import { useContextMonitor } from '@/hooks/useContextMonitor';

// Helper to create selector hooks
export function createSelector<Context, Selected>(
  contextType: string,
  useContextHook: () => Context,
  selector: (context: Context) => Selected,
  selectorName: string
) {
  return function useContextSelector(): Selected {
    const context = useContextHook();
    
    // Monitor this selector's usage
    useContextMonitor(contextType, `${selectorName}Selector`, process.env.NODE_ENV === 'development');
    
    if (!context) {
      throw new Error(`Context not available in ${selectorName} selector`);
    }
    
    // Memoize the selection to prevent unnecessary recalculation
    return useMemo(() => selector(context), [context]);
  };
}
```

3. **Implement User Context Selectors**

```typescript
// In UserContext.tsx
import { createSelector } from './utils';

// Export named selectors for more granular updates
export const useUserProfile = createSelector(
  'user',
  useUserContext,
  (context) => ({
    user: context.user,
    loading: context.loading
  }),
  'userProfile'
);

export const useUserRole = createSelector(
  'user',
  useUserContext,
  (context) => context.user?.role || 'viewer',
  'userRole'
);

export const useUserActions = createSelector(
  'user',
  useUserContext,
  (context) => ({
    fetchUserData: context.fetchUserData
  }),
  'userActions'
);
```

4. **Update Component with Memoization and Monitoring**

```tsx
// src/components/layout/RoleSwitcher.tsx
'use client';

import { memo, useState, useCallback } from 'react';
import { useUserRole, useUserActions } from '@/context';
import { useContextMonitor } from '@/hooks/useContextMonitor';

interface RoleSwitcherProps {
  tenant: string;
  user: User; // Required prop
}

// Use memo to prevent re-rendering when parent rerenders
export const RoleSwitcher = memo(function RoleSwitcher({ tenant, user }: RoleSwitcherProps) {
  // Monitor this component
  useContextMonitor('user', 'RoleSwitcher');
  
  // Only use context for actions, not for data
  const { fetchUserData } = useUserActions();
  
  // Use prop for data instead of context
  const role = user.role || user.user_metadata?.role || 'viewer';
  const [isOpen, setIsOpen] = useState(false);
  
  const toggleDropdown = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);
  
  const changeRole = useCallback(async (newRole: string) => {
    try {
      // Implementation...
      
      // Force refresh user data after role change
      await fetchUserData(true);
      
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to change role:', error);
    }
  }, [fetchUserData]);
  
  return (
    <div className="role-switcher">
      <button onClick={toggleDropdown} className="role-display">
        Role: {role}
      </button>
      
      {isOpen && (
        <div className="role-dropdown">
          <button onClick={() => changeRole('admin')}>Admin</button>
          <button onClick={() => changeRole('developer')}>Developer</button>
          <button onClick={() => changeRole('viewer')}>Viewer</button>
        </div>
      )}
    </div>
  );
});
```

5. **Add Debug Tools to AppContext**

```tsx
// Add to the bottom of AppContext.tsx
// Debug helper for development mode only
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  // Add console commands for debugging
  (window as any).inspectContexts = () => {
    const userContext = (window as any).__CONTEXT_METRICS__.user;
    const hostContext = (window as any).__CONTEXT_METRICS__.host;
    const repoContext = (window as any).__CONTEXT_METRICS__.repository;
    
    console.group('Context Usage Statistics');
    console.log('User context API calls:', userContext.requestCount);
    console.log('Host context API calls:', hostContext.requestCount);
    console.log('Repository context API calls:', repoContext.requestCount);
    console.log('Total renders across all contexts:', 
      userContext.renderCount + hostContext.renderCount + repoContext.renderCount);
    console.groupEnd();
    
    return 'Use window.showContextMetrics() for detailed metrics';
  };
}
```

### Phase 5: Advanced Optimization with React Query (Optional, 4-5 days)

#### Objectives
- Replace custom fetch implementation with React Query for more robust data handling
- Implement advanced stale-while-revalidate patterns
- Add support for automatic background refetching
- Support Suspense for better loading UX

#### Files Impacted
- `package.json` (new dependencies)
- New: `src/providers/QueryProvider.tsx`
- New: `src/hooks/query/useUserQuery.ts`
- New: `src/hooks/query/useHostsQuery.ts`
- New: `src/hooks/query/useRepositoriesQuery.ts`
- New: `src/hooks/query/useCICDQuery.ts`
- New: `src/hooks/query/useDeploymentsQuery.ts`
- `src/app/layout.tsx` (add query provider)

#### Implementation Details

1. **Install Dependencies**

```bash
npm install @tanstack/react-query
```

2. **Create Query Provider**

```tsx
// src/providers/QueryProvider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  // Create a client for each session
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Global defaults
        staleTime: 30000, // 30 seconds
        cacheTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false,
        retry: 1,
        // For better debugging in development
        ...(process.env.NODE_ENV === 'development' && {
          retry: false,
        }),
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

3. **Create User Query Hook**

```typescript
// src/hooks/query/useUserQuery.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUser } from '@/app/actions/user';
import { trackRequest } from '@/hooks/useContextMonitor';

// Unique key for user data
export const userQueryKey = ['user'];

export function useUserQuery() {
  const queryClient = useQueryClient();
  
  // Main query hook
  const query = useQuery({
    queryKey: userQueryKey,
    queryFn: async () => {
      // Track this request for metrics
      trackRequest('user');
      console.log('[UserQuery] Fetching user data');
      
      const result = await getUser();
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch user');
      }
      
      return result.data;
    },
    // Don't refetch on window focus - we handle this manually
    refetchOnWindowFocus: false,
    staleTime: 30000, // 30 seconds
  });
  
  // Mutation for updating user role
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      // Implementation of updateRole server action
      // return await updateUserRoleAction(userId, role);
    },
    onSuccess: () => {
      // Invalidate user data to trigger refetch
      queryClient.invalidateQueries({ queryKey: userQueryKey });
    },
  });
  
  // Force refetch (used after mutations)
  const refreshUser = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: userQueryKey });
  }, [queryClient]);
  
  return {
    user: query.data,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refreshUser,
    updateRole: updateRoleMutation.mutate,
    isUpdatingRole: updateRoleMutation.isPending,
  };
}
```

4. **Create Repository Query Hook**

```typescript
// src/hooks/query/useRepositoriesQuery.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRepositoriesAction, addRepositoryAction, deleteRepositoryAction } from '@/app/[locale]/[tenant]/repositories/actions';
import { useUserQuery } from './useUserQuery';
import { trackRequest } from '@/hooks/useContextMonitor';

// Unique key for repository data
export const repositoriesQueryKey = ['repositories'];

export function useRepositoriesQuery() {
  const queryClient = useQueryClient();
  const { user } = useUserQuery();
  
  // Main query
  const query = useQuery({
    queryKey: repositoriesQueryKey,
    queryFn: async () => {
      // Skip if no user
      if (!user) {
        return [];
      }
      
      // Track for metrics
      trackRequest('repository');
      console.log('[RepositoryQuery] Fetching repositories');
      
      // Pass the user to avoid redundant auth
      const result = await getRepositoriesAction(user);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch repositories');
      }
      
      return result.data;
    },
    // Enable only if we have a user
    enabled: !!user,
    staleTime: 60000, // 1 minute
  });
  
  // Add repository mutation
  const addRepository = useMutation({
    mutationFn: async (data: RepositoryInput) => {
      if (!user) throw new Error('User required');
      return await addRepositoryAction(data, user);
    },
    onSuccess: () => {
      // Invalidate query to trigger refetch
      queryClient.invalidateQueries({ queryKey: repositoriesQueryKey });
    },
  });
  
  // Delete repository mutation
  const deleteRepository = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error('User required');
      return await deleteRepositoryAction(id, user);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repositoriesQueryKey });
    },
  });
  
  // Force refresh
  const refreshRepositories = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: repositoriesQueryKey });
  }, [queryClient]);
  
  // Data with loading state
  return {
    repositories: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refreshRepositories,
    addRepository: addRepository.mutate,
    isAdding: addRepository.isPending,
    deleteRepository: deleteRepository.mutate,
    isDeleting: deleteRepository.isPending,
  };
}
```

5. **Update App Layout to Include Query Provider**

```tsx
// src/app/layout.tsx
import { AppProvider } from '@/context';
import { QueryProvider } from '@/providers/QueryProvider';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <AppProvider>
            {children}
          </AppProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
```

6. **Create Component Using React Query**

```tsx
// src/app/[locale]/[tenant]/repositories/page.tsx
'use client';

import { useRepositoriesQuery } from '@/hooks/query/useRepositoriesQuery';
import { useUserQuery } from '@/hooks/query/useUserQuery';
import { RepositoryList } from './_components/RepositoryList';

export default function RepositoriesPage() {
  // Use React Query hooks
  const { user } = useUserQuery();
  const { 
    repositories, 
    isLoading, 
    refreshRepositories, 
    addRepository 
  } = useRepositoriesQuery();
  
  // Loading state
  if (isLoading) {
    return <div className="loading">Loading repositories...</div>;
  }
  
  return (
    <div className="repositories-page">
      <header>
        <h1>Repositories</h1>
        <button onClick={() => refreshRepositories()}>Refresh</button>
      </header>
      
      <RepositoryList 
        repositories={repositories} 
        user={user} 
        onAddRepository={addRepository}
      />
    </div>
  );
}
```

## Files Impacted Summary

| File | Changes |
|------|---------|
| `src/context/index.ts` | Create centralized import mechanism for all context hooks |
| `src/context/AppContext.tsx` | Add singleton check, optimize provider composition |
| `src/context/UserContext.tsx` | Implement request protection, add metrics, optimize initialization |
| `src/hooks/useRequestProtection.ts` | New file to prevent duplicate API calls |
| `src/components/layout/AppSidebar.tsx` | Update imports, add user data passing |
| `src/components/profile/UserProfile.tsx` | Accept user prop with fallback to context |
| `src/components/layout/RoleSwitcher.tsx` | Fix role resolution, add proper props |
| `src/context/CICDContext.tsx` | Update to use user data from context instead of refetching |
| `src/app/actions/user.ts` | Add server-side caching for user data |
| `src/app/[locale]/[tenant]/cicd/actions.ts` | Accept user parameter to prevent redundant auth |
| `src/lib/cache.ts` | Create server-side caching utility |
| `src/hooks/useContextMonitor.ts` | Add performance monitoring for context usage |
| `src/context/utils.ts` | Create selector utilities for optimized context consumption |
| `src/hooks/query/useUserQuery.ts` | Implement React Query hooks (optional phase) |

## Migration Timeline

1. **Week 1 (Days 1-5)**: Phase 1 - Singleton Pattern & Centralization
   - Implement centralized imports in `index.ts`
   - Create request protection hook
   - Update UserContext with protection
   - Fix AppContext singleton pattern
   - Apply changes to AppSidebar and key components
   - Basic testing of user data flow

2. **Week 2 (Days 6-10)**: Phase 2 - Component Updates & Cross-Context Communication
   - Update all components to use centralized imports
   - Implement cross-context communication
   - Fix prop passing for user data
   - Update feature pages to use contexts properly
   - Test with different components and pages

3. **Week 3 (Days 11-15)**: Phase 3 - Server Actions Optimization
   - Update server actions to accept user parameter
   - Implement server-side caching
   - Update getUser with improved caching
   - Optimize cache invalidation for mutations
   - Test API call reduction

4. **Week 4 (Days 16-20)**: Phase 4 - Performance Optimization & Monitoring
   - Add context monitoring hooks
   - Implement context selectors
   - Optimize component rendering with memoization
   - Add debugging tools
   - Measure performance improvement

5. **Week 5+ (Optional)**: Phase 5 - React Query Integration
   - Set up React Query provider
   - Create specific query hooks
   - Begin migrating contexts to React Query
   - Update components to use query hooks
   - Performance testing and optimization

## Testing Strategy

### Unit Testing

| Test Area | Description | Priority |
|-----------|-------------|----------|
| Request Protection | Verify deduplication of API calls | High |
| Context Initialization | Test singleton pattern works correctly | High |
| Context Selectors | Verify selectors return correct data | Medium |
| Server Caching | Test cache hits and invalidation | Medium |
| Performance Metrics | Validate metrics collection | Low |

### Integration Testing

| Test Area | Description | Priority |
|-----------|-------------|----------|
| User Data Flow | Test user data propagation through contexts | High |
| Cross-Context Communication | Verify contexts can share data | High |
| Component Tree | Test data passing through component hierarchy | Medium |
| Cache Invalidation | Verify cache is properly cleared on mutations | Medium |
| React Query Integration | Test query hooks if implemented | Low |

### Performance Testing

| Metric | Baseline | Target | How to Measure |
|--------|----------|--------|---------------|
| API Calls | Multiple redundant calls | Single call per data type | Network monitoring + custom metrics |
| Render Count | Excessive rerenders | Minimal necessary renders | Context monitor metrics |
| Time to Interactive | Varies | 20% improvement | Lighthouse metrics |
| Memory Usage | Baseline | 15% reduction | Chrome performance tools |
| Bundle Size | Current | No significant increase | Webpack analyzer |

## Change Management

### Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Breaking user authentication | High | Low | Use fallback to direct API calls |
| Performance regression | Medium | Medium | A/B test changes with metrics |
| Bundle size increase | Low | Low | Tree-shaking, code splitting |
| Browser compatibility | Medium | Low | Test in multiple browsers |
| Code complexity | Medium | Medium | Thorough documentation |

### Rollout Strategy

1. **Develop**: Implement changes in a feature branch
2. **Test**: Comprehensive testing in dev environment 
3. **Stage**: Deploy to staging for user acceptance testing
4. **Monitor**: Track metrics for improvement
5. **Beta**: Optional beta release for specific users
6. **Release**: Phased rollout to production
7. **Validate**: Confirm metrics show expected improvement

## Success Criteria

The migration will be considered successful if:

1. Network requests for user data reduced by 80%
2. Component render counts reduced by 50%
3. No regression in application functionality
4. Role switching works correctly in all scenarios
5. All components use the centralized context system
6. Console logs show no duplicate context creation
7. Performance metrics show measurable improvement

## Conclusion

This migration plan addresses the core issues with our current context implementation: redundant API calls, inconsistent context access, and excessive re-renders. By implementing a true singleton pattern with centralized imports, adding request protection, optimizing server actions, and improving cross-context communication, we'll create a significantly more efficient application.

The phased approach ensures we can deliver incremental improvements with measurable results at each stage, while the optional React Query integration provides a path to even more robust data handling if desired in the future.