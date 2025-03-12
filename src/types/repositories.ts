/**
 * Types for Git repositories and providers
 */

export type GitProviderType = 'github' | 'gitlab' | 'gitea';

export type GitProviderStatus = 'connected' | 'disconnected' | 'error';

export type RepositorySyncStatus = 'SYNCED' | 'SYNCING' | 'ERROR' | 'IDLE' | 'PENDING';

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

export interface Repository {
  id: string;
  name: string;
  description?: string;
  url?: string;
  isPrivate: boolean;
  defaultBranch: string;
  language?: string;
  provider: GitProviderType;
  providerId: string;
  owner: string;
  lastSyncedAt?: string;
  syncStatus: RepositorySyncStatus;
  createdAt: string;
  updated_at: string;
  provider?: GitProvider;
}

export interface RepositoryFile {
  name: string;
  path: string;
  type: 'file' | 'folder';
  size?: string;
  lastModified?: string;
  content?: string;
  children?: Record<string, RepositoryFile>;
}

export interface ConnectRepositoryValues {
  type: GitProviderType | 'quick-clone';
  method?: 'oauth' | 'token';
  displayName?: string;
  accessToken?: string;
  serverUrl?: string;
  url?: string;
  runner?: any;
}