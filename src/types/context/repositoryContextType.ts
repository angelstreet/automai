import { z } from 'zod';

import {
  Repository,
  GitProvider,
  RepositoryFile,
  GitProviderType,
} from '../component/repositoryComponentType';
import { AuthUser } from '../service/userServiceType';

/**
 * Repository data interface - contains all state
 */
export interface RepositoryData {
  repositories: Repository[];
  gitProviders: GitProvider[];
  selectedRepository: Repository | null;
  loading: boolean;
  error: string | null;
  currentUser: AuthUser | null;
  starredRepositories: Repository[];
  providers: GitProvider[];
  user: AuthUser | null;
}

/**
 * Repository actions interface - contains all functions
 */
export interface RepositoryActions {
  fetchRepositories: () => Promise<Repository[]>;
  fetchRepository: (id: string) => Promise<Repository | null>;
  fetchGitProviders: () => Promise<GitProvider[]>;
  fetchGitProvider: (id: string) => Promise<GitProvider | null>;
  createRepositoryAction: (data: Partial<Repository>) => Promise<{
    success: boolean;
    error?: string;
    data?: Repository;
  }>;
  updateRepositoryAction: (
    id: string,
    updates: Partial<Repository>,
  ) => Promise<{
    success: boolean;
    error?: string;
    data?: Repository;
  }>;
  deleteRepositoryAction: (id: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
  setSelectedRepository: (repository: Repository | null) => void;
  fetchUserData: () => Promise<AuthUser | null>;
  starRepository: (repository: Repository) => void;
  unstarRepository: (repository: Repository) => void;
  deleteRepository: (id: string) => void;
  createRepository: (data: any) => Promise<any>;
}

/**
 * Combined repository context type
 */
export interface RepositoryContextType extends RepositoryData, RepositoryActions {}

/**
 * Cache keys for different repository entities
 */
export const REPOSITORY_CACHE_KEYS = {
  REPOSITORIES: 'repositories',
  REPOSITORY: (id: string) => `repository-${id}`,
  GIT_PROVIDERS: 'git-providers',
  GIT_PROVIDER: (id: string) => `git-provider-${id}`,
};

/**
 * API response types
 */
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

/**
 * UI-specific types
 */
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

export interface CreateGitProviderResult {
  success: boolean;
  data: any | null;
  error?: string | null;
  authUrl?: string | null;
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
  isDeleting?: boolean;
  onDelete?: (id: string) => void;
  onClick?: () => void;
}

export interface RepositoryExplorerProps {
  repository: Repository;
  onBack: () => void;
}

// Schema definitions for validation

/**
 * Schema for testing a connection to a git provider
 */
export const testConnectionSchema = z.object({
  type: z.enum(['github', 'gitlab', 'gitea', 'self-hosted'] as const, {
    required_error: 'Provider type is required',
  }),
  serverUrl: z.string().url('Invalid URL').optional(),
  token: z.string({
    required_error: 'Access token is required',
  }),
});

export type TestConnectionInput = z.infer<typeof testConnectionSchema>;

/**
 * Schema for creating a git provider
 */
export const gitProviderCreateSchema = z.object({
  type: z.enum(['github', 'gitlab', 'gitea', 'self-hosted']),
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  serverUrl: z.string().url('Invalid URL').optional(),
  token: z.string().optional(),
});

export type GitProviderCreateInput = z.infer<typeof gitProviderCreateSchema>;

/**
 * Schema for testing a repository connection
 */
export const testRepositorySchema = z.object({
  url: z.string().url('Invalid URL'),
  token: z.string().optional(),
});

export type TestRepositoryInput = z.infer<typeof testRepositorySchema>;

/**
 * Filter for repositories
 */
export interface RepositoryFilter {
  provider_id?: string;
}
