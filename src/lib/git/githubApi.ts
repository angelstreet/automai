/**
 * GitHub API Integration
 * Provides interfaces to interact with the GitHub API
 */
import { Octokit } from '@octokit/rest';

import { ApiResponse } from '@/lib/utils/dbUtils';

/**
 * GitHub API client options
 */
export interface GitHubApiClientOptions {
  accessToken: string;
  baseUrl?: string;
}

/**
 * GitHub repository interface
 */
export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string;
  fork: boolean;
  url: string;
  default_branch: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

/**
 * GitHub branch interface
 */
export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

/**
 * GitHub file interface
 */
export interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  type: string;
  content?: string;
  encoding?: string;
}

/**
 * GitHub API client to interact with GitHub repositories
 */
export class GitHubApiClient {
  private octokit: Octokit;

  constructor(options: GitHubApiClientOptions) {
    this.octokit = new Octokit({
      auth: options.accessToken,
      baseUrl: options.baseUrl || 'https://api.github.com',
    });
  }

  /**
   * List repositories for the authenticated user
   */
  async listRepositories(): Promise<ApiResponse<GitHubRepository[]>> {
    try {
      const { data } = await this.octokit.repos.listForAuthenticatedUser({
        sort: 'updated',
        per_page: 100,
      });

      return {
        success: true,
        data: data as GitHubRepository[],
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to list repositories',
      };
    }
  }

  /**
   * Get a repository by owner and name
   */
  async getRepository(owner: string, repo: string): Promise<ApiResponse<GitHubRepository>> {
    try {
      const { data } = await this.octokit.repos.get({
        owner,
        repo,
      });

      return {
        success: true,
        data: data as GitHubRepository,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get repository',
      };
    }
  }

  /**
   * List branches for a repository
   */
  async listBranches(owner: string, repo: string): Promise<ApiResponse<GitHubBranch[]>> {
    try {
      const { data } = await this.octokit.repos.listBranches({
        owner,
        repo,
        per_page: 100,
      });

      return {
        success: true,
        data: data as GitHubBranch[],
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to list branches',
      };
    }
  }

  /**
   * List contents of a repository path
   */
  async listContents(
    owner: string,
    repo: string,
    path: string = '',
    branch?: string,
  ): Promise<ApiResponse<GitHubFile[]>> {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref: branch,
      });

      const files = Array.isArray(data) ? data : [data];

      return {
        success: true,
        data: files as GitHubFile[],
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to list contents',
      };
    }
  }

  /**
   * Get content of a file
   */
  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    branch?: string,
  ): Promise<ApiResponse<string>> {
    try {
      const { data } = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref: branch,
      });

      if (Array.isArray(data)) {
        return {
          success: false,
          error: 'Path is a directory, not a file',
        };
      }

      if (!data.content || data.encoding !== 'base64') {
        return {
          success: false,
          error: 'File content not available or not base64 encoded',
        };
      }

      const content = Buffer.from(data.content, 'base64').toString('utf-8');

      return {
        success: true,
        data: content,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get file content',
      };
    }
  }

  /**
   * Test connection to the GitHub API
   */
  async testConnection(): Promise<ApiResponse<boolean>> {
    try {
      const { data } = await this.octokit.users.getAuthenticated();

      return {
        success: true,
        data: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to connect to GitHub API',
      };
    }
  }
}

/**
 * Create a new GitHub API client
 */
export function createGitHubApiClient(options: GitHubApiClientOptions): GitHubApiClient {
  return new GitHubApiClient(options);
}

// Default export
const githubApi = {
  createGitHubApiClient,
};

export default githubApi;
