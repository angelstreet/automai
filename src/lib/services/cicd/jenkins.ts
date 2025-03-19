import { CICDBuild, CICDJob, CICDJobParameter, CICDProvider, CICDProviderConfig, CICDResponse } from './interfaces';

/**
 * Jenkins CI/CD Provider Implementation
 */
export class JenkinsProvider implements CICDProvider {
  private config: CICDProviderConfig | null = null;
  private authHeader: string = '';
  private baseUrl: string = '';

  /**
   * Initialize the Jenkins provider with configuration
   */
  initialize(config: CICDProviderConfig): void {
    this.config = config;
    this.baseUrl = config.url.endsWith('/') ? config.url.slice(0, -1) : config.url;
    
    // Set up authentication
    if (config.auth_type === 'api_token') {
      // Jenkins API token authentication
      const token = config.credentials.token;
      const username = config.credentials.username || 'admin';
      this.authHeader = `Basic ${Buffer.from(`${username}:${token}`).toString('base64')}`;
    } else if (config.auth_type === 'basic_auth') {
      // Basic authentication
      const { username, password } = config.credentials;
      this.authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
    }
  }

  /**
   * Helper method to make authenticated requests to Jenkins API
   */
  private async jenkinsRequest<T>(path: string, options: RequestInit = {}): Promise<CICDResponse<T>> {
    try {
      if (!this.config) {
        return {
          success: false,
          error: 'Jenkins provider not initialized'
        };
      }

      const url = `${this.baseUrl}${path}`;
      
      // Add authentication headers
      const headers = {
        ...options.headers,
        'Authorization': this.authHeader,
        'Content-Type': 'application/json'
      };

      const response = await fetch(url, {
        ...options,
        headers,
        cache: 'no-store' // Important for real-time data
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Jenkins API error: ${response.status} - ${errorText}`
        };
      }

      // Handle different response types
      const contentType = response.headers.get('content-type');
      let data: any;
      
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      return {
        success: true,
        data: data as T
      };
    } catch (error: any) {
      console.error('Jenkins API request error:', error);
      return {
        success: false,
        error: error.message || 'Failed to make Jenkins API request'
      };
    }
  }

  /**
   * Get available Jenkins jobs
   */
  async getAvailableJobs(): Promise<CICDResponse<CICDJob[]>> {
    try {
      // Get the list of jobs from Jenkins API
      const result = await this.jenkinsRequest<any>('/api/json?tree=jobs[name,url,description,buildable]');
      
      if (!result.success) {
        return result;
      }

      // Map Jenkins jobs to our CICDJob interface
      const jobs: CICDJob[] = result.data.jobs
        .filter((job: any) => job.buildable)
        .map((job: any) => ({
          id: job.name,
          name: job.name,
          url: job.url,
          description: job.description || ''
        }));

      return {
        success: true,
        data: jobs
      };
    } catch (error: any) {
      console.error('Error getting Jenkins jobs:', error);
      return {
        success: false,
        error: error.message || 'Failed to get Jenkins jobs'
      };
    }
  }

  /**
   * Get job details including parameters
   */
  async getJobDetails(jobId: string): Promise<CICDResponse<CICDJob>> {
    try {
      // Get detailed job info from Jenkins API
      const result = await this.jenkinsRequest<any>(`/job/${encodeURIComponent(jobId)}/api/json?tree=name,url,description,property[parameterDefinitions[name,type,defaultParameterValue[value],description,choices]]`);
      
      if (!result.success) {
        return result;
      }

      // Extract parameters if they exist
      const parameters: CICDJobParameter[] = [];
      
      const paramProperty = result.data.property?.find((prop: any) => 
        prop?.parameterDefinitions && Array.isArray(prop.parameterDefinitions)
      );
      
      if (paramProperty) {
        paramProperty.parameterDefinitions.forEach((param: any) => {
          // Map Jenkins parameter to our parameter format
          const parameter: CICDJobParameter = {
            name: param.name,
            type: this.mapJenkinsParamType(param.type),
            description: param.description || '',
            default: param.defaultParameterValue?.value,
            required: true // Jenkins treats all parameters as required
          };
          
          // Add choices for choice parameters
          if (param.type === 'ChoiceParameterDefinition' && Array.isArray(param.choices)) {
            parameter.choices = param.choices;
          }
          
          parameters.push(parameter);
        });
      }

      // Construct the job object
      const job: CICDJob = {
        id: jobId,
        name: result.data.name,
        url: result.data.url,
        description: result.data.description || '',
        parameters: parameters
      };

      return {
        success: true,
        data: job
      };
    } catch (error: any) {
      console.error(`Error getting Jenkins job details for ${jobId}:`, error);
      return {
        success: false,
        error: error.message || `Failed to get Jenkins job details for ${jobId}`
      };
    }
  }

  /**
   * Helper method to map Jenkins parameter types to our types
   */
  private mapJenkinsParamType(jenkinsType: string): 'string' | 'boolean' | 'number' | 'choice' {
    const typeMap: Record<string, 'string' | 'boolean' | 'number' | 'choice'> = {
      'StringParameterDefinition': 'string',
      'TextParameterDefinition': 'string',
      'PasswordParameterDefinition': 'string',
      'BooleanParameterDefinition': 'boolean',
      'ChoiceParameterDefinition': 'choice'
    };
    
    return typeMap[jenkinsType] || 'string';
  }

  /**
   * Trigger a Jenkins job build
   */
  async triggerJob(jobId: string, parameters?: Record<string, any>): Promise<CICDResponse<CICDBuild>> {
    try {
      let buildUrl: string;
      
      // If parameters are provided, use the parameters endpoint
      if (parameters && Object.keys(parameters).length > 0) {
        // Prepare parameters for Jenkins API
        const paramString = Object.entries(parameters)
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
          .join('&');
        
        // Trigger build with parameters
        const result = await this.jenkinsRequest<any>(
          `/job/${encodeURIComponent(jobId)}/buildWithParameters?${paramString}`,
          { method: 'POST' }
        );
        
        if (!result.success) {
          return result;
        }
        
        // Get the build URL from the Location header or response
        buildUrl = result.data.location || '';
      } else {
        // Trigger build without parameters
        const result = await this.jenkinsRequest<any>(
          `/job/${encodeURIComponent(jobId)}/build`,
          { method: 'POST' }
        );
        
        if (!result.success) {
          return result;
        }
        
        // Get the build URL from the Location header or response
        buildUrl = result.data.location || '';
      }
      
      // Extract build number from the queue item URL
      const queueIdMatch = buildUrl.match(/\/queue\/item\/(\d+)\/?$/);
      if (!queueIdMatch) {
        return {
          success: false,
          error: 'Could not extract queue ID from Jenkins response'
        };
      }
      
      const queueId = queueIdMatch[1];
      
      // Poll the queue item to get the build ID
      let buildId = '';
      let attempts = 0;
      
      while (!buildId && attempts < 10) {
        // Wait a bit before checking
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check queue item status
        const queueResult = await this.jenkinsRequest<any>(`/queue/item/${queueId}/api/json`);
        
        if (queueResult.success && queueResult.data.executable) {
          // Got the build ID
          buildId = queueResult.data.executable.number.toString();
          break;
        }
        
        attempts++;
      }
      
      if (!buildId) {
        return {
          success: false,
          error: 'Build was triggered but failed to start or timed out'
        };
      }
      
      // Return the build information
      return {
        success: true,
        data: {
          id: buildId,
          job_id: jobId,
          url: `${this.baseUrl}/job/${encodeURIComponent(jobId)}/${buildId}/`,
          status: 'pending',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      };
    } catch (error: any) {
      console.error(`Error triggering Jenkins job ${jobId}:`, error);
      return {
        success: false,
        error: error.message || `Failed to trigger Jenkins job ${jobId}`
      };
    }
  }

  /**
   * Get Jenkins build status
   */
  async getBuildStatus(jobId: string, buildId: string): Promise<CICDResponse<CICDBuild>> {
    try {
      // Get build information from Jenkins API
      const result = await this.jenkinsRequest<any>(`/job/${encodeURIComponent(jobId)}/${buildId}/api/json?tree=id,building,result,timestamp,url`);
      
      if (!result.success) {
        return result;
      }
      
      // Map Jenkins build status to our status enum
      let status: 'pending' | 'running' | 'success' | 'failure' | 'unknown' = 'unknown';
      
      if (result.data.building) {
        status = 'running';
      } else if (result.data.result === 'SUCCESS') {
        status = 'success';
      } else if (['FAILURE', 'ABORTED', 'UNSTABLE'].includes(result.data.result)) {
        status = 'failure';
      }
      
      // Create our build object
      const build: CICDBuild = {
        id: buildId,
        job_id: jobId,
        url: result.data.url,
        status,
        created_at: new Date(result.data.timestamp).toISOString(),
        updated_at: new Date().toISOString()
      };
      
      return {
        success: true,
        data: build
      };
    } catch (error: any) {
      console.error(`Error getting Jenkins build status for ${jobId}/${buildId}:`, error);
      return {
        success: false,
        error: error.message || `Failed to get Jenkins build status for ${jobId}/${buildId}`
      };
    }
  }

  /**
   * Get Jenkins build logs
   */
  async getBuildLogs(jobId: string, buildId: string): Promise<CICDResponse<string>> {
    try {
      // Get console output from Jenkins API
      const result = await this.jenkinsRequest<string>(`/job/${encodeURIComponent(jobId)}/${buildId}/consoleText`);
      
      return result;
    } catch (error: any) {
      console.error(`Error getting Jenkins build logs for ${jobId}/${buildId}:`, error);
      return {
        success: false,
        error: error.message || `Failed to get Jenkins build logs for ${jobId}/${buildId}`
      };
    }
  }
}