● CICD Module Migration Plan: Server/Client Optimization

This migration plan outlines how to optimize the CICD module by leveraging the Next.js server component architecture for better performance.

Current Issues

1. Duplicate data fetching (server and client)
2. All components are client components regardless of need
3. No data passing from server to client components
4. Inefficient rendering pipeline

Target Architecture

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
│ ├── CICDActionsClient.tsx (Client Component)
│ │ └── Action buttons with dialogs
│ └── CICDRefreshListener.tsx (Client Component)
│ └── Event handling component

Migration Steps

Step 1: Create Server Components

1. Create CICDContent.tsx in \_components/ with server data fetching:

// \_components/CICDContent.tsx
import { getCICDProviders } from '@/app/actions/cicdAction';
import CICDTableClient from './client/CICDTableClient';

export default async function CICDContent() {
// Fetch data on the server (uses React's cache)
const providersResponse = await getCICDProviders();
const providers = providersResponse.success ? providersResponse.data || [] : [];

    return (
      <div className="w-full border-0 shadow-none">
        <CICDTableClient initialProviders={providers} />
      </div>
    );

}

2. Create CICDSkeleton.tsx as a server component:

// \_components/CICDSkeleton.tsx
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
{[...Array(3)].map((\_, i) => (
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

Step 2: Update Client Components

1. Modify CICDTableClient.tsx to avoid refetching data:

// \_components/client/CICDTableClient.tsx
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useToast } from '@/components/shadcn/use-toast';
import { REFRESH_CICD_PROVIDERS } from '@/app/providers/CICDProvider';
import type { CICDProvider } from '@/types/component/cicdComponentType';
import { getCICDProviders } from '@/app/actions/cicdAction';

interface CICDTableClientProps {
initialProviders: CICDProvider[];
}

export default function CICDTableClient({ initialProviders }: CICDTableClientProps) {
// Use server-provided data as initial state
const [providers, setProviders] = useState<CICDProvider[]>(initialProviders);
const [isLoading, setIsLoading] = useState(false);
// ... rest of component state ...

    // Handle refresh events
    useEffect(() => {
      const handleRefresh = async () => {
        setIsLoading(true);
        try {
          const response = await getCICDProviders();
          if (response.success) {
            setProviders(response.data || []);
          }
        } catch (error) {
          console.error('Error refreshing providers:', error);
        } finally {
          setIsLoading(false);
        }
      };

      window.addEventListener(REFRESH_CICD_PROVIDERS, handleRefresh);
      return () => {
        window.removeEventListener(REFRESH_CICD_PROVIDERS, handleRefresh);
      };
    }, []);

    // Rest of the component...

}

2. Create a tiny CICDRefreshListener.tsx for event handling:

// \_components/client/CICDRefreshListener.tsx
'use client';

import { useEffect } from 'react';
import {
REFRESH_CICD_PROVIDERS,
REFRESH_CICD_COMPLETE
} from '@/app/providers/CICDProvider';
import { useRouter } from 'next/navigation';

// This component just listens for events that require a refresh
export default function CICDRefreshListener() {
const router = useRouter();

    useEffect(() => {
      const handleRefreshComplete = () => {
        // Refresh the route when events complete
        router.refresh();
      };

      window.addEventListener(REFRESH_CICD_COMPLETE, handleRefreshComplete);
      return () => {
        window.removeEventListener(REFRESH_CICD_COMPLETE, handleRefreshComplete);
      };
    }, [router]);

    // This component renders nothing
    return null;

}

Step 3: Update Page Component

// page.tsx
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { getCICDProviders } from '@/app/actions/cicdAction';
import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';
import CICDContent from './\_components/CICDContent';
import CICDSkeleton from './\_components/CICDSkeleton';
import { CICDActionsClient } from './\_components';
import CICDRefreshListener from './\_components/client/CICDRefreshListener';

export default async function CICDPage() {
const t = await getTranslations('cicd');

    // Only fetch provider count for the actions component
    const providersResponse = await getCICDProviders();
    const providers = providersResponse.success ? providersResponse.data || [] : [];

    return (
      <FeaturePageContainer
        title={t('title') || 'CI/CD Integration'}
        description={t('description') || 'Configure CI/CD providers for automated deployments'}
        actions={<CICDActionsClient providerCount={providers.length} />}
      >
        {/* Hidden component that listens for refresh events */}
        <CICDRefreshListener />

        <Suspense fallback={<CICDSkeleton />}>
          <CICDContent />
        </Suspense>
      </FeaturePageContainer>
    );

}

Step 4: Update \_components/index.ts

// \_components/index.ts
/\*\*

- CICD Components
-
- Following optimal server/client architecture:
- - Server components fetch data and pass to client
- - Client components handle interactivity only
- - Clear separation of responsibilities
    \*/

// Server Components
export { default as CICDContent } from './CICDContent';
export { default as CICDSkeleton } from './CICDSkeleton';

// Client Components
export { default as CICDTableClient } from './client/CICDTableClient';
export { default as CICDProviderFormClient } from './client/CICDProviderFormClient';
export { default as CICDActionsClient } from './client/CICDActionsClient';
export { default as CICDRefreshListener } from './client/CICDRefreshListener';

Step 5: Remove Previous Client Alternatives

1. Delete CICDContentClient.tsx
2. Replace CICDSkeletonClient.tsx with server component version

Implementation Timeline

1. Day 1: Scaffolding


    - Create the new server components (CICDContent.tsx, CICDSkeleton.tsx)
    - Create CICDRefreshListener.tsx

2. Day 2: Client Component Updates


    - Update CICDTableClient to work with server-provided data
    - Update other client components as needed

3. Day 3: Integration


    - Update page.tsx to use new component structure
    - Update exports in index.ts
    - Remove deprecated files

4. Day 4: Testing


    - Test all functionality including:
        - Initial page load
      - Adding/editing/deleting providers
      - Testing connections
      - Refresh functionality

Benefits

1. Performance


    - Server-rendered UI for faster initial page load
    - Reduced client-side JavaScript
    - Avoids duplicate data fetching

2. Architecture


    - Clear separation between server/client responsibilities
    - Better caching with React's cache() function
    - More maintainable component structure

3. DX (Developer Experience)


    - Easier to reason about data flow
    - Simpler client components
    - Follows Next.js best practices

This migration plan provides a step-by-step approach to optimize the CICD module while maintaining all current functionality.
