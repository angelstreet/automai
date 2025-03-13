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
   - Server DB Layer (Core):
     - Core DB: `/src/lib/supabase/db.ts` and `/src/lib/supabase/auth.ts`
     - Feature-specific DB: `/src/lib/supabase/db-{feature}/` folders
   - Server Actions Layer (Bridge) - `/src/app/actions/*.ts`
   - Client Hooks Layer (Interface) - `/src/hooks/*.ts`

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
  - `/src/hooks` - Custom React hooks
  - `/src/context` - React context providers
  - `/src/types` - TypeScript type definitions
  - `/src/i18n` - Internationalization utilities
  - `/src/config` - Application configuration

## Supabase Integration and Authentication

### Client Architecture

- **Use centralized Supabase clients**:
  - `createBrowserClient()` - For client components
  - `createServerClient()` - For server components
  - `createMiddlewareClient()` - For middleware
  - `createAdminClient()` - For privileged operations
  - Never import Supabase clients directly in components or hooks

### Three-Layer Architecture for Supabase

1. **Server DB Layer** (Core)
   - **Core DB**:
     - Lives in `/src/lib/supabase/db.ts` and `/src/lib/supabase/auth.ts`
   - **Feature-specific DB**:
     - Lives in `/src/lib/supabase/db-{feature}/` folders
     - Examples: `/src/lib/supabase/db-repositories/`, `/src/lib/supabase/db-hosts/`, etc.
     - Organized by domain to improve maintainability
   - Contains ALL actual Supabase database and auth calls
   - Only this layer should create Supabase clients using `createClient`
   - Uses server-side Supabase client with cookies()
   - Never imported directly by client components
   - Returns data in a consistent format: `{success, error, data}`

2. **Server Actions Layer** (Bridge)
   - Lives in `/src/app/actions/*.ts`
   - Server-only functions marked with 'use server'
   - MUST NOT create Supabase clients directly
   - MUST import and call functions from the Server DB Layer
   - Adds error handling, validation, and business logic
   - Returns data in a consistent format: `{success, error, data, ...additionalProps}`

3. **Client Hooks Layer** (Interface)
   - Lives in `/src/hooks/*.ts`
   - Client-side React hooks marked with 'use client'
   - MUST NOT create Supabase clients directly
   - MUST call Server Actions (not Server DB directly)
   - Manages loading states, errors, and data caching
   - Returns React-specific values like state and handlers

### Tenant Isolation

- Always enforce tenant boundaries in database operations
- Accept tenant_id as a parameter in Server DB Layer
- Get tenant_id from the current user in Server Actions Layer
- Never allow cross-tenant access

### DB Organization & Feature-Based Structure

- **Core DB Files**:
  - `/src/lib/supabase/db.ts` - Generic DB functions and legacy interface
  - `/src/lib/supabase/auth.ts` - Authentication-specific functions
  
- **Feature-Specific DB Files**:
  - `/src/lib/supabase/db-repositories/` - Repository-related DB functions
    - `git-provider.ts` - Git provider operations
    - `repository.ts` - Repository operations
    - `pin-repository.ts` - Repository pin operations
  - `/src/lib/supabase/db-hosts/` - Host-related DB functions
  - `/src/lib/supabase/db-deployment/` - Deployment-related DB functions
  
- **Module Import Patterns**:
  ```typescript
  // Import directly from the supabase index (preferred)
  import { gitProvider, repository } from '@/lib/supabase';
  
  // Or use the legacy db interface
  import db from '@/lib/supabase/db';
  ```

### OAuth Authentication Flow

Follow this specific flow for OAuth authentication:

1. **Initiate OAuth Flow**:
   - Client Component calls hook method: `signInWithOAuth('github', redirectUrl)`
   - Hook calls Server Action: `signInWithOAuthAction('github', redirectUrl)`
   - Server Action calls Server DB: `supabaseAuth.signInWithOAuth('github', {redirectTo})`
   - User is redirected to OAuth provider

2. **Handle OAuth Callback**:
   - OAuth provider redirects back to your callback URL with a code
   - Client Component (`auth-redirect/page.tsx`) calls hook method: `exchangeCodeForSession()`
   - Hook calls Server Action: `handleAuthCallbackAction(url)`
   - Server Action calls Server DB: `supabaseAuth.handleOAuthCallback(code)`
   - Server Action determines redirect URL based on user data
   - Client redirects user to the appropriate page

## Caching Strategy and State Management

### Three-Layer Caching Architecture

1. **Server DB Layer**: ❌ NO caching
   - Always fetch fresh data from Supabase
   - Never cache at this level

2. **Server Actions Layer**: ✅ Optional TTL-based caching for expensive operations
   ```typescript
   let actionCache = null;
   let cacheTimestamp = 0;
   const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
   
   export async function getExpensiveData() {
     // Check if cache is valid
     if (actionCache && Date.now() - cacheTimestamp < CACHE_TTL) {
       return actionCache;
     }
     
     // Fetch fresh data
     const result = await db.getExpensiveData();
     
     // Update cache
     actionCache = result;
     cacheTimestamp = Date.now();
     
     return result;
   }
   ```

3. **Client Hooks Layer**: ✅ Primary caching using SWR + localStorage
   ```typescript
   // SWR Implementation
   export function useData() {
     return useSWR('key', async () => {
       // Try localStorage
       if (typeof window !== 'undefined') {
         const cached = localStorage.getItem('key');
         if (cached) {
           const parsed = JSON.parse(cached);
           if (Date.now() < parsed.expiry) {
             return parsed.data;
           }
         }
       }
       
       // Fetch from Server Action
       const { data } = await serverAction();
       
       // Update localStorage
       if (data) {
         localStorage.setItem('key', JSON.stringify({
           data,
           expiry: Date.now() + (5 * 60 * 1000) // 5 minutes
         }));
       }
       
       return data;
     }, {
       dedupingInterval: 60000,
       revalidateOnFocus: false,
       revalidateOnReconnect: true
     });
   }
   ```

### Cache Invalidation Rules

- Clear relevant caches after mutations
- Implement cache versioning for major data structure changes
- Handle cache misses gracefully
- Never store sensitive data in localStorage

## Frontend Component Development

### Component Organization

- **Feature-based organization:** Group all feature-related files together
  - Each feature should have its own directory under `/app/[locale]/[tenant]/`
  - All related files for a feature should be in the same directory:
    - `_components/` - Feature-specific components
    - `actions.ts` - Server actions for the feature
    - `types.ts` - Type definitions for the feature
    - `constants.ts` - Constants for the feature
    - `hooks.ts` - Custom hooks for the feature
    - `utils.ts` - Utility functions for the feature
    - `page.tsx` - Page component for the feature
  
- **Shared functionality** goes in dedicated directories:
  - `/src/components/` - Shared components used across multiple features
  - `/src/hooks/` - Shared hooks used across multiple features
  - `/src/types/` - Shared type definitions
  - `/src/lib/` - Core utilities, services, and business logic
  - `/src/context/` - Shared context providers

```
app/
  └── [locale]/
      └── [tenant]/
          └── feature/           # Feature directory (e.g., dashboard, hosts, deployment)
              ├── _components/   # Feature-specific components
              ├── actions.ts     # Feature-specific server actions
              ├── hooks.ts       # Feature-specific hooks
              ├── types.ts       # Feature-specific types
              ├── constants.ts   # Feature-specific constants
              ├── utils.ts       # Feature-specific utilities
              └── page.tsx       # Feature page component
```

- **shadcn components** go in `/src/components/shadcn/` (never modify these)
- **General UI components** go in `/src/components/ui/`
- **Layout components** go in `/src/components/layout/`
- **Form components** go in `/src/components/form/`

### Server vs. Client Components

- Use Server Components by default
- Add 'use client' directive only when needed:
  - Client-side state (useState, useReducer)
  - Effects (useEffect, useLayoutEffect)
  - Browser-only APIs
  - Event handlers
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

- **Bypassing the Three-Layer Architecture** - Never call Server DB directly from Client Hooks
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
- **Not Following Standard Response Format** - Always return `{success, error, data}` from DB operations 