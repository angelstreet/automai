import { NextRequest, NextResponse } from 'next/server';
import { getUser } from '@/app/actions/userAction';

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
 * Endpoint to explore repository files
 */
export async function GET(req: NextRequest) {
  try {
    // Get query parameters
    const url = new URL(req.url);
    const repositoryId = url.searchParams.get('repositoryId');
    const path = url.searchParams.get('path') || '';
    const branch = url.searchParams.get('branch') || 'main';
    const action = url.searchParams.get('action') || 'list'; // Get the action parameter

    // Validate required parameters
    if (!repositoryId) {
      return NextResponse.json(
        { success: false, error: 'Repository ID is required' },
        { status: 400 },
      );
    }

    console.log(
      `[API] /api/repositories/explore - repositoryId: ${repositoryId}, path: ${path}, branch: ${branch}, action: ${action}`,
    );

    // Based on the action parameter, call the appropriate function
    if (action === 'file') {
      const result = await getRepositoryFileContent(repositoryId, path, branch, req.url);

      if (!result.success) {
        // Determine appropriate status code based on error
        let statusCode = 500;
        if (result.error === 'Unauthorized') {
          statusCode = 401;
        } else if (result.error === 'Repository not found' || result.error === 'File not found') {
          statusCode = 404;
        }
        return NextResponse.json({ success: false, error: result.error }, { status: statusCode });
      }

      return NextResponse.json({
        success: true,
        data: result.data,
      });
    } else {
      const result = await getRepositoryFiles(repositoryId, path, branch, req.url);

      if (!result.success) {
        // Determine appropriate status code based on error
        let statusCode = 500;
        if (result.error === 'Unauthorized') {
          statusCode = 401;
        } else if (result.error === 'Repository not found') {
          statusCode = 404;
        }
        return NextResponse.json({ success: false, error: result.error }, { status: statusCode });
      }

      return NextResponse.json({
        success: true,
        data: result.data,
      });
    }
  } catch (error: any) {
    console.error('[API] /api/repositories/explore - Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
