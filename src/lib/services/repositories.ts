import db from '@/lib/supabase/db';
import { Repository, GitProvider, GitProviderType, RepositorySyncStatus } from '@/app/[locale]/[tenant]/repositories/types';
import { GitHubProviderService } from './git-providers/github';
import { GitLabProviderService } from './git-providers/gitlab';
import { GiteaProviderService } from './git-providers/gitea';
import { logger } from '../logger';

// Get a client for service operations - this is a no-op now as we'll use db directly
const getClient = () => {
  return db;
};

/**
 * Get the appropriate Git provider service based on type
 */
export async function getGitProviderService(
  providerType: GitProviderType,
  options?: { serverUrl?: string; accessToken?: string },
) {
  try {
    switch (providerType) {
      case 'github':
        return new GitHubProviderService();
      case 'gitlab':
        return new GitLabProviderService({
          serverUrl: options?.serverUrl,
          accessToken: options?.accessToken,
        });
      case 'gitea':
        return new GiteaProviderService(options?.serverUrl, options?.accessToken);
      default:
        throw new Error(`Unsupported git provider type: ${providerType}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to get git provider service:', { error: errorMessage, providerType });
    throw error;
  }
}

/**
 * List all git providers for a user
 */
export async function listGitProviders(userId: string): Promise<GitProvider[]> {
  try {
    logger.info('Listing git providers for user', { userId });

    const data = await db.query('git_providers', {
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });

    return data.map(mapGitProviderFromDb) || [];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to list git providers:', { error: errorMessage, userId });
    return [];
  }
}

/**
 * Get a git provider by ID
 */
export async function getGitProvider(id: string): Promise<GitProvider | null> {
  try {
    logger.info('Getting git provider', { id });

    const providers = await db.query('git_providers', {
      where: { id },
    });

    const provider = providers[0];
    if (!provider) return null;

    return mapGitProviderFromDb(provider);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to get git provider:', { error: errorMessage, id });
    return null;
  }
}

/**
 * Create a new git provider
 */
export async function createGitProvider(
  userId: string,
  data: {
    name: GitProviderType;
    type?: GitProviderType;
    displayName: string;
    serverUrl?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
  },
): Promise<GitProvider | null> {
  try {
    logger.info('Creating git provider', { userId, type: data.name });

    const providerData = {
      user_id: userId,
      tenant_id: userId, // Using userId as tenantId for now
      type: data.type || data.name,
      name: data.name,
      display_name: data.displayName,
      status: 'connected',
      server_url: data.serverUrl,
      access_token: data.accessToken,
      refresh_token: data.refreshToken,
      expires_at: data.expiresAt?.toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const result = await db.query('git_providers', {
      insert: providerData,
      returning: true,
    });

    const provider = result[0];
    if (!provider) {
      throw new Error('Failed to create git provider');
    }

    return mapGitProviderFromDb(provider);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to create git provider:', { error: errorMessage, data });
    return null;
  }
}

/**
 * Update a git provider
 */
export async function updateGitProvider(
  id: string,
  data: {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
  },
): Promise<GitProvider | null> {
  try {
    logger.info('Updating git provider', { id });

    const updated_ata: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (data.accessToken !== undefined) {
      updated_ata.access_token = data.accessToken;
    }

    if (data.refreshToken !== undefined) {
      updated_ata.refresh_token = data.refreshToken;
    }

    if (data.expiresAt !== undefined) {
      updated_ata.expires_at = data.expiresAt.toISOString();
    }

    const result = await db.query('git_providers', {
      where: { id },
      update: updated_ata,
      returning: true,
    });

    const provider = result[0];
    if (!provider) {
      throw new Error(`Git provider not found: ${id}`);
    }

    return mapGitProviderFromDb(provider);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to update git provider:', { error: errorMessage, id });
    return null;
  }
}

/**
 * Delete a git provider
 */
export async function deleteGitProvider(id: string): Promise<boolean> {
  try {
    logger.info('Deleting git provider', { id });

    await db.query('git_providers', {
      where: { id },
      delete: true,
    });

    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to delete git provider:', { error: errorMessage, id });
    return false;
  }
}

/**
 * List repositories with optional filters
 */
export async function listRepositories(
  userId: string,
  filters?: {
    providerId?: string;
    projectId?: string;
    syncStatus?: RepositorySyncStatus;
  },
): Promise<Repository[]> {
  try {
    logger.info('Listing repositories', { userId, filters });

    const where: Record<string, any> = {};

    // Join with git_providers to filter by user_id
    const joinConditions = {
      'repositories.provider_id': 'git_providers.id',
    };

    // Add filters
    if (filters?.providerId) {
      where.provider_id = filters.providerId;
    }

    if (filters?.projectId) {
      where.project_id = filters.projectId;
    }

    if (filters?.syncStatus) {
      where.sync_status = filters.syncStatus.toLowerCase();
    }

    // Add user filter through the join
    const additionalWhere = {
      'git_providers.user_id': userId,
    };

    const data = await db.query('repositories', {
      join: {
        table: 'git_providers',
        on: joinConditions,
        where: additionalWhere,
      },
      where,
      orderBy: { created_at: 'desc' },
    });

    return data.map(mapRepositoryFromDb) || [];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error in listRepositories:', { error: errorMessage });
    return [];
  }
}

// Helper function to map database fields to GitProvider interface
function mapGitProviderFromDb(data: any): GitProvider {
  return {
    id: data.id,
    userId: data.user_id,
    tenantId: data.tenant_id,
    type: data.type,
    displayName: data.display_name,
    status: data.status,
    serverUrl: data.server_url,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
    created_at: new Date(data.created_at),
    updated_at: new Date(data.updated_at),
    lastSyncedAt: data.last_synced_at ? new Date(data.last_synced_at) : undefined,
  };
}

// Helper function to map database fields to Repository interface
function mapRepositoryFromDb(data: any): Repository {
  return {
    id: data.id,
    providerId: data.provider_id,
    name: data.name,
    owner: data.owner,
    url: data.url,
    branch: data.branch,
    defaultBranch: data.default_branch,
    isPrivate: data.is_private,
    description: data.description,
    syncStatus: data.sync_status,
    created_at: new Date(data.created_at),
    updated_at: new Date(data.updated_at),
    lastSyncedAt: data.last_synced_at ? new Date(data.last_synced_at) : undefined,
    error: data.error,
  };
}

// Continue with the rest of the functions, replacing Supabase client usage with db...
