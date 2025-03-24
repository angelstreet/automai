'use server';

import db from '@/lib/supabase/db';
import { repository as dbRepositoryOld, gitProvider } from '@/lib/supabase';
import {
  GitProvider,
  Repository,
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
import { serverCache } from '@/lib/cache';
import { AuthUser } from '@/types/user';
import { starRepository } from '@/lib/supabase/db-repositories';
import { GitProvider as DbGitProvider } from '@/lib/supabase/db-repositories/git-provider';

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
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 */
export async function getRepositories(
  filter?: RepositoryFilter,
  user?: AuthUser | null,
): Promise<{ success: boolean; error?: string; data?: Repository[] }> {
  try {
    // Use provided user data or fetch it if not provided
    const currentUser = user || (await getUser());
    if (!currentUser) {
      return {
        success: false,
        error: 'Unauthorized - Please sign in',
      };
    }

    // Create a cache key based on the filter
    const cacheKey = `repositories:${filter?.providerId || 'all'}`;

    // Try to get from cache first
    const cachedData = serverCache.get<Repository[]>(cacheKey);
    if (cachedData) {
      return { success: true, data: cachedData };
    }

    const where: Record<string, any> = {};

    if (filter?.providerId) {
      where.provider_id = filter.providerId;
    }

    const result = await db.repository.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    if (!result) {
      return {
        success: false,
        error: 'Failed to fetch repositories',
      };
    }

    // We need to ensure we're working with valid repository objects
    // First convert to unknown to break the typing, then explicitly cast
    const repositories = result as unknown as any[];

    // Transform to the correct Repository type
    const data: Repository[] = repositories.map((repo) => mapDbRepositoryToRepository(repo));

    // Cache the result for 5 minutes (default TTL)
    serverCache.set(cacheKey, data);

    return { success: true, data };
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
    // Use provided user data or fetch it if not provided
    const currentUser = user || (await getUser());
    if (!currentUser) {
      return {
        success: false,
        error: 'Unauthorized - Please sign in',
      };
    }

    const newRepo = await db.repository.create({
      data,
    });

    if (!newRepo) {
      return {
        success: false,
        error: 'Failed to create repository',
      };
    }

    // Map to our Repository type
    const repository: Repository = mapDbRepositoryToRepository(newRepo);

    // Invalidate cache after creation
    serverCache.delete(`repositories:${repository.providerId}`);
    serverCache.delete('repositories:all');

    return { success: true, data: repository };
  } catch (error: any) {
    console.error('Error in createRepository:', error);
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
    console.log(`[updateRepository] Starting update for repo ${id}`);

    // Always get fresh user data from the server - don't rely on user from client
    const currentUserResult = await getUser();
    if (!currentUserResult) {
      console.log('[updateRepository] Failed - user not authenticated');
      return {
        success: false,
        error: 'Unauthorized - Please sign in',
      };
    }

    const currentUser = currentUserResult;

    console.log(`[updateRepository] User authenticated, profile_id: ${currentUser.id}`);
    console.log(`[updateRepository] Using direct snake_case column names:`, updates);

    // IMPORTANT: The db.repository.update call requires BOTH id AND profile_id in the where clause
    console.log(`[updateRepository] Calling db.repository.update with:`, {
      where: { id, profile_id: currentUser.id },
      data: updates,
    });

    try {
      const updated = await db.repository.update({
        where: { id, profile_id: currentUser.id },
        data: updates,
      });

      if (!updated) {
        console.log(`[updateRepository] Failed - repository not found or update failed`);
        return {
          success: false,
          error: 'Repository not found or update failed',
        };
      }

      // Map to our Repository type
      const repository: Repository = mapDbRepositoryToRepository(updated);

      // Invalidate cache after update
      serverCache.delete(`repositories:${repository.providerId}`);
      serverCache.delete('repositories:all');
      serverCache.delete(`repository:${id}`);

      console.log(`[updateRepository] Success - updated repo ${id}, invalidated cache`);

      return { success: true, data: repository };
    } catch (dbError: any) {
      console.error('[updateRepository] Database layer error:', dbError);

      // Try a different approach if the first one failed
      console.log('[updateRepository] Attempting direct Supabase update as fallback...');

      try {
        // Attempt to call the core db function directly with both parameters
        // Add updated_at to transformedData since it's required in this fallback call
        updates.updated_at = new Date().toISOString();

        // Ensure last_synced_at has a default value for the fallback method
        if (updates.last_synced_at === undefined) {
          updates.last_synced_at = new Date().toISOString();
        }

        const result = await db.repository.updateRepository(id, updates, currentUser.id);

        if (result.success && result.data) {
          console.log('[updateRepository] Fallback succeeded:', result);

          // Invalidate cache after update
          serverCache.delete('repositories:all');

          return {
            success: true,
            data: mapDbRepositoryToRepository(result.data),
          };
        } else {
          console.error('[updateRepository] Fallback update failed:', result.error);
          return { success: false, error: result.error || 'Update failed' };
        }
      } catch (fallbackError: any) {
        console.error('[updateRepository] Fallback attempt failed:', fallbackError);
        return { success: false, error: fallbackError.message || 'Failed to update repository' };
      }
    }
  } catch (error: any) {
    console.error('Error in updateRepository:', error);
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
    // Use provided user data or fetch it if not provided
    const currentUser = user || (await getUser());
    if (!currentUser) {
      return {
        success: false,
        error: 'Unauthorized - Please sign in',
      };
    }

    // First get the repository to invalidate cache properly
    const repo = await db.repository.findUnique({
      where: { id },
    });

    if (!repo) {
      return { success: false, error: 'Repository not found' };
    }

    await db.repository.delete({
      where: { id },
    });

    // Invalidate cache after deletion
    serverCache.delete(`repositories:${repo.provider_id}`);
    serverCache.delete('repositories:all');
    serverCache.delete(`repository:${id}`);

    return { success: true };
  } catch (error: any) {
    console.error('Error in deleteRepository:', error);
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

    const updated = await db.repository.update({
      where: { id },
      data: {
        last_synced_at: new Date().toISOString(),
        sync_status: 'SYNCED',
      },
    });

    if (!updated) {
      return {
        success: false,
        error: 'Repository not found or sync failed',
      };
    }

    // Map to our Repository type
    const repository: Repository = mapDbRepositoryToRepository(updated);

    // Invalidate cache after sync
    serverCache.delete(`repositories:${repository.providerId}`);
    serverCache.delete('repositories:all');
    serverCache.delete(`repository:${id}`);

    return { success: true, data: repository };
  } catch (error: any) {
    console.error('Error in syncRepository:', error);
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

    // Call the DB layer function
    console.log(
      '[actions.createRepositoryFromUrl] Calling repository.createRepositoryFromUrl with:',
      {
        url,
        is_private: isPrivate,
        description,
        profileId: user.id,
      },
    );

    const result = await dbRepositoryOld.createRepositoryFromUrl(
      {
        url,
        is_private: isPrivate,
        description,
      },
      user.id,
    );

    console.log('[actions.createRepositoryFromUrl] Result from DB layer:', result);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Transform the repository to match the UI's expected format
    const repoData: Repository = mapDbRepositoryToRepository(result.data);

    return { success: true, data: repoData };
  } catch (error: any) {
    console.error('Error in createRepositoryFromUrl:', error);
    return { success: false, error: error.message || 'Failed to create repository from URL' };
  }
}

export async function getRepository(
  id: string,
): Promise<{ success: boolean; error?: string; data?: Repository }> {
  try {
    const data = await db.repository.findUnique({
      where: { id },
    });

    if (!data) {
      return { success: false, error: 'Repository not found' };
    }

    return { success: true, data: mapDbRepositoryToRepository(data) };
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
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized', data: [] };
    }

    const dbProviders = await db.gitProvider.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: 'desc' },
    });

    if (!dbProviders) {
      return {
        success: false,
        error: 'Failed to fetch git providers',
      };
    }

    // Map DB results to interface type
    const providers = dbProviders.map((provider) => mapDbGitProviderToGitProvider(provider));

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
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    const dbProvider = await db.gitProvider.findUnique({
      where: {
        id,
        user_id: user.id,
      },
    });

    if (!dbProvider) {
      return { success: false, error: 'Git provider not found' };
    }

    // Map DB result to interface type
    const provider = mapDbGitProviderToGitProvider(dbProvider);

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
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }

    try {
      await db.gitProvider.delete({
        where: {
          id,
          user_id: user.id,
        },
      });

      return { success: true };
    } catch (error: any) {
      console.error('Error deleting git provider:', error);
      return { success: false, error: error.message };
    }
  } catch (error: any) {
    console.error('Error in deleteGitProvider:', error);
    return { success: false, error: error.message || 'Failed to delete git provider' };
  }
}

export async function addGitProvider(provider: Omit<GitProvider, 'id'>): Promise<GitProvider> {
  try {
    const result = await db.gitProvider.create({
      data: provider,
    });

    if (!result) {
      throw new Error('Failed to create git provider');
    }

    return mapDbGitProviderToGitProvider(result);
  } catch (error) {
    console.error('Error in addGitProvider:', error);
    throw error;
  }
}

export async function updateGitProvider(
  id: string,
  updates: Partial<GitProvider>,
): Promise<GitProvider> {
  try {
    const result = await db.gitProvider.update({
      where: { id },
      data: updates,
    });

    if (!result) {
      throw new Error('Failed to update git provider');
    }

    return mapDbGitProviderToGitProvider(result);
  } catch (error) {
    console.error('Error in updateGitProvider:', error);
    throw error;
  }
}

export async function refreshGitProvider(id: string): Promise<GitProvider> {
  try {
    const result = await db.gitProvider.update({
      where: { id },
      data: { last_synced: new Date().toISOString() },
    });

    if (!result) {
      throw new Error('Failed to refresh git provider');
    }

    return mapDbGitProviderToGitProvider(result);
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

    // Get the provider
    const provider = await db.gitProvider.findUnique({
      where: {
        id: providerId,
        user_id: user.id,
      },
    });

    if (!provider) {
      return { success: false, error: 'Provider not found' };
    }

    // Exchange code for token
    // This would typically involve making a request to the git provider's API
    // For now, we'll just update the provider with a dummy token
    await db.gitProvider.update({
      where: { id: providerId },
      data: {
        token: `dummy-token-${code}`,
        is_configured: true,
      },
    });

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

    // Create provider in database
    const provider = await db.gitProvider.create({
      data: {
        type: validatedData.type,
        display_name: validatedData.displayName,
        server_url: validatedData.serverUrl,
        token: validatedData.token,
        user_id: user.id,
        is_configured: !!validatedData.token,
      },
    });

    if (!provider) {
      return {
        success: false,
        error: 'Failed to create git provider',
      };
    }

    // If token is provided, we're done
    if (validatedData.token) {
      return { success: true, data: provider };
    }

    // Otherwise, generate OAuth URL
    let authUrl;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/git-providers/callback`;
    const state = Buffer.from(
      JSON.stringify({
        providerId: provider.id,
        redirectUri: '/repositories',
      }),
    ).toString('base64');

    if (validatedData.type === 'github') {
      authUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${redirectUri}&state=${state}&scope=repo`;
    } else if (validatedData.type === 'gitlab') {
      authUrl = `https://gitlab.com/oauth/authorize?client_id=${process.env.GITLAB_CLIENT_ID}&redirect_uri=${redirectUri}&state=${state}&response_type=code&scope=api`;
    } else {
      // For Gitea, we'd need to implement a similar flow
      return { success: false, error: 'OAuth not implemented for Gitea yet' };
    }

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
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 */
export async function getStarredRepositories(
  user?: AuthUser | null,
): Promise<{ success: boolean; error?: string; data?: any[] }> {
  try {
    console.log('[actions.getStarredRepositories] Starting');

    // Use provided user data or fetch it if not provided
    const currentUser = user || (await getUser());
    if (!currentUser) {
      console.log('[actions.getStarredRepositories] No authenticated user found');
      return { success: false, error: 'Unauthorized' };
    }

    // Check cache
    const cacheKey = `starred-repos:${currentUser.id}`;
    const cached = serverCache.get<any[]>(cacheKey);
    if (cached) {
      console.log('[actions.getStarredRepositories] Using cached starred repositories data');
      return { success: true, data: cached };
    }

    console.log('[actions.getStarredRepositories] User ID:', currentUser.id);

    // Call the DB layer function
    const result = await starRepository.getStarredRepositories(currentUser.id);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Cache the result
    serverCache.set(cacheKey, result.data || [], 60 * 5); // 5 minute cache

    return { success: true, data: result.data || [] };
  } catch (error: any) {
    console.error('Error in getStarredRepositories:', error);
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
    console.log('[actions.starRepositoryAction] Starting with repository ID:', repositoryId);

    // Use provided user data or fetch it if not provided
    const currentUser = user || (await getUser());
    if (!currentUser) {
      console.log('[actions.starRepositoryAction] No authenticated user found');
      return { success: false, error: 'Unauthorized' };
    }

    console.log('[actions.starRepositoryAction] User ID:', currentUser.id);

    // Call the DB layer function
    const result = await starRepository.starRepository(repositoryId, currentUser.id);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Invalidate cache
    serverCache.delete(`starred-repos:${currentUser.id}`);

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
    console.log('[actions.unstarRepositoryAction] Starting with repository ID:', repositoryId);

    // Use provided user data or fetch it if not provided
    const currentUser = user || (await getUser());
    if (!currentUser) {
      console.log('[actions.unstarRepositoryAction] No authenticated user found');
      return { success: false, error: 'Unauthorized' };
    }

    console.log('[actions.unstarRepositoryAction] User ID:', currentUser.id);

    // Call the DB layer function
    const result = await starRepository.unstarRepository(repositoryId, currentUser.id);

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Invalidate cache
    serverCache.delete(`starred-repos:${currentUser.id}`);

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

    // Check cache
    const cacheKey = `repo-files:${repositoryId}:${path}`;
    const cached = serverCache.get<any[]>(cacheKey);
    if (cached) {
      console.log('[actions.getRepositoryFiles] Using cached files data');
      return { success: true, data: cached };
    }

    // Create Supabase client
    const supabase = await import('@/lib/supabase/server').then((m) => m.createClient());

    // Get the repository details
    const { data: repository, error: repoError } = await supabase
      .from('repositories')
      .select('*')
      .eq('id', repositoryId)
      .single();

    if (repoError || !repository) {
      return { success: false, error: 'Repository not found' };
    }

    // Get the provider details
    const { data: provider, error: providerError } = await supabase
      .from('git_providers')
      .select('*')
      .eq('id', repository.provider_id)
      .single();

    if (providerError || !provider) {
      return { success: false, error: 'Git provider not found' };
    }

    let files = [];

    // Handle different Git providers
    if (
      provider.type === 'github' ||
      (provider.type === undefined && repository.owner === 'angelstreet')
    ) {
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
          owner: repository.owner,
          repo: repository.name,
          path: path || '',
        });

        // GitHub API returns either an array (directory) or a single object (file)
        const contents = Array.isArray(response.data) ? response.data : [response.data];

        files = contents.map((item: any) => ({
          name: item.name,
          path: item.path,
          type: item.type === 'dir' ? 'folder' : 'file',
          size: item.size,
          lastModified: new Date().toISOString(),
          url: item.html_url || undefined,
          download_url: item.download_url,
        }));
      } catch (error: any) {
        console.error('Error fetching GitHub repository contents:', error);
        return { success: false, error: error.message || 'Failed to fetch repository contents' };
      }
    } else if (provider.type === 'gitlab') {
      return { success: false, error: 'GitLab API integration not implemented yet' };
    } else if (provider.type === 'gitea') {
      return { success: false, error: 'Gitea API integration not implemented yet' };
    } else {
      // Fallback to mock data for unsupported providers
      files = [
        {
          name: 'README.md',
          path: path ? `${path}/README.md` : 'README.md',
          type: 'file',
          size: 1024,
          lastModified: new Date().toISOString(),
        },
        {
          name: 'src',
          path: path ? `${path}/src` : 'src',
          type: 'folder',
          lastModified: new Date().toISOString(),
        },
        {
          name: 'package.json',
          path: path ? `${path}/package.json` : 'package.json',
          type: 'file',
          size: 512,
          lastModified: new Date().toISOString(),
        },
        {
          name: 'tsconfig.json',
          path: path ? `${path}/tsconfig.json` : 'tsconfig.json',
          type: 'file',
          size: 256,
          lastModified: new Date().toISOString(),
        },
      ];
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

    // Check cache
    const cacheKey = `repo-file-content:${repositoryId}:${path}`;
    const cached = serverCache.get<any>(cacheKey);
    if (cached) {
      console.log('[actions.getFileContent] Using cached file content');
      return { success: true, data: cached };
    }

    // Create Supabase client
    const supabase = await import('@/lib/supabase/server').then((m) => m.createClient());

    // Get the repository details
    const { data: repository, error: repoError } = await supabase
      .from('repositories')
      .select('*')
      .eq('id', repositoryId)
      .single();

    if (repoError || !repository) {
      return { success: false, error: 'Repository not found' };
    }

    // Get the provider details
    const { data: provider, error: providerError } = await supabase
      .from('git_providers')
      .select('*')
      .eq('id', repository.provider_id)
      .single();

    if (providerError || !provider) {
      return { success: false, error: 'Git provider not found' };
    }

    let fileContent = '';
    let fileMetadata: {
      path: string;
      lastModified: string;
      size?: number;
      url?: string;
      sha?: string;
    } = {
      path: path,
      lastModified: new Date().toISOString(),
    };

    // Handle different Git providers
    if (
      provider.provider_type === 'github' ||
      (provider.provider_type === undefined && repository.owner === 'angelstreet')
    ) {
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
          owner: repository.owner,
          repo: repository.name,
          path: path,
        });

        // GitHub API returns file content in base64
        if ('content' in response.data && !Array.isArray(response.data)) {
          const content = response.data.content;
          const encoding = response.data.encoding;

          if (encoding === 'base64') {
            fileContent = Buffer.from(content, 'base64').toString('utf-8');
          } else {
            fileContent = content;
          }

          fileMetadata = {
            path: response.data.path,
            lastModified: new Date().toISOString(), // Use current date as fallback
            size: response.data.size,
            url: response.data.html_url || undefined,
            sha: response.data.sha,
          };
        } else {
          return { success: false, error: 'Path does not point to a file' };
        }
      } catch (error: any) {
        console.error('Error fetching file content from GitHub:', error);
        return { success: false, error: error.message || 'Failed to fetch file content' };
      }
    } else if (provider.provider_type === 'gitlab') {
      return { success: false, error: 'GitLab API integration not implemented yet' };
    } else if (provider.provider_type === 'gitea') {
      return { success: false, error: 'Gitea API integration not implemented yet' };
    } else {
      // Fallback to mock content based on file extension
      if (path.endsWith('.md')) {
        fileContent = `# ${repository.name}\n\nThis is a sample README file for the ${repository.name} repository.\n\n## Overview\n\nThis repository contains code for the project.\n\n## Getting Started\n\n1. Clone the repository\n2. Install dependencies\n3. Run the project`;
      } else if (path.endsWith('.json')) {
        const jsonContent = {
          name: repository.name,
          version: '1.0.0',
          description: 'Sample repository',
          main: 'index.js',
          scripts: {
            start: 'node index.js',
            test: 'jest',
          },
          dependencies: {
            react: '^18.2.0',
            next: '^13.4.0',
          },
        };
        fileContent = JSON.stringify(jsonContent, null, 2);
      } else if (path.endsWith('.js') || path.endsWith('.ts') || path.endsWith('.tsx')) {
        fileContent = `/**
 * ${path.split('/').pop()}
 * 
 * This is a sample file for demonstration purposes.
 */

import React from 'react';

function Component() {
  return (
    <div>
      <h1>Hello from ${repository.name}</h1>
      <p>This is a sample component</p>
    </div>
  );
}

export default Component;`;
      } else {
        fileContent = `This is a sample content for ${path.split('/').pop()} in the ${repository.name} repository.`;
      }
    }

    const result = {
      content: fileContent,
      ...fileMetadata,
    };

    // Cache the result - 10 minute cache
    serverCache.set(cacheKey, result, 60 * 10);

    return { success: true, data: result };
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
    console.log('[actions.getRepositoriesWithStarred] Starting');

    // Use provided user data or fetch it if not provided
    const currentUser = user || (await getUser());
    if (!currentUser) {
      return {
        success: false,
        error: 'Unauthorized - Please sign in',
      };
    }

    // Create a cache key that includes both repositories and starred status
    const cacheKey = `repositories-with-starred:${currentUser.id}:${filter?.providerId || 'all'}`;

    // Try to get from cache first
    const cachedData = serverCache.get<{
      repositories: Repository[];
      starredRepositoryIds: string[];
    }>(cacheKey);
    if (cachedData) {
      console.log('[actions.getRepositoriesWithStarred] Using cached data');
      return { success: true, data: cachedData };
    }

    // Fetch repositories
    const reposResult = await getRepositories(filter, currentUser);

    if (!reposResult.success || !reposResult.data) {
      return {
        success: false,
        error: reposResult.error || 'Failed to fetch repositories',
      };
    }

    // Fetch starred repositories
    const starredResult = await getStarredRepositories(currentUser);

    // Extract just the IDs from starred repositories for efficiency
    const starredRepositoryIds =
      starredResult.success && starredResult.data
        ? starredResult.data.map((repo: any) => repo.repository_id || repo.id)
        : [];

    // Combine the data
    const combinedData = {
      repositories: reposResult.data,
      starredRepositoryIds,
    };

    // Cache the combined result
    serverCache.set(cacheKey, combinedData, 60 * 5); // 5 minute cache

    console.log('[actions.getRepositoriesWithStarred] Successfully fetched data');
    return { success: true, data: combinedData };
  } catch (error: any) {
    console.error('Error in getRepositoriesWithStarred:', error);
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
 * Clear the repositories cache
 * This is useful when we need to ensure we get fresh data after updates
 * @param repositoryId Optional repository ID to only clear cache for a specific repository
 * @param providerId Optional provider ID to only clear cache for a specific provider
 */
export async function clearRepositoriesCache(
  repositoryId?: string,
  providerId?: string,
): Promise<void> {
  try {
    console.log(
      `[actions] Clearing repositories cache${repositoryId ? ` for repository ${repositoryId}` : ''}${providerId ? ` for provider ${providerId}` : ''}`,
    );

    if (repositoryId) {
      // Clear specific repository cache
      serverCache.delete(`repository:${repositoryId}`);
      console.log(`[actions] Cleared cache for repository:${repositoryId}`);
    } else if (providerId) {
      // Clear provider-specific repositories cache
      serverCache.delete(`repositories:${providerId}`);
      console.log(`[actions] Cleared cache for repositories:${providerId}`);
    } else {
      // Clear all repository-related caches
      serverCache.delete('repositories:all');
      console.log('[actions] Cleared repositories:all cache');
    }
  } catch (error) {
    console.error('Error clearing repositories cache:', error);
  }
}
