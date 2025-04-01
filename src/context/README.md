# Context Directory

This directory contains React Context definitions that serve as the foundation for our state management architecture. Context files define the shape of our application state without implementing the actual state logic.

## Architecture Overview

```
┌──────────────────────┐
│  Context Definitions │   Context shape & types (YOU ARE HERE)
│  /context            │   Interface between providers and hooks
└──────────┬───────────┘
           │
           │     ┌──────────────────┐
           ├────▶│ Providers        │   Pure data containers
           │     │ /app/providers   │   State storage only
           │     └──────────────────┘
           │
           │     ┌──────────────────┐
           └────▶│ Hooks            │   Business logic
                 │ /hooks           │   Data operations
                 └──────────────────┘
```

## Purpose

The context directory serves three main purposes:

1. **Define state shapes** - TypeScript interfaces for all contexts
2. **Create context objects** - `createContext()` calls with default values
3. **Export context hooks** - Simple `useContext` wrappers for type safety

## Context File Structure

Each context file should follow this minimal pattern:

```typescript
'use client';

import { createContext, useContext } from 'react';

// 1. Define type
export interface ExampleContextType {
  data: ExampleData | null;
  setData: (data: ExampleData | null) => void;
}

// 2. Create context with default value
export const ExampleContext = createContext<ExampleContextType | null>(null);

// 3. Create simple hook for consuming components
export function useExampleContext() {
  const context = useContext(ExampleContext);

  if (!context) {
    throw new Error('useExampleContext must be used within an ExampleProvider');
  }

  return context;
}
```

## Important Guidelines

1. **Context files should be minimal**

   - ONLY define types and create context
   - NO business logic
   - NO state implementations
   - NO data fetching

2. **Context is the contract**

   - Defines the interface between providers and hooks
   - Providers implement the state storage
   - Hooks implement the business logic

3. **Keep context surface minimal**
   - Include only what's needed for components
   - Prefer primitive state + setter methods
   - Avoid complex objects when possible

## Available Contexts

| Context             | Purpose              | Provider             | Main Hook       |
| ------------------- | -------------------- | -------------------- | --------------- |
| `UserContext`       | User authentication  | `UserProvider`       | `useUser`       |
| `TeamContext`       | Team management      | `TeamProvider`       | `useTeam`       |
| `PermissionContext` | Permission state     | `PermissionProvider` | `usePermission` |
| `SidebarContext`    | Sidebar UI state     | `SidebarProvider`    | `useSidebar`    |
| `ThemeContext`      | Theme preferences    | `ThemeProvider`      | `useTheme`      |
| `FontContext`       | Font settings        | `FontProvider`       | `useFont`       |
| `SearchContext`     | Search functionality | `SearchProvider`     | `useSearch`     |

## Context Usage Patterns

### 1. For Components: Import from central entry point

```typescript
// Always import from central export
import { useUser, useTeam, usePermission } from '@/context';

function MyComponent() {
  // Access multiple contexts efficiently
  const { user } = useUser();
  const { activeTeam } = useTeam();
  const { hasPermission } = usePermission();

  return (/* component implementation */);
}
```

### 2. For Hooks: Import context hooks directly

```typescript
// When building custom hooks, import specific context hook
import { useUserContext } from '@/context/UserContext';
import { useTeamContext } from '@/context/TeamContext';

export function useCustomFeature() {
  // Combine multiple contexts in business logic hook
  const userContext = useUserContext();
  const teamContext = useTeamContext();

  // Implement business logic here

  return {
    // Return computed values and methods
  };
}
```

## Best Practices

✅ **DO**:

- Keep context definitions minimal
- Define clear TypeScript interfaces
- Include null checks in context hooks
- Export well-named context hooks
- Maintain a centralized export in `index.ts`

❌ **DON'T**:

- Add business logic to context files
- Implement state in context files
- Include data fetching in context files
- Mix context and provider responsibilities
- Create unnecessarily large context shapes

## Relationship with Caching Strategy

Contexts define the state shape that is used at multiple levels of our caching architecture:

1. **Server Actions** - Cached READ operations define initial data shape
2. **React Query** - Client-side caching mechanism for data updates
3. **Providers** - Implement the context with state storage
4. **Components** - Consume context data through hooks

Contexts should define a data structure that is compatible with both the server action responses and the React Query cache shapes.

## Migration Strategy

When migrating or creating new features:

1. Start with context definition (shape of the state)
2. Implement minimal provider (state storage)
3. Create business logic hooks (operations on state)
4. Connect to server actions (data source)
5. Consume in components (UI)

This order ensures a clean separation of concerns and maintains the proper architecture.
