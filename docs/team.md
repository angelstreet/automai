# Team and Permission System

## Overview

The AutomAI platform uses a flexible team-based permission system that supports multiple subscription tiers while providing granular access control across all resources. This document outlines the architecture, use cases, and implementation approach for the permission system.

## System Architecture

### Data Model

```
┌───────────────────┐     ┌───────────────────┐     ┌───────────────────┐
│      Profile      │     │       Team        │     │   Resource Types  │
├───────────────────┤     ├───────────────────┤     ├───────────────────┤
│ id                │     │ id                │     │ hosts             │
│ user_id           │     │ name              │     │ repositories      │
│ tenant_id         │     │ subscription_tier │     │ deployments       │
│ role              │     │ organization_id   │     │ cicd_providers    │
└─────────┬─────────┘     └────────┬──────────┘     │ cicd_jobs         │
          │                        │                 └───────────────────┘
          │                        │
          │         ┌──────────────┴───────────────┐
          │         │        Team Member           │
          └─────────┼───────────────────────────────┐
                    │ id                           │
                    │ team_id                      │
                    │ profile_id                   │
                    │ role                         │
                    └───────────────────────────────┘
                             │
                             │
                    ┌────────┴──────────┐
                    │ Permission Matrix │
                    ├───────────────────┤
                    │ team_id           │
                    │ profile_id        │
                    │ resource_type     │
                    │ can_select        │
                    │ can_insert        │
                    │ can_update        │
                    │ can_delete        │
                    └───────────────────┘
```

### Resource Ownership

```
┌───────────────────┐
│     Resources     │
├───────────────────┤
│ id                │
│ team_id           │ ────► Determines which team owns this resource
│ creator_id        │ ────► Links back to the user who created it
│ [resource fields] │
└───────────────────┘
```

### Access Flow

```
┌─────────┐          ┌──────────────┐          ┌───────────────┐
│  User   │          │ Team Members │          │  Permission   │
│ Request │────────► │    Table     │────────► │    Matrix     │
└─────────┘          └──────────────┘          └───────┬───────┘
                                                       │
                                                       ▼
┌─────────┐          ┌──────────────┐          ┌───────────────┐
│ Filtered│          │ Row-Level    │          │  Resources    │
│ Results │◄──────── │  Security    │◄──────── │    Tables     │
└─────────┘          └──────────────┘          └───────────────┘
```

## Subscription Tiers

### Trial Tier

- Single user model
- No explicit teams
- Resources linked directly to profile
- Limited resource counts

### Pro Tier

- Single team with multiple members
- Team-based resource sharing
- Role-based permissions within team
- Moderate resource limits

### Enterprise Tier

- Multiple teams per organization
- Cross-team membership for users
- Granular permissions per resource type
- Organization-wide resource sharing options
- Custom resource limits

## Use Cases

### Trial User Scenario

- **User**: Alice (Trial)
- **Access Pattern**: Only sees resources she creates
- **Example Flow**: Alice creates a host → host is linked to her profile → only Alice can see it

### Pro Team Scenario

- **Team**: DevTeam (Pro)
- **Members**: Bob (Admin), Carol (Developer), Dave (Viewer)
- **Resources**: Shared across team with role-based access
- **Example Flow**:
  - Bob creates a CICD provider → provider has team_id = DevTeam
  - Carol can see and update the provider but not delete it
  - Dave can only view the provider

### Enterprise Multi-Team Scenario

- **Organization**: Acme Corp
- **Teams**: Frontend Team, Backend Team, DevOps Team
- **Member Example**: Eve (in Frontend and DevOps teams)
- **Resource Access**: Eve sees resources from both teams
- **Context Switching**: Eve can switch active team context for creating new resources
- **Cross-team Access**: Some resources can be shared across teams (subject to permissions)

### Cross-Tier Membership

- **User**: Frank
- **Memberships**: Personal Pro team + Contractor in Enterprise teams
- **Access Pattern**: Can switch context between all teams
- **Resource Isolation**: Resources remain isolated by team_id
- **Permission Consistency**: Same permission model applies across tiers

## Permission Model

### Basic Roles

- **Admin**: Full access to team resources (SELECT, INSERT, UPDATE, DELETE)
- **Developer**: Create and modify resources (SELECT, INSERT, UPDATE)
- **Viewer**: Read-only access (SELECT)

### Granular Permissions

- Per-resource type permissions
- Specific database operations (SELECT, INSERT, UPDATE, DELETE)
- Customizable per team member
- Inherited from roles with override capability

## Implementation Details

### Row-Level Security (RLS)

- Database-enforced access control
- Automatic filtering of queries based on team membership
- Prevents unauthorized data access at database level
- Operation-specific policies (SELECT, INSERT, UPDATE, DELETE)

### Permission Resolution Process

1. User makes request → profile_id extracted from authentication
2. System finds all teams user belongs to
3. For each resource type, permissions are determined from matrix
4. RLS policies filter resources based on team membership and permissions
5. Only authorized resources are returned

### Team Context Management

- Users with multiple teams have active team context
- UI provides team selector for context switching
- New resources are created in active team context
- Resource listings show resources from all accessible teams (can be filtered)

## Security Considerations

- All access controlled at database level through RLS
- Server actions provide second layer of permission verification
- Client UI adapts to user permissions
- Cross-team access strictly controlled
- No permission elevation across teams

## Implementation Roadmap

1. Core database schema implementation
2. RLS policy configuration
3. Server action permission checks
4. Team context provider
5. UI components for team management
6. Resource permission visualization
7. Team switching functionality
