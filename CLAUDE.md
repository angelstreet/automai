# AutomAI Project Guidelines

## Architecture Overview

- **Next.js App Router**: 100% App Router based (no Pages Router components)
- **File structure**:
  - `/src/app` - All routes and pages
  - `/src/app/[locale]/[tenant]` - Main app structure with locale and tenant segments
  - `/src/components` - Shared components
  - `/src/lib` - Core utilities, services, and business logic
  - `/src/utils` - Utility functions, including Supabase clients

## Supabase Integration

- **Client Architecture**:
  - Browser client: `/src/utils/supabase/client.ts` - For client components
  - Server client: `/src/utils/supabase/server.ts` - For server components
  - Middleware client: `/src/utils/supabase/middleware.ts` - For middleware

- **Environment Configurations**:
  - Local: `supabase/config/config.local.toml`
  - GitHub Codespace: `supabase/config/config.codespace.toml`
  - Production: `supabase/config/config.production.toml`

- **Switch between environments**:
  - `scripts/switch-supabase-config.sh [local|codespace|production]`

## Build/Test/Lint Commands

```bash
# Development
npm run dev               # Run full dev server with custom server
npm run dev:next          # Run Next.js only
npm run build             # Create production build
npm run start             # Start production server
npm run lint              # Run ESLint
npm run lint:fix          # Fix ESLint issues
npm run format            # Run Prettier formatter
npm run test              # Run all tests
npm run test:watch        # Run tests in watch mode
npm run test:e2e          # Run end-to-end tests
npm test -- -t "test name" # Run specific test
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
- **Naming**: PascalCase for components, camelCase for functions/variables
- **Error Handling**: Use try/catch with proper error messages
- **Server Components**: Default to React Server Components unless client functionality needed
- **API Routes**: Route handlers are in `/src/app/api/[route]/route.ts`
