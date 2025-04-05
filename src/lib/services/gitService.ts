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

/**
 * Detect provider type from repository URL
 */
export function detectProviderFromUrl(url: string): 'github' | 'gitlab' | 'gitea' {
  if (!url) return 'gitea'; // Default to Gitea if no URL provided

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    if (hostname.includes('github')) return 'github';
    if (hostname.includes('gitlab')) return 'gitlab';
    if (hostname.includes('gitea')) return 'gitea';

    // Default to Gitea if provider can't be determined from hostname
    return 'gitea';
  } catch {
    console.warn('[GitService] Invalid URL:', url);
    return 'gitea'; // Default to Gitea for invalid URLs
  }
}

/**
 * Extract repository owner, name, and project path (for GitLab) from URL
 */
export function extractRepoInfo(provider: string): {
  owner: string;
  repo: string;
  projectPath: string;
} {
  try {
    // Try to get URL from different sources (client or server)
    let url = '';

    // First check if we have a server-side global variable
    if (typeof global !== 'undefined' && global.repositoryUrl) {
      url = global.repositoryUrl;
      console.log('[GitService] Using server-side repository URL:', url);
    }
    // Then try localStorage if we're in a browser
    else if (typeof window !== 'undefined') {
      url = localStorage.getItem('repository_url') || '';
      console.log('[GitService] Using client-side repository URL:', url);
    }

    // Default values
    let owner = '';
    let repo = '';
    let projectPath = '';

    if (!url) {
      console.warn('[GitService] No repository URL found');
      return { owner, repo, projectPath };
    }

    // If URL is URL-encoded, decode it
    if (url.includes('%')) {
      url = decodeURIComponent(url);
    }

    // Remove .git suffix if present
    url = url.replace(/\.git$/, '');

    console.log(`[GitService] Extracting info from URL (${provider}):`, url);

    if (provider === 'github') {
      // For GitHub URLs like https://github.com/owner/repo
      const match = url.match(/github\.com\/([^\/]+)\/([^\/\.]+)/);
      if (match) {
        owner = match[1];
        repo = match[2];
      } else {
        // Try alternative patterns or fallback for non-standard URLs
        const decodedUrl = decodeURIComponent(url);
        const parts = decodedUrl
          .replace(/^https?:\/\//, '')
          .split('/')
          .filter(Boolean);

        if (parts.length >= 2) {
          // Use the last two parts as owner/repo
          repo = parts[parts.length - 1].replace(/\.git$/, '');
          owner = parts[parts.length - 2];
        }
      }
    } else if (provider === 'gitlab') {
      // For GitLab URLs like https://gitlab.com/owner/repo or https://gitlab.com/group/subgroup/repo
      const urlWithoutProtocol = url.replace(/^https?:\/\//, '');
      const parts = urlWithoutProtocol.split('/').filter(Boolean);

      if (parts.length >= 3) {
        // Skip the domain (gitlab.com)
        const domainIndex = parts.findIndex((part) => part.includes('gitlab'));
        const pathParts = parts.slice(domainIndex + 1);

        // The last part is the repo name
        repo = pathParts[pathParts.length - 1];

        // Everything before is the owner/group path
        owner = pathParts.slice(0, pathParts.length - 1).join('/');

        // For GitLab API, we need the full project path (URL encoded)
        projectPath = encodeURIComponent(pathParts.join('/'));
      }
    } else if (provider === 'gitea') {
      // For Gitea URLs
      const urlWithoutProtocol = url.replace(/^https?:\/\//, '');
      const parts = urlWithoutProtocol.split('/').filter(Boolean);

      // Skip the domain
      if (parts.length >= 3) {
        // Skip the server part
        const pathStart = parts[0].includes(':') ? 1 : 1; // Skip domain or IP:port
        const pathParts = parts.slice(pathStart);

        // For URLs like domain.com/owner/repo
        if (pathParts.length >= 2) {
          repo = pathParts[pathParts.length - 1].replace(/\.git$/, '');
          owner = pathParts[pathParts.length - 2];
        }
      }
    }

    return { owner, repo, projectPath };
  } catch (err) {
    console.error('[GitService] Error extracting repo info:', err);
    // Return empty values if any error occurs
    return { owner: '', repo: '', projectPath: '' };
  }
}

/**
 * Generate provider-specific API configuration for repository exploration
 */
export function getProviderApiConfig(
  provider: string,
  path: string = '',
  ref: string = 'master',
): {
  method: string;
  url: string;
  headers: Record<string, string>;
} {
  // Encode path for URL safety only if not empty
  const encodedPath = path ? encodeURIComponent(path) : '';

  // Default configuration
  const config = {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
  };

  if (provider === 'gitlab') {
    // Use project path format for GitLab API v4
    // For paths: https://gitlab.com/api/v4/projects/PROJECT_PATH/repository/tree?path=PATH
    // For files: https://gitlab.com/api/v4/projects/PROJECT_PATH/repository/files/FILE_PATH/raw?ref=BRANCH
    const { projectPath } = extractRepoInfo(provider);

    // Make sure we don't have a trailing .git
    const cleanProjectPath = projectPath.replace(/%2F\.git$/, '');

    if (path.endsWith('.md') || path.endsWith('.txt') || path.includes('.')) {
      // This is likely a file - use the file endpoint
      return {
        ...config,
        url: `https://gitlab.com/api/v4/projects/${cleanProjectPath}/repository/files/${encodedPath}/raw?ref=${ref}`,
      };
    } else {
      // This is likely a directory - use the tree endpoint
      const queryParams = encodedPath ? `?path=${encodedPath}` : '?recursive=true';
      return {
        ...config,
        url: `https://gitlab.com/api/v4/projects/${cleanProjectPath}/repository/tree${queryParams}`,
      };
    }
  } else if (provider === 'gitea') {
    // Gitea API format: /api/v1/repos/{owner}/{repo}/git/trees/{ref}?recursive=1
    const { owner, repo } = extractRepoInfo(provider);

    // Try to get server URL from different sources
    let serverUrl = '';

    // 1. First try global variable (set from query param)
    if (typeof global !== 'undefined' && global.giteaServerUrl) {
      serverUrl = global.giteaServerUrl;
    }
    // 2. Try to extract from the repository URL itself
    else if (typeof global !== 'undefined' && global.repositoryUrl) {
      const repoUrl = global.repositoryUrl;
      const urlMatch = repoUrl.match(/^(https?:\/\/[^\/]+)/);
      if (urlMatch && urlMatch[1]) {
        serverUrl = urlMatch[1];
      }
    }
    // 3. Then try localStorage if we're in a browser
    else if (typeof window !== 'undefined') {
      serverUrl = localStorage.getItem('gitea_server_url') || '';

      // If not in localStorage, try to extract from repo URL in localStorage
      if (!serverUrl && localStorage.getItem('repository_url')) {
        const repoUrl = localStorage.getItem('repository_url') || '';
        const urlMatch = repoUrl.match(/^(https?:\/\/[^\/]+)/);
        if (urlMatch && urlMatch[1]) {
          serverUrl = urlMatch[1];
        }
      }
    }

    // If still empty after all attempts, use default
    if (!serverUrl) {
      console.warn('[GitService] No Gitea server URL found, using default http://localhost:3000');
      serverUrl = 'http://localhost:3000';
    }

    // For Gitea repositories, use 'master' as the default branch if 'main' is specified
    // (since most Gitea repos use the older convention)
    const giteaRef = ref === 'main' ? 'master' : ref;

    console.log(`[GitService] Using Gitea server URL: ${serverUrl} with branch: ${giteaRef}`);

    if (path.endsWith('.md') || path.endsWith('.txt') || path.includes('.')) {
      // Get a specific file
      return {
        ...config,
        url: `${serverUrl}/api/v1/repos/${owner}/${repo}/contents/${encodedPath}?ref=${giteaRef}`,
      };
    } else {
      // Get directory tree (recursive by default for better performance)
      return {
        ...config,
        url: `${serverUrl}/api/v1/repos/${owner}/${repo}/git/trees/${giteaRef}?recursive=1`,
      };
    }
  } else {
    // GitHub API format remains the same
    return {
      ...config,
      url: `https://api.github.com/repos/${extractRepoInfo(provider).owner}/${
        extractRepoInfo(provider).repo
      }/contents/${path}`,
      headers: {
        ...config.headers,
        Authorization: process.env.GITHUB_TOKEN ? `token ${process.env.GITHUB_TOKEN}` : '',
      },
    };
  }
}

/**
 * Standardize the API response
 */
export function standardizeResponse(provider: string, data: any, _action: string): any {
  // If the response is text/plain (from GitLab raw endpoint)
  if (typeof data === 'string') {
    return {
      content: btoa(data), // Convert to base64 for consistent handling
      encoding: 'base64',
    };
  }

  // Handle different provider responses
  if (provider === 'gitlab') {
    if (Array.isArray(data)) {
      // This is a directory listing
      return data.map((item: any) => ({
        name: item.name,
        path: item.path,
        type: item.type === 'tree' ? 'dir' : 'file',
        size: item.size || 0,
        download_url:
          item.type === 'blob'
            ? `https://gitlab.com/api/v4/projects/${extractRepoInfo(provider).projectPath}/repository/files/${encodeURIComponent(item.path)}/raw`
            : null,
      }));
    } else {
      // This could be file content or other responses
      return data;
    }
  } else if (provider === 'gitea') {
    // Handle Gitea responses
    if (data.tree && Array.isArray(data.tree)) {
      // This is a tree response (directory listing)
      // Filter out symlinks and other non-standard entries
      return data.tree
        .filter((item: any) => item.type === 'blob' || item.type === 'tree')
        .map((item: any) => {
          // Split path to get just the filename
          const pathParts = item.path.split('/');
          const name = pathParts[pathParts.length - 1];

          // Get server URL from global or localStorage
          let serverUrl = '';
          if (typeof window !== 'undefined') {
            // Client-side
            serverUrl = localStorage.getItem('gitea_server_url') || '';
          } else {
            // Server-side
            serverUrl = global.giteaServerUrl || '';
          }

          // If still empty, use default
          if (!serverUrl) {
            serverUrl = 'http://localhost:3000';
          }

          const { owner, repo } = extractRepoInfo(provider);

          return {
            name,
            path: item.path,
            type: item.type === 'tree' ? 'dir' : 'file',
            size: item.size || 0,
            download_url:
              item.type === 'blob'
                ? `${serverUrl}/api/v1/repos/${owner}/${repo}/raw/${item.path}`
                : null,
          };
        });
    } else if (data.content) {
      // This is file content
      return {
        content: data.content,
        encoding: data.encoding || 'base64',
      };
    }
    // Return the data as-is if we don't recognize the format
    return data;
  } else {
    // GitHub response standardization remains the same
    if (Array.isArray(data)) {
      return data.map((item: any) => ({
        name: item.name,
        path: item.path,
        type: item.type,
        size: item.size,
        download_url: item.download_url,
      }));
    } else {
      return data;
    }
  }
}

// Export repository service functions
const gitService = {
  testGitProviderConnection,
  testGitRepositoryAccess,
  detectProviderFromUrl,
  extractRepoInfo,
  getProviderApiConfig,
  standardizeResponse,
};

export default gitService;
