import { Repository, GitProvider } from '@/app/[locale]/[tenant]/repositories/types';
import { AuthUser } from '@/types/user';

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
    data?: Repository 
  }>;
  updateRepositoryAction: (id: string, updates: Partial<Repository>) => Promise<{ 
    success: boolean; 
    error?: string; 
    data?: Repository 
  }>;
  deleteRepositoryAction: (id: string) => Promise<{ 
    success: boolean; 
    error?: string 
  }>;
  setSelectedRepository: (repository: Repository | null) => void;
  fetchUserData: () => Promise<AuthUser | null>;
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