'use server';

import { revalidatePath } from 'next/cache';
import { 
  ActionResult, 
  CICDProviderPayload, 
  CICDProviderListResult,
  CICDProviderActionResult
} from '@/types/cicd';
import { getUser } from '@/app/actions/user';

/**
 * Fetch all CI/CD providers for the current tenant
 */
export async function getCICDProvidersAction(): Promise<CICDProviderListResult> {
  try {
    // Get the current authenticated user
    const user = await getUser();
    
    if (!user) {
      console.error('User not authenticated');
      return { success: false, error: 'User not authenticated', data: [] };
    }
    
    console.log('Fetching CICD providers for tenant:', user.tenant_id);
    
    // Import the CI/CD database module
    const { default: cicdDb } = await import('@/lib/supabase/db-deployment/cicd');
    
    // Get CICD providers for the tenant
    console.log('Calling cicdDb.getCICDProviders with params:', { where: { tenant_id: user.tenant_id } });
    const result = await cicdDb.getCICDProviders({ where: { tenant_id: user.tenant_id } });
    
    console.log('Raw result from cicdDb.getCICDProviders:', JSON.stringify(result, null, 2));
    
    if (!result.success) {
      console.error('Error fetching CICD providers:', result.error);
      return { success: false, error: result.error, data: [] };
    }
    
    console.log('Returning CICD providers:', JSON.stringify(result.data, null, 2));
    return { success: true, data: result.data || [] };
  } catch (error: any) {
    console.error('Unexpected error fetching CICD providers:', error);
    return { success: false, error: error.message || 'An unexpected error occurred', data: [] };
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
    const { default: cicdDb } = await import('@/lib/supabase/db-deployment/cicd');
    
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
    const { default: cicdDb } = await import('@/lib/supabase/db-deployment/cicd');
    
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
    const { default: cicdDb } = await import('@/lib/supabase/db-deployment/cicd');
    
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