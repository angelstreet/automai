---
description: Claude AI Assistant Guidelines for AutomAI Codebase
globs: ["**/*"]
alwaysApply: true
---

## CRITICAL RULES - ALWAYS FOLLOW

1. **✅ NEVER modify code without understanding its purpose and context**
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
5. **✅ NEVER modify shadcn components**
6. **✅ NEVER run servers without explicit permission**
6. **✅ NEVER run git command without explicit permission**
7. **✅ ALWAYS provide clear plans before implementing changes**
8. **✅ ALWAYS make minimal, focused changes**

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
- **Use the centralized context system** in `/src/context/`:
  - Import contexts from the centralized location: `import { useHost, useRepository } from '@/context'`
  - NEVER import from feature-specific contexts
  - Context is organized by domain, not by feature

### Context Provider Structure
- **Provider Components**: Located in `/src/context/[domain]/[Domain]Provider.tsx`
- **Hook Exports**: Named exports as `use[Domain]` (e.g., `useHost`, `useRepository`)
- **Context Root Provider**: All context providers are composed in `AppProvider`