# Server Actions Architecture

This directory contains all server actions for the application. Server actions are the bridge between client components and database operations, implementing proper caching, error handling, and data validation.

## Core Principles

1. **Mandatory Caching for READ Operations**

   - ALL READ operations MUST use the React `cache` function
   - WRITE operations should NOT be cached
   - Example:

   ```typescript
   import { cache } from 'react';

   // READ operation (should be cached)
   export const getUser = cache(async () => {
     // Implementation
   });

   // WRITE operation (should not be cached)
   export async function updateUser(data) {
     // Implementation
     revalidatePath('/path');
   }
   ```

2. **Cookie Handling**

   - ALWAYS await the `cookies()` function
   - Get cookies ONCE at the start of the action

   ```typescript
   const cookieStore = await cookies();
   const supabase = await createClient(cookieStore);
   ```

3. **Error Handling**

   - All actions MUST implement proper try/catch blocks
   - Log errors with standardized format: `[@action:module:function]`
   - Return typed error responses

4. **Mandatory Use of Library Layers**
   - NEVER access database directly from actions
   - ALWAYS use appropriate library layer:
     - Database operations: Use the DB layer (`src/lib/db/*`)
     - Business logic: Use the service layer (`src/lib/services/*`)
     - Git operations: Use the Git API layer (`src/lib/git/*`)

## Layered Architecture

1. **Base Library Layers** (`/src/lib/*`)

   - **Database Layer** (`/src/lib/db/*`)

     - Direct database operations
     - CRUD operations for each entity
     - NO business logic, only data access
     - Example: `hostDb.getHosts()`, `teamDb.createTeam()`

   - **Service Layer** (`/src/lib/services/*`)

     - Business logic and operations
     - Handles complex operations that might use multiple DB calls
     - Example: `hostService.testHostConnection()`, `deploymentService.deploy()`

   - **Git API Layer** (`/src/lib/git/*`)
     - Git provider-specific API implementations
     - Handles GitHub, GitLab, Gitea operations
     - Example: `githubApi.getRepositories()`, `gitlabApi.createWebhook()`

2. **Server Actions Layer** (`/app/actions/*`)

   - Mandatory caching for all READ operations
   - Error handling and logging
   - Calls the appropriate library layers
   - NEVER accesses database directly
   - Handles authentication and permissions
   - Example: Using DB layer - `const result = await hostDb.getHosts(tenantId);`

3. **React Query Layer** (`/hooks/*`)

   - Client-side caching
   - Uses cached server actions
   - Manages loading and error states

4. **Provider Layer** (`/app/providers/*`)
   - Pure data containers
   - No business logic
   - Uses React Query hooks

## Action Structure

### 1. Cached READ Operation Template

```typescript
export const myReadAction = cache(async (param: ParamType): Promise<ResultType> => {
  try {
    console.log(`[@action:module:myReadAction] Starting with param: ${param}`);

    // Get user for authentication
    const currentUser = await getUser();
    if (!currentUser) {
      return {
        success: false,
        error: 'Unauthorized - Please sign in',
      };
    }

    // Call the appropriate db layer
    const result = await moduleDb.getData(param);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || 'Failed to fetch data',
      };
    }

    return { success: true, data: result.data };
  } catch (error) {
    console.error(`[@action:module:myReadAction] Error:`, error);
    return { success: false, error: error.message || 'Operation failed' };
  }
});
```

### 2. Mutation Action Template

```typescript
export async function updateAction(param: ParamType): Promise<ResponseType> {
  try {
    console.log(`[@action:module:updateAction] Starting update`);

    // Get user for authentication
    const currentUser = await getUser();
    if (!currentUser) {
      return {
        success: false,
        error: 'Unauthorized - Please sign in',
      };
    }

    // Call the appropriate db layer
    const result = await moduleDb.updateData(param);

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Update failed',
      };
    }

    // Revalidate affected paths
    revalidatePath('/affected/path');

    return { success: true, data: result.data };
  } catch (error) {
    console.error(`[@action:module:updateAction] Error:`, error);
    return { success: false, error: error.message || 'Update failed' };
  }
}
```

## Current Action Modules

### `userAction.ts`

- User authentication and session management
- Profile operations
- Session persistence

### `teamAction.ts`

- Team CRUD operations
- Team member management
- Resource counting and limits
- All READ operations are cached

### `sessionAction.ts`

- Session management
- User authentication
- All READ operations are cached (`getCurrentSession`, `getCurrentUser`)

### `hostsAction.ts`

- Host management operations
- Host connectivity testing
- READ operations are cached (`getHosts`, `getHostById`)

### `repositoriesAction.ts`

- Repository CRUD operations
- Git provider management
- READ operations are cached (`getRepositories`, `getRepository`, `getGitProviders`, etc.)

## Caching Patterns

### 1. Simple READ Operations

```typescript
export const getData = cache(async (id: string) => {
  // Implementation
});
```

### 2. READ Operations with Parameters

```typescript
export const getFilteredData = cache(async (filter: FilterType) => {
  // Implementation with filtering
});
```

### 3. READ Operations with Authentication

```typescript
export const getProtectedData = cache(async () => {
  const user = await getUser();
  if (!user) {
    return { success: false, error: 'Unauthorized' };
  }
  // Call appropriate DB layer to fetch data
  const result = await dataDb.getProtectedData(user.id);
  return result;
});
```

### 4. Write Operations with Revalidation

```typescript
export async function updateData(data: DataType) {
  // Call appropriate DB layer
  const result = await dataDb.updateData(data);
  // Revalidate paths
  revalidatePath('/affected/path');
  return result;
}
```

## Real-World Examples

### Proper Implementation with DB Layer

```typescript
// From hostsAction.ts
export const getHosts = cache(
  async (filter?: HostFilter): Promise<{ success: boolean; error?: string; data?: Host[] }> => {
    try {
      // Get current user
      const currentUser = await getUser();
      if (!currentUser) {
        return { success: false, error: 'Unauthorized - Please sign in' };
      }

      // Get the user's tenant ID
      const tenantId = currentUser.tenant_id;

      // Call hostDb.getHosts with the tenant ID - using the DB layer
      const result = await hostDb.getHosts(tenantId);

      if (!result.success || !result.data) {
        return { success: false, error: result.error || 'Failed to fetch hosts' };
      }

      // Additional filtering in the action if needed
      let filteredData = result.data;
      if (filter?.status) {
        filteredData = filteredData.filter((host) => host.status === filter.status);
      }

      return { success: true, data: filteredData };
    } catch (error: any) {
      console.error('[@action:hosts:getHosts] Error fetching hosts:', error);
      return { success: false, error: error.message || 'Failed to fetch hosts' };
    }
  },
);
```

### Using Service Layer for Complex Operations

```typescript
// From hostsAction.ts - testing a connection
export async function testHostConnection(id: string) {
  try {
    // Get user for authentication
    const currentUser = await getUser();
    if (!currentUser) {
      return { success: false, error: 'Unauthorized - Please sign in' };
    }

    // Get the host from DB layer
    const hostResult = await hostDb.getHostById(id);
    if (!hostResult.success || !hostResult.data) {
      return { success: false, error: 'Host not found' };
    }

    // Update host status using DB layer
    await hostDb.updateHostStatus(id, 'testing');

    // Use service layer for complex business logic
    const result = await hostService.testHostConnection(hostResult.data);

    // Update host status based on test result
    await hostDb.updateHostStatus(id, result.success ? 'connected' : 'failed');

    // Revalidate paths
    revalidatePath('/[locale]/[tenant]/hosts');

    return result;
  } catch (error) {
    console.error('[@action:hosts:testHostConnection] Error:', error);
    return { success: false, error: error.message };
  }
}
```

## Best Practices

1. **Action Naming**

   - Use clear, descriptive names
   - Prefix with verb for mutations (create, update, delete)
   - Use nouns for queries (user, team, members)

2. **Type Safety**

   - Define input and output types
   - Use TypeScript strict mode
   - Export types for client usage

3. **Error Handling**

   - Use consistent error format
   - Include context in error messages
   - Log errors with proper categorization

4. **Performance**

   - Cache all READ operations
   - Minimize database calls
   - Use proper indexes
   - Implement proper revalidation

5. **Security**
   - Validate user authentication
   - Check permissions
   - Sanitize inputs
   - Use proper RLS policies

## Anti-patterns to Avoid

❌ **DON'T** create uncached READ operations

```typescript
// BAD
export async function getData() {
  // Implementation
}

// GOOD
export const getData = cache(async () => {
  // Implementation
});
```

❌ **DON'T** access cookies multiple times

```typescript
// BAD
const result1 = await db1.operation1(await cookies());
const result2 = await db2.operation2(await cookies());

// GOOD
const cookieStore = await cookies();
const result1 = await db1.operation1(cookieStore);
const result2 = await db2.operation2(cookieStore);
```

❌ **DON'T** mix business logic with data access

```typescript
// BAD
export const getData = cache(async () => {
  // Business logic here
  const processedData = complexCalculations(data);
  return processedData;
});

// GOOD
// Business logic in hooks or service layer
export const getData = cache(async () => {
  return rawData;
});
```

❌ **DON'T** cache WRITE operations

```typescript
// BAD
export const updateData = cache(async (data) => {
  // Update implementation
  revalidatePath('/path');
});

// GOOD
export async function updateData(data) {
  // Update implementation
  revalidatePath('/path');
}
```

❌ **DON'T** access the database directly from actions

```typescript
// BAD
export const getData = cache(async () => {
  const { data } = await supabase.from('table').select('*');
  return data;
});

// GOOD
export const getData = cache(async () => {
  const result = await tableDb.getData();
  return result;
});
```

## Testing

1. **Unit Tests**

   - Test each action in isolation
   - Mock database calls
   - Verify error handling

2. **Integration Tests**

   - Test action chains
   - Verify caching behavior
   - Test revalidation paths

3. **E2E Tests**
   - Test complete workflows
   - Verify client-server interaction
   - Test error scenarios
