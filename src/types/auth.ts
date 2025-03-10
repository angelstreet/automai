import { User as SupabaseUser } from '@supabase/supabase-js';

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

export interface AuthSession {
  user: User;
  accessToken: string;
}

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

// Types for Supabase auth module
export interface UserSession {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  role?: string;
  tenant_id?: string;
  tenant_name?: string | null;
}

export interface SessionData {
  user: UserSession;
  accessToken: string;
  expires: string;
}

export interface AuthResult<T = any> {
  success: boolean;
  error?: string;
  data?: T;
}

export type OAuthProvider = 'google' | 'github' | 'gitlab';
