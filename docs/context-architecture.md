# Centralized Context Architecture

## Overview

AutomAI uses a centralized context architecture for state management across the application. This architecture provides a consistent pattern for managing state, actions, and side effects while enabling components to access data from multiple domains when needed.

> **Important Migration Note**: The application has been fully migrated to this centralized context architecture. All feature-specific contexts and hooks (previously located in `/src/app/[locale]/[tenant]/*/context.tsx` and `/src/app/[locale]/[tenant]/*/hooks.ts`) have been removed in favor of this centralized system.

## Architecture Principles

1. **Single Source of Truth**: All application state is managed through the context system
2. **Separation of Concerns**: Each domain has its own context with clear responsibilities
3. **Composability**: The root AppContext composes all domain contexts
4. **Consistent Patterns**: All contexts follow the same implementation pattern
5. **Minimal Provider Nesting**: The AppProvider handles all context composition

## Directory Structure

```
src/
  ├── context/
  │   ├── index.ts                   // Main export file
  │   ├── AppContext.tsx             // Root context
  │   ├── host/
  │   │   ├── index.ts               // Export file 
  │   │   ├── HostContext.tsx        // Host context implementation
  │   ├── deployment/
  │   │   ├── index.ts
  │   │   ├── DeploymentContext.tsx
  │   ├── repository/
  │   │   ├── index.ts
  │   │   ├── RepositoryContext.tsx
  │   └── cicd/
  │       ├── index.ts
  │       └── CICDContext.tsx
  └── types/
      └── context/
          ├── index.ts               // Export all context types
          ├── app.ts                 // Root context types
          ├── host.ts                // Host context types
          ├── deployment.ts          // Deployment context types
          ├── repository.ts          // Repository context types
          └── cicd.ts                // CICD context types
```

## Type Structure

Each context has a consistent type pattern:

1. **Data Interface**: Contains all state properties
```typescript
export interface HostData {
  hosts: Host[];
  loading: boolean;
  error: string | null;
  currentUser: AuthUser | null;
}
```

2. **Actions Interface**: Contains all action methods
```typescript
export interface HostActions {
  fetchHosts: () => Promise<Host[]>;
  getHostById: (id: string) => Promise<Host | null>;
  addHost: (data: HostData) => Promise<Host | null>;
  updateHost: (id: string, data: Partial<Host>) => Promise<Host | null>;
  deleteHost: (id: string) => Promise<boolean>;
  // ... other actions
}
```

3. **Combined Context Type**: Extends both data and actions interfaces
```typescript
export interface HostContextType extends HostData, HostActions {}
```

## Context Implementation Pattern

Each context follows the same implementation pattern:

1. **State Management**: Uses React's `useState` hook for state
2. **Action Implementation**: Implements actions using `useCallback` for performance
3. **Server Integration**: Calls server actions from the appropriate domain
4. **Initialization**: Uses `useEffect` for initial data loading
5. **Context Value**: Combines state and actions into a single context value

Example:
```typescript
export const HostProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<HostData>(initialHostData);
  
  // Implement actions as callbacks
  const fetchHosts = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      const hosts = await getHostsAction();
      setState(prev => ({ ...prev, hosts, loading: false }));
      return hosts;
    } catch (err) {
      setState(prev => ({ 
        ...prev, 
        error: 'Failed to fetch hosts', 
        loading: false 
      }));
      return [];
    }
  }, []);
  
  // Other actions...
  
  // Create context value
  const contextValue: HostContextType = {
    // State
    ...state,
    
    // Actions
    fetchHosts,
    // Other actions...
  };
  
  return (
    <HostContext.Provider value={contextValue}>
      {children}
    </HostContext.Provider>
  );
};
```

## Root AppContext

The AppContext composes all other contexts and provides a single entry point for accessing any context:

```typescript
export function AppProvider({ children }: { children: ReactNode }) {
  return (
    <HostProvider>
      <DeploymentProvider>
        <RepositoryProvider>
          <CICDProvider>
            <AppContextBridge>
              {children}
            </AppContextBridge>
          </CICDProvider>
        </RepositoryProvider>
      </DeploymentProvider>
    </HostProvider>
  );
}
```

## Usage in Components

Components access context data and actions through convenience hooks:

```typescript
import { useHost, useDeployment } from '@/context';

function MyComponent() {
  // Access host context
  const { hosts, loading, fetchHosts } = useHost();
  
  // Access deployment context
  const { deployments, createDeployment } = useDeployment();
  
  // Use data and actions in component
  // ...
}
```

## Benefits

1. **Consistency**: All contexts follow the same pattern and organization
2. **Maintainability**: Smaller, focused files with clear separation of concerns
3. **Performance**: Reduced provider nesting and more efficient context updates
4. **Developer Experience**: Easier to find and use context functions
5. **Type Safety**: Better type definitions and IDE support

## Guidelines

1. **Keep Contexts Focused**: Each context should manage a specific domain
2. **Avoid Component-Specific State**: Use context for shared state, local state for component-specific concerns
3. **Use Actions for State Changes**: All state changes should go through context actions
4. **Minimize Dependencies**: Avoid circular dependencies between contexts
5. **Test Context Providers**: Write tests for context providers and their actions
6. **Always Use Centralized Context**: Do not create feature-specific contexts or hooks

## Troubleshooting

1. **Context Undefined Error**: Make sure the component is wrapped in the appropriate provider
2. **State Updates Not Reflected**: Check if dependencies are properly set in useCallback hooks
3. **Type Errors**: Ensure the context value includes all properties from the context type
4. **Performance Issues**: Use memoization and careful dependency management 
5. **Missing Context Access**: Always import from `@/context`, never from feature-specific files 