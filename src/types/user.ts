import { User as SupabaseUser } from '@supabase/supabase-js';

/********************************************
 * USER CORE TYPES
 ********************************************/

export interface User {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  role?: string;
  tenant_id?: string | null;
  tenant_name?: string | null;
  plan?: string;
}

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  user_metadata?: {
    name?: string;
    full_name?: string;
    preferred_username?: string;
    avatar_url?: string;
    tenant_id?: string;
    role?: string;
    raw_user_meta_data?: {
      name?: string;
      full_name?: string;
      preferred_username?: string;
    };
  };
};

// Extend Supabase user with our custom metadata
export interface CustomSupabaseUser extends SupabaseUser {
  user_metadata: {
    name?: string;
    full_name?: string;
    preferred_username?: string;
    avatar_url?: string;
    user_role?: string;
    tenant_id?: string;
    tenant_name?: string;
    plan?: string;
    raw_user_meta_data?: {
      name?: string;
      full_name?: string;
      preferred_username?: string;
    };
  };
}

/********************************************
 * PROFILE TYPES
 ********************************************/

export type ProfileData = {
  name?: string;
  avatar_url?: string;
  locale?: string;
};

/********************************************
 * ROLE TYPES
 ********************************************/

// User role types
export interface UserRole {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface UserRoleFilter {
  userId?: string;
}

// Role type used in RoleContext
export type Role = 'admin' | 'tester' | 'developer' | 'viewer';

// Interface for the UI representation of a role
export interface UIRole {
  id: string;
  name: string;
  icon?: string;
}

// Response types for user role actions
export interface UserRoleResponse {
  success: boolean;
  error?: string;
  data?: UserRole[];
}

export interface SingleUserRoleResponse {
  success: boolean;
  error?: string;
  data?: UserRole;
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