'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { 
  ActionResult, 
  CICDProviderPayload, 
  CICDProviderListResult,
  CICDProviderActionResult
} from '@/types/cicd';

/**
 * Fetch all CI/CD providers for the current tenant
 */
export async function getCICDProvidersAction(): Promise<CICDProviderListResult> {
  try {
    const supabase = createClient();
    
    // Get the current tenant from the authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized', data: [] };
    }
    
    const { data: tenant } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();
    
    if (!tenant) {
      return { success: false, error: 'No tenant found for user', data: [] };
    }
    
    // Get CICD providers for the tenant
    const { data, error } = await supabase
      .from('tenant_cicd_providers')
      .select('*')
      .eq('tenant_id', tenant.tenant_id);
    
    if (error) {
      console.error('Error fetching CICD providers:', error);
      return { success: false, error: error.message, data: [] };
    }
    
    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('Unexpected error fetching CICD providers:', error);
    return { success: false, error: error.message || 'An unexpected error occurred', data: [] };
  }
}

/**
 * Create a new CI/CD provider
 */
export async function createCICDProviderAction(providerData: CICDProviderPayload): Promise<CICDProviderActionResult> {
  try {
    const supabase = createClient();
    
    // Get the current tenant from the authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }
    
    const { data: tenant } = await supabase
      .from('user_tenants')
      .select('tenant_id')
      .eq('user_id', user.id)
      .single();
    
    if (!tenant) {
      return { success: false, error: 'No tenant found for user' };
    }
    
    // Prepare provider data with proper structure
    const { auth_type, credentials, ...restData } = providerData;
    const providerRecord = {
      ...restData,
      tenant_id: tenant.tenant_id,
      config: {
        auth_type,
        credentials
      },
      created_by: user.id,
      updated_by: user.id
    };
    
    // Insert the new provider
    const { data, error } = await supabase
      .from('tenant_cicd_providers')
      .insert(providerRecord)
      .select()
      .single();
    
    if (error) {
      console.error('Error creating CICD provider:', error);
      return { success: false, error: error.message };
    }
    
    // Revalidate paths for UI updates
    revalidatePath('/deployment/cicd');
    
    return { success: true, data };
  } catch (error: any) {
    console.error('Unexpected error creating CICD provider:', error);
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
}

/**
 * Update an existing CI/CD provider
 */
export async function updateCICDProviderAction(providerData: CICDProviderPayload): Promise<CICDProviderActionResult> {
  try {
    const { id, auth_type, credentials, ...restData } = providerData;
    
    if (!id) {
      return { success: false, error: 'Provider ID is required' };
    }
    
    const supabase = createClient();
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }
    
    // Prepare update data
    const updateData = {
      ...restData,
      config: {
        auth_type,
        credentials
      },
      updated_by: user.id,
      updated_at: new Date().toISOString()
    };
    
    // Update the provider
    const { data, error } = await supabase
      .from('tenant_cicd_providers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating CICD provider:', error);
      return { success: false, error: error.message };
    }
    
    // Revalidate paths for UI updates
    revalidatePath('/deployment/cicd');
    
    return { success: true, data };
  } catch (error: any) {
    console.error('Unexpected error updating CICD provider:', error);
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
}

/**
 * Delete a CI/CD provider
 */
export async function deleteCICDProviderAction(providerId: string): Promise<ActionResult> {
  try {
    if (!providerId) {
      return { success: false, error: 'Provider ID is required' };
    }
    
    const supabase = createClient();
    
    // Get the current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Unauthorized' };
    }
    
    // Check if the provider is in use by any deployments
    const { data: deployments, error: deploymentError } = await supabase
      .from('deployments')
      .select('id')
      .eq('cicd_provider_id', providerId)
      .limit(1);
    
    if (deploymentError) {
      console.error('Error checking deployments:', deploymentError);
      return { success: false, error: deploymentError.message };
    }
    
    if (deployments && deployments.length > 0) {
      return { 
        success: false, 
        error: 'Cannot delete provider as it is currently in use by one or more deployments' 
      };
    }
    
    // Delete the provider
    const { error } = await supabase
      .from('tenant_cicd_providers')
      .delete()
      .eq('id', providerId);
    
    if (error) {
      console.error('Error deleting CICD provider:', error);
      return { success: false, error: error.message };
    }
    
    // Revalidate paths for UI updates
    revalidatePath('/deployment/cicd');
    
    return { success: true };
  } catch (error: any) {
    console.error('Unexpected error deleting CICD provider:', error);
    return { success: false, error: error.message || 'An unexpected error occurred' };
  }
}

/**
 * Test connection to a CI/CD provider
 */
export async function testCICDProviderAction(providerData: CICDProviderPayload): Promise<ActionResult> {
  try {
    // In a real implementation, this would connect to the CI/CD provider API
    // and verify the credentials and access
    
    // For now, simulate a successful connection
    // In the future, implement actual API calls to the provider
    
    // Example pattern for provider-specific tests:
    switch (providerData.type) {
      case 'jenkins':
        // Test Jenkins connection
        // e.g. Make a test request to Jenkins API
        return simulateJenkinsTest(providerData);
        
      case 'github':
        // Test GitHub API connection
        return simulateGitHubTest(providerData);
        
      case 'gitlab':
        // Test GitLab API connection
        return simulateGitLabTest(providerData);
        
      case 'azure_devops':
        // Test Azure DevOps API connection
        return simulateAzureDevOpsTest(providerData);
        
      default:
        return { 
          success: false, 
          error: `Unsupported provider type: ${providerData.type}` 
        };
    }
  } catch (error: any) {
    console.error('Error testing CICD provider:', error);
    return { success: false, error: error.message || 'An unexpected error occurred during testing' };
  }
}

// Simulated connection tests for different provider types
// These would be replaced with actual API calls in production

function simulateJenkinsTest(providerData: CICDProviderPayload): ActionResult {
  // Check for required fields
  if (!providerData.url) {
    return { success: false, error: 'Jenkins URL is required' };
  }
  
  if (providerData.auth_type === 'token' && !providerData.credentials.token) {
    return { success: false, error: 'API token is required for token authentication' };
  }
  
  if (providerData.auth_type === 'basic_auth' && 
      (!providerData.credentials.username || !providerData.credentials.password)) {
    return { success: false, error: 'Username and password are required for basic authentication' };
  }
  
  // Simulate a successful test
  return { success: true };
}

function simulateGitHubTest(providerData: CICDProviderPayload): ActionResult {
  // Check for required fields
  if (!providerData.url) {
    return { success: false, error: 'GitHub repository URL is required' };
  }
  
  if (providerData.auth_type === 'token' && !providerData.credentials.token) {
    return { success: false, error: 'GitHub token is required' };
  }
  
  // Simulate a successful test
  return { success: true };
}

function simulateGitLabTest(providerData: CICDProviderPayload): ActionResult {
  // Check for required fields
  if (!providerData.url) {
    return { success: false, error: 'GitLab URL is required' };
  }
  
  if (providerData.auth_type === 'token' && !providerData.credentials.token) {
    return { success: false, error: 'GitLab token is required' };
  }
  
  // Simulate a successful test
  return { success: true };
}

function simulateAzureDevOpsTest(providerData: CICDProviderPayload): ActionResult {
  // Check for required fields
  if (!providerData.url) {
    return { success: false, error: 'Azure DevOps URL is required' };
  }
  
  if (providerData.auth_type === 'token' && !providerData.credentials.token) {
    return { success: false, error: 'Azure DevOps token is required' };
  }
  
  // Simulate a successful test
  return { success: true };
} 