# Hosts Module Migration Plan

## Current Architecture Analysis

The hosts module currently uses a hybrid approach of server and client components with custom events for communication, lacking a structured pattern for state management.

### Current Implementation

1. **Page Component (`page.tsx`)**:

   - Fetches hosts on the server side with `getHosts()`
   - Gets count of hosts and passes to client components
   - Uses suspense with `HostSkeleton` as fallback
   - Renders `HostContent` as primary content

2. **Server Components**:

   - `HostContent.tsx`: Fetches hosts and passes them to `ClientHostList`
   - `HostSkeleton.tsx`: Displays loading state

3. **Client Components**:

   - `ClientHostList.tsx`: Manages state, handles CRUD operations via server actions
   - `HostActions.tsx`: Handles UI actions, view toggle, refresh, and add host dialog
   - `ClientConnectionForm.tsx`: Form for adding hosts

4. **Communication Pattern**:
   - Uses custom events for cross-component communication:
     - `VIEW_MODE_CHANGE`: Toggle between grid and table views
     - `refresh-hosts`: Trigger data refresh
     - `host-count-updated`: Update count in actions component
   - Direct calls to server actions from client components
   - No consistent use of React Query for client state

## Migration Goals

1. **Implement Server Component Architecture**:

   - Server components for initial data fetching
   - Client components for interactivity
   - Use React Query for client-side state management

2. **Maintain Existing Functionality**:

   - Preserve toggle between grid and table views
   - Keep all existing features (add, edit, delete, test connection)
   - Ensure identical UX with improved implementation

3. **Improve Code Quality**:
   - Eliminate custom events in favor of React Query
   - Implement consistent naming patterns
   - Reduce code duplication

## Component Changes

### Components to Rename

| Current Name               | New Name                   | Notes                                      |
| -------------------------- | -------------------------- | ------------------------------------------ |
| `ClientHostList.tsx`       | `HostListClient.tsx`       | Main client component for displaying hosts |
| `ClientConnectionForm.tsx` | `HostFormDialogClient.tsx` | Form for adding/editing hosts              |

### Components to Update

| Component         | Changes                                                  |
| ----------------- | -------------------------------------------------------- |
| `HostContent.tsx` | Simplify to only fetch data and pass to client component |
| `HostActions.tsx` | Convert to use React Query instead of custom events      |
| `HostTable.tsx`   | Ensure it's a pure presentational component              |
| `HostGrid.tsx`    | Ensure it's a pure presentational component              |

## Implementation Steps

### 1. Update useHost Hook (if needed)

Ensure the hook properly supports all required operations:

- Fetching hosts
- Creating hosts
- Updating hosts
- Deleting hosts
- Testing connections
- Toggle view mode

### 2. Server Component Updates

1. **HostContent.tsx**: Simplify to focus on data fetching:
   ```typescript
   export default async function HostContent() {
     const hostsResponse = await getHosts();
     const hosts = hostsResponse.success ? hostsResponse.data || [] : [];

     return <HostListClient initialHosts={hosts} />;
   }
   ```

### 3. Client Component Updates

1. **Rename and update `ClientHostList.tsx` to `HostListClient.tsx`**:

   - Use React Query via `useHost()` hook
   - Accept `initialHosts` prop for initial server data
   - Handle view mode toggle internally

2. **Rename and update `ClientConnectionForm.tsx` to `HostFormDialogClient.tsx`**:

   - Use React Query for mutations
   - Follow form dialog naming convention

3. **Update `HostActions.tsx`**:
   - Use React Query for state management
   - Remove custom events
   - Keep view mode toggle functionality

### 4. Implement View Mode Management

1. **Create a custom hook for view mode**:

   ```typescript
   export function useHostViewMode() {
     // Get initial mode from localStorage or default to 'grid'
     const [viewMode, setViewMode] = useState<'grid' | 'table'>(
       typeof localStorage !== 'undefined'
         ? (localStorage.getItem('hostViewMode') as any) || 'grid'
         : 'grid',
     );

     // Update localStorage when viewMode changes
     useEffect(() => {
       if (typeof localStorage !== 'undefined') {
         localStorage.setItem('hostViewMode', viewMode);
       }
     }, [viewMode]);

     return { viewMode, setViewMode };
   }
   ```

2. **Use this hook in both HostActions and HostListClient**

### 5. Testing and Verification

Verify all functionality works correctly:

- Hosts can be viewed in grid and table formats
- Toggle between views works
- Add, edit, delete operations work
- Test connection functionality works
- Proper loading states and error handling

## Benefits of Migration

1. **Improved Performance**:

   - Server-side data fetching for initial load
   - Optimized client-side updates with React Query
   - Reduced waterfalls and duplicate fetching

2. **Better Code Organization**:

   - Clear separation between server and client components
   - Standardized naming conventions
   - Improved state management

3. **Enhanced Maintainability**:

   - Removal of custom events reduces complexity
   - Consistent patterns across modules
   - More testable components with clear responsibilities

4. **User Experience**:
   - Preserved functionality with identical UX
   - Faster initial page load with server components
   - More responsive UI with optimized state updates
