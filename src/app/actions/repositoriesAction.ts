'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { cache } from 'react';

import { getUserActiveTeam } from '@/app/actions/teamAction';
import { getUser } from '@/app/actions/userAction';
import repositoryDb from '@/lib/db/repositoryDb';
import {
  Repository,
  TestConnectionInput,
  TestRepositoryInput,
  RepositoryFilter,
  testRepositorySchema,
} from '@/types/context/repositoryContextType';

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
      name: data.name,
      providerType: data.providerType,
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
    if (data.url && !data.providerId) {
      console.log('[@action:repositories:connectRepository] Quick clone using URL', {
        url: data.url,
      });

      // Prepare data for quick clone
      const quickCloneData = {
        url: data.url,
        is_private: data.isPrivate || false,
        description: data.description || null,
        team_id: teamId,
      };

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
      provider_id: data.providerId || '',
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
 * Test connection to a Git provider
 * @param data Provider connection data
 */
export async function testGitProvider(
  data: TestConnectionInput,
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    console.log('[@action:repositories:testGitProvider] Starting with data:', {
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

    console.log('[@action:repositories:testGitProvider] Using baseUrl:', baseUrl);

    console.log(
      '[@action:repositories:testGitProvider] Making request to:',
      `${baseUrl}/api/v1/user`,
    );
    const response = await fetch(`${baseUrl}/api/v1/user`, {
      headers: {
        Authorization: `token ${data.token}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);
    console.log('[@action:repositories:testGitProvider] Response status:', response.status);

    // Handle response
    if (!response.ok) {
      const errorText = await response.text();
      console.log('[@action:repositories:testGitProvider] Error response:', errorText);
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
    console.error('[@action:repositories:testGitProvider] Error details:', error);

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
 * Test if a repository URL is accessible
 * @param data Repository URL and optional token
 */
export async function testGitRepository(
  data: TestRepositoryInput,
): Promise<{ success: boolean; error?: string; message?: string; status?: number }> {
  try {
    console.log('[@action:repositories:testGitRepository] Starting with data:', {
      url: data.url,
      hasToken: data.token ? 'YES' : 'NO',
    });

    // Validate input data
    const validatedData = testRepositorySchema.parse(data);
    console.log('[@action:repositories:testGitRepository] Data validated successfully');

    // Test connection with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    // Prepare headers
    const headers: Record<string, string> = {};
    if (validatedData.token) {
      headers.Authorization = `token ${validatedData.token}`;
    }

    console.log('[@action:repositories:testGitRepository] Making request to:', validatedData.url);
    const response = await fetch(validatedData.url, {
      method: 'HEAD', // Use HEAD to just check if the URL is accessible
      headers,
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeout);
    console.log('[@action:repositories:testGitRepository] Response status:', response.status);

    // Return status code for the calling component to handle
    return {
      success: response.ok,
      status: response.status,
      message: response.ok ? 'Repository is accessible' : 'Repository is not accessible',
    };
  } catch (error: any) {
    console.error('[@action:repositories:testGitRepository] Error details:', error);

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
