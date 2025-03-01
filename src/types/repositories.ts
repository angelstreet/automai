export type GitProviderType = 'github' | 'gitlab' | 'gitea';

export type GitProviderStatus = 'connected' | 'disconnected' | 'error';

export type SyncStatus = 'IDLE' | 'SYNCING' | 'ERROR' | 'SYNCED';

export interface GitProvider {
  id: string;
  name: GitProviderType;
  displayName: string;
  userId: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  status?: GitProviderStatus;
}

export interface Repository {
  id: string;
  name: string;
  description?: string;
  url: string;
  defaultBranch: string;
  providerId: string;
  provider?: GitProvider;
  projectId?: string;
  project?: {
    id: string;
    name: string;
  };
  lastSyncedAt?: Date;
  syncStatus: SyncStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface RepositoryCreateInput {
  name: string;
  description?: string;
  url: string;
  defaultBranch?: string;
  providerId: string;
  projectId?: string;
}

export interface RepositoryUpdateInput {
  name?: string;
  description?: string;
  defaultBranch?: string;
  projectId?: string;
}

export interface GitProviderCreateInput {
  name: GitProviderType;
  displayName: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface GitProviderUpdateInput {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
}

export interface OAuthState {
  provider: GitProviderType;
  redirectUrl: string;
} 