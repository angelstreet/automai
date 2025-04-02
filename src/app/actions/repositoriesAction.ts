'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { cache } from 'react';

import { getUserActiveTeam } from '@/app/actions/teamAction';
import { getUser } from '@/app/actions/userAction';
import repositoryDb from '@/lib/db/repositoryDb';
import {
  Repository,
  GitProvider,
  TestConnectionInput,
  TestRepositoryInput,
  RepositoryFilter,
  testRepositorySchema,
} from '@/types/context/repositoryContextType';
import { AuthUser } from '@/types/service/userServiceType';

// Repository related functions

/**
 * Get all repositories with optional filtering
 * @param filter Optional filter criteria for repositories
 */
export const getRepositories = cache(
  async (
    filter?: RepositoryFilter,
  ): Promise<{ success: boolean; error?: string; data?: Repository[] }> => {
    try {
      console.log('[@action:repositories:getRepositories] Starting...', { filter });

      // Get the authenticated user
      const user = await getUser();
      if (!user) {
        console.log('[@action:repositories:getRepositories] No authenticated user found');
        return { success: false, error: 'Unauthorized' };
      }

      // Get the user's active team ID
      const activeTeamResult = await getUserActiveTeam(user.id);
      if (!activeTeamResult || !activeTeamResult.id) {
        console.log('[@action:repositories:getRepositories] No active team found for user');
        return { success: false, error: 'No active team found' };
      }

      const teamId = activeTeamResult.id;
      console.log(
        `[@action:repositories:getRepositories] Fetching repositories for team: ${teamId}`,
      );

      const cookieStore = await cookies();

      // Call the repository module with team_id filter
      const result = await repositoryDb.getRepositories(cookieStore, teamId);

      if (!result.success || !result.data) {
        console.log('[@action:repositories:getRepositories] No repositories found');
        return { success: false, error: 'No repositories found' };
      }

      console.log('[@action:repositories:getRepositories] Successfully fetched repositories', {
        count: result.data.length,
      });

      return {
        success: true,
        data: result.data,
      };
    } catch (error: any) {
      console.log('[@action:repositories:getRepositories] Error fetching repositories', {
        error: error.message,
      });
      return { success: false, error: error.message || 'Failed to fetch repositories' };
    }
  },
);

/**
 * Create a new repository
 * @param data Repository data to create
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 */
export async function createRepository(
  data: Partial<Repository>,
  user?: AuthUser | null,
): Promise<{ success: boolean; error?: string; data?: Repository }> {
  try {
    console.log('[@action:repositories:createRepository] Starting...', {
      name: data.name,
      providerId: data.providerId,
      providerType: data.providerType,
    });

    // Use provided user data or fetch it if not provided
    const currentUser = user || (await getUser());
    if (!currentUser) {
      console.log('[@action:repositories:createRepository] Unauthorized access attempt');
      return {
        success: false,
        error: 'Unauthorized - Please sign in',
      };
    }

    // Get cookies once for all operations
    const cookieStore = await cookies();

    // Get the active team ID
    const selectedTeamCookie = cookieStore.get(`selected_team_${currentUser.id}`)?.value;
    const teamId = selectedTeamCookie || currentUser.teams?.[0]?.id;

    if (!teamId) {
      console.error(
        '[@action:repositories:createRepository] No team available for repository creation',
      );
      return {
        success: false,
        error: 'No team available for repository creation',
      };
    }

    // Prepare data for the repository module with the correct structure
    const repositoryData = {
      name: data.name || '',
      description: data.description || null,
      provider_id: data.providerId || '',
      provider_type: data.providerType || 'github',
      url: data.url || '',
      default_branch: data.defaultBranch || 'main',
      is_private: data.isPrivate || false,
      owner: data.owner || null,
      team_id: teamId,
      creator_id: currentUser.id,
    };

    console.log('[@action:repositories:createRepository] Calling repository.createRepository', {
      name: repositoryData.name,
      provider_id: repositoryData.provider_id,
      provider_type: repositoryData.provider_type,
      team_id: repositoryData.team_id,
      creator_id: repositoryData.creator_id,
    });

    // Call the repository module with proper types and pass cookieStore
    const result = await repositoryDb.createRepository(repositoryData, currentUser.id, cookieStore);

    if (!result.success || !result.data) {
      console.log('[@action:repositories:createRepository] Failed to create repository', {
        error: result.error,
        userId: currentUser.id,
      });
      return {
        success: false,
        error: result.error || 'Failed to create repository',
      };
    }

    // Revalidate repository paths
    revalidatePath('/[locale]/[tenant]/repositories');

    console.log('[@action:repositories:createRepository] Successfully created repository', {
      id: result.data.id,
      name: result.data.name,
      userId: currentUser.id,
    });

    return { success: true, data: result.data };
  } catch (error: any) {
    console.log('[@action:repositories:createRepository] Error creating repository', {
      error: error.message,
      stack: error.stack,
    });
    return { success: false, error: error.message || 'Failed to create repository' };
  }
}

/**
 * Update an existing repository
 * @param id Repository ID to update
 * @param updates Updates to apply to the repository
 */
export async function updateRepository(
  id: string,
  updates: Record<string, any>,
): Promise<{ success: boolean; error?: string; data?: Repository }> {
  try {
    console.log('[@action:repositories:updateRepository] Starting update', {
      repositoryId: id,
      updateFields: Object.keys(updates),
    });

    // Always get fresh user data from the server - don't rely on user from client
    const currentUserResult = await getUser();
    if (!currentUserResult) {
      console.log('[@action:repositories:updateRepository] Unauthorized access attempt', {
        repositoryId: id,
      });
      return {
        success: false,
        error: 'Unauthorized - Please sign in',
      };
    }

    // Get cookies once for all operations
    const cookieStore = await cookies();

    const currentUser = currentUserResult;
    console.log('[@action:repositories:updateRepository] User authenticated', {
      userId: currentUser.id,
      repositoryId: id,
    });

    // Call the repository module instead of direct db access
    const result = await repositoryDb.updateRepository(id, updates, currentUser.id, cookieStore);

    if (!result.success || !result.data) {
      console.log('[@action:repositories:updateRepository] Update failed', {
        repositoryId: id,
        error: result.error,
        userId: currentUser.id,
      });
      return {
        success: false,
        error: result.error || 'Repository not found or update failed',
      };
    }

    // Revalidate repository paths
    revalidatePath('/[locale]/[tenant]/repositories');

    console.log('[@action:repositories:updateRepository] Update successful', {
      repositoryId: id,
      userId: currentUser.id,
    });

    return { success: true, data: result.data };
  } catch (error: any) {
    console.log('[@action:repositories:updateRepository] Error updating repository', {
      repositoryId: id,
      error: error.message,
      stack: error.stack,
    });
    return { success: false, error: error.message || 'Failed to update repository' };
  }
}

/**
 * Delete a repository by ID
 * @param id Repository ID to delete
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 */
export async function deleteRepository(
  id: string,
  user?: AuthUser | null,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[@action:repositories:deleteRepository] Starting deletion', { repositoryId: id });

    // Use provided user data or fetch it if not provided
    const currentUser = user || (await getUser());
    if (!currentUser) {
      console.log('[@action:repositories:deleteRepository] Unauthorized access attempt', {
        repositoryId: id,
      });
      return {
        success: false,
        error: 'Unauthorized - Please sign in',
      };
    }

    // Get cookies once for all operations
    const cookieStore = await cookies();

    // First get the repository to confirm it exists
    const getRepoResult = await repositoryDb.getRepository(id, currentUser.id, cookieStore);

    if (!getRepoResult.success || !getRepoResult.data) {
      console.log('[@action:repositories:deleteRepository] Repository not found', {
        repositoryId: id,
        userId: currentUser.id,
      });
      return { success: false, error: 'Repository not found' };
    }

    // Call the repository module to delete
    const result = await repositoryDb.deleteRepository(id, currentUser.id, cookieStore);

    if (!result.success) {
      console.log('[@action:repositories:deleteRepository] Deletion failed', {
        repositoryId: id,
        error: result.error,
        userId: currentUser.id,
      });
      return {
        success: false,
        error: result.error || 'Failed to delete repository',
      };
    }

    // Revalidate repository paths
    revalidatePath('/[locale]/[tenant]/repositories');

    console.log('[@action:repositories:deleteRepository] Successfully deleted repository', {
      repositoryId: id,
      userId: currentUser.id,
    });

    return { success: true };
  } catch (error: any) {
    console.log('[@action:repositories:deleteRepository] Error deleting repository', {
      repositoryId: id,
      error: error.message,
      stack: error.stack,
    });
    return { success: false, error: error.message || 'Failed to delete repository' };
  }
}

/**
 * Synchronize a repository
 * @param id Repository ID to sync
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 */
export async function syncRepository(
  id: string,
  user?: AuthUser | null,
): Promise<{ success: boolean; error?: string; data?: Repository }> {
  try {
    console.log('[@action:repositories:syncRepository] Starting synchronization', {
      repositoryId: id,
    });

    // Use provided user data or fetch it if not provided
    const currentUser = user || (await getUser());
    if (!currentUser) {
      console.log('[@action:repositories:syncRepository] Unauthorized access attempt', {
        repositoryId: id,
      });
      return {
        success: false,
        error: 'Unauthorized - Please sign in',
      };
    }

    // In a real application, this would trigger a sync with the remote repository
    // For now, we'll just update the last_synced_at timestamp
    const updates = {
      last_synced_at: new Date().toISOString(),
      sync_status: 'SYNCED',
    };

    console.log('[@action:repositories:syncRepository] Updating repository sync status', {
      repositoryId: id,
      status: 'SYNCED',
    });

    const result = await repositoryDb.updateRepository(id, updates, currentUser.id);

    if (!result.success || !result.data) {
      console.log('[@action:repositories:syncRepository] Sync failed', {
        repositoryId: id,
        error: result.error,
        userId: currentUser.id,
      });
      return {
        success: false,
        error: result.error || 'Repository not found or sync failed',
      };
    }

    // Revalidate repository paths
    revalidatePath('/[locale]/[tenant]/repositories');

    console.log('[@action:repositories:syncRepository] Successfully synchronized repository', {
      repositoryId: id,
      userId: currentUser.id,
    });

    return { success: true, data: result.data };
  } catch (error: any) {
    console.log('[@action:repositories:syncRepository] Error synchronizing repository', {
      repositoryId: id,
      error: error.message,
      stack: error.stack,
    });
    return { success: false, error: error.message || 'Failed to sync repository' };
  }
}

/**
 * Create a repository from a URL (quick clone)
 * This is used when a user just enters a URL in the UI without connecting a Git provider
 */
export async function createRepositoryFromUrl(
  url: string,
  isPrivate: boolean = false,
  description?: string,
): Promise<{ success: boolean; error?: string; data?: Repository }> {
  try {
    console.log('[@action:repositories:createRepositoryFromUrl] Starting with URL:', url);

    const user = await getUser();
    if (!user) {
      console.log('[@action:repositories:createRepositoryFromUrl] No authenticated user found');
      return { success: false, error: 'Unauthorized' };
    }

    console.log('[@action:repositories:createRepositoryFromUrl] User ID:', user.id);

    // Prepare data for quick clone
    const quickCloneData = {
      url,
      is_private: isPrivate,
      description,
    };

    // Call the repository module
    console.log(
      '[@action:repositories:createRepositoryFromUrl] Calling repository.createRepositoryFromUrl with:',
      {
        url,
        is_private: isPrivate,
        description,
        profileId: user.id,
      },
    );

    // Use the repository module's createRepositoryFromUrl method
    const result = await repositoryDb.createRepositoryFromUrl(quickCloneData, user.id);

    console.log('[@action:repositories:createRepositoryFromUrl] Result from DB layer:', result);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Revalidate repository paths
    revalidatePath('/[locale]/[tenant]/repositories');

    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('[@action:repositories:createRepositoryFromUrl] Error:', error);
    return { success: false, error: error.message || 'Failed to create repository from URL' };
  }
}

/**
 * Get a repository by ID
 * This is an alias of getRepository with a different name to satisfy import requirements
 */
export const getRepositoryById = cache(
  async (id: string): Promise<{ success: boolean; error?: string; data?: Repository }> => {
    return getRepository(id);
  },
);

/**
 * Test repository connection with specific credentials
 */
export async function testRepositoryConnection(
  data: TestRepositoryInput,
): Promise<{ success: boolean; error?: string; status?: number }> {
  return testGitRepository(data);
}

/**
 * Connect a repository
 */
export async function connectRepository(
  data: any,
): Promise<{ success: boolean; error?: string; data?: Repository }> {
  return createRepository(data);
}

/**
 * Disconnect a repository
 */
export async function disconnectRepository(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  return deleteRepository(id);
}

export const getRepository = cache(
  async (id: string): Promise<{ success: boolean; error?: string; data?: Repository }> => {
    try {
      console.log(`[Server] getRepository: Starting for repository ${id}`);

      // Call the repository module - don't need to pass profile ID for non-tenant specific queries
      const result = await repositoryDb.getRepository(id);

      if (!result.success || !result.data) {
        return { success: false, error: 'Repository not found' };
      }

      return {
        success: true,
        data: result.data,
      };
    } catch (error: any) {
      console.error('[@action:repositories:getRepository] Error:', error);
      return { success: false, error: error.message || 'Failed to fetch repository' };
    }
  },
);

// Git Provider related functions

/**
 * Test a connection to a git provider
 */
export async function testGitProviderConnection(
  data: TestConnectionInput,
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    console.log('[@action:repositories:testGitProviderConnection] Starting with data:', {
      type: data.type,
      serverUrl: data.serverUrl || 'undefined',
      hasToken: data.token ? 'YES' : 'NO',
    });

    // This should be moved to repositoryDb or a gitService
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const baseUrl =
      data.type === 'gitea'
        ? data.serverUrl
        : data.type === 'github'
          ? 'https://api.github.com'
          : 'https://gitlab.com/api/v4';

    console.log('[@action:repositories:testGitProviderConnection] Using baseUrl:', baseUrl);

    console.log(
      '[@action:repositories:testGitProviderConnection] Making request to:',
      `${baseUrl}/api/v1/user`,
    );
    const response = await fetch(`${baseUrl}/api/v1/user`, {
      headers: {
        Authorization: `token ${data.token}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);
    console.log(
      '[@action:repositories:testGitProviderConnection] Response status:',
      response.status,
    );

    // Handle response
    if (!response.ok) {
      const errorText = await response.text();
      console.log('[@action:repositories:testGitProviderConnection] Error response:', errorText);
      return {
        success: false,
        error: 'Connection to git provider failed',
      };
    }

    return {
      success: true,
      message: 'Connection test successful',
    };
  } catch (error: any) {
    console.error('[@action:repositories:testGitProviderConnection] Error details:', error);

    // Handle specific errors
    if (error instanceof Error) {
      return {
        success: false,
        error: error.name === 'AbortError' ? 'Connection timeout after 5s' : error.message,
      };
    }

    return {
      success: false,
      error: error.message || 'Connection to git provider failed',
    };
  }
}

/**
 * List all git providers for the current user
 */
export const getGitProviders = cache(
  async (): Promise<{
    success: boolean;
    error?: string;
    data?: GitProvider[];
  }> => {
    try {
      console.log(`[Server] getGitProviders: Starting...`);
      const user = await getUser();
      if (!user) {
        return { success: false, error: 'Unauthorized', data: [] };
      }

      // Call the repository module instead of direct db access
      const result = await repositoryDb.getAllGitProviders();

      if (!result.success || !result.data) {
        console.error(`[Server] Failed to fetch git providers:`, result.error);
        return {
          success: false,
          error: result.error || 'Failed to fetch git providers',
        };
      }

      return { success: true, data: result.data };
    } catch (error: any) {
      console.error('[@action:repositories:getGitProviders] Error:', error);
      return { success: false, error: error.message || 'Failed to fetch git providers' };
    }
  },
);

/**
 * Get a git provider by ID
 */
export const getGitProvider = cache(
  async (id: string): Promise<{ success: boolean; error?: string; data?: GitProvider }> => {
    try {
      console.log(`[Server] getGitProvider: Starting for provider ${id}`);
      const user = await getUser();
      if (!user) {
        return { success: false, error: 'Unauthorized' };
      }

      // Call the repository module to get the git provider
      const result = await repositoryDb.getGitProvider(id);

      if (!result.success || !result.data) {
        console.error(`[Server] Git provider not found:`, result.error);
        return { success: false, error: 'Git provider not found' };
      }

      return { success: true, data: result.data };
    } catch (error: any) {
      console.error('[@action:repositories:getGitProvider] Error:', error);
      return { success: false, error: error.message || 'Failed to fetch git provider' };
    }
  },
);

/**
 * Test if a repository URL is accessible
 * This is different from testGitProviderConnection as it tests a specific repository URL
 * rather than the git provider API
 * @param data Repository URL and optional token
 */
export async function testGitRepository(
  data: TestRepositoryInput,
): Promise<{ success: boolean; error?: string; message?: string; status?: number }> {
  try {
    console.log('[testGitRepository] Starting with data:', {
      url: data.url,
      hasToken: data.token ? 'YES' : 'NO',
    });

    // Validate input data
    const validatedData = testRepositorySchema.parse(data);
    console.log('[testGitRepository] Data validated successfully');

    // Test connection with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    // Prepare headers
    const headers: Record<string, string> = {};
    if (validatedData.token) {
      headers.Authorization = `token ${validatedData.token}`;
    }

    console.log('[testGitRepository] Making request to:', validatedData.url);
    const response = await fetch(validatedData.url, {
      method: 'HEAD', // Use HEAD to just check if the URL is accessible
      headers,
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeout);
    console.log('[testGitRepository] Response status:', response.status);

    // Return status code for the calling component to handle
    return {
      success: response.ok,
      status: response.status,
      message: response.ok ? 'Repository is accessible' : 'Repository is not accessible',
    };
  } catch (error: any) {
    console.error('[testGitRepository] Error details:', error);

    // Handle specific errors
    if (error instanceof Error) {
      return {
        success: false,
        error: error.name === 'AbortError' ? 'Connection timeout after 5s' : error.message,
      };
    }

    return {
      success: false,
      error: 'Failed to test repository connection',
    };
  }
}

/**
 * Clear the repositories cache by revalidating the path
 */
export async function clearRepositoriesCache(): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // Revalidate repository paths
    revalidatePath('/[locale]/[tenant]/repositories');

    return {
      success: true,
      message: 'Repository cache cleared successfully',
    };
  } catch (error: any) {
    console.log('[@action:repositories:clearRepositoriesCache] Error clearing cache', {
      error: error.message,
    });
    return {
      success: false,
      message: `Failed to clear repository cache: ${error.message}`,
    };
  }
}
