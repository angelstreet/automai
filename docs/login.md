# Authentication and Plan Management

## Authentication Flow

1. **Initial Login**

   - User logs in via email/password or OAuth (Google/GitHub)
   - Backend validates credentials and checks tenant information
   - JWT token is generated containing user info, tenant, and plan

2. **Plan Determination**

   ```typescript
   if (no tenant) {
     plan = 'TRIAL'  // Default for new users
   } else if (tenant.name === 'pro') {
     plan = 'PRO'    // Users who subscribed to pro plan
   } else {
     plan = 'ENTERPRISE'  // Custom tenant names for enterprise
   }
   ```

3. **Auth Redirect Process**
   - After successful authentication, user is redirected to `/auth-redirect`
   - Auth-redirect page attempts to sign in with the token
   - On success, redirects to appropriate dashboard based on tenant
   - On any failure, immediately redirects to login with error

## Plan Types

1. **TRIAL**

   - Default plan for new users
   - No tenant assigned
   - Redirects to `/trial/dashboard`

2. **PRO**

   - Users who subscribed to pro plan
   - Has tenant with name 'pro'
   - Redirects to `/pro/dashboard`

3. **ENTERPRISE**
   - Custom tenant name (usually company name)
   - Redirects to `/{tenant-name}/dashboard`

## Tenant Management

- Tenants are created during registration or subscription
- Tenant name determines the plan type
- Tenant paths in URLs: `/{locale}/{tenant}/dashboard`
- Default path for new users: `/{locale}/trial/dashboard`

## Error Handling

- Authentication failures redirect to login page
- No retry logic - failures are handled immediately
- Error messages are passed via URL query params
- Common errors:
  - No token: "No authentication token"
  - Invalid token: "Authentication failed"
  - Session issues: "Authentication failed"

## JWT Token Structure

```typescript
{
  userId: string,
  email: string,
  tenantId: string | null,
  role: 'USER' | 'ADMIN',
  plan: 'TRIAL' | 'PRO' | 'ENTERPRISE'
}
```

## Subscription Flow

1. User starts on TRIAL (no tenant)
2. User subscribes to PRO:
   - Creates tenant with name 'pro'
   - Updates user's tenantId
   - Next login will detect 'pro' tenant and set PRO plan

## Enterprise Setup

1. Enterprise customers get custom tenant name
2. Admin creates tenant with company name
3. Users are assigned to tenant
4. Plan is automatically set to ENTERPRISE based on custom tenant name
