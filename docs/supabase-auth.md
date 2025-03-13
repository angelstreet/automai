# Authentication System

This document provides comprehensive information about the authentication system in the AutomAI application.

> **⚠️ IMPORTANT GUIDELINES - DO NOT BREAK THESE RULES ⚠️**
> 
> 1. Always use localized auth redirect URLs: `/${locale}/auth-redirect`
> 2. Never add custom token validation - trust Supabase's built-in session management
> 3. Keep auth flows simple - don't create complex conditionals for OAuth handling
> 4. Add proper error handling with clear user messages
> 5. Follow the established auth flow pattern: Login → Provider → auth-redirect → Dashboard

## Overview

The application implements a multi-provider authentication system using Supabase Auth in the cloud for all environments. It supports:

- OAuth providers (Google, GitHub)
- Email/password authentication
- Password reset via email
- Email verification

The system uses dynamic URL detection to provide a seamless authentication experience across different environments.

## Architecture

### Three-Layer Architecture

The authentication system follows the project's three-layer architecture:

1. **Server DB Layer** (Core)
   - Located in `/src/lib/supabase/auth.ts`
   - Contains all direct Supabase auth calls
   - Uses server-side Supabase client with cookies

2. **Server Actions Layer** (Bridge)
   - Located in `/src/app/actions/auth.ts`
   - Server-only functions marked with 'use server'
   - Call functions from the Server DB Layer
   - Add error handling, validation, and business logic

3. **Client Hooks Layer** (Interface)
   - Client-side React hooks marked with 'use client'
   - Call Server Actions (not Server DB directly)
   - Manage loading states, errors, and data caching

### Middleware for Session Refreshing

The middleware (`/src/middleware.ts`) handles:

- Refreshing expired Auth tokens
- Redirecting unauthenticated users to the login page
- Passing refreshed Auth tokens to Server Components
- Passing refreshed Auth tokens to the browser

## Authentication Methods

### OAuth Providers

- **Google**: Users can sign in with their Google accounts
- **GitHub**: Users can sign in with their GitHub accounts

### Email Authentication

- **Email/Password**: Traditional email and password authentication
- **Password Reset**: Email-based password recovery flow
- **Email Verification**: Verification of email addresses during signup

## Profile Management

The application follows best practices by not modifying the Supabase `auth.users` table directly:

- User core data is stored in Supabase Auth
- Extended user data is stored in a `profiles` table
- The `profiles` table acts as a bridge between auth users and application data
- Foreign keys from other tables reference `profiles.id` rather than directly linking to `auth.users`

## Authentication Flow

### 1. Initial Login

- User logs in via email/password or OAuth (Google/GitHub)
- Supabase validates credentials and creates a session
- JWT token is generated and stored in HTTP-only cookies

### 2. OAuth Flow (GitHub/Google)

- When user clicks "Sign in with GitHub/Google", `signInWithOAuth` is called
- The OAuth flow is: Client → Supabase → GitHub → Supabase → Client
- Detailed steps:
  1. User clicks OAuth button in our application
  2. Supabase initiates OAuth with the provider (GitHub/Google)
  3. Provider authenticates the user and asks for permissions
  4. Provider redirects back to Supabase callback URL: `https://wexkgcszrwxqsthahfyq.supabase.co/auth/v1/callback`
  5. Supabase processes authentication and creates a session
  6. Supabase redirects to our application's auth-redirect page

### 3. Auth Redirect Process

- After successful authentication, user is redirected to `/${locale}/auth-redirect`
- Auth-redirect page checks the session and user information
- On success, redirects to appropriate dashboard based on tenant
- On any failure, redirects to login with error

### 4. Session Management

- Supabase manages the session with automatic token refresh
- JWT token contains user details that can be accessed client and server-side
- Sessions expire after 24 hours by default
- Session verification happens via middleware for protected routes

## Environment Configuration

The authentication system uses a single `.env` file with the same Supabase configuration across all environments:

```
# Core Configuration
PORT=3000

# Supabase Configuration - Same across all environments
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_AUTH_CALLBACK_URL=https://your-project-ref.supabase.co/auth/v1/callback

# JWT Secret - Will use this in all environments
JWT_SECRET="your-secure-jwt-secret"

# OAuth Provider Secrets
SUPABASE_AUTH_GITHUB_SECRET=your-github-client-secret
SUPABASE_AUTH_GOOGLE_SECRET=your-google-client-secret
```

The application uses dynamic URL detection to determine the appropriate redirect URLs based on the current environment.

## Route Protection

Route protection is implemented through middleware that checks authentication status:

- The middleware calls `supabase.auth.getUser()` to verify authentication
- If no user is found, the middleware redirects to the login page with the current locale
- Protected routes can also use `getUser()` directly for additional verification

> **⚠️ IMPORTANT:** Always use `supabase.auth.getUser()` to protect pages and user data. Never trust `supabase.auth.getSession()` inside server code as it isn't guaranteed to revalidate the Auth token.

## Allowed Domains

The following redirect domains are configured in Supabase to support various development and production environments:

```
https://*.app.github.dev/**
https://automai-eta.vercel.app/**
http://localhost:*/**
https://*-idx-automaigit-**.cloudworkstations.dev/**
```

## Google and GitHub OAuth Setup

### Google OAuth Setup

1. Create a project in the Google Cloud Console
2. Enable the Google OAuth API
3. Create OAuth credentials (Web application type)
4. Add the Supabase callback URL: `https://wexkgcszrwxqsthahfyq.supabase.co/auth/v1/callback`
5. Configure in Supabase dashboard: Auth > Providers > Google

### GitHub OAuth Setup

1. Create a GitHub OAuth App in GitHub Developer Settings
2. Set homepage URL to your production URL
3. Set callback URL to: `https://wexkgcszrwxqsthahfyq.supabase.co/auth/v1/callback`
4. Set appropriate client ID and secret in Supabase dashboard: Auth > Providers > GitHub
5. Configure additional redirect URLs in Supabase:
   ```
   http://localhost:3000/auth-redirect
   http://localhost:3000/en/auth-redirect
   https://*.app.github.dev/auth-redirect
   https://*.app.github.dev/en/auth-redirect
   ```

## Email Authentication

### Registration Flow

1. User submits email and password
2. Supabase hashes password and creates account
3. Supabase sends verification email
4. User verifies email address
5. Application creates session and redirects to dashboard

### Login Flow

1. User enters email and password
2. Supabase validates credentials
3. On success, Supabase creates session and sets cookies
4. Application redirects to appropriate dashboard

## Password Reset Flow

1. **Forgot Password**
   - User enters email on forgot password page
   - System sends password reset email with magic link
   - Email contains link to reset password page with token

2. **Reset Password**
   - User clicks link in email and arrives at reset password page
   - Token is validated automatically by Supabase Auth
   - User enters and confirms new password
   - Password is updated and user is redirected to login

## Implementation Examples

### Server Actions for Authentication

```typescript
// src/app/actions/auth.ts
'use server';

import { supabaseAuth } from '@/lib/supabase/auth';
import { invalidateUserCache } from './user';

export async function signInWithOAuth(provider: 'google' | 'github', redirectUrl: string) {
  try {
    const result = await supabaseAuth.signInWithOAuth(provider, {
      redirectTo: redirectUrl,
    });

    return {
      success: result.success,
      error: result.error || null,
      data: result.data || null,
    };
  } catch (error: any) {
    console.error('Error signing in with OAuth:', error);
    return { success: false, error: error.message || 'Failed to sign in', data: null };
  }
}

export async function handleAuthCallback(url: string) {
  try {
    // Parse the URL to get the code
    const { searchParams } = new URL(url);
    const code = searchParams.get('code');

    if (!code) {
      throw new Error('No code provided in URL');
    }

    // Invalidate user cache before processing callback
    await invalidateUserCache();

    // Handle the OAuth callback
    const result = await supabaseAuth.handleOAuthCallback(code);

    if (result.success && result.data) {
      // Get the tenant information for redirection
      const userData = result.data.session?.user;

      // Use tenant_name or default to 'trial'
      const tenantName = userData?.user_metadata?.tenant_name || 'trial';

      // Get the locale from URL or default to 'en'
      const pathParts = url.split('/');
      const localeIndex = pathParts.findIndex((part) => part === 'auth-redirect') - 1;
      const locale = localeIndex >= 0 ? pathParts[localeIndex] : 'en';

      // Redirect URL for after authentication
      const redirectUrl = `/${locale}/${tenantName}/dashboard`;

      return {
        success: true,
        redirectUrl,
      };
    }

    // Handle authentication failure
    return {
      success: false,
      error: result.error || 'Failed to authenticate',
      redirectUrl: '/login?error=Authentication+failed',
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Authentication failed',
      redirectUrl: '/login?error=Authentication+failed',
    };
  }
}
```

### Auth-Redirect Page

```tsx
// src/app/[locale]/auth-redirect/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { handleAuthCallback } from '@/app/actions/auth';

export default function AuthRedirectPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function processAuth() {
      try {
        // Call the server action with the current URL
        const result = await handleAuthCallback(window.location.href);

        if (result.success && result.redirectUrl) {
          // Redirect to the dashboard
          router.push(result.redirectUrl);
        } else {
          // Handle error
          setError(result.error || 'Authentication failed');
          // Redirect to login after a delay
          setTimeout(() => {
            router.push(`/login?error=${encodeURIComponent(result.error || 'Authentication failed')}`);
          }, 2000);
        }
      } catch (error) {
        // Handle unexpected errors
        setError(error instanceof Error ? error.message : 'Authentication failed');
        setTimeout(() => {
          router.push('/login?error=Authentication+failed');
        }, 2000);
      } finally {
        setIsLoading(false);
      }
    }

    processAuth();
  }, [router]);

  if (isLoading) {
    return <div>Processing authentication...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return <div>Redirecting to dashboard...</div>;
}
```

## Troubleshooting

### Common Issues

1. **OAuth configuration issues**:
   - Ensure the callback URL in your provider settings is exactly: `https://wexkgcszrwxqsthahfyq.supabase.co/auth/v1/callback`
   - Check that your provider credentials are correctly configured in Supabase dashboard

2. **"Invalid login credentials"**: Check email/password combination
3. **"Email not confirmed"**: User needs to verify their email
4. **"Invalid redirect URL"**: Add the redirect URL to the allowed URLs in Supabase dashboard
5. **"The redirect_uri is not associated with this application"**: Check provider settings

### Testing Authentication

- Use the Supabase dashboard to verify user accounts
- Check the Authentication > Users section to see registered users
- Use the SQL editor to inspect the auth schema directly

## Caching

The authentication system uses caching at the Server Actions layer with a 5-minute TTL for user data. Detailed caching strategies are documented separately.

## Security Considerations

- Never expose Supabase service role key
- Always use Supabase's built-in session management
- Protect all routes that should require authentication
- Use proper error handling to avoid leaking sensitive information
- Properly implement tenant isolation to prevent cross-tenant data access