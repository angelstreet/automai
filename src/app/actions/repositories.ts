'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

import {
  Repository,
  GitProvider,
  GitProviderType,
  RepositorySyncStatus,
  TestConnectionInput,
  GitProviderCreateInput,
  TestRepositoryInput,
  RepositoryFilter,
  gitProviderCreateSchema,
  testRepositorySchema,
} from '@/app/[locale]/[tenant]/repositories/types';
import { getUser } from '@/app/actions/user';
import {
  gitProvider as dbGitProvider,
  GitProvider as DbGitProvider,
} from '@/lib/supabase/db-repositories/db-git-provider';
import { repository as dbRepository } from '@/lib/supabase/db-repositories/db-repository';
import { AuthUser } from '@/types/user';

/**
 * Convert DB repository to our Repository type
 * @param dbRepo The database repository
 */
function mapDbRepositoryToRepository(dbRepo: any): Repository {
  // If the repository is null or undefined, return a default repository
  if (!dbRepo) {
    return {
      id: '',
      providerId: '',
      providerType: 'github',
      name: '',
      owner: '',
      defaultBranch: 'main',
      isPrivate: false,
      syncStatus: 'IDLE',
      createdAt: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  // Set sync status with a special case for synced repositories
  let syncStatus: RepositorySyncStatus = (dbRepo.sync_status || 'IDLE') as RepositorySyncStatus;

  // Special case for repositories that just had their timestamp updated
  if (dbRepo.last_synced_at && (!dbRepo.sync_status || dbRepo.sync_status === 'SYNCING')) {
    syncStatus = 'SYNCED';
  }

  return {
    id: String(dbRepo.id || ''),
    providerId: String(dbRepo.provider_id || ''),
    providerType: (dbRepo.provider_type || 'github') as GitProviderType,
    name: String(dbRepo.name || ''),
    owner: String(dbRepo.owner || ''),
    defaultBranch: String(dbRepo.default_branch || 'main'),
    isPrivate: Boolean(dbRepo.is_private),
    url: dbRepo.url ? String(dbRepo.url) : undefined,
    description: dbRepo.description ? String(dbRepo.description) : undefined,
    syncStatus: syncStatus,
    createdAt: dbRepo.created_at
      ? new Date(dbRepo.created_at).toISOString()
      : new Date().toISOString(),
    updated_at: dbRepo.updated_at
      ? new Date(dbRepo.updated_at).toISOString()
      : new Date().toISOString(),
    lastSyncedAt: dbRepo.last_synced_at ? new Date(dbRepo.last_synced_at).toISOString() : undefined,
    // Optional fields
    language: dbRepo.language || undefined,
  };
}

// Add a mapping function to convert DB GitProvider to interface GitProvider
function mapDbGitProviderToGitProvider(dbProvider: DbGitProvider): GitProvider {
  return {
    id: dbProvider.id,
    type: dbProvider.type,
    name: dbProvider.name,
    displayName: dbProvider.name, // Use name as displayName
    status: 'connected', // Default status
    serverUrl: dbProvider.server_url,
    createdAt: dbProvider.created_at,
    updatedAt: dbProvider.updated_at,
  };
}

// Repository related functions

/**
 * Get all repositories with optional filtering
 * @param filter Optional filter criteria for repositories
 */
export async function getRepositories(
  filter?: RepositoryFilter,
): Promise<{ success: boolean; error?: string; data?: Repository[] }> {
  try {
    console.log('[@action:repositories:getRepositories] Starting...', { filter });

    console.log('[@action:repositories:getRepositories] Fetching repositories from database');
    // Call the repository module instead of direct db access
    const cookieStore = await cookies();
    const result = await dbRepository.getRepositories(cookieStore);

    if (!result.success || !result.data) {
      console.log('[@action:repositories:getRepositories] No repositories found');
      return { success: false, error: 'No repositories found' };
    }

    // Map DB repositories to our Repository type
    const repositories = result.data.map(mapDbRepositoryToRepository);

    console.log('[@action:repositories:getRepositories] Successfully fetched repositories', {
      count: repositories.length,
    });

    return {
      success: true,
      data: repositories,
    };
  } catch (error: any) {
    console.log('[@action:repositories:getRepositories] Error fetching repositories', {
      error: error.message,
    });
    return { success: false, error: error.message || 'Failed to fetch repositories' };
  }
}

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
    };

    console.log('[@action:repositories:createRepository] Calling repository.createRepository', {
      name: repositoryData.name,
      provider_id: repositoryData.provider_id,
      provider_type: repositoryData.provider_type,
    });

    // Call the repository module with proper types
    const result = await dbRepository.createRepository(repositoryData, currentUser.id);

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

    // Map to our Repository type
    const mappedRepository: Repository = mapDbRepositoryToRepository(result.data);

    // Revalidate repository paths
    revalidatePath('/[locale]/[tenant]/repositories');

    console.log('[@action:repositories:createRepository] Successfully created repository', {
      id: mappedRepository.id,
      name: mappedRepository.name,
      userId: currentUser.id,
    });

    return { success: true, data: mappedRepository };
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

    const currentUser = currentUserResult;
    console.log('[@action:repositories:updateRepository] User authenticated', {
      userId: currentUser.id,
      repositoryId: id,
    });

    // Call the repository module instead of direct db access
    const result = await dbRepository.updateRepository(id, updates, currentUser.id);

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

    // Map to our Repository type
    const mappedRepository: Repository = mapDbRepositoryToRepository(result.data);

    // Revalidate repository paths
    revalidatePath('/[locale]/[tenant]/repositories');

    console.log('[@action:repositories:updateRepository] Update successful', {
      repositoryId: id,
      userId: currentUser.id,
    });

    return { success: true, data: mappedRepository };
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

    // First get the repository to confirm it exists
    const getRepoResult = await dbRepository.getRepository(id, currentUser.id);

    if (!getRepoResult.success || !getRepoResult.data) {
      console.log('[@action:repositories:deleteRepository] Repository not found', {
        repositoryId: id,
        userId: currentUser.id,
      });
      return { success: false, error: 'Repository not found' };
    }

    // Call the repository module to delete
    const result = await dbRepository.deleteRepository(id, currentUser.id);

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

    // Call the repository module to update
    const updates = {
      last_synced_at: new Date().toISOString(),
      sync_status: 'SYNCED',
    };

    console.log('[@action:repositories:syncRepository] Updating repository sync status', {
      repositoryId: id,
      status: 'SYNCED',
    });

    const result = await dbRepository.updateRepository(id, updates, currentUser.id);

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

    // Map to our Repository type
    const mappedRepository: Repository = mapDbRepositoryToRepository(result.data);

    // Revalidate repository paths
    revalidatePath('/[locale]/[tenant]/repositories');

    console.log('[@action:repositories:syncRepository] Successfully synchronized repository', {
      repositoryId: id,
      userId: currentUser.id,
    });

    return { success: true, data: mappedRepository };
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
    const result = await dbRepository.createRepositoryFromUrl(quickCloneData, user.id);

    console.log('[@action:repositories:createRepositoryFromUrl] Result from DB layer:', result);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Transform the repository to match the UI's expected format
    const repoData: Repository = mapDbRepositoryToRepository(result.data);

    // Revalidate repository paths
    revalidatePath('/[locale]/[tenant]/repositories');

    return { success: true, data: repoData };
  } catch (error: any) {
    console.error('[@action:repositories:createRepositoryFromUrl] Error:', error);
    return { success: false, error: error.message || 'Failed to create repository from URL' };
  }
}

/**
 * Get a repository by ID
 *
 * @param id Repository ID
 */
export async function getRepository(
  id: string,
): Promise<{ success: boolean; error?: string; data?: Repository }> {
  try {
    console.log(`[Server] getRepository: Starting for repository ${id}`);

    console.log(`[Server] Fetching repository ${id} from database`);

    // Call the repository module - don't need to pass profile ID for non-tenant specific queries
    const result = await dbRepository.getRepository(id);

    if (!result.success || !result.data) {
      return { success: false, error: 'Repository not found' };
    }

    return {
      success: true,
      data: mapDbRepositoryToRepository(result.data),
    };
  } catch (error: any) {
    console.error('[@action:repositories:getRepository] Error:', error);
    return { success: false, error: error.message || 'Failed to fetch repository' };
  }
}

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
    console.log('[@action:repositories:testGitProviderConnection] Data validated successfully');

    // Test connection with timeout
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
export async function getGitProviders(): Promise<{
  success: boolean;
  error?: string;
  data?: GitProvider[];
}> {
  try {
    console.log(`[Server] getGitProviders: Starting...`);
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized', data: [] };
    }

    // Call the gitProvider module instead of direct db access
    const result = await dbGitProvider.getGitProviders(user.id);

    if (!result.success || !result.data) {
      console.error(`[Server] Failed to fetch git providers:`, result.error);
      return {
        success: false,
        error: result.error || 'Failed to fetch git providers',
      };
    }

    // Map DB results to interface type
    const providers = result.data.map((provider: DbGitProvider) =>
      mapDbGitProviderToGitProvider(provider),
    );

    return { success: true, data: providers };
  } catch (error: any) {
    console.error('[@action:repositories:getGitProviders] Error:', error);
    return { success: false, error: error.message || 'Failed to fetch git providers' };
  }
}

/**
 * Get a git provider by ID
 */
export async function getGitProvider(
  id: string,
): Promise<{ success: boolean; error?: string; data?: GitProvider }> {
  try {
    console.log(`[Server] getGitProvider: Starting for provider ${id}`);
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Call the gitProvider module instead of direct db access
    const result = await dbGitProvider.getGitProvider(id, user.id);

    if (!result.success || !result.data) {
      console.error(`[Server] Git provider not found:`, result.error);
      return { success: false, error: 'Git provider not found' };
    }

    // Map DB result to interface type
    const provider = mapDbGitProviderToGitProvider(result.data);

    return { success: true, data: provider };
  } catch (error: any) {
    console.error('[@action:repositories:getGitProvider] Error:', error);
    return { success: false, error: error.message || 'Failed to fetch git provider' };
  }
}

/**
 * Delete a git provider by ID
 */
export async function deleteGitProvider(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[Server] deleteGitProvider: Starting for provider ${id}`);
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Call the gitProvider module instead of direct db access
    const result = await dbGitProvider.deleteGitProvider(id, user.id);

    if (!result.success) {
      console.error(`[Server] Failed to delete git provider:`, result.error);
      return { success: false, error: result.error };
    }

    // Revalidate repository paths
    revalidatePath('/[locale]/[tenant]/repositories');

    return { success: true };
  } catch (error: any) {
    console.error('[@action:repositories:deleteGitProvider] Error:', error);
    return { success: false, error: error.message || 'Failed to delete git provider' };
  }
}

export async function addGitProvider(provider: {
  name: string;
  type: 'github' | 'gitlab' | 'gitea' | 'self-hosted';
  access_token?: string;
  profile_id: string;
  server_url?: string;
}): Promise<GitProvider> {
  try {
    console.log(`[Server] addGitProvider: Starting...`);

    // Map to DB schema
    const gitProviderData = {
      name: provider.name,
      type: provider.type,
      access_token: provider.access_token || '',
      profile_id: provider.profile_id,
    };

    // Call the gitProvider module instead of direct db access
    const result = await dbGitProvider.createGitProvider(gitProviderData);

    if (!result.success || !result.data) {
      console.error(`[Server] Failed to create git provider:`, result.error);
      throw new Error(result.error || 'Failed to create git provider');
    }

    // Revalidate repository paths
    revalidatePath('/[locale]/[tenant]/repositories');

    return mapDbGitProviderToGitProvider(result.data);
  } catch (error) {
    console.error('[@action:repositories:addGitProvider] Error:', error);
    throw error;
  }
}

export async function updateGitProvider(
  id: string,
  updates: Partial<{
    name: string;
    type: string;
    access_token: string;
    server_url?: string;
  }>,
): Promise<GitProvider> {
  try {
    console.log(`[Server] updateGitProvider: Starting for provider ${id}`);
    const user = await getUser();

    if (!user) {
      throw new Error('Unauthorized');
    }

    // Map updates to DB schema
    const gitProviderUpdates = {
      ...updates,
      // Ensure no profile_id override for security
      profile_id: undefined,
    };

    // Call the gitProvider module instead of direct db access
    const result = await dbGitProvider.updateGitProvider(id, gitProviderUpdates, user.id);

    if (!result.success || !result.data) {
      console.error(`[Server] Failed to update git provider:`, result.error);
      throw new Error(result.error || 'Failed to update git provider');
    }

    // Revalidate repository paths
    revalidatePath('/[locale]/[tenant]/repositories');

    return mapDbGitProviderToGitProvider(result.data);
  } catch (error) {
    console.error('[@action:repositories:updateGitProvider] Error:', error);
    throw error;
  }
}

export async function refreshGitProvider(id: string): Promise<GitProvider> {
  try {
    console.log(`[Server] refreshGitProvider: Starting for provider ${id}`);
    const user = await getUser();

    if (!user) {
      throw new Error('Unauthorized');
    }

    // Call the gitProvider.refreshGitProvider method instead of updateGitProvider
    const result = await dbGitProvider.refreshGitProvider(id, user.id);

    if (!result.success || !result.data) {
      console.error(`[Server] Failed to refresh git provider:`, result.error);
      throw new Error(result.error || 'Failed to refresh git provider');
    }

    // Revalidate repository paths
    revalidatePath('/[locale]/[tenant]/repositories');

    return mapDbGitProviderToGitProvider(result.data);
  } catch (error) {
    console.error('[@action:repositories:refreshGitProvider] Error:', error);
    throw error;
  }
}

/**
 * Handle OAuth callback for git providers
 */
export async function handleOAuthCallback(
  code: string,
  state: string,
): Promise<{ success: boolean; error?: string; redirectUrl?: string }> {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Parse the state parameter
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString('utf-8'));
    } catch {
      return { success: false, error: 'Invalid state parameter' };
    }

    const { providerId, redirectUri } = stateData;

    // Call the gitProvider module instead of direct db access
    const result = await dbGitProvider.handleOAuthCallback(code, providerId, user.id);

    if (!result.success) {
      console.error(
        '[@action:repositories:handleOAuthCallback] Failed to handle callback:',
        result.error,
      );
      return { success: false, error: result.error || 'Failed to handle OAuth callback' };
    }

    // Revalidate repository paths
    revalidatePath('/[locale]/[tenant]/repositories');

    return {
      success: true,
      redirectUrl: redirectUri || '/repositories',
    };
  } catch (error: any) {
    console.error('[@action:repositories:handleOAuthCallback] Error:', error);
    return { success: false, error: error.message || 'Failed to handle OAuth callback' };
  }
}

/**
 * Create a git provider
 */
export async function createGitProvider(
  data: GitProviderCreateInput,
): Promise<{ success: boolean; error?: string; data?: any; authUrl?: string }> {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    // Validate input data
    const validatedData = gitProviderCreateSchema.parse(data);

    // Call the gitProvider module instead of direct db access
    const result = await dbGitProvider.createGitProviderWithSchema(
      {
        type: validatedData.type,
        displayName: validatedData.displayName,
        serverUrl: validatedData.serverUrl,
        token: validatedData.token,
      },
      user.id,
    );

    if (!result.success || !result.data) {
      console.error(
        '[@action:repositories:createGitProvider] Failed to create provider:',
        result.error,
      );
      return { success: false, error: result.error };
    }

    // Extract provider and authUrl from the result
    const { provider, authUrl } = result.data;

    // Revalidate repository paths
    revalidatePath('/[locale]/[tenant]/repositories');

    return {
      success: true,
      data: provider,
      authUrl,
    };
  } catch (error: any) {
    console.error('[@action:repositories:createGitProvider] Error:', error);
    return { success: false, error: error.message || 'Failed to create git provider' };
  }
}

/**
 * Get files from a repository
 * @param repositoryId The repository ID
 * @param path The directory path (optional)
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 */
export async function getRepositoryFiles(
  repositoryId: string,
  path?: string,
  user?: AuthUser | null,
): Promise<{ success: boolean; error?: string; data?: any[] }> {
  try {
    console.log(
      '[actions.getRepositoryFiles] Starting with repository ID:',
      repositoryId,
      'path:',
      path,
    );

    // Use provided user data or fetch it if not provided
    const currentUser = user || (await getUser());
    if (!currentUser) {
      console.log('[actions.getRepositoryFiles] No authenticated user found');
      return { success: false, error: 'Unauthorized' };
    }

    // Since we don't store files in the database, return a mock empty result
    console.log(
      '[actions.getRepositoryFiles] Files are not stored in the database, returning empty result',
    );
    return { success: true, data: [] };
  } catch (error: any) {
    console.error('[@action:repositories:getRepositoryFiles] Error:', error);
    return { success: false, error: error.message || 'Failed to fetch repository files' };
  }
}

/**
 * Get file content from a repository
 * @param repositoryId The repository ID
 * @param path The file path
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 */
export async function getFileContent(
  repositoryId: string,
  path: string,
  user?: AuthUser | null,
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    console.log(
      '[actions.getFileContent] Starting with repository ID:',
      repositoryId,
      'path:',
      path,
    );

    // Use provided user data or fetch it if not provided
    const currentUser = user || (await getUser());
    if (!currentUser) {
      console.log('[actions.getFileContent] No authenticated user found');
      return { success: false, error: 'Unauthorized' };
    }

    if (!path) {
      return { success: false, error: 'File path is required' };
    }

    // Since we don't store files in the database, return a mock result
    console.log(
      '[actions.getFileContent] Files are not stored in the database, returning mock result',
    );
    return {
      success: true,
      data: {
        id: 'mock-file',
        repository_id: repositoryId,
        path: path,
        content: '',
        size: 0,
        last_commit: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    console.error('Error in getFileContent:', error);
    return { success: false, error: error.message || 'Failed to fetch file content' };
  }
}

/**
 * Get all repositories with optional filtering
 * This is the main function for fetching repositories for display
 * @param filter Optional filter criteria for repositories
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 */
export async function getAllRepositories(
  filter?: RepositoryFilter,
  user?: AuthUser | null,
): Promise<{
  success: boolean;
  error?: string;
  data?: Repository[];
}> {
  try {
    console.log('[@action:repositories:getAllRepositories] Starting...');

    // Try to use provided user data or fetch it if not provided
    let currentUser = user;
    if (!currentUser) {
      try {
        const userResult = await getUser();
        currentUser = userResult;
      } catch (userError) {
        console.error(
          '[@action:repositories:getAllRepositories] Error fetching current user:',
          userError,
        );
        // Continue with null user in case of error
      }
    }

    // Fetch repositories
    const reposResult = await getRepositories(filter);
    console.log('[@action:repositories:getAllRepositories] Repository fetch result:', {
      success: reposResult.success,
      count: reposResult.data?.length || 0,
      error: reposResult.error,
    });

    if (!reposResult.success || !reposResult.data) {
      return {
        success: false,
        error: reposResult.error || 'Failed to fetch repositories',
      };
    }

    return {
      success: true,
      data: reposResult.data,
    };
  } catch (error: any) {
    console.error('[@action:repositories:getAllRepositories] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch repository data',
    };
  }
}

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
      message: 'Cache cleared by revalidating paths',
    };
  } catch (error) {
    console.error('Error clearing repositories cache:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
