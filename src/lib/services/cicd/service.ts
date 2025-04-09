import { CICDJob, CreateCICDJobParams } from '@/types-new/cicd-job';
import {
  CICDProvider,
  CICDProviderConfig,
  CICDResponse,
  CICDJobConfig,
} from '@/types-new/cicd-provider';

import { CICDProviderFactory } from './factory';

/**
 * Main service for interacting with CICD providers
 */
export class CICDService {
  private provider: CICDProvider | null = null;

  /**
   * Initialize the service with a provider configuration
   */
  initialize(config: CICDProviderConfig): boolean {
    console.log(`[@service:cicd:service] Initializing CICD service with provider: ${config.type}`);

    try {
      this.provider = CICDProviderFactory.createProvider(config);
      return this.provider !== null;
    } catch (error: any) {
      console.error(`[@service:cicd:service] Error initializing service:`, error);
      return false;
    }
  }

  /**
   * Create a new CICD job
   */
  async createJob(params: CreateCICDJobParams): Promise<CICDResponse<CICDJob>> {
    if (!this.provider) {
      return {
        success: false,
        error: 'CICD provider not initialized',
      };
    }

    try {
      console.log(`[@service:cicd:service] Creating job: ${params.name}`);

      // Generate the Jenkins pipeline using the generator
      let pipelineScript = '';
      
      try {
        // Import and use the pipeline generator if this is a Jenkins provider
        if (this.provider instanceof (await import('./jenkinsProvider')).JenkinsProvider) {
          console.log(`[@service:cicd:service] Generating Jenkins pipeline for job: ${params.name}`);
          const { generateJenkinsPipeline } = await import('./jenkinsPipeline');
          const pipelineConfig = generateJenkinsPipeline(params);
          pipelineScript = pipelineConfig.pipeline;
          
          console.log(`[@service:cicd:service] Successfully generated pipeline script (${pipelineScript.length} chars)`);
        }
      } catch (pipelineError: any) {
        console.error(`[@service:cicd:service] Error generating pipeline script:`, pipelineError);
        // Continue with empty pipeline as fallback
      }

      // Map CreateCICDJobParams to CICDJobConfig
      const jobConfig: CICDJobConfig = {
        name: params.name,
        description: params.description,
        pipeline: pipelineScript, // Now contains the generated pipeline script
        parameters: [
          {
            name: 'REPOSITORY_URL',
            type: 'string',
            description: 'Repository URL',
            defaultValue: params.repository.url,
          },
          {
            name: 'BRANCH',
            type: 'string',
            description: 'Branch',
            defaultValue: params.repository.branch,
          },
        ],
      };

      // Pass additional options that may be needed by specific providers
      const options = {
        repository: params.repository,
        hosts: params.hosts,
        scripts: params.scripts,
      };

      return await this.provider.createJob(params.name, jobConfig, undefined, options);
    } catch (error: any) {
      console.error(`[@service:cicd:service] Error creating job:`, error);
      return {
        success: false,
        error: error.message || 'Failed to create job',
      };
    }
  }

  /**
   * Trigger an existing job
   */
  async triggerJob(
    jobId: string,
    parameters?: Record<string, any>,
  ): Promise<CICDResponse<CICDJob>> {
    if (!this.provider) {
      return {
        success: false,
        error: 'CICD provider not initialized',
      };
    }

    try {
      console.log(`[@service:cicd:service] Triggering job: ${jobId}`);
      return await this.provider.triggerJob(jobId, parameters);
    } catch (error: any) {
      console.error(`[@service:cicd:service] Error triggering job:`, error);
      return {
        success: false,
        error: error.message || 'Failed to trigger job',
      };
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<CICDResponse<CICDJob>> {
    if (!this.provider) {
      return {
        success: false,
        error: 'CICD provider not initialized',
      };
    }

    try {
      console.log(`[@service:cicd:service] Getting job status: ${jobId}`);
      return await this.provider.getJobStatus(jobId);
    } catch (error: any) {
      console.error(`[@service:cicd:service] Error getting job status:`, error);
      return {
        success: false,
        error: error.message || 'Failed to get job status',
      };
    }
  }
}
