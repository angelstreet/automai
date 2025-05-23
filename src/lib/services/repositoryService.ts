/**
 * Repository Service
 * Business logic for repository operations
 */
import repositoryDb from '@/lib/db/repositoryDb';
import giteaApi from '@/lib/git/giteaApi';
import githubApi from '@/lib/git/githubApi';
import gitlabApi from '@/lib/git/gitlabApi';
import { StandardResponse } from '@/lib/utils/commonUtils';
import { Repository } from '@/types/component/repositoryComponentType';

/**
 * Get provider client based on repository type
 */
function getProviderClient(repository: Repository) {
  if (!repository.token) {
    throw new Error('Repository credentials not found');
  }

  switch (repository.provider_type) {
    case 'github':
      return githubApi.createGitHubApiClient({
        accessToken: repository.token,
      });
    case 'gitlab':
      return gitlabApi.createGitLabApiClient({
        accessToken: repository.token,
        baseUrl: repository.provider_url || 'https://gitlab.com/api/v4',
      });
    case 'gitea':
      if (!repository.provider_url) {
        throw new Error('Gitea server URL is required');
      }
      return giteaApi.createGiteaApiClient({
        accessToken: repository.token,
        baseUrl: repository.provider_url,
      });
    default:
      throw new Error(`Unsupported repository provider: ${repository.provider_type}`);
  }
}

/**
 * Test connection to a repository
 */
export async function testRepositoryConnection(
  providerType: string,
  url: string,
  token: string,
): Promise<StandardResponse<boolean>> {
  try {
    console.info('Testing repository connection', { providerType, url });

    switch (providerType) {
      case 'github': {
        const client = githubApi.createGitHubApiClient({ accessToken: token });
        const result = await client.testConnection();
        return result;
      }
      case 'gitlab': {
        const client = gitlabApi.createGitLabApiClient({
          accessToken: token,
          baseUrl: url || 'https://gitlab.com/api/v4',
        });
        const result = await client.testConnection();
        return result;
      }
      case 'gitea': {
        if (!url) {
          return {
            success: false,
            error: 'Gitea server URL is required',
          };
        }
        const client = giteaApi.createGiteaApiClient({
          accessToken: token,
          baseUrl: url,
        });
        const result = await client.testConnection();
        return result;
      }
      default:
        return {
          success: false,
          error: `Unsupported repository provider: ${providerType}`,
        };
    }
  } catch (error: any) {
    console.error('Repository connection test failed', { error: error.message });
    return {
      success: false,
      error: error.message || 'Connection test failed',
    };
  }
}

/**
 * List branches for a repository
 */
export async function listRepositoryBranches(
  repositoryId: string,
): Promise<StandardResponse<{ name: string; commit: any }[]>> {
  try {
    console.info('Listing repository branches', { repositoryId });

    // Get the repository from the database
    const repositoryResult = await repositoryDb.getById(repositoryId);

    if (!repositoryResult.success || !repositoryResult.data) {
      return {
        success: false,
        error: repositoryResult.error || 'Repository not found',
      };
    }

    const repository = repositoryResult.data;

    // Get the client for the repository provider
    const client = getProviderClient(repository);

    // Extract owner and repo from the repository URL
    const { owner, repo } = extractOwnerAndRepo(repository.url, repository.provider_type);

    if (!owner || !repo) {
      return {
        success: false,
        error: 'Could not extract owner and repo from repository URL',
      };
    }

    // List branches using the appropriate client
    let result;

    switch (repository.provider_type) {
      case 'github':
        result = await client.listBranches(owner, repo);
        break;
      case 'gitlab':
        result = await client.listBranches(owner, repo, '');
        break;
      case 'gitea':
        result = await client.listBranches(owner, repo);
        break;
      default:
        return {
          success: false,
          error: `Unsupported repository provider: ${repository.provider_type}`,
        };
    }

    if (!result.success) {
      return result;
    }

    // Normalize branch data
    const branches =
      result.data?.map((branch: { name: string; commit: any }) => ({
        name: branch.name,
        commit: branch.commit,
      })) || [];

    console.info('Repository branches retrieved successfully', {
      repositoryId,
      branchCount: branches.length,
    });

    return {
      success: true,
      data: branches,
    };
  } catch (error: any) {
    console.error('Failed to list repository branches', { error: error.message });
    return {
      success: false,
      error: error.message || 'Failed to list repository branches',
    };
  }
}

/**
 * Extract owner and repo from repository URL
 */
function extractOwnerAndRepo(
  url: string,
  providerType: string,
): { owner: string | null; repo: string | null } {
  try {
    // Remove .git extension if present
    const cleanUrl = url.replace(/\.git$/, '');

    // Parse the URL
    const urlObj = new URL(cleanUrl);

    // Extract path parts
    const pathParts = urlObj.pathname.split('/').filter(Boolean);

    // Different providers have different URL formats
    switch (providerType) {
      case 'github':
        // GitHub URL format: https://github.com/owner/repo
        if (pathParts.length >= 2) {
          return {
            owner: pathParts[0],
            repo: pathParts[1],
          };
        }
        break;
      case 'gitlab':
        // GitLab URL format: https://gitlab.com/owner/repo or https://gitlab.com/group/subgroup/repo
        if (pathParts.length >= 2) {
          // Handle nested groups
          const repo = pathParts.pop() || null;
          const owner = pathParts.join('/');
          return { owner, repo };
        }
        break;
      case 'gitea':
        // Gitea URL format: https://gitea.com/owner/repo
        if (pathParts.length >= 2) {
          return {
            owner: pathParts[0],
            repo: pathParts[1],
          };
        }
        break;
      default:
        break;
    }
  } catch (error) {
    console.error('Failed to extract owner and repo from URL', { url, error });
  }

  return { owner: null, repo: null };
}

/**
 * List files in a repository
 */
export async function listRepositoryFiles(
  repositoryId: string,
  path: string = '',
  branch: string = 'main',
): Promise<StandardResponse<{ name: string; path: string; type: string }[]>> {
  try {
    console.info('Listing repository files', { repositoryId, path, branch });

    // Get the repository from the database
    const repositoryResult = await repositoryDb.getById(repositoryId);

    if (!repositoryResult.success || !repositoryResult.data) {
      return {
        success: false,
        error: repositoryResult.error || 'Repository not found',
      };
    }

    const repository = repositoryResult.data;

    // Get the client for the repository provider
    const client = getProviderClient(repository);

    // Extract owner and repo from the repository URL
    const { owner, repo } = extractOwnerAndRepo(repository.url, repository.provider_type);

    if (!owner || !repo) {
      return {
        success: false,
        error: 'Could not extract owner and repo from repository URL',
      };
    }

    // List files using the appropriate client
    let result;

    switch (repository.provider_type) {
      case 'github':
        if ('listContents' in client) {
          result = await client.listContents(owner, repo, path, branch);
        } else {
          return {
            success: false,
            error: 'listContents method not available for this client',
          };
        }
        break;
      case 'gitlab':
        if ('listDirectory' in client) {
          result = await client.listDirectory(repo, path, branch);
        } else {
          return {
            success: false,
            error: 'listDirectory method not available for this client',
          };
        }
        break;
      case 'gitea':
        if ('listContents' in client) {
          result = await client.listContents(owner, repo, path, branch);
        } else {
          return {
            success: false,
            error: 'listContents method not available for this client',
          };
        }
        break;
      default:
        return {
          success: false,
          error: `Unsupported repository provider: ${repository.provider_type}`,
        };
    }

    if (!result.success) {
      return result;
    }

    // Normalize file data
    const files =
      result.data?.map((file: any) => ({
        name: file.name || file.file_name,
        path: file.path || file.file_path,
        type: file.type || (file.type === 'dir' ? 'dir' : 'file'),
      })) || [];

    console.info('Repository files retrieved successfully', {
      repositoryId,
      fileCount: files.length,
    });

    return {
      success: true,
      data: files,
    };
  } catch (error: any) {
    console.error('Failed to list repository files', { error: error.message });
    return {
      success: false,
      error: error.message || 'Failed to list repository files',
    };
  }
}

/**
 * Get file content from a repository
 */
export async function getRepositoryFileContent(
  repositoryId: string,
  path: string,
  branch: string = 'main',
): Promise<StandardResponse<string>> {
  try {
    console.info('Getting repository file content', { repositoryId, path, branch });

    // Get the repository from the database
    const repositoryResult = await repositoryDb.getById(repositoryId);

    if (!repositoryResult.success || !repositoryResult.data) {
      return {
        success: false,
        error: repositoryResult.error || 'Repository not found',
      };
    }

    const repository = repositoryResult.data;

    // Get the client for the repository provider
    const client = getProviderClient(repository);

    // Extract owner and repo from the repository URL
    const { owner, repo } = extractOwnerAndRepo(repository.url, repository.provider_type);

    if (!owner || !repo) {
      return {
        success: false,
        error: 'Could not extract owner and repo from repository URL',
      };
    }

    // Get file content using the appropriate client
    let result;

    switch (repository.provider_type) {
      case 'github':
        result = await client.getFileContent(owner, repo, path, branch);
        break;
      case 'gitlab':
        result = await client.getFileContent(repo, path, branch);
        break;
      case 'gitea':
        result = await client.getFileContent(owner, repo, path, branch);
        break;
      default:
        return {
          success: false,
          error: `Unsupported repository provider: ${repository.provider_type}`,
        };
    }

    console.info('Repository file content retrieved successfully', { repositoryId, path });

    return result;
  } catch (error: any) {
    console.error('Failed to get repository file content', { error: error.message });
    return {
      success: false,
      error: error.message || 'Failed to get repository file content',
    };
  }
}

// Export repository service functions
const repositoryService = {
  testRepositoryConnection,
  listRepositoryBranches,
  listRepositoryFiles,
  getRepositoryFileContent,
};

export default repositoryService;
