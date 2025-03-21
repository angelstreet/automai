---
description: Claude AI Assistant Guidelines for AutomAI Codebase
globs: ["**/*"]
alwaysApply: true
---

# Claude Guidelines for AutomAI Codebase

## CRITICAL RULES - ALWAYS FOLLOW

1. **✅ NEVER modify code without understanding its purpose and context**
   - Always examine related files before proposing changes
   - Respect the existing architecture and patterns
   - Follow the established project structure

2. **✅ ALWAYS adhere to the three-layer architecture**
   - DB Layer (Core):
     - Feature-specific modules: `/src/lib/supabase/db-{feature}/` folders
     - Handles direct database interaction via Supabase
     - Returns consistent `DbResponse<T>` objects
   - Server Actions Layer (Bridge):
     - Feature-specific: `/src/app/[locale]/[tenant]/[feature]/actions.ts`
     - Handles business logic, validation, and authentication
     - Returns consistent `ActionResult<T>` objects
   - Client Hooks Layer (Interface):
     - Centralized context system with domain-specific providers in `/src/context/[domain]/`
     - Uses hooks as the primary API for UI components
     - NEVER calls DB Layer directly, only through Server Actions

3. **✅ NEVER expose sensitive data or credentials**
   - Keep all secrets and API keys in environment variables
   - Never hardcode credentials or tokens in code
   - Verify suggestions don't include sensitive information

4. **✅ ALWAYS implement proper error handling**
   - Handle errors at appropriate layers
   - Provide meaningful error messages
   - Implement graceful fallbacks

5. **✅ NEVER modify shadcn components**
   - Do not modify any files in `/src/components/shadcn/`
   - These are UI primitives that should remain unchanged
   - Extend functionality by composing components, not modifying them

6. **✅ NEVER run servers without explicit permission**
   - Do not run `npm run dev` or any server unless specifically asked
   - Use curl and static analysis for debugging instead of running servers
   - If server testing is necessary, propose it first with clear justification

7. **✅ ALWAYS provide clear plans before implementing changes**
   - Outline your approach before writing code
   - Get explicit agreement on the plan
   - Document any deviations from the approved plan

8. **✅ ALWAYS make minimal, focused changes**
   - Make the smallest change necessary to achieve the goal
   - Avoid refactoring unrelated code
   - Keep changes focused on solving the specific issue

## Architecture Overview

- **Next.js App Router**: 100% App Router based (no Pages Router components)
- **File structure**:
  - `/src/app` - All routes and pages
  - `/src/app/[locale]/[tenant]` - Main app structure with locale and tenant segments
  - `/src/components` - Shared components
  - `/src/lib` - Core utilities, services, and business logic
  - `/src/context` - Centralized React context providers (by domain)
  - `/src/types` - TypeScript type definitions
  - `/src/i18n` - Internationalization utilities
  - `/src/config` - Application configuration

## Centralized Context Architecture

### Context Organization

- **Use the centralized context system** in `/src/context/`:
  - Import contexts from the centralized location: `import { useHost, useRepository } from '@/context'`
  - NEVER import from feature-specific contexts
  - Context is organized by domain, not by feature

### Context Provider Structure

- **Provider Components**: Located in `/src/context/[domain]/[Domain]Provider.tsx`
- **Hook Exports**: Named exports as `use[Domain]` (e.g., `useHost`, `useRepository`)
- **Context Root Provider**: All context providers are composed in `AppProvider`

```typescript
// Proper context provider implementation
// In /src/context/host/HostProvider.tsx
import { createContext, useContext, useState, useCallback } from 'react';
import { getHostsAction, createHostAction } from '@/app/actions/host';

// Context type with strong typing
interface HostContextType {
  hosts: Host[];
  loading: boolean;
  error: string | null;
  // ...state properties
  fetchHosts: () => Promise<void>;
  createHost: (data: HostInput) => Promise<ActionResult<Host>>;
  // ...action methods
}

// Create context
const HostContext = createContext<HostContextType | undefined>(undefined);

// Provider component
export function HostProvider({ children }: { children: React.ReactNode }) {
  const [hosts, setHosts] = useState<Host[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Action methods with proper error handling
  const fetchHosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await getHostsAction();
      
      if (result.success) {
        setHosts(result.data);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Failed to fetch hosts');
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Other action methods...
  
  // Create value object
  const value = {
    hosts,
    loading,
    error,
    fetchHosts,
    // ...other properties and methods
  };
  
  return (
    <HostContext.Provider value={value}>
      {children}
    </HostContext.Provider>
  );
}

// Hook for consuming the context
export function useHost() {
  const context = useContext(HostContext);
  
  if (context === undefined) {
    throw new Error('useHost must be used within a HostProvider');
  }
  
  return context;
}
```

### Common Context Patterns

- **Loading States**: Use discriminated union for request states
  ```typescript
  type RequestState<T> = 
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'success', data: T }
    | { status: 'error', error: string };
  ```

- **List/Item Pattern**: For collection management
  ```typescript
  interface HostState {
    hosts: Host[];          // Collection
    selectedHostId: string | null; // Selection
    loadingState: RequestState<Host[]>;
    itemLoadingState: Record<string, RequestState<Host>>;
  }
  ```

- **Optimistic Updates**: For better UX
  ```typescript
  const createHost = useCallback(async (data) => {
    // Optimistic update
    const tempId = `temp-${Date.now()}`;
    const tempHost = { ...data, id: tempId, status: 'creating' };
    
    setHosts(prev => [...prev, tempHost]);
    
    try {
      const result = await createHostAction(data);
      
      if (result.success) {
        // Replace temp with real data
        setHosts(prev => prev.map(h => 
          h.id === tempId ? result.data : h
        ));
        return { success: true, data: result.data };
      } else {
        // Remove temp on failure
        setHosts(prev => prev.filter(h => h.id !== tempId));
        return { success: false, error: result.error };
      }
    } catch (err) {
      // Remove temp on error
      setHosts(prev => prev.filter(h => h.id !== tempId));
      return { success: false, error: 'Failed to create host' };
    }
  }, []);
  ```

## Supabase Integration and Authentication

### Client Architecture

- **Use centralized Supabase clients**:
  - `createBrowserClient()` - For client components
  - `createServerClient()` - For server components
  - `createMiddlewareClient()` - For middleware
  - `createAdminClient()` - For privileged operations
  - Never import Supabase clients directly in components or hooks

### Three-Layer Architecture for Supabase

1. **DB Layer** (Core)
   - **Feature-specific DB modules**:
     - Lives in `/src/lib/supabase/db-{feature}/` folders
     - Examples: `/src/lib/supabase/db-repositories/`, `/src/lib/supabase/db-hosts/`, etc.
     - Organized by domain to improve maintainability
   - Contains ALL actual Supabase database and auth calls
   - Only this layer should create Supabase clients using `createClient`
   - Uses server-side Supabase client with cookies()
   - Never imported directly by client components
   - Returns data in a consistent format: `{success, error, data}`

2. **Server Actions Layer** (Bridge)
   - Lives in `/src/app/[locale]/[tenant]/[feature]/actions.ts`
   - Server-only functions marked with 'use server'
   - MUST NOT create Supabase clients directly
   - MUST import and call functions from the DB Layer
   - Adds error handling, validation, and business logic
   - Returns data in a consistent format: `{success, error, data, ...additionalProps}`

3. **Client Hooks Layer** (Interface)
   - Lives in `/src/context/[domain]/` for domain-specific state
   - Client-side React providers marked with 'use client'
   - MUST NOT create Supabase clients directly
   - MUST call Server Actions (not DB Layer directly)
   - Manages loading states, errors, and data caching
   - Returns React-specific values like state and handlers

### Tenant Isolation

- Always enforce tenant boundaries in database operations
- Accept tenant_id as a parameter in DB Layer
- Get tenant_id from the current user in Server Actions Layer
- Never allow cross-tenant access

### DB Organization & Feature-Based Structure

- **Feature-Specific DB Modules**:
  - `/src/lib/supabase/db-repositories/` - Repository-related DB functions
    - `git-provider.ts` - Git provider operations
    - `repository.ts` - Repository operations
    - `pin-repository.ts` - Repository pin operations
  - `/src/lib/supabase/db-hosts/` - Host-related DB functions
  - `/src/lib/supabase/db-deployment/` - Deployment-related DB functions
  
- **Module Import Patterns**:
  ```typescript
  // Import directly from the feature-specific module (preferred)
  import { getHosts, createHost } from '@/lib/supabase/db-hosts';
  
  // Or via shorthand imports if set up
  import { hostDb } from '@/lib/supabase';
  ```

### Authentication Flow

- **Authentication Core**: In `/src/lib/supabase/auth.ts`
- **User Management**: In `/src/context/auth/AuthProvider.tsx`
- **Authentication Helper**: Server action `getUser()` in `/src/app/actions/user.ts`
- **Permission Check**: Always validate user in every server action

```typescript
// Example of proper authentication in server action
export async function getItemsAction(
  filter?: ItemFilter,
  user?: AuthUser
): Promise<ActionResult<Item[]>> {
  try {
    // Get user if not provided (reuse pattern)
    if (!user) {
      const userResult = await getUser();
      if (!userResult.success) {
        return { success: false, error: 'Authentication required' };
      }
      user = userResult.data;
    }
    
    // Use tenant_id from user for isolation
    const result = await getItems(user.tenant_id, filter);
    
    // Map and return data
    if (result.success) {
      return { success: true, data: result.data.map(mapDbItemToItem) };
    } else {
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('Error in getItemsAction:', error);
    return { success: false, error: 'Failed to fetch items' };
  }
}
```

## Caching and State Management

### State Management Approach

- **State Categories**:
  - **Server State**: Data from API (hosts, repositories, deployments)
    - Managed through context providers
    - Fetched via server actions
  - **Form State**: User input data (use React Hook Form)
  - **UI State**: Visual/interaction state (modals, tabs, selections)
    - Keep local when possible
    - Lift to context when shared

- **When to Use Context**:
  - State needed across multiple components
  - State that persists across route changes
  - Complex data fetching with loading/error states

- **When to Use Local State**:
  - UI-specific state (open/closed, selected tabs)
  - Form input state before submission
  - Animation or transition states

### Context Performance Optimization

- **Split Contexts by Update Frequency**:
  - Separate frequently updated state from stable state
  - Use context selectors to prevent unnecessary re-renders

- **Memoization**:
  - Use `useCallback` for all functions passed through context
  - Use `useMemo` for derived values and context value objects
  - Use `memo` for expensive components that consume context

```typescript
// Optimized context value creation
const value = useMemo(() => ({
  hosts,
  loading,
  error,
  fetchHosts,
  createHost,
  deleteHost
}), [
  hosts,
  loading,
  error,
  fetchHosts,
  createHost,
  deleteHost
]);
```

### Caching Strategy

1. **DB Layer**: ❌ NO caching
   - Always fetch fresh data from Supabase
   - Never cache at this level

2. **Server Actions Layer**: ✅ Optional TTL-based caching for expensive operations
   - Use `serverCache` utility for server-side caching
   - Clear cache on mutations
   - Use appropriate TTL values for different data types

3. **Client Context Layer**: ✅ Primary state management
   - Store fetched data in context state
   - Implement refetch mechanisms for data staleness
   - Support manual refresh when needed
   - Optionally persist in localStorage for specific cases

## Frontend Component Development

### Component Organization

- **Feature-based organization:** Group all feature-related files together
  - Each feature should have its own directory under `/app/[locale]/[tenant]/`
  - All related files for a feature should be in the same directory:
    - `_components/` - Feature-specific components
    - `actions.ts` - Server actions for the feature
    - `types.ts` - Type definitions for the feature
    - `constants.ts` - Constants for the feature
    - `hooks.ts` - Feature-specific hooks
    - `utils.ts` - Utility functions for the feature
    - `page.tsx` - Page component for the feature
  
- **Shared functionality** goes in dedicated directories:
  - `/src/components/` - Shared components used across multiple features
  - `/src/context/` - Shared context providers organized by domain
  - `/src/types/` - Shared type definitions
  - `/src/lib/` - Core utilities, services, and business logic

```
app/
  └── [locale]/
      └── [tenant]/
          └── feature/           # Feature directory (e.g., dashboard, hosts, deployment)
              ├── _components/   # Feature-specific components
              ├── actions.ts     # Feature-specific server actions
              ├── types.ts       # Feature-specific types
              ├── constants.ts   # Feature-specific constants
              ├── utils.ts       # Feature-specific utilities
              └── page.tsx       # Feature page component
```

- **shadcn components** go in `/src/components/shadcn/` (never modify these)
- **General UI components** go in `/src/components/ui/`
- **Layout components** go in `/src/components/layout/`
- **Form components** go in `/src/components/form/`

### Using Context in Components

```typescript
// Proper context usage in components
'use client';

import { useHost } from '@/context'; // Import from centralized location

export function HostList() {
  const { hosts, loading, error, fetchHosts } = useHost();
  
  // Use the context values in your component
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      <button onClick={fetchHosts}>Refresh</button>
      <ul>
        {hosts.map(host => (
          <li key={host.id}>{host.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Server vs. Client Components

- Use Server Components by default
- Add 'use client' directive only when needed:
  - Client-side state (useState, useReducer)
  - Effects (useEffect, useLayoutEffect)
  - Browser-only APIs
  - Event handlers
  - Context consumers (components using context hooks)
- **IMPORTANT:** Never use `React.use()` in Client Components:
  - `React.use()` is for unwrapping promises in Server Components only
  - In Client Components, hooks like `useParams()` already return resolved values, not promises
  - Using `React.use()` in Client Components will cause runtime errors

### Component Structure

- Keep component files under 300 lines of code
- Break large components into smaller sub-components
- Extract complex logic into custom hooks
- Follow this internal structure:
  ```typescript
  // Types first
  interface ButtonProps {
    variant?: 'primary' | 'secondary';
    size?: 'sm' | 'md' | 'lg';
    onClick?: () => void;
    children: React.ReactNode;
  }

  // Helper functions next
  const getButtonClasses = (variant: string, size: string) => {
    // ...
  };

  // Component last
  export function Button({
    variant = 'primary',
    size = 'md',
    onClick,
    children
  }: ButtonProps) {
    // ...
  }
  ```

## API Design and Implementation

### Server Action Implementation

- **Location**: Feature-specific `/src/app/[locale]/[tenant]/[feature]/actions.ts`
- **Directive**: Always include 'use server' at the top of the file
- **Authentication**: Validate user in every action
- **Validation**: Use zod for input validation
- **Response Format**: Return consistent `ActionResult<T>` objects

### Function Structure

- **Parameter Validation**: Validate inputs before processing
- **Authentication Check**: Verify user is authenticated
- **Permission Check**: Verify user has appropriate permissions
- **Cache Check**: Check cache before database access
- **Database Operation**: Perform core operation
- **Response Mapping**: Convert DB types to UI types
- **Cache Update**: Update or invalidate cache as needed
- **Error Handling**: Catch and handle all errors

### URL Structure

- Use RESTful URL patterns
- Use resources, not actions, in URLs
- Use kebab-case for multi-word paths

```
✅ CORRECT:
GET    /api/projects                # List projects
POST   /api/projects                # Create project
GET    /api/projects/123            # Get project
PUT    /api/projects/123            # Update project
DELETE /api/projects/123            # Delete project
POST   /api/projects/123/publish    # Resource action

❌ INCORRECT:
GET    /api/getProjects             # Uses verb
POST   /api/createProject           # Uses verb
GET    /api/getProject/123          # Uses verb
```

### Request Validation

- Use Zod for request validation
- Validate all incoming data before processing
- Return clear validation error messages
- Follow consistent validation patterns

### Response Format

All API responses must follow a standard format:

#### Success Response
```json
{
  "success": true,
  "data": {...},
  "message": "Optional success message"
}
```

#### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": {...}  // Optional validation details
}
```

## Code Quality and Style

### Naming Conventions

- Use descriptive, intention-revealing names
- Follow consistent casing conventions:
  - PascalCase for components, interfaces, and types
  - camelCase for variables, functions, and instances
  - UPPER_CASE for constants
- Prefix boolean variables with "is", "has", "should", etc.
- Prefix event handlers with "handle" or "on"
- Prefix custom hooks with "use"

### TypeScript Best Practices

- Use explicit type annotations for function parameters and returns
- Avoid `any` in favor of proper types or `unknown`
- Use discriminated unions for complex state management
- Create interfaces for component props and context values
- Use generics for reusable types and functions

### Functions and Methods

- Keep functions small and focused on a single responsibility
- Limit function parameters (use objects for multiple parameters)
- Return early to avoid deep nesting
- Use meaningful return values

### Error Handling

- Handle errors explicitly and intentionally
- Provide meaningful error messages
- Use try/catch blocks appropriately
- Avoid swallowing errors

### Comments and Documentation

- Write self-documenting code where possible
- Use comments to explain "why", not "what"
- Document complex algorithms and business rules
- Add JSDoc comments for public APIs and interfaces

## Build/Test/Lint Commands

```bash
# Development
npm run dev               # Run full dev server with custom server
npm run build             # Create production build
npm run start             # Start production server
npm run lint              # Run ESLint
npm run lint:fix          # Fix ESLint issues
npm run format            # Run Prettier formatter
npm run format:check      # Check formatting without fixing
npm run test              # Run all tests
npm run test:watch        # Run tests in watch mode
npm run test:e2e          # Run end-to-end tests
npm run analyze           # Analyze bundle size
npm run browser-tools     # Run browser tools server

# Electron
npm run electron-dev      # Run Electron in development mode
npm run electron-build    # Build Electron application
npm run electron-pack     # Package Electron application
```

## Common Pitfalls to Avoid

- **Bypassing the Three-Layer Architecture** - Never call DB Layer directly from Client Hooks
- **Using Old Feature-Specific Contexts** - Always use the centralized context system
- **Missing Tenant Isolation** - Always include tenant_id in database queries
- **Direct Supabase Usage** - Never import Supabase clients directly in components or hooks
- **Not Awaiting Async APIs** - Remember to await all async operations
- **Exposing Supabase Keys** - Never expose service role keys in client code
- **Inconsistent Error Handling** - Always use the standardized error format
- **Using React.use() with Promises in Client Components** - Never use React.use() in client components
- **Using Incorrect Client** - Use the appropriate client for each context
- **Modifying shadcn Components** - Never modify components in `/src/components/shadcn/`
- **Running Servers Without Permission** - Never run development servers without explicit request
- **Using Wrong DB Module** - Use the appropriate feature-specific DB module for domain operations
- **Not Following Standard Response Format** - Always return `{success, error, data}` from operations

## Useful Cursor Rules References

For more detailed guidelines on specific aspects of the codebase, refer to these Cursor rules:

- **core-general.mdc** - General development guidelines
- **core-architecture.mdc** - Three-layer architecture details
- **code-quality.mdc** - Code quality and style standards
- **ui-state.mdc** - Context and state management patterns
- **ui-components.mdc** - UI component patterns
- **api-design.mdc** - API design principles
- **api-implementation.mdc** - API implementation details
- **data-supabase.mdc** - Supabase database patterns
- **data-auth.mdc** - Authentication patterns
- **data-caching.mdc** - Caching strategies
- **core-testing.mdc** - Testing strategies and patterns
- **feature-specific.mdc** - Feature-specific guidelines 