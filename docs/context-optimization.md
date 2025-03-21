# Context System Optimization Guidelines

This document provides guidelines and best practices for the optimized context system in the AutomAI application.

## Table of Contents

1. [Performance Optimization](#performance-optimization)
2. [Error Handling](#error-handling)
3. [Loading State Management](#loading-state-management)
4. [Testing](#testing)
5. [Maintaining Context](#maintaining-context)

## Performance Optimization

### Use `useCallback` for All Action Functions

All action functions in context providers should be wrapped with `useCallback` to prevent unnecessary re-renders:

```typescript
const fetchData = useCallback(async () => {
  // Implementation
}, [dependencies]);
```

### Use `useMemo` for Computed Values

Memoize computed values to prevent recalculation on every render:

```typescript
const filteredItems = useMemo(() => {
  return items.filter(item => item.status === 'active');
}, [items]);
```

### Memoize Context Value

Always memoize the context value object to prevent unnecessary re-renders of consuming components:

```typescript
const contextValue = useMemo(() => ({
  // State
  data,
  loadingStatus,
  error,
  
  // Actions
  fetchData,
  updateItem,
  deleteItem
}), [
  data, 
  loadingStatus, 
  error, 
  fetchData, 
  updateItem, 
  deleteItem
]);
```

### Avoid Frequent State Updates

Batch state updates when possible and avoid updating state in loops:

```typescript
// Good
setData(prevData => ({
  ...prevData,
  items: updatedItems,
  lastUpdated: new Date()
}));

// Avoid
setItems(updatedItems);
setLastUpdated(new Date());
```

## Error Handling

### Use Structured Error Objects

Use a consistent structure for error objects throughout the application:

```typescript
interface ContextError {
  code: string;
  message: string;
  details?: Record<string, any>;
}
```

### Format Errors Consistently

Convert various error types to a consistent format:

```typescript
const formatError = (error: any, defaultCode = 'UNKNOWN_ERROR'): ContextError => {
  if (typeof error === 'string') {
    return { code: defaultCode, message: error };
  }
  
  if (error instanceof Error) {
    return { code: defaultCode, message: error.message };
  }
  
  return { 
    code: defaultCode, 
    message: 'An unexpected error occurred',
    details: { originalError: error }
  };
};
```

### Log Errors for Debugging

Always log errors in a consistent way for easier debugging:

```typescript
console.error(`${contextName} error (${operation}):`, error);
```

### Provide Context-Specific Error Codes

Use context-specific error codes for easier identification:

```typescript
const error = formatError(result.error, `HOST_${operation.toUpperCase()}_ERROR`);
```

## Loading State Management

### Track Loading State with Operation Context

Include operation information in loading state to allow more granular UI feedback:

```typescript
interface LoadingStatus {
  state: 'idle' | 'loading' | 'success' | 'error';
  operation: string | null;
  entityId: string | null;
}
```

### Helper Functions for Setting Loading States

Create reusable functions for setting different loading states:

```typescript
const setLoading = useCallback((operation: string, entityId?: string | null) => {
  setState(prev => ({
    ...prev,
    loadingStatus: {
      state: 'loading',
      operation,
      entityId: entityId || null
    },
    error: null
  }));
}, []);

const setSuccess = useCallback((operation: string, entityId?: string | null) => {
  setState(prev => ({
    ...prev,
    loadingStatus: {
      state: 'success',
      operation,
      entityId: entityId || null
    },
    error: null
  }));
}, []);
```

### Provide Loading State Helpers

Include helper functions to check loading state for specific operations:

```typescript
const isLoading = useCallback((operation?: string, entityId?: string): boolean => {
  const { state, operation: currentOp, entityId: currentEntityId } = loadingStatus;
  
  if (!operation) return state === 'loading';
  
  if (operation && !entityId) {
    return state === 'loading' && currentOp === operation;
  }
  
  return state === 'loading' && currentOp === operation && currentEntityId === entityId;
}, [loadingStatus]);
```

### Use Operation Constants

Define constants for operation names to avoid typos:

```typescript
// In a constants file
export const OPERATIONS = {
  FETCH_ALL: 'FETCH_ALL',
  FETCH_ONE: 'FETCH_ONE',
  CREATE: 'CREATE',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE'
};

// In context
setLoading(OPERATIONS.FETCH_ALL);
```

## Testing

### Test Each Context Independently

Create comprehensive tests for each context:

```typescript
describe('HostContext', () => {
  it('provides initial state', () => {
    // Test code
  });
  
  it('fetches data successfully', async () => {
    // Test code
  });
  
  it('handles errors correctly', async () => {
    // Test code
  });
});
```

### Mock External Dependencies

Mock external services and actions in tests:

```typescript
jest.mock('@/app/[locale]/[tenant]/hosts/actions', () => ({
  getHosts: jest.fn(),
  getHost: jest.fn(),
  // Other functions
}));
```

### Test Loading States

Verify that loading states are correctly managed:

```typescript
// Click action button
act(() => {
  screen.getByTestId('fetch-data').click();
});

// Verify loading state
expect(screen.getByTestId('loading-state')).toHaveTextContent('loading');
expect(screen.getByTestId('loading-operation')).toHaveTextContent('FETCH_ALL');

// Wait for completion
await waitFor(() => {
  expect(screen.getByTestId('loading-state')).toHaveTextContent('success');
});
```

### Test Error Handling

Ensure errors are properly handled and displayed:

```typescript
// Mock error response
(actions.getData as jest.Mock).mockResolvedValue({
  success: false,
  error: 'Failed to fetch data'
});

// Wait for error state
await waitFor(() => {
  expect(screen.getByTestId('error-message')).toHaveTextContent('Failed to fetch data');
  expect(screen.getByTestId('loading-state')).toHaveTextContent('error');
});
```

## Maintaining Context

### Consistent Naming Conventions

Follow consistent naming conventions for all contexts:

- Context files: `[Feature]Context.tsx`
- Provider components: `[Feature]Provider`
- Hook functions: `use[Feature]` or `use[Feature]Context`
- Action functions: Verb + noun (e.g., `fetchHosts`, `updateHost`)

### Document Public API

Add JSDoc comments to all public functions and interfaces:

```typescript
/**
 * Fetch all hosts from the server
 * @returns Promise resolving to the list of hosts
 */
const fetchHosts = useCallback(async () => {
  // Implementation
}, [dependencies]);
```

### Keep Context Focused

Each context should have a single responsibility:

- Host context manages hosts
- Deployment context manages deployments
- Repository context manages repositories

### Update Types When Changing Context

Always keep type definitions in sync with context implementation:

```typescript
// When adding a new function to context
export interface HostActions {
  // Existing functions
  
  // New function
  resetFilters: () => void;
}
```

By following these guidelines, we ensure our context system is performant, maintainable, and provides a consistent experience throughout the application. 