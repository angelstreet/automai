/**
 * Gitea API Integration
 * This module provides functions to interact with Gitea API endpoints
 */

// Types for Gitea API responses
export interface GiteaRepository {
  id: number;
  name: string;
  full_name: string;
  description: string;
  private: boolean;
  owner: {
    id: number;
    login: string;
    full_name: string;
    avatar_url: string;
  };
  html_url: string;
  clone_url: string;
  default_branch: string;
  created_at: string;
  updated_at: string;
}

export interface GiteaFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: 'file' | 'dir';
  content?: string;
  encoding?: string;
}

export interface GiteaBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

/**
 * Get repository information from Gitea
 * @param serverUrl The Gitea server URL
 * @param owner Repository owner
 * @param repo Repository name
 * @param token Optional access token for private repositories
 */
export async function getRepository(
  serverUrl: string,
  owner: string,
  repo: string,
  token?: string
): Promise<GiteaRepository> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }
  
  const response = await fetch(`${serverUrl}/api/v1/repos/${owner}/${repo}`, {
    headers,
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch repository: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * List files in a repository
 * @param serverUrl The Gitea server URL
 * @param owner Repository owner
 * @param repo Repository name
 * @param path Path within the repository
 * @param ref Branch or commit reference
 * @param token Optional access token for private repositories
 */
export async function listFiles(
  serverUrl: string,
  owner: string,
  repo: string,
  path: string = '',
  ref: string = '',
  token?: string
): Promise<GiteaFile[]> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }
  
  let url = `${serverUrl}/api/v1/repos/${owner}/${repo}/contents/${path}`;
  if (ref) {
    url += `?ref=${ref}`;
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
 * @param serverUrl The Gitea server URL
 * @param owner Repository owner
 * @param repo Repository name
 * @param path Path to the file
 * @param ref Branch or commit reference
 * @param token Optional access token for private repositories
 */
export async function getFileContent(
  serverUrl: string,
  owner: string,
  repo: string,
  path: string,
  ref: string = '',
  token?: string
): Promise<GiteaFile> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }
  
  let url = `${serverUrl}/api/v1/repos/${owner}/${repo}/contents/${path}`;
  if (ref) {
    url += `?ref=${ref}`;
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
 * @param serverUrl The Gitea server URL
 * @param owner Repository owner
 * @param repo Repository name
 * @param token Optional access token for private repositories
 */
export async function listBranches(
  serverUrl: string,
  owner: string,
  repo: string,
  token?: string
): Promise<GiteaBranch[]> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }
  
  const response = await fetch(`${serverUrl}/api/v1/repos/${owner}/${repo}/branches`, {
    headers,
  });
  
  if (!response.ok) {
    throw new Error(`Failed to list branches: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Extract owner and repo name from a Gitea URL
 * @param url Gitea repository URL
 */
export function extractGiteaRepoInfo(url: string): { owner: string; repo: string } {
  // Remove .git suffix if present
  const cleanUrl = url.endsWith('.git') ? url.slice(0, -4) : url;
  
  try {
    const urlObj = new URL(cleanUrl);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    
    if (pathParts.length < 2) {
      throw new Error('Invalid Gitea repository URL format');
    }
    
    return {
      owner: pathParts[0],
      repo: pathParts[1],
    };
  } catch (error) {
    throw new Error('Invalid URL format');
  }
}
