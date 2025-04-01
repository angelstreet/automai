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

## Action Structure

### 1. Cached READ Operation Template

```typescript
export const myReadAction = cache(async (param: ParamType): Promise<ResultType> => {
  try {
    console.log(`[@action:module:myReadAction] Starting with param: ${param}`);
    const cookieStore = await cookies();

    // Implementation

    return result;
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
    const cookieStore = await cookies();

    // Implementation

    // Revalidate affected paths
    revalidatePath('/affected/path');

    return { success: true };
  } catch (error) {
    console.error(`[@action:module:updateAction] Error:`, error);
    return { success: false, error: error.message || 'Update failed' };
  }
}
```

## Layered Architecture

1. **Database Layer** (`/lib/db/*`)

   - No caching
   - Direct database operations
   - Accepts cookieStore parameter

2. **Server Actions Layer** (`/app/actions/*`)

   - Mandatory caching for all READ operations
   - Error handling
   - Data validation
   - Cookie management

3. **React Query Layer** (`/hooks/*`)

   - Client-side caching
   - Uses cached server actions
   - Manages loading and error states

4. **Provider Layer** (`/app/providers/*`)
   - Pure data containers
   - No business logic
   - Uses React Query hooks

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
  // Fetch data for authenticated user
});
```

### 4. Write Operations with Revalidation

```typescript
export async function updateData(data: DataType) {
  // Implementation
  revalidatePath('/affected/path');
}
```

## Real-World Examples

### Proper Caching Implementation

```typescript
// From sessionAction.ts
export const getCurrentUser = cache(async (): Promise<AuthUser | null> => {
  try {
    const cookieStore = await cookies();
    const user = await userDb.getCurrentUser(cookieStore);
    return user;
  } catch (error) {
    console.error('[@action:session:getCurrentUser] Error:', error);
    return null;
  }
});

// From hostsAction.ts
export const getHosts = cache(
  async (filter?: HostFilter): Promise<{ success: boolean; error?: string; data?: Host[] }> => {
    try {
      // Implementation
    } catch (error: any) {
      // Error handling
    }
  },
);
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
// Business logic in hooks
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
