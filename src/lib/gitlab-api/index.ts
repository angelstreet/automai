/**
 * GitLab API Integration
 * This module provides functions to interact with GitLab API endpoints
 */

// Types for GitLab API responses
export interface GitLabRepository {
  id: number;
  name: string;
  path: string;
  path_with_namespace: string;
  description: string;
  visibility: string;
  owner: {
    id: number;
    name: string;
    username: string;
    avatar_url: string;
  };
  web_url: string;
  http_url_to_repo: string;
  default_branch: string;
  created_at: string;
  last_activity_at: string;
}

export interface GitLabFile {
  id: string;
  name: string;
  path: string;
  size: number;
  type: 'blob' | 'tree';
  mode: string;
  web_url: string;
}

export interface GitLabFileContent {
  file_name: string;
  file_path: string;
  size: number;
  encoding: string;
  content: string;
  content_sha256: string;
  ref: string;
  blob_id: string;
  commit_id: string;
  last_commit_id: string;
}

export interface GitLabBranch {
  name: string;
  commit: {
    id: string;
    short_id: string;
    title: string;
    created_at: string;
    parent_ids: string[];
  };
  merged: boolean;
  protected: boolean;
  developers_can_push: boolean;
  developers_can_merge: boolean;
  can_push: boolean;
  default: boolean;
  web_url: string;
}

/**
 * Get repository information from GitLab
 * @param serverUrl The GitLab server URL (defaults to gitlab.com)
 * @param projectId Repository ID or path with namespace (e.g., 'username/repo')
 * @param token Optional access token for authentication
 */
export async function getRepository(
  serverUrl: string = 'https://gitlab.com',
  projectId: string,
  token?: string,
): Promise<GitLabRepository> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // URL encode the projectId for paths with namespaces
  const encodedProjectId = encodeURIComponent(projectId);

  const response = await fetch(`${serverUrl}/api/v4/projects/${encodedProjectId}`, {
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch repository: ${response.statusText}`);
  }

  return response.json();
}

/**
 * List files in a repository
 * @param serverUrl The GitLab server URL (defaults to gitlab.com)
 * @param projectId Repository ID or path with namespace (e.g., 'username/repo')
 * @param path Path within the repository
 * @param ref Branch or commit reference
 * @param token Optional access token for authentication
 */
export async function listFiles(
  serverUrl: string = 'https://gitlab.com',
  projectId: string,
  path: string = '',
  ref: string = '',
  token?: string,
): Promise<GitLabFile[]> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // URL encode the projectId for paths with namespaces
  const encodedProjectId = encodeURIComponent(projectId);

  let url = `${serverUrl}/api/v4/projects/${encodedProjectId}/repository/tree`;
  const params = new URLSearchParams();

  if (path) {
    params.append('path', path);
  }

  if (ref) {
    params.append('ref', ref);
  }

  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  const response = await fetch(url, {
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to list files: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Get file content from a repository
 * @param serverUrl The GitLab server URL (defaults to gitlab.com)
 * @param projectId Repository ID or path with namespace (e.g., 'username/repo')
 * @param filePath Path to the file
 * @param ref Branch or commit reference
 * @param token Optional access token for authentication
 */
export async function getFileContent(
  serverUrl: string = 'https://gitlab.com',
  projectId: string,
  filePath: string,
  ref: string = '',
  token?: string,
): Promise<GitLabFileContent> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // URL encode the projectId and filePath
  const encodedProjectId = encodeURIComponent(projectId);
  const encodedFilePath = encodeURIComponent(filePath);

  let url = `${serverUrl}/api/v4/projects/${encodedProjectId}/repository/files/${encodedFilePath}`;

  if (ref) {
    url += `?ref=${encodeURIComponent(ref)}`;
  }

  const response = await fetch(url, {
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to get file content: ${response.statusText}`);
  }

  return response.json();
}

/**
 * List branches in a repository
 * @param serverUrl The GitLab server URL (defaults to gitlab.com)
 * @param projectId Repository ID or path with namespace (e.g., 'username/repo')
 * @param token Optional access token for authentication
 */
export async function listBranches(
  serverUrl: string = 'https://gitlab.com',
  projectId: string,
  token?: string,
): Promise<GitLabBranch[]> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // URL encode the projectId for paths with namespaces
  const encodedProjectId = encodeURIComponent(projectId);

  const response = await fetch(
    `${serverUrl}/api/v4/projects/${encodedProjectId}/repository/branches`,
    {
      headers,
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to list branches: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Extract project ID or path with namespace from a GitLab URL
 * @param url GitLab repository URL
 */
export function extractGitLabProjectId(url: string): string {
  // Remove .git suffix if present
  const cleanUrl = url.endsWith('.git') ? url.slice(0, -4) : url;

  try {
    const urlObj = new URL(cleanUrl);

    // For gitlab.com or self-hosted GitLab
    const pathParts = urlObj.pathname.split('/').filter(Boolean);

    if (pathParts.length < 2) {
      throw new Error('Invalid GitLab repository URL format');
    }

    // For most GitLab URLs, the format is /username/repo or /group/subgroup/repo
    return pathParts.join('/');
  } catch (error) {
    throw new Error('Invalid URL format');
  }
}
