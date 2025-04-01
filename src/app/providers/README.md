# Providers Architecture

This directory contains React Context Providers that follow a strict data-only pattern in our layered caching architecture.

## Architecture Overview

```
┌──────────────────────┐
│  Database Layer      │   No caching, raw data access
│  /lib/supabase/db-*  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Server Actions      │   Server-side caching with React's cache()
│  /app/actions        │   All READ operations must be cached
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  React Query Hooks   │   Client-side caching with React Query
│  /hooks              │   Business logic & data transformation
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Providers           │   State management & context (YOU ARE HERE)
│  /app/providers      │   Pure data containers, NO business logic
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  UI Components       │   Consume data, render UI
│  /_components        │
└──────────────────────┘
```

## Provider Rules

1. **Data-Only Containers**

   - Providers must be pure data containers
   - NO business logic
   - NO data fetching
   - NO side effects
   - NO direct server action calls

2. **Client Components**

   ```typescript
   'use client';

   export function ExampleProvider({ children, data }) {
     const [state, setState] = useState(data);

     return (
       <ExampleContext.Provider value={{
         data: state,
         setData: setState
       }}>
         {children}
       </ExampleContext.Provider>
     );
   }
   ```

3. **Separation of Concerns**
   - Data storage ONLY in providers
   - Business logic in hooks (/hooks/\*)
   - Data fetching in React Query hooks
   - Cache management in server actions (with React's cache() function)

## Relationship with Cached Server Actions

Providers should never directly call server actions. Instead:

1. For server components: Server actions are called and data is passed to providers as props
2. For client components: React Query hooks call cached server actions and manage the data flow

```typescript
// Server Component
export default async function Layout({ children }) {
  // Server component calls cached server actions
  const userData = await getUser();

  // Data is passed as props to the provider
  return (
    <UserProvider initialData={userData}>
      {children}
    </UserProvider>
  );
}

// Client Hook (in a separate file)
export function useUser() {
  // Client-side data fetching uses React Query + cached server actions
  const { data } = useQuery({
    queryKey: ['user'],
    queryFn: getUser  // This server action is already cached with cache()
  });

  // Hook provides business logic and returns data to components
  return {
    user: data?.user,
    isAdmin: data?.user?.role === 'admin',
    // ... more derived data and methods
  };
}
```

## Current Providers

- `UserProvider`: User authentication state
- `TeamProvider`: Team management state
- `SidebarProvider`: UI state for sidebar
- `PermissionProvider`: User permissions state
- `ThemeProvider`: Theme preferences

## Implementation Examples

### Correct Implementation (Data-Only)

```typescript
// context definition
export const UserContext = createContext<UserContextType | null>(null);

// provider implementation - data container only
export function UserProvider({ children, initialUser }) {
  const [user, setUser] = useState(initialUser);

  const value = useMemo(() => ({
    user,
    setUser
  }), [user]);

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

// hook implementation - business logic goes here, not in provider
export function useUser() {
  const context = useContext(UserContext);
  const queryClient = useQueryClient();

  // Business logic in the hook
  const isAdmin = context.user?.role === 'admin';

  // Data fetching with React Query
  const { data } = useQuery({
    queryKey: ['user'],
    queryFn: getUser, // Using cached server action
    initialData: context.user
  });

  // Mutations
  const updateUserMutation = useMutation({
    mutationFn: updateUser,
    onSuccess: (newUser) => {
      context.setUser(newUser);
      queryClient.invalidateQueries(['user']);
    }
  });

  return {
    user: data || context.user,
    isAdmin,
    updateUser: updateUserMutation.mutateAsync
  };
}
```

### Incorrect Implementation (Avoid This)

```typescript
// ❌ INCORRECT: Provider with business logic
export function UserProvider({ children }) {
  const [user, setUser] = useState(null);

  // ❌ WRONG: No data fetching in providers
  useEffect(() => {
    async function fetchUser() {
      const userData = await getUser();
      setUser(userData);
    }
    fetchUser();
  }, []);

  // ❌ WRONG: No business logic in providers
  const isAdmin = user?.role === 'admin';
  const canEditTeam = user?.permissions?.includes('team:edit');

  return (
    <UserContext.Provider value={{
      user,
      setUser,
      isAdmin,
      canEditTeam
    }}>
      {children}
    </UserContext.Provider>
  );
}
```

## Data Flow

1. **Initial Load (Server Components):**

   - Server Components fetch initial data using cached server actions (`cache()`)
   - Data is passed to providers via props
   - Providers store and distribute data through context

2. **Client-Side Updates:**
   - Components use hooks to access provider data and interact with server
   - Hooks use React Query to call cached server actions for data fetching
   - Mutations update both server state and provider state
   - Provider notifies all consuming components of changes

## Multi-Level Caching Strategy

- **Server Actions (cache()):**

  - All READ operations are cached using React's `cache()` function
  - Prevents redundant database calls for identical requests
  - Automatically deduplicates requests on the server

- **React Query (Client):**

  - Handles client-side caching and state updates
  - Manages loading, error states, and refetching
  - Configurable stale time and cache time

- **Providers:**
  - NO caching responsibility
  - Pure state distribution and management
  - Source of truth for client-side state

## Anti-patterns to Avoid

❌ Don't fetch data in providers
❌ Don't implement business logic in providers
❌ Don't manage cache in providers
❌ Don't handle side effects in providers
❌ Don't mix provider responsibilities
❌ Don't directly call uncached server actions in providers

✅ Do keep providers focused on data distribution
✅ Do use React Query for data fetching
✅ Do implement business logic in hooks
✅ Do handle side effects in components
✅ Do initialize providers with data from server components
✅ Do separate context creation from provider implementation
