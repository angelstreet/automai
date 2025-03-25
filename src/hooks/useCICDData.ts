/**
 * SWR hooks for CICD data
 */
import useSWR, { mutate } from 'swr';
import { actionFetcher } from '@/lib/fetcher';
import {
  getCICDProviders,
  createCICDProviderAction,
  updateCICDProviderAction,
  deleteCICDProviderAction,
  testCICDProviderAction,
  getCICDJobs,
  clearCICDCache
} from '@/app/[locale]/[tenant]/cicd/actions';
import type { 
  CICDProviderType, 
  CICDProviderPayload, 
  ActionResult, 
  CICDJob 
} from '@/app/[locale]/[tenant]/cicd/types';

/**
 * Hook for fetching CICD providers
 */
export function useCICDProviders() {
  return useSWR(
    'cicd-providers',
    () => actionFetcher(getCICDProviders),
    {
      dedupingInterval: 5 * 60 * 1000, // 5 minutes
      revalidateOnFocus: false
    }
  );
}

/**
 * Hook for fetching CICD jobs (for all providers or a specific provider)
 */
export function useCICDJobs(providerId?: string) {
  return useSWR(
    providerId ? `cicd-jobs-${providerId}` : 'cicd-jobs',
    () => actionFetcher(getCICDJobs, providerId),
    {
      dedupingInterval: 2 * 60 * 1000, // 2 minutes
      revalidateOnFocus: false
    }
  );
}

/**
 * Create a new CICD provider
 */
export async function createCICDProvider(payload: CICDProviderPayload): Promise<ActionResult<CICDProviderType>> {
  try {
    const result = await createCICDProviderAction(payload);
    
    if (result.success) {
      // Revalidate providers data
      await mutate('cicd-providers');
    }
    
    return result;
  } catch (error) {
    console.error('Error creating CICD provider:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Update an existing CICD provider
 */
export async function updateCICDProvider(
  id: string, 
  payload: CICDProviderPayload
): Promise<ActionResult<CICDProviderType>> {
  try {
    const result = await updateCICDProviderAction(id, payload);
    
    if (result.success) {
      // Revalidate providers data
      await mutate('cicd-providers');
    }
    
    return result;
  } catch (error) {
    console.error('Error updating CICD provider:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Delete a CICD provider
 */
export async function deleteCICDProvider(id: string): Promise<ActionResult> {
  try {
    // Optimistic update
    const currentData = await mutate(
      'cicd-providers',
      (data: { data: CICDProviderType[] } | undefined) => {
        if (!data || !data.data) return { data: [] };
        return { 
          ...data, 
          data: data.data.filter(provider => provider.id !== id) 
        };
      },
      false // Don't revalidate yet
    );
    
    const result = await deleteCICDProviderAction(id);
    
    if (result.success) {
      // Success - revalidate to ensure data is correct
      await mutate('cicd-providers');
      return { success: true };
    } else {
      // Failed - revert optimistic update
      await mutate('cicd-providers', currentData, false);
      return { success: false, error: result.error };
    }
  } catch (error) {
    console.error('Error deleting CICD provider:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Test a CICD provider connection
 */
export async function testCICDProvider(provider: CICDProviderPayload): Promise<ActionResult> {
  try {
    return await testCICDProviderAction(provider);
  } catch (error) {
    console.error('Error testing CICD provider:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * Get a CICD provider by ID from the current providers list
 */
export function getCICDProviderById(
  providers: CICDProviderType[], 
  id: string
): CICDProviderType | null {
  return providers.find(provider => provider.id === id) || null;
}

/**
 * Get a CICD job by ID from the current jobs list
 */
export function getCICDJobById(
  jobs: CICDJob[], 
  id: string
): CICDJob | null {
  return jobs.find(job => job.id === id) || null;
}

/**
 * Clear CICD cache and refresh data
 */
export async function refreshCICDData(options?: {
  providerId?: string;
  tenantId?: string;
  userId?: string;
}): Promise<boolean> {
  try {
    await clearCICDCache(options);
    
    // Revalidate specific data or all CICD data
    if (options?.providerId) {
      await mutate(`cicd-jobs-${options.providerId}`);
    }
    
    // Always revalidate the main providers list
    await mutate('cicd-providers');
    await mutate('cicd-jobs');
    return true;
  } catch (error) {
    console.error('Error refreshing CICD data:', error);
    return false;
  }
}