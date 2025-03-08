import { createClient as createClient, createAdminClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import {
  Repository,
  RepositoryCreateInput,
  RepositoryUpdateInput,
  GitProvider,
  GitProviderType,
  SyncStatus,
} from '@/types/repositories';
import { GitHubProviderService } from './git-providers/github';
import { logger } from '../logger';

// Environment config for direct client creation as fallback
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Get a Supabase client for service operations
const getServiceClient = () => {
  try {
    // Direct client creation for service functions
    // This avoids the need for cookies from next/headers
    const apiKey = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
    
    if (!apiKey) {
      logger.error('Missing Supabase API key');
      return null;
    }
    
    return createSupabaseClient(SUPABASE_URL, apiKey);
  } catch (error) {
    logger.error('Failed to create Supabase client:', error);
    return null;
  }
};

// Helper function to get a client and check if it's available
const getClient = (operation: string, providedClient?: any) => {
  const client = providedClient || getServiceClient();
  
  if (!client) {
    logger.warn(`No Supabase client available for ${operation}`);
  }
  
  return client;
};

// Factory to get the appropriate provider service
export async function getGitProviderService(
  providerType: GitProviderType,
  options?: { serverUrl?: string; accessToken?: string },
) {
  switch (providerType) {
    case 'github':
      return new GitHubProviderService();
    case 'gitlab':
      // TODO: Implement GitLab provider
      throw new Error('GitLab provider not implemented yet');
    case 'gitea':
      if (options?.serverUrl) {
        const { GiteaProviderService } = await import('./git-providers/gitea');
        return new GiteaProviderService(options.serverUrl, options.accessToken);
      }
      throw new Error('Server URL is required for Gitea provider');
    default:
      throw new Error(`Unsupported provider type: ${providerType}`);
  }
}

// List all git providers for a user
export async function listGitProviders(userId: string, supabaseClient?: any): Promise<GitProvider[]> {
  try {
    const supabase = getClient('listGitProviders', supabaseClient);
    
    if (!supabase) {
      return [];
    }
    
    const { data, error } = await supabase
      .from('git_providers')
      .select('*')
      .eq('user_id', userId);
      
    if (error) {
      logger.error('Error listing git providers:', { error, userId });
      return [];
    }
    
    return data || [];
  } catch (error) {
    logger.error('Failed to list git providers:', { error, userId });
    return [];
  }
}

// Get a specific git provider by ID
export async function getGitProvider(id: string, supabaseClient?: any): Promise<GitProvider | null> {
  try {
    const supabase = getClient('getGitProvider', supabaseClient);
    
    if (!supabase) {
      return null;
    }
    
    const { data, error } = await supabase
      .from('git_providers')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      logger.error('Error getting git provider:', { error, id });
      return null;
    }
    
    return data;
  } catch (error) {
    logger.error('Failed to get git provider:', { error, id });
    return null;
  }
}

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
  supabaseClient?: any
): Promise<GitProvider | null> {
  try {
    const supabase = getClient('createGitProvider', supabaseClient);
    
    // If no client is available, return null
    if (!supabase) {
      logger.warn('No Supabase client available for createGitProvider');
      return null;
    }
    
    const { data: provider, error } = await supabase
      .from('git_providers')
      .insert({
        user_id: userId,
        name: data.name,
        type: data.type || data.name,
        display_name: data.displayName,
        server_url: data.serverUrl,
        access_token: data.accessToken,
        refresh_token: data.refreshToken,
        expires_at: data.expiresAt,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      logger.error('Error creating git provider:', { error, data });
      return null;
    }
    
    return provider;
  } catch (error) {
    logger.error('Failed to create git provider:', { error, data });
    return null;
  }
}

export async function updateGitProvider(
  id: string,
  data: {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: Date;
  },
  supabaseClient?: any
): Promise<GitProvider | null> {
  try {
    const supabase = getClient('updateGitProvider', supabaseClient);
    
    if (!supabase) {
      return null;
    }
    
    const { data: provider, error } = await supabase
      .from('git_providers')
      .update({
        access_token: data.accessToken,
        refresh_token: data.refreshToken,
        expires_at: data.expiresAt,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      logger.error('Error updating git provider:', { error, id, data });
      return null;
    }
    
    return provider;
  } catch (error) {
    logger.error('Failed to update git provider:', { error, id });
    return null;
  }
}

export async function deleteGitProvider(id: string, supabaseClient?: any): Promise<boolean> {
  try {
    const supabase = getClient('deleteGitProvider', supabaseClient);
    
    if (!supabase) {
      return false;
    }
    
    const { error } = await supabase
      .from('git_providers')
      .delete()
      .eq('id', id);
      
    if (error) {
      logger.error('Error deleting git provider:', { error, id });
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error('Failed to delete git provider:', { error, id });
    return false;
  }
}

export async function listRepositories(
  userId: string,
  filters?: {
    providerId?: string;
    projectId?: string;
    syncStatus?: SyncStatus;
  },
  supabaseClient?: any
): Promise<Repository[]> {
  try {
    const supabase = getClient('listRepositories', supabaseClient);
    
    if (!supabase) {
      return [];
    }
    
    let query = supabase
      .from('repositories')
      .select(`
        *,
        provider:git_providers(*)
      `);
    
    // Apply filters
    if (filters?.providerId) {
      query = query.eq('provider_id', filters.providerId);
    }
    
    if (filters?.syncStatus) {
      query = query.eq('sync_status', filters.syncStatus);
    }
    
    const { data, error } = await query;
      
    if (error) {
      logger.error('Error listing repositories:', { error, userId, filters });
      return [];
    }
    
    return data || [];
  } catch (error) {
    logger.error('Error in listRepositories:', error);
    return [];
  }
}

export async function getRepository(id: string, supabaseClient?: any): Promise<Repository | null> {
  try {
    const supabase = getClient('getRepository', supabaseClient);
    
    if (!supabase) {
      return null;
    }
    
    const { data, error } = await supabase
      .from('repositories')
      .select(`
        *,
        provider:git_providers(*)
      `)
      .eq('id', id)
      .single();
      
    if (error) {
      logger.error('Error getting repository:', { error, id });
      return null;
    }
    
    return data;
  } catch (error) {
    logger.error('Failed to get repository:', { error, id });
    return null;
  }
}

export async function createRepository(data: RepositoryCreateInput, supabaseClient?: any): Promise<Repository | null> {
  try {
    const supabase = getClient('createRepository', supabaseClient);
    
    if (!supabase) {
      return null;
    }
    
    const { data: repository, error } = await supabase
      .from('repositories')
      .insert({
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      logger.error('Error creating repository:', { error, data });
      return null;
    }
    
    return repository;
  } catch (error) {
    logger.error('Failed to create repository:', { error, data });
    return null;
  }
}

export async function updateRepository(
  id: string,
  data: RepositoryUpdateInput,
  supabaseClient?: any
): Promise<Repository | null> {
  try {
    const supabase = getClient('updateRepository', supabaseClient);
    
    if (!supabase) {
      return null;
    }
    
    const { data: repository, error } = await supabase
      .from('repositories')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      logger.error('Error updating repository:', { error, id, data });
      return null;
    }
    
    return repository;
  } catch (error) {
    logger.error('Failed to update repository:', { error, id });
    return null;
  }
}

export async function deleteRepository(id: string, supabaseClient?: any): Promise<boolean> {
  try {
    const supabase = getClient('deleteRepository', supabaseClient);
    
    if (!supabase) {
      return false;
    }
    
    const { error } = await supabase
      .from('repositories')
      .delete()
      .eq('id', id);
      
    if (error) {
      logger.error('Error deleting repository:', { error, id });
      return false;
    }
    
    return true;
  } catch (error) {
    logger.error('Failed to delete repository:', { error, id });
    return false;
  }
}

export async function syncRepository(id: string, supabaseClient?: any): Promise<Repository | null> {
  try {
    const supabase = getClient('syncRepository', supabaseClient);
    
    if (!supabase) {
      return null;
    }
    
    // First get the repository
    const { data: repository, error: getError } = await supabase
      .from('repositories')
      .select(`
        *,
        provider:git_providers(*)
      `)
      .eq('id', id)
      .single();
      
    if (getError || !repository) {
      logger.error('Error getting repository for sync:', { error: getError, id });
      return null;
    }
    
    // Update sync status to in_progress
    const { error: updateError } = await supabase
      .from('repositories')
      .update({
        sync_status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
      
    if (updateError) {
      logger.error('Error updating repository sync status:', { error: updateError, id });
      return null;
    }
    
    try {
      // Get the provider service
      const providerService = await getGitProviderService(
        repository.provider.type,
        {
          serverUrl: repository.provider.server_url,
          accessToken: repository.provider.access_token
        }
      );
      
      // Sync the repository
      const repoDetails = await providerService.getRepository(repository.url);
      
      // Update the repository with the latest data
      const { data: updatedRepo, error: finalUpdateError } = await supabase
        .from('repositories')
        .update({
          name: repoDetails.name,
          description: repoDetails.description,
          default_branch: repoDetails.defaultBranch,
          sync_status: 'synced',
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();
        
      if (finalUpdateError) {
        logger.error('Error updating repository after sync:', { error: finalUpdateError, id });
        return null;
      }
      
      return updatedRepo;
    } catch (syncError) {
      // Update sync status to failed
      const { error: failedUpdateError } = await supabase
        .from('repositories')
        .update({
          sync_status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', id);
        
      if (failedUpdateError) {
        logger.error('Error updating repository sync status to failed:', { error: failedUpdateError, id });
      }
      
      logger.error('Error syncing repository:', { error: syncError, id });
      return null;
    }
  } catch (error) {
    logger.error('Failed to sync repository:', { error, id });
    return null;
  }
}

export async function importRepositoriesFromProvider(providerId: string, supabaseClient?: any): Promise<Repository[]> {
  try {
    const supabase = getClient('importRepositoriesFromProvider', supabaseClient);
    
    if (!supabase) {
      return [];
    }
    
    // Get the provider
    const { data: provider, error: providerError } = await supabase
      .from('git_providers')
      .select('*')
      .eq('id', providerId)
      .single();
      
    if (providerError || !provider) {
      logger.error('Error getting provider for import:', { error: providerError, providerId });
      return [];
    }
    
    // Get the provider service
    const providerService = await getGitProviderService(
      provider.type,
      {
        serverUrl: provider.server_url,
        accessToken: provider.access_token
      }
    );
    
    // Get repositories from the provider
    const repositories = await providerService.listRepositories();
    
    // Create repositories in the database
    const createdRepos: Repository[] = [];
    
    for (const repo of repositories) {
      // Check if repository already exists
      const { data: existingRepo, error: checkError } = await supabase
        .from('repositories')
        .select('id')
        .eq('provider_id', providerId)
        .eq('url', repo.url)
        .single();
        
      if (!checkError && existingRepo) {
        // Repository already exists, skip
        logger.info('Repository already exists, skipping:', { url: repo.url });
        continue;
      }
      
      // Create the repository
      const { data: createdRepo, error: createError } = await supabase
        .from('repositories')
        .insert({
          name: repo.name,
          description: repo.description,
          url: repo.url,
          default_branch: repo.defaultBranch,
          provider_id: providerId,
          sync_status: 'synced',
          last_synced_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (createError) {
        logger.error('Error creating repository during import:', { error: createError, repo });
        continue;
      }
      
      createdRepos.push(createdRepo);
    }
    
    return createdRepos;
  } catch (error) {
    logger.error('Failed to import repositories:', { error, providerId });
    return [];
  }
}

// Test connection to a git provider
export async function testGitProviderConnection({ 
  type, 
  serverUrl, 
  token 
}: { 
  type: GitProviderType; 
  serverUrl?: string; 
  token: string;
}): Promise<{ success: boolean; message?: string; error?: string; }> {
  try {
    // Get the provider service
    const providerService = await getGitProviderService(
      type,
      {
        serverUrl,
        accessToken: token
      }
    );
    
    // Test the connection
    const result = await providerService.testConnection();
    
    return {
      success: result.success,
      message: result.message,
      error: result.error
    };
  } catch (error) {
    logger.error('Failed to test git provider connection:', { error, type });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
