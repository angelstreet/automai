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
  renderCount?: number
): Promise<{ success: boolean; error?: string; data?: Repository[] }> {
  console.log(`[RepoActions] getRepositories called from ${origin}${renderCount ? ` (render #${renderCount})` : ''}`, {
    userProvided: !!user,
    cached: user?.tenant_id ? serverCache.has(`repos:${user.tenant_id}`) : false
  });
  
  try {
    // Use provided user data or fetch it if not provided
    const currentUser = user || await getUser();
    
    console.log(`[RepoActions] User status for ${origin}:`, {
      authenticated: !!currentUser,
      tenant: currentUser?.tenant_id || 'unknown',
      hasRole: !!currentUser?.role
    });
    
    if (!currentUser) {
      return { 
        success: false, 
        error: 'Unauthorized - Please sign in' 
      };
    }

    // Create cache key using tenant
    const cacheKey = `repos:${currentUser.tenant_id}`;
    
    // Check cache first
    const cached = serverCache.get<Repository[]>(cacheKey);
    if (cached) {
      console.log(`[RepoActions] Using cached repository data for ${origin}`, { 
        count: cached.length,
        cacheKey,
        age: serverCache.getAge(cacheKey)
      });
      return { success: true, data: cached };
    }
    
    console.log(`[RepoActions] No cache found for ${origin}, fetching from database`);

    // Simulate database fetch by creating mock data
    // TODO: Replace with actual database query
    const mockRepos: Repository[] = [
      {
        id: '1',
        name: 'frontend-app',
        url: 'https://github.com/example/frontend-app',
        provider: 'github',
        default_branch: 'main',
        description: 'Frontend web application',
        language: 'typescript',
        stars: 12,
        forks: 3,
        is_private: false,
        last_commit: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '2',
        name: 'backend-api',
        url: 'https://github.com/example/backend-api',
        provider: 'github',
        default_branch: 'main',
        description: 'Backend API service',
        language: 'typescript',
        stars: 8,
        forks: 2,
        is_private: true,
        last_commit: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: '3',
        name: 'infrastructure',
        url: 'https://gitlab.com/example/infrastructure',
        provider: 'gitlab',
        default_branch: 'master',
        description: 'Infrastructure as code',
        language: 'terraform',
        stars: 5,
        forks: 1,
        is_private: true,
        last_commit: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    // Cache the result
    serverCache.set(cacheKey, mockRepos);
    
    console.log(`[RepoActions] Successfully fetched repositories for ${origin}`);

    return { success: true, data: mockRepos };
  } catch (error: any) {
    console.error(`[RepoActions] Error in getRepositories (${origin}):`, error);
    return { 
      success: false, 
      error: error.message || 'Failed to fetch repositories' 
    };
  }
} 