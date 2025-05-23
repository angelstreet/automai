/**
 * Core User type definitions
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
 * Tenant type
 */
export interface Tenant {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

/**
 * Auth session
 */
export interface AuthSession {
  user: User;
  accessToken: string;
}

export interface SessionData {
  user: UserSession;
  accessToken: string;
  expires: string;
}

/**
 * Result types
 */
export interface AuthResult<T = any> {
  success: boolean;
  error?: string;
  data?: T;
}

export type OAuthProvider = 'google' | 'github' | 'gitlab';
