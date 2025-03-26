# Migration to React Server Components

*Date: [Current Date]*

## Overview

This document outlines a comprehensive plan for migrating our application from the current client-side Context API architecture to React Server Components (RSC), following Next.js best practices.

## Table of Contents

1. [Migration Rationale](#migration-rationale)
2. [Architecture Changes](#architecture-changes)
3. [Migration Rules](#migration-rules)
4. [File Structure](#file-structure)
5. [Detailed Migration Plan](#detailed-migration-plan)
6. [Testing Strategy](#testing-strategy)
7. [Rollback Plan](#rollback-plan)
8. [Resources](#resources)

## Migration Rationale

### Current Architecture Limitations
- Client-side data fetching creates loading states and waterfalls
- Context providers fetch data eagerly, even when not needed
- Unnecessary JavaScript sent to the client
- Performance impact on initial load and time-to-interactive

### Benefits of React Server Components
- Faster initial page loads
- Reduced client-side JavaScript
- Built-in data caching and streaming
- Simplified data fetching (direct database/API access)
- Better SEO and Core Web Vitals scores
- Improved security with sensitive logic on server
- Progressive enhancement for better user experience

## Architecture Changes

### From: Context-Based Client Architecture

```
Client Component (Page)
  ↓
Context Providers (wrapping application)
  ↓
SWR Hooks (for data fetching)
  ↓
API Endpoints or Server Actions
  ↓
Database/External Services
```

### To: React Server Components Architecture

```
Server Component (Page)
  ↓
Server-side Data Fetching
  ↓ [Server/Client Boundary]
  ↓
Client Components (for interactivity only)
  ↓
Server Actions (for mutations)
  ↓
Database/External Services
```

## Migration Rules

1. **Don't modify shadcn components**: All shadcn components remain unchanged.
2. **Preserve UI layouts and styling**: No visual changes to the application.
3. **Progressive cleanup**: Delete obsolete files after each phase is complete.
4. **Maintain component hierarchy**: Keep the same component structure where possible.
5. **Default to Server Components**: Only add 'use client' when necessary.
6. **Minimize client-side JavaScript**: Move logic to the server where possible.
7. **Preserve existing functionality**: All features must work as before.

## File Structure

After migration, our file structure will follow this pattern:

```
src/
├── app/
│   ├── actions/                      # Server actions (new)
│   │   ├── repositories.ts           # Repository server actions 
│   │   ├── deployments.ts            # Deployment server actions
│   │   ├── hosts.ts                  # Host server actions
│   │   ├── cicd.ts                   # CICD server actions
│   │   └── ...
│   │
│   ├── [locale]/
│   │   └── [tenant]/
│   │       ├── deployment/
│   │       │   ├── _components/      # Server components
│   │       │   │   └── ...
│   │       │   ├── _components/client/  # Client components
│   │       │   │   └── ...
│   │       │   └── page.tsx          # Server component page
│   │       │
│   │       ├── repositories/
│   │       │   ├── _components/      # Server components
│   │       │   │   └── ...
│   │       │   ├── _components/client/  # Client components
│   │       │   │   └── ...
│   │       │   └── page.tsx          # Server component page
│   │       │
│   │       └── ...
│   │
│   └── api/                         # API routes
│       └── ...
│
├── components/                      # Shared components
│   ├── ui/                          # Shadcn UI components (unchanged)
│   │   └── ...
│   │
│   ├── client/                      # Shared client components
│   │   └── ...
│   │
│   └── layout/                      # Layout components
│       └── ...
│
├── lib/                            # Utilities and libraries
│   ├── server/                     # Server-only utilities
│   │   └── ...
│   │
│   ├── client/                     # Client-only utilities
│   │   └── ...
│   │
│   └── utils/                      # Shared utilities
│       └── ...
│
└── types/                          # TypeScript types
    └── ...
```

## Detailed Migration Plan

### Phase 1: Server Actions Setup (0% → 15%)

**Tasks:**
1. Create server action files in `src/app/actions/` directory
2. Implement data fetching with proper error handling
3. Set up TypeScript types for all server actions
4. Create utilities for data caching and revalidation

**Files to Create:**
- `src/app/actions/repositories.ts`
- `src/app/actions/deployments.ts`
- `src/app/actions/hosts.ts`
- `src/app/actions/cicd.ts`
- `src/app/actions/users.ts`
- `src/app/actions/index.ts`

**Sample Implementation:**

```typescript
// src/app/actions/repositories.ts
'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';
import { Repository } from '@/types/repository';

export async function getRepositories(): Promise<Repository[]> {
  try {
    const repositories = await db.repository.findMany({
      orderBy: { name: 'asc' }
    });
    
    return repositories;
  } catch (error) {
    console.error('Failed to fetch repositories:', error);
    return [];
  }
}

export async function getRepositoryById(id: string): Promise<Repository | null> {
  try {
    const repository = await db.repository.findUnique({
      where: { id }
    });
    
    return repository;
  } catch (error) {
    console.error(`Failed to fetch repository ${id}:`, error);
    return null;
  }
}

export async function addRepository(data: Omit<Repository, 'id'>): Promise<{
  success: boolean;
  data?: Repository;
  error?: string;
}> {
  try {
    const repository = await db.repository.create({
      data
    });
    
    revalidatePath('/[locale]/[tenant]/repositories');
    return { success: true, data: repository };
  } catch (error) {
    console.error('Failed to add repository:', error);
    return { success: false, error: 'Failed to add repository' };
  }
}

// Other repository-related actions...
```

**Cleanup:**
- None (all new files)

### Phase 2: Component Analysis (15% → 30%)

**Tasks:**
1. Analyze all components for interactivity needs
2. Create directory structure for client components
3. Document shadcn component usage patterns
4. Prepare component conversion strategy

**Analysis Document:**
Create a comprehensive spreadsheet or document listing all components with:
- Component name and path
- Interactivity needs (State, Effects, Browser APIs, etc.)
- Whether it needs to be a Client Component
- Dependencies on Context APIs
- Plan for conversion

**Cleanup:**
- None (analysis only)

### Phase 3: Repository Module Migration (30% → 45%)

**Tasks:**
1. Convert repository page to Server Component
2. Create client components for interactive elements
3. Implement server data fetching
4. Test repository section thoroughly

**Files to Create/Modify:**
- `src/app/[locale]/[tenant]/repositories/page.tsx` (modify)
- `src/app/[locale]/[tenant]/repositories/_components/RepositoryList.tsx` (create/modify)
- `src/app/[locale]/[tenant]/repositories/_components/client/RepositoryActions.tsx` (create)
- `src/app/[locale]/[tenant]/repositories/_components/client/AddRepositoryDialog.tsx` (create)

**Sample Implementation:**

```tsx
// src/app/[locale]/[tenant]/repositories/page.tsx
import { getRepositories } from '@/app/actions/repositories';
import { RepositoryList } from './_components/RepositoryList';
import { RepositoryActions } from './_components/client/RepositoryActions';

export default async function RepositoriesPage() {
  // Server-side data fetching
  const repositories = await getRepositories();
  
  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Repositories</h1>
        <RepositoryActions />
      </div>
      
      <RepositoryList repositories={repositories} />
    </div>
  );
}
```

```tsx
// src/app/[locale]/[tenant]/repositories/_components/client/RepositoryActions.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw } from 'lucide-react';
import { refreshRepositories } from '@/app/actions/repositories';
import { useRouter } from 'next/navigation';
import { AddRepositoryDialog } from './AddRepositoryDialog';

export function RepositoryActions() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshRepositories();
    router.refresh(); // Refresh the current page
    setIsRefreshing(false);
  };
  
  return (
    <>
      <div className="flex items-center space-x-2">
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="h-4 w-4 mr-1" /> 
          Add Repository
        </Button>
        
        <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      
      {showAddDialog && (
        <AddRepositoryDialog 
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onRepositoryAdded={() => {
            setShowAddDialog(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
```

**Cleanup after Phase 3:**
- Delete `src/context/RepositoryContext.tsx`
- Delete `src/hooks/useRepositoryData.ts`
- Update `src/context/index.ts` to remove repository exports

### Phase 4: Deployment Module Migration (45% → 60%)

**Tasks:**
1. Convert deployment page to Server Component
2. Create client components for deployment wizard and interactive elements
3. Implement repository lazy-loading for deployment wizard
4. Test deployment section thoroughly

**Files to Create/Modify:**
- `src/app/[locale]/[tenant]/deployment/page.tsx` (modify)
- `src/app/[locale]/[tenant]/deployment/_components/DeploymentList.tsx` (create/modify)
- `src/app/[locale]/[tenant]/deployment/_components/client/DeploymentActions.tsx` (create)
- `src/app/[locale]/[tenant]/deployment/_components/client/DeploymentWizard.tsx` (create)

**Sample Implementation:**

```tsx
// src/app/[locale]/[tenant]/deployment/page.tsx
import { getDeployments } from '@/app/actions/deployments';
import { DeploymentList } from './_components/DeploymentList';
import { DeploymentActions } from './_components/client/DeploymentActions';

export default async function DeploymentPage() {
  // Server-side data fetching
  const deployments = await getDeployments();
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Deployments</h1>
        <DeploymentActions />
      </div>
      
      {deployments.length > 0 ? (
        <DeploymentList deployments={deployments} />
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-muted/20 rounded-lg border border-dashed">
          <div className="mb-4 p-4 rounded-full bg-muted/30">
            <Plus className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="mb-2 text-lg font-medium">No deployments found</p>
          <p className="text-muted-foreground mb-4">Create your first deployment to get started</p>
          <DeploymentActions isEmptyState />
        </div>
      )}
    </div>
  );
}
```

```tsx
// src/app/[locale]/[tenant]/deployment/_components/client/DeploymentActions.tsx
'use client';

import { useState } from 'react';
import { Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { DeploymentWizard } from './DeploymentWizard';
import { refreshDeployments } from '@/app/actions/deployments';
import { getRepositories } from '@/app/actions/repositories';

export function DeploymentActions({ isEmptyState = false }) {
  const router = useRouter();
  const [wizardActive, setWizardActive] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [repositories, setRepositories] = useState([]);
  const [isLoadingRepositories, setIsLoadingRepositories] = useState(false);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshDeployments();
    router.refresh();
    setIsRefreshing(false);
  };
  
  const handleNewDeployment = async () => {
    setIsLoadingRepositories(true);
    try {
      // Only fetch repositories when needed
      const repos = await getRepositories();
      setRepositories(repos);
      setWizardActive(true);
    } catch (error) {
      console.error('Failed to load repositories:', error);
    } finally {
      setIsLoadingRepositories(false);
    }
  };
  
  if (isEmptyState) {
    return (
      <Button onClick={handleNewDeployment}>
        <Plus className="h-4 w-4 mr-1" />
        New Deployment
      </Button>
    );
  }
  
  return (
    <>
      <div className="flex items-center space-x-2">
        <Button onClick={handleNewDeployment} disabled={isLoadingRepositories}>
          <Plus className="h-4 w-4 mr-1" />
          New Deployment
        </Button>
        
        <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      
      {wizardActive && (
        <DeploymentWizard
          repositories={repositories}
          onCancel={() => setWizardActive(false)}
          onDeploymentCreated={() => {
            setWizardActive(false);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
```

**Cleanup after Phase 4:**
- Delete `src/context/DeploymentContext.tsx`
- Delete `src/hooks/useDeploymentData.ts`
- Update `src/context/index.ts` to remove deployment exports

### Phase 5: CICD & Host Modules Migration (60% → 85%)

**Tasks:**
1. Convert CICD and host pages to Server Components
2. Create client components for interactive elements
3. Implement server actions for data fetching
4. Test all sections

**Files to Create/Modify:**
- CICD and Host module files (similar pattern to repository and deployment)

**Sample Implementation:**
Similar to Phases 3 and 4, applying the same patterns to CICD and Host modules.

**Cleanup after Phase 5:**
- Delete `src/context/CICDContext.tsx`
- Delete `src/context/HostContext.tsx`
- Delete `src/hooks/useCICDData.ts`
- Delete `src/hooks/useHostData.ts`
- Update `src/context/index.ts` to remove CICD and host exports

### Phase 6: Final Cleanup (85% → 100%)

**Tasks:**
1. Remove remaining context providers
2. Clean up any unused imports
3. Optimize bundle size
4. Final testing

**Cleanup Tasks:**
- Delete `src/context/index.ts` if no longer needed
- Remove SWR dependencies if no longer needed
- Clean up any remaining references to old contexts
- Remove any unused utility functions

## Testing Strategy

For each phase:

1. **Unit Testing**
   - Test server actions in isolation
   - Verify component rendering
   - Check prop/data flow

2. **Integration Testing**
   - Test page-level functionality
   - Verify data fetching and updates
   - Test client-server interactions

3. **End-to-End Testing**
   - Full workflows for each module
   - User journeys across the application
   - Performance testing

4. **Verification Checklist**
   - UI appears identical to pre-migration
   - All functionality works as expected
   - Error states display correctly
   - Performance metrics meet or exceed previous metrics

## Rollback Plan

If issues are encountered:

1. Keep git branches for each phase
2. Maintain the ability to revert to previous architecture
3. Consider implementing feature flags to toggle between old and new implementations
4. Document any breaking changes for quicker rollback decision-making

## Resources

- [Next.js Server Components Documentation](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [React Server Components RFC](https://github.com/reactjs/rfcs/blob/main/text/0188-server-components.md)
- [Next.js Data Fetching Patterns](https://nextjs.org/docs/app/building-your-application/data-fetching)
- [Vercel Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions) 