# Context Migration Guide

This guide explains how to migrate components from using feature-specific contexts to the new centralized context system.

## Overview

AutomAI has migrated from feature-specific context providers to a centralized context architecture. This means:

- ❌ **No longer use** context files in feature directories (`/src/app/[locale]/[tenant]/*/context.tsx`)
- ❌ **No longer use** hooks files in feature directories (`/src/app/[locale]/[tenant]/*/hooks.ts`)
- ✅ **Use** centralized context hooks from `/src/context`

## Step-by-Step Migration Process

### 1. Identify Context Usage

First, identify how the component is currently using context:

```typescript
// OLD: Import from feature-specific hooks
import { useHosts } from '../../hosts/hooks';
import { useHostContext } from '../../hosts/context';

// OLD: Using feature-specific context provider
<HostProvider>
  <MyComponent />
</HostProvider>
```

### 2. Update Imports

Replace feature-specific imports with centralized context imports:

```typescript
// NEW: Import from centralized context
import { useHost } from '@/context';
```

### 3. Update Hook Usage

Update the hook function names and usage patterns:

```typescript
// OLD way
const { hosts, loading, error, fetchHosts } = useHosts();

// NEW way
const { hosts, loading, error, fetchHosts } = useHost();
```

### 4. Remove Context Providers

The centralized context system already provides all contexts through the `AppProvider` in the root layout. Remove any feature-specific providers:

```typescript
// OLD way
return (
  <HostProvider>
    <MyComponent />
  </HostProvider>
);

// NEW way
return <MyComponent />;
```

### 5. Update Type Imports

If you were importing types from the old context files, update to use types from the new context directory:

```typescript
// OLD way
import { Host } from '../../hosts/types';

// NEW way
import { Host } from '@/types/host';
// OR
import { HostContextType } from '@/types/context/host';
```

## Common Issues and Solutions

### Context Undefined Error

If you see "Cannot read properties of undefined" errors when using context hooks:

1. Make sure you're importing from `@/context`
2. Check that the component is being rendered within the AppProvider tree
3. Verify the hook name matches the context type (e.g., `useHost` not `useHosts`)

### Missing Properties

If TypeScript errors show properties missing from the context:

1. Check the context type definitions in `/src/types/context/*`
2. Use the correct hook - each context has its own dedicated hook

### State Updates Not Reflected

If state updates aren't visible in the component:

1. Make sure you're calling the right action functions from the context
2. Check that the component is not memoized incorrectly (dependencies list)
3. Verify that the action is updating the state correctly

## Example

Here's a complete example of a migrated component:

```typescript
// OLD version
import { useHosts } from '../../hosts/hooks';

function HostList() {
  const { hosts, loading, error, fetchHosts } = useHosts();
  
  useEffect(() => {
    fetchHosts();
  }, [fetchHosts]);
  
  return <div>{/* Component JSX */}</div>;
}

// NEW version
import { useHost } from '@/context';

function HostList() {
  const { hosts, loading, error, fetchHosts } = useHost();
  
  useEffect(() => {
    fetchHosts();
  }, [fetchHosts]);
  
  return <div>{/* Component JSX */}</div>;
}
```

## Reference

For more details on the centralized context architecture, refer to:

1. [Context Architecture Documentation](/docs/context-architecture.md)
2. [Context Demo Component](/src/components/example/ContextDemo.tsx) 