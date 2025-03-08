# AutomAI Project Guidelines

## Architecture Overview

- **Next.js App Router**: 100% App Router based (no Pages Router components)
- **File structure**:
  - `/src/app` - All routes and pages
  - `/src/app/[locale]/[tenant]` - Main app structure with locale and tenant segments
  - `/src/components` - Shared components
  - `/src/lib` - Core utilities, services, and business logic
  - `/src/utils` - Utility functions, including Supabase clients
  - `/src/hooks` - Custom React hooks
  - `/src/context` - React context providers
  - `/src/types` - TypeScript type definitions
  - `/src/i18n` - Internationalization utilities
  - `/src/config` - Application configuration

## Supabase Cloud Integration

- **Client Architecture**:
  - Centralized implementation in `/src/lib/supabase/`
  - All clients follow a consistent pattern for easy use
  - Direct environment variable access without abstraction layer
  - Browser client: `import { createClient } from '@/lib/supabase/client'` - For client components
  - Server client: `import { createClient } from '@/lib/supabase/server'` - For server components
  - Middleware client: `import { createClient } from '@/lib/supabase/middleware'` - For middleware
  - Admin client: `import { createClient } from '@/lib/supabase/admin'` - For privileged operations

- **Environment Configuration**:
  - We use cloud Supabase exclusively for all environments
  - Environment variables control all configuration:
    - `NEXT_PUBLIC_SUPABASE_URL` - The Supabase project URL
    - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - The anonymous API key
    - `SUPABASE_SERVICE_ROLE_KEY` - Service role key for admin operations (server-side only)

- **Authentication Flow**:
  - Uses a streamlined OAuth flow with Supabase cloud
  - Middleware handles session refresh and token validation
  - `getUser()` in `src/auth.ts` provides user information
  - Critical `supabase.auth.getUser()` call in middleware ensures secure token validation

- **Security Best Practices**:
  - Service role key is never exposed to client code
  - Always use `getUser()` to validate tokens in security-critical operations
  - Tenant isolation enforced in all database queries
  - Let middleware handle authentication cookies

- **Documentation**:
  - See `/docs/supabase-integration.md` for comprehensive Supabase integration guide
  - See `/docs/authentication.md` for details on the authentication system
  - See `/docs/supabase-auth.md` for detailed Supabase auth implementation
  - See `/docs/supabase-setup.md` for Supabase setup instructions

## Electron Integration

- **Desktop Application**:
  - Electron configuration in `/electron/` directory
  - Integration with Next.js web application
  - Utilities in `/src/utils/isElectron.ts` and `/src/utils/electronApi.ts`
  - Separate build and packaging scripts
  - See `/docs/desktop.md` for desktop application details

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

# Maintenance
npm run update-deps       # Update dependencies
```

## Code Style Guidelines

- **TypeScript**: Use strict types, prefer interfaces over types
- **Imports**: Follow order: external, internal, types, styles with newlines between groups
- **Components**: Use functional components, keep under 300 lines
- **Organization**:
  - Client components in `[feature]/_components/`
  - Shared components in `src/components/`
  - Page-specific components go in `_components/` folders
  - Group related components in feature directories
  - Follow App Router directory structure
- **Naming**: PascalCase for components, camelCase for functions/variables, snake_case for supabase columns
- **Error Handling**: Use try/catch with proper error messages
- **Server Components**: Default to React Server Components unless client functionality needed
- **React.use()**: The `React.use()` function is only for use in Server Components with promises. Never use it in Client Components ('use client')
- **API Routes**: Route handlers are in `/src/app/api/[route]/route.ts`

## Documentation

- **Project Structure**: `/docs/project_structure.md`
- **Frontend Architecture**: `/docs/frontend-architecture.md`
- **Backend Architecture**: `/docs/backend.md`
- **Database Model**: `/docs/database-model.md`
- **API Standards**: `/docs/api-standards.md`
- **Deployment**: `/docs/deployment.md`
- **Tech Stack**: `/docs/techstack.md`
