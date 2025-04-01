# Hooks Directory

This directory contains all business logic hooks for the application. Each subdirectory represents a domain area (user, team, etc.).

## Architecture Overview

There are two patterns for state management in our application:

1. **Provider + Hooks Pattern** (for global state):
   - Used for domains requiring global state (User, Team, Sidebar)
   - Provider in `/src/app/providers/` for state storage
   - Hooks in `/src/hooks/` for business logic

2. **Hooks-Only Pattern** (for feature-specific state):
   - Used for most feature domains (Hosts, CICD, Deployments, Repositories)
   - No provider needed - React Query handles caching
   - All business logic in hooks

## Naming Convention

All hook files should follow the naming pattern:
```
hooks/[domain]/use[Domain].ts
```

Examples:
- `hooks/user/useUser.ts`
- `hooks/host/useHost.ts`
- `hooks/cicd/useCICD.ts`

## Usage Guidelines

1. **Components should always import hooks from context**:
   ```tsx
   import { useUser, useHost, useCICD } from '@/context';
   ```

2. **Hooks should use actions for data fetching**:
   ```tsx
   import { getHosts } from '@/app/actions/hostsAction';
   ```

3. **Hooks should contain all business logic**:
   - Data fetching with React Query
   - State management
   - Logic for derived data
   - Mutations (create, update, delete operations)

4. **Hook Implementation Pattern**:
   ```tsx
   'use client';
   
   import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
   import { getHosts, createHost } from '@/app/actions/hostsAction';
   
   export function useHost() {
     const queryClient = useQueryClient();
     
     // Queries
     const { data, isLoading } = useQuery({
       queryKey: ['hosts'],
       queryFn: getHosts
     });
     
     // Mutations
     const createMutation = useMutation({
       mutationFn: createHost,
       onSuccess: () => queryClient.invalidateQueries(['hosts'])
     });
     
     return {
       hosts: data?.data || [],
       isLoading,
       createHost: createMutation.mutateAsync
       // Additional methods...
     };
   }
   ```

## Implemented Hooks

### Basic Hooks
- `useUser`: User authentication and state
- `useTeam`: Team management and selection
- `usePermission`: Permission checking and management
- `useSidebar`: Sidebar state management

### Feature Hooks (Hooks-Only Pattern)
- `useHost`: Host management functions
- `useCICD`: CICD provider management
- `useDeployment`: Deployment operations
- `useDeploymentWizard`: Deployment configuration wizard
- `useRepository`: Repository and git provider management

## Migration Strategy

When migrating components from direct action imports to hooks:
1. Replace action imports with context imports:
   ```diff
   - import { getHosts } from '@/app/actions/hostsAction';
   + import { useHost } from '@/context';
   ```

2. Replace action calls with hook functions:
   ```diff
   - const hostsResult = await getHosts();
   - setHosts(hostsResult.data || []);
   + const { hosts, isLoading } = useHost();
   ```

3. Update component to use React Query's automatic data management.