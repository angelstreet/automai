'use server';

import db from '@/lib/supabase/db';
import { repository as dbRepository, gitProvider } from '@/lib/supabase';
import { GitProvider, Repository, GitProviderType, RepositorySyncStatus } from '@/app/[locale]/[tenant]/repositories/types';
import { z } from 'zod';
import { getUser } from '@/app/actions/user';
import { serverCache } from '@/lib/cache';
import { AuthUser } from '@/types/user';

// Schema for testing a connection
const testConnectionSchema = z.object({
  type: z.enum(['github', 'gitlab', 'gitea', 'self-hosted'] as const, {
    required_error: 'Provider type is required',
  }),
  serverUrl: z.string().url('Invalid URL').optional(),
  token: z.string({
    required_error: 'Access token is required',
  }),
});

type TestConnectionInput = z.infer<typeof testConnectionSchema>;

// Schema for creating a git provider
const gitProviderCreateSchema = z.object({
  type: z.enum(['github', 'gitlab', 'gitea', 'self-hosted']),
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  serverUrl: z.string().url('Invalid URL').optional(),
  token: z.string().optional(),
});

type GitProviderCreateInput = z.infer<typeof gitProviderCreateSchema>;

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
    createdAt: dbRepo.created_at ? new Date(dbRepo.created_at).toISOString() : new Date().toISOString(),
    updated_at: dbRepo.updated_at ? new Date(dbRepo.updated_at).toISOString() : new Date().toISOString(),
    lastSyncedAt: dbRepo.last_synced_at ? new Date(dbRepo.last_synced_at).toISOString() : undefined,
    // Optional fields
    language: dbRepo.language || undefined,
  };
}

// Repository related functions

export interface RepositoryFilter {
  providerId?: string;
}

/**
 * Get all repositories with optional filtering
 * @param filter Optional filter criteria for repositories
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 */
export async function getRepositories(
  filter?: RepositoryFilter,
  user?: AuthUser | null
): Promise<{ success: boolean; error?: string; data?: Repository[] }> {
  try {
    // Use provided user data or fetch it if not provided
    const currentUser = user || await getUser();
    if (!currentUser) {
      return { 
        success: false, 
        error: 'Unauthorized - Please sign in' 
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
  user?: AuthUser | null
): Promise<{ success: boolean; error?: string; data?: Repository }> {
  try {
    // Use provided user data or fetch it if not provided
    const currentUser = user || await getUser();
    if (!currentUser) {
      return { 
        success: false, 
        error: 'Unauthorized - Please sign in' 
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
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 */
export async function updateRepository(
  id: string,
  updates: Partial<Repository>,
  user?: AuthUser | null
): Promise<{ success: boolean; error?: string; data?: Repository }> {
  try {
    // Use provided user data or fetch it if not provided
    const currentUser = user || await getUser();
    if (!currentUser) {
      return { 
        success: false, 
        error: 'Unauthorized - Please sign in' 
      };
    }

    const updated = await db.repository.update({
      where: { id },
      data: updates,
    });

    if (!updated) {
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

    return { success: true, data: repository };
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
  user?: AuthUser | null
): Promise<{ success: boolean; error?: string }> {
  try {
    // Use provided user data or fetch it if not provided
    const currentUser = user || await getUser();
    if (!currentUser) {
      return { 
        success: false, 
        error: 'Unauthorized - Please sign in' 
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
  user?: AuthUser | null
): Promise<{ success: boolean; error?: string; data?: Repository }> {
  try {
    // Use provided user data or fetch it if not provided
    const currentUser = user || await getUser();
    if (!currentUser) {
      return { 
        success: false, 
        error: 'Unauthorized - Please sign in' 
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
  description?: string
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
    console.log('[actions.createRepositoryFromUrl] Calling repository.createRepositoryFromUrl with:', {
      url,
      is_private: isPrivate,
      description,
      profileId: user.id
    });
    
    const result = await dbRepository.createRepositoryFromUrl(
      {
        url,
        is_private: isPrivate,
        description
      },
      user.id
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
    // Validate input data
    const validatedData = testConnectionSchema.parse(data);

    // Test connection with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const baseUrl =
      validatedData.type === 'gitea'
        ? validatedData.serverUrl
        : validatedData.type === 'github'
          ? 'https://api.github.com'
          : 'https://gitlab.com/api/v4';

    const response = await fetch(`${baseUrl}/api/v1/user`, {
      headers: {
        Authorization: `token ${validatedData.token}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    // Handle response
    if (!response.ok) {
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
    console.error('Error in testGitProviderConnection:', error);

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
  data?: any[];
}> {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized', data: [] };
    }

    const data = await db.gitProvider.findMany({
      where: { user_id: user.id },
      orderBy: { created_at: 'desc' },
    });

    if (!data) {
      return {
        success: false,
        error: 'Failed to fetch git providers',
      };
    }

    return { success: true, data };
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
): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized', data: null };
    }

    const data = await db.gitProvider.findUnique({
      where: {
        id,
        user_id: user.id,
      },
    });

    if (!data) {
      return { success: false, error: 'Git provider not found' };
    }

    return { success: true, data };
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

    return result;
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

    return result;
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

    return result;
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