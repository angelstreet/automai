/**
 * SWR hooks for deployment data
 */
import useSWR, { mutate } from 'swr';
import { actionFetcher } from '@/lib/fetcher';
import {
  getDeployments,
  getDeploymentById,
  createDeployment,
  deleteDeployment,
  abortDeployment,
  refreshDeployment,
  getScriptsForRepository,
  clearDeploymentCache
} from '@/app/[locale]/[tenant]/deployment/actions';
import { getHosts } from '@/app/[locale]/[tenant]/hosts/actions';
import { getRepositories } from '@/app/[locale]/[tenant]/repositories/actions';
import type { Deployment, DeploymentFormData } from '@/app/[locale]/[tenant]/deployment/types';

/**
 * Hook for fetching all deployments
 */
export function useDeployments() {
  return useSWR(
    'deployments',
    () => actionFetcher(getDeployments),
    {
      dedupingInterval: 15 * 60 * 1000, // 15 minutes
      revalidateOnFocus: false
    }
  );
}

/**
 * Hook for fetching a single deployment
 */
export function useDeploymentById(id: string | null) {
  return useSWR(
    id ? `deployment-${id}` : null,
    () => id ? actionFetcher(getDeploymentById, id) : null,
    {
      dedupingInterval: 60 * 1000, // 1 minute
      revalidateOnFocus: false
    }
  );
}

/**
 * Hook for fetching scripts for a repository
 */
export function useRepositoryScripts(repositoryId: string | null) {
  return useSWR(
    repositoryId ? `scripts-${repositoryId}` : null,
    () => repositoryId ? actionFetcher(getScriptsForRepository, repositoryId) : [],
    {
      dedupingInterval: 30 * 60 * 1000, // 30 minutes
      revalidateOnFocus: false
    }
  );
}

/**
 * Hook for fetching available hosts
 */
export function useAvailableHosts() {
  return useSWR(
    'hosts',
    () => actionFetcher(getHosts),
    {
      dedupingInterval: 15 * 60 * 1000, // 15 minutes
      revalidateOnFocus: false
    }
  );
}

/**
 * Hook for fetching repositories
 */
export function useRepositoriesForDeployment() {
  return useSWR(
    'repositories-for-deployment',
    () => actionFetcher(getRepositories),
    {
      dedupingInterval: 15 * 60 * 1000, // 15 minutes
      revalidateOnFocus: false
    }
  );
}

/**
 * Create a new deployment
 */
export async function createNewDeployment(formData: DeploymentFormData) {
  try {
    const result = await createDeployment(formData);
    
    if (result.success) {
      // Revalidate deployments data
      await mutate('deployments');
    }
    
    return result;
  } catch (error) {
    console.error('Error creating deployment:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Delete a deployment
 */
export async function removeDeployment(id: string) {
  try {
    // Optimistic update
    const currentData = await mutate(
      'deployments',
      (data: Deployment[] | undefined) => 
        data ? data.filter(deployment => deployment.id !== id) : [],
      false // Don't revalidate yet
    );
    
    const result = await deleteDeployment(id);
    
    if (result) {
      // Success - revalidate to ensure data is correct
      await mutate('deployments');
      return { success: true };
    } else {
      // Failed - revert optimistic update
      await mutate('deployments', currentData, false);
      return { success: false, error: 'Failed to delete deployment' };
    }
  } catch (error) {
    console.error('Error deleting deployment:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Abort a running deployment
 */
export async function abortRunningDeployment(id: string) {
  try {
    const result = await abortDeployment(id);
    
    if (result.success) {
      // Revalidate deployment data
      await mutate(`deployment-${id}`);
      await mutate('deployments');
    }
    
    return result;
  } catch (error) {
    console.error('Error aborting deployment:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Refresh a deployment's status
 */
export async function refreshDeploymentStatus(id: string) {
  try {
    const result = await refreshDeployment(id);
    
    if (result.success && result.deployment) {
      // Update the cache with fresh data
      await mutate(`deployment-${id}`, result.deployment, false);
      
      // Also update the deployments list
      await mutate('deployments', (data: Deployment[] | undefined) => {
        if (!data) return data;
        return data.map(deployment => 
          deployment.id === id ? result.deployment : deployment
        );
      }, false);
    }
    
    return result;
  } catch (error) {
    console.error('Error refreshing deployment:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Clear deployment cache and refresh data
 */
export async function refreshDeploymentData(options?: {
  deploymentId?: string;
  tenantId?: string;
  userId?: string;
}) {
  try {
    await clearDeploymentCache(options);
    
    // Revalidate specific data or all deployment data
    if (options?.deploymentId) {
      await mutate(`deployment-${options.deploymentId}`);
    }
    
    // Always revalidate the main deployments list
    await mutate('deployments');
    return true;
  } catch (error) {
    console.error('Error refreshing deployment data:', error);
    return false;
  }
}