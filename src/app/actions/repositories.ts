'use server';

import { revalidatePath } from 'next/cache';

import {
  Repository,
  GitProvider,
  GitProviderType,
  RepositorySyncStatus,
  TestConnectionInput,
  GitProviderCreateInput,
  TestRepositoryInput,
  RepositoryFilter,
  testConnectionSchema,
  gitProviderCreateSchema,
  testRepositorySchema,
} from '@/app/[locale]/[tenant]/repositories/types';
import { getUser } from '@/app/actions/user';
import { starRepository, repository, files, gitProvider } from '@/lib/supabase/db-repositories';
import { GitProvider as DbGitProvider } from '@/lib/supabase/db-repositories/git-provider';
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
    console.log('[Server] getRepositories: Starting...');

    console.log('[Server] Fetching repositories from database');
    // Call the repository module instead of direct db access
    const result = await repository.getRepositories();

    if (!result.success || !result.data) {
      return { success: false, error: 'No repositories found' };
    }

    // Map DB repositories to our Repository type
    const repositories = result.data.map(mapDbRepositoryToRepository);

    return {
      success: true,
      data: repositories,
    };
  } catch (error: any) {
    console.error('Error in getRepositories:', error);
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
    console.log('[Server] createRepository: Starting...');
    // Use provided user data or fetch it if not provided
    const currentUser = user || (await getUser());
    if (!currentUser) {
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

    // Only log non-sensitive data
    console.log('[Server] Calling repository.createRepository with data:', repositoryData);

    // Call the repository module with proper types
    const result = await repository.createRepository(repositoryData, currentUser.id);

    if (!result.success || !result.data) {
      console.error('[Server] Failed to create repository:', result.error);
      return {
        success: false,
        error: result.error || 'Failed to create repository',
      };
    }

    // Map to our Repository type
    const mappedRepository: Repository = mapDbRepositoryToRepository(result.data);

    // Revalidate repository paths
    revalidatePath('/[locale]/[tenant]/repositories');

    return { success: true, data: mappedRepository };
  } catch (error: any) {
    console.error('[Server] Error in createRepository:', error);
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
    console.log(`[Server] updateRepository: Starting update for repo ${id}`);

    // Always get fresh user data from the server - don't rely on user from client
    const currentUserResult = await getUser();
    if (!currentUserResult) {
      console.log('[Server] updateRepository: Failed - user not authenticated');
      return {
        success: false,
        error: 'Unauthorized - Please sign in',
      };
    }

    const currentUser = currentUserResult;
    console.log(`[Server] updateRepository: User authenticated, profile_id: ${currentUser.id}`);
    console.log(`[Server] updateRepository: Using direct snake_case column names:`, updates);

    // Call the repository module instead of direct db access
    const result = await repository.updateRepository(id, updates, currentUser.id);

    if (!result.success || !result.data) {
      console.log(`[Server] updateRepository: Failed - ${result.error}`);
      return {
        success: false,
        error: result.error || 'Repository not found or update failed',
      };
    }

    // Map to our Repository type
    const mappedRepository: Repository = mapDbRepositoryToRepository(result.data);

    // Revalidate repository paths
    revalidatePath('/[locale]/[tenant]/repositories');

    console.log(`[Server] updateRepository: Success - updated repo ${id}`);

    return { success: true, data: mappedRepository };
  } catch (error: any) {
    console.error('[Server] Error in updateRepository:', error);
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
    console.log(`[Server] deleteRepository: Starting for repo ${id}`);
    // Use provided user data or fetch it if not provided
    const currentUser = user || (await getUser());
    if (!currentUser) {
      return {
        success: false,
        error: 'Unauthorized - Please sign in',
      };
    }

    // First get the repository to confirm it exists
    const getRepoResult = await repository.getRepository(id, currentUser.id);

    if (!getRepoResult.success || !getRepoResult.data) {
      return { success: false, error: 'Repository not found' };
    }

    // Call the repository module to delete
    const result = await repository.deleteRepository(id, currentUser.id);

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to delete repository',
      };
    }

    // Revalidate repository paths
    revalidatePath('/[locale]/[tenant]/repositories');

    return { success: true };
  } catch (error: any) {
    console.error('[Server] Error in deleteRepository:', error);
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
    console.log(`[Server] syncRepository: Starting for repo ${id}`);
    // Use provided user data or fetch it if not provided
    const currentUser = user || (await getUser());
    if (!currentUser) {
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

    const result = await repository.updateRepository(id, updates, currentUser.id);

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error || 'Repository not found or sync failed',
      };
    }

    // Map to our Repository type
    const mappedRepository: Repository = mapDbRepositoryToRepository(result.data);

    // Revalidate repository paths
    revalidatePath('/[locale]/[tenant]/repositories');

    return { success: true, data: mappedRepository };
  } catch (error: any) {
    console.error('[Server] Error in syncRepository:', error);
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
    console.log('[actions.createRepositoryFromUrl] Starting with URL:', url);

    const user = await getUser();
    if (!user) {
      console.log('[actions.createRepositoryFromUrl] No authenticated user found');
      return { success: false, error: 'Unauthorized' };
    }

    console.log('[actions.createRepositoryFromUrl] User ID:', user.id);

    // Prepare data for quick clone
    const quickCloneData = {
      url,
      is_private: isPrivate,
      description,
    };

    // Call the repository module
    console.log(
      '[actions.createRepositoryFromUrl] Calling repository.createRepositoryFromUrl with:',
      {
        url,
        is_private: isPrivate,
        description,
        profileId: user.id,
      },
    );

    // Use the repository module's createRepositoryFromUrl method
    const result = await repository.createRepositoryFromUrl(quickCloneData, user.id);

    console.log('[actions.createRepositoryFromUrl] Result from DB layer:', result);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Transform the repository to match the UI's expected format
    const repoData: Repository = mapDbRepositoryToRepository(result.data);

    // Revalidate repository paths
    revalidatePath('/[locale]/[tenant]/repositories');

    return { success: true, data: repoData };
  } catch (error: any) {
    console.error('Error in createRepositoryFromUrl:', error);
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
    const result = await repository.getRepository(id);

    if (!result.success || !result.data) {
      return { success: false, error: 'Repository not found' };
    }

    return {
      success: true,
      data: mapDbRepositoryToRepository(result.data),
    };
  } catch (error: any) {
    console.error('Error in getRepository:', error);
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
    console.log('[testGitProviderConnection] Starting with data:', {
      type: data.type,
      serverUrl: data.serverUrl || 'undefined',
      hasToken: data.token ? 'YES' : 'NO',
    });

    // Validate input data
    const validatedData = testConnectionSchema.parse(data);
    console.log('[testGitProviderConnection] Data validated successfully');

    // Test connection with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const baseUrl =
      validatedData.type === 'gitea'
        ? validatedData.serverUrl
        : validatedData.type === 'github'
          ? 'https://api.github.com'
          : 'https://gitlab.com/api/v4';

    console.log('[testGitProviderConnection] Using baseUrl:', baseUrl);

    console.log('[testGitProviderConnection] Making request to:', `${baseUrl}/api/v1/user`);
    const response = await fetch(`${baseUrl}/api/v1/user`, {
      headers: {
        Authorization: `token ${validatedData.token}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);
    console.log('[testGitProviderConnection] Response status:', response.status);

    // Handle response
    if (!response.ok) {
      const errorText = await response.text();
      console.log('[testGitProviderConnection] Error response:', errorText);
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
    console.error('[testGitProviderConnection] Error details:', error);

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
    const result = await gitProvider.getGitProviders(user.id);

    if (!result.success || !result.data) {
      console.error(`[Server] Failed to fetch git providers:`, result.error);
      return {
        success: false,
        error: result.error || 'Failed to fetch git providers',
      };
    }

    // Map DB results to interface type
    const providers = result.data.map((provider) => mapDbGitProviderToGitProvider(provider));

    return { success: true, data: providers };
  } catch (error: any) {
    console.error('Error in getGitProviders:', error);
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
    const result = await gitProvider.getGitProvider(id, user.id);

    if (!result.success || !result.data) {
      console.error(`[Server] Git provider not found:`, result.error);
      return { success: false, error: 'Git provider not found' };
    }

    // Map DB result to interface type
    const provider = mapDbGitProviderToGitProvider(result.data);

    return { success: true, data: provider };
  } catch (error: any) {
    console.error('Error in getGitProvider:', error);
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
    const result = await gitProvider.deleteGitProvider(id, user.id);

    if (!result.success) {
      console.error(`[Server] Failed to delete git provider:`, result.error);
      return { success: false, error: result.error };
    }

    // Revalidate repository paths
    revalidatePath('/[locale]/[tenant]/repositories');

    return { success: true };
  } catch (error: any) {
    console.error('Error in deleteGitProvider:', error);
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
    const result = await gitProvider.createGitProvider(gitProviderData);

    if (!result.success || !result.data) {
      console.error(`[Server] Failed to create git provider:`, result.error);
      throw new Error(result.error || 'Failed to create git provider');
    }

    // Revalidate repository paths
    revalidatePath('/[locale]/[tenant]/repositories');

    return mapDbGitProviderToGitProvider(result.data);
  } catch (error) {
    console.error('Error in addGitProvider:', error);
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
    const result = await gitProvider.updateGitProvider(id, gitProviderUpdates, user.id);

    if (!result.success || !result.data) {
      console.error(`[Server] Failed to update git provider:`, result.error);
      throw new Error(result.error || 'Failed to update git provider');
    }

    // Revalidate repository paths
    revalidatePath('/[locale]/[tenant]/repositories');

    return mapDbGitProviderToGitProvider(result.data);
  } catch (error) {
    console.error('Error in updateGitProvider:', error);
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
    const result = await gitProvider.refreshGitProvider(id, user.id);

    if (!result.success || !result.data) {
      console.error(`[Server] Failed to refresh git provider:`, result.error);
      throw new Error(result.error || 'Failed to refresh git provider');
    }

    // Revalidate repository paths
    revalidatePath('/[locale]/[tenant]/repositories');

    return mapDbGitProviderToGitProvider(result.data);
  } catch (error) {
    console.error('Error in refreshGitProvider:', error);
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
    } catch (e) {
      return { success: false, error: 'Invalid state parameter' };
    }

    const { providerId, redirectUri } = stateData;

    // Call the gitProvider module instead of direct db access
    const result = await gitProvider.handleOAuthCallback(code, providerId, user.id);

    if (!result.success) {
      console.error('[Server] Failed to handle OAuth callback:', result.error);
      return { success: false, error: result.error || 'Failed to handle OAuth callback' };
    }

    // Revalidate repository paths
    revalidatePath('/[locale]/[tenant]/repositories');

    return {
      success: true,
      redirectUrl: redirectUri || '/repositories',
    };
  } catch (error: any) {
    console.error('Error in handleOAuthCallback:', error);
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
    const result = await gitProvider.createGitProviderWithSchema(
      {
        type: validatedData.type,
        displayName: validatedData.displayName,
        serverUrl: validatedData.serverUrl,
        token: validatedData.token,
      },
      user.id,
    );

    if (!result.success || !result.data) {
      console.error('[Server] Failed to create git provider:', result.error);
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
    console.error('Error in createGitProvider:', error);
    return { success: false, error: error.message || 'Failed to create git provider' };
  }
}

/**
 * Get starred repositories for the current user
 * Safe to call from client components
 */
export async function getStarredRepositories(): Promise<{
  success: boolean;
  error?: string;
  data?: any[];
}> {
  try {
    console.log('[Server] getStarredRepositories: Starting...');

    // Get the current user
    let currentUser;
    try {
      currentUser = await getUser();
    } catch (error) {
      console.error('[Server] Error fetching user in getStarredRepositories:', error);
      return { success: false, error: 'Unauthorized - Please sign in' };
    }

    if (!currentUser) {
      return {
        success: false,
        error: 'Unauthorized - Please sign in',
      };
    }

    console.log('[Server] Fetching starred repositories');
    // Call the starRepository module to get starred repositories
    const result = await starRepository.getStarredRepositories(currentUser.id);

    if (!result.success) {
      console.error('[Server] Error fetching starred repositories:', result.error);
      // Return empty array on error for graceful degradation
      return { success: true, data: [] };
    }

    return result;
  } catch (error: any) {
    console.error('[Server] Error in getStarredRepositories:', error);
    return { success: false, error: error.message || 'Failed to fetch starred repositories' };
  }
}

/**
 * Star a repository for the current user
 * @param repositoryId The repository ID to star
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 */
export async function starRepositoryAction(
  repositoryId: string,
  user?: AuthUser | null,
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    // Use provided user data or fetch it if not provided
    const currentUser = user || (await getUser());
    if (!currentUser) {
      return { success: false, error: 'Unauthorized - Please sign in' };
    }

    // Call the DB layer function
    const result = await starRepository.starRepository(repositoryId, currentUser.id);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Revalidate repository paths
    revalidatePath('/[locale]/[tenant]/repositories');

    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('Error in starRepositoryAction:', error);
    return { success: false, error: error.message || 'Failed to star repository' };
  }
}

/**
 * Unstar a repository for the current user
 * @param repositoryId The repository ID to unstar
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 */
export async function unstarRepositoryAction(
  repositoryId: string,
  user?: AuthUser | null,
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    // Use provided user data or fetch it if not provided
    const currentUser = user || (await getUser());
    if (!currentUser) {
      return { success: false, error: 'Unauthorized - Please sign in' };
    }

    // Call the DB layer function
    const result = await starRepository.unstarRepository(repositoryId, currentUser.id);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Revalidate repository paths
    revalidatePath('/[locale]/[tenant]/repositories');

    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('Error in unstarRepositoryAction:', error);
    return { success: false, error: error.message || 'Failed to unstar repository' };
  }
}

/**
 * Get files for a repository at a specific path
 * @param repositoryId The repository ID
 * @param path The path to get files from (optional, defaults to root)
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 */
export async function getRepositoryFiles(
  repositoryId: string,
  path: string = '',
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

    // Call the files DB module instead of direct access
    const result = await files.getRepositoryFiles(repositoryId, path, currentUser.id);

    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'Failed to fetch repository files' };
    }

    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('Error in getRepositoryFiles:', error);
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

    // Call the files DB module instead of direct access
    const result = await files.getFileContent(repositoryId, path, currentUser.id);

    if (!result.success || !result.data) {
      return { success: false, error: result.error || 'Failed to fetch file content' };
    }

    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('Error in getFileContent:', error);
    return { success: false, error: error.message || 'Failed to fetch file content' };
  }
}

/**
 * Get both repositories and starred repositories in a single call
 * @param filter Optional filter criteria for repositories
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 */
export async function getRepositoriesWithStarred(
  filter?: RepositoryFilter,
  user?: AuthUser | null,
): Promise<{
  success: boolean;
  error?: string;
  data?: {
    repositories: Repository[];
    starredRepositoryIds: string[];
  };
}> {
  try {
    console.log('[Server] getRepositoriesWithStarred: Starting...');
    // Try to use provided user data or fetch it if not provided
    let currentUser = user;
    if (!currentUser) {
      try {
        const userResult = await getUser();
        currentUser = userResult;
      } catch (userError) {
        console.error('[Server] Error fetching current user:', userError);
        // Continue with null user - we'll handle repositories without starred info
      }
    }

    console.log(
      '[Server] User context:',
      currentUser
        ? {
            id: currentUser.id,
            tenant: currentUser.tenant_id,
          }
        : 'No user',
    );

    // If no authenticated user, return repositories without starred information
    if (!currentUser) {
      console.log('[Server] No authenticated user, fetching repositories without starred info');
      const reposResult = await getRepositories(filter);

      if (!reposResult.success) {
        return {
          success: false,
          error: reposResult.error || 'Failed to fetch repositories',
        };
      }

      // Return repositories without starred info
      return {
        success: true,
        data: {
          repositories: reposResult.data || [],
          starredRepositoryIds: [],
        },
      };
    }

    console.log('[Server] Fetching fresh data');

    // Fetch repositories
    const reposResult = await getRepositories(filter);
    console.log('[Server] Repository fetch result:', {
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

    // Fetch starred repositories
    let starredRepositoryIds: string[] = [];
    try {
      const starredResult = await getStarredRepositories();
      console.log('[Server] Starred repositories result:', {
        success: starredResult.success,
        count: starredResult.data?.length || 0,
        error: starredResult.error,
      });

      // Extract just the IDs from starred repositories for efficiency
      starredRepositoryIds =
        starredResult.success && starredResult.data
          ? starredResult.data.map((repo: any) => repo.repository_id || repo.id)
          : [];
    } catch (starredError) {
      console.error('[Server] Error fetching starred repositories:', starredError);
      // Continue with empty starred list
    }

    // Combine the data
    const combinedData = {
      repositories: reposResult.data,
      starredRepositoryIds,
    };

    console.log('[Server] Returning combined data:', {
      repositories: combinedData.repositories.length,
      starred: combinedData.starredRepositoryIds.length,
    });

    return { success: true, data: combinedData };
  } catch (error: any) {
    console.error('[Server] Error in getRepositoriesWithStarred:', error);
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
