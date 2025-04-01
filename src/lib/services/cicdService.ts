import {
  CICDBuild,
  CICDJob,
  CICDJobParameter,
  CICDProvider,
  CICDProviderConfig,
  CICDPipelineConfig,
  CICDResponse
} from '@/types/service/cicdServiceTypes';
import { ServiceResponse } from './teamService';
import { DbResponse } from '../utils/dbUtils';
import { getCICDProviders, getCICDProviderById, createCICDProvider, updateCICDProvider, deleteCICDProvider } from '../supabase/db-cicd';

/**
 * GitHub Actions CI/CD Provider Implementation
 */
export class GitHubProvider implements CICDProvider {
  private config: CICDProviderConfig | null = null;
  private authHeader: string = '';
  private owner: string = '';
  private repo: string = '';
  private baseUrl: string = 'https://api.github.com';

  /**
   * Initialize the GitHub provider with configuration
   */
  initialize(config: CICDProviderConfig): void {
    this.config = config;

    // Parse owner and repo from the URL
    // Expected format: https://github.com/{owner}/{repo}
    try {
      const url = new URL(config.url);
      const pathParts = url.pathname.split('/').filter((part) => part);

      if (pathParts.length >= 2) {
        this.owner = pathParts[0];
        this.repo = pathParts[1];
      } else {
        throw new Error(
          'Invalid GitHub repository URL format. Expected: https://github.com/{owner}/{repo}',
        );
      }
    } catch (error: any) {
      console.error('[@service:github:initialize] Error parsing GitHub URL:', error);
      throw new Error(`Invalid GitHub URL: ${error.message}`);
    }

    // Set up authentication
    if (config.auth_type === 'token') {
      const token = config.credentials.token;
      this.authHeader = `Bearer ${token}`;
    } else if (config.auth_type === 'basic_auth') {
      const { username, password } = config.credentials;
      this.authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    } else {
      throw new Error(`Unsupported authentication type: ${config.auth_type}`);
    }
  }

  /**
   * Helper method to make authenticated requests to GitHub API
   */
  private async githubRequest<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<CICDResponse<T>> {
    try {
      if (!this.config) {
        return {
          success: false,
          error: 'GitHub provider not initialized',
        };
      }

      const url = `${this.baseUrl}${path}`;

      // Add authentication headers
      const headers = {
        ...options.headers,
        Authorization: this.authHeader,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      };

      const response = await fetch(url, {
        ...options,
        headers,
        cache: 'no-store',
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `GitHub API error: ${response.status} - ${errorText}`,
        };
      }

      // Handle response
      const contentType = response.headers.get('content-type');
      let data: any;

      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      return {
        success: true,
        data: data as T,
      };
    } catch (error: any) {
      console.error('[@service:github:githubRequest] Error in API request:', error);
      return {
        success: false,
        error: error.message || 'Failed to make GitHub API request',
      };
    }
  }

  /**
   * Test connection to GitHub
   */
  async testConnection(): Promise<CICDResponse<boolean>> {
    try {
      console.log('[@service:github:testConnection] Testing connection to GitHub server');

      if (!this.owner || !this.repo) {
        console.error('[@service:github:testConnection] Missing repository owner or name');
        return {
          success: false,
          error: 'Repository owner or name is missing',
        };
      }

      // Test by getting repo information
      const response = await this.githubRequest<any>(`/repos/${this.owner}/${this.repo}`);

      if (response.success) {
        console.log('[@service:github:testConnection] Connection test successful');
        return {
          success: true,
          data: true,
        };
      } else {
        console.error('[@service:github:testConnection] Connection test failed:', response.error);
        return {
          success: false,
          error: response.error || 'Failed to connect to GitHub repository',
        };
      }
    } catch (error: any) {
      console.error(
        '[@service:github:testConnection] Connection test failed with exception:',
        error,
      );
      return {
        success: false,
        error: error.message || 'Failed to connect to GitHub repository',
      };
    }
  }

  /**
   * Get available GitHub Actions workflows as jobs
   */
  async getAvailableJobs(): Promise<CICDResponse<CICDJob[]>> {
    try {
      // Get the list of workflows from GitHub API
      const result = await this.githubRequest<any>(
        `/repos/${this.owner}/${this.repo}/actions/workflows`,
      );

      if (!result.success) {
        return result;
      }

      // Map GitHub workflows to our CICDJob interface
      const jobs: CICDJob[] = result.data.workflows
        .filter((workflow: any) => workflow.state === 'active')
        .map((workflow: any) => ({
          id: workflow.id.toString(),
          name: workflow.name,
          url: workflow.html_url,
          description: `Path: ${workflow.path}`,
        }));

      return {
        success: true,
        data: jobs,
      };
    } catch (error: any) {
      console.error('[@service:github:getAvailableJobs] Error getting workflows:', error);
      return {
        success: false,
        error: error.message || 'Failed to get GitHub workflows',
      };
    }
  }

  /**
   * Get workflow details
   */
  async getJobDetails(jobId: string): Promise<CICDResponse<CICDJob>> {
    try {
      // Get detailed workflow info from GitHub API
      const result = await this.githubRequest<any>(
        `/repos/${this.owner}/${this.repo}/actions/workflows/${jobId}`,
      );

      if (!result.success) {
        return result;
      }

      // Get the workflow file content to extract input parameters
      const contentResult = await this.githubRequest<any>(
        `/repos/${this.owner}/${this.repo}/contents/${result.data.path}`,
      );

      if (!contentResult.success) {
        // Return the basic job info without parameters
        return {
          success: true,
          data: {
            id: jobId,
            name: result.data.name,
            url: result.data.html_url,
            description: `Path: ${result.data.path}`,
            parameters: [],
          },
        };
      }

      // Decode workflow file content
      let content = '';
      if (contentResult.data.content) {
        content = Buffer.from(contentResult.data.content, 'base64').toString('utf-8');
      }

      // Extract input parameters from workflow file YAML
      // This is a simplistic approach; a proper YAML parser should be used in production
      const parameters: CICDJobParameter[] = [];
      const inputMatches = [
        ...content.matchAll(/on:\s*workflow_dispatch:\s*inputs:([\s\S]*?)(?=\n\w|$)/g),
      ];

      if (inputMatches.length > 0 && inputMatches[0][1]) {
        const inputsSection = inputMatches[0][1];
        const paramMatches = [
          ...inputsSection.matchAll(
            /(\w+):\s*(?:type:\s*(\w+))?(?:[\s\S]*?required:\s*(true|false))?(?:[\s\S]*?default:\s*(.+?))?(?:[\s\S]*?description:\s*(.+?))?(?=\n\s+\w+:|$)/g,
          ),
        ];

        for (const match of paramMatches) {
          const [_, name, type, required, defaultValue, description] = match;

          const parameter: CICDJobParameter = {
            name: name.trim(),
            type: this.mapGitHubParamType(type?.trim() || 'string'),
            description: description?.trim() || '',
            default: defaultValue?.trim() || undefined,
            required: required?.trim() === 'true',
          };

          // Check for choices in the input
          const choicesMatch = inputsSection.match(
            new RegExp(`${name}:[\\s\\S]*?options:\\s*\\[(.+?)\\]`, 'i'),
          );
          if (choicesMatch && choicesMatch[1]) {
            parameter.choices = choicesMatch[1]
              .split(',')
              .map((choice) => choice.trim().replace(/^['"]|['"]$/g, ''));
            parameter.type = 'choice';
          }

          parameters.push(parameter);
        }
      }

      // Construct the job object
      const job: CICDJob = {
        id: jobId,
        name: result.data.name,
        url: result.data.html_url,
        description: `Path: ${result.data.path}`,
        parameters: parameters,
      };

      return {
        success: true,
        data: job,
      };
    } catch (error: any) {
      console.error(
        `[@service:github:getJobDetails] Error getting workflow details for ${jobId}:`,
        error,
      );
      return {
        success: false,
        error: error.message || `Failed to get GitHub workflow details for ${jobId}`,
      };
    }
  }

  /**
   * Helper method to map GitHub parameter types to our types
   */
  private mapGitHubParamType(githubType: string): 'string' | 'boolean' | 'number' | 'choice' {
    const typeMap: Record<string, 'string' | 'boolean' | 'number' | 'choice'> = {
      string: 'string',
      boolean: 'boolean',
      number: 'number',
      choice: 'choice',
    };

    return typeMap[githubType.toLowerCase()] || 'string';
  }

  /**
   * Trigger a GitHub workflow
   */
  async triggerJob(
    jobId: string,
    parameters?: Record<string, any>,
  ): Promise<CICDResponse<CICDBuild>> {
    try {
      const requestBody = {
        ref: 'main', // Default to main branch, but could be configurable
        inputs: parameters || {},
      };

      // Trigger workflow
      const result = await this.githubRequest<any>(
        `/repos/${this.owner}/${this.repo}/actions/workflows/${jobId}/dispatches`,
        {
          method: 'POST',
          body: JSON.stringify(requestBody),
        },
      );

      if (!result.success) {
        return result;
      }

      // GitHub doesn't return build ID directly when triggering a workflow
      // We need to get the most recent run for this workflow
      const runsResult = await this.githubRequest<any>(
        `/repos/${this.owner}/${this.repo}/actions/workflows/${jobId}/runs?per_page=1`,
      );

      if (!runsResult.success) {
        return {
          success: true,
          data: {
            id: 'pending',
            job_id: jobId,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        };
      }

      // Get the most recent run
      const run = runsResult.data.workflow_runs[0];

      return {
        success: true,
        data: {
          id: run.id.toString(),
          job_id: jobId,
          url: run.html_url,
          status: this.mapGitHubRunStatus(run.status),
          created_at: run.created_at,
          updated_at: run.updated_at,
        },
      };
    } catch (error: any) {
      console.error(`[@service:github:triggerJob] Error triggering workflow ${jobId}:`, error);
      return {
        success: false,
        error: error.message || `Failed to trigger GitHub workflow ${jobId}`,
      };
    }
  }

  /**
   * Get build status
   */
  async getBuildStatus(jobId: string, buildId: string): Promise<CICDResponse<CICDBuild>> {
    try {
      // Get run info
      const result = await this.githubRequest<any>(
        `/repos/${this.owner}/${this.repo}/actions/runs/${buildId}`,
      );

      if (!result.success) {
        return result;
      }

      return {
        success: true,
        data: {
          id: buildId,
          job_id: jobId,
          url: result.data.html_url,
          status: this.mapGitHubRunStatus(result.data.status, result.data.conclusion),
          created_at: result.data.created_at,
          updated_at: result.data.updated_at,
        },
      };
    } catch (error: any) {
      console.error(
        `[@service:github:getBuildStatus] Error getting workflow run status for ${buildId}:`,
        error,
      );
      return {
        success: false,
        error: error.message || `Failed to get GitHub workflow run status for ${buildId}`,
      };
    }
  }

  /**
   * Helper method to map GitHub run status to our status type
   */
  private mapGitHubRunStatus(
    status?: string,
    conclusion?: string,
  ): 'pending' | 'running' | 'success' | 'failure' | 'unknown' {
    if (status === 'completed') {
      if (conclusion === 'success') {
        return 'success';
      } else if (
        conclusion === 'failure' ||
        conclusion === 'cancelled' ||
        conclusion === 'timed_out'
      ) {
        return 'failure';
      }
    } else if (status === 'in_progress' || status === 'queued') {
      return 'running';
    } else if (status === 'requested' || status === 'waiting') {
      return 'pending';
    }

    return 'unknown';
  }

  /**
   * Get build logs
   */
  async getBuildLogs(jobId: string, buildId: string): Promise<CICDResponse<string>> {
    try {
      // Get logs URL
      const result = await this.githubRequest<any>(
        `/repos/${this.owner}/${this.repo}/actions/runs/${buildId}/logs`,
      );

      if (!result.success) {
        return result;
      }

      // GitHub returns a download URL for logs
      const logsUrl = result.data.logs_url;

      // Download the logs
      const logsResponse = await fetch(logsUrl, {
        headers: {
          Authorization: this.authHeader,
        },
      });

      if (!logsResponse.ok) {
        return {
          success: false,
          error: `Failed to download logs: ${logsResponse.status} ${logsResponse.statusText}`,
        };
      }

      const logs = await logsResponse.text();

      return {
        success: true,
        data: logs,
      };
    } catch (error: any) {
      console.error(
        `[@service:github:getBuildLogs] Error getting workflow run logs for ${buildId}:`,
        error,
      );
      return {
        success: false,
        error: error.message || `Failed to get GitHub workflow run logs for ${buildId}`,
      };
    }
  }

  /**
   * Create a new job
   */
  async createJob(
    jobName: string,
    pipelineConfig: CICDPipelineConfig,
    folderPath?: string
  ): Promise<CICDResponse<string>> {
    // Implementation would depend on GitHub's API for creating workflow files
    return {
      success: false,
      error: 'Creating GitHub workflows is not currently supported through the API'
    };
  }

  /**
   * Delete a job
   */
  async deleteJob(jobId: string, folderPath?: string): Promise<CICDResponse<boolean>> {
    // Implementation would depend on GitHub's API for deleting workflow files
    return {
      success: false,
      error: 'Deleting GitHub workflows is not currently supported through the API'
    };
  }
}

/**
 * Jenkins CI/CD Provider Implementation
 */
export class JenkinsProvider implements CICDProvider {
  private config: CICDProviderConfig | null = null;
  private baseUrl: string = '';
  private authHeader: string = '';

  /**
   * Initialize the Jenkins provider with configuration
   */
  initialize(config: CICDProviderConfig): void {
    this.config = config;
    this.baseUrl = config.url.endsWith('/') ? config.url : `${config.url}/`;

    // Set up authentication
    if (config.auth_type === 'token') {
      const token = config.credentials.token;
      this.authHeader = `Bearer ${token}`;
    } else if (config.auth_type === 'basic_auth') {
      const { username, password } = config.credentials;
      this.authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    } else {
      throw new Error(`Unsupported authentication type: ${config.auth_type}`);
    }
  }

  /**
   * Test connection to Jenkins
   */
  async testConnection(): Promise<CICDResponse<boolean>> {
    try {
      // Basic implementation - just try to get the Jenkins API info
      const url = `${this.baseUrl}api/json`;
      const response = await fetch(url, {
        headers: {
          Authorization: this.authHeader,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to connect to Jenkins: ${response.status} ${response.statusText}`,
        };
      }

      return {
        success: true,
        data: true,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to connect to Jenkins',
      };
    }
  }

  // Add other required method implementations for Jenkins

  async getAvailableJobs(): Promise<CICDResponse<CICDJob[]>> {
    // Basic implementation placeholder
    return {
      success: false,
      error: 'Jenkins integration not fully implemented'
    };
  }

  async getJobDetails(jobId: string): Promise<CICDResponse<CICDJob>> {
    // Basic implementation placeholder
    return {
      success: false,
      error: 'Jenkins integration not fully implemented'
    };
  }

  async triggerJob(jobId: string, parameters?: Record<string, any>): Promise<CICDResponse<CICDBuild>> {
    // Basic implementation placeholder
    return {
      success: false,
      error: 'Jenkins integration not fully implemented'
    };
  }

  async getBuildStatus(jobId: string, buildId: string): Promise<CICDResponse<CICDBuild>> {
    // Basic implementation placeholder
    return {
      success: false,
      error: 'Jenkins integration not fully implemented'
    };
  }

  async getBuildLogs(jobId: string, buildId: string): Promise<CICDResponse<string>> {
    // Basic implementation placeholder
    return {
      success: false,
      error: 'Jenkins integration not fully implemented'
    };
  }

  async createJob(
    jobName: string,
    pipelineConfig: CICDPipelineConfig,
    folderPath?: string
  ): Promise<CICDResponse<string>> {
    // Basic implementation placeholder
    return {
      success: false,
      error: 'Jenkins integration not fully implemented'
    };
  }

  async deleteJob(jobId: string, folderPath?: string): Promise<CICDResponse<boolean>> {
    // Basic implementation placeholder
    return {
      success: false,
      error: 'Jenkins integration not fully implemented'
    };
  }
}

/**
 * Factory for creating CI/CD provider instances
 */
export class CICDProviderFactory {
  /**
   * Create a CI/CD provider instance based on the provider type
   */
  static createProvider(config: CICDProviderConfig): CICDProvider {
    let provider: CICDProvider;

    switch (config.type.toLowerCase()) {
      case 'jenkins':
        provider = new JenkinsProvider();
        break;
      case 'github':
        provider = new GitHubProvider();
        break;
      default:
        throw new Error(`Unsupported CI/CD provider type: ${config.type}`);
    }

    // Initialize the provider with config
    provider.initialize(config);

    return provider;
  }

  /**
   * Get a provider instance based on provider config
   */
  static async getProvider(config: CICDProviderConfig): Promise<CICDProvider> {
    return this.createProvider(config);
  }
}

/**
 * CICD Service
 */
export const cicdService = {
  /**
   * Get all CICD providers
   */
  async getAllProviders(tenantId: string, cookieStore?: any): Promise<ServiceResponse<any[]>> {
    try {
      const result = await getCICDProviders(tenantId);
      return {
        success: result.success,
        data: result.data,
        error: result.error
      };
    } catch (error) {
      console.error('[@service:cicdService:getAllProviders] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error fetching CICD providers'
      };
    }
  },

  /**
   * Get CICD provider by ID
   */
  async getProviderById(id: string, cookieStore?: any): Promise<ServiceResponse<any>> {
    try {
      const result = await getCicdProviderById(id, cookieStore);
      return {
        success: result.success,
        data: result.data,
        error: result.error
      };
    } catch (error) {
      console.error('[@service:cicdService:getProviderById] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error fetching CICD provider'
      };
    }
  },

  /**
   * Create a new CICD provider
   */
  async createProvider(providerData: any, userId: string, cookieStore?: any): Promise<ServiceResponse<any>> {
    try {
      const result = await createCicdProvider(providerData, userId, cookieStore);
      return {
        success: result.success,
        data: result.data,
        error: result.error
      };
    } catch (error) {
      console.error('[@service:cicdService:createProvider] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error creating CICD provider'
      };
    }
  },

  /**
   * Update a CICD provider
   */
  async updateProvider(id: string, updates: any, userId: string, cookieStore?: any): Promise<ServiceResponse<any>> {
    try {
      const result = await updateCicdProvider(id, updates, userId, cookieStore);
      return {
        success: result.success,
        data: result.data,
        error: result.error
      };
    } catch (error) {
      console.error('[@service:cicdService:updateProvider] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error updating CICD provider'
      };
    }
  },

  /**
   * Delete a CICD provider
   */
  async deleteProvider(id: string, userId: string, cookieStore?: any): Promise<ServiceResponse<null>> {
    try {
      const result = await deleteCicdProvider(id, userId, cookieStore);
      return {
        success: result.success,
        data: null,
        error: result.error
      };
    } catch (error) {
      console.error('[@service:cicdService:deleteProvider] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error deleting CICD provider'
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
        error: result.error
      };
    } catch (error) {
      console.error('[@service:cicdService:testConnection] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error testing connection'
      };
    }
  },

  /**
   * Get available jobs from a provider
   */
  async getAvailableJobs(providerId: string, cookieStore?: any): Promise<ServiceResponse<CICDJob[]>> {
    try {
      // First get the provider data from the database
      const providerResult = await getCicdProviderById(providerId, cookieStore);
      if (!providerResult.success || !providerResult.data) {
        return {
          success: false,
          error: providerResult.error || 'Failed to get CICD provider'
        };
      }

      // Create a provider instance
      const provider = CICDProviderFactory.createProvider(providerResult.data);
      
      // Get available jobs
      const jobsResult = await provider.getAvailableJobs();
      return {
        success: jobsResult.success,
        data: jobsResult.data,
        error: jobsResult.error
      };
    } catch (error) {
      console.error('[@service:cicdService:getAvailableJobs] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error getting available jobs'
      };
    }
  },

  /**
   * Get job details
   */
  async getJobDetails(providerId: string, jobId: string, cookieStore?: any): Promise<ServiceResponse<CICDJob>> {
    try {
      // First get the provider data from the database
      const providerResult = await getCicdProviderById(providerId, cookieStore);
      if (!providerResult.success || !providerResult.data) {
        return {
          success: false,
          error: providerResult.error || 'Failed to get CICD provider'
        };
      }

      // Create a provider instance
      const provider = CICDProviderFactory.createProvider(providerResult.data);
      
      // Get job details
      const jobResult = await provider.getJobDetails(jobId);
      return {
        success: jobResult.success,
        data: jobResult.data,
        error: jobResult.error
      };
    } catch (error) {
      console.error('[@service:cicdService:getJobDetails] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error getting job details'
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
    cookieStore?: any
  ): Promise<ServiceResponse<CICDBuild>> {
    try {
      // First get the provider data from the database
      const providerResult = await getCicdProviderById(providerId, cookieStore);
      if (!providerResult.success || !providerResult.data) {
        return {
          success: false,
          error: providerResult.error || 'Failed to get CICD provider'
        };
      }

      // Create a provider instance
      const provider = CICDProviderFactory.createProvider(providerResult.data);
      
      // Trigger the job
      const buildResult = await provider.triggerJob(jobId, parameters);
      return {
        success: buildResult.success,
        data: buildResult.data,
        error: buildResult.error
      };
    } catch (error) {
      console.error('[@service:cicdService:triggerJob] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error triggering job'
      };
    }
  }
};

export default cicdService;

// Export types
export type {
  CICDBuild,
  CICDJob,
  CICDJobParameter,
  CICDProvider,
  CICDProviderConfig,
  CICDPipelineConfig,
  CICDResponse
};