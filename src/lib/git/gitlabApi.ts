/**
 * GitLab API Integration
 * Provides interfaces to interact with the GitLab API
 */

/**
 * Standard API response interface
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T | null;
  error?: string;
}

/**
 * GitLab API client options
 */
export interface GitLabApiClientOptions {
  accessToken: string;
  baseUrl?: string;
}

/**
 * GitLab repository interface
 */
export interface GitLabRepository {
  id: number;
  name: string;
  path_with_namespace: string;
  visibility: string;
  web_url: string;
  description: string;
  star_count: number;
  fork_count: number;
  default_branch: string;
  ssh_url_to_repo: string;
  http_url_to_repo: string;
}

/**
 * GitLab branch interface
 */
export interface GitLabBranch {
  name: string;
  commit: {
    id: string;
    short_id: string;
    title: string;
    created_at: string;
    message: string;
  };
  merged: boolean;
  protected: boolean;
  developers_can_push: boolean;
  developers_can_merge: boolean;
  can_push: boolean;
}

/**
 * GitLab file interface
 */
export interface GitLabFile {
  file_name: string;
  file_path: string;
  size: number;
  encoding: string;
  content_sha256: string;
  last_commit_id: string;
  type: string;
  content?: string;
}

/**
 * GitLab API client to interact with GitLab repositories
 */
export class GitLabApiClient {
  private accessToken: string;
  private baseUrl: string;
  
  constructor(options: GitLabApiClientOptions) {
    this.accessToken = options.accessToken;
    this.baseUrl = options.baseUrl || 'https://gitlab.com/api/v4';
  }
  
  /**
   * Make a request to the GitLab API
   */
  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        
        return {
          success: false,
          error: error.message || `Request failed with status ${response.status}`,
        };
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Request failed',
      };
    }
  }
  
  /**
   * List projects for the authenticated user
   */
  async listProjects(): Promise<ApiResponse<GitLabRepository[]>> {
    return this.request<GitLabRepository[]>('/projects?membership=true&order_by=updated_at&sort=desc&per_page=100');
  }
  
  /**
   * Get a project by ID or path
   */
  async getProject(id: string): Promise<ApiResponse<GitLabRepository>> {
    return this.request<GitLabRepository>(`/projects/${encodeURIComponent(id)}`);
  }
  
  /**
   * List branches for a project
   */
  async listBranches(projectId: string): Promise<ApiResponse<GitLabBranch[]>> {
    return this.request<GitLabBranch[]>(`/projects/${encodeURIComponent(projectId)}/repository/branches`);
  }
  
  /**
   * Get a specific branch in a project
   */
  async getBranch(projectId: string, branch: string): Promise<ApiResponse<GitLabBranch>> {
    return this.request<GitLabBranch>(`/projects/${encodeURIComponent(projectId)}/repository/branches/${encodeURIComponent(branch)}`);
  }
  
  /**
   * Get the contents of a file in a repository
   */
  async getFileContent(
    projectId: string,
    filePath: string,
    ref: string = 'main'
  ): Promise<ApiResponse<string>> {
    const response = await this.request<{ content: string; encoding: string }>(
      `/projects/${encodeURIComponent(projectId)}/repository/files/${encodeURIComponent(filePath)}?ref=${encodeURIComponent(ref)}`
    );
    
    if (!response.success) {
      return response;
    }
    
    const { content, encoding } = response.data!;
    
    if (encoding === 'base64') {
      try {
        const decodedContent = Buffer.from(content, 'base64').toString('utf-8');
        
        return {
          success: true,
          data: decodedContent,
        };
      } catch (error: any) {
        return {
          success: false,
          error: `Failed to decode file content: ${error.message}`,
        };
      }
    } else {
      return {
        success: true,
        data: content,
      };
    }
  }
  
  /**
   * List files in a directory
   */
  async listDirectory(
    projectId: string,
    path: string = '',
    ref: string = 'main'
  ): Promise<ApiResponse<GitLabFile[]>> {
    const encodedPath = path ? encodeURIComponent(path) : '';
    
    return this.request<GitLabFile[]>(
      `/projects/${encodeURIComponent(projectId)}/repository/tree?path=${encodedPath}&ref=${encodeURIComponent(ref)}`
    );
  }
  
  /**
   * Test connection to the GitLab API
   */
  async testConnection(): Promise<ApiResponse<boolean>> {
    try {
      const response = await this.request<{ username: string }>('/user');
      
      return {
        success: response.success,
        data: response.success,
        error: response.error,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to connect to GitLab API',
      };
    }
  }
}

/**
 * Create a new GitLab API client
 */
export function createGitLabApiClient(options: GitLabApiClientOptions): GitLabApiClient {
  return new GitLabApiClient(options);
}

// Default export
const gitlabApi = {
  createGitLabApiClient,
};

export default gitlabApi;