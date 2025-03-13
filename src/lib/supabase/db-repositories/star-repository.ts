import { createClient } from '@/lib/supabase/server';

// Improved response type format following guidelines
type DbResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Star repository DB operations
const starRepository = {
  /**
   * Get all starred repositories for a profile
   */
  async getStarredRepositories(profileId: string): Promise<DbResponse<any[]>> {
    try {
      const supabase = await createClient();
      
      // Get all starred repositories for the user
      const { data: starData, error: starError } = await supabase
        .from('profile_repository_stars')
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
      const repositoryIds = starData.map(item => item.repository_id);
      
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
        .from('profile_repository_stars')
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
        .from('profile_repository_stars')
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

export default starRepository;
