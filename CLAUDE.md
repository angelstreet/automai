---
description: Claude AI Assistant Guidelines for AutomAI Codebase
globs: ["**/*"]
alwaysApply: true
---

## CRITICAL RULES - ALWAYS FOLLOW

1. **✅ NEVER implement backward compatibility hacks or create aliases**
   - Break imports directly to fix issues properly
   - Update references to use the correct paths and names
   - No aliases, compatibility layers, re-exports, or "legacy support" code
   - Prefer breaking changes over maintaining backward compatibility
   - Force direct migration to the new structure without transition layers

2. **✅ NEVER modify code without understanding its purpose and context**

3. **✅ ALWAYS adhere to the three-layer architecture**
   - DB Layer (Core):
     - Feature-specific modules: `/src/lib/supabase/db-{feature}/` folders
     - Handles direct database interaction via Supabase
     - Returns consistent `DbResponse<T>` objects
   - Server Actions Layer (Bridge):
     - Feature-specific: `/src/app/[locale]/[tenant]/[feature]/actions.ts`
     - Handles business logic, validation, and authentication
     - Returns consistent `ActionResult<T>` objects
   - Client Hooks Layer (Interface):
     - Data-only providers in `/src/app/providers/`
     - Business logic hooks in `/src/hooks/*/`
     - Centralized exports through `/src/context/index.ts`
     - NEVER calls DB Layer directly, only through Server Actions

4. **✅ NEVER expose sensitive data or credentials**
5. **✅ NEVER modify shadcn components**
6. **✅ NEVER run servers, builds, or any other command that starts processes without explicit permission**
   - No `npm run dev`, `npm run build`, `npm start`, etc.
   - Only use file manipulation tools like View, Edit, Grep, etc.
   - Do not run any long-running processes that might tie up resources
7. **✅ NEVER run git commands without explicit permission**
8. **✅ ALWAYS provide clear plans before implementing changes**
9. **✅ ALWAYS make minimal, focused changes**

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

## Naming Conventions

### Server Actions
- **Action Files**: Must use `[domain]Action.ts` naming pattern
  - Example: `userAction.ts`, `teamAction.ts`, `repositoriesAction.ts`
- **All imports** must reference the file with the Action suffix
  - Example: `import { getUser } from '@/app/actions/userAction'`
- **NO aliases or backward compatibility** imports are allowed
- **IMPORTANT**: Components should use hooks from context when available instead of directly importing actions
  - Preferred: `import { useUser } from '@/context'` and use hooks methods
  - Only use direct action imports when no hook is available yet

### Context and Hooks
- **Hook Files**: Must use `use[Domain].ts` naming pattern (no suffixes)
  - Example: `useUser.ts`, `useTeam.ts`, `usePermission.ts`
- **Hook Functions**: Must use simple domain names without suffixes
  - Example: `useUser()`, `useTeam()`, not `useUserLogic()` 
- **One primary hook per domain**: Each domain should have one main hook

## Centralized Context Architecture
- **Use the centralized context system** through `/src/context/index.ts`:
  - Import hooks and providers: `import { usePermission, TeamProvider } from '@/context'`
  - NEVER import directly from providers or hooks files
  - NEVER import from feature-specific contexts

### Context/Hooks Structure
- **Provider Components**: Located in `/src/app/providers/*.tsx`
  - Only used for domains requiring global state (e.g., User, Team)
  - Are data-only containers with minimal state
  - No business logic, side effects, or data fetching
  - Export basic context access hooks (e.g., `useUser`)
- **Business Logic Hooks**: Located in `/src/hooks/*/*.ts`
  - Primary pattern for all domains including those without providers
  - Contain all data fetching and business logic
  - Use React Query for data management and caching
  - Standalone for domains without global state requirements (e.g., Hosts, CICD)
- **Context Exports**: All exports centralized through `/src/context/index.ts`
  - Both provider hooks and business logic hooks exported here
  - Components always import from this central location