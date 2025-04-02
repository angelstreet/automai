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
): Promise<DbResponse<any[]>> {
  try {
    console.log(`[@db:repositoryDb:getRepositories] Starting to fetch repositories`);
    const supabase = await createClient(cookieStore);
    const { data, error } = await supabase.from('repositories').select('*');

    if (error) {
      return { success: false, error: error.message };
    }
    console.log(`[@db:repositoryDb:getRepositories] Successfully fetched ${data}`);
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
  repositoryData: any,
  userId: string,
  cookieStore?: ReadonlyRequestCookies,
): Promise<DbResponse<any>> {
  try {
    const supabase = await createClient(cookieStore);

    // Add required metadata
    const data = {
      ...repositoryData,
      profile_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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

    const { data: result, error } = await supabase
      .from('repositories')
      .update(data)
      .eq('id', id)
      .eq('profile_id', userId)
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

    const { error } = await supabase
      .from('repositories')
      .delete()
      .eq('id', id)
      .eq('profile_id', userId);

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
  data: { url: string; is_private?: boolean; description?: string },
  userId: string,
  cookieStore?: ReadonlyRequestCookies,
): Promise<DbResponse<any>> {
  try {
    const supabase = await createClient(cookieStore);

    // Extract repository name from URL
    const url = new URL(data.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const repoName = pathParts.length > 0 ? pathParts[pathParts.length - 1] : 'repository';
    const owner = pathParts.length > 1 ? pathParts[pathParts.length - 2] : '';

    // Create repository data
    const repositoryData = {
      name: repoName,
      url: data.url,
      is_private: data.is_private || false,
      description: data.description || null,
      owner: owner,
      profile_id: userId,
      provider_type: 'git',
      default_branch: 'main',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: result, error } = await supabase
      .from('repositories')
      .insert(repositoryData)
      .select()
      .single();

    if (error) {
      console.error(`[@db:repositoryDb:createRepositoryFromUrl] Error: ${error.message}`);
      return { success: false, error: error.message };
    }

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
