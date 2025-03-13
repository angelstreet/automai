/**
 * GitHub API Integration
 * This module provides functions to interact with GitHub API endpoints
 */

// Types for GitHub API responses
export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string;
  private: boolean;
  owner: {
    login: string;
    id: number;
    avatar_url: string;
    url: string;
    html_url: string;
  };
  html_url: string;
  url: string;
  default_branch: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
}

export interface GitHubFile {
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

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

/**
 * Get repository information from GitHub
 * @param owner Repository owner
 * @param repo Repository name
 * @param token Optional access token for authentication
 */
export async function getRepository(
  owner: string,
  repo: string,
  token?: string
): Promise<GitHubRepository> {
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
  };
  
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }
  
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    headers,
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch repository: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * List files in a repository
 * @param owner Repository owner
 * @param repo Repository name
 * @param path Path within the repository
 * @param ref Branch or commit reference
 * @param token Optional access token for authentication
 */
export async function listFiles(
  owner: string,
  repo: string,
  path: string = '',
  ref: string = '',
  token?: string
): Promise<GitHubFile[]> {
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
  };
  
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }
  
  // Build URL with query parameters if ref is provided
  let url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
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
 * @param owner Repository owner
 * @param repo Repository name
 * @param path Path to the file
 * @param ref Branch or commit reference
 * @param token Optional access token for authentication
 */
export async function getFileContent(
  owner: string,
  repo: string,
  path: string,
  ref: string = '',
  token?: string
): Promise<GitHubFile> {
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
  };
  
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }
  
  // Build URL with query parameters if ref is provided
  let url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
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
 * @param owner Repository owner
 * @param repo Repository name
 * @param token Optional access token for authentication
 */
export async function listBranches(
  owner: string,
  repo: string,
  token?: string
): Promise<GitHubBranch[]> {
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
  };
  
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }
  
  const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/branches`, {
    headers,
  });
  
  if (!response.ok) {
    throw new Error(`Failed to list branches: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Extract owner and repo from a GitHub URL
 * @param url GitHub repository URL
 */
export function extractGitHubRepoInfo(url: string): { owner: string; repo: string } {
  // Remove .git suffix if present
  const cleanUrl = url.endsWith('.git') ? url.slice(0, -4) : url;
  
  try {
    const urlObj = new URL(cleanUrl);
    
    // For github.com
    if (urlObj.hostname === 'github.com') {
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      
      if (pathParts.length < 2) {
        throw new Error('Invalid GitHub repository URL format');
      }
      
      return {
        owner: pathParts[0],
        repo: pathParts[1],
      };
    }
    
    throw new Error('Not a GitHub URL');
  } catch (error) {
    throw new Error('Invalid URL format');
  }
}
