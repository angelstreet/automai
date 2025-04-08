/**
 * Git and repository database table definitions
 */
import { BaseRow } from './db-common';

/**
 * Git providers table schema
 */
export interface GitProvidersTable {
  Row: BaseRow & {
    access_token: string | null;
    display_name: string | null;
    expires_at: string | null;
    is_configured: boolean | null;
    last_synced: string | null;
    name: string;
    profile_id: string;
    refresh_token: string | null;
    server_url: string | null;
    type: string;
  };
  Insert: {
    access_token?: string | null;
    created_at?: string;
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
    updated_at?: string;
  };
  Update: {
    access_token?: string | null;
    created_at?: string;
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
    updated_at?: string;
  };
  Relationships: [];
}

/**
 * Repositories table schema
 */
export interface RepositoriesTable {
  Row: BaseRow & {
    name: string;
    url: string;
    description: string | null;
    provider_id: string;
    sync_status: string;
    last_synced: string | null;
    default_branch: string | null;
    visibility: 'public' | 'private' | null;
    owner: string | null;
    clone_url: string | null;
    ssh_url: string | null;
  };
  Insert: {
    created_at?: string;
    default_branch?: string | null;
    description?: string | null;
    id?: string;
    last_synced?: string | null;
    name: string;
    provider_id: string;
    sync_status?: string;
    updated_at?: string;
    url: string;
    visibility?: 'public' | 'private' | null;
    owner?: string | null;
    clone_url?: string | null;
    ssh_url?: string | null;
  };
  Update: {
    created_at?: string;
    default_branch?: string | null;
    description?: string | null;
    id?: string;
    last_synced?: string | null;
    name?: string;
    provider_id?: string;
    sync_status?: string;
    updated_at?: string;
    url?: string;
    visibility?: 'public' | 'private' | null;
    owner?: string | null;
    clone_url?: string | null;
    ssh_url?: string | null;
  };
  Relationships: [
    {
      foreignKeyName: 'repositories_provider_id_fkey';
      columns: ['provider_id'];
      isOneToOne: false;
      referencedRelation: 'git_providers';
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
    created_at?: string;
    id?: string;
    last_commit_date?: string | null;
    last_commit_message?: string | null;
    name: string;
    path: string;
    repository_id: string;
    sha?: string | null;
    size?: number | null;
    type: string;
    updated_at?: string;
  };
  Update: {
    created_at?: string;
    id?: string;
    last_commit_date?: string | null;
    last_commit_message?: string | null;
    name?: string;
    path?: string;
    repository_id?: string;
    sha?: string | null;
    size?: number | null;
    type?: string;
    updated_at?: string;
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
