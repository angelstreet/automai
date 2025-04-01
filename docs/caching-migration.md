# Global Next.js Caching Strategy (COMPLETED)

This document establishes a comprehensive caching strategy for our Next.js application, applying to all components, server actions, and database interactions. It combines server-side and client-side caching to optimize performance, ensure data consistency, and eliminate redundant database calls across the entire codebase.

## Core Principles

1. **Universal Caching**: Apply caching systematically across Server Actions (server-side) and Client Components (client-side) for all READ operations, ensuring no layer bypasses the strategy.
2. **Server-Side Optimization**: Leverage Next.js's built-in caching tools for server-side READ operations, with explicit invalidation to maintain freshness.
3. **Client-Side Efficiency**: Use a client-side caching library to deduplicate fetches, manage state, and integrate with server-side data, preventing duplicate calls.
4. **Global Consistency**: Synchronize cache invalidation across all layers (server and client) after WRITE operations to keep data current.
5. **No Database Caching**: Prohibit caching in the Database Layer to ensure raw, uncached data access for all operations.

## Architecture Layers

### 1. Database Layer (Located in /lib/supabase/db-*)

- **Purpose**: Provides raw data access to all resources (users, teams, permissions, etc.) without caching or business logic.
- **Rules**:
  - Accepts a cookieStore parameter or equivalent for authentication.
  - Executes direct Supabase queries for all CRUD operations (Create, Read, Update, Delete).
  - Never implements caching at this layer.
  - Never calls other Database Layer functions to avoid nesting or dependencies.
  - Functions are named with a `fetch` prefix for READs (e.g., fetchUsers) and action verbs for WRITEs (e.g., updateTeam).
- **Scope**: Applies to all database interactions (users, teams, permissions, deployments, etc.).

### 2. Server Actions Layer (Located in /app/actions/*.ts)

- **Purpose**: Centralizes server-side caching for READ operations and handles WRITE operations, serving all Server Components and client-side requests across the application.
- **Rules**:
  - All functions must be marked with the 'use server' directive to ensure server-only execution.
  - Wrap READ operations with Next.js's cache function, using explicit keys based on resource type and identifiers (e.g., ['users', userId], ['teams', tenantId]).
  - Retrieve cookies using the cookies function from next/headers for authentication.
  - Call Database Layer functions, passing the cookieStore for authenticated queries.
  - Never cache WRITE operations such as create, update, or delete actions.
  - Invalidate caches after WRITE operations using revalidateTag (preferred) or revalidatePath, with tags matching READ keys (e.g., revalidateTag('users')).
  - Functions are named with a `get` prefix for READs (e.g., getUsers) and action verbs for WRITEs (e.g., createTeam).
- **Scope**: Covers all resources (users, teams, permissions, deployments, etc.), ensuring every READ is cached server-side.

### 3. Client-Side Layer (Located in /app/[locale]/[tenant]/_/components/_.tsx)

- **Purpose**: Manages user interface and dynamic data fetching with client-side caching to prevent redundant requests across all client components.
- **Rules**:
  - All components must be marked with the 'use client' directive to indicate client-side execution.
  - Use the client-side caching library's query hook for READ operations, importing from Server Actions (e.g., useQuery with getUsers).
  - Use the client-side caching library's mutation hook for WRITE operations, invalidating specific cached queries afterward (e.g., invalidateQueries(['users'])).
  - Integrate with Server Components by accepting pre-fetched data or hydrated state via props.
  - Limit use of useEffect to side effects not managed by the caching library, including cleanup to prevent memory leaks.
  - Never call Database Layer functions directly from client components.
- **Scope**: Applies to all Client Components interacting with resources (users, teams, dashboards, etc.), ensuring client-side deduplication.

### 4. Server Components (Located in /app/[locale]/[tenant]/_/page.tsx and /app/[locale]/[tenant]/_/layout.tsx)

- **Purpose**: Pre-fetches data for server-side rendering and layouts, hydrating client-side caches for all pages and shared UI structures.
- **Rules**:
  - Call Server Actions directly to fetch data for all resources.
  - Pass pre-fetched data to Client Components through props.
  - Use the client-side caching library's dehydration method to prepare data for client-side hydration when integrating with dynamic client components.
  - Redirect unauthenticated users to appropriate login paths (e.g., /[locale]/login) based on Server Action results.
- **Scope**: Encompasses all Server Components (pages and layouts) rendering resources like dashboards, team lists, or user profiles.

## Global Configuration

### Client-Side Caching Setup

- TanStack Query (React Query) is used as the client-side caching library.
- It's configured in the TenantLayout client component with a 5-minute stale time and a 10-minute cache time.
- React Query provides hydration support to seamlessly transition pre-fetched server data to the client.

### Directory Structure

- **Database Layer**: /lib/supabase/db-users/users.ts, /lib/supabase/db-teams/teams.ts, etc., for each resource type.
- **Server Actions**: /app/actions/users.ts, /app/actions/teams.ts, etc., mirroring resource types.
- **Client Components**: /app/[locale]/[tenant]/[resource]/_components/*.tsx (e.g., /dashboard/_components/, /team/_components/).
- **Server Components**: /app/[locale]/[tenant]/[resource]/page.tsx and layout.tsx (e.g., /dashboard/page.tsx).

## Anti-Patterns to Avoid

- Do not implement caching in the Database Layer for any resource.
- Do not call Database Layer functions directly from Client Components or Server Components without Server Actions.
- Do not cache WRITE operations like create, update, or delete across any layer.
- Do not omit cache invalidation (revalidateTag or invalidateQueries) after WRITE operations for any resource.
- Do not use excessive dependencies in useEffect hooks that trigger unnecessary refetching in Client Components.
- Do not perform database queries directly in render functions in any component type.

## Debugging Caching Issues

If redundant database queries occur for any resource:

1. Confirm that Server Actions use the cache function for all READ operations.
2. Verify that revalidateTag or revalidatePath is called after WRITE operations for the affected resource.
3. Ensure client-side query keys are unique and consistent across components (e.g., ['users', userId]).
4. Check that useEffect dependencies in Client Components are minimal and appropriate for the resource.
5. Use React Developer Tools and Next.js logs to inspect render cycles and cache behavior across all layers.

## Code Examples

Below are examples illustrating a problematic (bad) implementation of user-related functionality before migration and an optimized (good) implementation after adopting this strategy.

### Bad Example: Pre-Migration User Implementation

This example shows common anti-patterns leading to duplicate calls and inefficient caching.

```
// Database Layer with Caching (Wrong Layer)
// src/lib/supabase/server/user.ts
const CACHE_TTL = 300000;
const userCache = new Map();
async function getCurrentUser(cookieStore) {
const cacheKey = 'user_' + cookieStore.get('auth-token')?.value.slice(0, 32);
const cached = userCache.get(cacheKey);
if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
return cached.user;
}
const supabase = await createClient(cookieStore);
const { data: { user } } = await supabase.auth.getUser();
const { data: profile } = await supabase.from('profiles').select().eq('id', user.id).single();
const userData = { id: user.id, email: user.email, role: profile.role };
userCache.set(cacheKey, { user: userData, timestamp: Date.now() });
return userData;
}
// Client Component with Direct DB Call (Anti-Pattern)
// src/app/[locale]/[tenant]/dashboard/_components/Dashboard.tsx
'use client';
import { useState, useEffect } from 'react';
import { getCurrentUser } from '@/lib/supabase/server/user';
export default function Dashboard() {
const [user, setUser] = useState(null);
useEffect(() => {
getCurrentUser().then(setUser); // Direct DB call, no caching
}, []); // Repeated calls on rerender
return user ? <div>Welcome, {user.email}</div> : <div>Loading...</div>;
}
// Server Component with No Pre-fetching
// src/app/[locale]/[tenant]/dashboard/page.tsx
import Dashboard from './_components/Dashboard';
export default function DashboardPage() {
return <Dashboard />; // No server-side caching or pre-fetching
}
```

**Issues**:

- Caching in Database Layer violates the no-caching rule.
- Client Component calls Database Layer directly, bypassing Server Actions, causing duplicates.
- Server Component lacks pre-fetching, leading to client-side refetching.

### Good Example: Post-Migration User Implementation

This example adheres to the new strategy, eliminating duplicates and optimizing caching.

```
// Database Layer (No Caching)
// src/lib/supabase/db-users/users.ts
export async function fetchUser(userId, cookieStore) {
const supabase = await createClient(cookieStore);
const { data: { user } } = await supabase.auth.getUser();
if (!user || user.id !== userId) return null;
const { data: profile } = await supabase.from('profiles').select().eq('id', userId).single();
return { id: user.id, email: user.email, role: profile.role };
}

// Server Actions Layer (Server-Side Caching)
// src/app/actions/users.ts
'use server';

import { cache } from 'react';
import { cookies } from 'next/headers';
import { revalidateTag } from 'next/cache';
import { fetchUser } from '@/lib/supabase/db-users/users';

export const getCurrentUser = cache(async () => {
const cookieStore = cookies();
const supabase = await createClient(cookieStore);
const { data: { user } } = await supabase.auth.getUser();
if (!user) return null;
return await fetchUser(user.id, cookieStore);
}, ['currentUser']);

// Client Component (Client-Side Caching)
// src/app/[locale]/[tenant]/dashboard/_components/Dashboard.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from '@/app/actions/users';

export default function Dashboard() {
const { data: user, isLoading } = useQuery({
queryKey: ['currentUser'],
queryFn: getCurrentUser,
});

if (isLoading) return <div>Loading...</div>;
return user ? <div>Welcome, {user.email}</div> : <div>Not authenticated</div>;
}

// Server Component (Pre-fetching and Hydration)
// src/app/[locale]/[tenant]/dashboard/page.tsx
import Dashboard from './_components/Dashboard';
import { QueryClient, dehydrate } from '@tanstack/react-query';
import { getCurrentUser } from '@/app/actions/users';

export default async function DashboardPage({ params }) {
const queryClient = new QueryClient();
const user = await queryClient.fetchQuery({
queryKey: ['currentUser'],
queryFn: getCurrentUser,
});

if (!user) {
return { redirect: { destination: /${params.locale}/login, permanent: false } };
}

return <Dashboard dehydratedState={dehydrate(queryClient)} />;
}
```

**Benefits**:

- Database Layer is cache-free, adhering to the strategy.
- Server Actions use cache() for server-side READs, reducing DB calls.
- Client Component uses React Query for client-side deduplication, eliminating duplicate calls.
- Server Component pre-fetches and hydrates, optimizing initial load.

## Migration Status

- ✅ SWR completely removed and replaced with React Query
- ✅ React Query properly configured in the TenantLayout
- ✅ No backward compatibility layers or SWR imports remain