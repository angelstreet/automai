import { cookies } from 'next/headers';

import { createClient } from '../server';

// Improved response type format following guidelines
type DbResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Git Provider types
export interface GitProvider {
  id: string;
  name: string;
  type: 'github' | 'gitlab' | 'gitea' | 'self-hosted';
  access_token: string;
  profile_id: string;
  server_url?: string;
  created_at: string;
  updated_at: string;
}

export interface GitProviderCreateData {
  name: string;
  type: string;
  access_token: string;
  profile_id: string;
}

// Git Provider DB operations
const gitProvider = {
  /**
   * Get all git providers for a specific profile
   */
  async getGitProviders(profileId: string): Promise<DbResponse<GitProvider[]>> {
    try {
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);

      const { data, error } = await supabase
        .from('git_providers')
        .select('*')
        .eq('profile_id', profileId)
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Get a specific git provider by ID (with tenant isolation)
   */
  async getGitProvider(id: string, profileId: string): Promise<DbResponse<GitProvider>> {
    try {
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);

      const { data, error } = await supabase
        .from('git_providers')
        .select('*')
        .eq('id', id)
        .eq('profile_id', profileId)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Get a git provider by ID without tenant isolation
   * This is used for API endpoints that need to access provider data
   */
  async getGitProviderById(id: string): Promise<DbResponse<GitProvider>> {
    try {
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);

      const { data, error } = await supabase
        .from('git_providers')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Create a new git provider
   */
  async createGitProvider(data: GitProviderCreateData): Promise<DbResponse<GitProvider>> {
    try {
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);

      const { data: result, error } = await supabase
        .from('git_providers')
        .insert(data)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Update an existing git provider
   */
  async updateGitProvider(
    id: string,
    data: Partial<GitProviderCreateData>,
    profileId: string,
  ): Promise<DbResponse<GitProvider>> {
    try {
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);

      // Check if the provider belongs to the profile (tenant isolation)
      const { data: existingProvider, error: fetchError } = await supabase
        .from('git_providers')
        .select('id')
        .eq('id', id)
        .eq('profile_id', profileId)
        .single();

      if (fetchError || !existingProvider) {
        return {
          success: false,
          error: fetchError?.message || 'Git provider not found or no permission',
        };
      }

      const { data: result, error } = await supabase
        .from('git_providers')
        .update(data)
        .eq('id', id)
        .eq('profile_id', profileId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Refresh a git provider (mark as recently synced)
   */
  async refreshGitProvider(id: string, profileId: string): Promise<DbResponse<GitProvider>> {
    try {
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);

      // Check if the provider belongs to the profile (tenant isolation)
      const { data: existingProvider, error: fetchError } = await supabase
        .from('git_providers')
        .select('id')
        .eq('id', id)
        .eq('profile_id', profileId)
        .single();

      if (fetchError || !existingProvider) {
        return {
          success: false,
          error: fetchError?.message || 'Git provider not found or no permission',
        };
      }

      // Mark the provider as refreshed by updating its timestamp
      const { data: result, error } = await supabase
        .from('git_providers')
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('profile_id', profileId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Delete a git provider
   */
  async deleteGitProvider(id: string, profileId: string): Promise<DbResponse<null>> {
    try {
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);

      // Check if the provider belongs to the profile (tenant isolation)
      const { data: existingProvider, error: fetchError } = await supabase
        .from('git_providers')
        .select('id')
        .eq('id', id)
        .eq('profile_id', profileId)
        .single();

      if (fetchError || !existingProvider) {
        return {
          success: false,
          error: fetchError?.message || 'Git provider not found or no permission',
        };
      }

      const { error } = await supabase
        .from('git_providers')
        .delete()
        .eq('id', id)
        .eq('profile_id', profileId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  // Legacy compatibility methods
  async findMany(options: any = {}) {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    let builder = supabase.from('git_providers').select();

    // Apply filters if provided
    if (options.where) {
      Object.entries(options.where).forEach(([key, value]) => {
        if (key === 'OR' && Array.isArray(value)) {
          // Handle OR conditions
          console.warn('OR queries are not fully supported in this implementation');
        } else if (key === 'in' && typeof value === 'object' && value !== null) {
          // Handle 'in' query with null check
          const fieldNames = Object.keys(value);
          if (fieldNames.length > 0) {
            const fieldName = fieldNames[0];
            // Use type assertion to handle the indexing safely
            const fieldValue = value as Record<string, unknown>;
            const values = fieldValue[fieldName];
            if (Array.isArray(values)) {
              builder = builder.in(fieldName, values);
            }
          }
        } else {
          builder = builder.eq(key, value);
        }
      });
    }

    // Apply ordering
    if (options.orderBy) {
      const [field, direction] = Object.entries(options.orderBy)[0];
      builder = builder.order(field as string, { ascending: direction === 'asc' });
    } else {
      builder = builder.order('created_at', { ascending: false });
    }

    // Apply pagination
    if (options.take) {
      builder = builder.limit(options.take);
    }

    if (options.skip) {
      builder = builder.range(options.skip, options.skip + (options.take || 10) - 1);
    }

    // Execute the query
    const { data, error } = await builder;

    if (error) {
      console.error('Error querying git providers:', error);
      return [];
    }

    return data || [];
  },

  async findUnique({ where }: { where: any }) {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const { data, error } = await supabase.from('git_providers').select().match(where).single();

    if (error) {
      console.error('Error finding git provider:', error);
      return null;
    }

    return data;
  },

  async create({ data }: { data: any }) {
    const result = await this.createGitProvider(data);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },

  async update({ where, data }: { where: any; data: any }) {
    if (!where.id || !where.profile_id) {
      throw new Error('ID and profile_id are required for updating a git provider');
    }

    const result = await this.updateGitProvider(where.id, data, where.profile_id);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },

  async delete({ where }: { where: any }) {
    if (!where.id || !where.profile_id) {
      throw new Error('ID and profile_id are required for deleting a git provider');
    }

    const result = await this.deleteGitProvider(where.id, where.profile_id);
    if (!result.success) throw new Error(result.error);
    return { success: true };
  },

  /**
   * Handle OAuth callback for git providers
   */
  async handleOAuthCallback(
    code: string,
    providerId: string,
    userId: string,
  ): Promise<DbResponse<GitProvider>> {
    try {
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);

      // Check if the provider belongs to the user (tenant isolation)
      const { data: provider, error: fetchError } = await supabase
        .from('git_providers')
        .select('*')
        .eq('id', providerId)
        .eq('profile_id', userId)
        .single();

      if (fetchError || !provider) {
        return {
          success: false,
          error: fetchError?.message || 'Git provider not found or no permission',
        };
      }

      // Exchange code for token
      // This would typically involve making a request to the git provider's API
      // For now, we'll just update the provider with a dummy token
      const dummyToken = `dummy-token-${code}`;

      // Update the provider with the token
      const { data: updatedProvider, error } = await supabase
        .from('git_providers')
        .update({
          access_token: dummyToken,
          is_configured: true,
        })
        .eq('id', providerId)
        .eq('profile_id', userId)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data: updatedProvider };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Create a git provider with input validation and OAuth URL generation
   */
  async createGitProviderWithSchema(
    data: {
      type: string;
      displayName: string;
      serverUrl?: string;
      token?: string;
    },
    userId: string,
  ): Promise<DbResponse<{ provider: GitProvider; authUrl?: string }>> {
    try {
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);

      // Create provider with the validated data
      const { data: provider, error } = await supabase
        .from('git_providers')
        .insert({
          type: data.type,
          name: data.displayName,
          server_url: data.serverUrl,
          access_token: data.token || '',
          profile_id: userId,
          is_configured: !!data.token,
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // If token is provided, we're done
      if (data.token) {
        return { success: true, data: { provider } };
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

      if (data.type === 'github') {
        authUrl = `https://github.com/login/oauth/authorize?client_id=${process.env.GITHUB_CLIENT_ID}&redirect_uri=${redirectUri}&state=${state}&scope=repo`;
      } else if (data.type === 'gitlab') {
        authUrl = `https://gitlab.com/oauth/authorize?client_id=${process.env.GITLAB_CLIENT_ID}&redirect_uri=${redirectUri}&state=${state}&response_type=code&scope=api`;
      } else {
        // For Gitea, we'd need to implement a similar flow
        return { success: false, error: 'OAuth not implemented for Gitea yet' };
      }

      return {
        success: true,
        data: {
          provider,
          authUrl,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },
};

// Export individual functions for direct imports
export const getGitProviders = gitProvider.getGitProviders;
export const getGitProvider = gitProvider.getGitProvider;
export const getGitProviderById = gitProvider.getGitProviderById;
export const createGitProvider = gitProvider.createGitProvider;
export const updateGitProvider = gitProvider.updateGitProvider;
export const deleteGitProvider = gitProvider.deleteGitProvider;
export const refreshGitProvider = gitProvider.refreshGitProvider;
export const handleOAuthCallback = gitProvider.handleOAuthCallback;
export const createGitProviderWithSchema = gitProvider.createGitProviderWithSchema;

// Export the entire object as default
export default gitProvider;
