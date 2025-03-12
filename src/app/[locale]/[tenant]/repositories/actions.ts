'use server';

import db from '@/lib/supabase/db';
import { GitProvider, Repository, GitProviderType, RepositorySyncStatus } from '@/app/[locale]/[tenant]/repositories/types';
import { z } from 'zod';
import { getUser } from '@/app/actions/user';

// Schema for testing a connection
const testConnectionSchema = z.object({
  type: z.enum(['github', 'gitlab', 'gitea'] as const, {
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
  type: z.enum(['github', 'gitlab', 'gitea']),
  displayName: z.string().min(2, 'Display name must be at least 2 characters'),
  serverUrl: z.string().url('Invalid URL').optional(),
  token: z.string().optional(),
});

type GitProviderCreateInput = z.infer<typeof gitProviderCreateSchema>;

// Repository related functions

export interface RepositoryFilter {
  providerId?: string;
}

export async function getRepositories(
  filter?: RepositoryFilter,
): Promise<{ success: boolean; error?: string; data?: Repository[] }> {
  try {
    const where: Record<string, any> = {};

    if (filter?.providerId) {
      where.provider_id = filter.providerId;
    }

    const result = await db.repository.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });

    // We need to ensure we're working with valid repository objects
    // First convert to unknown to break the typing, then explicitly cast
    const repositories = result as unknown as any[];

    // Transform to the correct Repository type
    const data: Repository[] = repositories.map((repo) => ({
      id: String(repo.id),
      providerId: String(repo.provider_id),
      providerType: String(repo.provider_type || '') as GitProviderType,
      name: String(repo.name),
      owner: String(repo.owner),
      url: repo.url ? String(repo.url) : undefined,
      branch: repo.branch ? String(repo.branch) : undefined,
      defaultBranch: repo.default_branch ? String(repo.default_branch) : 'main',
      isPrivate: Boolean(repo.is_private),
      description: repo.description ? String(repo.description) : undefined,
      syncStatus: String(repo.sync_status || 'IDLE') as RepositorySyncStatus,
      createdAt: repo.created_at ? new Date(repo.created_at).toISOString() : new Date().toISOString(),
      updated_at: repo.updated_at ? new Date(repo.updated_at).toISOString() : new Date().toISOString(),
      lastSyncedAt: repo.last_synced_at ? new Date(repo.last_synced_at).toISOString() : undefined,
      error: repo.error ? String(repo.error) : undefined,
    }));

    return { success: true, data };
  } catch (error: any) {
    console.error('Error in getRepositories:', error);
    return { success: false, error: error.message || 'Failed to fetch repositories' };
  }
}

export async function createRepository(
  data: Partial<Repository>,
): Promise<{ success: boolean; error?: string; data?: Repository }> {
  try {
    const newRepo = await db.repository.create({
      data,
    });

    return { success: true, data: newRepo };
  } catch (error: any) {
    console.error('Error in createRepository:', error);
    return { success: false, error: error.message || 'Failed to create repository' };
  }
}

export async function updateRepository(
  id: string,
  updates: Partial<Repository>,
): Promise<{ success: boolean; error?: string; data?: Repository }> {
  try {
    const data = await db.repository.update({
      where: { id },
      data: updates,
    });

    return { success: true, data };
  } catch (error: any) {
    console.error('Error in updateRepository:', error);
    return { success: false, error: error.message || 'Failed to update repository' };
  }
}

export async function deleteRepository(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    await db.repository.delete({
      where: { id },
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error in deleteRepository:', error);
    return { success: false, error: error.message || 'Failed to delete repository' };
  }
}

export async function syncRepository(
  id: string,
): Promise<{ success: boolean; error?: string; data?: Repository }> {
  try {
    const data = await db.repository.update({
      where: { id },
      data: { last_synced: new Date().toISOString() },
    });

    return { success: true, data };
  } catch (error: any) {
    console.error('Error in syncRepository:', error);
    return { success: false, error: error.message || 'Failed to sync repository' };
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

    return { success: true, data };
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