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
   - Server DB Layer (Core) - `/src/lib/supabase/db.ts`
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

## Authentication and Supabase

1. **Use centralized Supabase clients**
   - `createBrowserClient()` - For client components
   - `createServerClient()` - For server components
   - `createMiddlewareClient()` - For middleware
   - `createAdminClient()` - For privileged operations

2. **Follow authentication patterns**
   - Use proper session handling
   - Implement tenant isolation
   - Respect authorization roles

3. **Handle database operations correctly**
   - Use type-safe database queries
   - Follow data access patterns
   - Implement appropriate caching strategies

## Caching Strategy and State Management

1. **Follow the three-layer caching architecture**
   - Server DB Layer: ❌ NO caching
   - Server Actions Layer: ✅ Optional TTL-based caching for expensive operations
   - Client Hooks Layer: ✅ Primary caching using SWR + localStorage

2. **SWR Implementation Guidelines**
   - Use consistent key structures for data fetching
   - Implement proper revalidation strategies
   - Configure cache lifetime appropriately:
     ```typescript
     // Example SWR configuration
     useSWR('key', fetcher, {
       dedupingInterval: 60000,  // 1 minute
       revalidateOnFocus: false,
       revalidateOnReconnect: true
     });
     ```

3. **Local Storage Best Practices**
   - Never store sensitive data in localStorage
   - Always use TTL for cached data
   - Implement cache invalidation on mutations:
     ```typescript
     // Example localStorage with TTL
     const storeInCache = (key, data) => {
       localStorage.setItem(key, JSON.stringify({
         data,
         timestamp: Date.now(),
         expiry: Date.now() + (5 * 60 * 1000) // 5 minutes
       }));
     };
     ```

4. **Cache Invalidation Rules**
   - Clear relevant caches after mutations
   - Implement cache versioning for major data structure changes
   - Handle cache misses gracefully

## Frontend Development

1. **Component organization**
   - Keep components small and focused
   - Follow UI component hierarchy
   - Apply appropriate state management

2. **Component Structure**
   - Use `_components` directory for page-specific components
   - Prefix internal components with underscore
   - Follow consistent pattern:
     - `/src/app/[locale]/[tenant]/dashboard/_components/` - Dashboard-specific components
     - `/src/components/` - Shared components used across multiple pages
     - `/src/components/ui/` - Custom UI components built on shadcn primitives

3. **User experience**
   - Ensure responsive design
   - Optimize performance
   - Follow accessibility best practices

4. **Internationalization**
   - Use next-intl for translations
   - Support multi-locale routes
   - Handle content localization properly

## Code Quality and Structure

1. **Maintain consistent code style**
   - Follow established naming conventions
   - Use TypeScript properly with strict types
   - Keep functions pure when possible

2. **Testing and validation**
   - Write tests for critical functionality
   - Validate user inputs
   - Handle edge cases appropriately

3. **Documentation**
   - Document complex logic
   - Keep comments current and helpful
   - Update documentation when changing code

## Communication Guidelines

1. **Be clear and specific**
   - Use precise language in explanations
   - Reference specific files and components
   - Provide complete context for suggestions

2. **Provide explanations**
   - Explain your reasoning for changes
   - Document any assumptions made
   - Highlight potential implications