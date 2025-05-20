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

    return { success: true, data, error: undefined };
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

    // Query repositories with optional team_id filter and include workspace mappings
    let query = supabase.from('repositories').select(`
      *,
      repository_workspaces(
        workspace_id
      )
    `);

    // Apply team_id filter if provided
    if (teamId) {
      query = query.eq('team_id', teamId);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    // Process the data to include workspace IDs in a cleaner format
    const processedData = data.map((repo) => {
      // Format workspace data into an array of workspace IDs
      const workspaces = (repo.repository_workspaces || []).map((mapping) => mapping.workspace_id);

      return {
        ...repo,
        workspaces, // Add the array of workspace IDs
        repository_workspaces: undefined, // Remove the raw mapping data
      };
    });

    console.log(
      `[@db:repositoryDb:getRepositories] Successfully fetched ${processedData.length} repositories with workspace data`,
    );
    return { success: true, data: processedData };
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
  _: string | undefined,
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
    provider_type?: string;
    url: string;
    default_branch?: string;
    is_private?: boolean;
    owner?: string | null;
    team_id?: string;
    creator_id: string;
  },
  _: string,
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
  _: string,
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
    const { error: getError } = await supabase
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
  _: string,
  cookieStore?: ReadonlyRequestCookies,
): Promise<DbResponse<null>> {
  try {
    const supabase = await createClient(cookieStore);

    // First get the repository to check if it exists and belongs to user's team
    const { error: getError } = await supabase
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
  data: {
    url: string;
    is_private?: boolean;
    description?: string | null;
    team_id?: string;
    default_branch?: string;
  },
  creator_id: string,
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

    // Prepare repository data
    const repositoryData = {
      name: repoName,
      description: data.description || null,
      provider_type: providerType,
      url: data.url,
      default_branch: data.default_branch || 'main',
      is_private: data.is_private || false,
      owner: owner || null,
      team_id: data.team_id,
      sync_status: 'IDLE',
      creator_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log(`[@db:repositoryDb:createRepositoryFromUrl] Inserting repository with data:`, {
      name: repositoryData.name,
      owner: repositoryData.owner,
      provider_type: repositoryData.provider_type,
      team_id: repositoryData.team_id,
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

    return { success: true, data, error: undefined };
  } catch (error: unknown) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(`[@db:repositoryDb:getAllGitProviders] Error: ${err.message}`);
    return { success: false, data: null, error: err.message };
  }
}
