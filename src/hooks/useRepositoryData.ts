/**
 * SWR hooks for repository data
 */
import useSWR, { mutate } from 'swr';
import { actionFetcher } from '@/lib/fetcher';
import { 
  getRepositoriesWithStarred,
  getRepository,
  starRepositoryAction,
  unstarRepositoryAction,
  clearRepositoriesCache
} from '@/app/[locale]/[tenant]/repositories/actions';
import type { Repository } from '@/app/[locale]/[tenant]/repositories/types';

/**
 * Hook for fetching all repositories with starred info
 */
export function useRepositoriesWithStarred() {
  return useSWR(
    'repositories-with-starred',
    () => actionFetcher(getRepositoriesWithStarred),
    {
      dedupingInterval: 15 * 60 * 1000, // 15 minutes
      revalidateOnFocus: false
    }
  );
}

/**
 * Hook for fetching a single repository
 */
export function useRepositoryById(id: string | null) {
  return useSWR(
    id ? `repository-${id}` : null,
    () => id ? actionFetcher(getRepository, id) : null,
    {
      dedupingInterval: 60 * 1000, // 1 minute
      revalidateOnFocus: false
    }
  );
}

/**
 * Toggle star status for a repository
 */
export async function toggleStar(
  repository: Repository,
  isStarred: boolean
) {
  try {
    // Call the appropriate action
    if (isStarred) {
      await unstarRepositoryAction(repository.id);
    } else {
      await starRepositoryAction(repository.id);
    }
    
    // Revalidate data
    await mutate('repositories-with-starred');
    return true;
  } catch (error) {
    console.error('Error toggling star:', error);
    return false;
  }
}

/**
 * Clear cache and refresh data
 */
export async function refreshRepositories() {
  try {
    await clearRepositoriesCache();
    await mutate('repositories-with-starred');
    return true;
  } catch (error) {
    console.error('Error refreshing repositories:', error);
    return false;
  }
}