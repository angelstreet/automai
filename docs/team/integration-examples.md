# Team Feature Integration Examples

This document provides examples of how to integrate the team feature with existing features in the AutomAI application. These examples demonstrate the implementation of team-based access control and resource limitation checking without modifying the UI aspects or layout.

## Database Layer Integration

The database layer integration adds team-related functionality to existing resources:

1. Host-Team Integration (`/src/lib/supabase/db-hosts/host-team-integration.ts`)
2. Repository-Team Integration (`/src/lib/supabase/db-repositories/repository-team-integration.ts`)
3. Deployment-Team Integration (`/src/lib/supabase/db-deployment/deployment-team-integration.ts`)
4. CICD-Team Integration (`/src/lib/supabase/db-cicd/cicd-team-integration.ts`)

Each integration module provides:
- Fetching resources by team
- Creating resources with team association
- Updating resource team association

## Server Actions Integration

Server actions handle business logic and resource limit validation:

1. Host-Team Actions (`/src/app/actions/hosts-team.ts`)
2. Repository-Team Actions (`/src/app/actions/repositories-team.ts`)
3. Deployment-Team Actions (`/src/app/actions/deployments-team.ts`)
4. CICD-Team Actions (`/src/app/actions/cicd-team.ts`)

Each action module:
- Checks resource limits before creation
- Associates resources with teams
- Handles team-based filtering

## Client-Side Hooks

Client-side hooks provide easy access to team-integrated functionality:

1. Host-Team Hook (`/src/hooks/useHostTeamIntegration.ts`)
2. Repository-Team Hook (`/src/hooks/useRepositoryTeamIntegration.ts`)
3. Deployment-Team Hook (`/src/hooks/useDeploymentTeamIntegration.ts`)
4. CICD-Team Hook (`/src/hooks/useCICDTeamIntegration.ts`)

These hooks:
- Check resource limits with notifications
- Handle errors with toast notifications
- Require team selection before operations

## Usage Examples

### Fetching Resources by Team

```typescript
// Using the host integration hook
const { fetchTeamHosts } = useHostTeamIntegration();

useEffect(() => {
  async function loadTeamHosts() {
    const hosts = await fetchTeamHosts();
    if (hosts) {
      // Update state with team hosts
    }
  }
  
  loadTeamHosts();
}, [fetchTeamHosts]);
```

### Creating Resources with Team Association

```typescript
// Using the repository integration hook
const { createTeamRepository } = useRepositoryTeamIntegration();

const handleCreateRepository = async (repoData) => {
  const newRepo = await createTeamRepository(repoData);
  if (newRepo) {
    // Handle successful creation
  }
};
```

### Moving Resources Between Teams

```typescript
// Using the host integration hook
const { moveHostToTeam } = useHostTeamIntegration();

const handleMoveHost = async (hostId, targetTeamId) => {
  const updatedHost = await moveHostToTeam(hostId, targetTeamId);
  if (updatedHost) {
    // Handle successful move
  }
};
```

## Applying to More Features

The same pattern can be applied to other resources:

1. Create a DB integration module
2. Create server actions
3. Create a client-side hook
4. Use the hook in components (without modifying UI aspects)

This approach ensures consistent team-based access control and resource limitation while maintaining the existing UI.