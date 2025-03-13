import { createClient } from '../server';
import { cookies } from 'next/headers';
import { Repository } from './repository';

// Improved response type format following guidelines
type DbResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Repository Pin types
export interface RepositoryPin {
  id: string;
  profile_id: string;
  repository_id: string;
  created_at: string;
  repository?: Repository;
}

// Repository Pin DB operations
const pinRepository = {
  /**
   * Get all pinned repositories for a specific profile
   */
  async getPinnedRepositories(profileId: string): Promise<DbResponse<RepositoryPin[]>> {
    try {
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);

      const { data, error } = await supabase
        .from('profile_repository_pins')
        .select(`
          *,
          repositories(*)
        `)
        .eq('profile_id', profileId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },

  /**
   * Pin a repository for a profile
   */
  async pinRepository(
    repositoryId: string, 
    profileId: string
  ): Promise<DbResponse<RepositoryPin>> {
    try {
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);

      // Verify the repository belongs to the profile via provider (tenant isolation)
      const { data: repo, error: repoError } = await supabase
        .from('repositories')
        .select(`
          id,
          git_providers!inner(profile_id)
        `)
        .eq('id', repositoryId)
        .eq('git_providers.profile_id', profileId)
        .single();

      if (repoError || !repo) {
        return { 
          success: false, 
          error: repoError?.message || 'Repository not found or no permission' 
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
          error: 'Repository is already pinned' 
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
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },

  /**
   * Unpin a repository for a profile
   */
  async unpinRepository(
    repositoryId: string, 
    profileId: string
  ): Promise<DbResponse<null>> {
    try {
      const cookieStore = await cookies();
      const supabase = await createClient(cookieStore);

      const { error } = await supabase
        .from('profile_repository_pins')
        .delete()
        .match({
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
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  },

  // Legacy compatibility methods
  async findPinned({ profileId }: { profileId: string }) {
    const result = await this.getPinnedRepositories(profileId);
    if (!result.success) {
      console.error('Error finding pinned repositories:', result.error);
      return [];
    }
    return result.data || [];
  },

  async pinRepositoryLegacy({ repositoryId, profileId }: { repositoryId: string; profileId: string }) {
    const result = await this.pinRepository(repositoryId, profileId);
    if (!result.success) {
      throw new Error(result.error);
    }
    return result.data;
  },

  async unpinRepositoryLegacy({ repositoryId, profileId }: { repositoryId: string; profileId: string }) {
    const result = await this.unpinRepository(repositoryId, profileId);
    if (!result.success) {
      throw new Error(result.error);
    }
    return { success: true };
  },
};

export default pinRepository;