/**
 * Core Team type definitions
 * Contains all team-related data models
 */

import { Role, User } from './user-types';

/**
 * Team entity
 */
export interface Team {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  tenant_id: string;
  member_count?: number;
}

/**
 * Team with members
 */
export interface TeamWithMembers extends Team {
  members: TeamMember[];
}

/**
 * Team member entity
 */
export interface TeamMember {
  id: string;
  user_id: string;
  team_id: string;
  role: Role;
  created_at: string;
  updated_at: string;
  user?: User;
}

/**
 * Team invitation
 */
export interface TeamInvitation {
  id: string;
  team_id: string;
  email: string;
  role: Role;
  token: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
}

/**
 * Team creation input
 */
export interface CreateTeamInput {
  name: string;
  description?: string;
  tenant_id: string;
  members?: {
    user_id: string;
    role: Role;
  }[];
}

/**
 * Team update input
 */
export interface UpdateTeamInput {
  name?: string;
  description?: string;
}

/**
 * Team member creation input
 */
export interface AddTeamMemberInput {
  user_id: string;
  team_id: string;
  role: Role;
}

/**
 * Team member update input
 */
export interface UpdateTeamMemberInput {
  role: Role;
}

/**
 * Team permission
 */
export interface TeamPermission {
  id: string;
  team_id: string;
  resource_type: string;
  resource_id: string;
  action: string;
  created_at: string;
  updated_at: string;
}

/**
 * Team resource
 */
export interface TeamResource {
  id: string;
  team_id: string;
  type: 'repository' | 'host' | 'deployment' | 'cicd';
  resource_id: string;
  created_at: string;
  updated_at: string;
  name?: string;
}
