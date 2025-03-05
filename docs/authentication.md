# Authentication System

This document provides comprehensive information about the authentication system in the AutomAI application.

## Overview

The application implements a multi-provider authentication system using NextAuth.js. It supports:
- OAuth providers (Google, GitHub)
- Traditional email/password authentication (using Prisma + database)
- Supabase authentication in production environments

The system automatically selects the appropriate authentication method based on the environment and available configurations.

## Authentication Methods

### OAuth Providers
- **Google**: Users can sign in with their Google accounts
- **GitHub**: Users can sign in with their GitHub accounts

### Credentials-Based Authentication
- **Standard**: Email and password stored in PostgreSQL database (via Prisma)
- **Supabase**: Email and password using Supabase Auth (in production only)

## NextAuth Implementation

The authentication system is built using NextAuth.js and is configured in `src/auth.ts`. Key features include:

- JSON Web Token (JWT) based sessions
- Custom session and user type definitions
- PrismaAdapter for database integration
- Customized callbacks for sign-in, redirect, JWT, and session handling
- i18n support with proper locale handling

## Authentication Flow

1. **Initial Login**
   - User logs in via email/password or OAuth (Google/GitHub)
   - Backend validates credentials and checks tenant information
   - JWT token is generated containing user info, tenant, and role

2. **Auth Redirect Process**
   - After successful authentication, user is redirected to `/auth-redirect`
   - Auth-redirect page attempts to sign in with the token
   - On success, redirects to appropriate dashboard based on tenant
   - On any failure, redirects to login with error

3. **Session Management**
   - JWT token contains user details, role, and tenant information
   - Session expires after 24 hours
   - UserContext manages session state across the application

## Google OAuth Integration

Google authentication is set up with the following features:

```typescript
GoogleProvider({
  clientId: env.GOOGLE_CLIENT_ID,
  clientSecret: env.GOOGLE_CLIENT_SECRET,
  authorization: {
    params: {
      prompt: 'select_account', // Forces account selection each time
    },
  },
})
```

### Required Environment Variables
- `GOOGLE_CLIENT_ID`: Your Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Your Google OAuth client secret
- `GOOGLE_CALLBACK_URL`: OAuth callback URL (usually `http://localhost:3000/api/auth/callback/google` in development)

### Google Auth Setup Steps
1. Create a project in the Google Cloud Console
2. Enable the Google OAuth API
3. Create OAuth credentials (Web application type)
4. Add authorized redirect URIs for your application
5. Copy the client ID and secret to your environment variables

## GitHub OAuth Integration

GitHub authentication uses the standard OAuth flow:

```typescript
GitHubProvider({
  clientId: env.GITHUB_CLIENT_ID,
  clientSecret: env.GITHUB_CLIENT_SECRET,
})
```

### Required Environment Variables
- `GITHUB_CLIENT_ID`: Your GitHub OAuth App client ID
- `GITHUB_CLIENT_SECRET`: Your GitHub OAuth App client secret
- `GITHUB_CALLBACK_URL`: OAuth callback URL

## Email/Password Authentication

The standard email/password authentication uses bcrypt for password hashing and the Prisma client to access the database:

```typescript
CredentialsProvider({
  id: 'credentials',
  name: 'Credentials',
  credentials: {
    email: { label: 'Email', type: 'email' },
    password: { label: 'Password', type: 'password' },
  },
  async authorize(credentials, req) {
    // Verify credentials against database
    // ...
  }
})
```

Key features:
- Secure password comparison using bcrypt
- Tenant and role information included in user object
- User record retrieved from PostgreSQL via Prisma

## Supabase Authentication

Supabase authentication is implemented as an alternative provider for production environments. It's conditionally loaded and only active when:
1. Running in production (`NODE_ENV === 'production'`)
2. Supabase environment variables are configured

### Implementation Files
- `src/utils/supabase/*.ts`: Core Supabase client utilities
- `src/lib/services/supabase-auth.ts`: Authentication service
- `src/app/api/auth/[...nextauth]/providers/supabase.ts`: NextAuth Supabase provider

### Key Features
- Dynamic imports to prevent errors in development
- Error-resilient implementation for graceful fallbacks
- Full feature parity with standard credentials provider

### Required Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY`: (Optional) For admin operations

## Environment-Based Configuration

The authentication system behaves differently based on the environment:

### Development Environment
- Uses local PostgreSQL database
- Credentials provider uses Prisma directly
- Supabase authentication is disabled
- Detailed logging and debugging

### Production Environment
- Can use Supabase for both authentication and database
- Conditional Supabase provider activation
- Reduced logging for better performance
- Additional security measures

Configuration is managed through the `isUsingSupabase()` helper in `src/lib/env.ts`:

```typescript
export const isUsingSupabase = () => {
  return isProduction() && 
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) && 
    Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
};
```

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
npm install @supabase/supabase-js @supabase/ssr --save
```

### Authentication Fallback Behavior
- The login page first tries the standard credentials provider
- If that fails and in production, it attempts Supabase login
- If both fail, appropriate error messages are displayed

### Common Issues
- **"Supabase client not initialized"**: Check environment variables and verify installation
- **"Email and password are required"**: Form validation error
- **OAuth errors**: Check redirect URIs and provider configurations 
- **Session issues**: Verify NEXTAUTH_SECRET is properly set