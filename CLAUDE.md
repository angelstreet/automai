# Supabase Authentication and Database

## Overview

These guidelines cover how to properly integrate with Supabase services including authentication, database, storage, and more. Following these guidelines ensures consistent, secure, and efficient usage of Supabase throughout the application.

## Key Principles

1. **Centralization** - Use the centralized clients from `/src/lib/supabase` for all Supabase operations
2. **Tenant Isolation** - Always enforce tenant boundaries in database operations
3. **Type Safety** - Leverage TypeScript for full type safety with Supabase
4. **Error Handling** - Handle Supabase errors consistently and gracefully
5. **Security** - Follow best practices for secure authentication and data access
6. **Three-Layer Architecture** - Follow the server-db → server-actions → client-hooks pattern

## Three-Layer Architecture

We use a strict three-layer architecture for all Supabase database operations:

1. **Server DB Layer** (Core)
   - Lives in `/src/lib/supabase/db.ts`
   - Contains ALL actual Supabase database calls
   - Only this layer should create Supabase clients using `createServerClient`
   - Uses server-side Supabase client with cookies()
   - Never imported directly by client components
   - Handles database connection, queries, and raw data formatting

2. **Server Actions Layer** (Bridge)
   - Lives in `/src/app/actions/*.ts`
   - Server-only functions marked with 'use server'
   - MUST NOT create Supabase clients directly
   - MUST import and call functions from the Server DB Layer
   - Adds error handling, validation, and business logic
   - Provides a clean API for client components
   - Returns data in a consistent format (e.g., {success, data, error})

3. **Client Hooks Layer** (Interface)
   - Lives in `/src/hooks/*.ts`
   - Client-side React hooks marked with 'use client'
   - MUST NOT create Supabase clients directly
   - MUST call Server Actions (not Server DB directly)
   - Manages loading states, errors, and data caching
   - Provides a React-friendly interface for components

### Data Flow

1. Client Component → Client Hook → Server Action → Server DB → Supabase
2. Server Component → Server DB → Supabase (direct access)

### Key Restrictions

- Only the Server DB Layer should create Supabase clients
- Server Actions should never directly access Supabase
- Client Hooks should never directly access Supabase or the Server DB Layer

## Detailed Rules

### Supabase Client Usage

#### Client Architecture

- Use centralized clients from `/src/lib/supabase`:
  - `createBrowserClient()` - For client components
  - `createServerClient()` - For server components
  - `createMiddlewareClient()` - For middleware
  - `createAdminClient()` - For privileged operations with service role

- Never import directly from:
  - `@supabase/supabase-js`
  - `@supabase/ssr`
  - The old implementation in `/src/utils/supabase`

#### Client Components

```typescript
// In client components
import { createBrowserClient } from '@/lib/supabase';

function ProfileButton() {
  const handleLogout = async () => {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
  };
  
  return <button onClick={handleLogout}>Sign out</button>;
}
```

#### Server Components

```typescript
// In server components
import { createServerClient } from '@/lib/supabase';

async function ProfilePage() {
  const supabase = await createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  // Use session data
}
```

### Database Access

#### Three-Layer Pattern Examples

**1. Server DB Layer (Core)**

```typescript
// src/lib/supabase/db.ts
import { createServerClient } from '@/lib/supabase';
import { cookies } from 'next/headers';

const db = {
  host: {
    async findMany(options: any = {}) {
      const cookieStore = await cookies();
      const supabase = await createServerClient(cookieStore);
      
      let builder = supabase.from('hosts').select('*');
      
      // Apply tenant isolation
      if (options.tenant_id) {
        builder = builder.eq('tenant_id', options.tenant_id);
      }
      
      // Apply filters
      if (options.where) {
        Object.entries(options.where).forEach(([key, value]) => {
          builder = builder.eq(key, value);
        });
      }
      
      const { data, error } = await builder;
      
      if (error) {
        console.error('Error fetching hosts:', error);
        return [];
      }
      
      return data || [];
    },
    
    // Other host methods...
  },
  
  // Other tables...
};

export default db;
```

**2. Server Actions Layer (Bridge)**

```typescript
// src/app/actions/hosts.ts
'use server';

import db from '@/lib/supabase/db';
import { getUser } from '@/auth';

export async function getHosts(filters = {}) {
  try {
    // Get the current user to enforce tenant isolation
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }
    
    // Add tenant_id to ensure tenant isolation
    const hosts = await db.host.findMany({
      ...filters,
      tenant_id: user.tenant_id
    });
    
    return { success: true, data: hosts };
  } catch (error) {
    console.error('Error in getHosts action:', error);
    return { success: false, error: 'Failed to fetch hosts' };
  }
}

// Other host actions...
```

**3. Client Hooks Layer (Interface)**

```typescript
// src/hooks/useHosts.ts
'use client';

import { useState, useEffect } from 'react';
import { getHosts, createHost } from '@/app/actions/hosts';

export function useHosts(initialFilters = {}) {
  const [hosts, setHosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  async function fetchHosts(filters = initialFilters) {
    setLoading(true);
    const result = await getHosts(filters);
    
    if (result.success) {
      setHosts(result.data);
      setError(null);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  }
  
  // Other functions...
  
  useEffect(() => {
    fetchHosts();
  }, []);
  
  return {
    hosts,
    loading,
    error,
    refetch: fetchHosts,
    addHost
  };
}
```

**4. Client Component Usage**

```typescript
// src/components/hosts/HostList.tsx
'use client';

import { useHosts } from '@/hooks/useHosts';

export default function HostList() {
  const { hosts, loading, error } = useHosts();
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      <h1>Hosts</h1>
      {hosts.map(host => (
        <div key={host.id}>{host.name}</div>
      ))}
    </div>
  );
}
```

### Common Pitfalls

- **Bypassing the Three-Layer Architecture** - Always follow the server-db → server-actions → client-hooks pattern
- **Missing Tenant Isolation** - Always include tenant_id in database queries
- **Direct Supabase Usage** - Use the centralized clients instead of direct Supabase imports
- **Not Awaiting Async APIs** - Remember to await createServerClient() and other async APIs
- **Exposing Supabase Keys** - Never expose service role keys in client code
- **Inconsistent Error Handling** - Standardize how Supabase errors are handled
- **Using React.use() with Promises in Client Components** - Never use React.use() to unwrap promises in client components
- **Using Incorrect Client** - Never use createBrowserClient() in server components or createServerClient() in client components