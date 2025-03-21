import { CICDBuild, CICDJob, CICDJobParameter, CICDProvider, CICDProviderConfig, CICDResponse } from './interfaces';

/**
 * Jenkins CI/CD Provider Implementation
 */
export class JenkinsProvider implements CICDProvider {
  private config: CICDProviderConfig | null = null;
  private authHeader: string = '';
  private baseUrl: string = '';
  private crumb: { crumb: string; crumbRequestField: string } | null = null;

  /**
   * Initialize the Jenkins provider with configuration
   */
  initialize(config: CICDProviderConfig): void {
    this.config = config;
    this.baseUrl = config.url.endsWith('/') ? config.url.slice(0, -1) : config.url;
    
    console.log(`[JENKINS] Initializing provider with config: url=${this.baseUrl}, type=${config.type}`);
    
    // Always use token-based authentication for Jenkins
    const token = config.credentials?.token;
    const username = config.credentials?.username || 'admin';
    
    if (!token) {
      console.error('[JENKINS] ERROR: No token provided for Jenkins authentication');
    }
    
    console.log(`[JENKINS] Using token auth with username: ${username}`);
    
    // Basic auth with username:token for Jenkins
      this.authHeader = `Basic ${Buffer.from(`${username}:${token}`).toString('base64')}`;
    
    console.log(`[JENKINS] Provider initialized with auth header (present: ${!!this.authHeader})`);
  }

  /**
   * Get a Jenkins CSRF crumb for protected operations
   */
  private async getCrumb(): Promise<CICDResponse<{ crumb: string; crumbRequestField: string }>> {
    try {
      console.log('[JENKINS] Getting CSRF crumb from Jenkins with auth:', !!this.authHeader);
      
      // Try to get a crumb from Jenkins
      const result = await this.jenkinsRequest<any>(
        '/crumbIssuer/api/json',
        { 
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        }
      );
      
      console.log(`[JENKINS] Crumb request result:`, { 
        success: result.success, 
        dataAvailable: !!result.data,
        error: result.error
      });
      
      if (!result.success) {
        console.error('[JENKINS] Failed to get CSRF crumb:', result.error);
        // If crumb issuer fails, we might be dealing with a Jenkins instance without CSRF protection
        return {
          success: false,
          error: `Failed to get CSRF crumb: ${result.error}`
        };
      }
      
      if (!result.data || !result.data.crumb || !result.data.crumbRequestField) {
        console.error('[JENKINS] Invalid CSRF crumb response:', JSON.stringify(result.data));
        return {
          success: false,
          error: 'Invalid CSRF crumb response from Jenkins'
        };
      }
      
      const crumbData = {
        crumb: result.data.crumb,
        crumbRequestField: result.data.crumbRequestField
      };
      
      console.log(`[JENKINS] CSRF crumb obtained: ${crumbData.crumbRequestField}=${crumbData.crumb.substring(0, 10)}...`);
      
      // Cache the crumb for future requests
      this.crumb = crumbData;
      
      return {
        success: true,
        data: crumbData
      };
    } catch (error: any) {
      console.error('[JENKINS] Error getting CSRF crumb:', error);
      return {
        success: false,
        error: error.message || 'Failed to get CSRF crumb from Jenkins'
      };
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
      
      // Ensure we have a valid auth header
      if (!this.authHeader) {
        console.error('[JENKINS] No authentication credentials available');
        console.error('[JENKINS] Auth config:', {
          type: this.config.auth_type,
          username: !!this.config.credentials.username,
          token: !!this.config.credentials.token,
          password: !!this.config.credentials.password
        });
        
        return {
          success: false,
          error: 'No authentication credentials available for Jenkins'
        };
      }
      
      // Add authentication headers
      let headers: HeadersInit = {
        ...options.headers,
        'Authorization': this.authHeader
      };

      // Set default content type if not overridden by options
      if (!headers['Content-Type'] && !options.headers?.['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
      
      // For POST/PUT/DELETE requests, add CSRF protection crumb
      if (['POST', 'PUT', 'DELETE'].includes(options.method || '')) {
        // Make sure we have a valid crumb
        if (!this.crumb) {
          console.log('[JENKINS] No CSRF crumb available, fetching one...');
          const crumbResult = await this.getCrumb();
          
          if (crumbResult.success && crumbResult.data) {
            this.crumb = crumbResult.data;
            console.log('[JENKINS] Successfully obtained CSRF crumb');
          } else {
            console.warn('[JENKINS] Failed to get CSRF crumb, proceeding without it:', crumbResult.error);
            // Try to proceed anyway - some Jenkins instances don't require CSRF protection
          }
        }
        
        // Add the crumb to headers if available
        if (this.crumb) {
          headers[this.crumb.crumbRequestField] = this.crumb.crumb;
          console.log(`[JENKINS] Added CSRF crumb to request headers: ${this.crumb.crumbRequestField}=${this.crumb.crumb.substring(0, 10)}...`);
        } else {
          console.warn('[JENKINS] No CSRF crumb available, proceeding without it');
        }
      }
      
      console.log(`[JENKINS] Headers prepared:`, Object.keys(headers));

      console.log(`[JENKINS] Sending request to ${url}`);
      const response = await fetch(url, {
        ...options,
        headers,
        cache: 'no-store' // Important for real-time data
      });
      console.log(`[JENKINS] Response received: Status ${response.status} ${response.statusText}`);
      
      // Log all response headers for debugging
      const responseHeaders = Object.fromEntries([...response.headers.entries()]);
      console.log(`[JENKINS] Response headers:`, JSON.stringify(responseHeaders));

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[JENKINS] Request failed with status ${response.status}: ${errorText}`);
        
        // If we get a 403 with a crumb error, our crumb might be expired or invalid
        if (response.status === 403 && errorText.includes('No valid crumb')) {
          console.log('[JENKINS] CSRF crumb validation failed, clearing cached crumb');
          this.crumb = null;
          
          // If this was the first try, retry the request with a fresh crumb
          if (!options._retryWithCrumb) {
            console.log('[JENKINS] Retrying request with fresh CSRF crumb');
            return this.jenkinsRequest<T>(path, { ...options, _retryWithCrumb: true });
          } else {
            console.error('[JENKINS] Still failing after refresh of CSRF crumb');
            return {
              success: false,
              error: `Jenkins CSRF protection error: ${errorText}`
            };
          }
        }
        
        // If we get a 401/403, we might have authentication issues
        if (response.status === 401 || response.status === 403) {
          console.error('[JENKINS] Authentication error. Check your credentials.');
          return {
            success: false,
            error: `Jenkins authentication error: ${errorText}`
          };
        }
        
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
   * Create a new Jenkins job
   */
  async createJob(jobName: string, jobXml: string, folderPath?: string): Promise<CICDResponse<string>> {
    try {
      // Construct the API endpoint - handle folder path if specified
      let endpoint = '/createItem?name=' + encodeURIComponent(jobName);
      
      // If folder path is specified, modify the endpoint to create in that folder
      if (folderPath) {
        // Format: /job/folder/job/subfolder/createItem?name=jobName
        const folderSegments = folderPath.split('/').filter(Boolean);
        endpoint = folderSegments.map(segment => `/job/${encodeURIComponent(segment)}`).join('') + endpoint;
      }
      
      console.log(`[JENKINS] Creating new job at endpoint: ${endpoint}`);
      console.log(`[JENKINS] Authorization header present: ${!!this.authHeader}`);
      console.log(`[JENKINS] Token auth configured: ${this.config?.auth_type === 'token'}`);
      
      // For debugging purposes, log auth details (without revealing sensitive information)
      if (this.config?.auth_type === 'token') {
        console.log(`[JENKINS] Token auth username: ${this.config.credentials.username || 'admin'}`);
        console.log(`[JENKINS] Token present: ${!!this.config.credentials.token}`);
      }
      
      // Make POST request to Jenkins API with XML content
      const result = await this.jenkinsRequest<any>(
        endpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/xml'
          },
          body: jobXml
        }
      );
      
      if (!result.success) {
        console.error(`[JENKINS] Failed to create job: ${result.error}`);
        return result;
      }
      
      console.log(`[JENKINS] Job created successfully: ${jobName}`);
      
      // Return the job name as confirmation
      return {
        success: true,
        data: jobName
      };
    } catch (error: any) {
      console.error(`[JENKINS] Error creating job ${jobName}:`, error);
      return {
        success: false,
        error: error.message || `Failed to create Jenkins job ${jobName}`
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

  /**
   * Delete a Jenkins job
   * @param jobId The ID (name) of the job to delete
   * @param folderPath Optional folder path where the job is located
   * @returns Object with success status
   */
  async deleteJob(jobId: string, folderPath?: string): Promise<CICDResponse<boolean>> {
    try {
      console.log(`[JENKINS] Deleting job '${jobId}'${folderPath ? ` in folder '${folderPath}'` : ''}`);
      
      if (!jobId) {
        console.error('[JENKINS] Cannot delete job - job ID is required');
        return {
          success: false,
          error: 'Job ID is required'
        };
      }
      
      // Construct the API endpoint - handle folder path if specified
      let endpoint = `/job/${encodeURIComponent(jobId)}/doDelete`;
      
      // If folder path is specified, modify the endpoint to delete in that folder
      if (folderPath) {
        // Format: /job/folder/job/subfolder/job/jobName/doDelete
        const folderSegments = folderPath.split('/').filter(Boolean);
        endpoint = folderSegments.map(segment => `/job/${encodeURIComponent(segment)}`).join('') + 
                  `/job/${encodeURIComponent(jobId)}/doDelete`;
      }
      
      console.log(`[JENKINS] Deleting job at endpoint: ${endpoint}`);
      
      // Make POST request to Jenkins API (Jenkins uses POST for deletion)
      const result = await this.jenkinsRequest<any>(
        endpoint,
        { method: 'POST' }
      );
      
      if (!result.success) {
        console.error(`[JENKINS] Failed to delete job: ${result.error}`);
        return result;
      }
      
      console.log(`[JENKINS] Job deleted successfully: ${jobId}`);
      
      return {
        success: true,
        data: true
      };
    } catch (error: any) {
      console.error(`[JENKINS] Error deleting job ${jobId}:`, error);
      return {
        success: false,
        error: error.message || `Failed to delete Jenkins job ${jobId}`
      };
    }
  }

  /**
   * Test connection to Jenkins
   */
  async testConnection(): Promise<CICDResponse<boolean>> {
    try {
      console.log('[JENKINS] Testing connection to Jenkins server');
      
      const response = await this.jenkinsRequest<any>('/api/json');
      
      if (response.success) {
        console.log('[JENKINS] Connection test successful');
        return {
          success: true,
          data: true
        };
      } else {
        console.error('[JENKINS] Connection test failed:', response.error);
        return {
          success: false,
          error: response.error || 'Failed to connect to Jenkins server'
        };
      }
    } catch (error: any) {
      console.error('[JENKINS] Connection test failed with exception:', error);
      return {
        success: false,
        error: error.message || 'Failed to connect to Jenkins server'
      };
    }
  }
}