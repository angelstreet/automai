// Export all CI/CD related types and services
export * from './interfaces';
export * from './factory';
export { JenkinsProvider } from './jenkins';
export { GitHubProvider } from './github';

// Export async function to get a provider instance
import { cicd } from '@/lib/supabase/db-deployment';

import { CICDProviderFactory } from './factory';
import { CICDProvider, CICDProviderConfig, CICDResponse } from './interfaces';

/**
 * Get a CI/CD provider instance by direct configuration
 */
export function getCICDProvider(config: CICDProviderConfig): CICDProvider;

/**
 * Get a CI/CD provider instance by ID from the database
 */
export async function getCICDProvider(
  providerId: string,
  tenantId: string,
): Promise<CICDResponse<CICDProvider>>;

/**
 * Implementation of the getCICDProvider function with overloads
 */
export function getCICDProvider(
  providerIdOrConfig: string | CICDProviderConfig,
  tenantId?: string,
): CICDProvider | Promise<CICDResponse<CICDProvider>> {
  // If first parameter is an object, it's direct configuration
  if (typeof providerIdOrConfig === 'object') {
    return CICDProviderFactory.createProvider(providerIdOrConfig);
  }

  // Otherwise, it's a provider ID and we need to fetch from the database
  return (async function (): Promise<CICDResponse<CICDProvider>> {
    try {
      // Get provider configuration from the database
      const providerId = providerIdOrConfig;

      if (!tenantId) {
        return {
          success: false,
          error: 'Tenant ID is required when fetching provider by ID',
        };
      }

      const providerResult = await cicd.getCICDProvider({
        where: { id: providerId, tenant_id: tenantId },
      });

      if (!providerResult.success || !providerResult.data) {
        return {
          success: false,
          error: providerResult.error || 'CI/CD provider not found',
        };
      }

      // Map database provider to configuration
      const providerData = providerResult.data;

      // Map from the database structure (with config object) to the service structure
      const providerConfig: CICDProviderConfig = {
        id: providerData.id,
        url: providerData.url,
        type: providerData.type,
        name: providerData.name,
        auth_type: providerData.config.auth_type,
        credentials: providerData.config.credentials,
      };

      // Create provider instance using factory
      const provider = CICDProviderFactory.createProvider(providerConfig);

      return {
        success: true,
        data: provider,
      };
    } catch (error: any) {
      console.error('Error getting CI/CD provider:', error);
      return {
        success: false,
        error: error.message || 'Failed to get CI/CD provider',
      };
    }
  })();
}
