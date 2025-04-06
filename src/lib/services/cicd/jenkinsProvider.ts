import {
  CICDResponse,
  CICDBuild,
  CICDJob,
  CICDProvider,
  CICDProviderConfig,
  CICDPipelineConfig,
} from './types';

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

  /**
   * Get available Jenkins jobs
   */
  async getAvailableJobs(): Promise<CICDResponse<CICDJob[]>> {
    try {
      // Make request to Jenkins API to get jobs
      const url = `${this.baseUrl}api/json?tree=jobs[name,url,description]`;
      const response = await fetch(url, {
        headers: {
          Authorization: this.authHeader,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to get Jenkins jobs: ${response.status} ${response.statusText}`,
        };
      }

      const data = await response.json();
      const jobs: CICDJob[] = data.jobs.map((job: any) => ({
        id: job.name,
        name: job.name,
        url: job.url,
        description: job.description || '',
      }));

      return {
        success: true,
        data: jobs,
      };
    } catch (error: any) {
      console.error('[@service:jenkins:getAvailableJobs] Error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get Jenkins jobs',
      };
    }
  }

  /**
   * Get job details including parameters
   */
  async getJobDetails(jobId: string): Promise<CICDResponse<CICDJob>> {
    try {
      // Get job config from Jenkins API
      const url = `${this.baseUrl}job/${encodeURIComponent(jobId)}/api/json?tree=name,url,description,property[parameterDefinitions[name,type,defaultParameterValue,description]]`;
      const response = await fetch(url, {
        headers: {
          Authorization: this.authHeader,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to get Jenkins job details: ${response.status} ${response.statusText}`,
        };
      }

      const data = await response.json();

      // Extract parameter definitions if available
      const parameters = [];
      const paramProps = data.property?.find((p: any) => p.parameterDefinitions);

      if (paramProps && paramProps.parameterDefinitions) {
        for (const param of paramProps.parameterDefinitions) {
          parameters.push({
            name: param.name,
            type: this.mapJenkinsParamType(param.type),
            description: param.description || '',
            default: param.defaultParameterValue?.value,
            required: false, // Jenkins doesn't explicitly define required parameters
          });
        }
      }

      return {
        success: true,
        data: {
          id: jobId,
          name: data.name,
          url: data.url,
          description: data.description || '',
          parameters: parameters,
        },
      };
    } catch (error: any) {
      console.error(
        `[@service:jenkins:getJobDetails] Error getting job details for ${jobId}:`,
        error,
      );
      return {
        success: false,
        error: error.message || `Failed to get Jenkins job details for ${jobId}`,
      };
    }
  }

  /**
   * Helper method to map Jenkins parameter types to our types
   */
  private mapJenkinsParamType(jenkinsType: string): 'string' | 'boolean' | 'number' | 'choice' {
    if (jenkinsType.includes('StringParameter')) {
      return 'string';
    } else if (jenkinsType.includes('BooleanParameter')) {
      return 'boolean';
    } else if (jenkinsType.includes('ChoiceParameter')) {
      return 'choice';
    } else {
      return 'string'; // Default
    }
  }

  /**
   * Trigger a Jenkins job
   */
  async triggerJob(
    jobId: string,
    parameters?: Record<string, any>,
  ): Promise<CICDResponse<CICDBuild>> {
    try {
      // Prepare URL based on whether we have parameters
      let url = `${this.baseUrl}job/${encodeURIComponent(jobId)}/`;

      if (parameters && Object.keys(parameters).length > 0) {
        // Add parameters to URL for parameterized builds
        url += 'buildWithParameters?';
        const params = new URLSearchParams();

        for (const [key, value] of Object.entries(parameters)) {
          params.append(key, value ? value.toString() : '');
        }

        url += params.toString();
      } else {
        // Trigger a simple build
        url += 'build';
      }

      // Jenkins requires a POST request to trigger builds
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: this.authHeader,
        },
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to trigger Jenkins job: ${response.status} ${response.statusText}`,
        };
      }

      // Jenkins doesn't return the build ID directly, we need to get the last build info
      const buildInfoResponse = await fetch(
        `${this.baseUrl}job/${encodeURIComponent(jobId)}/lastBuild/api/json`,
        {
          headers: {
            Authorization: this.authHeader,
            Accept: 'application/json',
          },
        },
      );

      if (!buildInfoResponse.ok) {
        // Return a placeholder since we successfully triggered but couldn't get the build ID
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

      const buildInfo = await buildInfoResponse.json();

      return {
        success: true,
        data: {
          id: buildInfo.id.toString(),
          job_id: jobId,
          url: buildInfo.url,
          status: this.mapJenkinsBuildStatus(buildInfo.result, buildInfo.building),
          created_at: new Date(buildInfo.timestamp).toISOString(),
          updated_at: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      console.error(`[@service:jenkins:triggerJob] Error triggering job ${jobId}:`, error);
      return {
        success: false,
        error: error.message || `Failed to trigger Jenkins job ${jobId}`,
      };
    }
  }

  /**
   * Get status of a build
   */
  async getBuildStatus(jobId: string, buildId: string): Promise<CICDResponse<CICDBuild>> {
    try {
      const url = `${this.baseUrl}job/${encodeURIComponent(jobId)}/${buildId}/api/json`;
      const response = await fetch(url, {
        headers: {
          Authorization: this.authHeader,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to get Jenkins build status: ${response.status} ${response.statusText}`,
        };
      }

      const buildInfo = await response.json();

      return {
        success: true,
        data: {
          id: buildId,
          job_id: jobId,
          url: buildInfo.url,
          status: this.mapJenkinsBuildStatus(buildInfo.result, buildInfo.building),
          created_at: new Date(buildInfo.timestamp).toISOString(),
          updated_at: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      console.error(
        `[@service:jenkins:getBuildStatus] Error getting build status for ${jobId}/${buildId}:`,
        error,
      );
      return {
        success: false,
        error: error.message || `Failed to get Jenkins build status for ${jobId}/${buildId}`,
      };
    }
  }

  /**
   * Helper method to map Jenkins build status to our status type
   */
  private mapJenkinsBuildStatus(
    result?: string,
    building?: boolean,
  ): 'pending' | 'running' | 'success' | 'failure' | 'unknown' {
    if (building) {
      return 'running';
    }

    if (result === 'SUCCESS') {
      return 'success';
    } else if (result === 'FAILURE' || result === 'ABORTED') {
      return 'failure';
    } else if (!result) {
      return 'pending';
    }

    return 'unknown';
  }

  /**
   * Get build logs
   */
  async getBuildLogs(_jobId: string, _buildId: string): Promise<CICDResponse<string>> {
    // Implementation for Jenkins logs
    return {
      success: false,
      error: 'Getting Jenkins build logs is not yet implemented',
    };
  }

  /**
   * Create a new job
   */
  async createJob(
    _jobName: string,
    _pipelineConfig: CICDPipelineConfig,
    _folderPath?: string,
  ): Promise<CICDResponse<string>> {
    // Implementation for creating Jenkins jobs
    return {
      success: false,
      error: 'Creating Jenkins jobs is not yet implemented',
    };
  }

  /**
   * Delete a job
   */
  async deleteJob(_jobId: string, _folderPath?: string): Promise<CICDResponse<boolean>> {
    // Implementation for deleting Jenkins jobs
    return {
      success: false,
      error: 'Deleting Jenkins jobs is not yet implemented',
    };
  }
}
