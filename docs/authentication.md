# Authentication System

This document provides comprehensive information about the authentication system in the AutomAI application.

## Overview

The application implements a multi-provider authentication system using Supabase Auth. It supports:

- OAuth providers (Google, GitHub)
- Email/password authentication
- Password reset via email
- Email verification

The system provides a seamless authentication experience across different environments.

## Authentication Methods

### OAuth Providers

- **Google**: Users can sign in with their Google accounts
- **GitHub**: Users can sign in with their GitHub accounts

### Email Authentication

- **Email/Password**: Traditional email and password authentication
- **Password Reset**: Email-based password recovery flow
- **Email Verification**: Verification of email addresses during signup

## Supabase Auth Implementation

The authentication system is built using Supabase Auth and is implemented in:

- `src/lib/supabase-auth.ts`: Main authentication utilities
- `src/utils/supabase/middleware.ts`: Auth middleware for protected routes
- `src/middleware.ts`: Main middleware with authentication checks

Key features include:

- JWT-based authentication with automatic token refresh
- Secure session management via HTTP-only cookies
- Stateless authentication with PostgreSQL user storage
- Cross-platform authentication with the same tokens
- i18n support with proper locale handling

## Authentication Flow

1. **Initial Login**

   - User logs in via email/password or OAuth (Google/GitHub)
   - Supabase validates credentials and creates a session
   - JWT token is generated and stored in HTTP-only cookies

2. **Auth Redirect Process**

   - After successful authentication, user is redirected to `/auth-redirect`
   - Auth-redirect page checks the session and user information
   - On success, redirects to appropriate dashboard based on tenant
   - On any failure, redirects to login with error

3. **Session Management**
   - Supabase manages the session with automatic token refresh
   - JWT token contains user details that can be accessed client and server-side
   - Sessions expire after 24 hours by default
   - Session verification happens via middleware for protected routes

## Google OAuth Integration

Google authentication is set up through Supabase Auth:

```typescript
// In Supabase dashboard, you configure Google OAuth
// In code, we trigger it with:
supabaseAuth.signInWithOAuth('google', {
  redirectTo: `${window.location.origin}/auth-redirect`,
});
```

### Required Environment Variables

- `GOOGLE_CLIENT_ID`: Your Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Your Google OAuth client secret

### Callback URL Configuration

- Supabase Auth callback URL is `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
- For local development: `http://localhost:54321/auth/v1/callback`
- You must add these URLs to your authorized redirect URIs in Google Cloud Console

### Google Auth Setup Steps

1. Create a project in the Google Cloud Console
2. Enable the Google OAuth API
3. Create OAuth credentials (Web application type)
4. Add authorized redirect URIs for both development and production:
   - `https://wexkgcszrwxqsthahfyq.supabase.co/auth/v1/callback`
   - `http://localhost:54321/auth/v1/callback`
5. Copy the client ID and secret to your Supabase dashboard Auth > Providers > Google

## GitHub OAuth Integration

GitHub authentication is configured through Supabase Auth:

```typescript
// In Supabase dashboard, you configure GitHub OAuth
// In code, we trigger it with:
supabaseAuth.signInWithOAuth('github', {
  redirectTo: `${window.location.origin}/auth-redirect`,
});
```

### Required Environment Variables

- `GITHUB_CLIENT_ID`: Your GitHub OAuth App client ID
- `GITHUB_CLIENT_SECRET`: Your GitHub OAuth App client secret

### Callback URL Configuration

- Supabase Auth callback URL is `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
- For local development: `http://localhost:54321/auth/v1/callback`
- You must add these URLs to your authorized callback URLs in GitHub OAuth App settings

### GitHub Auth Setup Steps

1. Go to GitHub Developer Settings > OAuth Apps > New OAuth App
2. Set homepage URL to your application URL
3. Set callback URLs for both development and production:
   - `https://wexkgcszrwxqsthahfyq.supabase.co/auth/v1/callback`
   - `http://localhost:54321/auth/v1/callback`
4. Copy the client ID and secret to your Supabase dashboard Auth > Providers > GitHub

## Email/Password Authentication

Email and password authentication is handled by Supabase Auth, which provides secure password hashing, email verification, and other security features:

```typescript
// Sign in with email and password
const { data, error } = await supabaseAuth.signInWithPassword(email, password);

// Sign up with email and password
const { data, error } = await supabaseAuth.signUp(email, password);

// Reset password (password recovery)
const { data, error } = await supabaseAuth.resetPassword(email);
```

Key features:

- Secure password hashing with industry-standard algorithms
- Automatic email verification flows
- Password recovery and reset functionality
- User data stored in Supabase PostgreSQL database

## Password Reset Flow

Supabase Auth provides a complete password reset flow:

1. **Forgot Password**

   - User enters email on forgot password page
   - System sends password reset email with magic link
   - Email contains a link to reset password page with token

2. **Reset Password**
   - User clicks link in email and arrives at reset password page
   - Token is validated automatically by Supabase Auth
   - User enters and confirms new password
   - Password is updated and user is redirected to login

### Implementation Files

- `src/lib/supabase-auth.ts`: Main authentication utilities
- `src/app/[locale]/(auth)/forgot-password/page.tsx`: Forgot password page
- `src/app/[locale]/(auth)/reset-password/page.tsx`: Reset password page

### Required Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: For admin operations

## Environment-Based Configuration

The authentication system is configured differently based on the environment:

### Development Environment

- Uses local Supabase instance running via Docker
- Authentication services run on localhost
- OAuth providers use localhost callbacks
- Detailed logging and debugging

### Production Environment

- Uses Supabase cloud instance
- OAuth providers use production callbacks
- Reduced logging for better performance
- Additional security measures

Configuration is managed through environment variables:

```typescript
// Development
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...

// Production
NEXT_PUBLIC_SUPABASE_URL=https://wexkgcszrwxqsthahfyq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key
```

## Callback URL Configuration

Proper OAuth callback URL configuration is critical for authentication to work:

### Production Callback URLs

- Add to your OAuth providers (Google, GitHub): `https://wexkgcszrwxqsthahfyq.supabase.co/auth/v1/callback`

### Development Callback URLs

- Add to your OAuth providers: `http://localhost:54321/auth/v1/callback`

## Plan and Tenant Management

The application implements a multi-tenant system with different plan types:

### Plan Types

1. **TRIAL**

   - Default plan for new users
   - No tenant assigned or uses a default "trial" tenant
   - Redirects to `/{locale}/trial/dashboard`

2. **PRO**

   - Users who subscribed to pro plan
   - Has tenant with name 'pro'
   - Redirects to `/{locale}/pro/dashboard`

3. **ENTERPRISE**
   - Custom tenant name (usually company name)
   - Redirects to `/{locale}/{tenant-name}/dashboard`

### JWT Token Structure

```typescript
{
  id: string,
  email: string,
  name: string,
  role: string,          // 'user', 'admin', etc.
  tenantId: string,
  tenantName: string,
  accessToken: string    // Provider's access token for OAuth
}
```

## Security Considerations

The authentication system implements several security best practices:

- Password hashing using bcrypt
- HTTP-only cookies for session storage
- CSRF protection via NextAuth
- JWT expiration controls (24 hour sessions)
- Secure redirect handling
- Environment variable validation

## Troubleshooting

### Missing Supabase Packages

If you encounter errors related to missing Supabase packages, install them:

```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs --save
```

### OAuth Configuration Issues

- If OAuth login fails, verify callback URLs in your provider's developer console
- Check for callback URL mismatch between your app configuration and Supabase Auth settings
- Verify your provider credentials are correctly configured in Supabase dashboard

### Authentication Behavior

- Authentication is handled entirely by Supabase Auth
- Sessions are managed via secure HTTP-only cookies
- Session information can be accessed client and server-side

### Common Issues

- **"Invalid login credentials"**: Check email/password combination
- **"Email not confirmed"**: User needs to verify their email
- **OAuth errors**: Check redirect URIs in both Supabase dashboard and provider settings
- **"Invalid redirect URL"**: Your OAuth redirect setting doesn't match Supabase configuration
- **Password reset issues**: Verify SMTP settings in Supabase dashboard

### Testing Authentication

- Use the Supabase dashboard to verify user accounts
- Check the Authentication > Users section to see registered users
- Use the SQL editor to inspect the auth schema directly
