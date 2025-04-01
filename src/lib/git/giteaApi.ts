/**
 * Gitea API Integration
 * Provides interfaces to interact with the Gitea API
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
 * Gitea API client options
 */
export interface GiteaApiClientOptions {
  accessToken: string;
  baseUrl: string;
}

/**
 * Gitea repository interface
 */
export interface GiteaRepository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string;
  empty: boolean;
  fork: boolean;
  ssh_url: string;
  clone_url: string;
  default_branch: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

/**
 * Gitea branch interface
 */
export interface GiteaBranch {
  name: string;
  commit: {
    id: string;
    message: string;
    url: string;
  };
  protected: boolean;
}

/**
 * Gitea file interface
 */
export interface GiteaFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  type: string;
  content?: string;
  encoding?: string;
}

/**
 * Gitea API client to interact with Gitea repositories
 */
export class GiteaApiClient {
  private accessToken: string;
  private baseUrl: string;
  
  constructor(options: GiteaApiClientOptions) {
    this.accessToken = options.accessToken;
    this.baseUrl = options.baseUrl.endsWith('/') ? options.baseUrl.slice(0, -1) : options.baseUrl;
  }
  
  /**
   * Make a request to the Gitea API
   */
  private async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.baseUrl}/api/v1${path.startsWith('/') ? path : `/${path}`}`;
      
      const response = await fetch(url, {
        ...options,
        headers: {
          'Authorization': `token ${this.accessToken}`,
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
   * List repositories for the authenticated user
   */
  async listRepositories(): Promise<ApiResponse<GiteaRepository[]>> {
    return this.request<GiteaRepository[]>('/user/repos');
  }
  
  /**
   * Get a repository by name
   */
  async getRepository(owner: string, repo: string): Promise<ApiResponse<GiteaRepository>> {
    return this.request<GiteaRepository>(`/repos/${owner}/${repo}`);
  }
  
  /**
   * List branches for a repository
   */
  async listBranches(owner: string, repo: string): Promise<ApiResponse<GiteaBranch[]>> {
    return this.request<GiteaBranch[]>(`/repos/${owner}/${repo}/branches`);
  }
  
  /**
   * Get a specific branch in a repository
   */
  async getBranch(owner: string, repo: string, branch: string): Promise<ApiResponse<GiteaBranch>> {
    return this.request<GiteaBranch>(`/repos/${owner}/${repo}/branches/${branch}`);
  }
  
  /**
   * List the contents of a directory in a repository
   */
  async listContents(
    owner: string,
    repo: string,
    path: string = '',
    ref: string = 'master'
  ): Promise<ApiResponse<GiteaFile[]>> {
    const query = new URLSearchParams();
    
    if (ref) {
      query.append('ref', ref);
    }
    
    const queryString = query.toString() ? `?${query.toString()}` : '';
    const apiPath = `/repos/${owner}/${repo}/contents/${path}${queryString}`;
    
    const response = await this.request<GiteaFile[] | GiteaFile>(apiPath);
    
    if (!response.success) {
      return response;
    }
    
    // If the response is not an array, it means it's a file, not a directory
    if (!Array.isArray(response.data)) {
      return {
        success: false,
        error: 'Path is a file, not a directory',
      };
    }
    
    return response;
  }
  
  /**
   * Get the contents of a file in a repository
   */
  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    ref: string = 'master'
  ): Promise<ApiResponse<string>> {
    const query = new URLSearchParams();
    
    if (ref) {
      query.append('ref', ref);
    }
    
    const queryString = query.toString() ? `?${query.toString()}` : '';
    const apiPath = `/repos/${owner}/${repo}/contents/${path}${queryString}`;
    
    const response = await this.request<GiteaFile>(apiPath);
    
    if (!response.success) {
      return response;
    }
    
    // If the response is an array, it means it's a directory, not a file
    if (Array.isArray(response.data)) {
      return {
        success: false,
        error: 'Path is a directory, not a file',
      };
    }
    
    if (!response.data?.content || response.data.encoding !== 'base64') {
      return {
        success: false,
        error: 'File content not available or not base64 encoded',
      };
    }
    
    try {
      const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
      
      return {
        success: true,
        data: content,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to decode file content: ${error.message}`,
      };
    }
  }
  
  /**
   * Test connection to the Gitea API
   */
  async testConnection(): Promise<ApiResponse<boolean>> {
    try {
      const response = await this.request<{ login: string }>('/user');
      
      return {
        success: response.success,
        data: response.success,
        error: response.error,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to connect to Gitea API',
      };
    }
  }
}

/**
 * Create a new Gitea API client
 */
export function createGiteaApiClient(options: GiteaApiClientOptions): GiteaApiClient {
  return new GiteaApiClient(options);
}

// Default export
const giteaApi = {
  createGiteaApiClient,
};

export default giteaApi;