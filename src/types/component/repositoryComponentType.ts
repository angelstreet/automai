/**
 * Core Repository type definitions
 * Contains the essential repository and git provider data structures
 */

/**
 * Git provider types (GitHub, GitLab, Gitea, etc.)
 */
export type GitProviderType = 'github' | 'gitlab' | 'gitea' | 'self-hosted';

/**
 * Connection status for Git providers
 */
export type GitProviderStatus = 'connected' | 'disconnected' | 'error';

/**
 * Repository synchronization status
 */
export type RepositorySyncStatus = 'SYNCED' | 'SYNCING' | 'ERROR' | 'IDLE' | 'PENDING' | 'FAILED';

/**
 * Git provider entity
 */
export interface GitProvider {
  id: string;
  type: GitProviderType;
  name: GitProviderType | string;
  displayName: string;
  status: GitProviderStatus;
  serverUrl?: string;
  lastSyncedAt?: string;
  repositoryCount?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Repository entity
 */
export interface Repository {
  id: string;
  name: string;
  description?: string;
  url?: string;
  isPrivate: boolean;
  defaultBranch: string;
  language?: string;
  providerType: GitProviderType;
  providerId: string;
  owner: string;
  lastSyncedAt?: string;
  syncStatus: RepositorySyncStatus;
  createdAt: string;
  updated_at: string;
  provider?: GitProvider;
}

/**
 * Repository file entity
 */
export interface RepositoryFile {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: string;
  lastModified?: string;
  content?: string;
  children?: Record<string, RepositoryFile>;
  encoding?: string;
}

/**
 * Parameters for creating a Git provider
 */
export interface CreateGitProviderParams {
  name: string;
  provider_type: string;
  auth_type: 'oauth' | 'token';
  url?: string;
  token?: string;
}

/**
 * Parameters for creating a repository
 */
export interface CreateRepositoryParams {
  url: string;
  name: string;
}