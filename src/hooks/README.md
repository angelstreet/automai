# Hooks Directory

This directory contains all business logic hooks for the application. Each subdirectory represents a domain area (user, team, etc.).

## Architecture Overview

There are two patterns for state management in our application:

1. **Provider + Hooks Pattern** (for global state):

   - Used for domains requiring global state (User, Team, Sidebar)
   - Provider in `/src/app/providers/` for state storage
   - Hooks in `/src/hooks/` for business logic

2. **Hooks-Only Pattern** (for feature-specific state):
   - Used for most feature domains (Hosts, CICD, Deployments, Repositories)
   - No provider needed - React Query handles caching
   - All business logic in hooks

## Naming Convention

All hook files should follow the naming pattern:

```
hooks/[domain]/use[Domain].ts
```

Examples:

- `hooks/user/useUser.ts`
- `hooks/host/useHost.ts`
- `hooks/cicd/useCICD.ts`

## Usage Guidelines

1. **Components should always import hooks from context**:

   ```tsx
   import { useUser, useHost, useCICD } from '@/context';
   ```

2. **Hooks should use server actions for data management**:

   ```tsx
   // For READ operations (cached)
   import { getHosts } from '@/app/actions/hostsAction';

   // For WRITE operations (not cached)
   import { createHost, updateHost, deleteHost } from '@/app/actions/hostsAction';
   ```

3. **Hooks should contain all business logic**:

   - Data fetching with React Query (using cached server actions)
   - State management
   - Logic for derived data
   - Mutations (create, update, delete operations)
   - Error handling and data transformation

4. **Hook Implementation Pattern**:

   ```tsx
   'use client';

   import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
   import { getHosts, createHost } from '@/app/actions/hostsAction';

   export function useHost() {
     const queryClient = useQueryClient();

     // Queries (using cached READ operations)
     const { data, isLoading, error } = useQuery({
       queryKey: ['hosts'],
       queryFn: getHosts, // This is already cached at the server level
     });

     // Mutations (using non-cached WRITE operations)
     const createMutation = useMutation({
       mutationFn: createHost,
       onSuccess: () => queryClient.invalidateQueries(['hosts']),
     });

     // Derived data
     const connectedHosts = data?.data?.filter((host) => host.status === 'connected') || [];

     return {
       hosts: data?.data || [],
       connectedHosts,
       isLoading,
       error: error || data?.error,
       createHost: createMutation.mutateAsync,
       // Additional methods...
     };
   }
   ```

5. **Proper Error Handling**:
   ```tsx
   // Handle both React Query errors and action-level errors
   const error = queryError || (data?.success === false ? data.error : undefined);
   ```

## Caching Strategy

Our application implements multi-level caching:

1. **Server-level caching**:

   - Using React's `cache()` function
   - Applied to all READ operations in server actions
   - Automatically deduplicates identical requests

2. **Client-level caching**:
   - Using React Query
   - Configurable stale time and cache time
   - Automatic refetching based on user interaction

Hooks should leverage both levels of caching:

```tsx
// This query uses both React Query caching and server-side caching
const { data } = useQuery({
  queryKey: ['repositories'],
  queryFn: getRepositories, // Already cached on the server
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000, // 10 minutes
});
```

## Implemented Hooks

### Basic Hooks

- `useUser`: User authentication and state
- `useTeam`: Team management and selection
- `usePermission`: Permission checking and management (see Permission Handling section below)
- `useSidebar`: Sidebar state management

## Permission Handling

The application uses a role-based permission system implemented through the `usePermission` hook. This provides a centralized approach to checking permissions across the application.

### Key Functions

```tsx
// Check if user has a specific role
const { hasRole } = usePermission();
const isAdminUser = hasRole('admin');

// Check if user is an admin (convenience function)
const { isAdmin } = usePermission();
if (isAdmin()) {
  // Perform admin-only action
}

// Check if user can manage team members
const { canManageTeamMembers } = usePermission();
if (canManageTeamMembers()) {
  // Show team management UI
}

// Database-level permission check (legacy approach)
const { hasPermission } = usePermission();
const canCreateRepositories = hasPermission('repositories', 'insert');
```

### Implementation Details

- **Role-Based Checks**: The `hasRole`, `isAdmin`, and `canManageTeamMembers` functions check the user's role directly from the UserContext.
- **Permission Matrix**: The `hasPermission` function checks against the database permission matrix for more granular control.

### Best Practices

1. **Prefer Role-Based Checks**: Use `hasRole`, `isAdmin`, or `canManageTeamMembers` instead of direct permission checks when possible.

2. **Centralized Permission Logic**: All permission-related logic should be defined in the `usePermission` hook, not in individual components.

3. **Consistent Naming**: Use descriptive function names for specific permissions:
   ```tsx
   // In usePermission.ts
   const canEditDeployment = useCallback(() => {
     return isAdmin() || hasRole('developer');
   }, [isAdmin, hasRole]);

   // Export the function
   return {
     // ... other functions
     canEditDeployment,
   };
   ```

4. **UI Conditionals**: Use permission checks for conditional UI rendering:
   ```tsx
   const { canManageTeamMembers } = usePermission();

   return (
     <div>
       {canManageTeamMembers() && (
         <Button>Add Team Member</Button>
       )}
     </div>
   );
   ```

### Feature Hooks (Hooks-Only Pattern)

- `useHost`: Host management functions
- `useCICD`: CICD provider management
- `useDeployment`: Deployment operations
- `useDeploymentWizard`: Deployment configuration wizard
- `useRepository`: Repository management with essential functions for fetching, connecting, disconnecting, and testing repositories

## Real-World Examples

### Basic Hook with Queries and Mutations

```tsx
export function useHost() {
  const queryClient = useQueryClient();

  // Query for all hosts (using cached server action)
  const { data, isLoading } = useQuery({
    queryKey: ['hosts'],
    queryFn: getHosts,
  });

  // Query for a specific host (using cached server action with parameters)
  const getHostById = useCallback((id: string) => {
    return useQuery({
      queryKey: ['hosts', id],
      queryFn: () => getHostById(id),
      enabled: !!id,
    });
  }, []);

  // Mutation for creating a host (using non-cached server action)
  const createHostMutation = useMutation({
    mutationFn: createHost,
    onSuccess: () => {
      queryClient.invalidateQueries(['hosts']);
      toast.success('Host created successfully');
    },
    onError: (error) => {
      toast.error(`Failed to create host: ${error.message}`);
    },
  });

  // Mutation for deleting a host
  const deleteHostMutation = useMutation({
    mutationFn: deleteHost,
    onSuccess: () => queryClient.invalidateQueries(['hosts']),
  });

  return {
    hosts: data?.data || [],
    isLoading,
    getHostById,
    createHost: createHostMutation.mutateAsync,
    deleteHost: deleteHostMutation.mutateAsync,
  };
}
```

### Hook with Context Integration

```tsx
export function useSidebarWithQuery() {
  // Get state from context provider
  const { collapsed, setCollapsed } = useSidebarContext();

  // Use React Query for additional data
  const { data: dashboardStats } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: getDashboardStats, // Cached server action
  });

  // Combine context state with query data
  return {
    collapsed,
    toggleSidebar: () => setCollapsed(!collapsed),
    statsCount: dashboardStats?.data?.totalCount || 0,
  };
}
```

## Migration Strategy

When migrating components from direct action imports to hooks:

1. Replace action imports with context imports:

   ```diff
   - import { getHosts } from '@/app/actions/hostsAction';
   + import { useHost } from '@/context';
   ```

2. Replace action calls with hook functions:

   ```diff
   - const hostsResult = await getHosts();
   - setHosts(hostsResult.data || []);
   + const { hosts, isLoading } = useHost();
   ```

3. Update component to use React Query's automatic data management:
   ```diff
   - const [isLoading, setIsLoading] = useState(true);
   - const [error, setError] = useState<string | null>(null);
   -
   - useEffect(() => {
   -   async function fetchHosts() {
   -     try {
   -       setIsLoading(true);
   -       const result = await getHosts();
   -       if (result.success) {
   -         setHosts(result.data || []);
   -       } else {
   -         setError(result.error || 'Failed to fetch hosts');
   -       }
   -     } catch (err) {
   -       setError(err.message);
   -     } finally {
   -       setIsLoading(false);
   -     }
   -   }
   -   fetchHosts();
   - }, []);
   + const { hosts, isLoading, error } = useHost();
   ```
