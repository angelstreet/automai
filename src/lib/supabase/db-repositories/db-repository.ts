import { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

import { createClient } from '@/lib/supabase/server';

// Types
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

export type DbResponse<T> = {
  data: T | null;
  error: Error | null;
};

// Repository functions
export const repository = {
  async getById(id: string, cookieStore?: ReadonlyRequestCookies): Promise<DbResponse<Repository>> {
    try {
      const supabase = await createClient(cookieStore);
      const { data, error } = await supabase.from('repositories').select('*').eq('id', id).single();

      if (error) {
        throw error;
      }

      return { data, error: null };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`[@db:db-repository:getById] Error: ${err.message}`);
      return { data: null, error: err };
    }
  },

  async getRepositories(
    cookieStore?: ReadonlyRequestCookies,
  ): Promise<{ success: boolean; error?: string; data?: any[] }> {
    try {
      console.log(`[@db:db-repository:getRepositories] Starting to fetch repositories`);
      const supabase = await createClient(cookieStore);
      const { data, error } = await supabase.from('repositories').select('*');

      if (error) {
        return { success: false, error: error.message };
      }
      console.log(`[@db:db-repository:getRepositories] Successfully fetched ${data}`);
      return { success: true, data };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`[@db:db-repository:getRepositories] Error: ${err.message}`);
      return { success: false, error: err.message };
    }
  },

  async getRepository(
    id: string,
    userId?: string,
    cookieStore?: ReadonlyRequestCookies,
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const supabase = await createClient(cookieStore);
      const { data, error } = await supabase.from('repositories').select('*').eq('id', id).single();

      if (error) {
        console.error(`[@db:db-repository:getRepository] Error: ${error.message}`);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`[@db:db-repository:getRepository] Error: ${err.message}`);
      return { success: false, error: err.message };
    }
  },

  async createRepository(
    repositoryData: any,
    userId: string,
    cookieStore?: ReadonlyRequestCookies,
  ): Promise<{ success: boolean; error?: string; data?: any }> {
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
        console.error(`[@db:db-repository:createRepository] Error: ${error.message}`);
        return { success: false, error: error.message };
      }

      return { success: true, data: result };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`[@db:db-repository:createRepository] Error: ${err.message}`);
      return { success: false, error: err.message };
    }
  },

  async updateRepository(
    id: string,
    updates: any,
    userId: string,
    cookieStore?: ReadonlyRequestCookies,
  ): Promise<{ success: boolean; error?: string; data?: any }> {
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
        console.error(`[@db:db-repository:updateRepository] Error: ${error.message}`);
        return { success: false, error: error.message };
      }

      return { success: true, data: result };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`[@db:db-repository:updateRepository] Error: ${err.message}`);
      return { success: false, error: err.message };
    }
  },

  async deleteRepository(
    id: string,
    userId: string,
    cookieStore?: ReadonlyRequestCookies,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await createClient(cookieStore);

      const { error } = await supabase
        .from('repositories')
        .delete()
        .eq('id', id)
        .eq('profile_id', userId);

      if (error) {
        console.error(`[@db:db-repository:deleteRepository] Error: ${error.message}`);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`[@db:db-repository:deleteRepository] Error: ${err.message}`);
      return { success: false, error: err.message };
    }
  },

  async createRepositoryFromUrl(
    data: { url: string; is_private?: boolean; description?: string },
    userId: string,
    cookieStore?: ReadonlyRequestCookies,
  ): Promise<{ success: boolean; error?: string; data?: any }> {
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
        console.error(`[@db:db-repository:createRepositoryFromUrl] Error: ${error.message}`);
        return { success: false, error: error.message };
      }

      return { success: true, data: result };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`[@db:db-repository:createRepositoryFromUrl] Error: ${err.message}`);
      return { success: false, error: err.message };
    }
  },
};

// Git provider functions
export const gitProvider = {
  async getAll(cookieStore?: ReadonlyRequestCookies): Promise<DbResponse<GitProvider[]>> {
    try {
      const supabase = await createClient(cookieStore);
      const { data, error } = await supabase.from('git_providers').select('*');

      if (error) {
        throw error;
      }

      return { data, error: null };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`[@db:db-repository:gitProvider:getAll] Error: ${err.message}`);
      return { data: null, error: err };
    }
  },

  // Add other git provider functions as needed
};
