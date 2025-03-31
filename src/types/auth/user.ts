/**
 * Core user types for authentication and authorization
 */

/**
 * User role types
 */
export type Role = 'admin' | 'viewer' | 'developer' | 'tester';

/**
 * Interface for the UI representation of a role
 */
export interface UIRole {
  id: string;
  name: string;
  icon?: string;
}

/**
 * Core user type with essential properties
 */
export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  tenant_id: string;
  tenant_name: string;
  avatar_url: string;
  user_metadata?: {
    avatar_url?: string;
    [key: string]: any;
  };
  // Team data directly embedded in user
  teams?: UserTeam[];
  selectedTeamId?: string;
  teamMembers?: TeamMember[];
}

/**
 * Raw auth user data from the authentication provider
 */
export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  tenant_id: string;
  tenant_name: string;
  created_at: string;
  updated_at: string;
  role?: Role;
  user_metadata?: {
    name?: string;
    full_name?: string;
    preferred_username?: string;
    avatar_url?: string;
    role?: Role;
    raw_user_meta_data?: {
      name?: string;
      full_name?: string;
      preferred_username?: string;
    };
  };
  // Team data from the database
  teams?: UserTeam[];
  selectedTeamId?: string;
  teamMembers?: TeamMember[];
};

/**
 * Session user data
 */
export interface UserSession {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  avatar_url?: string | null;
  role?: string;
  tenant_id?: string;
  tenant_name?: string | null;
  created_at?: string;
  updated_at?: string;
  user_metadata?: {
    name?: string;
    full_name?: string;
    preferred_username?: string;
    avatar_url?: string;
    tenant_id?: string;
    tenant_name?: string;
    role?: string;
    [key: string]: any;
  };
}

/**
 * Team related types
 */
export interface UserTeam {
  id: string;
  name: string;
  description?: string;
  tenant_id: string;
  created_by?: string;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
}

/**
 * Team member model
 */
export interface TeamMember {
  team_id: string;
  profile_id: string;
  role: string;
  created_at?: string;
  updated_at?: string;
  profiles?: {
    id: string;
    email?: string;
    avatar_url?: string;
  };
}

/**
 * Resource limit information
 */
export interface ResourceLimit {
  type: string;
  current: number;
  limit: number;
  isUnlimited: boolean;
  canCreate: boolean;
}

/**
 * Utility function to map from auth user to our User type
 */
export const mapAuthUserToUser = (authUser: AuthUser): User => {
  if (!authUser.tenant_id) throw new Error('Missing tenant_id in user data');
  if (!authUser.tenant_name) throw new Error('Missing tenant_name in user data');

  const role = (authUser as any).role || authUser?.user_metadata?.role || 'viewer';
  return {
    id: authUser.id,
    email: authUser.email,
    name: authUser.user_metadata?.name || authUser.email.split('@')[0] || 'Guest',
    role: role as Role,
    tenant_id: authUser.tenant_id,
    tenant_name: authUser.tenant_name,
    avatar_url: authUser.user_metadata?.avatar_url || '',
    user_metadata: authUser.user_metadata,
    teams: authUser.teams || [],
    selectedTeamId: authUser.selectedTeamId,
    teamMembers: authUser.teamMembers || [],
  };
};
