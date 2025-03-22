/**
 * Types for Git repositories and providers
 */

export type GitProviderType = 'github' | 'gitlab' | 'gitea' | 'self-hosted';

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
  providerType: GitProviderType;
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
  type: 'file' | 'dir';
  size?: string;
  lastModified?: string;
  content?: string;
  children?: Record<string, RepositoryFile>;
  encoding?: string;
}

export interface RepositoryExplorerProps {
  repository: Repository;
  onBack: () => void;
}

export interface FileAPIResponse {
  success: boolean;
  data?: {
    content: string;
    encoding?: string;
  };
  error?: string;
}

export interface FilesAPIResponse {
  success: boolean;
  data?: RepositoryFile[];
  error?: string;
}

export interface ConnectRepositoryValues {
  type?: GitProviderType | 'quick-clone';
  method?: 'oauth' | 'token' | 'url';
  displayName?: string;
  accessToken?: string;
  serverUrl?: string;
  url?: string;
  provider?: string;
  token?: string;
}

export interface CreateGitProviderParams {
  name: string;
  provider_type: string;
  auth_type: 'oauth' | 'token';
  url?: string;
  token?: string;
}

export interface CreateGitProviderResult {
  success: boolean;
  data: any | null;
  error?: string | null;
  authUrl?: string | null;
}

export interface CreateRepositoryParams {
  url: string;
  name: string;
}

export interface CreateRepositoryResult {
  success: boolean;
  data: Repository | null;
  error?: string | null;
}

export interface VerifyRepositoryUrlResult {
  success: boolean;
  data?: {
    name: string;
    [key: string]: any;
  } | null;
  error?: string | null;
}

export interface EnhancedConnectRepositoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (values: ConnectRepositoryValues) => void;
  defaultTab?: string;
}

export interface EnhancedRepositoryCardProps {
  repository: Repository;
  onSync: (id: string) => Promise<void>;
  onDelete?: (id: string) => void;
  isSyncing: boolean;
  isDeleting?: boolean;
  onToggleStarred: (id: string) => void;
  isStarred: boolean;
}