import { z } from 'zod';

export type GitProviderType = 'github' | 'gitlab' | 'gitea';

export type GitProviderStatus = 'connected' | 'disconnected' | 'error';

export type SyncStatus = 'IDLE' | 'SYNCING' | 'ERROR' | 'SYNCED';

export interface GitProvider {
  id: string;
  userId: string;
  tenantId: string;
  type: GitProviderType;
  displayName: string;
  status: 'connected' | 'disconnected';
  serverUrl?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt?: Date;
}

export interface Repository {
  id: string;
  providerId: string;
  name: string;
  owner: string;
  url?: string;
  branch?: string;
  defaultBranch?: string;
  isPrivate: boolean;
  description?: string;
  syncStatus: 'SYNCED' | 'PENDING' | 'ERROR';
  createdAt: Date;
  updatedAt: Date;
  lastSyncedAt?: Date;
  error?: string;
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
  type: GitProviderType;
  displayName: string;
  serverUrl?: string;
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

export const GitProviderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  tenantId: z.string(),
  type: z.enum(['github', 'gitlab', 'gitea']),
  displayName: z.string(),
  status: z.enum(['connected', 'disconnected']),
  serverUrl: z.string().optional(),
  accessToken: z.string().optional(),
  refreshToken: z.string().optional(),
  expiresAt: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastSyncedAt: z.date().optional(),
});

export const RepositorySchema = z.object({
  id: z.string(),
  providerId: z.string(),
  name: z.string(),
  owner: z.string(),
  url: z.string().optional(),
  branch: z.string().optional(),
  isPrivate: z.boolean(),
  description: z.string().optional(),
  syncStatus: z.enum(['SYNCED', 'PENDING', 'ERROR']),
  createdAt: z.date(),
  updatedAt: z.date(),
  lastSyncedAt: z.date().optional(),
  error: z.string().optional(),
});
