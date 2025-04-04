● CICD Module Migration Plan: Server/Client Optimization

This migration plan outlines how to optimize the CICD module by leveraging the Next.js server component architecture for better performance while maintaining compatibility with existing hook patterns.

## Current Issues

1. Duplicate data fetching (server and client)
2. All components are client components regardless of need
3. No data passing from server to client components
4. Inefficient rendering pipeline

## Target Architecture

CICD Module
├── page.tsx (Server Component)
│ ├── Data fetching
│ ├── SEO setup
│ └── Layout structure
│
├── \_components/
│ ├── CICDContent.tsx (Server Component)
│ │ └── Passes data down
│ │
│ ├── CICDSkeleton.tsx (Server Component)
│ │ └── Static loading UI  
│ │
│ └── client/
│ ├── CICDTableClient.tsx (Client Component)
│ │ └── Table with interactive features
│ ├── CICDProviderFormClient.tsx (Client Component)
│ │ └── Form with validation
│ └── CICDActionsClient.tsx (Client Component)
│ └── Action buttons with dialogs
│
└── /hooks/
└── useCICD.ts (Maintains existing pattern)

## Migration Steps

### Step 1: Optimize Server Actions

Ensure server actions are properly cached and use consistent error handling:

```typescript
// app/actions/cicdAction.ts
'use server';

import { cache } from 'react';
import { revalidateTag } from 'next/cache';
import { cookies } from 'next/headers';
import {
  getCICDProvidersFromDb,
  createCICDProviderInDb,
  // other imports
} from '@/lib/supabase/db-cicd/cicdProviders';

// Use cache for READ operations
export const getCICDProviders = cache(async () => {
  console.log('[@action:cicdAction:getCICDProviders] Starting to fetch CICD providers');
  try {
    const cookieStore = await cookies();
    const result = await getCICDProvidersFromDb(cookieStore);

    if (!result.success) {
      console.error(`[@action:cicdAction:getCICDProviders] ERROR: ${result.error}`);
      return { success: false, error: result.error };
    }

    console.log(
      `[@action:cicdAction:getCICDProviders] Successfully fetched ${result.data?.length || 0} providers`,
    );
    return { success: true, data: result.data };
  } catch (error: any) {
    console.error(`[@action:cicdAction:getCICDProviders] ERROR: ${error.message}`);
    return { success: false, error: error.message || 'Failed to fetch CICD providers' };
  }
});

// Don't cache WRITE operations, but invalidate cache after changes
export async function createCICDProvider(data: CICDProviderPayload) {
  console.log('[@action:cicdAction:createCICDProvider] Creating new CICD provider');
  try {
    const cookieStore = await cookies();
    const result = await createCICDProviderInDb(data, cookieStore);

    if (!result.success) {
      console.error(`[@action:cicdAction:createCICDProvider] ERROR: ${result.error}`);
      return { success: false, error: result.error };
    }

    // Invalidate cache after successful creation
    revalidateTag('cicd-providers');
    console.log('[@action:cicdAction:createCICDProvider] Provider created successfully');
    return { success: true, data: result.data };
  } catch (error: any) {
    console.error(`[@action:cicdAction:createCICDProvider] ERROR: ${error.message}`);
    return { success: false, error: error.message || 'Failed to create CICD provider' };
  }
}

// Similar implementations for updateCICDProvider and deleteCICDProvider
```

### Step 2: Create Server Components

Create optimized server components that fetch data and pass to client components:

```typescript
// _components/CICDContent.tsx
import { getCICDProviders } from '@/app/actions/cicdAction';
import CICDTableClient from './client/CICDTableClient';

export default async function CICDContent() {
  console.log('[@component:CICDContent:render] Fetching providers on server');
  const providersResponse = await getCICDProviders();
  const providers = providersResponse.success ? providersResponse.data || [] : [];

  if (!providersResponse.success) {
    console.error(`[@component:CICDContent:render] Error: ${providersResponse.error}`);
  }

  return (
    <div className="w-full border-0 shadow-none">
      <CICDTableClient initialProviders={providers} />
    </div>
  );
}
```

Create a skeleton server component for loading states:

```typescript
// _components/CICDSkeleton.tsx
import { Card, CardContent } from '@/components/shadcn/card';
import { Skeleton } from '@/components/shadcn/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/shadcn/table';

export default function CICDSkeleton() {
  return (
    <Card className="w-full border-0 shadow-none">
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><Skeleton className="h-5 w-20" /></TableHead>
                <TableHead><Skeleton className="h-5 w-16" /></TableHead>
                <TableHead><Skeleton className="h-5 w-24" /></TableHead>
                <TableHead><Skeleton className="h-5 w-16" /></TableHead>
                <TableHead><Skeleton className="h-5 w-10" /></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
```

### Step 3: Update Client Components

Modify client components to use the existing useCICD hook with server-provided initial data:

```typescript
// _components/client/CICDTableClient.tsx
'use client';

import { useEffect } from 'react';
import { useCICD } from '@/hooks/useCICD';
import type { CICDProvider } from '@/types/component/cicdComponentType';

interface CICDTableClientProps {
  initialProviders: CICDProvider[];
}

export default function CICDTableClient({ initialProviders }: CICDTableClientProps) {
  const {
    providers,
    isLoading,
    error,
    deleteProvider,
    testProvider,
    isDeleting,
    isTesting,
    refetchProviders
  } = useCICD();

  // Use initialProviders for first render, then let React Query handle updates
  // This avoids the flash of loading state and duplicate fetching
  const displayProviders = providers.length > 0 ? providers : initialProviders;

  // Component implementation with displayProviders

  return (
    <div>
      {/* Table implementation using displayProviders */}
    </div>
  );
}
```

Create the form client component:

```typescript
// _components/client/CICDProviderFormClient.tsx
'use client';

import { useState } from 'react';
import { useCICD } from '@/hooks/useCICD';
import type { CICDProvider, CICDProviderPayload } from '@/types/component/cicdComponentType';

interface CICDProviderFormClientProps {
  provider?: CICDProvider;
  onClose: () => void;
}

export default function CICDProviderFormClient({ provider, onClose }: CICDProviderFormClientProps) {
  const { createProvider, updateProvider, isCreating, isUpdating } = useCICD();
  const [formData, setFormData] = useState({
    name: provider?.name || '',
    type: provider?.type || 'github',
    url: provider?.url || '',
    // Other fields
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (provider?.id) {
        await updateProvider({ id: provider.id, data: formData as CICDProviderPayload });
      } else {
        await createProvider(formData as CICDProviderPayload);
      }
      onClose();
    } catch (error) {
      // Error handling already in hook
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form implementation */}
    </form>
  );
}
```

Create actions client component:

```typescript
// _components/client/CICDActionsClient.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/shadcn/button';
import { PlusIcon } from '@heroicons/react/24/outline';
import CICDProviderFormClient from './CICDProviderFormClient';
import { Dialog, DialogContent } from '@/components/shadcn/dialog';

interface CICDActionsClientProps {
  providerCount: number;
}

export default function CICDActionsClient({ providerCount }: CICDActionsClientProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Button
        variant="default"
        onClick={() => setIsDialogOpen(true)}
        className="flex items-center gap-1"
      >
        <PlusIcon className="h-4 w-4" />
        <span>Add Provider</span>
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <CICDProviderFormClient onClose={() => setIsDialogOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
```

### Step 4: Update Page Component

```typescript
// page.tsx
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { getCICDProviders } from '@/app/actions/cicdAction';
import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';
import CICDContent from './_components/CICDContent';
import CICDSkeleton from './_components/CICDSkeleton';
import CICDActionsClient from './_components/client/CICDActionsClient';

export default async function CICDPage() {
  const t = await getTranslations('cicd');

  // Only fetch provider count for the actions component
  const providersResponse = await getCICDProviders();
  const providers = providersResponse.success ? providersResponse.data || [] : [];
  const providerCount = providers.length;

  return (
    <FeaturePageContainer
      title={t('title') || 'CI/CD Integration'}
      description={t('description') || 'Configure CI/CD providers for automated deployments'}
      actions={<CICDActionsClient providerCount={providerCount} />}
    >
      <Suspense fallback={<CICDSkeleton />}>
        <CICDContent />
      </Suspense>
    </FeaturePageContainer>
  );
}
```

### Step 5: Update \_components/index.ts

```typescript
// _components/index.ts
/**
 * CICD Components
 *
 * Following optimal server/client architecture:
 * - Server components fetch data and pass to client
 * - Client components handle interactivity only
 * - Clear separation of responsibilities
 */

// Server Components
export { default as CICDContent } from './CICDContent';
export { default as CICDSkeleton } from './CICDSkeleton';

// Client Components
export { default as CICDTableClient } from './client/CICDTableClient';
export { default as CICDProviderFormClient } from './client/CICDProviderFormClient';
export { default as CICDActionsClient } from './client/CICDActionsClient';
```

## Implementation Timeline

1. **Day 1: Scaffolding**

   - Create the new server components (CICDContent.tsx, CICDSkeleton.tsx)
   - Update server actions to use cache() and proper error handling

2. **Day 2: Client Component Updates**

   - Create or update all client components to work with server-provided data
   - Ensure consistent naming with "Client" suffix

3. **Day 3: Integration**

   - Update page.tsx to use new component structure
   - Update exports in index.ts
   - Implement Suspense boundary

4. **Day 4: Testing & Cleanup**
   - Test all functionality including:
     - Initial page load with server data
     - Adding/editing/deleting providers
     - Testing connections
     - Cache invalidation after mutations
   - Remove deprecated client-only components

## Benefits

1. **Performance**

   - Faster initial page loads with server-rendered content
   - Reduced client JavaScript bundle size
   - Elimination of duplicate data fetching
   - Avoids loading state flash on initial render

2. **Architecture**

   - Clear separation between server/client responsibilities
   - Proper use of Next.js features like cache() and Suspense
   - Integration with existing hook pattern
   - Maintains existing mutations and query patterns

3. **Developer Experience**

   - Clearer component responsibilities
   - Standardized naming conventions
   - Better error handling
   - Follows Next.js best practices

4. **User Experience**
   - Faster perceived performance
   - Reduced layout shifts
   - More reliable error states

This migration plan preserves the existing hook functionality while optimizing the component architecture for better performance and maintainability. It follows all established naming conventions and architectural patterns from the project rules.
