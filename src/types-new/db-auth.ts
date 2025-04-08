/**
 * Auth database table definitions
 */
import { BaseRow, Json } from './db-common';

/**
 * Accounts table schema
 */
export interface AccountsTable {
  Row: {
    access_token: string | null;
    expires_at: number | null;
    id: string;
    id_token: string | null;
    provider: string;
    providerAccountId: string;
    refresh_token: string | null;
    scope: string | null;
    session_state: string | null;
    token_type: string | null;
    type: string;
    userId: string;
  };
  Insert: {
    access_token?: string | null;
    expires_at?: number | null;
    id?: string;
    id_token?: string | null;
    provider: string;
    providerAccountId: string;
    refresh_token?: string | null;
    scope?: string | null;
    session_state?: string | null;
    token_type?: string | null;
    type: string;
    userId: string;
  };
  Update: {
    access_token?: string | null;
    expires_at?: number | null;
    id?: string;
    id_token?: string | null;
    provider?: string;
    providerAccountId?: string;
    refresh_token?: string | null;
    scope?: string | null;
    session_state?: string | null;
    token_type?: string | null;
    type?: string;
    userId?: string;
  };
  Relationships: [
    {
      foreignKeyName: 'accounts_userId_fkey';
      columns: ['userId'];
      isOneToOne: false;
      referencedRelation: 'users';
      referencedColumns: ['id'];
    },
  ];
}

/**
 * Users table schema
 */
export interface UsersTable {
  Row: BaseRow & {
    email: string;
    emailVerified: string | null;
    image: string | null;
    name: string | null;
    role: string;
  };
  Insert: {
    created_at?: string;
    email: string;
    emailVerified?: string | null;
    id?: string;
    image?: string | null;
    name?: string | null;
    role?: string;
    updated_at?: string;
  };
  Update: {
    created_at?: string;
    email?: string;
    emailVerified?: string | null;
    id?: string;
    image?: string | null;
    name?: string | null;
    role?: string;
    updated_at?: string;
  };
  Relationships: [];
}

/**
 * Sessions table schema
 */
export interface SessionsTable {
  Row: {
    expires: string;
    id: string;
    sessionToken: string;
    userId: string;
  };
  Insert: {
    expires: string;
    id?: string;
    sessionToken: string;
    userId: string;
  };
  Update: {
    expires?: string;
    id?: string;
    sessionToken?: string;
    userId?: string;
  };
  Relationships: [
    {
      foreignKeyName: 'sessions_userId_fkey';
      columns: ['userId'];
      isOneToOne: false;
      referencedRelation: 'users';
      referencedColumns: ['id'];
    },
  ];
}
