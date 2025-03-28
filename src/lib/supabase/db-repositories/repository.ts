import { createClient } from '../server';
import { cookies } from 'next/headers';
import { detectProviderFromUrl, extractRepoNameFromUrl, extractOwnerFromUrl } from './utils';

// Improved response type format following guidelines
type DbResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Repository types
export interface Repository {
  id: string;
  name: string;
  full_name: string;
  description: string | null;
  provider_id: string;
  provider_repo_id: string;
  url: string;
  default_branch: string;
  is_private: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RepositoryCreateData {
  name: string;
  description?: string | null;
  provider_id: string;
  provider_type: string;
  url: string;
  default_branch: string;
  is_private: boolean;
  owner?: string | null;
  created_at?: string;
  updated_at?: string;
  sync_status?: string;
}

export interface QuickCloneRepositoryData {
  url: string;
  provider_id?: string;
  default_branch?: string;
  is_private?: boolean;
  description?: string | null;
}

// Repository DB operations
const repository = {
  /**
   * Get all repositories for a specific profile (via provider ownership)
   */
  async getRepositories(): Promise<DbResponse<Repository[]>> {
    try {
      console.log('[DB] getRepositories: Starting query');
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);

      const { data, error } = await supabase.from('repositories').select('*');

      if (error) {
        console.error('[DB] Error fetching repositories:', error);
        return { success: false, error: error.message };
      }

      console.log('[DB] Successfully fetched repositories:', {
        count: data?.length || 0,
      });

      return { success: true, data };
    } catch (error) {
      console.error('[DB] Unexpected error in getRepositories:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Get a specific repository by ID (with tenant isolation)
   */
  async getRepository(id: string, profileId: string): Promise<DbResponse<Repository>> {
    try {
      console.log('[DB] getRepository: Fetching repository:', id, 'for profile:', profileId);
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);

      const { data, error } = await supabase
        .from('repositories')
        .select(
          `
          *,
          git_providers!inner(*)
        `,
        )
        .eq('id', id)
        .eq('git_providers.profile_id', profileId)
        .single();

      if (error) {
        console.error('[DB] Error fetching repository:', error);
        return { success: false, error: error.message };
      }

      console.log('[DB] Successfully fetched repository:', {
        id: data?.id,
        hasProvider: data?.git_providers !== undefined,
      });

      return { success: true, data };
    } catch (error) {
      console.error('[DB] Unexpected error in getRepository:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Create a new repository
   */
  async createRepository(
    data: RepositoryCreateData,
    profileId: string,
  ): Promise<DbResponse<Repository>> {
    try {
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);

      // Verify the provider belongs to the profile (tenant isolation)
      const { data: provider, error: providerError } = await supabase
        .from('git_providers')
        .select('id')
        .eq('id', data.provider_id)
        .eq('profile_id', profileId)
        .single();

      if (providerError || !provider) {
        return {
          success: false,
          error: providerError?.message || 'Git provider not found or no permission',
        };
      }

      const { data: result, error } = await supabase
        .from('repositories')
        .insert({
          ...data,
          last_synced_at: new Date().toISOString(),
        })
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
   * Update an existing repository
   */
  async updateRepository(
    id: string,
    data: Partial<RepositoryCreateData>,
    profileId: string,
  ): Promise<DbResponse<Repository>> {
    try {
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);

      // Verify the repository belongs to the profile via provider (tenant isolation)
      const { data: repo, error: repoError } = await supabase
        .from('repositories')
        .select(
          `
          id,
          git_providers!inner(profile_id)
        `,
        )
        .eq('id', id)
        .eq('git_providers.profile_id', profileId)
        .single();

      if (repoError || !repo) {
        return {
          success: false,
          error: repoError?.message || 'Repository not found or no permission',
        };
      }

      const { data: result, error } = await supabase
        .from('repositories')
        .update(data)
        .eq('id', id)
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
   * Delete a repository
   */
  async deleteRepository(id: string, profileId: string): Promise<DbResponse<null>> {
    try {
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);

      // Verify the repository belongs to the profile via provider (tenant isolation)
      const { data: repo, error: repoError } = await supabase
        .from('repositories')
        .select(
          `
          id,
          git_providers!inner(profile_id)
        `,
        )
        .eq('id', id)
        .eq('git_providers.profile_id', profileId)
        .single();

      if (repoError || !repo) {
        return {
          success: false,
          error: repoError?.message || 'Repository not found or no permission',
        };
      }

      const { error } = await supabase.from('repositories').delete().eq('id', id);

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

  /**
   * Update sync timestamp for a repository
   */
  async updateSyncTimestamp(id: string, profileId: string): Promise<DbResponse<Repository>> {
    try {
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);

      // Verify the repository belongs to the profile via provider (tenant isolation)
      const { data: repo, error: repoError } = await supabase
        .from('repositories')
        .select(
          `
          id,
          git_providers!inner(profile_id)
        `,
        )
        .eq('id', id)
        .eq('git_providers.profile_id', profileId)
        .single();

      if (repoError || !repo) {
        return {
          success: false,
          error: repoError?.message || 'Repository not found or no permission',
        };
      }

      const { data: result, error } = await supabase
        .from('repositories')
        .update({
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', id)
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
   * Create a repository from a URL (quick clone)
   *
   * This is used when a user provides a git repository URL directly,
   * without specifying a provider. We'll detect the provider from the URL.
   */
  async createRepositoryFromUrl(
    data: QuickCloneRepositoryData,
    profileId: string,
  ): Promise<DbResponse<Repository>> {
    try {
      const { url } = data;

      if (!url) {
        return { success: false, error: 'Repository URL is required' };
      }

      // Detect the provider type from the URL
      const providerType = detectProviderFromUrl(url);
      console.log('[createRepositoryFromUrl] Detected provider type:', providerType);

      // Extract repository name and owner from URL
      const repoName = extractRepoNameFromUrl(url);
      const owner = extractOwnerFromUrl(url);
      console.log('[createRepositoryFromUrl] Extracted repo details:', { repoName, owner });

      // Look for an existing provider of this type associated with the user
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);

      const { data: existingProviders, error: providersError } = await supabase
        .from('git_providers')
        .select('id')
        .eq('profile_id', profileId)
        .eq('type', providerType)
        .limit(1);

      console.log('[createRepositoryFromUrl] Existing providers query result:', {
        existingProviders,
        providersError,
      });

      if (providersError) {
        return { success: false, error: providersError.message };
      }

      // If we don't have a provider for this type, we need to create one
      let providerId: string;

      if (data.provider_id) {
        providerId = data.provider_id;
        console.log('[createRepositoryFromUrl] Using provided provider ID:', providerId);
      } else if (existingProviders && existingProviders.length > 0) {
        providerId = existingProviders[0].id;
        console.log('[createRepositoryFromUrl] Using existing provider ID:', providerId);
      } else {
        // We need to create a default provider for this type
        let providerName =
          providerType === 'self-hosted'
            ? 'Self-Hosted Git'
            : `Default ${providerType.charAt(0).toUpperCase() + providerType.slice(1)}`;

        // For self-hosted repositories, extract the server URL to include in the provider name
        let serverUrl = '';
        if (providerType === 'self-hosted') {
          const urlMatch = url.match(/^(https?:\/\/[^\/]+)/);
          if (urlMatch && urlMatch[1]) {
            serverUrl = urlMatch[1];
            // Use the server URL in the provider name
            const hostname = new URL(serverUrl).hostname;
            if (hostname) {
              providerName = `Self-Hosted (${hostname})`;
            }
          }
        }

        // Map 'self-hosted' to 'gitea' for database compatibility
        // This is a workaround for the database constraint
        const dbProviderType = providerType === 'self-hosted' ? 'gitea' : providerType;

        console.log('[createRepositoryFromUrl] Creating provider with mapped type:', {
          originalType: providerType,
          mappedType: dbProviderType,
          name: providerName,
          profile_id: profileId,
          server_url: serverUrl || undefined,
        });

        const { data: newProvider, error: createProviderError } = await supabase
          .from('git_providers')
          .insert({
            type: dbProviderType, // Use the mapped type for database compatibility
            name: providerName,
            profile_id: profileId,
            is_configured: true,
            server_url: serverUrl || undefined,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        console.log('[createRepositoryFromUrl] Provider creation result:', {
          newProvider,
          createProviderError,
        });

        if (createProviderError || !newProvider) {
          return {
            success: false,
            error: createProviderError?.message || 'Failed to create default provider',
          };
        }

        providerId = newProvider.id;
      }

      // Now create the repository
      const repoData: RepositoryCreateData = {
        name: repoName,
        description: data.description || '',
        provider_id: providerId,
        provider_type: providerType, // Keep the original provider type for UI display
        url: url,
        is_private: data.is_private || false,
        owner: owner,
        default_branch: 'main', // Default branch name
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sync_status: 'IDLE',
      };

      // Create the repository using our existing method
      return this.createRepository(repoData, profileId);
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

    let selectQuery = '*';
    if (options.include?.provider) {
      selectQuery = '*, git_providers(*)';
    }

    let builder = supabase.from('repositories').select(selectQuery);

    // Apply filters if provided
    if (options.where) {
      Object.entries(options.where).forEach(([key, value]) => {
        if (
          key === 'provider_id' &&
          typeof value === 'object' &&
          value !== null &&
          'in' in value &&
          Array.isArray((value as any).in)
        ) {
          builder = builder.in('provider_id', (value as any).in);
        } else {
          builder = builder.eq(key, value);
        }
      });
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
      console.error('Error querying repositories:', error);
      return [];
    }

    return data || [];
  },

  async findUnique({ where }: { where: any }) {
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const { data, error } = await supabase
      .from('repositories')
      .select('*, git_providers(*)')
      .match(where)
      .single();

    if (error) {
      console.error('Error finding repository:', error);
      return null;
    }

    return data;
  },

  async create({ data }: { data: any }) {
    // Extract profileId from data (assuming it's included) or throw error
    if (!data.profile_id) {
      throw new Error('profile_id is required for creating a repository');
    }

    const { profile_id, ...repoData } = data;
    const result = await this.createRepository(repoData, profile_id);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },

  async update({ where, data }: { where: any; data: any }) {
    if (!where.id || !where.profile_id) {
      throw new Error('ID and profile_id are required for updating a repository');
    }

    const result = await this.updateRepository(where.id, data, where.profile_id);
    if (!result.success) throw new Error(result.error);
    return result.data;
  },

  async delete({ where }: { where: any }) {
    if (!where.id || !where.profile_id) {
      throw new Error('ID and profile_id are required for deleting a repository');
    }

    const result = await this.deleteRepository(where.id, where.profile_id);
    if (!result.success) throw new Error(result.error);
    return { success: true };
  },
};

export default repository;
