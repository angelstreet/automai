import cicdDb from '../db/cicdDb';

import {
  CICDProviderFactory,
  PipelineGenerator,
  ServiceResponse,
  PipelineGeneratorOptions,
} from './cicd';
import type { CICDProvider, CICDProviderConfig, CICDJob, CICDBuild } from './cicd';

// Re-export the types and classes that are needed elsewhere
export { PipelineGenerator };
export type { PipelineGeneratorOptions };
export type { CICDBuild, CICDJob, CICDProvider, CICDProviderConfig };

/**
 * CICD Service
 */
const cicdService = {
  /**
   * Get all CICD providers
   */
  async getAllProviders(tenantId: string, cookieStore?: any): Promise<ServiceResponse<any[]>> {
    try {
      // Assuming cicdDb.getCICDProviders accepts tenantId directly in the new implementation
      const result = await cicdDb.getCICDProviders(tenantId, cookieStore);

      return {
        success: result.success,
        data: result.data || [],
        error: result.error,
      };
    } catch (error: any) {
      console.error('[@service:cicdService:getAllProviders] Error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error fetching CICD providers',
      };
    }
  },

  /**
   * Get CICD provider by ID
   */
  async getProviderById(id: string, cookieStore?: any): Promise<ServiceResponse<any>> {
    try {
      // Assuming cicdDb.getCICDProvider accepts id directly in the new implementation
      const result = await cicdDb.getCICDProvider({ where: { id } }, cookieStore);

      return {
        success: result.success,
        data: result.data,
        error: result.error,
      };
    } catch (error: any) {
      console.error('[@service:cicdService:getProviderById] Error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error fetching CICD provider',
      };
    }
  },

  /**
   * Create a new CICD provider
   */
  async createProvider(
    providerData: any,
    userId: string,
    tenantId: string,
    teamId: string,
    cookieStore?: any,
  ): Promise<ServiceResponse<any>> {
    try {
      const result = await cicdDb.createCICDProvider(
        providerData,
        userId,
        tenantId,
        teamId,
        cookieStore,
      );
      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to create provider',
      };
    }
  },

  /**
   * Update a CICD provider
   */
  async updateProvider(id: string, updates: any, cookieStore?: any): Promise<ServiceResponse<any>> {
    try {
      // Assuming cicdDb.updateCICDProvider accepts id and updates directly
      const result = await cicdDb.updateCICDProvider(id, updates, cookieStore);

      return {
        success: result.success,
        data: result.data,
        error: result.error,
      };
    } catch (error: any) {
      console.error('[@service:cicdService:updateProvider] Error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error updating CICD provider',
      };
    }
  },

  /**
   * Delete a CICD provider
   */
  async deleteProvider(id: string, cookieStore?: any): Promise<ServiceResponse<null>> {
    try {
      // Assuming cicdDb.deleteCICDProvider accepts id directly
      const result = await cicdDb.deleteCICDProvider(id, cookieStore);

      return {
        success: result.success,
        data: null,
        error: result.error,
      };
    } catch (error: any) {
      console.error('[@service:cicdService:deleteProvider] Error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error deleting CICD provider',
      };
    }
  },

  /**
   * Test connection to a provider
   */
  async testConnection(config: CICDProviderConfig): Promise<ServiceResponse<boolean>> {
    try {
      const provider = CICDProviderFactory.createProvider(config);
      const result = await provider.testConnection();
      return {
        success: result.success,
        data: result.data,
        error: result.error,
      };
    } catch (error: any) {
      console.error('[@service:cicdService:testConnection] Error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error testing connection',
      };
    }
  },

  /**
   * Get available jobs for a provider
   */
  async getAvailableJobs(
    providerId: string,
    cookieStore?: any,
  ): Promise<ServiceResponse<CICDJob[]>> {
    try {
      // Update to use the proper interface
      const providerResult = await cicdDb.getCICDProvider(
        { where: { id: providerId } },
        cookieStore,
      );

      if (!providerResult.success || !providerResult.data) {
        return {
          success: false,
          error: providerResult.error || 'Provider not found',
        };
      }

      // Create a provider instance from the config
      try {
        // Cast to unknown first then to CICDProviderConfig to avoid type errors
        const providerConfig = providerResult.data as unknown as CICDProviderConfig;
        const provider = CICDProviderFactory.createProvider(providerConfig);

        // Get available jobs
        const jobsResult = await provider.getAvailableJobs();
        return {
          success: jobsResult.success,
          data: jobsResult.data,
          error: jobsResult.error,
        };
      } catch (error: any) {
        console.error('[@service:cicdService:getAvailableJobs] Error:', error);
        return {
          success: false,
          error: error.message || 'Unknown error getting available jobs',
        };
      }
    } catch (error: any) {
      console.error('[@service:cicdService:getAvailableJobs] Error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error getting available jobs',
      };
    }
  },

  /**
   * Get job details
   */
  async getJobDetails(
    providerId: string,
    jobId: string,
    cookieStore?: any,
  ): Promise<ServiceResponse<CICDJob>> {
    try {
      // Update to use the proper interface
      const providerResult = await cicdDb.getCICDProvider(
        { where: { id: providerId } },
        cookieStore,
      );

      if (!providerResult.success || !providerResult.data) {
        return {
          success: false,
          error: providerResult.error || 'Provider not found',
        };
      }

      // Create a provider instance
      try {
        // Cast to unknown first then to CICDProviderConfig to avoid type errors
        const providerConfig = providerResult.data as unknown as CICDProviderConfig;
        const provider = CICDProviderFactory.createProvider(providerConfig);

        // Get job details
        const jobResult = await provider.getJobDetails(jobId);
        return {
          success: jobResult.success,
          data: jobResult.data,
          error: jobResult.error,
        };
      } catch (error: any) {
        console.error('[@service:cicdService:getJobDetails] Error:', error);
        return {
          success: false,
          error: error.message || 'Unknown error getting job details',
        };
      }
    } catch (error: any) {
      console.error('[@service:cicdService:getJobDetails] Error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error getting job details',
      };
    }
  },

  /**
   * Trigger a job
   */
  async triggerJob(
    providerId: string,
    jobId: string,
    parameters?: Record<string, any>,
    cookieStore?: any,
  ): Promise<ServiceResponse<CICDBuild>> {
    try {
      // Update to use the proper interface
      const providerResult = await cicdDb.getCICDProvider(
        { where: { id: providerId } },
        cookieStore,
      );

      if (!providerResult.success || !providerResult.data) {
        return {
          success: false,
          error: providerResult.error || 'Provider not found',
        };
      }

      // Create a provider instance
      try {
        // Cast to unknown first then to CICDProviderConfig to avoid type errors
        const providerConfig = providerResult.data as unknown as CICDProviderConfig;
        const provider = CICDProviderFactory.createProvider(providerConfig);

        // Trigger the job
        const buildResult = await provider.triggerJob(jobId, parameters);
        return {
          success: buildResult.success,
          data: buildResult.data,
          error: buildResult.error,
        };
      } catch (error: any) {
        console.error('[@service:cicdService:triggerJob] Error:', error);
        return {
          success: false,
          error: error.message || 'Unknown error triggering job',
        };
      }
    } catch (error: any) {
      console.error('[@service:cicdService:triggerJob] Error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error triggering job',
      };
    }
  },

  /**
   * Generate a pipeline for a specific CI/CD provider
   */
  generatePipeline(
    provider: 'jenkins' | 'github' | 'gitlab' | 'circleci',
    options: PipelineGeneratorOptions,
  ): string {
    return PipelineGenerator.generate(provider, options);
  },

  /**
   * Delete a CICD job from provider
   */
  async deleteProviderJob(
    providerId: string,
    jobId: string,
    cookieStore?: any,
  ): Promise<ServiceResponse<boolean>> {
    try {
      // Get provider configuration
      const providerResult = await cicdDb.getCICDProvider(
        { where: { id: providerId } },
        cookieStore,
      );

      if (!providerResult.success || !providerResult.data) {
        return {
          success: false,
          error: providerResult.error || 'Provider not found',
        };
      }

      // Create provider instance and delete job
      const provider = CICDProviderFactory.createProvider(
        providerResult.data as unknown as CICDProviderConfig,
      );
      const result = await provider.deleteJob(jobId);

      return result;
    } catch (error: any) {
      console.error('[@service:cicdService:deleteProviderJob] Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete provider job',
      };
    }
  },
};

/**
 * Get a CICD provider by ID
 * @param providerId Provider ID
 * @param tenantId Tenant ID (for security)
 * @returns Service response with provider instance
 */
export async function getCICDProvider(
  providerId: string,
  _tenantId: string,
  cookieStore?: any,
): Promise<ServiceResponse<CICDProvider>> {
  try {
    // Update to use the proper interface
    const providerResult = await cicdDb.getCICDProvider({ where: { id: providerId } }, cookieStore);

    if (!providerResult.success || !providerResult.data) {
      console.error('[@service:getCICDProvider] Failed to get provider:', providerResult.error);
      return {
        success: false,
        error: providerResult.error || 'Provider not found',
      };
    }

    // Create a provider instance
    try {
      // Cast to unknown first then to CICDProviderConfig to avoid type errors
      const providerConfig = providerResult.data as unknown as CICDProviderConfig;
      const provider = CICDProviderFactory.createProvider(providerConfig);
      return {
        success: true,
        data: provider,
      };
    } catch (error: any) {
      console.error('[@service:getCICDProvider] Error creating provider instance:', error);
      return {
        success: false,
        error: error.message || 'Failed to initialize provider',
      };
    }
  } catch (error: any) {
    console.error('[@service:getCICDProvider] Error:', error);
    return {
      success: false,
      error: error.message || 'Unknown error getting CICD provider',
    };
  }
}

export default cicdService;
