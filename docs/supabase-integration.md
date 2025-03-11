# Supabase Integration Guide

## Overview

This guide covers the implementation and usage of Supabase services in the AutomAI application. We use Supabase for authentication, database, storage, and serverless functions.

## Client Architecture

We've implemented a centralized, consistent pattern for Supabase clients that makes them easy to use across different contexts in the application:

### Client Types

All clients are available from `@/lib/supabase`:

| Client Type | Import Path | Use Case | Context |
|-------------|-------------|----------|---------|
| Browser Client | `import { createClient } from '@/lib/supabase/client'` | Client components, browser-side code | Client-side only |
| Server Client | `import { createClient } from '@/lib/supabase/server'` | Server components, API routes, server actions | Server-side only |  
| Middleware Client | `import { createClient } from '@/lib/supabase/middleware'` | Next.js middleware | Edge runtime |
| Admin Client | `import { createClient } from '@/lib/supabase/admin'` | Privileged operations (service role) | Server-side only |

### Key Features

- **Simplified Environment Usage**: All clients directly use environment variables without an extra abstraction layer
- **Consistent Patterns**: All clients follow the same implementation pattern
- **Automatic Caching**: Browser and Admin clients are automatically cached to prevent duplicate instances
- **Type Safety**: Full TypeScript support across all clients
- **Cookie Handling**: Server and Middleware clients properly handle cookies for authentication

## Environment Configuration

Required environment variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

- The first two variables are available in client-side code
- The service role key is server-side only for security
- In development, the admin client falls back to the anon key if the service role key is not available

## Authentication Integration

### Client Components

```typescript
'use client';

import { createClient } from '@/lib/supabase/client';

export function SignOutButton() {
  const handleSignOut = async () => {
    const supabase = await createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };
  
  return <button onClick={handleSignOut}>Sign Out</button>;
}
```

### Server Components

```typescript
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function ProfilePage() {
  // Create the Supabase client
  const supabase = await createClient();
  
  // Get the user session
  const { data, error } = await supabase.auth.getUser();
  
  // Handle unauthenticated users
  if (error || !data.user) {
    redirect('/login');
  }
  
  return <div>Hello, {data.user.email}</div>;
}
```

### Middleware

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  return await updateSession(req);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

### Admin Operations

```typescript
import { createClient } from '@/lib/supabase/admin';

export async function getUserById(userId: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  
  if (error) {
    console.error('Error fetching user:', error.message);
    return null;
  }
  
  return data.user;
}
```

## Best Practices

### General Guidelines

1. **Use the Right Client**: Choose the appropriate client for each context
   - Browser client for client components
   - Server client for server components and API routes
   - Middleware client only in middleware
   - Admin client only for privileged operations

2. **Await Async Operations**: Always await Supabase client creation when needed
   ```typescript
   // Good
   const supabase = await createClient();
   
   // Bad
   const supabase = createClient(); // Missing await
   ```

3. **Error Handling**: Always handle potential errors from Supabase operations
   ```typescript
   const { data, error } = await supabase.from('tasks').select('*');
   if (error) {
     // Handle error appropriately
     console.error('Error fetching tasks:', error.message);
     return null;
   }
   ```

### Authentication Guidelines

1. **Token Validation**: Always use `supabase.auth.getUser()` to validate user tokens in server-side code
   - Don't rely solely on `getSession()` for security-critical operations

2. **Session Refresh**: Let middleware handle session refreshing
   - Don't modify authentication cookies directly in application code
   - The middleware contains a critical `getUser()` call that should not be removed

3. **OAuth Flow**: Follow the recommended OAuth flow:
   - Initiate auth from client or server
   - Let middleware handle the callback and session creation
   - Redirect to the application after successful authentication

### Database Guidelines

1. **Tenant Isolation**: Always include tenant_id in database queries
   ```typescript
   // Good
   const { data } = await supabase
     .from('projects')
     .select('*')
     .eq('tenant_id', session.user.tenant_id);
   
   // Bad - no tenant isolation
   const { data } = await supabase.from('projects').select('*');
   ```

2. **Use Pagination**: Limit the amount of data retrieved in one query
   ```typescript
   const { data } = await supabase
     .from('large_table')
     .select('*')
     .range(0, 49); // Get first 50 rows
   ```

## Security Considerations

1. **Service Role Key**: Never expose the SUPABASE_SERVICE_ROLE_KEY in client code
   - The admin client should only be used in server-side code

2. **RLS Policies**: Use Row Level Security (RLS) policies as a defense-in-depth measure
   - Don't rely solely on application code for access control

3. **JWTs**: Don't trust JWT contents without verification
   - Always use `supabase.auth.getUser()` which verifies the token 

## Troubleshooting

Common issues and solutions:

1. **Authentication Issues**:
   - Check that middleware is properly configured and running
   - Verify the auth callback URL is correctly set in Supabase dashboard
   - Check for CORS issues in the browser console

2. **Database Access Issues**:
   - Verify RLS policies are correctly configured
   - Check the user has the correct roles and permissions
   - Ensure tenant_id is being included in queries

3. **Client Errors**:
   - "Failed to refresh token" - Usually a cookie issue or expired session
   - GoTrueClient warnings - Check for multiple client instances being created

## Related Documentation

- [Next.js App Router Documentation](https://nextjs.org/docs/app)
- [Supabase Documentation](https://supabase.io/docs)
- [Supabase Auth Helpers](https://supabase.io/docs/guides/auth/auth-helpers/nextjs) 