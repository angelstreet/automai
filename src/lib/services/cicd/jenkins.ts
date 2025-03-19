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
    console.log(`[JENKINS] Request initiated: ${options.method || 'GET'} ${path}`);
    console.log(`[JENKINS] Request options:`, JSON.stringify({
      method: options.method || 'GET',
      headers: options.headers || {},
      body: options.body ? '(present)' : '(none)'
    }));
    
    try {
      if (!this.config) {
        console.error('[JENKINS] Request failed: Provider not initialized');
        return {
          success: false,
          error: 'Jenkins provider not initialized'
        };
      }

      const url = `${this.baseUrl}${path}`;
      console.log(`[JENKINS] Full URL: ${url}`);
      
      // Add authentication headers
      const headers = {
        ...options.headers,
        'Authorization': this.authHeader,
        'Content-Type': 'application/json'
      };
      console.log(`[JENKINS] Headers prepared (auth header present: ${!!this.authHeader})`);

      console.log(`[JENKINS] Sending request to ${url}`);
      const response = await fetch(url, {
        ...options,
        headers,
        cache: 'no-store' // Important for real-time data
      });
      console.log(`[JENKINS] Response received: Status ${response.status} ${response.statusText}`);
      console.log(`[JENKINS] Response headers:`, JSON.stringify(Object.fromEntries([...response.headers.entries()])));

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[JENKINS] Request failed with status ${response.status}: ${errorText}`);
        return {
          success: false,
          error: `Jenkins API error: ${response.status} - ${errorText}`
        };
      }

      // Handle different response types
      const contentType = response.headers.get('content-type');
      console.log(`[JENKINS] Response content-type: ${contentType}`);
      
      let data: any;
      
      if (contentType?.includes('application/json')) {
        data = await response.json();
        console.log(`[JENKINS] Parsed JSON response:`, JSON.stringify(data, null, 2));
      } else {
        data = await response.text();
        console.log(`[JENKINS] Text response (first 500 chars): ${data.substring(0, 500)}${data.length > 500 ? '...' : ''}`);
      }

      console.log(`[JENKINS] Request completed successfully`);
      return {
        success: true,
        data: data as T
      };
    } catch (error: any) {
      console.error('[JENKINS] Request failed with exception:', error);
      console.error('[JENKINS] Error stack:', error.stack);
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
    console.log(`[JENKINS] Triggering job '${jobId}' with parameters:`, JSON.stringify(parameters || {}));
    
    try {
      let buildUrl: string;
      
      // If parameters are provided, use the parameters endpoint
      if (parameters && Object.keys(parameters).length > 0) {
        console.log(`[JENKINS] Job has ${Object.keys(parameters).length} parameters, using buildWithParameters endpoint`);
        
        // Prepare parameters for Jenkins API
        const paramString = Object.entries(parameters)
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
          .join('&');
        
        console.log(`[JENKINS] Parameter string: ${paramString}`);
        const endpoint = `/job/${encodeURIComponent(jobId)}/buildWithParameters?${paramString}`;
        console.log(`[JENKINS] Triggering endpoint: ${endpoint}`);
        
        // Trigger build with parameters
        const result = await this.jenkinsRequest<any>(
          endpoint,
          { method: 'POST' }
        );
        
        console.log(`[JENKINS] Trigger result:`, JSON.stringify(result));
        
        if (!result.success) {
          console.error(`[JENKINS] Failed to trigger job with parameters: ${result.error}`);
          return result;
        }
        
        // Get the build URL from the Location header or response
        buildUrl = result.data.location || '';
        console.log(`[JENKINS] Build URL from response: ${buildUrl}`);
      } else {
        console.log(`[JENKINS] Job has no parameters, using standard build endpoint`);
        
        // Trigger build without parameters
        const endpoint = `/job/${encodeURIComponent(jobId)}/build`;
        console.log(`[JENKINS] Triggering endpoint: ${endpoint}`);
        
        const result = await this.jenkinsRequest<any>(
          endpoint,
          { method: 'POST' }
        );
        
        console.log(`[JENKINS] Trigger result:`, JSON.stringify(result));
        
        if (!result.success) {
          console.error(`[JENKINS] Failed to trigger job: ${result.error}`);
          return result;
        }
        
        // Get the build URL from the Location header or response
        buildUrl = result.data.location || '';
        console.log(`[JENKINS] Build URL from response: ${buildUrl}`);
      }
      
      // Check if we got a buildUrl
      if (!buildUrl) {
        console.error(`[JENKINS] No build URL returned from Jenkins API`);
        return {
          success: false,
          error: 'No build URL returned from Jenkins API'
        };
      }
      
      // Extract build number from the queue item URL
      const queueIdMatch = buildUrl.match(/\/queue\/item\/(\d+)\/?$/);
      console.log(`[JENKINS] Queue ID match:`, queueIdMatch);
      
      if (!queueIdMatch) {
        console.error(`[JENKINS] Could not extract queue ID from build URL: ${buildUrl}`);
        return {
          success: false,
          error: 'Could not extract queue ID from Jenkins response'
        };
      }
      
      const queueId = queueIdMatch[1];
      console.log(`[JENKINS] Extracted queue ID: ${queueId}`);
      
      // Poll the queue item to get the build ID
      let buildId = '';
      let attempts = 0;
      
      console.log(`[JENKINS] Starting to poll queue item for build ID`);
      while (!buildId && attempts < 10) {
        attempts++;
        console.log(`[JENKINS] Polling attempt ${attempts}/10`);
        
        // Wait a bit before checking
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check queue item status
        const queueEndpoint = `/queue/item/${queueId}/api/json`;
        console.log(`[JENKINS] Checking queue status endpoint: ${queueEndpoint}`);
        
        const queueResult = await this.jenkinsRequest<any>(queueEndpoint);
        console.log(`[JENKINS] Queue status result:`, JSON.stringify(queueResult));
        
        if (queueResult.success && queueResult.data.executable) {
          // Got the build ID
          buildId = queueResult.data.executable.number.toString();
          console.log(`[JENKINS] Build ID obtained: ${buildId}`);
          break;
        } else if (queueResult.success) {
          console.log(`[JENKINS] Build not started yet, queue item status:`, 
            queueResult.data.blocked ? 'blocked' : 
            queueResult.data.stuck ? 'stuck' : 
            queueResult.data.cancelled ? 'cancelled' : 'waiting');
        } else {
          console.error(`[JENKINS] Error checking queue status: ${queueResult.error}`);
        }
      }
      
      if (!buildId) {
        console.error(`[JENKINS] Failed to get build ID after ${attempts} attempts`);
        return {
          success: false,
          error: 'Build was triggered but failed to start or timed out'
        };
      }
      
      // Prepare return data
      const buildData = {
        id: buildId,
        job_id: jobId,
        url: `${this.baseUrl}/job/${encodeURIComponent(jobId)}/${buildId}/`,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      console.log(`[JENKINS] Job triggered successfully:`, JSON.stringify(buildData));
      
      // Return the build information
      return {
        success: true,
        data: buildData
      };
    } catch (error: any) {
      console.error(`[JENKINS] Error triggering job ${jobId}:`, error);
      console.error(`[JENKINS] Error stack:`, error.stack);
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