'use server';

import { Repository } from '@/app/[locale]/[tenant]/repository/types';
import { serverCache } from '@/lib/cache';
import { getUser } from '@/app/actions/user';
import { AuthUser } from '@/types/user';

/**
 * Get all repositories for the current user/tenant
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 * @param origin The component or hook that triggered this action
 * @param renderCount Optional render count for debugging
 */
export async function getRepositories(
  user?: AuthUser | null,
  origin: string = 'unknown',
  renderCount?: number,
): Promise<{ success: boolean; error?: string; data?: Repository[] }> {
  console.log(
    `[RepoActions] getRepositories called from ${origin}${renderCount ? ` (render #${renderCount})` : ''}`,
    {
      userProvided: !!user
    },
  );

  try {
    // Use provided user data or fetch it if not provided
    const currentUser = user || (await getUser());

    if (!currentUser) {
      console.log(`[RepoActions] User not authenticated for ${origin}`);
      return {
        success: false,
        error: 'Unauthorized - Please sign in',
      };
    }

    // Create a standardized cache key using the helper method
    const cacheKey = serverCache.tenantKey(currentUser.tenant_id, 'repository-list');
    
    // Use enhanced getOrSet function with proper tagging
    return await serverCache.getOrSet(
      cacheKey,
      async () => {
        console.log(`[RepoActions] Cache miss for ${origin}, fetching from database`);
        
        // TODO: Implement actual database query
        // For now, return empty array as placeholder
        const repositories: Repository[] = [];
        
        console.log(`[RepoActions] Successfully fetched repositories for ${origin}`);
        
        return { success: true, data: repositories };
      },
      {
        ttl: 5 * 60 * 1000, // 5 minutes cache
        tags: ['repository-data', `tenant:${currentUser.tenant_id}`],
        source: `getRepositories:${origin}`
      }
    );
  } catch (error: any) {
    console.error(`[RepoActions] Error in getRepositories (${origin}):`, error);
    return {
      success: false,
      error: error.message || 'Failed to fetch repositories',
    };
  }
}
