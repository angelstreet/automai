/**
 * Auth database table definitions
 * Aligned with Supabase auth schema
 */
import { BaseRow, Json } from './db-common';

/**
 * Auth users table schema
 * Located in the auth schema
 */
export interface UsersTable {
  Row: {
    id: string;
    email: string | null;
    phone: string | null;
    encrypted_password: string;
    email_confirmed_at: string | null;
    phone_confirmed_at: string | null;
    confirmed_at: string | null;
    last_sign_in_at: string | null;
    role: string;
    user_role: string;
    raw_app_meta_data: Json;
    raw_user_meta_data: Json;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    email?: string | null;
    phone?: string | null;
    encrypted_password: string;
    email_confirmed_at?: string | null;
    phone_confirmed_at?: string | null;
    confirmed_at?: string | null;
    last_sign_in_at?: string | null;
    role?: string;
    user_role?: string;
    raw_app_meta_data?: Json;
    raw_user_meta_data?: Json;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    email?: string | null;
    phone?: string | null;
    encrypted_password?: string;
    email_confirmed_at?: string | null;
    phone_confirmed_at?: string | null;
    confirmed_at?: string | null;
    last_sign_in_at?: string | null;
    role?: string;
    user_role?: string;
    raw_app_meta_data?: Json;
    raw_user_meta_data?: Json;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [];
}

/**
 * Auth identities table schema
 * Stores identities associated to a user
 */
export interface IdentitiesTable {
  Row: {
    id: string;
    provider_id: string;
    user_id: string;
    identity_data: Json;
    provider: string;
    email: string;
    created_at: string;
    updated_at: string;
  };
  Insert: {
    id?: string;
    provider_id: string;
    user_id: string;
    identity_data: Json;
    provider: string;
    email?: string;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    provider_id?: string;
    user_id?: string;
    identity_data?: Json;
    provider?: string;
    email?: string;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: 'identities_user_id_fkey';
      columns: ['user_id'];
      isOneToOne: false;
      referencedRelation: 'users';
      referencedColumns: ['id'];
    },
  ];
}

/**
 * Auth sessions table schema
 * Stores session data associated to a user
 */
export interface SessionsTable {
  Row: {
    id: string;
    user_id: string;
    created_at: string;
    updated_at: string;
    factor_id: string | null;
    not_after: string | null;
    ip: string | null; // inet in postgres
    user_agent: string | null;
  };
  Insert: {
    id?: string;
    user_id: string;
    created_at?: string;
    updated_at?: string;
    factor_id?: string | null;
    not_after?: string | null;
    ip?: string | null;
    user_agent?: string | null;
  };
  Update: {
    id?: string;
    user_id?: string;
    created_at?: string;
    updated_at?: string;
    factor_id?: string | null;
    not_after?: string | null;
    ip?: string | null;
    user_agent?: string | null;
  };
  Relationships: [
    {
      foreignKeyName: 'sessions_user_id_fkey';
      columns: ['user_id'];
      isOneToOne: false;
      referencedRelation: 'users';
      referencedColumns: ['id'];
    },
  ];
}

/**
 * Auth refresh tokens table schema
 * Store of tokens used to refresh JWT tokens once they expire
 */
export interface RefreshTokensTable {
  Row: {
    id: string;
    token: string;
    user_id: string;
    revoked: boolean;
    created_at: string;
    updated_at: string;
    parent: string | null;
    session_id: string | null;
  };
  Insert: {
    id?: string;
    token: string;
    user_id: string;
    revoked?: boolean;
    created_at?: string;
    updated_at?: string;
    parent?: string | null;
    session_id?: string | null;
  };
  Update: {
    id?: string;
    token?: string;
    user_id?: string;
    revoked?: boolean;
    created_at?: string;
    updated_at?: string;
    parent?: string | null;
    session_id?: string | null;
  };
  Relationships: [
    {
      foreignKeyName: 'refresh_tokens_session_id_fkey';
      columns: ['session_id'];
      isOneToOne: false;
      referencedRelation: 'sessions';
      referencedColumns: ['id'];
    },
  ];
}

/**
 * Profiles table schema - public schema but related to auth
 */
export interface ProfilesTable {
  Row: BaseRow & {
    avatar_url: string | null;
    tenant_id: string;
    role: string;
    tenant_name: string;
  };
  Insert: {
    id: string; // must match auth.users.id
    avatar_url?: string | null;
    tenant_id: string;
    role?: string;
    tenant_name?: string;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    avatar_url?: string | null;
    tenant_id?: string;
    role?: string;
    tenant_name?: string;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: 'profiles_id_fkey';
      columns: ['id'];
      isOneToOne: true;
      referencedRelation: 'users';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'profiles_tenant_id_fkey';
      columns: ['tenant_id'];
      isOneToOne: false;
      referencedRelation: 'tenants';
      referencedColumns: ['id'];
    },
  ];
}
