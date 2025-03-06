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

## OAuth Provider Integration

AutomAI uses Supabase Auth to handle authentication with OAuth providers like Google and GitHub. Here's how it works in both development and production environments:

### Authentication Flow for OAuth (Google, GitHub)

1. **User initiates OAuth login** by clicking a provider button
2. **Supabase redirects to provider** (Google or GitHub)
3. **User authenticates with provider**
4. **Provider redirects back to Supabase callback URL**:
   - Production: `https://wexkgcszrwxqsthahfyq.supabase.co/auth/v1/callback`
   - Development: `http://localhost:54321/auth/v1/callback`
5. **Supabase processes authentication** and creates a session
6. **Supabase redirects to application** at the `/auth-redirect` URL
7. **Application validates the session** and redirects to the appropriate dashboard

### Code Implementation

```typescript
// In src/lib/supabase-auth.ts
signInWithOAuth: async (provider: 'google' | 'github') => {
  const supabase = createBrowserSupabase();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth-redirect`,
      scopes: provider === 'github' ? 'repo,user' : 'email profile',
    },
  });

  return { data, error };
},
```

## Google OAuth Integration

### Required Environment Variables

- `GOOGLE_CLIENT_ID`: Your Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Your Google OAuth client secret

### Google Auth Setup

#### Production Setup

1. Create a project in the Google Cloud Console
2. Enable the Google OAuth API
3. Create OAuth credentials (Web application type)
4. Add the production redirect URI:
   - `https://wexkgcszrwxqsthahfyq.supabase.co/auth/v1/callback`
5. Configure in Supabase dashboard: Auth > Providers > Google

#### Development Setup

Google OAuth allows multiple redirect URIs in the same OAuth app, so you can:

1. In the same Google OAuth app, add the development redirect URI:
   - `http://localhost:54321/auth/v1/callback`
2. This allows the same OAuth app to work in both environments
3. No code changes needed between environments

## GitHub OAuth Integration

### Required Environment Variables

- `GITHUB_CLIENT_ID`: Your GitHub OAuth App client ID
- `GITHUB_CLIENT_SECRET`: Your GitHub OAuth App client secret

### GitHub Auth Setup

GitHub OAuth is more restrictive than Google and only allows a single callback URL per OAuth app.

#### Production Setup

1. Create a production GitHub OAuth App:
   - Go to GitHub Developer Settings > OAuth Apps > New OAuth App
   - Set homepage URL to your production URL
   - Set callback URL to: `https://wexkgcszrwxqsthahfyq.supabase.co/auth/v1/callback`
   - Copy client ID and secret to Supabase dashboard Auth > Providers > GitHub

#### Development Setup

Since GitHub only allows one callback URL per OAuth app, you need a separate OAuth app for development:

1. Create a development GitHub OAuth App:
   - Go to GitHub Developer Settings > OAuth Apps > New OAuth App
   - Set homepage URL to `http://localhost:3000`
   - Set callback URL to: `http://localhost:54321/auth/v1/callback`
   - Get the development client ID and secret

2. When running in development mode, set these environment variables in your `.env.development`:
   ```
   GITHUB_CLIENT_ID=your_development_client_id
   GITHUB_CLIENT_SECRET=your_development_client_secret
   ```

3. When deploying to production, use the production client ID and secret in your `.env.production`

This approach requires maintaining two separate GitHub OAuth apps, but it's the simplest solution given GitHub's limitation of one callback URL per OAuth app.

## Email/Password Authentication

Email and password authentication is handled by Supabase Auth. Here's the complete workflow for both environments:

### Authentication Flow for Email/Password

1. **Registration Flow**:
   - User submits email and password on the signup form
   - Supabase hashes the password and creates the user account
   - Supabase sends a verification email with a confirmation link
   - User clicks the link to verify their email address
   - Supabase redirects to `/auth-redirect` after successful verification
   - Application creates the user session and redirects to the dashboard

2. **Login Flow**:
   - User enters email and password on the login form
   - Supabase validates credentials against stored hash
   - On success, Supabase creates a session and sets secure cookies
   - Application redirects to the appropriate dashboard based on the user's tenant

### Code Implementation

```typescript
// Sign in with email and password
signInWithPassword: async (email: string, password: string) => {
  const supabase = createBrowserSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
},

// Sign up with email and password
signUp: async (email: string, password: string) => {
  const supabase = createBrowserSupabase();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth-redirect`,
    },
  });
  return { data, error };
},

// Reset password
resetPassword: async (email: string) => {
  const supabase = createBrowserSupabase();
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  return { data, error };
},
```

### Email Authentication Setup

#### Production Setup

1. Configure Supabase Email Auth in the dashboard:
   - Go to Authentication > Email Templates
   - Customize verification and password reset templates
   - Configure SMTP settings for sending emails

2. Set environment variables in `.env.production`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://wexkgcszrwxqsthahfyq.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
   ```

#### Development Setup

1. In development, use the local Supabase instance:
   - Email verification and password reset emails appear in the Supabase Dashboard's "Logs" tab
   - You can click the verification links directly from the log viewer

2. Set environment variables in `.env.development`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_local_anon_key
   ```

### Key Security Features

- Secure password hashing with bcrypt
- Rate limiting for login attempts
- Automatic email verification workflows
- Password complexity requirements
- Secure session management via HTTP-only cookies
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

## Environment-Specific Configuration

Here's a clear summary of what you need to configure for each authentication method in both development and production environments:

### Development Environment

1. **Email/Password Authentication**:
   - Uses local Supabase instance (http://localhost:54321)
   - Emails are available in the Supabase Dashboard's Logs section
   - No additional configuration needed

2. **Google OAuth**:
   - Use the same Google OAuth app as production
   - Add `http://localhost:54321/auth/v1/callback` as an additional authorized redirect URI
   - Use the same client ID and secret in both environments

3. **GitHub OAuth**:
   - Create a separate GitHub OAuth app for development
   - Set homepage URL to `http://localhost:3000`
   - Set callback URL to `http://localhost:54321/auth/v1/callback`
   - Use development-specific client ID and secret in `.env.development`

### Production Environment

1. **Email/Password Authentication**:
   - Uses Supabase cloud instance (https://wexkgcszrwxqsthahfyq.supabase.co)
   - Configure SMTP settings in Supabase dashboard for sending emails
   - Set appropriate environment variables

2. **Google OAuth**:
   - Configure Google OAuth app with production URLs
   - Set callback URL to `https://wexkgcszrwxqsthahfyq.supabase.co/auth/v1/callback`
   - Set appropriate client ID and secret in `.env.production`

3. **GitHub OAuth**:
   - Use production GitHub OAuth app
   - Set homepage URL to your production domain
   - Set callback URL to `https://wexkgcszrwxqsthahfyq.supabase.co/auth/v1/callback`
   - Set appropriate client ID and secret in `.env.production`

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

### GitHub-Specific Issues

Since GitHub only allows one callback URL per OAuth app, you must:

1. Have separate OAuth apps for development and production
2. Switch between the appropriate client ID and secret based on environment

If you see a "The redirect_uri is not associated with this application" error:
- You're likely using the production GitHub OAuth app in development (or vice versa)
- Ensure you're using the correct client ID for your current environment
- Double-check that the callback URL in your GitHub OAuth app matches the Supabase URL for your environment

### Google-Specific Issues

If Google OAuth is working but GitHub is not:
- Google allows multiple redirect URIs in the same OAuth app
- GitHub only allows one redirect URI per OAuth app
- Ensure you're using the proper GitHub OAuth app for your environment

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
