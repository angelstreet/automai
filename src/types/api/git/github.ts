/**
 * GitHub-specific type definitions
 */
import { GitRepository, GitFile, GitBranch } from './common';

/**
 * GitHub-specific repository fields
 */
export interface GitHubRepository extends GitRepository {
  // GitHub-specific properties
  visibility?: string;
  topics?: string[];
  homepage?: string;
  language?: string;
  forks_count?: number;
  stargazers_count?: number;
  watchers_count?: number;
  open_issues_count?: number;
  has_issues?: boolean;
  has_projects?: boolean;
  has_wiki?: boolean;
  has_downloads?: boolean;
  archived?: boolean;
  disabled?: boolean;
  license?: {
    key: string;
    name: string;
    url: string;
  };
}

/**
 * GitHub-specific file properties
 */
export interface GitHubFile extends GitFile {
  sha: string;
  git_url?: string;
  download_url?: string;
  _links?: {
    self: string;
    git: string;
    html: string;
  };
}

/**
 * GitHub-specific branch properties
 */
export interface GitHubBranch extends GitBranch {
  protection?: {
    enabled: boolean;
    required_status_checks?: {
      enforcement_level: string;
      contexts: string[];
    };
  };
  _links?: {
    self: string;
    html: string;
  };
}

/**
 * GitHub API response for repository list
 */
export interface GitHubRepositoriesResponse {
  total_count: number;
  incomplete_results: boolean;
  items: GitHubRepository[];
}

/**
 * GitHub API authentication details
 */
export interface GitHubAuth {
  token: string;
  type: 'oauth' | 'personal' | 'installation';
  expires_at?: string;
}
