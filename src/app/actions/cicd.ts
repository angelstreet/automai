'use server';

import { revalidatePath } from 'next/cache';
import { getUser } from '@/app/actions/user';
import type {
  ActionResult,
  CICDProviderType,
  CICDProviderPayload,
  CICDProviderListResult,
  CICDProviderActionResult,
  CICDJob,
} from '@/app/[locale]/[tenant]/cicd/types';
import { logger } from '@/lib/logger';

/**
 * Fetch all CI/CD providers for the current tenant
 */
export async function getCICDProviders(): Promise<CICDProviderListResult> {
  try {
    // Get the current authenticated user
    const user = await getUser();
    if (!user) {
      logger.error('User not authenticated');
      return { success: false, error: 'User not authenticated', data: [] };
    }

    logger.info('Fetching CICD providers for tenant:', user.tenant_id);

    // Import the CI/CD database module
    const { default: cicdDb } = await import('@/lib/supabase/db-cicd/cicd');

    // Get CICD providers for the tenant
    const result = await cicdDb.getCICDProviders({ where: { tenant_id: user.tenant_id } });

    if (!result.success) {
      logger.error('Error fetching CICD providers:', result.error);
      return { success: false, error: result.error, data: [] };
    }

    return { success: true, data: result.data || [] };
  } catch (error: any) {
    logger.error('Unexpected error fetching CICD providers:', error);
    return { success: false, error: error.message || 'An unexpected error occurred', data: [] };
  }
}

/**
 * Get CI/CD jobs for all providers or a specific provider
 */
export async function getCICDJobs(providerId?: string): Promise<ActionResult<CICDJob[]>> {
  try {
    // Get the current authenticated user
    const user = await getUser();
    if (!user) {
      logger.error('User not authenticated');
      return { success: false, error: 'User not authenticated' };
    }

    // Import the CI/CD database module
    const { default: cicdDb } = await import('@/lib/supabase/db-cicd/cicd');

    // Get jobs with tenant isolation
    const jobs = await cicdDb.getCICDJobs({
      where: providerId
        ? { provider_id: providerId, tenant_id: user.tenant_id }
        : { tenant_id: user.tenant_id },
    });

    return { success: true, data: jobs.data || [] };
  } catch (error: any) {
    logger.error('Error fetching CI/CD jobs:', error);
    return { success: false, error: error.message || 'Failed to fetch CI/CD jobs' };
  }
}

/**
 * Create a new CICD provider for the current tenant
 */
export async function createCICDProvider(
  payload: CICDProviderPayload
): Promise<CICDProviderActionResult> {
  try {
    // Get the current authenticated user
    const user = await getUser();
    if (!user) {
      logger.error('User not authenticated');
      return { success: false, error: 'User not authenticated' };
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
      logger.error('Error creating CICD provider:', result.error);
      return { success: false, error: result.error };
    }

    // Revalidate relevant paths
    revalidatePath('/[locale]/[tenant]/cicd');
    revalidatePath('/[locale]/[tenant]/dashboard');

    return { success: true, data: (result as any).data };
  } catch (error: any) {
    logger.error('Unexpected error creating CICD provider:', error);
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
}

/**
 * Update an existing CICD provider
 */
export async function updateCICDProvider(
  id: string,
  payload: CICDProviderPayload
): Promise<CICDProviderActionResult> {
  try {
    // Get the current authenticated user
    const user = await getUser();
    if (!user) {
      logger.error('User not authenticated');
      return { success: false, error: 'User not authenticated' };
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
      logger.error('Error updating CICD provider:', result.error);
      return { success: false, error: result.error };
    }

    // Revalidate relevant paths
    revalidatePath('/[locale]/[tenant]/cicd');
    revalidatePath(`/[locale]/[tenant]/cicd/${id}`);

    return { success: true, data: (result as any).data };
  } catch (error: any) {
    logger.error('Unexpected error updating CICD provider:', error);
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
}

/**
 * Delete a CICD provider
 */
export async function deleteCICDProvider(id: string): Promise<ActionResult> {
  try {
    // Get the current authenticated user
    const user = await getUser();
    if (!user) {
      logger.error('User not authenticated');
      return { success: false, error: 'User not authenticated' };
    }

    // Import the CI/CD database module
    const { default: cicdDb } = await import('@/lib/supabase/db-cicd/cicd');

    // Delete the provider
    const result = await cicdDb.deleteCICDProvider({
      where: { id, tenant_id: user.tenant_id },
    });

    if (!result.success) {
      logger.error('Error deleting CICD provider:', result.error);
      return { success: false, error: result.error };
    }

    // Revalidate relevant paths
    revalidatePath('/[locale]/[tenant]/cicd');

    return { success: true };
  } catch (error: any) {
    logger.error('Unexpected error deleting CICD provider:', error);
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
}

/**
 * Test a CICD provider connection
 */
export async function testCICDProvider(provider: CICDProviderPayload): Promise<ActionResult> {
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

    // Get the current authenticated user
    const user = await getUser();
    if (!user) {
      logger.error('User not authenticated');
      return { success: false, error: 'User not authenticated' };
    }

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
      logger.error('Failed to create or test CICD provider:', error);
      return {
        success: false,
        error: error.message || 'Failed to test CICD provider',
      };
    }
  } catch (error: any) {
    logger.error('Unexpected error testing CICD provider:', error);
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
}

/**
 * Clear CICD-related cache entries
 */
export async function clearCICDCache(
  options?: {
    providerId?: string;
    tenantId?: string;
    userId?: string;
  }
): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // Get the current authenticated user
    const user = await getUser();
    if (!user) {
      logger.error('User not authenticated');
      return {
        success: false,
        message: 'User not authenticated',
      };
    }

    const { providerId, tenantId, userId } = options || {};
    
    // Revalidate CICD paths
    revalidatePath('/[locale]/[tenant]/cicd');
    
    // Determine appropriate message based on parameters
    if (providerId) {
      revalidatePath(`/[locale]/[tenant]/cicd/${providerId}`);
      return {
        success: true,
        message: `Cache cleared for CICD provider: ${providerId}`
      };
    } else if (userId && tenantId) {
      return {
        success: true,
        message: `Cache cleared for user: ${userId} and tenant: ${tenantId}`
      };
    } else if (tenantId || (tenantId === undefined && user)) {
      const targetTenantId = tenantId || user.tenant_id;
      return {
        success: true,
        message: `Cache cleared for tenant: ${targetTenantId}`
      };
    } else if (userId) {
      return {
        success: true,
        message: `Cache cleared for user: ${userId}`
      };
    }
    
    return {
      success: true,
      message: 'All CICD cache cleared'
    };
  } catch (error) {
    logger.error('Error clearing CICD cache:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error clearing cache',
    };
  }
}