# Centralized Context Architecture

## Overview

AutomAI uses a centralized context architecture for state management across the application. This architecture provides a consistent pattern for managing state, actions, and side effects while enabling components to access data from multiple domains when needed.

> **Important Implementation Note**: The application uses a singleton-like pattern with the root AppProvider to ensure there is only ONE instance of each context in the component tree. Multiple AppProvider instances in the tree can cause duplicate API calls and state inconsistencies.

## Architecture Principles

1. **Single Source of Truth**: All application state is managed through the centralized context system
2. **Three-Layer Architecture**: Follows the core app architecture (DB → Server Actions → Client Hooks)
3. **Separation of Concerns**: Each domain has its own context with clear responsibilities
4. **On-Demand Initialization**: Contexts are initialized only when needed to improve performance
5. **Cross-Context Communication**: Domains can access user data and other contexts when needed
6. **Singleton Pattern**: Only one instance of each context exists in the application

## Directory Structure

```
src/
  ├── context/
  │   ├── index.ts                   // Main export file with centralized hooks
  │   ├── AppContext.tsx             // Root context composition and initialization
  │   ├── UserContext.tsx            // User authentication and profile context
  │   ├── SidebarContext.tsx         // Sidebar UI state management
  │   ├── CICDContext.tsx            // CI/CD integration context
  │   ├── DeploymentContext.tsx      // Deployment management context
  │   ├── HostContext.tsx            // Host management context
  │   └── RepositoryContext.tsx      // Repository management context
  └── types/
      └── context/
          ├── constants.ts           // Shared constants
          ├── app.ts                 // Root context types
          ├── user.ts                // User context types
          ├── host.ts                // Host context types
          ├── deployment.ts          // Deployment context types
          ├── repository.ts          // Repository context types
          └── cicd.ts                // CICD context types
```

## Context Initialization and Singleton Pattern

The application uses a demand-based initialization pattern to manage contexts efficiently:

```typescript
// In AppContext.tsx
export function AppProvider({ children }: { children: ReactNode }) {
  // Track which contexts are initialized
  const [contextState, setContextState] = useState<AppContextState>({
    host: false,
    deployment: false,
    repository: false,
    cicd: false,
    user: true, // User context is always initialized
  });

  // Initialize context on demand
  const initContext = useCallback((name: ContextName) => {
    if (!contextState[name]) {
      setContextState(prev => ({ ...prev, [name]: true }));
    }
  }, [contextState]);

  // Render providers based on initialization state
  const renderWithProviders = (node: React.ReactNode): React.ReactNode => {
    let result = node;
    
    // Wrap with initialized providers
    if (contextState.cicd) result = <CICDProvider>{result}</CICDProvider>;
    if (contextState.repository) result = <RepositoryProvider>{result}</RepositoryProvider>;
    if (contextState.deployment) result = <DeploymentProvider>{result}</DeploymentProvider>;
    if (contextState.host) result = <HostProvider>{result}</HostProvider>;
    if (contextState.user) result = <UserProvider>{result}</UserProvider>;
    
    return result;
  };

  return (
    <AppContext.Provider value={{ contextState, initContext }}>
      {renderWithProviders(<AppContextBridge>{children}</AppContextBridge>)}
    </AppContext.Provider>
  );
}
```

## Cross-Context Communication

Contexts can access user data and other domain data through the centralized system:

```typescript
// In CICDContext.tsx
export const CICDProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Get user data from UserContext
  const userContext = useUser();
  
  // Update current user when user context changes
  useEffect(() => {
    if (userContext?.user) {
      setState(prev => ({
        ...prev,
        currentUser: userContext.user
      }));
    }
  }, [userContext?.user]);
  
  // Use user data for API calls
  const fetchProviders = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      // Get user data from context instead of fetching again
      const user = userContext?.user || state.currentUser;
      
      // Pass user to server action
      const result = await getCICDProviders(user);
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          providers: result.data || [],
          loading: false
        }));
      }
      
      return result;
    } catch (error) {
      // Error handling...
    }
  }, [userContext?.user, state.currentUser]);

  // Rest of context implementation...
};
```

## Context Access and Hooks

The centralized system provides hooks for accessing all contexts:

```typescript
// In context/index.ts
export { useUser } from './AppContext';
export { useHost } from './AppContext';
export { useDeployment } from './AppContext'; 
export { useRepository } from './AppContext';
export { useCICD } from './AppContext';
```

These hooks initialize contexts on-demand and ensure consistent access:

```typescript
// In AppContext.tsx
export function useHost() {
  // Initialize the host context if not already initialized
  const _isInitialized = useInitContext('host');
  const context = useAppContext();
  
  return context.host;
}
```

## Usage in Components

Components should always import hooks from the centralized location:

```typescript
import { useHost, useRepository, useUser } from '@/context';

function HostsPage() {
  // Access multiple contexts as needed
  const { hosts, loading, addHost } = useHost();
  const { repositories } = useRepository();
  const { user } = useUser();
  
  // Use data and actions from different contexts
  const handleAddHost = async (hostData) => {
    const newHost = await addHost({
      ...hostData,
      repositoryIds: selectedRepositories.map(r => r.id),
      createdBy: user.id
    });
  };
}
```

## Request Protection and Optimization

The application includes request protection to prevent duplicate API calls:

```typescript
// In useRequestProtection hook
export function useRequestProtection(componentName = 'Component') {
  const [pendingRequests, setPendingRequests] = useState<Record<string, boolean>>({});
  const renderCount = useRef<number>(0);
  
  // Increment render count on each render
  useEffect(() => {
    renderCount.current += 1;
  });
  
  // Protect async operations from duplicate calls
  const protectedFetch = useCallback(async (requestKey: string, fetchFn: () => Promise<any>) => {
    if (pendingRequests[requestKey]) {
      console.log(`[${componentName}] Skipping duplicate request: ${requestKey}`);
      return null;
    }
    
    setPendingRequests(prev => ({ ...prev, [requestKey]: true }));
    
    try {
      return await fetchFn();
    } finally {
      setPendingRequests(prev => ({ ...prev, [requestKey]: false }));
    }
  }, [pendingRequests, componentName]);
  
  // Other utility functions...
  
  return { protectedFetch, renderCount };
}
```

## Optimizing Component Rerenders

Context providers optimize rerenders with careful state updates:

```typescript
// In safeUpdateState utility
const safeUpdateState = useCallback(
  (
    updateFn: (newState: any) => void,
    oldValue: any,
    newValue: any,
    debugKey?: string,
  ) => {
    // Only update if values are different
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      updateFn(newValue);
      if (DEBUG) console.log(`[${componentName}] Updated state:`, debugKey || 'state');
      return true;
    }
    return false;
  },
  [componentName],
);
```

## Cross-Page Data Persistence

For improved user experience, the context system supports cross-page data persistence:

```typescript
// In AppContext.tsx
export const persistedData: {
  repository?: any;
  repositories?: any[];
  hosts?: any[];
  deployment?: any;
  deployments?: any[];
  user?: any;
  cicd?: any;
} = {};

// In context components
// Persist data for cross-page navigation
useEffect(() => {
  if (typeof persistedData !== 'undefined') {
    persistedData.cicdData = {
      providers: state.providers,
      jobs: state.jobs,
      loading: state.loading,
    };
  }
}, [state.providers, state.jobs, state.loading]);
```

## Common Pitfalls and Troubleshooting

### 1. Multiple AppProvider Instances

**Problem**: Having multiple `AppProvider` instances in the component tree causes duplicate API calls and state inconsistencies.

**Solution**: Ensure `AppProvider` is only used once at the root level:

```tsx
// In src/app/layout.tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProviders>
          <SWRProvider>
            <AppProvider>{children}</AppProvider>
          </SWRProvider>
        </ThemeProviders>
      </body>
    </html>
  );
}
```

**Avoid this mistake**:
```tsx
// Don't add AppProvider in feature layouts or pages!
export default function FeaturePage() {
  return (
    <AppProvider> {/* WRONG! Duplicate provider */}
      <PageContent />
    </AppProvider>
  );
}
```

### 2. Incorrect Import Paths

**Problem**: Importing from feature-specific contexts instead of the centralized location.

**Solution**: Always import from `@/context` to get the singleton instance:

```tsx
// CORRECT
import { useHost, useUser } from '@/context';

// WRONG 
import { useHost } from '@/context/HostContext';
import { useUser } from '@/context/UserContext';
```

### 3. Using React.use() in Client Components

**Problem**: Using `React.use()` with promises in client components causes runtime errors.

**Solution**: 
- Server Components: Can use `React.use()` to unwrap promises
- Client Components: Use hooks like `useParams()` that already return resolved values

### 4. Redundant API Calls

**Problem**: Components trigger the same API call multiple times.

**Solution**: Use the request protection utilities and context state:

```tsx
const fetchHosts = useCallback(async () => {
  return await protectedFetch('fetchHosts', async () => {
    // Check if we already have hosts and they're not stale
    if (state.hosts.length > 0 && !state.stale) {
      return state.hosts;
    }
    
    // Otherwise make the API call
    const result = await getHostsAction();
    // Update state...
    return result.data;
  });
}, [state.hosts, state.stale, protectedFetch]);
```

### 5. Missing User Data in Components

**Problem**: Components display incorrect role or user information.

**Solution**: 
- Pass user data to components that need it
- Update imports to use the centralized context
- Add debugging logs to track user data flow

```tsx
// In WorkspaceHeader.tsx
export function WorkspaceHeader() {
  const userContext = useUser();
  
  // Pass user data to child components
  return (
    <header>
      <RoleSwitcher user={userContext?.user} />
      <UserProfile user={userContext?.user} />
    </header>
  );
}
```

## Best Practices

1. **Single AppProvider**: Only use AppProvider once at the root layout level
2. **Centralized Imports**: Always import from `@/context` rather than specific context files
3. **Context Optimization**: Use memoization and careful dependency management
4. **User Data Sharing**: Pass user data from context to components that need it
5. **Request Protection**: Use the request protection utilities to prevent duplicate calls
6. **Debug Logging**: Add targeted DEBUG flags to trace state and API calls when needed
7. **Cross-Context Access**: Use the context bridge to access data from multiple domains
8. **State Update Batching**: Group related state updates to reduce rerenders