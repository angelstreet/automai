/**
 * Common type definitions for Git provider APIs
 */

/**
 * Common properties for all Git repositories
 */
export interface GitRepository {
  id: string;
  name: string;
  full_name?: string;
  description?: string;
  private: boolean;
  html_url: string;
  clone_url: string;
  default_branch: string;
  owner: {
    login: string;
    avatar_url?: string;
  };
  created_at?: string;
  updated_at?: string;
}

/**
 * Common properties for all Git files
 */
export interface GitFile {
  name: string;
  path: string;
  size?: number;
  type: 'file' | 'dir' | 'blob' | 'tree';
  url?: string;
  html_url?: string;
  content?: string;
  encoding?: string;
}

/**
 * Common properties for all Git branches
 */
export interface GitBranch {
  name: string;
  commit: {
    sha: string;
    url?: string;
  };
  protected?: boolean;
}

/**
 * Git provider types
 */
export type GitProviderType = 'github' | 'gitlab' | 'gitea' | 'bitbucket';

/**
 * Git provider configuration
 */
export interface GitProvider {
  id: string;
  name: string;
  display_name?: string;
  type: GitProviderType;
  profile_id: string;
  server_url?: string;
  access_token?: string;
  refresh_token?: string;
  expires_at?: string;
  created_at?: string;
  updated_at?: string;
  is_configured?: boolean;
}
