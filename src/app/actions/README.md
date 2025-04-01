# Server Actions Architecture

This directory contains all server actions for the application. Server actions are the bridge between client components and database operations, implementing proper caching, error handling, and data validation.

## Core Principles

1. **Mandatory Caching**

   - ALL server actions MUST use the React `cache` function
   - Example:

   ```typescript
   import { cache } from 'react';

   export const getUser = cache(async () => {
     // Implementation
   });
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

### 1. Basic Action Template

```typescript
export const myAction = cache(async (param: ParamType): Promise<ResultType> => {
  try {
    console.log(`[@action:module:myAction] Starting with param: ${param}`);
    const cookieStore = await cookies();

    // Implementation

    return result;
  } catch (error) {
    console.error(`[@action:module:myAction] Error:`, error);
    throw error;
  }
});
```

### 2. Mutation Action Template

```typescript
export const updateAction = cache(async (param: ParamType): Promise<void> => {
  try {
    console.log(`[@action:module:updateAction] Starting update`);
    const cookieStore = await cookies();

    // Implementation

    // Revalidate affected paths
    revalidatePath('/affected/path');
  } catch (error) {
    console.error(`[@action:module:updateAction] Error:`, error);
    throw error;
  }
});
```

## Layered Architecture

1. **Database Layer** (`/lib/db/*`)

   - No caching
   - Direct database operations
   - Accepts cookieStore parameter

2. **Server Actions Layer** (`/app/actions/*`)

   - Mandatory caching
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
- All operations are cached

### `teamMemberAction.ts`

- Team member CRUD operations
- Permission management
- Role assignments
- All operations are cached

## Caching Patterns

### 1. Read Operations

```typescript
export const getData = cache(async (id: string) => {
  // Implementation
});
```

### 2. Write Operations with Revalidation

```typescript
export const updateData = cache(async (data: DataType) => {
  // Implementation
  revalidatePath('/affected/path');
});
```

### 3. Composite Operations

```typescript
export const complexOperation = cache(async (param: ParamType) => {
  const result1 = await cachedAction1(param);
  const result2 = await cachedAction2(result1.id);
  return combineResults(result1, result2);
});
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

   - Cache all operations
   - Minimize database calls
   - Use proper indexes
   - Implement proper revalidation

5. **Security**
   - Validate user authentication
   - Check permissions
   - Sanitize inputs
   - Use proper RLS policies

## Anti-patterns to Avoid

❌ **DON'T** create uncached actions

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
