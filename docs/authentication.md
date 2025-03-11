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

## Authentication Methods

### OAuth Providers

- **Google**: Users can sign in with their Google accounts
- **GitHub**: Users can sign in with their GitHub accounts

### Email Authentication

- **Email/Password**: Traditional email and password authentication
- **Password Reset**: Email-based password recovery flow
- **Email Verification**: Verification of email addresses during signup

## Supabase Auth Implementation

The authentication system is built exclusively using Supabase Auth cloud and is implemented in:

- `src/lib/supabase-auth.ts`: Main authentication utilities
- `src/middleware.ts`: Main middleware for route protection
- `src/auth.ts`: Authentication utilities for server components
- `src/utils/supabase/*.ts`: Supabase client utilities

Key features include:

- JWT-based authentication with automatic token refresh
- Secure session management via HTTP-only cookies
- Stateless authentication with PostgreSQL user storage
- Cross-platform authentication with the same tokens
- i18n support with proper locale handling
- Dynamic URL detection for multi-environment support

## Authentication Flow

1. **Initial Login**

   - User logs in via email/password or OAuth (Google/GitHub)
   - Supabase validates credentials and creates a session
   - JWT token is generated and stored in HTTP-only cookies

2. **OAuth Flow (GitHub/Google)**

   - When user clicks "Sign in with GitHub/Google", `signInWithOAuth` is called
   - The OAuth flow is: Client → Supabase → GitHub → Supabase → Client
   - Detailed steps:
     1. User clicks OAuth button in our application
     2. Supabase initiates OAuth with the provider (GitHub/Google)
     3. Provider authenticates the user and asks for permissions
     4. Provider redirects back to Supabase callback URL: `https://wexkgcszrwxqsthahfyq.supabase.co/auth/v1/callback`
     5. Supabase processes authentication and creates a session
     6. Supabase redirects to our application's auth-redirect page

3. **Auth Redirect Process**

   - After successful authentication, user is redirected to `/${locale}/auth-redirect`
   - Auth-redirect page checks the session and user information
   - On success, redirects to appropriate dashboard based on tenant
   - On any failure, redirects to login with error

4. **Session Management**
   - Supabase manages the session with automatic token refresh
   - JWT token contains user details that can be accessed client and server-side
   - Sessions expire after 24 hours by default
   - Session verification happens via middleware for protected routes

## Simplified Environment Configuration

The authentication system now uses a single `.env` file with the same Supabase configuration across all environments:

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

The application uses dynamic URL detection to determine the appropriate redirect URLs based on the current environment:

```typescript
// Dynamic URL detection
export const getSiteUrl = () => {
  // Client-side: use the current origin
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  // Server-side determination based on environment
  if (isCodespace()) {
    return `https://${process.env.CODESPACE_NAME}-3000.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || 'app.github.dev'}`;
  }
  
  if (isProduction()) {
    return 'https://automai-eta.vercel.app';
  }
  
  return 'http://localhost:3000';
};
```

## OAuth Authentication Flow

The application uses Supabase's OAuth providers for authentication with services like GitHub and Google.

### Server-Side OAuth Flow (Recommended)

1. User clicks "Sign in with GitHub/Google" button which submits a form to a server action
2. Server action calls `supabase.auth.signInWithOAuth()` with `skipBrowserRedirect: true`
3. Server action redirects to the provider's authorization URL
4. After authorization, provider redirects back to our `/auth-redirect` page with a code
5. The middleware automatically handles the code exchange and session creation
6. The auth-redirect page redirects to the dashboard

### Client-Side OAuth Flow

1. User clicks "Sign in with GitHub/Google" button
2. Client calls `supabase.auth.signInWithOAuth()` with `skipBrowserRedirect: true`
3. Client redirects to the provider's authorization URL
4. After authorization, provider redirects back to our `/auth-redirect` page with a code
5. The middleware automatically handles the code exchange and session creation
6. The auth-redirect page redirects to the dashboard

### Important Guidelines

- **Never manually exchange OAuth codes** in page components or API routes
- Always let the middleware handle the code exchange and session creation
- Use `skipBrowserRedirect: true` and handle the redirect manually
- Redirect directly to the dashboard from auth-redirect pages

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

## Email/Password Authentication

Email and password authentication is handled by Supabase Auth:

1. **Registration Flow**:
   - User submits email and password
   - Supabase hashes password and creates account
   - Supabase sends verification email
   - User verifies email address
   - Application creates session and redirects to dashboard

2. **Login Flow**:
   - User enters email and password
   - Supabase validates credentials
   - On success, Supabase creates session and sets cookies
   - Application redirects to appropriate dashboard

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
