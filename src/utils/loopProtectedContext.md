# Loop-Protected Context Implementation Guide

This document shows how to implement loop protection in your contexts to prevent infinite re-rendering and redundant API calls.

## Simple Example: User Context

Here's how to implement the UserContext with loop protection:

```typescript
// src/context/UserContext.tsx
import { createSafeContext } from '@/utils/createSafeContext';
import { getUser } from '@/app/actions/user';
import { User } from '@/types/user';

// Define state interface
interface UserState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

// Define actions interface
interface UserActions {
  fetchUser: () => Promise<User | null>;
  logout: () => Promise<void>;
}

// Create combined context type
type UserContextType = UserState & UserActions;

// Initial state
const initialState: UserState = {
  user: null,
  loading: false,
  error: null
};

// Create the context with our utility
const { Context, Provider, useCtx } = createSafeContext<
  UserState, 
  UserActions, 
  UserContextType
>({
  name: 'User',
  initialState,
  requireProvider: true,
  
  // Define the actions with built-in protection
  createActions: (state, setState, protectedFetch, safeUpdateState) => {
    return {
      fetchUser: async () => {
        // This fetch is protected against redundant calls
        const userData = await protectedFetch('fetchUser', async () => {
          setState(prev => ({ ...prev, loading: true, error: null }));
          
          try {
            const response = await getUser();
            
            if (!response.success) {
              setState(prev => ({
                ...prev,
                loading: false,
                error: response.error || 'Failed to fetch user'
              }));
              return null;
            }
            
            // Only updates state if the user data actually changed
            safeUpdateState(
              setState,
              state,
              { ...state, user: response.data, loading: false },
              'user'
            );
            
            return response.data;
          } catch (error: any) {
            setState(prev => ({
              ...prev,
              loading: false,
              error: error.message || 'An unknown error occurred'
            }));
            return null;
          }
        });
        
        return userData || null;
      },
      
      logout: async () => {
        // Implementation here
      }
    };
  },
  
  // Initialize the context on mount
  onInitialize: async (actions) => {
    await actions.fetchUser();
  }
});

// Export the provider and hooks
export const UserContext = Context;
export const UserProvider = Provider;
export const useUser = useCtx;
```

## Example: Using in a Component

```tsx
// Component.tsx
import { useUser } from '@/context/UserContext';

export function UserProfile() {
  const { user, loading, error, fetchUser } = useUser();
  
  // The fetchUser function is protected against redundant calls
  // It's safe to call it multiple times or in different components
  const handleRefresh = () => {
    fetchUser();
  };
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!user) return <div>Not logged in</div>;
  
  return (
    <div>
      <h1>{user.name}</h1>
      <button onClick={handleRefresh}>Refresh</button>
    </div>
  );
}
```

## Best Practices

1. Always use the `protectedFetch` for data fetching
2. Use `safeUpdateState` to prevent unnecessary re-renders
3. Keep dependencies to a minimum in `useCallback` and `useEffect`
4. Don't include functions/objects as dependencies unless memoized
5. Add helpful logging to track render counts and state changes

## Manual Implementation

If you don't want to use the `createSafeContext` utility, you can still implement loop protection manually:

```typescript
import { useState, useRef, useCallback } from 'react';
import { useRequestProtection } from '@/hooks/useRequestProtection';

export function SomeProvider({ children }) {
  const [state, setState] = useState(initialState);
  
  // Add protection
  const { protectedFetch } = useRequestProtection('SomeName');
  
  // Create safe fetch functions
  const fetchData = useCallback(async () => {
    await protectedFetch('fetchData', async () => {
      // Implementation here
    });
  }, [protectedFetch]); // Minimal dependencies
  
  // Initialize once
  useEffect(() => {
    const didInit = useRef(false);
    
    if (!didInit.current) {
      didInit.current = true;
      fetchData();
    }
    
    return () => {
      didInit.current = false;
    };
  }, []);
  
  // Rest of the provider
}
``` 