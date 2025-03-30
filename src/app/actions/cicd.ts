'use server';

import { revalidatePath } from 'next/cache';
import { cache } from 'react';

import type {
  ActionResult,
  CICDProviderPayload,
  CICDProviderListResult,
  CICDProviderActionResult,
  CICDJob,
} from '@/app/[locale]/[tenant]/cicd/types';
import { getUser } from '@/app/actions/user';

/**
 * Fetch all CI/CD providers for the current tenant
 */
export const getCICDProviders = cache(async (): Promise<CICDProviderListResult> => {
  try {
    // Get the current authenticated user
    const user = await getUser();
    if (!user) {
      console.error('[@action:cicd:getCICDProviders] User not authenticated');
      return { success: false, error: 'User not authenticated', data: [] };
    }

    console.log('[@action:cicd:getCICDProviders] Fetching CICD providers for tenant:', {
      tenantId: user.tenant_id,
    });

    // Import the CI/CD database module
    const { default: cicdDb } = await import('@/lib/supabase/db-cicd/cicd');

    // Get CICD providers for the tenant
    const result = await cicdDb.getCICDProviders({ where: { tenant_id: user.tenant_id } });

    if (!result.success) {
      console.error('[@action:cicd:getCICDProviders] Error fetching CICD providers:', {
        error: result.error,
      });
      return { success: false, error: result.error, data: [] };
    }

    return { success: true, data: result.data || [] };
  } catch (error: any) {
    console.error('[@action:cicd:getCICDProviders] Unexpected error fetching CICD providers:', {
      error: error.message,
    });
    return { success: false, error: error.message || 'An unexpected error occurred', data: [] };
  }
});

/**
 * Get CI/CD jobs for all providers or a specific provider
 */
export async function getCICDJobs(providerId?: string): Promise<ActionResult<CICDJob[]>> {
  try {
    // Get the current authenticated user
    const user = await getUser();
    if (!user) {
      console.error('[@action:cicd:getCICDJobs] User not authenticated');
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
    console.error('[@action:cicd:getCICDJobs] Error fetching CI/CD jobs:', error);
    return { success: false, error: error.message || 'Failed to fetch CI/CD jobs' };
  }
}

/**
 * Create a new CICD provider for the current tenant
 */
export async function createCICDProvider(
  payload: CICDProviderPayload,
): Promise<CICDProviderActionResult> {
  try {
    // Get the current authenticated user
    const user = await getUser();
    if (!user) {
      console.error('[@action:cicd:createCICDProvider] User not authenticated');
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
      console.error(
        '[@action:cicd:createCICDProvider] Error creating CICD provider:',
        result.error,
      );
      return { success: false, error: result.error };
    }

    // Revalidate relevant paths
    revalidatePath('/[locale]/[tenant]/cicd');
    revalidatePath('/[locale]/[tenant]/dashboard');

    return { success: true, data: (result as any).data };
  } catch (error: any) {
    console.error(
      '[@action:cicd:createCICDProvider] Unexpected error creating CICD provider:',
      error,
    );
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
}

/**
 * Update an existing CICD provider
 */
export async function updateCICDProvider(
  id: string,
  payload: CICDProviderPayload,
): Promise<CICDProviderActionResult> {
  try {
    // Get the current authenticated user
    const user = await getUser();
    if (!user) {
      console.error('[@action:cicd:updateCICDProvider] User not authenticated');
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
      console.error(
        '[@action:cicd:updateCICDProvider] Error updating CICD provider:',
        result.error,
      );
      return { success: false, error: result.error };
    }

    // Revalidate relevant paths
    revalidatePath('/[locale]/[tenant]/cicd');
    revalidatePath(`/[locale]/[tenant]/cicd/${id}`);

    return { success: true, data: (result as any).data };
  } catch (error: any) {
    console.error(
      '[@action:cicd:updateCICDProvider] Unexpected error updating CICD provider:',
      error,
    );
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
      console.error('[@action:cicd:deleteCICDProvider] User not authenticated');
      return { success: false, error: 'User not authenticated' };
    }

    // Import the CI/CD database module
    const { default: cicdDb } = await import('@/lib/supabase/db-cicd/cicd');

    // Delete the provider
    const result = await cicdDb.deleteCICDProvider({
      where: { id, tenant_id: user.tenant_id },
    });

    if (!result.success) {
      console.error(
        '[@action:cicd:deleteCICDProvider] Error deleting CICD provider:',
        result.error,
      );
      return { success: false, error: result.error };
    }

    // Revalidate relevant paths
    revalidatePath('/[locale]/[tenant]/cicd');

    return { success: true };
  } catch (error: any) {
    console.error(
      '[@action:cicd:deleteCICDProvider] Unexpected error deleting CICD provider:',
      error,
    );
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
      console.error('[@action:cicd:testCICDProvider] User not authenticated');
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
      console.error(
        '[@action:cicd:testCICDProvider] Failed to create or test CICD provider:',
        error,
      );
      return {
        success: false,
        error: error.message || 'Failed to test CICD provider',
      };
    }
  } catch (error: any) {
    console.error('[@action:cicd:testCICDProvider] Unexpected error testing CICD provider:', error);
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
}

/**
 * Test the Jenkins API directly using the provider credentials from the database
 */
export async function testJenkinsAPI(): Promise<{ success: boolean; error?: string; data?: any }> {
  try {
    // Get authenticated user
    const user = await getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized access' };
    }

    console.log(
      '[@action:cicd:testJenkinsAPI] Actions layer: Testing Jenkins API with authenticated user',
      user.id,
    );

    // Import the CI/CD database module
    const { default: cicdDb } = await import('@/lib/supabase/db-cicd/cicd');

    // Get all Jenkins providers for the tenant
    const providers = await cicdDb.getCICDProviders({ where: { tenant_id: user.tenant_id } });

    if (!providers.success || !providers.data || providers.data.length === 0) {
      return { success: false, error: 'No Jenkins provider found' };
    }

    // Find the Jenkins provider (first one available)
    const jenkinsProvider = providers.data.find((p) => p.type === 'jenkins');

    if (!jenkinsProvider) {
      return { success: false, error: 'No Jenkins provider found' };
    }

    console.log('[@action:cicd:testJenkinsAPI] Actions layer: Found Jenkins provider:', {
      id: jenkinsProvider.id,
      name: jenkinsProvider.name,
      url: jenkinsProvider.url,
      auth_type: jenkinsProvider.config.auth_type,
      credentials_available: {
        username: !!jenkinsProvider.config.credentials.username,
        token: !!jenkinsProvider.config.credentials.token,
      },
    });

    // Import the CICD provider
    const { getCICDProvider } = await import('@/lib/services/cicd');

    // Get the provider instance
    const providerResult = await getCICDProvider(jenkinsProvider.id, user.tenant_id);

    if (!providerResult.success || !providerResult.data) {
      return {
        success: false,
        error: providerResult.error || 'Failed to initialize Jenkins provider',
      };
    }

    const provider = providerResult.data;

    // Test the connection
    const testResult = await provider.testConnection();

    console.log(
      '[@action:cicd:testJenkinsAPI] Actions layer: Jenkins connection test result:',
      testResult,
    );

    if (!testResult.success) {
      return { success: false, error: `Connection test failed: ${testResult.error}` };
    }

    // Try to get a crumb
    const crumbResult = await provider['getCrumb']();

    console.log('[@action:cicd:testJenkinsAPI] Actions layer: Jenkins crumb result:', crumbResult);

    return {
      success: true,
      data: {
        connectionTest: testResult,
        crumbTest: crumbResult,
        provider: {
          id: jenkinsProvider.id,
          name: jenkinsProvider.name,
          url: jenkinsProvider.url,
          type: jenkinsProvider.type,
        },
      },
    };
  } catch (error: any) {
    console.error('[@action:cicd:testJenkinsAPI] Actions layer: Error testing Jenkins API:', error);
    return { success: false, error: error.message || 'Error testing Jenkins API' };
  }
}

/**
 * Clear CICD-related cache entries
 */
export async function clearCICDCache(options?: {
  providerId?: string;
  tenantId?: string;
  userId?: string;
}): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // Get the current authenticated user
    const user = await getUser();
    if (!user) {
      console.error('[@action:cicd:clearCICDCache] User not authenticated');
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
        message: `Cache cleared for CICD provider: ${providerId}`,
      };
    } else if (userId && tenantId) {
      return {
        success: true,
        message: `Cache cleared for user: ${userId} and tenant: ${tenantId}`,
      };
    } else if (tenantId || (tenantId === undefined && user)) {
      const targetTenantId = tenantId || user.tenant_id;
      return {
        success: true,
        message: `Cache cleared for tenant: ${targetTenantId}`,
      };
    } else if (userId) {
      return {
        success: true,
        message: `Cache cleared for user: ${userId}`,
      };
    }

    return {
      success: true,
      message: 'All CICD cache cleared',
    };
  } catch (error) {
    console.error('[@action:cicd:clearCICDCache] Error clearing CICD cache:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error clearing cache',
    };
  }
}
