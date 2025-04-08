/**
 * Core Repository type definitions
 * Contains all repository-related data models
 */

/**
 * Git provider types
 */
export type GitProviderType = 'github' | 'gitlab' | 'bitbucket' | 'azure' | 'custom';

/**
 * Git provider status
 */
export type GitProviderStatus = 'connected' | 'disconnected' | 'error';

/**
 * Repository sync status
 */
export type RepositorySyncStatus = 'synced' | 'syncing' | 'failed' | 'not_synced';

/**
 * Git provider entity
 */
export interface GitProvider {
  id: string;
  name: string;
  display_name?: string;
  type: GitProviderType;
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  server_url?: string;
  is_configured: boolean;
  last_synced?: string;
  created_at: string;
  updated_at: string;
  profile_id: string;
}

/**
 * Repository file entity
 */
export interface RepositoryFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number;
  content?: string;
  sha?: string;
  url?: string;
  last_commit_message?: string;
  last_commit_date?: string;
}

/**
 * Repository entity
 */
export interface Repository {
  id: string;
  name: string;
  url: string;
  description?: string;
  provider_id: string;
  provider_type?: GitProviderType;
  sync_status: RepositorySyncStatus;
  last_synced?: string;
  default_branch?: string;
  created_at: string;
  updated_at: string;
  visibility?: 'public' | 'private';
  owner?: string;
  clone_url?: string;
  ssh_url?: string;
}

/**
 * Parameters for creating a Git provider
 */
export interface CreateGitProviderParams {
  name: string;
  type: GitProviderType;
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  server_url?: string;
  profile_id: string;
}

/**
 * Parameters for creating a repository
 */
export interface CreateRepositoryParams {
  name: string;
  url: string;
  description?: string;
  provider_id: string;
  default_branch?: string;
  visibility?: 'public' | 'private';
  owner?: string;
  clone_url?: string;
  ssh_url?: string;
}

/**
 * Repository branch entity
 */
export interface RepositoryBranch {
  name: string;
  commit_sha: string;
  protected: boolean;
  default: boolean;
}

/**
 * Repository commit entity
 */
export interface RepositoryCommit {
  sha: string;
  message: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  url?: string;
}
