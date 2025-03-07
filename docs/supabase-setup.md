# Supabase Database Setup

This document outlines how to set up and work with the Supabase database for the AutomAI application.

## Overview

AutomAI uses Supabase as its database provider. Supabase provides:

- PostgreSQL database
- Auth services
- Storage
- Realtime subscriptions
- RESTful API

## Local Development Setup

### Prerequisites

- Docker Desktop installed and running
- Node.js 18+ installed

### Starting the Database

Simply run the development server:

```bash
npm run dev
```

This automatically:

1. Starts Supabase services
2. Applies the database schema
3. Generates TypeScript types
4. Starts the application

### Required Environment Variables (`.env.development`)

```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
```

### Accessing the Local Supabase Dashboard

While Supabase is running, access the dashboard at:

```
http://localhost:54323
```

This provides access to:

- Database tables and data
- Authentication settings
- Storage buckets
- API settings

## Database Schema

The schema is defined in SQL at:

```
/supabase/migrations/fixed-schema.sql
```

Main tables:

- `hosts` - Connected machines
- `tenants` - Organizations
- `users` - User accounts
- `connections` - SSH configurations
- `git_providers` - Git provider settings
- `repositories` - Source code repositories

## Production Setup

1. Create a new project in [Supabase Dashboard](https://app.supabase.com/)

2. Get your project reference ID from the URL

3. Migrate your schema:

   ```bash
   npm run supabase:migrate
   ```

   This will migrate to the project with reference ID `wexkgcszrwxqsthahfyq` which is hardcoded in the configuration.

4. Update environment variables in `.env.production`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   DATABASE_URL=postgresql://postgres:password@db.your-project-id.supabase.co:5432/postgres
   ```

## Supabase Client Architecture

AutomAI uses a standardized Supabase client architecture that properly handles different environments (local development, GitHub Codespaces, Vercel deployments) and contexts (server vs browser).

### Client Architecture Overview

1. **Server Components**
   ```typescript
   import { cookies } from 'next/headers';
   import { createClient } from '@/utils/supabase/server';
   
   // In a Server Component or API route
   const supabase = createClient(cookies());
   const { data } = await supabase.from('users').select('*');
   ```

2. **Client Components**
   ```typescript
   'use client';
   import { createClient } from '@/utils/supabase/client';
   
   // In a Client Component
   const supabase = createClient();
   const { data } = await supabase.from('users').select('*');
   ```

3. **Middleware**
   ```typescript
   // In middleware.ts
   import { createClient } from '@/utils/supabase/middleware';
   
   export async function middleware(request: NextRequest) {
     const { supabase, response } = createClient(request);
     // Use supabase client and return the response
     return response;
   }
   ```

4. **Admin Operations** (service role)
   ```typescript
   import { cookies } from 'next/headers';
   import { createAdminClient } from '@/utils/supabase/server';
   
   // For privileged operations that need service role
   const supabaseAdmin = createAdminClient(cookies());
   await supabaseAdmin.from('users').update({ role: 'admin' });
   ```

Each client is optimized for its specific context and implements proper singleton patterns to prevent multiple client instances.

### Prisma-like Database Interface

We also provide a higher-level abstraction similar to Prisma:

```typescript
// Main import for database operations
import db from '@/lib/db';

// Query examples
const users = await db.user.findMany({
  where: { role: 'admin' },
});

const user = await db.user.findUnique({
  where: { email: 'user@example.com' },
});

const newUser = await db.user.create({
  data: {
    name: 'John Doe',
    email: 'john@example.com',
    role: 'user',
  },
});

await db.user.update({
  where: { id: '123' },
  data: { role: 'admin' },
});

await db.user.delete({
  where: { id: '123' },
});
```

### Direct Supabase Queries

For more advanced queries, use the appropriate client for your context:

```typescript
// In a Server Component
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

const supabase = createClient(cookies());

// Select with joins
const { data, error } = await supabase
  .from('users')
  .select(
    `
    id, 
    name, 
    email, 
    tenant:tenantId (id, name)
  `,
  )
  .eq('role', 'admin');

// Insert with returning
const { data, error } = await supabase
  .from('users')
  .insert({
    name: 'Jane Smith',
    email: 'jane@example.com',
    role: 'user',
  })
  .select()
  .single();
```

## Schema Management

### Modifying the Schema

1. Edit the SQL schema at `/supabase/migrations/fixed-schema.sql`
2. Apply changes locally:

   ```bash
   # First, ensure Supabase is running
   npm run supabase:start

   # Apply schema changes
   PGPASSWORD=postgres psql -h 127.0.0.1 -p 54322 -U postgres -d postgres -f supabase/migrations/fixed-schema.sql

   # Regenerate types
   npm run supabase:gen-types
   ```

3. To apply to production:

   ```bash
   npm run supabase:migrate
   ```

   This uses the hardcoded project reference ID `wexkgcszrwxqsthahfyq`.

## Row Level Security (RLS)

Supabase uses PostgreSQL's Row Level Security for access control. Our schema includes these policies:

- Users can only view/edit their own data
- Team/tenant members can view shared resources
- Service roles have full access

## Authentication

### Setup in Supabase Dashboard

1. In the Supabase Dashboard, go to Authentication → Providers
2. Configure OAuth providers (Google, GitHub)
3. Set redirect URLs for your environments:
   - Local development: `http://localhost:3000/[locale]/auth-redirect`
   - GitHub Codespaces: `https://*.app.github.dev/[locale]/auth-redirect`
   - Vercel preview: `https://*.vercel.app/[locale]/auth-redirect`
   - Production: `https://your-domain.com/[locale]/auth-redirect`

### Using Authentication in Code

1. **Client-side Sign-in**
   ```typescript
   'use client';
   import { createClient } from '@/utils/supabase/client';
   
   export default function LoginForm() {
     const handleEmailLogin = async (email: string, password: string) => {
       const supabase = createClient();
       const { data, error } = await supabase.auth.signInWithPassword({
         email,
         password
       });
       
       if (error) {
         console.error('Login failed:', error.message);
       } else {
         // Redirect or update UI
       }
     };
     
     const handleOAuthLogin = async (provider: 'google' | 'github') => {
       const supabase = createClient();
       await supabase.auth.signInWithOAuth({
         provider,
         options: {
           redirectTo: `${window.location.origin}/en/auth-redirect`
         }
       });
     };
     
     // Component JSX...
   }
   ```

2. **Server-side Session Verification**
   ```typescript
   import { cookies } from 'next/headers';
   import { createClient } from '@/utils/supabase/server';
   import { redirect } from 'next/navigation';
   
   export default async function ProtectedPage() {
     const supabase = createClient(cookies());
     const { data: { session } } = await supabase.auth.getSession();
     
     if (!session) {
       redirect('/login');
     }
     
     // Protected content...
   }
   ```

### Cross-domain Authentication

Our Supabase configuration supports authentication across different domains and environments:

1. **Cookie Domains**:
   - Automatically detects the appropriate cookie domain (`.vercel.app`, `.app.github.dev`, etc.)
   - Sets cookies at the root domain level for subdomains to share authentication

2. **OAuth Flows**:
   - Uses PKCE flow for production and local development
   - Automatically switches to implicit flow for GitHub Codespaces

3. **CORS Support**:
   - Handles cross-origin requests properly
   - Includes appropriate headers for credential sharing between domains

4. **Environment Detection**:
   - Automatically adjusts Supabase URL for GitHub Codespaces
   - Sets appropriate secure flags based on environment

## Troubleshooting

### Common Issues

1. **Docker Issues**

   - Ensure Docker Desktop is running
   - Try restarting Docker if services won't start
   - For GitHub Codespaces, run `scripts/start-supabase-dev.sh` to start the local Supabase

2. **Database Errors**

   - If tables are missing: Apply schema manually
   - Connection issues: Check environment variables
   - Supabase returning 404: Make sure Supabase server is running
   - Verify database schema with `npm run supabase:db:check`

3. **Authentication Problems**

   - Verify authorization callback URLs are correct in Supabase dashboard
   - Check browser console for CORS errors
   - Clear cookies and local storage if authentication state is stuck
   - Make sure URL configuration matches the environment:
     ```bash
     # For local development
     NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
     
     # For GitHub Codespaces
     # URL will be automatically adjusted
     
     # For Vercel/production
     NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
     ```

4. **Cross-domain Authentication Issues**

   - Check browser console for CORS errors
   - Verify that cookies are being set with the proper domain
   - For Codespaces, ensure you're using GitHub's generated URL
   - Make sure redirect URLs in Supabase dashboard include all environments:
     - `http://localhost:3000/*/auth-redirect`
     - `https://*.vercel.app/*/auth-redirect`
     - `https://*.app.github.dev/*/auth-redirect`
     - `https://yourdomain.com/*/auth-redirect`

5. **Client Initialization Problems**

   - "Invalid client" error: Make sure to use the correct client for your context
   - Server components should use `@/utils/supabase/server`, not the browser client
   - Browser components should use `@/utils/supabase/client`
   - Middleware should use `@/utils/supabase/middleware`
   - Make sure you're using an async context with cookies:
     ```typescript
     // BAD: Missing cookies()
     const supabase = createClient(); // Will fail in server component
     
     // GOOD: With cookies
     const supabase = createClient(cookies());
     ```

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase SSR Documentation](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Next.js App Router + Supabase Integration](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Cross-domain Cookies Guide](https://supabase.com/docs/guides/auth/auth-helpers/nextjs#cross-domain-cookies)
- [Auth Redirect Configuration](https://supabase.com/docs/guides/auth/auth-helpers/nextjs#redirect-urls)

## Implementation Reference

### Client Utility Locations
- Browser Client: `src/utils/supabase/client.ts`
- Server Client: `src/utils/supabase/server.ts`
- Middleware Client: `src/utils/supabase/middleware.ts`
- Exports Index: `src/utils/supabase/index.ts`

### Singleton Pattern
The Supabase clients are implemented as singletons to prevent multiple connections:
- Browser client uses a global variable (`__supabaseBrowserClient`)
- Server client uses a cache Map to store instances by key
- All clients add proper CORS headers and cookie management

### Environment Detection
The implementation automatically detects:
- GitHub Codespaces
- Vercel deployments
- Production domains
- Local development

And adjusts URLs, cookie domains, and auth flows accordingly.
