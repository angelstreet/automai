import { createClient } from '../server';
import { detectProviderFromUrl, extractRepoNameFromUrl, extractOwnerFromUrl } from './utils';

// Common response type for all database operations
type DbResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// ===========================================================================
// Repository types and functions
// ===========================================================================

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

export const repository = {
  /**
   * Get all repositories for a specific profile (via provider ownership)
   */
  async getRepositories(): Promise<DbResponse<Repository[]>> {
    try {
      console.log('[DB] getRepositories: Starting query');
      const supabase = await createClient();

      // Get the current user's profile ID
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.error('[DB-REPOSITORIES] Error getting current user:', userError);
        return { success: false, error: userError.message };
      }

      const profileId = userData.user?.id;

      if (!profileId) {
        console.error('[DB-REPOSITORIES] No user profile found');
        return { success: false, error: 'User not authenticated' };
      }

      console.log(`[DB-REPOSITORIES] Fetching repositories for profile ID: ${profileId}`);

      // Join with git_providers to enforce tenant isolation
      const { data, error } = await supabase
        .from('repositories')
        .select(
          `
          *,
          git_providers!inner(*)
        `,
        )
        .eq('git_providers.profile_id', profileId);

      if (error) {
        console.error('[DB-REPOSITORIES] Error fetching repositories:', error);
        return { success: false, error: error.message };
      }

      // Process the data to remove the git_providers nested object
      const repositories = data.map((repo) => {
        const { git_providers, ...repoData } = repo;
        return repoData;
      });

      console.log('[DB] Successfully fetched repositories:', {
        count: repositories?.length || 0,
      });

      return { success: true, data: repositories };
    } catch (error) {
      console.error('[DB-REPOSITORIES] Unexpected error in getRepositories:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Get a specific repository by ID (with tenant isolation)
   */
  async getRepository(id: string, profileId?: string): Promise<DbResponse<Repository>> {
    try {
      console.log('[DB] getRepository: Fetching repository:', id, 'for profile:', profileId);
      const supabase = await createClient();

      if (!profileId) {
        // If no profileId is provided, fetch just by ID without tenant isolation
        const { data, error } = await supabase
          .from('repositories')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          console.error('[DB-REPOSITORIES] Error fetching repository:', error);
          return { success: false, error: error.message };
        }

        return { success: true, data };
      }

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
        console.error('[DB-REPOSITORIES] Error fetching repository:', error);
        return { success: false, error: error.message };
      }

      console.log('[DB] Successfully fetched repository:', {
        id: data?.id,
        hasProvider: data?.git_providers !== undefined,
      });

      return { success: true, data };
    } catch (error) {
      console.error('[DB-REPOSITORIES] Unexpected error in getRepository:', error);
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
      const supabase = await createClient();

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
      const supabase = await createClient();

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
      const supabase = await createClient();

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
      const supabase = await createClient();

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
};

// ===========================================================================
// Star Repository types and functions
// ===========================================================================

export const starRepository = {
  /**
   * Get all starred repositories for a profile
   */
  async getStarredRepositories(profileId: string): Promise<DbResponse<any[]>> {
    try {
      const supabase = await createClient();

      // Get all starred repositories for the user
      const { data: starData, error: starError } = await supabase
        .from('profile_repository_pins')
        .select('repository_id')
        .eq('profile_id', profileId);

      if (starError) {
        return {
          success: false,
          error: starError.message,
        };
      }

      // If no starred repositories, return empty array
      if (!starData || starData.length === 0) {
        return {
          success: true,
          data: [],
        };
      }

      // Get the full repository details for each starred repository
      const repositoryIds = starData.map((item) => item.repository_id);

      const { data: repositories, error: reposError } = await supabase
        .from('repositories')
        .select('*')
        .in('id', repositoryIds);

      if (reposError) {
        return {
          success: false,
          error: reposError.message,
        };
      }

      return {
        success: true,
        data: repositories,
      };
    } catch (error: any) {
      console.error('Error fetching starred repositories:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch starred repositories',
      };
    }
  },

  /**
   * Star a repository
   */
  async starRepository(repositoryId: string, profileId: string): Promise<DbResponse<any>> {
    try {
      const supabase = await createClient();

      // Check if the repository exists
      const { data: repository, error: repoError } = await supabase
        .from('repositories')
        .select('id')
        .eq('id', repositoryId)
        .single();

      if (repoError || !repository) {
        return {
          success: false,
          error: 'Repository not found',
        };
      }

      // Add the repository to starred
      const { data, error } = await supabase
        .from('profile_repository_pins')
        .insert({
          profile_id: profileId,
          repository_id: repositoryId,
        })
        .select();

      if (error) {
        // Check if it's a unique constraint error (already starred)
        if (error.code === '23505') {
          return {
            success: true,
            data: { already_starred: true },
          };
        }

        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error('Error starring repository:', error);
      return {
        success: false,
        error: error.message || 'Failed to star repository',
      };
    }
  },

  /**
   * Unstar a repository
   */
  async unstarRepository(repositoryId: string, profileId: string): Promise<DbResponse<any>> {
    try {
      const supabase = await createClient();

      // Remove the repository from starred
      const { data, error } = await supabase
        .from('profile_repository_pins')
        .delete()
        .eq('profile_id', profileId)
        .eq('repository_id', repositoryId)
        .select();

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error: any) {
      console.error('Error unstarring repository:', error);
      return {
        success: false,
        error: error.message || 'Failed to unstar repository',
      };
    }
  },
};

// ===========================================================================
// Pin Repository types and functions
// ===========================================================================

export interface RepositoryPin {
  id: string;
  profile_id: string;
  repository_id: string;
  created_at: string;
  repository?: Repository;
}

export const pinRepository = {
  /**
   * Get all pinned repositories for a specific profile
   */
  async getPinnedRepositories(profileId: string): Promise<DbResponse<RepositoryPin[]>> {
    try {
      const supabase = await createClient();

      const { data, error } = await supabase
        .from('profile_repository_pins')
        .select(
          `
          *,
          repositories(*)
        `,
        )
        .eq('profile_id', profileId);

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
   * Pin a repository for a profile
   */
  async pinRepository(repositoryId: string, profileId: string): Promise<DbResponse<RepositoryPin>> {
    try {
      const supabase = await createClient();

      // Verify the repository belongs to the profile via provider (tenant isolation)
      const { data: repo, error: repoError } = await supabase
        .from('repositories')
        .select(
          `
          id,
          git_providers!inner(profile_id)
        `,
        )
        .eq('id', repositoryId)
        .eq('git_providers.profile_id', profileId)
        .single();

      if (repoError || !repo) {
        return {
          success: false,
          error: repoError?.message || 'Repository not found or no permission',
        };
      }

      // Check if already pinned
      const { data: existingPin } = await supabase
        .from('profile_repository_pins')
        .select('id')
        .eq('profile_id', profileId)
        .eq('repository_id', repositoryId)
        .single();

      if (existingPin) {
        return {
          success: false,
          error: 'Repository is already pinned',
        };
      }

      const { data, error } = await supabase
        .from('profile_repository_pins')
        .insert({
          profile_id: profileId,
          repository_id: repositoryId,
        })
        .select()
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
   * Unpin a repository for a profile
   */
  async unpinRepository(repositoryId: string, profileId: string): Promise<DbResponse<null>> {
    try {
      const supabase = await createClient();

      const { error } = await supabase.from('profile_repository_pins').delete().match({
        profile_id: profileId,
        repository_id: repositoryId,
      });

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
};

// ===========================================================================
// Git Provider types and functions
// ===========================================================================

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

export const gitProvider = {
  /**
   * Get all git providers for a specific profile
   */
  async getGitProviders(profileId: string): Promise<DbResponse<GitProvider[]>> {
    try {
      const supabase = await createClient();

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
      const supabase = await createClient();

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
      const supabase = await createClient();

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
      const supabase = await createClient();

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
      const supabase = await createClient();

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
      const supabase = await createClient();

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
      const supabase = await createClient();

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

  /**
   * Handle OAuth callback for git providers
   */
  async handleOAuthCallback(
    code: string,
    providerId: string,
    userId: string,
  ): Promise<DbResponse<GitProvider>> {
    try {
      const supabase = await createClient();

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
      const supabase = await createClient();

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

// Files-related operations
// Keep as a placeholder, implementation can be added later
export const files = {
  async getRepositoryFiles(
    repositoryId: string,
    path: string = '',
    profileId: string,
  ): Promise<DbResponse<any[]>> {
    // Implementation to be added
    return { success: true, data: [] };
  },

  async getFileContent(
    repositoryId: string,
    path: string,
    profileId: string,
  ): Promise<DbResponse<any>> {
    // Implementation to be added
    return { success: true, data: null };
  },
};

// Export all components for direct imports
export { repository, starRepository, pinRepository, gitProvider, files };

// Export types for use in other modules
export type { DbResponse, Repository, GitProvider, RepositoryPin };
