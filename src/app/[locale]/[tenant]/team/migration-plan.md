● Team Module Migration Plan: Server/Client Optimization

This migration plan outlines how to optimize the Team module by leveraging the Next.js server component architecture for better performance.

Current Issues

1. Duplicate data fetching (server and client)
2. All components are client components regardless of need
3. No data passing from server to client components
4. Inefficient rendering pipeline

Target Architecture

Team Module
├── page.tsx (Server Component)
│ ├── Data fetching
│ ├── SEO setup
│ └── Layout structure
│
├── \_components/
│ ├── TeamContent.tsx (Server Component)
│ │ └── Passes data down
│ │
│ ├── TeamSkeleton.tsx (Server Component)
│ │ └── Static loading UI  
│ │
│ └── client/
│ ├── TeamTableClient.tsx (Client Component)
│ │ └── Table with interactive features
│ ├── TeamMemberFormClient.tsx (Client Component)
│ │ └── Form with validation
│ ├── TeamActionsClient.tsx (Client Component)
│ │ └── Action buttons with dialogs
│ └── TeamRefreshListener.tsx (Client Component)
│ └── Event handling component

Migration Steps

Step 1: Create Server Components

1. Create TeamContent.tsx in \_components/ with server data fetching:

// \_components/TeamContent.tsx
import { getTeamMembers } from '@/app/actions/teamAction';
import TeamTableClient from './client/TeamTableClient';

export default async function TeamContent() {
// Fetch data on the server (uses React's cache)
const membersResponse = await getTeamMembers();
const members = membersResponse.success ? membersResponse.data || [] : [];

return (

<div className="w-full border-0 shadow-none">
<TeamTableClient initialMembers={members} />
</div>
);
}

2. Create TeamSkeleton.tsx as a server component:

// \_components/TeamSkeleton.tsx
import { Card, CardContent } from '@/components/shadcn/card';
import { Skeleton } from '@/components/shadcn/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/shadcn/table';

export default function TeamSkeleton() {
return (
<Card className="w-full border-0 shadow-none">
<CardContent>

<div className="overflow-x-auto">
<Table>
<TableHeader>
<TableRow>
<TableHead><Skeleton className="h-5 w-20" /></TableHead>
<TableHead><Skeleton className="h-5 w-24" /></TableHead>
<TableHead><Skeleton className="h-5 w-16" /></TableHead>
<TableHead><Skeleton className="h-5 w-16" /></TableHead>
<TableHead><Skeleton className="h-5 w-10" /></TableHead>
</TableRow>
</TableHeader>
<TableBody>
{[...Array(3)].map((\_, i) => (
<TableRow key={i}>
<TableCell><Skeleton className="h-4 w-32" /></TableCell>
<TableCell><Skeleton className="h-4 w-40" /></TableCell>
<TableCell><Skeleton className="h-4 w-24" /></TableCell>
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

1. Modify TeamTableClient.tsx to avoid refetching data:

// \_components/client/TeamTableClient.tsx
'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/shadcn/use-toast';
import { REFRESH_TEAM_MEMBERS } from '@/app/providers/teamProvider';
import type { TeamMember } from '@/types/component/teamComponentType';
import { getTeamMembers } from '@/app/actions/teamAction';

interface TeamTableClientProps {
initialMembers: TeamMember[];
}

export default function TeamTableClient({ initialMembers }: TeamTableClientProps) {
// Use server-provided data as initial state
const [members, setMembers] = useState<TeamMember[]>(initialMembers);
const [isLoading, setIsLoading] = useState(false);
// ... rest of component state ...

// Handle refresh events
useEffect(() => {
const handleRefresh = async () => {
setIsLoading(true);
try {
const response = await getTeamMembers();
if (response.success) {
setMembers(response.data || []);
}
} catch (error) {
console.error('Error refreshing team members:', error);
} finally {
setIsLoading(false);
}
};

    window.addEventListener(REFRESH_TEAM_MEMBERS, handleRefresh);
    return () => {
      window.removeEventListener(REFRESH_TEAM_MEMBERS, handleRefresh);
    };

}, []);

// Rest of the component...
}

2. Create a tiny TeamRefreshListener.tsx for event handling:

// \_components/client/TeamRefreshListener.tsx
'use client';

import { useEffect } from 'react';
import {
REFRESH_TEAM_MEMBERS,
REFRESH_TEAM_COMPLETE
} from '@/app/providers/teamProvider';
import { useRouter } from 'next/navigation';

// This component just listens for events that require a refresh
export default function TeamRefreshListener() {
const router = useRouter();

useEffect(() => {
const handleRefreshComplete = () => {
// Refresh the route when events complete
router.refresh();
};

    window.addEventListener(REFRESH_TEAM_COMPLETE, handleRefreshComplete);
    return () => {
      window.removeEventListener(REFRESH_TEAM_COMPLETE, handleRefreshComplete);
    };

}, [router]);

// This component renders nothing
return null;
}

Step 3: Update Page Component

// page.tsx
import { getTranslations } from 'next-intl/server';
import { Suspense } from 'react';
import { getTeamMembers } from '@/app/actions/teamAction';
import { FeaturePageContainer } from '@/components/layout/FeaturePageContainer';
import TeamContent from './\_components/TeamContent';
import TeamSkeleton from './\_components/TeamSkeleton';
import { TeamActionsClient } from './\_components';
import TeamRefreshListener from './\_components/client/TeamRefreshListener';

export default async function TeamPage() {
const t = await getTranslations('team');

// Only fetch member count for the actions component
const membersResponse = await getTeamMembers();
const members = membersResponse.success ? membersResponse.data || [] : [];

return (
<FeaturePageContainer
title={t('title') || 'Team Management'}
description={t('description') || 'Manage your team members and permissions'}
actions={<TeamActionsClient memberCount={members.length} />} >
{/_ Hidden component that listens for refresh events _/}
<TeamRefreshListener />

      <Suspense fallback={<TeamSkeleton />}>
        <TeamContent />
      </Suspense>
    </FeaturePageContainer>

);
}

Step 4: Update \_components/index.ts

// \_components/index.ts
/\*\*

- Team Components
-
- Following optimal server/client architecture:
- - Server components fetch data and pass to client
- - Client components handle interactivity only
- - Clear separation of responsibilities
    \*/

// Server Components
export { default as TeamContent } from './TeamContent';
export { default as TeamSkeleton } from './TeamSkeleton';

// Client Components
export { default as TeamTableClient } from './client/TeamTableClient';
export { default as TeamMemberFormClient } from './client/TeamMemberFormClient';
export { default as TeamActionsClient } from './client/TeamActionsClient';
export { default as TeamRefreshListener } from './client/TeamRefreshListener';

Step 5: Remove Previous Client Alternatives

1. Delete TeamContentClient.tsx
2. Replace TeamSkeletonClient.tsx with server component version

Implementation Timeline

1. Day 1: Scaffolding

   - Create the new server components (TeamContent.tsx, TeamSkeleton.tsx)
   - Create TeamRefreshListener.tsx

2. Day 2: Client Component Updates

   - Update TeamTableClient to work with server-provided data
   - Update other client components as needed

3. Day 3: Integration

   - Update page.tsx to use new component structure
   - Update exports in index.ts
   - Remove deprecated files

4. Day 4: Testing
   - Test all functionality including:
     - Initial page load
     - Adding/editing/deleting team members
     - Permission management
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
