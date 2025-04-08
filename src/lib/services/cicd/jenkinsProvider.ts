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
    console.log(
      `[@service:jenkins:initialize] Initializing Jenkins provider with config: ${config.name}, auth_type: ${config.auth_type}`,
    );

    this.config = config;

    // Handle URL construction with proper port
    let baseUrl = config.url;

    // Check for port in different possible locations
    // 1. Direct port property in config (as in database schema)
    // 2. Nested in config.port
    // 3. Nested in config.config.port
    const port =
      (config as any).port || (config as any).config?.port || (config as any).credentials?.port;

    if (port) {
      console.log(`[@service:jenkins:initialize] Found port ${port} for provider ${config.name}`);

      // Only add port if the URL doesn't already include it
      if (!baseUrl.includes(':' + port)) {
        try {
          const urlObj = new URL(baseUrl);
          // Only add port if it's not the default port for the protocol
          if (
            (urlObj.protocol === 'http:' && port !== 80) ||
            (urlObj.protocol === 'https:' && port !== 443)
          ) {
            console.log(`[@service:jenkins:initialize] Adding port ${port} to URL ${baseUrl}`);
            urlObj.port = port.toString();
            baseUrl = urlObj.toString();
          }
        } catch (error: any) {
          console.error(
            `[@service:jenkins:initialize] Invalid URL format: ${baseUrl}, error: ${error.message}`,
          );
        }
      } else {
        console.log(`[@service:jenkins:initialize] URL already contains port: ${baseUrl}`);
      }
    } else {
      console.log(`[@service:jenkins:initialize] No port specified for provider ${config.name}`);
    }

    // Log the URL we're using
    console.log(`[@service:jenkins:initialize] Using Jenkins URL: ${baseUrl}`);

    // Ensure URL ends with a slash
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

    // Set up authentication with better error handling
    try {
      // Jenkins requires Basic auth for both username/password and username/apitoken
      // Extract credentials from nested config structures if needed
      const credentials = {
        username:
          config.credentials?.username || (config as any).config?.credentials?.username || '',
        token: config.credentials?.token || (config as any).config?.credentials?.token || '',
        password:
          config.credentials?.password || (config as any).config?.credentials?.password || '',
      };

      console.log(`[@service:jenkins:initialize] Found credentials:`, {
        hasUsername: !!credentials.username,
        hasToken: !!credentials.token,
        hasPassword: !!credentials.password,
        username: credentials.username, // Log actual username for debugging
      });

      // For Jenkins, always use Basic auth with username + (token or password)
      const secret = credentials.token || credentials.password;

      if (credentials.username && secret) {
        // Create Basic auth with username:token (or username:password)
        console.log(
          `[@service:jenkins:initialize] Creating Basic auth with username: ${credentials.username}`,
        );
        const base64Credentials = Buffer.from(`${credentials.username}:${secret}`).toString(
          'base64',
        );
        this.authHeader = `Basic ${base64Credentials}`;

        // Log a sanitized version of the auth header for debugging
        const authHeaderHint = `Basic ${base64Credentials.substring(0, 5)}...${base64Credentials.substring(base64Credentials.length - 5)}`;
        console.log(`[@service:jenkins:initialize] Auth header created: ${authHeaderHint}`);
      } else {
        console.error(
          `[@service:jenkins:initialize] Missing required credentials (username and token/password)`,
        );
        throw new Error('Missing required credentials (username and token/password)');
      }
    } catch (error: any) {
      console.error(`[@service:jenkins:initialize] Error setting up authentication:`, error);
      throw new Error(`Failed to set up authentication: ${error.message}`);
    }

    console.log(
      `[@service:jenkins:initialize] Successfully initialized Jenkins provider for ${this.baseUrl}`,
    );
  }

  /**
   * Test connection to Jenkins
   */
  async testConnection(): Promise<CICDResponse<boolean>> {
    try {
      console.log(
        `[@service:jenkins:testConnection] Testing connection to Jenkins: ${this.baseUrl}`,
      );

      // Log the authentication header format we're using (without showing the actual credentials)
      const authType = this.authHeader.startsWith('Basic ')
        ? 'Basic Auth'
        : this.authHeader.startsWith('Bearer ')
          ? 'Bearer Token'
          : this.authHeader
            ? 'Custom'
            : 'None';
      console.log(`[@service:jenkins:testConnection] Using authentication type: ${authType}`);

      // First try a simple unauthenticated request to check if the server is reachable
      try {
        console.log(`[@service:jenkins:testConnection] Testing server reachability (no auth)`);
        const reachabilityResponse = await fetch(this.baseUrl, {
          method: 'HEAD',
        });
        console.log(
          `[@service:jenkins:testConnection] Server is reachable, status: ${reachabilityResponse.status}`,
        );
      } catch (error: any) {
        console.error(
          `[@service:jenkins:testConnection] Server is not reachable: ${error.message}`,
        );
        return {
          success: false,
          error: `Server is not reachable: ${error.message}`,
        };
      }

      // STEP 1: Test basic API access with authentication
      console.log(`[@service:jenkins:testConnection] Testing authenticated API access`);
      const apiUrl = `${this.baseUrl}api/json`;

      // Log curl equivalent for debugging (with masked auth)
      const maskedAuth = this.authHeader.startsWith('Bearer ')
        ? 'Bearer ***TOKEN***'
        : this.authHeader.startsWith('Basic ')
          ? 'Basic ***CREDENTIALS***'
          : this.authHeader;

      const curlCommand = `curl -v "${apiUrl}" -H "Authorization: ${maskedAuth}" -H "Accept: application/json"`;
      console.log(`[@service:jenkins:testConnection] Curl equivalent: \n${curlCommand}`);

      const response = await fetch(apiUrl, {
        headers: {
          Authorization: this.authHeader,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        console.error(
          `[@service:jenkins:testConnection] API test failed: ${response.status} ${response.statusText}`,
        );
        const errorText = await response.text();
        console.error(
          `[@service:jenkins:testConnection] Error details: ${errorText.substring(0, 200)}...`,
        );

        if (response.status === 401 || response.status === 403) {
          return {
            success: false,
            error: `Authentication failed (${response.status}). Please check your Jenkins credentials.`,
          };
        }

        return {
          success: false,
          error: `Failed to connect to Jenkins: ${response.status} ${response.statusText}`,
        };
      }

      console.log(`[@service:jenkins:testConnection] API access successful`);

      // STEP 2: Test CSRF crumb access which is needed for job creation
      try {
        console.log(`[@service:jenkins:testConnection] Testing CSRF crumb access`);
        const crumbUrl = `${this.baseUrl}crumbIssuer/api/json`;
        const crumbResponse = await fetch(crumbUrl, {
          headers: {
            Authorization: this.authHeader,
            Accept: 'application/json',
          },
        });

        if (crumbResponse.ok) {
          const crumbData = await crumbResponse.json();
          const crumbField = crumbData.crumbRequestField || 'Jenkins-Crumb';
          console.log(
            `[@service:jenkins:testConnection] CSRF crumb access successful. Field: ${crumbField}`,
          );
        } else if (crumbResponse.status === 404) {
          console.log(
            `[@service:jenkins:testConnection] CSRF protection appears to be disabled (404 on crumbIssuer)`,
          );
        } else {
          console.warn(
            `[@service:jenkins:testConnection] CSRF crumb access failed: ${crumbResponse.status} ${crumbResponse.statusText}`,
          );
          const errorText = await crumbResponse.text();
          console.warn(
            `[@service:jenkins:testConnection] CSRF error details: ${errorText.substring(0, 200)}...`,
          );

          // This might be an issue when creating jobs later, but not a connection failure
          console.warn(
            `[@service:jenkins:testConnection] CSRF protection issues may cause problems when creating jobs`,
          );
        }
      } catch (error: any) {
        console.warn(`[@service:jenkins:testConnection] Error checking CSRF: ${error.message}`);
      }

      console.log(`[@service:jenkins:testConnection] Connection test successful`);
      return {
        success: true,
        data: true,
      };
    } catch (error: any) {
      console.error(`[@service:jenkins:testConnection] Error: ${error.message}`);
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
    folderPath?: string,
  ): Promise<CICDResponse<CICDBuild>> {
    try {
      console.log(`[@service:jenkins:triggerJob] Triggering job with ID: ${jobId}`);
      
      // Prepare URL based on whether we have folder path and parameters
      let url = this.baseUrl;
      
      // If job ID contains slashes, it already includes the folder structure
      // Otherwise, apply the folderPath parameter if provided
      if (jobId.includes('/')) {
        // Split the job ID into folder path and job name
        const parts = jobId.split('/');
        const actualJobId = parts.pop() || ''; // Last part is the job name
        const actualFolderPath = parts.join('/'); // Rest is the folder path
        
        // Construct URL with the folder path structure
        parts.forEach(part => {
          if (part.trim()) {
            url += `job/${encodeURIComponent(part)}/`;
          }
        });
        
        // Add the actual job ID
        url += `job/${encodeURIComponent(actualJobId)}/`;
        
        console.log(`[@service:jenkins:triggerJob] Job ID contains folder path: ${actualFolderPath}, job name: ${actualJobId}`);
      } else if (folderPath) {
        // Add folder path to URL
        if (folderPath.includes('/')) {
          // Handle multi-level folder paths
          const folderParts = folderPath.split('/');
          folderParts.forEach(part => {
            if (part.trim()) {
              url += `job/${encodeURIComponent(part)}/`;
            }
          });
        } else {
          url += `job/${encodeURIComponent(folderPath)}/`;
        }
        
        url += `job/${encodeURIComponent(jobId)}/`;
        
        // Log detailed URL information for debugging
        console.log(`[@service:jenkins:triggerJob] Using folder path: ${folderPath} for job: ${jobId}`);
        console.log(`[@service:jenkins:triggerJob] Folder parts: ${folderPath.split('/').filter(p => p.trim()).join(', ')}`);
        console.log(`[@service:jenkins:triggerJob] Expected Jenkins full project name: ${folderPath}/${jobId}`);
      } else {
        // No folder structure, just use the job ID directly
        url += `job/${encodeURIComponent(jobId)}/`;
      }

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
      
      console.log(`[@service:jenkins:triggerJob] Prepared URL: ${url}`);
      console.log(`[@service:jenkins:triggerJob] Auth header type: ${this.authHeader.startsWith('Basic') ? 'Basic' : 'Other'}`);
      
      // Try to get CSRF crumb for Jenkins
      let crumb = null;
      let crumbRequestField = 'Jenkins-Crumb';
      
      try {
        console.log(`[@service:jenkins:triggerJob] Trying to get CSRF crumb`);
        const crumbResponse = await fetch(`${this.baseUrl}crumbIssuer/api/json`, {
          headers: {
            Authorization: this.authHeader,
            Accept: 'application/json',
          },
        });
        
        if (crumbResponse.ok) {
          const crumbData = await crumbResponse.json();
          crumb = crumbData.crumb;
          crumbRequestField = crumbData.crumbRequestField || 'Jenkins-Crumb';
          console.log(`[@service:jenkins:triggerJob] Got CSRF crumb: ${crumbRequestField}=${crumb?.substring(0, 5)}...`);
        } else {
          console.log(`[@service:jenkins:triggerJob] Failed to get CSRF crumb: ${crumbResponse.status} ${crumbResponse.statusText}`);
        }
      } catch (crumbError) {
        console.warn(`[@service:jenkins:triggerJob] Error getting CSRF crumb: ${crumbError.message}`);
      }
      
      // Prepare headers
      const headers: Record<string, string> = {
        Authorization: this.authHeader,
      };
      
      // Add CSRF crumb if available
      if (crumb) {
        headers[crumbRequestField] = crumb;
      }

      // Jenkins requires a POST request to trigger builds
      console.log(`[@service:jenkins:triggerJob] Sending POST request to trigger job`);
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
      });

      if (!response.ok) {
        // Try to get more detailed error information
        let errorDetail = '';
        try {
          const errorText = await response.text();
          errorDetail = errorText.substring(0, 200);
        } catch (e) {
          errorDetail = 'Could not retrieve error details';
        }
        
        console.error(`[@service:jenkins:triggerJob] Failed with status ${response.status}: ${errorDetail}`);
        
        if (response.status === 403) {
          return {
            success: false,
            error: `Failed to trigger Jenkins job: 403 Forbidden. Check credentials and permissions. Details: ${errorDetail}`,
          };
        }
        
        return {
          success: false,
          error: `Failed to trigger Jenkins job: ${response.status} ${response.statusText}. Details: ${errorDetail}`,
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
    jobName: string,
    pipelineConfig: CICDPipelineConfig,
    folderPath?: string,
  ): Promise<CICDResponse<string>> {
    try {
      console.log(`[@service:jenkins:createJob] Creating new job: ${jobName}`);

      // Determine the URL (with folder support)
      let url = this.baseUrl;
      
      if (folderPath) {
        // Handle multi-level folders
        if (folderPath.includes('/')) {
          const folderParts = folderPath.split('/');
          folderParts.forEach(part => {
            if (part.trim()) {
              url += `job/${encodeURIComponent(part)}/`;
            }
          });
        } else {
          url += `job/${encodeURIComponent(folderPath)}/`;
        }
        
        console.log(`[@service:jenkins:createJob] Using folder path: ${folderPath}`);
      }

      url += 'createItem?name=' + encodeURIComponent(jobName);
      
      // Log detailed URL information for debugging
      if (folderPath) {
        console.log(`[@service:jenkins:createJob] Folder parts: ${folderPath.split('/').filter(p => p.trim()).join(', ')}`);
        console.log(`[@service:jenkins:createJob] Expected Jenkins full project name: ${folderPath}/${jobName}`);
      }

      // Log the exact URL we're using
      console.log(`[@service:jenkins:createJob] Using URL: ${url}`);

      // Create a Jenkins pipeline job config XML
      const jobConfigXml = this.createPipelineJobConfig(pipelineConfig);

      // Log the job config for debugging
      console.log(
        `[@service:jenkins:createJob] Job config XML: ${jobConfigXml.substring(0, 500)}...`,
      );

      // Step 1: Get CSRF crumb first - this is required for POST requests to Jenkins
      console.log(`[@service:jenkins:createJob] Fetching Jenkins CSRF crumb`);

      let crumb = null;
      let crumbRequestField = 'Jenkins-Crumb'; // Default crumb field name in Jenkins

      try {
        const crumbResponse = await fetch(`${this.baseUrl}crumbIssuer/api/json`, {
          headers: {
            Authorization: this.authHeader,
            Accept: 'application/json',
          },
        });

        if (crumbResponse.ok) {
          const crumbData = await crumbResponse.json();
          crumb = crumbData.crumb;

          // Use the crumb field from the response, but default to Jenkins-Crumb if not specified
          crumbRequestField = crumbData.crumbRequestField || 'Jenkins-Crumb';

          console.log(
            `[@service:jenkins:createJob] CSRF crumb obtained: ${crumbRequestField}=${crumb.substring(0, 10)}...`,
          );
        } else {
          // Log the error for debugging
          const errorText = await crumbResponse.text();
          console.warn(
            `[@service:jenkins:createJob] Failed to get CSRF crumb: ${crumbResponse.status} ${crumbResponse.statusText}`,
          );
          console.warn(
            `[@service:jenkins:createJob] Error details: ${errorText.substring(0, 300)}...`,
          );

          if (crumbResponse.status === 403 || crumbResponse.status === 401) {
            console.error(`[@service:jenkins:createJob] Authentication error when fetching crumb`);
            return {
              success: false,
              error: `Authentication failed. Please check your Jenkins credentials.`,
            };
          }

          console.log(
            '[@service:jenkins:createJob] Proceeding without crumb - this may fail if CSRF protection is enabled',
          );
        }
      } catch (crumbError: any) {
        console.warn(`[@service:jenkins:createJob] Error fetching crumb: ${crumbError.message}`);
        console.log(
          '[@service:jenkins:createJob] Proceeding without crumb - this may fail if CSRF protection is enabled',
        );
      }

      // Step 2: Prepare headers for the job creation request
      const headers: Record<string, string> = {
        Authorization: this.authHeader,
        'Content-Type': 'application/xml',
      };

      // Add the crumb header using the correct field name
      if (crumb) {
        headers[crumbRequestField] = crumb;
        console.log(`[@service:jenkins:createJob] Added crumb header: ${crumbRequestField}`);
      }

      // Log a curl-equivalent command for debugging (with masked auth)
      const maskedAuth = this.authHeader.startsWith('Bearer ')
        ? 'Bearer ***TOKEN***'
        : this.authHeader.startsWith('Basic ')
          ? 'Basic ***CREDENTIALS***'
          : this.authHeader;

      const curlCommand = `curl -X POST "${url}" \\
        -H "Authorization: ${maskedAuth}" \\
        -H "Content-Type: application/xml" \\
        ${crumb ? `-H "${crumbRequestField}: ${crumb}" \\` : ''}
        -d '${jobConfigXml.substring(0, 100)}...(truncated)...'`;

      console.log(`[@service:jenkins:createJob] Curl equivalent: \n${curlCommand}`);

      // Step 3: Make the create job request
      console.log(`[@service:jenkins:createJob] Sending POST request to create job`);
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: jobConfigXml,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `[@service:jenkins:createJob] Error response: ${response.status} - ${errorText.substring(0, 500)}`,
        );

        // Check if this is a "No valid crumb" error
        if (errorText.includes('No valid crumb was included')) {
          console.error(
            `[@service:jenkins:createJob] CSRF protection error - invalid or missing crumb`,
          );
          return {
            success: false,
            error: `Jenkins requires CSRF protection but we couldn't provide a valid crumb. Please check your authentication.`,
          };
        }

        // Check if this is an authentication issue
        if (response.status === 403 || response.status === 401) {
          console.error(`[@service:jenkins:createJob] Authentication error when creating job`);
          return {
            success: false,
            error: `Authentication failed. Please check your Jenkins credentials.`,
          };
        }

    return {
      success: false,
          error: `Failed to create Jenkins job: ${response.status} ${response.statusText}`,
        };
      }

      console.log(`[@service:jenkins:createJob] Job created successfully: ${jobName}`);

      return {
        success: true,
        data: jobName,
      };
    } catch (error: any) {
      console.error(`[@service:jenkins:createJob] Error:`, error);
      return {
        success: false,
        error: error.message || 'Failed to create Jenkins job',
      };
    }
  }

  /**
   * Delete a job
   */
  async deleteJob(jobId: string): Promise<CICDResponse<boolean>> {
    try {
      console.log(`[@service:jenkins:deleteJob] Deleting job: ${jobId}`);

      const url = `${this.baseUrl}job/${encodeURIComponent(jobId)}/doDelete`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: this.authHeader,
        },
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Failed to delete Jenkins job: ${response.status} ${response.statusText}`,
        };
      }

      return {
        success: true,
        data: true,
      };
    } catch (error: any) {
      console.error(`[@service:jenkins:deleteJob] Error:`, error);
    return {
      success: false,
        error: error.message || `Failed to delete Jenkins job ${jobId}`,
      };
    }
  }

  /**
   * Create a Jenkins pipeline job configuration XML
   */
  private createPipelineJobConfig(pipelineConfig: CICDPipelineConfig): string {
    // Generate Jenkinsfile script from pipeline configuration
    const scriptContent = this.generateJenkinsfileScript(pipelineConfig);

    return `<?xml version="1.0" encoding="UTF-8"?>
<flow-definition plugin="workflow-job">
  <description>${pipelineConfig.description || ''}</description>
  <keepDependencies>false</keepDependencies>
  <properties>
    <hudson.model.ParametersDefinitionProperty>
      <parameterDefinitions>
        ${this.generateParameterDefinitions(pipelineConfig.parameters || [])}
      </parameterDefinitions>
    </hudson.model.ParametersDefinitionProperty>
  </properties>
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition" plugin="workflow-cps">
    <script>${scriptContent}</script>
    <sandbox>true</sandbox>
  </definition>
  <triggers/>
  <disabled>false</disabled>
</flow-definition>`;
  }

  /**
   * Generate Jenkinsfile script from pipeline configuration
   */
  private generateJenkinsfileScript(pipelineConfig: CICDPipelineConfig): string {
    // Create a basic pipeline script from stages
    let script = 'pipeline {\n';
    script += '  agent any\n';

    // Add parameters if any
    if (pipelineConfig.parameters && pipelineConfig.parameters.length > 0) {
      script += '  parameters {\n';
      for (const param of pipelineConfig.parameters) {
        if (param.type === 'string') {
          script += `    string(name: '${param.name}', defaultValue: '${param.defaultValue || ''}', description: '${param.description || ''}')\n`;
        } else if (param.type === 'boolean') {
          script += `    booleanParam(name: '${param.name}', defaultValue: ${param.defaultValue || false}, description: '${param.description || ''}')\n`;
        } else if (param.type === 'choice') {
          const choices = (param.choices || []).map((c) => `'${c}'`).join(', ');
          script += `    choice(name: '${param.name}', choices: [${choices}], description: '${param.description || ''}')\n`;
        }
      }
      script += '  }\n';
    }

    // Add stages
    script += '  stages {\n';
    for (const stage of pipelineConfig.stages) {
      script += `    stage('${stage.name}') {\n`;
      script += '      steps {\n';

      for (const step of stage.steps) {
        if (step.type === 'command' && step.command) {
          script += `        sh '${step.command}'\n`;
        } else if (step.type === 'script' && step.script) {
          script += `        sh '''\n${step.script}\n'''\n`;
        }
      }

      script += '      }\n';
      script += '    }\n';
    }
    script += '  }\n';

    script += '}\n';
    return script;
  }

  /**
   * Generate parameter definitions XML for Jenkins config
   */
  private generateParameterDefinitions(parameters: any[]): string {
    if (!parameters || parameters.length === 0) {
      return '';
    }

    return parameters
      .map((param) => {
        // Map parameter types to Jenkins parameter XML
        if (param.type === 'string' || param.type === 'text') {
          return `<hudson.model.StringParameterDefinition>
            <name>${param.name}</name>
            <description>${param.description || ''}</description>
            <defaultValue>${param.defaultValue || ''}</defaultValue>
            <trim>false</trim>
          </hudson.model.StringParameterDefinition>`;
        } else if (param.type === 'boolean') {
          return `<hudson.model.BooleanParameterDefinition>
            <name>${param.name}</name>
            <description>${param.description || ''}</description>
            <defaultValue>${param.defaultValue || false}</defaultValue>
          </hudson.model.BooleanParameterDefinition>`;
        } else if (param.type === 'choice') {
          const choices = (param.choices || []).join('\n');
          return `<hudson.model.ChoiceParameterDefinition>
            <name>${param.name}</name>
            <description>${param.description || ''}</description>
            <choices class="java.util.Arrays$ArrayList">
              <a class="string-array">
                <string>${choices}</string>
              </a>
            </choices>
          </hudson.model.ChoiceParameterDefinition>`;
        }
        return '';
      })
      .join('\n');
  }
}
