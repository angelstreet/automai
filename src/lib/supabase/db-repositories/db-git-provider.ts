// DB Git Provider module
// Exports functions from db-repository.ts

import { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

import { createClient } from '@/lib/supabase/server';
import { gitProvider as repoGitProvider, type GitProvider } from './db-repository';

// Re-export types and functionality
export { type GitProvider } from './db-repository';

// Enhanced git provider with additional functions
export const gitProvider = {
  // Re-export base functions
  ...repoGitProvider,

  // Add custom functions
  async getGitProviders(
    userId: string,
    cookieStore?: ReadonlyRequestCookies,
  ): Promise<{ success: boolean; error?: string; data?: GitProvider[] }> {
    try {
      const supabase = await createClient(cookieStore);

      const { data, error } = await supabase
        .from('git_providers')
        .select('*')
        .eq('profile_id', userId);

      if (error) {
        console.error(`[@db:db-git-provider:getGitProviders] Error: ${error.message}`);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`[@db:db-git-provider:getGitProviders] Error: ${err.message}`);
      return { success: false, error: err.message };
    }
  },

  async getGitProvider(
    id: string,
    userId: string,
    cookieStore?: ReadonlyRequestCookies,
  ): Promise<{ success: boolean; error?: string; data?: GitProvider }> {
    try {
      const supabase = await createClient(cookieStore);

      const { data, error } = await supabase
        .from('git_providers')
        .select('*')
        .eq('id', id)
        .eq('profile_id', userId)
        .single();

      if (error) {
        console.error(`[@db:db-git-provider:getGitProvider] Error: ${error.message}`);
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`[@db:db-git-provider:getGitProvider] Error: ${err.message}`);
      return { success: false, error: err.message };
    }
  },

  async createGitProvider(
    data: any,
    userId: string,
    cookieStore?: ReadonlyRequestCookies,
  ): Promise<{ success: boolean; error?: string; data?: GitProvider }> {
    try {
      const supabase = await createClient(cookieStore);

      // Add required metadata
      const providerData = {
        ...data,
        profile_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: result, error } = await supabase
        .from('git_providers')
        .insert(providerData)
        .select()
        .single();

      if (error) {
        console.error(`[@db:db-git-provider:createGitProvider] Error: ${error.message}`);
        return { success: false, error: error.message };
      }

      return { success: true, data: result };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`[@db:db-git-provider:createGitProvider] Error: ${err.message}`);
      return { success: false, error: err.message };
    }
  },

  async createGitProviderWithSchema(
    data: any,
    userId: string,
    cookieStore?: ReadonlyRequestCookies,
  ): Promise<{ success: boolean; error?: string; data?: GitProvider }> {
    return this.createGitProvider(data, userId, cookieStore);
  },

  async updateGitProvider(
    id: string,
    updates: any,
    userId: string,
    cookieStore?: ReadonlyRequestCookies,
  ): Promise<{ success: boolean; error?: string; data?: GitProvider }> {
    try {
      const supabase = await createClient(cookieStore);

      // Add updated timestamp
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      const { data: result, error } = await supabase
        .from('git_providers')
        .update(updateData)
        .eq('id', id)
        .eq('profile_id', userId)
        .select()
        .single();

      if (error) {
        console.error(`[@db:db-git-provider:updateGitProvider] Error: ${error.message}`);
        return { success: false, error: error.message };
      }

      return { success: true, data: result };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`[@db:db-git-provider:updateGitProvider] Error: ${err.message}`);
      return { success: false, error: err.message };
    }
  },

  async deleteGitProvider(
    id: string,
    userId: string,
    cookieStore?: ReadonlyRequestCookies,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await createClient(cookieStore);

      const { error } = await supabase
        .from('git_providers')
        .delete()
        .eq('id', id)
        .eq('profile_id', userId);

      if (error) {
        console.error(`[@db:db-git-provider:deleteGitProvider] Error: ${error.message}`);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`[@db:db-git-provider:deleteGitProvider] Error: ${err.message}`);
      return { success: false, error: err.message };
    }
  },

  async refreshGitProvider(
    id: string,
    userId: string,
    cookieStore?: ReadonlyRequestCookies,
  ): Promise<{ success: boolean; error?: string; data?: GitProvider }> {
    try {
      const supabase = await createClient(cookieStore);

      // Update the last refreshed timestamp
      const updateData = {
        updated_at: new Date().toISOString(),
        last_refreshed_at: new Date().toISOString(),
      };

      const { data: result, error } = await supabase
        .from('git_providers')
        .update(updateData)
        .eq('id', id)
        .eq('profile_id', userId)
        .select()
        .single();

      if (error) {
        console.error(`[@db:db-git-provider:refreshGitProvider] Error: ${error.message}`);
        return { success: false, error: error.message };
      }

      return { success: true, data: result };
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`[@db:db-git-provider:refreshGitProvider] Error: ${err.message}`);
      return { success: false, error: err.message };
    }
  },

  async handleOAuthCallback(
    data: any,
    userId: string,
    cookieStore?: ReadonlyRequestCookies,
  ): Promise<{ success: boolean; error?: string; data?: GitProvider }> {
    try {
      // Process OAuth data and create a git provider
      return this.createGitProvider(data, userId, cookieStore);
    } catch (error: unknown) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`[@db:db-git-provider:handleOAuthCallback] Error: ${err.message}`);
      return { success: false, error: err.message };
    }
  },
};

// Default export for compatibility
export default gitProvider;
