import { User as SupabaseUser } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email?: string | null;
  name?: string | null;
  image?: string | null;
  role?: string;
  tenantId?: string | null;
  tenantName: string | null;
  plan?: string;
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
}

// Extend Supabase user with our custom metadata
export interface CustomSupabaseUser extends SupabaseUser {
  user_metadata: {
    name?: string;
    role?: string;
    tenantId?: string;
    tenantName?: string;
    plan?: string;
  };
}