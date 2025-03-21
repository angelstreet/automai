'use server';

import { revalidatePath } from 'next/cache';
import { 
  ActionResult, 
  CICDProviderPayload, 
  CICDProviderListResult,
  CICDProviderActionResult
} from '@/types/cicd';
import { getUser } from '@/app/actions/user';
import { logger } from '@/lib/logger';
import { CICDProvider } from '@/app/[locale]/[tenant]/cicd/types';
import { serverCache } from '@/lib/cache';
import { AuthUser } from '@/types/user';

/**
 * Get all CI/CD providers
 * @param user Optional pre-fetched user data to avoid redundant auth calls
 * @param origin The component or hook that triggered this action
 * @param renderCount Optional render count for debugging
 */
export async function getCICDProviders(
  user?: AuthUser | null,
  origin: string = 'unknown',
  renderCount?: number
): Promise<{ success: boolean; error?: string; data?: CICDProvider[] }> {
  console.log(`[CICDActions] getCICDProviders called from ${origin}${renderCount ? ` (render #${renderCount})` : ''}`, {
    userProvided: !!user,
    cached: user?.tenant_id ? serverCache.has(`cicd:${user.tenant_id}`) : false
  });
  
  try {
    // Use provided user data or fetch it if not provided
    const currentUser = user || await getUser();

    console.log(`[CICDActions] User status for ${origin}:`, {
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
    const cacheKey = `cicd:${currentUser.tenant_id}`;
    
    // Check cache first
    const cached = serverCache.get<CICDProvider[]>(cacheKey);
    if (cached) {
      console.log(`[CICDActions] Using cached CICD data for ${origin}`, { 
        count: cached.length,
        cacheKey,
        age: serverCache.getAge(cacheKey)
      });
      return { success: true, data: cached };
    }
    
    console.log(`[CICDActions] No cache found for ${origin}, fetching from database`);

    // TODO: Replace with actual database query
    // For now, return a mock list of providers
    const mockProviders: CICDProvider[] = [
      {
        id: 'github-actions',
        name: 'GitHub Actions',
        type: 'github',
        description: 'GitHub Actions CI/CD provider',
        url: 'https://github.com/features/actions',
        icon: '/images/cicd/github-actions.svg',
        status: 'active',
        supportedFeatures: ['continuous-integration', 'continuous-deployment'],
        lastSyncTime: new Date().toISOString(),
      },
      {
        id: 'gitlab-ci',
        name: 'GitLab CI/CD',
        type: 'gitlab',
        description: 'GitLab CI/CD provider',
        url: 'https://docs.gitlab.com/ee/ci/',
        icon: '/images/cicd/gitlab-ci.svg',
        status: 'active',
        supportedFeatures: ['continuous-integration', 'continuous-deployment', 'security-scanning'],
        lastSyncTime: new Date().toISOString(),
      },
      {
        id: 'jenkins',
        name: 'Jenkins',
        type: 'jenkins',
        description: 'Jenkins CI/CD server',
        url: 'https://www.jenkins.io/',
        icon: '/images/cicd/jenkins.svg',
        status: 'inactive',
        supportedFeatures: ['continuous-integration', 'continuous-deployment', 'pipeline'],
        lastSyncTime: null,
      },
    ];

    // Cache the result
    serverCache.set(cacheKey, mockProviders);
    
    console.log(`[CICDActions] Successfully fetched CICD providers for ${origin}`);

    return { success: true, data: mockProviders };
  } catch (error: any) {
    console.error(`[CICDActions] Error fetching CICD providers (${origin}):`, error);
    return { 
      success: false, 
      error: error.message || 'Failed to fetch CI/CD providers' 
    };
  }
}

/**
 * Create a new CICD provider for the current tenant
 */
export async function createCICDProviderAction(payload: CICDProviderPayload): Promise<CICDProviderActionResult> {
  try {
    // Get the current authenticated user
    const user = await getUser();
    
    if (!user) {
      console.error('User not authenticated');
      return { success: false, error: 'User not authenticated' };
    }
    
    // Import the CI/CD database module
    const { default: cicdDb } = await import('@/lib/supabase/db-cicd');
    
    // Prepare data for database
    const providerData = {
      tenant_id: user.tenant_id,
      name: payload.name,
      type: payload.type,
      url: payload.url,
      config: payload.config || {}
    };
    
    // Create the provider
    const result = await cicdDb.createCICDProvider({ data: providerData });
    
    if (!result.success) {
      console.error('Error creating CICD provider:', result.error);
      return { success: false, error: result.error };
    }
    
    // Revalidate the providers list
    revalidatePath(`/[locale]/[tenant]/cicd`);
    
    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('Unexpected error creating CICD provider:', error);
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
}

/**
 * Update an existing CICD provider
 */
export async function updateCICDProviderAction(id: string, payload: CICDProviderPayload): Promise<CICDProviderActionResult> {
  try {
    // Get the current authenticated user
    const user = await getUser();
    
    if (!user) {
      console.error('User not authenticated');
      return { success: false, error: 'User not authenticated' };
    }
    
    // Import the CI/CD database module
    const { default: cicdDb } = await import('@/lib/supabase/db-cicd');
    
    // Prepare data for database
    const providerData = {
      id,
      name: payload.name,
      type: payload.type,
      url: payload.url,
      config: payload.config || {}
    };
    
    // Update the provider
    const result = await cicdDb.updateCICDProvider({ 
      data: providerData,
      where: { id, tenant_id: user.tenant_id }
    });
    
    if (!result.success) {
      console.error('Error updating CICD provider:', result.error);
      return { success: false, error: result.error };
    }
    
    // Revalidate the providers list
    revalidatePath(`/[locale]/[tenant]/cicd`);
    
    return { success: true, data: result.data };
  } catch (error: any) {
    console.error('Unexpected error updating CICD provider:', error);
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
}

/**
 * Delete a CICD provider
 */
export async function deleteCICDProviderAction(id: string): Promise<ActionResult> {
  try {
    // Get the current authenticated user
    const user = await getUser();
    
    if (!user) {
      console.error('User not authenticated');
      return { success: false, error: 'User not authenticated' };
    }
    
    // Import the CI/CD database module
    const { default: cicdDb } = await import('@/lib/supabase/db-cicd');
    
    // Delete the provider
    const result = await cicdDb.deleteCICDProvider({ 
      where: { id, tenant_id: user.tenant_id } 
    });
    
    if (!result.success) {
      console.error('Error deleting CICD provider:', result.error);
      return { success: false, error: result.error };
    }
    
    // Revalidate the providers list
    revalidatePath(`/[locale]/[tenant]/cicd`);
    
    return { success: true };
  } catch (error: any) {
    console.error('Unexpected error deleting CICD provider:', error);
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
}

/**
 * Test a CICD provider connection
 */
export async function testCICDProviderAction(provider: CICDProviderPayload): Promise<ActionResult> {
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
      console.error('User not authenticated');
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
      credentials: provider.config.credentials
    };
    
    // Create provider instance directly for testing
    // This is fine since we're not storing anything in the database
    try {
      const providerInstance = getCICDProvider(providerConfig);
      const result = await providerInstance.testConnection();
      
      return { 
        success: result.success, 
        error: result.success ? undefined : result.error
      };
    } catch (error: any) {
      console.error('Failed to create or test CICD provider:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to test CICD provider'
      };
    }
  } catch (error: any) {
    console.error('Unexpected error testing CICD provider:', error);
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
} 