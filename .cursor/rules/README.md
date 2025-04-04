# Cursor Rules System

This directory contains rules documentation to guide the development of our application. The goal is to provide clear guidance for ensuring consistency across the codebase.

## Rule Files

| File                       | Purpose                                 | When to Use                                       |
| -------------------------- | --------------------------------------- | ------------------------------------------------- |
| `architecture.mdc`         | **Primary architectural patterns**      | Start here for overall architecture understanding |
| `implementation-guide.mdc` | **Step-by-step feature implementation** | When implementing a new feature from scratch      |
| `naming-convention.mdc`    | **Naming conventions**                  | When naming components, files, and functions      |
| `database.mdc`             | **Database operations**                 | When working with Supabase/database layer         |
| `core-general.mdc`         | **General guidelines**                  | Always refer to for general best practices        |

## When to Use Each Rule

### New to the Project?

1. Start with `architecture.mdc` to understand the overall structure
2. Read `core-general.mdc` for general best practices
3. Check `naming-convention.mdc` for file/component naming patterns

### Implementing a New Feature?

Follow the step-by-step guide in `implementation-guide.mdc`, which walks through:

1. Defining types
2. Creating database layer
3. Implementing server actions
4. Building React Query hooks
5. Creating UI components

### Working on Data Flow?

The `architecture.mdc` file contains comprehensive information on:

1. Three-tier caching architecture (Database → Server Actions → React Query)
2. Component data flow patterns
3. Database access patterns

### Naming Things?

Use `naming-convention.mdc` as your guide for:

- File naming
- Component naming
- Function naming
- Directory structure

### Database Operations?

Refer to `database.mdc` for:

- Database function patterns
- Error handling
- Return types
- Authentication with cookieStore

## Core Principles

These principles should be followed in all development work:

1. **Three-Tier Architecture**:

   - Database Layer (`/lib/db/*.ts`) - No caching, raw data access
   - Server Actions (`/app/actions/*.ts`) - Server-side caching
   - React Query Hooks (`/hooks/*.ts`) - Client-side caching
   - UI Components - Consumption and rendering

2. **Critical Rules**:

   - Always await cookies(): `const cookieStore = await cookies();`
   - Always await createClient(): `const supabase = await createClient(cookieStore);`
   - Use cache() for READ operations
   - Revalidate cache after WRITE operations
   - Never cache WRITE operations
   - Consistent error handling
   - Client components must have "Client" suffix

3. **Component Patterns**:
   - Server components fetch data and pass to client components
   - Client components handle interactivity
   - Use React Query hooks for data fetching and state management
   - Use initialData from server for first render to avoid loading flashes

## Examples

Each rule file contains concrete examples from our codebase. The `architecture.mdc` file provides comprehensive examples for each architectural layer.

## Troubleshooting

Common issues and their solutions are documented in the `architecture.mdc` file, including:

- Hydration errors
- Cookies errors
- Database client issues
- Cache invalidation problems

## Contributing to Rules

When improving these rules:

1. Use concrete examples from our codebase
2. Include complete implementations, not just snippets
3. Focus on practical guidance with clear examples
4. Highlight critical patterns and anti-patterns
