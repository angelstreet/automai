// Export all CI/CD related types and services
export * from './interfaces';
export * from './factory';
export { JenkinsProvider } from './jenkins';

// Export async function to get a provider instance
import { cicd } from '@/lib/supabase/db-deployment';
import { CICDProvider, CICDProviderConfig, CICDResponse } from './interfaces';
import { CICDProviderFactory } from './factory';

/**
 * Get a CI/CD provider instance by ID from the database
 */
export async function getCICDProvider(providerId: string, tenantId: string): Promise<CICDResponse<CICDProvider>> {
  try {
    // Get provider configuration from the database
    const providerResult = await cicd.getCICDProvider({ id: providerId, tenant_id: tenantId });
    
    if (!providerResult.success || !providerResult.data) {
      return {
        success: false,
        error: providerResult.error || 'CI/CD provider not found'
      };
    }
    
    // Map database provider to configuration
    const providerConfig: CICDProviderConfig = {
      id: providerResult.data.id,
      url: providerResult.data.url,
      auth_type: providerResult.data.auth_type,
      credentials: providerResult.data.credentials,
      type: providerResult.data.type,
      name: providerResult.data.name
    };
    
    // Create provider instance using factory
    const provider = CICDProviderFactory.createProvider(providerConfig);
    
    return {
      success: true,
      data: provider
    };
  } catch (error: any) {
    console.error('Error getting CI/CD provider:', error);
    return {
      success: false,
      error: error.message || 'Failed to get CI/CD provider'
    };
  }
}