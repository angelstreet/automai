'use server';

import { revalidatePath } from 'next/cache';
import {
  ActionResult,
  CICDProviderType,
  CICDProviderPayload,
  CICDProviderListResult,
  CICDProviderActionResult,
} from './types';
import { getUser } from '@/app/actions/user';
import { AuthUser } from '@/types/user';
import { serverCache } from '@/lib/cache';

/**
 * Fetch all CI/CD providers for the current tenant
 *
 * This function is used by CICDContext and is called as getCICDProviders
 */
export async function getCICDProviders(
  user?: AuthUser | null,
  caller?: string,
  renderCount?: any,
): Promise<CICDProviderListResult> {
  try {
    // Use provided user or get the current authenticated user
    if (!user) {
      user = await getUser();
    }

    if (!user) {
      console.error('User not authenticated');
      return { success: false, error: 'User not authenticated', data: [] };
    }

    // Create a tenant-specific cache key
    const cacheKey = serverCache.tenantKey(user.tenant_id, 'cicd-providers');

    // Use enhanced getOrSet function with proper tagging
    return await serverCache.getOrSet(
      cacheKey,
      async () => {
        console.log('Cache miss - fetching CICD providers for tenant:', user!.tenant_id);

        // Import the CI/CD database module
        const { default: cicdDb } = await import('@/lib/supabase/db-cicd/cicd');

        // Get CICD providers for the tenant
        const result = await cicdDb.getCICDProviders({ where: { tenant_id: user!.tenant_id } });

        if (!result.success) {
          console.error('Error fetching CICD providers:', result.error);
          return { success: false, error: result.error, data: [] };
        }

        return { success: true, data: result.data || [] };
      },
      {
        ttl: 5 * 60 * 1000, // 5 minutes cache
        tags: ['cicd-data', `tenant:${user.tenant_id}`],
        source: 'getCICDProviders',
      },
    );
  } catch (error: any) {
    console.error('Unexpected error fetching CICD providers:', error);
    return { success: false, error: error.message || 'An unexpected error occurred', data: [] };
  }
}

// Keep the original action for backward compatibility
export const getCICDProvidersAction = getCICDProviders;

/**
 * Create a new CICD provider for the current tenant
 *
 * @param payload The provider payload
 * @param user Optional user object to avoid redundant authentication
 */
export async function createCICDProviderAction(
  payload: CICDProviderPayload,
  user?: AuthUser | null,
): Promise<CICDProviderActionResult> {
  try {
    // Use provided user or get the current authenticated user
    if (!user) {
      const userResult = await getUser();
      if (!userResult) {
        console.error('User not authenticated');
        return { success: false, error: 'User not authenticated' };
      }
      user = userResult;
    }

    // Import the CI/CD database module
    const { default: cicdDb } = await import('@/lib/supabase/db-cicd/cicd');

    // Prepare data for database
    const providerData = {
      tenant_id: user.tenant_id,
      name: payload.name,
      type: payload.type,
      url: payload.url,
      config: payload.config || {},
    };

    // Create the provider
    const result = await cicdDb.createCICDProvider({ data: providerData as any });

    if (!result.success) {
      console.error('Error creating CICD provider:', result.error);
      return { success: false, error: result.error };
    }

    // Invalidate cache using tag-based invalidation
    serverCache.deleteByTag('cicd-data');
    serverCache.deleteByTag(`tenant:${user.tenant_id}`);

    // Also clear specific cache entries
    serverCache.delete(serverCache.tenantKey(user.tenant_id, 'cicd-providers'));

    // Revalidate the providers list - keep this for backward compatibility
    revalidatePath(`/[locale]/[tenant]/cicd`);

    return { success: true, data: (result as any).data };
  } catch (error: any) {
    console.error('Unexpected error creating CICD provider:', error);
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
}

/**
 * Update an existing CICD provider
 *
 * @param id The provider ID
 * @param payload The provider payload
 * @param user Optional user object to avoid redundant authentication
 */
export async function updateCICDProviderAction(
  id: string,
  payload: CICDProviderPayload,
  user?: AuthUser | null,
): Promise<CICDProviderActionResult> {
  try {
    // Use provided user or get the current authenticated user
    if (!user) {
      const userResult = await getUser();
      if (!userResult) {
        console.error('User not authenticated');
        return { success: false, error: 'User not authenticated' };
      }
      user = userResult;
    }

    // Import the CI/CD database module
    const { default: cicdDb } = await import('@/lib/supabase/db-cicd/cicd');

    // Prepare data for database
    const providerData = {
      id,
      name: payload.name,
      type: payload.type,
      url: payload.url,
      config: payload.config || {},
    };

    // Update the provider
    const result = await cicdDb.updateCICDProvider({
      data: providerData as any,
      where: { id, tenant_id: user.tenant_id },
    });

    if (!result.success) {
      console.error('Error updating CICD provider:', result.error);
      return { success: false, error: result.error };
    }

    // Invalidate cache using both tag-based and specific key invalidation
    serverCache.deleteByTag('cicd-data');
    serverCache.deleteByTag(`tenant:${user.tenant_id}`);
    serverCache.deleteByTag(`cicd-provider:${id}`);

    // Also clear specific cache entries
    serverCache.delete(serverCache.tenantKey(user.tenant_id, 'cicd-providers'));
    serverCache.delete(serverCache.tenantKey(user.tenant_id, 'cicd-provider', id));

    // Revalidate the providers list - keep this for backward compatibility
    revalidatePath(`/[locale]/[tenant]/cicd`);

    return { success: true, data: (result as any).data };
  } catch (error: any) {
    console.error('Unexpected error updating CICD provider:', error);
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
}

/**
 * Delete a CICD provider
 *
 * @param id The provider ID
 * @param user Optional user object to avoid redundant authentication
 */
export async function deleteCICDProviderAction(
  id: string,
  user?: AuthUser | null,
): Promise<ActionResult> {
  try {
    // Use provided user or get the current authenticated user
    if (!user) {
      const userResult = await getUser();
      if (!userResult) {
        console.error('User not authenticated');
        return { success: false, error: 'User not authenticated' };
      }
      user = userResult;
    }

    // Import the CI/CD database module
    const { default: cicdDb } = await import('@/lib/supabase/db-cicd/cicd');

    // Delete the provider
    const result = await cicdDb.deleteCICDProvider({
      where: { id, tenant_id: user.tenant_id },
    });

    if (!result.success) {
      console.error('Error deleting CICD provider:', result.error);
      return { success: false, error: result.error };
    }

    // Invalidate cache using both tag-based and specific key invalidation
    serverCache.deleteByTag('cicd-data');
    serverCache.deleteByTag(`tenant:${user.tenant_id}`);
    serverCache.deleteByTag(`cicd-provider:${id}`);

    // Also clear specific cache entries
    serverCache.delete(serverCache.tenantKey(user.tenant_id, 'cicd-providers'));
    serverCache.delete(serverCache.tenantKey(user.tenant_id, 'cicd-provider', id));

    // Revalidate the providers list - keep this for backward compatibility
    revalidatePath(`/[locale]/[tenant]/cicd`);

    return { success: true };
  } catch (error: any) {
    console.error('Unexpected error deleting CICD provider:', error);
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
}

/**
 * Test a CICD provider connection
 *
 * @param provider The provider configuration
 * @param user Optional user object to avoid redundant authentication
 */
export async function testCICDProviderAction(
  provider: CICDProviderPayload,
  user?: AuthUser | null,
): Promise<ActionResult> {
  try {
    // Basic validation
    if (!provider.url) {
      return { success: false, error: 'Provider URL is required' };
    }

    if (!provider.type) {
      return { success: false, error: 'Provider type is required' };
    }

    if (!provider.config) {
      return { success: false, error: 'Provider configuration is required' };
    }

    // Use provided user or get the current authenticated user
    if (!user) {
      const userResult = await getUser();
      if (!userResult) {
        console.error('User not authenticated');
        return { success: false, error: 'User not authenticated' };
      }
      user = userResult;
    }

    // Create a cache key that includes connection details but excludes sensitive credentials
    // This is safe as we're only caching the connection test result, not the credentials
    const cacheKey = serverCache.userKey(
      user.id,
      'cicd-test',
      `${provider.type}:${provider.url}:${provider.config.auth_type || 'noauth'}`,
    );

    // Use a short TTL for test results since they might change if external services are updated
    return await serverCache.getOrSet(
      cacheKey,
      async () => {
        // Import the CI/CD service directly
        const { getCICDProvider } = await import('@/lib/services/cicd');

        // Format the provider config in the expected structure
        const providerConfig = {
          id: provider.id || 'temp-id',
          name: provider.name,
          type: provider.type,
          url: provider.url,
          auth_type: provider.config.auth_type,
          credentials: provider.config.credentials,
        };

        // Create provider instance directly for testing
        try {
          const providerInstance = getCICDProvider(providerConfig);
          const result = await providerInstance.testConnection();

          return {
            success: result.success,
            error: result.success ? undefined : result.error,
          };
        } catch (error: any) {
          console.error('Failed to create or test CICD provider:', error);
          return {
            success: false,
            error: error.message || 'Failed to test CICD provider',
          };
        }
      },
      {
        ttl: 60 * 1000, // Only cache for 1 minute since it's a connection test
        tags: ['cicd-test', `user:${user.id}`],
        source: 'testCICDProviderAction',
      },
    );
  } catch (error: any) {
    console.error('Unexpected error testing CICD provider:', error);
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
}

/**
 * Get CI/CD jobs for all providers or a specific provider
 *
 * @param providerId Optional provider ID to filter jobs
 * @param user Optional user object to avoid redundant authentication
 */
export async function getCICDJobs(
  providerId?: string,
  user?: AuthUser | null,
): Promise<ActionResult> {
  try {
    // Use provided user or get the current authenticated user
    if (!user) {
      const userResult = await getUser();
      if (!userResult) {
        console.error('User not authenticated');
        return { success: false, error: 'User not authenticated' };
      }
      user = userResult;
    }

    // Create an appropriate cache key based on whether we're filtering by provider
    const cacheKey = serverCache.tenantKey(
      user.tenant_id,
      'cicd-jobs',
      providerId ? `:provider:${providerId}` : ':all',
    );

    // Use enhanced getOrSet function with proper tagging
    return await serverCache.getOrSet(
      cacheKey,
      async () => {
        // Import the CI/CD database module
        const { default: cicdDb } = await import('@/lib/supabase/db-cicd/cicd');

        // Get jobs with tenant isolation
        const jobs = await cicdDb.getCICDJobs({
          where: providerId
            ? { provider_id: providerId, tenant_id: user!.tenant_id }
            : { tenant_id: user!.tenant_id },
        });

        return { success: true, data: jobs };
      },
      {
        ttl: 3 * 60 * 1000, // 3 minutes cache (jobs might change more frequently)
        tags: [
          'cicd-data',
          'cicd-jobs',
          providerId ? `cicd-provider:${providerId}` : undefined,
          `tenant:${user.tenant_id}`,
        ].filter(Boolean) as string[], // Filter out undefined values
        source: 'getCICDJobs',
      },
    );
  } catch (error) {
    console.error('Error fetching CI/CD jobs:', error);
    return { success: false, error: (error as Error).message || 'Failed to fetch CI/CD jobs' };
  }
}

/**
 * Clear CICD-related cache entries
 *
 * @param options Optional parameters to target specific cache entries
 * @param user Optional user object to avoid redundant authentication
 */
export async function clearCICDCache(
  options?: {
    providerId?: string;
    tenantId?: string;
    userId?: string;
  },
  user?: AuthUser | null,
): Promise<{
  success: boolean;
  clearedEntries: number;
  message: string;
}> {
  try {
    // Use provided user or get the current authenticated user
    if (!user) {
      const userResult = await getUser();
      if (!userResult) {
        console.error('User not authenticated');
        return {
          success: false,
          clearedEntries: 0,
          message: 'User not authenticated',
        };
      }
      user = userResult;
    }

    const { providerId, tenantId, userId } = options || {};
    let clearedEntries = 0;
    let message = 'Cache cleared successfully';

    // Determine the most appropriate cache clearing strategy
    if (providerId) {
      // Clear provider-specific cache
      clearedEntries += serverCache.deleteByTag(`cicd-provider:${providerId}`);
      message = `Cache cleared for CICD provider: ${providerId}`;
    } else if (userId && tenantId) {
      // Clear both user and tenant specific data
      clearedEntries += serverCache.deleteByTag(`user:${userId}`);
      clearedEntries += serverCache.deleteByTag(`tenant:${tenantId}`);
      clearedEntries += serverCache.deleteByTag('cicd-data');
      message = `Cache cleared for user: ${userId} and tenant: ${tenantId}`;
    } else if (tenantId || (tenantId === undefined && user)) {
      // Clear tenant-specific data - use current user's tenant if not specified
      const targetTenantId = tenantId || user.tenant_id;
      clearedEntries += serverCache.deleteByTag(`tenant:${targetTenantId}`);
      clearedEntries += serverCache.deleteByTag('cicd-data');
      message = `Cache cleared for tenant: ${targetTenantId}`;
    } else if (userId) {
      // Clear user-specific data
      clearedEntries += serverCache.deleteByTag(`user:${userId}`);
      clearedEntries += serverCache.deleteByTag('cicd-test');
      message = `Cache cleared for user: ${userId}`;
    } else {
      // Clear all CICD-related cache
      clearedEntries += serverCache.deleteByTag('cicd-data');
      clearedEntries += serverCache.deleteByTag('cicd-jobs');
      clearedEntries += serverCache.deleteByTag('cicd-test');
      message = 'All CICD cache cleared';
    }

    return {
      success: true,
      clearedEntries,
      message,
    };
  } catch (error) {
    console.error('Error clearing CICD cache:', error);
    return {
      success: false,
      clearedEntries: 0,
      message: error instanceof Error ? error.message : 'Unknown error clearing cache',
    };
  }
}
