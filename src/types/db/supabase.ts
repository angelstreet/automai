/**
 * Supabase database types
 * NOTE: This file typically contains auto-generated types from the database schema
 * Only showing a simplified version here for reference
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

/**
 * Database schema types
 */
export type Database = {
  public: {
    Tables: {
      accounts: {
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
      };
      git_providers: {
        Row: {
          access_token: string | null;
          created_at: string | null;
          display_name: string | null;
          expires_at: string | null;
          id: string;
          is_configured: boolean | null;
          last_synced: string | null;
          name: string;
          profile_id: string;
          refresh_token: string | null;
          server_url: string | null;
          type: string;
          updated_at: string | null;
        };
        Insert: {
          access_token?: string | null;
          created_at?: string | null;
          display_name?: string | null;
          expires_at?: string | null;
          id?: string;
          is_configured?: boolean | null;
          last_synced?: string | null;
          name: string;
          profile_id: string;
          refresh_token?: string | null;
          server_url?: string | null;
          type: string;
          updated_at?: string | null;
        };
        Update: {
          access_token?: string | null;
          created_at?: string | null;
          display_name?: string | null;
          expires_at?: string | null;
          id?: string;
          is_configured?: boolean | null;
          last_synced?: string | null;
          name?: string;
          profile_id?: string;
          refresh_token?: string | null;
          server_url?: string | null;
          type?: string;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      hosts: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          ip: string;
          is_windows: boolean;
          name: string;
          password: string | null;
          port: number | null;
          status: string;
          type: string;
          updated_at: string;
          user: string | null;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          ip: string;
          is_windows?: boolean;
          name: string;
          password?: string | null;
          port?: number | null;
          status?: string;
          type: string;
          updated_at?: string;
          user?: string | null;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          ip?: string;
          is_windows?: boolean;
          name?: string;
          password?: string | null;
          port?: number | null;
          status?: string;
          type?: string;
          updated_at?: string;
          user?: string | null;
        };
        Relationships: [];
      };
      // Other tables would be included here...
    };
    // Views and functions would be defined here...
  };
};
