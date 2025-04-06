'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { cache } from 'react';

import { getUserActiveTeam } from '@/app/actions/teamAction';
import { getUser } from '@/app/actions/userAction';
import repositoryDb from '@/lib/db/repositoryDb';
import { Repository, RepositoryFilter } from '@/types/context/repositoryContextType';

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
 * Get a repository by ID
 */
export const getRepository = cache(
  async (id: string): Promise<{ success: boolean; error?: string; data?: Repository }> => {
    try {
      console.log(`[@action:repositories:getRepository] Starting for repository ${id}`);

      // Get the authenticated user
      const user = await getUser();
      if (!user) {
        console.log('[@action:repositories:getRepository] No authenticated user found');
        return { success: false, error: 'Unauthorized' };
      }

      // Get cookie store once for all operations
      const cookieStore = await cookies();

      // Call the repository module
      const result = await repositoryDb.getRepository(id, undefined, cookieStore);

      if (!result.success || !result.data) {
        console.log(`[@action:repositories:getRepository] Repository not found: ${id}`);
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

/**
 * Connect to a repository (public or private)
 * @param data Repository data to connect
 */
export async function connectRepository(
  data: Partial<Repository>,
): Promise<{ success: boolean; error?: string; data?: Repository }> {
  try {
    console.log('[@action:repositories:connectRepository] Starting...', {
      url: data.url,
    });

    // Get authenticated user
    const currentUser = await getUser();
    if (!currentUser) {
      console.log('[@action:repositories:connectRepository] Unauthorized access attempt');
      return {
        success: false,
        error: 'Unauthorized - Please sign in',
      };
    }

    // Get cookies once for all operations
    const cookieStore = await cookies();

    // Get the active team ID
    const activeTeamResult = await getUserActiveTeam(currentUser.id);
    if (!activeTeamResult || !activeTeamResult.id) {
      console.error('[@action:repositories:connectRepository] No active team found for user');
      return { success: false, error: 'No active team found' };
    }

    const teamId = activeTeamResult.id;

    // If this is a quick clone (just URL provided)
    if (data.url && !data.provider_id) {
      console.log('[@action:repositories:connectRepository] Quick clone using URL', {
        url: data.url,
      });

      // Prepare data for quick clone
      const quickCloneData = {
        url: data.url,
        is_private: data.isPrivate || false,
        description: data.description || null,
        team_id: teamId,
        default_branch: data.defaultBranch || 'main',
      };

      console.log(
        '[@action:repositories:connectRepository] Using default branch:',
        quickCloneData.default_branch,
      );

      // Use the repository module's createRepositoryFromUrl method
      const result = await repositoryDb.createRepositoryFromUrl(
        quickCloneData,
        currentUser.id,
        cookieStore,
      );

      if (!result.success) {
        return { success: false, error: result.error };
      }

      // Revalidate repository paths
      revalidatePath('/[locale]/[tenant]/repositories');

      return { success: true, data: result.data };
    }

    // Otherwise, this is a standard repository connection
    // Prepare data for the repository module with the correct structure
    const repositoryData = {
      name: data.name || '',
      description: data.description || null,
      provider_id: data.provider_id || '',
      provider_type: data.providerType || 'github',
      url: data.url || '',
      default_branch: data.defaultBranch || 'main',
      is_private: data.isPrivate || false,
      owner: data.owner || null,
      team_id: teamId,
      creator_id: currentUser.id,
    };

    console.log('[@action:repositories:connectRepository] Creating repository with data:', {
      name: repositoryData.name,
      provider_id: repositoryData.provider_id,
      provider_type: repositoryData.provider_type,
      team_id: repositoryData.team_id,
    });

    // Call the repository module
    const result = await repositoryDb.createRepository(repositoryData, currentUser.id, cookieStore);

    if (!result.success || !result.data) {
      console.log('[@action:repositories:connectRepository] Failed to connect repository', {
        error: result.error,
      });
      return {
        success: false,
        error: result.error || 'Failed to connect repository',
      };
    }

    // Revalidate repository paths
    revalidatePath('/[locale]/[tenant]/repositories');

    console.log('[@action:repositories:connectRepository] Successfully connected repository', {
      id: result.data.id,
      name: result.data.name,
    });

    return { success: true, data: result.data };
  } catch (error: any) {
    console.log('[@action:repositories:connectRepository] Error connecting repository', {
      error: error.message,
      stack: error.stack,
    });
    return { success: false, error: error.message || 'Failed to connect repository' };
  }
}

/**
 * Disconnect a repository (delete it)
 * @param id Repository ID to disconnect
 */
export async function disconnectRepository(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[@action:repositories:disconnectRepository] Starting...', { repositoryId: id });

    // Get authenticated user
    const currentUser = await getUser();
    if (!currentUser) {
      console.log('[@action:repositories:disconnectRepository] Unauthorized access attempt', {
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
      console.log('[@action:repositories:disconnectRepository] Repository not found', {
        repositoryId: id,
      });
      return { success: false, error: 'Repository not found' };
    }

    // Call the repository module to delete
    const result = await repositoryDb.deleteRepository(id, currentUser.id, cookieStore);

    if (!result.success) {
      console.log('[@action:repositories:disconnectRepository] Deletion failed', {
        repositoryId: id,
        error: result.error,
      });
      return {
        success: false,
        error: result.error || 'Failed to disconnect repository',
      };
    }

    // Revalidate repository paths
    revalidatePath('/[locale]/[tenant]/repositories');

    console.log(
      '[@action:repositories:disconnectRepository] Successfully disconnected repository',
      {
        repositoryId: id,
      },
    );

    return { success: true };
  } catch (error: any) {
    console.log('[@action:repositories:disconnectRepository] Error disconnecting repository', {
      repositoryId: id,
      error: error.message,
      stack: error.stack,
    });
    return { success: false, error: error.message || 'Failed to disconnect repository' };
  }
}

/**
 * Test repository access
 * @param data Repository data to test
 */
export async function testGitRepository(data: {
  url: string;
  token?: string;
}): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    console.log('[@action:repositories:testGitRepository] Testing repository access', {
      url: data.url,
    });

    // Get authenticated user for logging purposes
    const currentUser = await getUser();
    const userId = currentUser?.id || 'anonymous';

    console.log(
      `[@action:repositories:testGitRepository] User ${userId} testing repository URL: ${data.url}`,
    );

    // Import gitService directly
    const gitService = await import('@/lib/services/gitService');

    // Test the repository access using gitService
    const result = await gitService.testGitRepositoryAccess({
      url: data.url,
      token: data.token,
    });

    if (result.success) {
      console.log('[@action:repositories:testGitRepository] Repository is accessible', {
        url: data.url,
      });
      return {
        success: true,
        message: 'Repository is accessible',
      };
    } else {
      console.log('[@action:repositories:testGitRepository] Repository is not accessible', {
        url: data.url,
        error: result.error,
      });
      return {
        success: false,
        error: result.error || 'Repository is not accessible',
      };
    }
  } catch (error: any) {
    console.error('[@action:repositories:testGitRepository] Error testing repository access', {
      url: data.url,
      error: error.message,
    });
    return {
      success: false,
      error: error.message || 'An unexpected error occurred',
    };
  }
}
