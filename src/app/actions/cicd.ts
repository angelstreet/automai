'use server';

import { revalidatePath } from 'next/cache';
import { cache } from 'react';
import { cookies } from 'next/headers';

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

    // Get cookies once for all operations
    const cookieStore = await cookies();

    console.log('[@action:cicd:getCICDProviders] Fetching CICD providers for tenant:', {
      tenantId: user.tenant_id,
    });

    // Import the CI/CD database module
    const { default: cicdDb } = await import('@/lib/supabase/db-cicd/cicd');

    // Get CICD providers for the tenant
    const result = await cicdDb.getCICDProviders(
      { where: { tenant_id: user.tenant_id } },
      cookieStore,
    );

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

    // Get cookies once for all operations
    const cookieStore = await cookies();

    // Import the CI/CD database module
    const { default: cicdDb } = await import('@/lib/supabase/db-cicd/cicd');

    // Get jobs with tenant isolation
    const jobs = await cicdDb.getCICDJobs(
      {
        where: providerId
          ? { provider_id: providerId, tenant_id: user.tenant_id }
          : { tenant_id: user.tenant_id },
      },
      cookieStore,
    );

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

    // Get cookies once for all operations
    const cookieStore = await cookies();

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
    const result = await cicdDb.createCICDProvider({ data: providerData as any }, cookieStore);

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

    // Get cookies once for all operations
    const cookieStore = await cookies();

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
    const result = await cicdDb.updateCICDProvider(
      {
        data: providerData as any,
        where: { id, tenant_id: user.tenant_id },
      },
      cookieStore,
    );

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

    // Get cookies once for all operations
    const cookieStore = await cookies();

    // Import the CI/CD database module
    const { default: cicdDb } = await import('@/lib/supabase/db-cicd/cicd');

    // Delete the provider
    const result = await cicdDb.deleteCICDProvider(
      {
        where: { id, tenant_id: user.tenant_id },
      },
      cookieStore,
    );

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

    // Get cookies once for all operations
    const cookieStore = await cookies();

    // Initialize the provider service
    const { getCICDProvider } = await import('@/lib/services/cicd');

    // Test Jenkins connection
    if (provider.type === 'jenkins') {
      const jenkinsUrl = provider.url;
      const username = provider.config.username;
      const apiToken = provider.config.apiToken;

      // Basic validation for Jenkins specific fields
      if (!username) {
        return { success: false, error: 'Jenkins username is required' };
      }

      if (!apiToken) {
        return { success: false, error: 'Jenkins API token is required' };
      }

      try {
        // Test the Jenkins connection
        const response = await fetch(`${jenkinsUrl}/api/json`, {
          headers: {
            Authorization: `Basic ${Buffer.from(`${username}:${apiToken}`).toString('base64')}`,
          },
        });

        if (!response.ok) {
          return {
            success: false,
            error: `Failed to connect to Jenkins: ${response.statusText}`,
          };
        }

        const data = await response.json();

        return { success: true, data };
      } catch (error: any) {
        console.error('[@action:cicd:testCICDProvider] Error testing Jenkins connection:', error);
        return {
          success: false,
          error: `Failed to connect to Jenkins: ${error.message}`,
        };
      }
    }

    return { success: false, error: 'Unsupported CICD provider type' };
  } catch (error: any) {
    console.error('[@action:cicd:testCICDProvider] Unexpected error testing provider:', error);
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
}

/**
 * Clear CICD cache
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
    // Get cookies once for all operations
    const cookieStore = await cookies();

    // Import the CI/CD database module
    const { default: cicdDb } = await import('@/lib/supabase/db-cicd/cicd');

    // Call clear cache with cookieStore
    const result = await cicdDb.clearCache(cookieStore);

    return {
      success: true,
      message: `CICD cache cleared successfully${
        options?.providerId ? ` for provider ${options.providerId}` : ''
      }`,
    };
  } catch (error: any) {
    console.error('[@action:cicd:clearCICDCache] Error clearing cache:', error);
    return {
      success: false,
      message: `Failed to clear CICD cache: ${error.message}`,
    };
  }
}
