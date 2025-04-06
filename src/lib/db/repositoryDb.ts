import { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

import { createClient } from '@/lib/supabase/server';
import { DbResponse } from '@/lib/utils/commonUtils';

export type Repository = {
  id: string;
  name: string;
  url: string;
  // Add other repository properties as needed
};

export type GitProvider = {
  id: string;
  name: string;
  type: string;
  server_url: string;
  created_at: string;
  updated_at: string;
  // Add other git provider properties as needed
};

/**
 * Get a repository by ID
 */
export default {
  getById,
  getRepositories,
  getRepository,
  createRepository,
  updateRepository,
  deleteRepository,
  createRepositoryFromUrl,
  getAllGitProviders,
};

export async function getById(
  id: string,
  cookieStore?: ReadonlyRequestCookies,
): Promise<DbResponse<Repository>> {
  try {
    const supabase = await createClient(cookieStore);
    const { data, error } = await supabase.from('repositories').select('*').eq('id', id).single();

    if (error) {
      throw error;
    }

    return { success: true, data, error: null };
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(`[@db:repositoryDb:getById] Error: ${err.message}`);
    return { success: false, data: null, error: err.message };
  }
}

/**
 * Get all repositories
 */
export async function getRepositories(
  cookieStore?: ReadonlyRequestCookies,
  teamId?: string,
): Promise<DbResponse<any[]>> {
  try {
    console.log(
      `[@db:repositoryDb:getRepositories] Starting to fetch repositories${teamId ? ` for team: ${teamId}` : ''}`,
    );
    const supabase = await createClient(cookieStore);

    // Query repositories with optional team_id filter
    let query = supabase.from('repositories').select('*');

    // Apply team_id filter if provided
    if (teamId) {
      query = query.eq('team_id', teamId);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    console.log(
      `[@db:repositoryDb:getRepositories] Successfully fetched ${data.length} repositories`,
    );
    return { success: true, data };
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(`[@db:repositoryDb:getRepositories] Error: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Get a repository by ID with optional user check
 */
export async function getRepository(
  id: string,
  userId?: string,
  cookieStore?: ReadonlyRequestCookies,
): Promise<DbResponse<any>> {
  try {
    const supabase = await createClient(cookieStore);
    const { data, error } = await supabase.from('repositories').select('*').eq('id', id).single();

    if (error) {
      console.error(`[@db:repositoryDb:getRepository] Error: ${error.message}`);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(`[@db:repositoryDb:getRepository] Error: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Create a new repository
 */
export async function createRepository(
  repositoryData: {
    name: string;
    description?: string | null;
    provider_id?: string;
    provider_type?: string;
    url: string;
    default_branch?: string;
    is_private?: boolean;
    owner?: string | null;
    team_id?: string;
    creator_id: string;
  },
  userId: string,
  cookieStore?: ReadonlyRequestCookies,
): Promise<DbResponse<any>> {
  try {
    const supabase = await createClient(cookieStore);

    // Add required metadata
    const data = {
      ...repositoryData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
    };

    const { data: result, error } = await supabase
      .from('repositories')
      .insert(data)
      .select()
      .single();

    if (error) {
      console.error(`[@db:repositoryDb:createRepository] Error: ${error.message}`);
      return { success: false, error: error.message };
    }

    return { success: true, data: result };
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(`[@db:repositoryDb:createRepository] Error: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Update a repository
 */
export async function updateRepository(
  id: string,
  updates: any,
  userId: string,
  cookieStore?: ReadonlyRequestCookies,
): Promise<DbResponse<any>> {
  try {
    const supabase = await createClient(cookieStore);

    // Add updated timestamp
    const data = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    // First get the repository to check if it exists
    const { data: repo, error: getError } = await supabase
      .from('repositories')
      .select('*')
      .eq('id', id)
      .single();

    if (getError) {
      console.error(
        `[@db:repositoryDb:updateRepository] Error finding repository: ${getError.message}`,
      );
      return { success: false, error: 'Repository not found' };
    }

    // Now update the repository
    const { data: result, error } = await supabase
      .from('repositories')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`[@db:repositoryDb:updateRepository] Error: ${error.message}`);
      return { success: false, error: error.message };
    }

    return { success: true, data: result };
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(`[@db:repositoryDb:updateRepository] Error: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Delete a repository
 */
export async function deleteRepository(
  id: string,
  userId: string,
  cookieStore?: ReadonlyRequestCookies,
): Promise<DbResponse<null>> {
  try {
    const supabase = await createClient(cookieStore);

    // First get the repository to check if it exists and belongs to user's team
    const { data: repo, error: getError } = await supabase
      .from('repositories')
      .select('team_id')
      .eq('id', id)
      .single();

    if (getError) {
      console.error(
        `[@db:repositoryDb:deleteRepository] Error finding repository: ${getError.message}`,
      );
      return { success: false, error: 'Repository not found', data: null };
    }

    const { error } = await supabase.from('repositories').delete().eq('id', id);

    if (error) {
      console.error(`[@db:repositoryDb:deleteRepository] Error: ${error.message}`);
      return { success: false, error: error.message, data: null };
    }

    return { success: true, data: null };
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(`[@db:repositoryDb:deleteRepository] Error: ${err.message}`);
    return { success: false, error: err.message, data: null };
  }
}

/**
 * Create a repository from a URL
 */
export async function createRepositoryFromUrl(
  data: { url: string; is_private?: boolean; description?: string | null; team_id?: string },
  userId: string,
  cookieStore?: ReadonlyRequestCookies,
): Promise<DbResponse<any>> {
  try {
    console.log(
      `[@db:repositoryDb:createRepositoryFromUrl] Creating repository from URL: ${data.url}`,
    );
    const supabase = await createClient(cookieStore);

    // Extract repository info from URL
    const url = new URL(data.url);

    // Determine provider type from hostname
    let providerType = 'git'; // Default
    if (url.hostname.includes('github.com')) {
      providerType = 'github';
    } else if (url.hostname.includes('gitlab.com')) {
      providerType = 'gitlab';
    } else if (url.hostname.includes('bitbucket.org')) {
      providerType = 'bitbucket';
    }

    // Check for Gitea instances by looking for matching server URLs in providers
    let detectedGiteaProviderId = null;
    try {
      const serverUrl = `${url.protocol}//${url.host}`;
      const { data: giteaProviders } = await supabase
        .from('git_providers')
        .select('id, type, server_url')
        .eq('type', 'gitea')
        .ilike('server_url', serverUrl);

      if (giteaProviders && giteaProviders.length > 0) {
        providerType = 'gitea';
        detectedGiteaProviderId = giteaProviders[0].id;
        console.log(
          `[@db:repositoryDb:createRepositoryFromUrl] Detected Gitea instance at ${serverUrl} with provider ID: ${detectedGiteaProviderId}`,
        );
      }
    } catch (err) {
      console.error(
        `[@db:repositoryDb:createRepositoryFromUrl] Error checking for Gitea providers: ${err}`,
      );
    }

    // Parse the path to get owner and repo name
    // Remove .git extension if present
    const cleanPath = url.pathname.replace(/\.git$/, '');
    const pathParts = cleanPath.split('/').filter(Boolean);

    // Default values if we can't parse the URL properly
    let repoName = 'repository';
    let owner = '';

    // Most Git URLs follow the pattern: hostname/owner/repo
    if (pathParts.length >= 2) {
      owner = pathParts[pathParts.length - 2];
      repoName = pathParts[pathParts.length - 1];
    } else if (pathParts.length === 1) {
      repoName = pathParts[0];
    }

    console.log(
      `[@db:repositoryDb:createRepositoryFromUrl] Extracted info: provider=${providerType}, owner=${owner}, repo=${repoName}`,
    );

    // Look up a default provider ID or create a placeholder one
    let providerId = '';
    try {
      // If we detected a Gitea provider earlier, use it
      if (detectedGiteaProviderId) {
        providerId = detectedGiteaProviderId;
        console.log(
          `[@db:repositoryDb:createRepositoryFromUrl] Using detected Gitea provider: ${providerId}`,
        );
      } else {
        // Try to find an existing provider of the same type
        const { data: providers } = await supabase
          .from('git_providers')
          .select('id')
          .eq('type', providerType)
          .limit(1);

        if (providers && providers.length > 0) {
          providerId = providers[0].id;
          console.log(
            `[@db:repositoryDb:createRepositoryFromUrl] Found existing provider: ${providerId}`,
          );
        } else {
          // Create a default provider if none exists
          const { data: newProvider, error: providerError } = await supabase
            .from('git_providers')
            .insert({
              name: `Default ${providerType} provider`,
              type: providerType,
              auth_type: 'token',
              creator_id: userId,
              team_id: data.team_id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (providerError) {
            console.log(
              `[@db:repositoryDb:createRepositoryFromUrl] Error creating provider: ${providerError.message}`,
            );
            // Use a placeholder - this is better than failing altogether
            providerId = '00000000-0000-0000-0000-000000000000';
          } else {
            providerId = newProvider.id;
            console.log(
              `[@db:repositoryDb:createRepositoryFromUrl] Created new provider: ${providerId}`,
            );
          }
        }
      }
    } catch (providerErr) {
      console.error(
        `[@db:repositoryDb:createRepositoryFromUrl] Error getting/creating provider: ${providerErr}`,
      );
      // Last resort placeholder
      providerId = '00000000-0000-0000-0000-000000000000';
    }

    // Prepare repository data
    const repositoryData = {
      name: repoName,
      description: data.description || null,
      provider_id: providerId, // Use the properly detected or created provider ID
      provider_type: providerType,
      url: data.url,
      default_branch: data.default_branch || 'main', // Use provided default branch or fallback
      is_private: data.is_private || false,
      owner: owner || null,
      team_id: data.team_id,
      sync_status: 'IDLE',
      creator_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log(`[@db:repositoryDb:createRepositoryFromUrl] Inserting repository with data:`, {
      name: repositoryData.name,
      owner: repositoryData.owner,
      provider_type: repositoryData.provider_type,
      team_id: repositoryData.team_id,
      provider_id: providerId,
    });

    const { data: result, error } = await supabase
      .from('repositories')
      .insert(repositoryData)
      .select()
      .single();

    if (error) {
      console.error(`[@db:repositoryDb:createRepositoryFromUrl] Error: ${error.message}`);
      return { success: false, error: error.message };
    }

    console.log(
      `[@db:repositoryDb:createRepositoryFromUrl] Successfully created repository: ${result.id}`,
    );
    return { success: true, data: result };
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(`[@db:repositoryDb:createRepositoryFromUrl] Error: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Get all git providers
 */
export async function getAllGitProviders(
  cookieStore?: ReadonlyRequestCookies,
): Promise<DbResponse<GitProvider[]>> {
  try {
    const supabase = await createClient(cookieStore);
    const { data, error } = await supabase.from('git_providers').select('*');

    if (error) {
      throw error;
    }

    return { success: true, data, error: null };
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(`[@db:repositoryDb:getAllGitProviders] Error: ${err.message}`);
    return { success: false, data: null, error: err.message };
  }
}
