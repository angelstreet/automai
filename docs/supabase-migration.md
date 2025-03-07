# Migrating from Prisma to Supabase

This document outlines the steps needed to fully migrate from using Prisma with direct PostgreSQL access to using Supabase's data API.

## Migration Steps

### 1. Export Schema from Prisma to SQL

Generate SQL migration scripts from your Prisma schema:

```bash
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-empty \
  --script > supabase-migration.sql
```

### 2. Create Tables in Supabase

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Paste and run the migration SQL script
4. Make necessary adjustments for Supabase-specific features

### 3. Update Data Access in the Application

The current implementation in `src/lib/prisma.ts` provides a stub client that allows the application to start without direct PostgreSQL access, but it doesn't fully implement the data operations.

To complete the migration:

1. Implement each model's operations in `src/lib/services/supabase-data.ts`
2. Update the stub client in `src/lib/prisma.ts` to use these implementations
3. Test each operation to ensure it works correctly

## API Comparison

### Prisma vs Supabase Data API

| Prisma Operation | Supabase Equivalent                                                  |
| ---------------- | -------------------------------------------------------------------- |
| `findMany`       | `supabase.from('table').select('*')`                                 |
| `findUnique`     | `supabase.from('table').select('*').match({ id }).single()`          |
| `create`         | `supabase.from('table').insert(data).select().single()`              |
| `update`         | `supabase.from('table').update(data).match(where).select().single()` |
| `delete`         | `supabase.from('table').delete().match(where).select().single()`     |

### Special Considerations

1. **Relationships**: Prisma automatically handles relationships, while in Supabase you need to use `.select()` with the appropriate syntax:

   ```js
   // Getting related data in Supabase
   const { data } = await supabase.from('users').select(`
       id, 
       name,
       posts (id, title, content)
     `);
   ```

2. **Transactions**: Prisma's transaction API needs to be replaced with RPC functions in Supabase

3. **Migrations**: You'll need to manage schema migrations manually or through Supabase's interface

# Migration to Cloud Supabase

## Overview

We've migrated from using local Supabase instances to exclusively using cloud-hosted Supabase for all environments (development, testing, and production). This change resolves CORS issues and provides a more consistent development experience.

## Current Configuration

- Cloud Supabase URL: `https://wexkgcszrwxqsthahfyq.supabase.co`
- Each environment uses the same Supabase project but with different authentication settings
- Authentication flows use the "implicit" flow type for all environments to avoid CORS issues

## Environment Setup

### Local Development

```bash
# Add these to your .env.local file
NEXT_PUBLIC_SUPABASE_URL=https://wexkgcszrwxqsthahfyq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### GitHub Codespaces

The same configuration is used, but with environment variables set in Codespace secrets:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://wexkgcszrwxqsthahfyq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### Production (Vercel)

Set the environment variables in your Vercel project settings:

```
NEXT_PUBLIC_SUPABASE_URL=https://wexkgcszrwxqsthahfyq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## Authentication Flow

- All environments now use the "implicit" authentication flow to avoid CORS issues
- The token exchange API route (`/api/auth/token-exchange`) serves as a fallback for environments where direct token exchange fails
- Session management is handled by cookies with appropriate domains set automatically based on the environment

## Client Implementation

Three client implementations are provided:

1. **Browser Client** (`/src/utils/supabase/client.ts`) - For client components
2. **Server Client** (`/src/utils/supabase/server.ts`) - For server components and API routes
3. **Middleware Client** (`/src/utils/supabase/middleware.ts`) - For Next.js middleware

## CORS Configuration

CORS is handled at multiple levels:

1. **Browser Client**: Adds appropriate headers to requests
2. **Server Client**: Configures allowed origins
3. **API Routes**: Each route includes CORS headers
4. **Middleware**: Adds CORS headers to responses

## Troubleshooting

If you encounter authentication issues:

1. Check the browser console for CORS errors
2. Verify environment variables are set correctly
3. Ensure you're using the correct client for your context (browser vs server)
4. For GitHub Codespaces, verify the URL is added to the allowed redirect URLs in Supabase

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth with Next.js](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Supabase Data API Reference](https://supabase.com/docs/reference/javascript/select)