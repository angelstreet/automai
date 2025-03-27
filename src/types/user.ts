import { User as SupabaseUser } from '@supabase/supabase-js';

/********************************************
 * USER CORE TYPES
 ********************************************/

// Team related types defined directly in user.ts
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

export interface ResourceLimit {
  type: string;
  current: number;
  limit: number;
  isUnlimited: boolean;
  canCreate: boolean;
}

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

// Role type used in RoleContext
export type Role = 'admin' | 'viewer' | 'developer' | 'tester';

// Interface for the UI representation of a role
export interface UIRole {
  id: string;
  name: string;
  icon?: string;
}

/********************************************
 * TENANT TYPES
 ********************************************/

// Tenant type
export interface Tenant {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

/********************************************
 * SESSION TYPES
 ********************************************/

export interface AuthSession {
  user: User;
  accessToken: string;
}

// Types for Supabase auth module
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

export interface SessionData {
  user: UserSession;
  accessToken: string;
  expires: string;
}

/********************************************
 * RESULT TYPES
 ********************************************/

export interface AuthResult<T = any> {
  success: boolean;
  error?: string;
  data?: T;
}

export type OAuthProvider = 'google' | 'github' | 'gitlab';
