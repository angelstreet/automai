// DB Repository module
// Main implementation for repository, gitProvider, and files functionality

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

  // Add other repository functions as needed
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

// Files functions
export const files = {
  async getByRepositoryId(
    repositoryId: string,
    cookieStore?: ReadonlyRequestCookies,
  ): Promise<DbResponse<any[]>> {
    try {
      const supabase = await createClient(cookieStore);
      const { data, error } = await supabase
        .from('repository_files')
        .select('*')
        .eq('repository_id', repositoryId);

      if (error) {
        throw error;
      }

      return { data, error: null };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`[@db:db-repository:files:getByRepositoryId] Error: ${err.message}`);
      return { data: null, error: err };
    }
  },

  // Add other files functions as needed
};
