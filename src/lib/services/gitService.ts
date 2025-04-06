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

export interface RepoInfo {
  owner: string;
  repo: string;
  projectPath: string;
}

export interface RepositoryFileInfo {
  name: string;
  path: string;
  type: 'file' | 'dir';
  size?: number | string;
  lastModified?: string;
  download_url?: string | null;
  content?: string;
  children?: Record<string, RepositoryFileInfo>;
  encoding?: string;
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
export function detectProviderFromUrl(url?: string): 'github' | 'gitlab' | 'gitea' {
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
 * Parse a repository URL and extract owner and repo information
 * @param url Repository URL
 * @param providerType The Git provider type
 * @returns Object containing owner, repo, and projectPath
 */
export function parseRepositoryUrl(url?: string, providerType?: string): RepoInfo {
  if (!url) {
    console.warn('[GitService] No repository URL provided for parsing');
    return { owner: '', repo: '', projectPath: '' };
  }

  const provider = providerType || detectProviderFromUrl(url);
  let owner = '';
  let repo = '';
  let projectPath = '';

  try {
    // Remove .git suffix if present
    const cleanUrl = url.replace(/\.git$/, '');

    // Parse the URL
    const urlObj = new URL(cleanUrl);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);

    console.log(`[GitService] Parsing repository URL: ${cleanUrl}, provider: ${provider}`);

    if (provider === 'github') {
      if (pathParts.length >= 2) {
        owner = pathParts[0];
        repo = pathParts[1];
      }
    } else if (provider === 'gitlab') {
      if (pathParts.length >= 2) {
        repo = pathParts[pathParts.length - 1];
        owner = pathParts.slice(0, pathParts.length - 1).join('/');
        projectPath = encodeURIComponent(`${owner}/${repo}`);
      }
    } else if (provider === 'gitea') {
      if (pathParts.length >= 2) {
        owner = pathParts[0];
        repo = pathParts[1];
      }
    }

    console.log(`[GitService] Parsed repository info - owner: ${owner}, repo: ${repo}`);

    return { owner, repo, projectPath };
  } catch (error) {
    console.error('[GitService] Error parsing repository URL:', error);
    return { owner: '', repo: '', projectPath: '' };
  }
}

/**
 * Extract repository owner, name, and project path (for GitLab) from URL
 * @deprecated Use parseRepositoryUrl instead
 */
export function extractRepoInfo(provider: string): RepoInfo {
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
 * Build a GitHub URL for file listings
 */
export function buildGitHubFileListingUrl(
  owner: string,
  repo: string,
  path: string = '',
  branch: string = 'main',
): string {
  const pathSegment = path ? `/${encodeURIComponent(path)}` : '';
  return `https://api.github.com/repos/${owner}/${repo}/contents${pathSegment}?ref=${branch}`;
}

/**
 * Build a GitHub URL for file content
 */
export function buildGitHubFileContentUrl(
  owner: string,
  repo: string,
  path: string,
  branch: string = 'main',
): string {
  return `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${branch}`;
}

/**
 * Build a GitLab URL for file listings
 */
export function buildGitLabFileListingUrl(
  owner: string,
  repo: string,
  path: string = '',
  branch: string = 'master',
): string {
  const projectId = encodeURIComponent(`${owner}/${repo}`);
  const baseUrl = `https://gitlab.com/api/v4/projects/${projectId}/repository/tree`;

  if (path) {
    return `${baseUrl}?path=${encodeURIComponent(path)}&ref=${branch}`;
  } else {
    return `${baseUrl}?ref=${branch}`;
  }
}

/**
 * Build a GitLab URL for file content
 */
export function buildGitLabFileContentUrl(
  owner: string,
  repo: string,
  path: string,
  branch: string = 'master',
): string {
  const projectId = encodeURIComponent(`${owner}/${repo}`);
  // GitLab requires special path encoding for the files API
  const encodedFilePath = encodeURIComponent(path.replace(/\//g, '%2F'));

  return `https://gitlab.com/api/v4/projects/${projectId}/repository/files/${encodedFilePath}?ref=${branch}`;
}

/**
 * Fetch repository file listing using the appropriate provider API
 */
export async function fetchRepositoryContents(
  url: string,
  owner: string,
  repo: string,
  path: string = '',
  branch: string = 'main',
  providerType: string = 'github',
): Promise<RepositoryFileInfo[]> {
  console.log(
    `[GitService] Fetching repository contents - provider: ${providerType}, owner: ${owner}, repo: ${repo}, path: ${path}`,
  );

  // Determine API URL based on provider
  let apiUrl: string;

  if (providerType === 'github') {
    apiUrl = buildGitHubFileListingUrl(owner, repo, path, branch);
  } else if (providerType === 'gitlab') {
    apiUrl = buildGitLabFileListingUrl(owner, repo, path, branch);
  } else {
    // Use standard config for other providers
    const config = getProviderApiConfig(providerType, path, branch);
    apiUrl = config.url;
  }

  console.log(`[GitService] Using API URL for repository contents: ${apiUrl}`);

  try {
    // Use a timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    // Parse response based on content type
    let rawData;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      rawData = await response.json();
    } else {
      rawData = await response.text();
    }

    // Standardize the response
    return standardizeResponse(providerType, rawData, 'list');
  } catch (error: any) {
    console.error('[GitService] Error fetching repository contents:', error);
    throw error;
  }
}

/**
 * Fetch file content using the appropriate provider API
 */
export async function fetchFileContent(
  url: string,
  owner: string,
  repo: string,
  path: string,
  branch: string = 'main',
  providerType: string = 'github',
): Promise<string> {
  console.log(
    `[GitService] Fetching file content - provider: ${providerType}, owner: ${owner}, repo: ${repo}, path: ${path}`,
  );

  // Determine API URL based on provider
  let apiUrl: string;

  if (providerType === 'github') {
    apiUrl = buildGitHubFileContentUrl(owner, repo, path, branch);
  } else if (providerType === 'gitlab') {
    apiUrl = buildGitLabFileContentUrl(owner, repo, path, branch);
  } else {
    // Use standard config for other providers
    const config = getProviderApiConfig(providerType, path, branch);
    apiUrl = config.url;
  }

  console.log(`[GitService] Using API URL for file content: ${apiUrl}`);

  try {
    // Use a timeout to prevent hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    // Parse response based on content type
    let rawData;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      rawData = await response.json();
    } else {
      rawData = await response.text();
    }

    // Standardize the response
    const fileData = standardizeResponse(providerType, rawData, 'file');

    // Handle file content based on encoding
    if (fileData.encoding === 'base64' && fileData.content) {
      return atob(fileData.content);
    } else {
      return fileData.content || 'No content available';
    }
  } catch (error: any) {
    console.error('[GitService] Error fetching file content:', error);
    throw error;
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
      // This is likely a directory - use the tree endpoint with proper query params
      return {
        ...config,
        url: encodedPath
          ? `https://gitlab.com/api/v4/projects/${cleanProjectPath}/repository/tree?path=${encodedPath}&ref=${ref}`
          : `https://gitlab.com/api/v4/projects/${cleanProjectPath}/repository/tree?ref=${ref}`,
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
        type: item.type === 'dir' ? 'dir' : 'file', // Ensure proper type mapping
        size: item.size,
        download_url: item.download_url,
      }));
    } else {
      return data;
    }
  }
}

/**
 * Get repository default branch using the appropriate provider API
 * @param url Repository URL
 * @param providerType Optional provider type (auto-detected if not provided)
 * @returns The default branch name (or sensible fallback if detection fails)
 */
export async function getRepositoryDefaultBranch(
  url: string,
  providerType?: string,
): Promise<string> {
  try {
    // Auto-detect provider if not specified
    const provider = providerType || detectProviderFromUrl(url);
    const { owner, repo } = parseRepositoryUrl(url, provider);

    if (!owner || !repo) {
      console.warn('[GitService] Could not parse repository URL:', url);
      return provider === 'github' ? 'main' : 'master'; // Use common defaults as fallback
    }

    console.log(`[GitService] Getting default branch for ${owner}/${repo} (${provider})`);

    // Use different APIs based on provider
    if (provider === 'gitlab') {
      // GitLab: Use projects API to get repository metadata
      const projectId = encodeURIComponent(`${owner}/${repo}`);
      const response = await fetch(`https://gitlab.com/api/v4/projects/${projectId}`, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`[GitService] GitLab API error: ${response.status}`);
        return 'master'; // Fallback to master for GitLab
      }

      const data = await response.json();
      console.log(`[GitService] Detected GitLab default branch: ${data.default_branch}`);
      return data.default_branch || 'master';
    } else if (provider === 'github') {
      // GitHub: Use repos API to get repository metadata
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.error(`[GitService] GitHub API error: ${response.status}`);
        return 'main'; // Fallback to main for GitHub
      }

      const data = await response.json();
      console.log(`[GitService] Detected GitHub default branch: ${data.default_branch}`);
      return data.default_branch || 'main';
    } else if (provider === 'gitea') {
      try {
        // For Gitea we need server URL, try to extract from repository URL
        const urlObj = new URL(url);
        const serverUrl = `${urlObj.protocol}//${urlObj.host}`;

        const response = await fetch(`${serverUrl}/api/v1/repos/${owner}/${repo}`, {
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          console.error(`[GitService] Gitea API error: ${response.status}`);
          return 'master'; // Fallback to master for Gitea
        }

        const data = await response.json();
        console.log(`[GitService] Detected Gitea default branch: ${data.default_branch}`);
        return data.default_branch || 'master';
      } catch (giteaError) {
        console.error('[GitService] Error fetching Gitea repository info:', giteaError);
        return 'master'; // Fallback to master for Gitea
      }
    }

    // Unknown provider, use common defaults
    console.log(`[GitService] Using default branch for unknown provider: ${provider}`);
    return provider === 'github' ? 'main' : 'master';
  } catch (error) {
    console.error('[GitService] Error getting default branch:', error);
    // Fallback to a sensible default based on provider
    return providerType === 'github' ? 'main' : 'master';
  }
}

/**
 * Navigate to a file or directory in the repository explorer
 * @param repositoryUrl Repository URL
 * @param owner Repository owner
 * @param repo Repository name
 * @param path Path to navigate to
 * @param branch Branch to navigate in
 * @param providerType Provider type
 * @param isDirectory Whether the item is a directory
 * @returns Content of the file or directory
 */
export async function navigateRepository(
  repositoryUrl: string,
  owner: string,
  repo: string,
  path: string,
  branch: string = 'main',
  providerType: string = 'github',
  isDirectory: boolean = false,
): Promise<{
  fileContent?: string;
  files?: RepositoryFileInfo[];
  error?: string;
}> {
  try {
    console.log(`[GitService] Navigating repository - path: ${path}, isDirectory: ${isDirectory}`);

    // Use appropriate branch based on provider if default branch ('main') is provided
    let branchToUse = branch;
    if (branch === 'main' && providerType === 'gitlab') {
      branchToUse = 'master'; // Use 'master' for GitLab when 'main' is specified
      console.log(`[GitService] Adjusted branch from 'main' to 'master' for GitLab provider`);
    }

    if (isDirectory) {
      // Navigate to directory - fetch contents
      const files = await fetchRepositoryContents(
        repositoryUrl,
        owner,
        repo,
        path,
        branchToUse,
        providerType,
      );
      return { files };
    } else {
      // Navigate to file - fetch content
      const content = await fetchFileContent(
        repositoryUrl,
        owner,
        repo,
        path,
        branchToUse,
        providerType,
      );
      return { fileContent: content };
    }
  } catch (error: any) {
    console.error('[GitService] Error navigating repository:', error);
    return {
      error:
        error.message ||
        'Failed to navigate repository. This could be due to authentication issues, the file might not exist, or the branch may be different.',
    };
  }
}

/**
 * Load a repository structure (files and directories)
 * @param repositoryUrl Repository URL
 * @param currentPath Current path in the repository
 * @param branch Branch to load
 * @returns Repository structure
 */
export async function loadRepositoryStructure(
  repositoryUrl: string,
  currentPath: string[] = [],
  branch: string = 'main',
): Promise<{
  files: RepositoryFileInfo[];
  error?: string;
}> {
  try {
    console.log(`[GitService] Loading repository structure - path: ${currentPath.join('/')}`);

    // Detect provider and parse repository info
    const providerType = detectProviderFromUrl(repositoryUrl);
    const { owner, repo } = parseRepositoryUrl(repositoryUrl, providerType);

    if (!owner || !repo) {
      throw new Error('Could not determine repository owner and name from URL');
    }

    console.log(`[GitService] Using provider: ${providerType}, owner: ${owner}, repo: ${repo}`);

    // Use appropriate branch based on provider if default branch ('main') is provided
    let branchToUse = branch;
    if (branch === 'main' && providerType === 'gitlab') {
      branchToUse = 'master'; // Use 'master' for GitLab when 'main' is specified
      console.log(`[GitService] Adjusted branch from 'main' to 'master' for GitLab provider`);
    }

    // Fetch repository contents
    const pathString = currentPath.join('/');
    const files = await fetchRepositoryContents(
      repositoryUrl,
      owner,
      repo,
      pathString,
      branchToUse,
      providerType,
    );

    // Sort files: directories first, then files alphabetically
    const sortedFiles = [...files].sort((a, b) => {
      if (a.type === 'dir' && b.type !== 'dir') return -1;
      if (a.type !== 'dir' && b.type === 'dir') return 1;
      return a.name.localeCompare(b.name);
    });

    return { files: sortedFiles };
  } catch (error: any) {
    console.error('[GitService] Error loading repository structure:', error);
    return {
      files: [],
      error: error.message || 'Failed to load repository structure',
    };
  }
}

/**
 * Get a file icon color class based on file extension
 * @param fileName Filename to analyze
 * @param colorMap Map of extensions to color classes
 * @returns CSS color class
 */
export function getFileIconColorClass(
  fileName: string,
  colorMap: Record<string, string> = {},
): string {
  const extension = fileName.split('.').pop()?.toLowerCase() || 'default';
  return colorMap[extension] || colorMap.default || '';
}

// Export repository service functions
const gitService = {
  testGitProviderConnection,
  testGitRepositoryAccess,
  detectProviderFromUrl,
  parseRepositoryUrl,
  extractRepoInfo,
  getProviderApiConfig,
  standardizeResponse,
  buildGitHubFileListingUrl,
  buildGitHubFileContentUrl,
  buildGitLabFileListingUrl,
  buildGitLabFileContentUrl,
  fetchRepositoryContents,
  fetchFileContent,
  getRepositoryDefaultBranch,
  navigateRepository,
  loadRepositoryStructure,
  getFileIconColorClass,
};

export default gitService;
