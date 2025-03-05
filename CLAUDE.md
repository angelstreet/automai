# AutomAI Project Guidelines

## Build/Test/Lint Commands
```bash
# Development
npm run dev               # Run full dev server with custom server
npm run dev:next          # Run Next.js only
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
  - Follow App Router directory structure
- **Naming**: PascalCase for components, camelCase for functions/variables
- **Error Handling**: Use try/catch with proper error messages
- **Server Components**: Default to React Server Components unless client functionality needed
- **Prisma**: Always import from `@/lib/prisma`, never create new instances