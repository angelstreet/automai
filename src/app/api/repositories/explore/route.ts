import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getUser } from '@/app/actions/userAction';
import * as gitService from '@/lib/services/gitService';

// Define global type for giteaServerUrl
declare global {
  var giteaServerUrl: string;
  var repositoryUrl: string;
}

// Simple in-memory cache
class SimpleCache {
  private cache = new Map<string, { data: any; expiry: number }>();

  set(key: string, data: any, expirySeconds: number): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + expirySeconds * 1000,
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.data as T;
  }
}

const serverCache = new SimpleCache();

/**
 * List files in a repository
 * This function directly uses the GitHub API to fetch repository contents
 */
async function getRepositoryFiles(
  repositoryId: string,
  path: string = '',
  branch: string = 'main',
  requestUrl: string,
): Promise<{ success: boolean; error?: string; data?: any[] }> {
  try {
    console.log('Listing repository files', { repositoryId, path, branch });

    // Get authenticated user
    const currentUser = await getUser();
    if (!currentUser) {
      console.log('No authenticated user found');
      return { success: false, error: 'Unauthorized' };
    }

    // Check cache
    const cacheKey = `repo-files:${repositoryId}:${path}:${branch}`;
    const cached = serverCache.get<any[]>(cacheKey);
    if (cached) {
      console.log('Using cached files data');
      return { success: true, data: cached };
    }

    // Get repository information from URL parameters
    const urlParams = new URL(requestUrl).searchParams;
    const repoUrl = urlParams.get('repositoryUrl') || '';
    const [owner, repo] = extractOwnerAndRepo(repoUrl);

    if (!owner || !repo) {
      return { success: false, error: 'Invalid repository URL' };
    }

    let files = [];

    // Use GitHub API
    const githubToken = process.env.GITHUB_TOKEN;

    if (!githubToken) {
      return { success: false, error: 'GitHub token is not configured' };
    }

    const { Octokit } = await import('@octokit/rest');
    const octokit = new Octokit({
      auth: githubToken,
    });

    try {
      // If path is empty, we're at the root of the repository
      const response = await octokit.repos.getContent({
        owner,
        repo,
        path: path || '',
        ref: branch,
      });

      // GitHub API returns either an array (directory) or a single object (file)
      const contents = Array.isArray(response.data) ? response.data : [response.data];

      files = contents.map((item: any) => ({
        name: item.name,
        path: item.path,
        type: item.type === 'dir' ? 'dir' : 'file',
        size: item.size,
        lastModified: new Date().toISOString(),
        url: item.html_url || undefined,
        download_url: item.download_url,
      }));
    } catch (error: any) {
      console.error('Error fetching GitHub repository contents:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch repository contents',
      };
    }

    // Cache the result - 5 minute cache
    serverCache.set(cacheKey, files, 60 * 5);

    return { success: true, data: files };
  } catch (error: any) {
    console.error('Error in getRepositoryFiles:', error);
    return { success: false, error: error.message || 'Failed to fetch repository files' };
  }
}

/**
 * Get file content from a repository
 */
async function getRepositoryFileContent(
  repositoryId: string,
  path: string,
  branch: string = 'main',
  requestUrl: string,
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    console.log('Getting repository file content', { repositoryId, path, branch });

    // Get authenticated user
    const currentUser = await getUser();
    if (!currentUser) {
      console.log('No authenticated user found');
      return { success: false, error: 'Unauthorized' };
    }

    if (!path) {
      return { success: false, error: 'File path is required' };
    }

    // Check cache
    const cacheKey = `repo-file-content:${repositoryId}:${path}:${branch}`;
    const cached = serverCache.get<any>(cacheKey);
    if (cached) {
      console.log('Using cached file content');
      return { success: true, data: cached };
    }

    // Get repository information from URL parameters
    const urlParams = new URL(requestUrl).searchParams;
    const repoUrl = urlParams.get('repositoryUrl') || '';
    const [owner, repo] = extractOwnerAndRepo(repoUrl);

    if (!owner || !repo) {
      return { success: false, error: 'Invalid repository URL' };
    }

    // Use GitHub API
    const githubToken = process.env.GITHUB_TOKEN;

    if (!githubToken) {
      return { success: false, error: 'GitHub token is not configured' };
    }

    const { Octokit } = await import('@octokit/rest');
    const octokit = new Octokit({
      auth: githubToken,
    });

    try {
      // Get file content from GitHub
      const response = await octokit.repos.getContent({
        owner,
        repo,
        path,
        ref: branch,
      });

      // GitHub API returns file content in base64
      if ('content' in response.data && !Array.isArray(response.data)) {
        const content = response.data.content;
        const encoding = response.data.encoding || 'base64';

        // Cache the result - 5 minute cache
        serverCache.set(
          cacheKey,
          {
            content,
            encoding,
          },
          60 * 5,
        );

        return {
          success: true,
          data: {
            content,
            encoding,
          },
        };
      } else {
        return { success: false, error: 'Path does not point to a file' };
      }
    } catch (error: any) {
      console.error('Error fetching file content from GitHub:', error);
      return { success: false, error: error.message || 'Failed to fetch file content' };
    }
  } catch (error: any) {
    console.error('Error in getFileContent:', error);
    return { success: false, error: error.message || 'Failed to fetch file content' };
  }
}

/**
 * Extract owner and repo from repository URL
 */
function extractOwnerAndRepo(url: string): [string | null, string | null] {
  try {
    // Remove .git extension if present
    const cleanUrl = url.replace(/\.git$/, '');

    // Parse the URL
    const urlObj = new URL(cleanUrl);

    // Extract path parts
    const pathParts = urlObj.pathname.split('/').filter(Boolean);

    // GitHub URL format: https://github.com/owner/repo
    if (pathParts.length >= 2) {
      return [pathParts[0], pathParts[1]];
    }
  } catch (error) {
    console.error('Failed to extract owner and repo from URL', { url, error });
  }

  return [null, null];
}

/**
 * GET /api/repositories/explore
 * API endpoint for exploring repositories (listing files, getting file content)
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[@api:repositories:explore] Starting repository explorer request');

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const path = searchParams.get('path') || '';
    const repositoryUrl = searchParams.get('repositoryUrl') || '';
    const repositoryId = searchParams.get('repositoryId') || '';
    const providerId = searchParams.get('providerId') || '';
    const action = searchParams.get('action') || 'list';
    const giteaServer = searchParams.get('server') || '';
    const branch = searchParams.get('branch') || 'main';

    // Automatically detect provider from URL if not specified
    let provider = searchParams.get('provider') || '';
    if (!provider && repositoryUrl) {
      // Use our detection function to get the correct provider
      provider = gitService.detectProviderFromUrl(repositoryUrl);
      console.log(`[@api:repositories:explore] Auto-detected provider from URL: ${provider}`);
    } else if (!provider) {
      provider = 'github'; // Default fallback
    }

    // Store the repository URL in global for server-side access
    global.repositoryUrl = repositoryUrl;

    // If gitea server is specified, temporarily store it in a global variable
    if (provider === 'gitea' && giteaServer) {
      global.giteaServerUrl = giteaServer;
    }

    console.log('[@api:repositories:explore] Parameters:', {
      path,
      provider,
      action,
      repositoryId,
      repositoryUrl,
      branch,
      ...(provider === 'gitea'
        ? { server: giteaServer || global.giteaServerUrl || 'default server' }
        : {}),
    });

    // Verify user authentication
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      console.log('[@api:repositories:explore] Authentication failed: No session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user for additional security checks if needed
    const currentUser = await getUser();
    if (!currentUser) {
      console.log('[@api:repositories:explore] Authentication failed: No user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get API configuration from the gitService
    const config = gitService.getProviderApiConfig(provider, path, branch);

    console.log('[@api:repositories:explore] API request configuration:', {
      url: config.url,
      method: config.method,
    });

    // Make the API request to the git provider
    const response = await fetch(config.url, {
      method: config.method,
      headers: config.headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('[@api:repositories:explore] Provider API error:', {
        status: response.status,
        error: errorText,
      });
      return NextResponse.json(
        {
          error: `Provider API error: ${response.status}`,
          details: errorText,
        },
        { status: response.status },
      );
    }

    // Parse the API response
    let data;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // For raw text content (like GitLab's raw file endpoint)
      data = await response.text();
    }

    // Standardize the response format using gitService
    const standardizedData = gitService.standardizeResponse(provider, data, action);

    console.log('[@api:repositories:explore] Successfully processed response');
    return NextResponse.json({
      success: true,
      data: standardizedData,
    });
  } catch (error: any) {
    console.error('[@api:repositories:explore] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to explore repository' },
      { status: 500 },
    );
  }
}
