# Migration to React Server Components

*Date: May 2024*

## Overview

This document outlines a streamlined plan for migrating our application from the current client-side Context API architecture to React Server Components (RSC), following Next.js best practices.

## Table of Contents

1. [Migration Rationale](#migration-rationale)
2. [Architecture Changes](#architecture-changes)
3. [Migration Rules](#migration-rules)
4. [File Structure](#file-structure)
5. [Migration Plan](#migration-plan)
6. [Advanced RSC Features](#advanced-rsc-features)

## Migration Rationale

### Current Architecture Limitations
- Client-side data fetching creates loading states and waterfalls
- Context providers fetch data eagerly, even when not needed
- Unnecessary JavaScript sent to the client
- Performance impact on initial load and time-to-interactive
- No streaming or progressive rendering

### Benefits of React Server Components
- Faster initial page loads
- Reduced client-side JavaScript
- Built-in data caching and streaming
- Simplified data fetching (direct database/API access)
- Better SEO and Core Web Vitals scores
- Progressive enhancement via Partial Prerendering
- Granular loading states with Suspense

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
  ├─ Static Content (Layout, Headers)
  ↓ [Suspense Boundary]
  ├─ Dynamic Server Content (Data Lists)
  ↓ [Error Boundary]
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
4. **Default to Server Components**: Only add 'use client' when necessary.
5. **Minimize client-side JavaScript**: Move logic to the server where possible.
6. **Use Suspense for streaming**: Wrap dynamic content for streaming and Partial Prerendering.
7. **Implement Error Boundaries**: Gracefully handle component errors.
8. **Utilize useTransition**: Prevent UI blocking during navigation and mutations.

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
│   │       │   │   ├── DeploymentList.tsx
│   │       │   │   ├── DeploymentSkeleton.tsx
│   │       │   │   └── DeploymentError.tsx
│   │       │   │
│   │       │   ├── _components/client/  # Client components
│   │       │   │   └── ...
│   │       │   └── page.tsx          # Server component page
│   │       │
│   │       ├── repositories/
│   │       │   ├── _components/      # Server components
│   │       │   │   └── ...
│   │       │   ├── _components/client/  # Client components
│   │       │   │   └── ...
│   │       │   └── page.tsx
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
│   │   ├── ErrorBoundary.tsx
│   │   ├── LoadingFallback.tsx
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

## Migration Plan

### Phase 1: Server Actions Setup (0% → 15%) ✅

**Tasks:**
1. Create server action files with proper caching
2. Implement error handling in server actions
3. Create utilities for data fetching with caching
4. Create client-side error boundaries and loading states

**Files Created:**
- `src/app/actions/repositories.ts`
- `src/components/client/ErrorBoundary.tsx`
- `src/components/client/LoadingFallback.tsx`

### Phase 2: Component Analysis (15% → 30%) ✅

**Tasks:**
1. Analyze all components for interactivity needs
2. Create directory structure for client components
3. Document shadcn component usage patterns
4. Prepare component conversion strategy
5. Create shared Suspense fallbacks and Error components

**Files Created:**
- `src/app/[locale]/[tenant]/repositories/_components/RepositorySkeleton.tsx`

### Phase 3: Repository Module Migration (30% → 45%) ✅

**Tasks:**
1. Convert repository page to Server Component with Suspense
2. Create client components with useTransition
3. Implement server data fetching with proper caching
4. Add error boundaries for graceful failure handling

**Files Modified/Created:**
- `src/app/[locale]/[tenant]/repositories/page.tsx` (converted to server component)
- `src/app/[locale]/[tenant]/repositories/_components/RepositoryContent.tsx` (new server component)
- `src/app/[locale]/[tenant]/repositories/_components/RepositoryHeader.tsx` (converted to client component)
- `src/app/[locale]/[tenant]/repositories/_components/RepositoryList.tsx` (converted to client component)
- `src/app/[locale]/[tenant]/repositories/_components/client/RepositoryActions.tsx` (new client component)

**Cleanup:**
- Deleted `src/context/RepositoryContext.tsx`
- Deleted `src/hooks/useRepositoryData.ts`

### Phase 4: Deployment Module Migration (45% → 60%) ✅

**Tasks:**
1. Convert deployment page to Server Component with Suspense
2. Create client components with useTransition
3. Implement server actions for deployment operations
4. Add error boundaries for graceful failure handling

**Files Created/Modified:**
- `src/app/actions/deployments.ts` (new server actions file)
- `src/app/[locale]/[tenant]/deployment/page.tsx` (converted to server component)
- `src/app/[locale]/[tenant]/deployment/_components/DeploymentContent.tsx` (new server component)
- `src/app/[locale]/[tenant]/deployment/_components/DeploymentSkeleton.tsx` (new skeleton component)
- `src/app/[locale]/[tenant]/deployment/_components/DeploymentList.tsx` (converted to client component)
- `src/app/[locale]/[tenant]/deployment/_components/client/DeploymentActions.tsx` (new client component)

**Cleanup:**
- Deleted `src/context/DeploymentContext.tsx`
- Deleted `src/hooks/useDeploymentData.ts`
- Updated `src/context/index.ts` to remove deployment exports

### Phase 5: CICD & Host Modules Migration (60% → 85%) ✅

**Tasks:**
1. Convert CICD and host pages to Server Components with Suspense
2. Create client components with useTransition
3. Implement server actions for CICD and host operations
4. Add error boundaries for graceful failure handling

**Files Created/Modified:**
- `src/app/actions/hosts.ts` (new server actions file)
- `src/app/actions/cicd.ts` (new server actions file)
- `src/app/actions/terminals.ts` (new server actions file)
- `src/app/[locale]/[tenant]/hosts/page.tsx` (converted to server component)
- `src/app/[locale]/[tenant]/hosts/_components/HostContent.tsx` (new server component)
- `src/app/[locale]/[tenant]/hosts/_components/HostSkeleton.tsx` (new skeleton component)
- `src/app/[locale]/[tenant]/hosts/_components/client/ClientHostList.tsx` (new client component)
- `src/app/[locale]/[tenant]/hosts/terminals/page.tsx` (converted to server component)
- `src/app/[locale]/[tenant]/hosts/terminals/_components/TerminalContainer.tsx` (new server component)
- `src/app/[locale]/[tenant]/hosts/terminals/_components/TerminalSkeleton.tsx` (new skeleton component)
- `src/app/[locale]/[tenant]/hosts/terminals/_components/client/ClientTerminal.tsx` (new client component)
- `src/app/[locale]/[tenant]/cicd/page.tsx` (converted to server component)
- `src/app/[locale]/[tenant]/cicd/_components/CICDContent.tsx` (new server component)
- `src/app/[locale]/[tenant]/cicd/_components/CICDSkeleton.tsx` (new skeleton component)
- `src/app/[locale]/[tenant]/cicd/_components/client/ClientCICDProvider.tsx` (new client component)

**Cleanup:**
- Delete `src/context/CICDContext.tsx`
- Delete `src/context/HostContext.tsx`
- Delete `src/hooks/useCICDData.ts`
- Delete `src/hooks/useHostData.ts`
- Update `src/context/index.ts` to remove CICD and host exports

### Phase 5.5: Terminal and Host Components Migration (85% → 95%) ✅

**Tasks:**
1. Implement terminal components for SSH terminal functionality
2. Create client components for terminal interaction
3. Migrate ConnectionForm component to remove context dependencies 
4. Ensure proper client/server separation in Host module

**Files Created/Modified:**
- `src/app/[locale]/[tenant]/hosts/terminals/_components/TerminalContainer.tsx` (new server component)
- `src/app/[locale]/[tenant]/hosts/terminals/_components/TerminalSkeleton.tsx` (new skeleton component)
- `src/app/[locale]/[tenant]/hosts/terminals/_components/client/ClientTerminal.tsx` (new client component)
- `src/app/[locale]/[tenant]/hosts/_components/client/ClientConnectionForm.tsx` (migrated client component)
- `src/app/[locale]/[tenant]/hosts/_components/client/index.ts` (updated exports)

### Phase 6: Final Cleanup (95% → 100%) ✅

**Tasks:**
1. Remove remaining context dependencies from components
2. Update component imports to use client versions
3. Clean up any unused imports
4. Optimize bundle size

**Files Modified:**
- `src/app/[locale]/[tenant]/hosts/_components/ConnectHostDialog.tsx` (updated to use ClientConnectionForm)
- `src/app/[locale]/[tenant]/deployment/_components/client/DeploymentActions.tsx` (updated to use DeploymentWizardContainer)
- `src/app/[locale]/[tenant]/deployment/_components/client/ClientDeploymentRunAction.tsx` (new client component)
- `src/app/[locale]/[tenant]/deployment/_components/client/ClientDeploymentDetails.tsx` (new client component)
- `src/app/[locale]/[tenant]/deployment/_components/client/index.ts` (added exports)
- `src/app/[locale]/[tenant]/deployment/_components/index.ts` (removed deprecated exports)
- `src/app/[locale]/[tenant]/hosts/_components/index.ts` (removed deprecated exports)
- `src/app/[locale]/[tenant]/deployment/_components/DeploymentActions.tsx` (updated to use ClientDeploymentRunAction and server actions)
- `src/app/[locale]/[tenant]/repositories/_components/EnhancedRepositoryCard.tsx` (updated to use server actions instead of context)
- `src/app/[locale]/[tenant]/repositories/_components/EnhancedConnectRepositoryDialog.tsx` (updated to use server actions instead of context)

**Files Deleted:**
- `src/app/[locale]/[tenant]/hosts/_components/ConnectionForm.tsx` (obsolete context-based component)
- `src/app/[locale]/[tenant]/hosts/_components/HostList.tsx` (obsolete context-based component)
- `src/app/[locale]/[tenant]/deployment/_components/DeploymentRunAction.tsx` (obsolete context-based component)
- `src/app/[locale]/[tenant]/deployment/_components/DeploymentDetails.tsx` (obsolete context-based component)
- `src/app/[locale]/[tenant]/deployment/_components/DeploymentWizard.tsx` (obsolete context-based component)
- `src/app/[locale]/[tenant]/deployment/_components/DeploymentWizardStep5.tsx` (obsolete context-based component)

**Performance Checks:**
- Ensure all dynamic content is properly wrapped in Suspense
- Add appropriate cache durations for all fetched data
- Verify that Error Boundaries are capturing errors correctly

**Cleanup Tasks:**
- Simplified `src/context/index.ts` to only export what's needed
- Updated app layout to remove AppContext and use direct provider imports
- Deleted obsolete context files:
  - `src/context/AppContext.tsx`
  - `src/context/CICDContext.tsx`
  - `src/context/DeploymentContext.tsx`
  - `src/context/HostContext.tsx`
  - `src/context/RepositoryContext.tsx`
- Deleted obsolete hook files:
  - `src/hooks/useCICDData.ts`
  - `src/hooks/useDeploymentData.ts`
  - `src/hooks/useHostData.ts`
  - `src/hooks/useRepositoryData.ts`
- Deleted obsolete action files:
  - `src/app/[locale]/[tenant]/deployment/actions.ts`
  - `src/app/[locale]/[tenant]/hosts/actions.ts`
  - `src/app/[locale]/[tenant]/repositories/actions.ts`
  - `src/app/[locale]/[tenant]/cicd/actions.ts`
- Removed deprecated component imports
- Documented migration completion

**Status:** Complete

## Migration Complete!

### Summary of Changes

We have successfully migrated our application from a client-side Context API architecture to React Server Components (RSC). Here's a summary of the key changes we made:

1. **Server Actions Creation**:
   - Created centralized server actions in `/src/app/actions/` directory
   - Implemented proper cache invalidation with `revalidatePath`
   - Added robust error handling and type safety

2. **Server Components Implementation**:
   - Converted all key module pages to server components
   - Added Suspense boundaries for streaming
   - Created skeleton components for loading states
   - Set up error handling with Error Boundaries

3. **Client/Server Split**:
   - Created clear boundaries between server and client components
   - Moved interactive elements to client components
   - Used `useTransition` and `useOptimistic` for smooth UI updates

4. **Context System Simplification**:
   - Removed data-fetching contexts (Repository, Deployment, CICD, Host)
   - Kept only essential contexts for app-wide state (User, Sidebar, Theme)
   - Simplified the context API exports

### Migration Summary of Final Server Actions

We have migrated all feature-specific context-based data fetch logic to centralized server actions:

1. **Centralized Server Actions**:
   - `/src/app/actions/repositories.ts` - Replaces RepositoryContext
   - `/src/app/actions/deployments.ts` - Replaces DeploymentContext
   - `/src/app/actions/hosts.ts` - Replaces HostContext
   - `/src/app/actions/cicd.ts` - Replaces CICDContext
   - `/src/app/actions/terminals.ts` - New for terminal operations
   - `/src/app/actions/deploymentWizard.ts` - New for deployment wizard operations
   - `/src/app/actions/dashboard.ts` - New for dashboard operations

2. **Remaining Context Providers**:
   - `UserContext` - Essential for user authentication state
   - `ThemeContext` - Manages theme preferences
   - `SidebarContext` - Controls sidebar state
   - `SearchContext` - Manages search functionality
   - `FontContext` - Handles font preferences

### Best Practices Moving Forward

When working with this codebase, please follow these best practices:

1. **Data Fetching**:
   - For data fetching, use server components and server actions directly
   - Create new server actions in `/src/app/actions/` directory when needed
   - Use `revalidatePath` to invalidate cached data after mutations

2. **Component Architecture**:
   - Start with server components by default
   - Only add 'use client' directive when necessary for interactivity
   - Place client components in `/client/` subdirectories
   - Create skeleton components for loading states
   - Use Error Boundaries for graceful error handling

3. **State Management**:
   - Use React Server Component patterns for most data fetching
   - Use React hooks (`useState`, `useReducer`) for local state
   - Only use context for truly global state (user, theme, sidebar)
   - Consider `useOptimistic` for optimistic UI updates

4. **Performance Optimization**:
   - Use Suspense for streaming and progressive rendering
   - Add appropriate cache durations for fetched data
   - Keep client JavaScript bundle size small
   - Prefer server-side data fetching whenever possible

## Advanced RSC Features

### Suspense and Streaming

Suspense lets us declaratively "wait" for data and show a fallback UI while components load. With RSC, this enables streaming HTML from the server.

**Best Practices:**
- Use Suspense boundaries at logical UI chunks
- Create skeleton components that match the final UI
- Wrap dynamic data-dependent components, not static UI

### Error Boundaries

Error Boundaries catch JavaScript errors in components and display fallback UI instead of crashing.

**Best Practices:**
- Place Error Boundaries around data-fetching components
- Create specific error states for different components
- Provide reset functionality when possible

### useTransition for Non-blocking Updates

`useTransition` helps keep the UI responsive during state updates by marking updates as non-urgent.

**Best Practices:**
- Use for data refreshes and mutations
- Provide visual feedback during pending transitions

### Caching and Revalidation

Next.js provides built-in caching with fetch and revalidation capabilities.

**Best Practices:**
- Set appropriate cache durations based on data volatility
- Use `revalidatePath` after mutations