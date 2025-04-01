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
│  Server Actions      │   Server-side caching with Next.js cache()
│  /app/actions        │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  React Query Hooks   │   Client-side caching with React Query
│  /hooks              │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  Providers           │   State management & context (YOU ARE HERE)
│  /app/providers      │
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

2. **Client Components**

   ```typescript
   'use client';

   export function ExampleProvider({ children, data }) {
     return (
       <ExampleContext.Provider value={{ data }}>
         {children}
       </ExampleContext.Provider>
     );
   }
   ```

3. **Separation of Concerns**
   - Data storage ONLY in providers
   - Business logic in hooks (/hooks/\*)
   - Data fetching in React Query hooks
   - Cache management in server actions

## Current Providers

- `UserProvider`: User authentication state
- `TeamProvider`: Team management state
- `SidebarProvider`: UI state for sidebar
- `PermissionProvider`: User permissions state
- `ThemeProvider`: Theme preferences

## Usage Example

```typescript
// Good: Data-only provider
export function UserProvider({ children, user }) {
  return (
    <UserContext.Provider value={{ user }}>
      {children}
    </UserContext.Provider>
  );
}

// Bad: Provider with business logic or data fetching
export function UserProvider({ children }) {
  const { data } = useQuery(...);  // ❌ No data fetching
  const [state, setState] = useState();  // ❌ No state management

  useEffect(() => {}, []); // ❌ No side effects

  return <UserContext.Provider>{children}</UserContext.Provider>;
}
```

## Data Flow

1. Server Components fetch initial data using server actions
2. Data is passed to providers via props
3. Providers make data available through context
4. Components access data using context hooks
5. Updates are handled through React Query mutations

## Caching Strategy

- **Server Actions**: Use Next.js `cache()` for server-side caching
- **React Query**: Handles client-side caching and state updates
- **Providers**: NO caching, only state distribution
- **Components**: Consume cached data through hooks

## Anti-patterns to Avoid

❌ Don't fetch data in providers
❌ Don't implement business logic in providers
❌ Don't manage cache in providers
❌ Don't handle side effects in providers
❌ Don't mix provider responsibilities

✅ Do keep providers focused on data distribution
✅ Do use React Query for data fetching
✅ Do implement business logic in hooks
✅ Do handle side effects in components
