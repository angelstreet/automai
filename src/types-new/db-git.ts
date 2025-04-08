/**
 * Git and repository database table definitions
 * Aligned with Supabase schema
 */
import { BaseRow } from './db-common';

/**
 * Git providers table schema
 */
export interface GitProvidersTable {
  Row: BaseRow & {
    profile_id: string;
    type: string; 
    name: string;
    display_name: string | null;
    server_url: string | null;
    access_token: string | null;
    refresh_token: string | null;
    expires_at: string | null;
    is_configured: boolean | null;
    last_synced: string | null;
    team_id: string;
    tenant_id: string;
  };
  Insert: {
    id?: string;
    created_at?: string;
    updated_at?: string;
    profile_id: string;
    type: string;
    name: string;
    display_name?: string | null;
    server_url?: string | null;
    access_token?: string | null;
    refresh_token?: string | null;
    expires_at?: string | null;
    is_configured?: boolean | null;
    last_synced?: string | null;
    team_id: string;
    tenant_id: string;
  };
  Update: {
    id?: string;
    created_at?: string;
    updated_at?: string;
    profile_id?: string;
    type?: string;
    name?: string;
    display_name?: string | null;
    server_url?: string | null;
    access_token?: string | null;
    refresh_token?: string | null;
    expires_at?: string | null;
    is_configured?: boolean | null;
    last_synced?: string | null;
    team_id?: string;
    tenant_id?: string;
  };
  Relationships: [
    {
      foreignKeyName: 'git_providers_profile_id_fkey';
      columns: ['profile_id'];
      isOneToOne: false;
      referencedRelation: 'profiles';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'git_providers_team_id_fkey';
      columns: ['team_id'];
      isOneToOne: false;
      referencedRelation: 'teams';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'git_providers_tenant_id_fkey';
      columns: ['tenant_id'];
      isOneToOne: false;
      referencedRelation: 'tenants';
      referencedColumns: ['id'];
    }
  ];
}

/**
 * Repositories table schema
 */
export interface RepositoriesTable {
  Row: BaseRow & {
    provider_id: string;
    external_id: string;
    name: string;
    full_name: string;
    html_url: string;
    description: string | null;
    private: boolean;
    visibility: string | null;
    default_branch: string;
    fork: boolean;
    archived: boolean;
    last_synced: string | null;
    team_id: string;
    tenant_id: string;
    profile_id: string;
  };
  Insert: {
    id?: string;
    created_at?: string;
    updated_at?: string;
    provider_id: string;
    external_id: string;
    name: string;
    full_name: string;
    html_url: string;
    description?: string | null;
    private: boolean;
    visibility?: string | null;
    default_branch: string;
    fork?: boolean;
    archived?: boolean;
    last_synced?: string | null;
    team_id: string;
    tenant_id: string;
    profile_id: string;
  };
  Update: {
    id?: string;
    created_at?: string;
    updated_at?: string;
    provider_id?: string;
    external_id?: string;
    name?: string;
    full_name?: string;
    html_url?: string;
    description?: string | null;
    private?: boolean;
    visibility?: string | null;
    default_branch?: string;
    fork?: boolean;
    archived?: boolean;
    last_synced?: string | null;
    team_id?: string;
    tenant_id?: string;
    profile_id?: string;
  };
  Relationships: [
    {
      foreignKeyName: 'repositories_provider_id_fkey';
      columns: ['provider_id'];
      isOneToOne: false;
      referencedRelation: 'git_providers';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'repositories_profile_id_fkey';
      columns: ['profile_id'];
      isOneToOne: false;
      referencedRelation: 'profiles';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'repositories_team_id_fkey';
      columns: ['team_id'];
      isOneToOne: false;
      referencedRelation: 'teams';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'repositories_tenant_id_fkey';
      columns: ['tenant_id'];
      isOneToOne: false;
      referencedRelation: 'tenants';
      referencedColumns: ['id'];
    }
  ];
}

/**
 * Repository files table schema
 * Used for caching file metadata from repositories
 */
export interface RepositoryFilesTable {
  Row: BaseRow & {
    repository_id: string;
    path: string;
    name: string;
    type: string;
    size: number | null;
    sha: string | null;
    last_commit_date: string | null;
    last_commit_message: string | null;
  };
  Insert: {
    id?: string;
    created_at?: string;
    updated_at?: string;
    repository_id: string;
    path: string;
    name: string;
    type: string;
    size?: number | null;
    sha?: string | null;
    last_commit_date?: string | null;
    last_commit_message?: string | null;
  };
  Update: {
    id?: string;
    created_at?: string;
    updated_at?: string;
    repository_id?: string;
    path?: string;
    name?: string;
    type?: string;
    size?: number | null;
    sha?: string | null;
    last_commit_date?: string | null;
    last_commit_message?: string | null;
  };
  Relationships: [
    {
      foreignKeyName: 'repository_files_repository_id_fkey';
      columns: ['repository_id'];
      isOneToOne: false;
      referencedRelation: 'repositories';
      referencedColumns: ['id'];
    }
  ];
}

/**
 * Profile repository pins table schema
 */
export interface ProfileRepositoryPinsTable {
  Row: {
    profile_id: string;
    repository_id: string;
    created_at: string;
  };
  Insert: {
    profile_id: string;
    repository_id: string;
    created_at?: string;
  };
  Update: {
    profile_id?: string;
    repository_id?: string;
    created_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: 'profile_repository_pins_profile_id_fkey';
      columns: ['profile_id'];
      isOneToOne: false;
      referencedRelation: 'profiles';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'profile_repository_pins_repository_id_fkey';
      columns: ['repository_id'];
      isOneToOne: false;
      referencedRelation: 'repositories';
      referencedColumns: ['id'];
    }
  ];
}
