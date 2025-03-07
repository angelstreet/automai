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
    role?: string;
    tenant_id?: string;
    tenant_name?: string;
    plan?: string;
  };
}
