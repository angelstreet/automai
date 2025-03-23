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
import { getCICDProvider } from '@/lib/services/cicd';
import cicdDb from '@/lib/supabase/db-cicd';

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

    if (!currentUser) {
      return { success: false, error: 'User not authenticated' };
    }

    console.log(`[CICDActions] User status for ${origin}:`, {
      authenticated: !!currentUser,
      tenant: currentUser.tenant_id || 'unknown',
    });

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
    
    console.log(`[CICDActions] No cache found for ${origin}, fetching from service`);
    
    // Get providers using the service layer
    const result = await cicdDb.getCICDProviders({ 
      where: { 
        tenant_id: currentUser.tenant_id,
        deleted_at: null
      },
      orderBy: { created_at: 'desc' }
    });

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch CICD providers');
    }

    const providers = result.data || [];

    // Cache the result
    serverCache.set(cacheKey, providers);
    
    console.log(`[CICDActions] Successfully fetched CICD providers for ${origin}`);

    return { success: true, data: providers };
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