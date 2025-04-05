/**
 * Git API Service
 * Handles all external Git provider API calls
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  status?: number;
}

export interface GitConnectionParams {
  type: 'github' | 'gitlab' | 'gitea';
  token: string;
  serverUrl?: string;
}

export interface GitRepositoryParams {
  url: string;
  token?: string;
  branch?: string;
}

/**
 * Test connection to a Git provider
 * @param params Connection parameters
 */
export async function testGitProviderConnection(params: GitConnectionParams): Promise<ApiResponse> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    // Determine base URL based on provider type
    const baseUrl = getBaseUrl(params);
    const endpoint = getEndpoint(params.type);

    // Set up authorization header
    const headers: Record<string, string> = {};
    if (params.token) {
      headers.Authorization = `token ${params.token}`;
    }

    console.log(`[GitService] Testing connection to ${params.type} at ${baseUrl}${endpoint}`);

    // Make the request
    try {
      const response = await fetch(`${baseUrl}${endpoint}`, {
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return {
          success: false,
          error: `Connection failed with status ${response.status}`,
          status: response.status,
        };
      }

      // Process successful response
      const data = await response.json();
      return { success: true, data };
    } catch (fetchError: any) {
      clearTimeout(timeout);

      // Handle timeout
      if (fetchError.name === 'AbortError') {
        return {
          success: false,
          error: 'Connection timeout after 5 seconds',
          status: 408, // Request Timeout
        };
      }

      throw fetchError; // Re-throw for outer catch
    }
  } catch (error: any) {
    console.error('[GitService] Error testing Git provider connection:', error);
    return {
      success: false,
      error: error.message || 'Failed to connect to Git provider',
    };
  }
}

/**
 * Test if a Git repository URL is accessible
 * @param params Repository parameters
 */
export async function testGitRepositoryAccess(params: GitRepositoryParams): Promise<ApiResponse> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    // Set up headers if token provided
    const headers: Record<string, string> = {};
    if (params.token) {
      headers.Authorization = `token ${params.token}`;
    }

    console.log(`[GitService] Testing repository access: ${params.url}`);

    try {
      // Use HEAD request to just check accessibility without downloading content
      const response = await fetch(params.url, {
        method: 'HEAD',
        headers,
        signal: controller.signal,
        redirect: 'follow',
      });

      clearTimeout(timeout);

      return {
        success: response.ok,
        status: response.status,
        error: response.ok ? undefined : `Repository is not accessible (${response.status})`,
      };
    } catch (fetchError: any) {
      clearTimeout(timeout);

      if (fetchError.name === 'AbortError') {
        return {
          success: false,
          error: 'Connection timeout after 5 seconds',
          status: 408,
        };
      }

      throw fetchError;
    }
  } catch (error: any) {
    console.error('[GitService] Error testing repository access:', error);
    return {
      success: false,
      error: error.message || 'Failed to test repository connection',
    };
  }
}

/**
 * Helper to determine the API base URL based on provider type
 */
function getBaseUrl(params: GitConnectionParams): string {
  if (params.type === 'gitea') {
    // For Gitea, use the provided server URL
    return params.serverUrl || '';
  } else if (params.type === 'github') {
    // GitHub API URL
    return 'https://api.github.com';
  } else {
    // GitLab API URL
    return 'https://gitlab.com/api/v4';
  }
}

/**
 * Helper to get the appropriate endpoint for each provider type
 */
function getEndpoint(type: string): string {
  switch (type) {
    case 'gitea':
      return '/api/v1/user';
    case 'github':
      return '/user';
    case 'gitlab':
      return '/user';
    default:
      return '/user';
  }
}
