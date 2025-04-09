import {
  CICDProvider,
  CICDProviderConfig,
  CICDResponse,
  CICDJobConfig,
} from '@/types-new/cicd-provider';

export class JenkinsProvider implements CICDProvider {
  private baseUrl: string;
  private authHeader: string;
  private crumb: { crumbRequestField?: string; crumb?: string } = {};
  private tenantName?: string;
  private username: string;

  constructor(config: CICDProviderConfig) {
    console.log(`[@service:jenkins:constructor] Initializing Jenkins provider: ${config.name}`);

    // Setup base URL with port if provided
    this.baseUrl = config.port ? `${config.url}:${config.port}` : config.url;
    this.baseUrl = this.baseUrl.endsWith('/') ? this.baseUrl : `${this.baseUrl}/`;
    this.tenantName = config.tenant_name;

    // Always use token-based authentication for Jenkins
    // Jenkins API tokens should be used as passwords in Basic Auth
    const username = config.credentials.username;
    const token = config.credentials.token;

    // Store username for folder path construction
    this.username = username;

    // Log the username being used
    console.log(
      `[@service:jenkins:constructor] Using Jenkins API token auth with username: ${username}`,
    );

    // Username:token string format for Basic Auth
    const authString = `${username}:${token}`;
    this.authHeader = `Basic ${Buffer.from(authString).toString('base64')}`;

    // For debugging, log first few chars of the encoded credentials (safely)
    const encodedValue = Buffer.from(authString).toString('base64');
    console.log(
      `[@service:jenkins:constructor] Auth string format (username:token) encoded to: ${encodedValue.substring(0, 5)}...`,
    );

    // Log configuration (without sensitive data)
    console.log(`[@service:jenkins:constructor] Configuration:`, {
      baseUrl: this.baseUrl,
      tenantName: this.tenantName,
      authType: config.auth_type,
      hasUsername: !!config.credentials.username,
      hasToken: !!config.credentials.token,
      hasPassword: !!config.credentials.password,
    });
  }

  /**
   * Get Jenkins crumb for CSRF protection
   */
  private async getCrumb(): Promise<void> {
    try {
      console.log(`[@service:jenkins:getCrumb] Fetching crumb`);

      // Use the correct crumb issuer endpoint
      const crumbUrl = `${this.baseUrl}crumbIssuer/api/json`;
      console.log(`[@service:jenkins:getCrumb] Crumb URL: ${crumbUrl}`);

      // Try to directly access the crumbIssuer page first to debug authentication
      console.log(`[@service:jenkins:getCrumb] Testing direct access to crumbIssuer...`);

      const response = await fetch(crumbUrl, {
        method: 'GET',
        headers: {
          Authorization: this.authHeader,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        console.log(`[@service:jenkins:getCrumb] Failed to get crumb: ${response.statusText}`);
        console.log(`[@service:jenkins:getCrumb] Response status: ${response.status}`);
        // Log more details about the error
        const errorText = await response.text();
        console.log(`[@service:jenkins:getCrumb] Error details:`, errorText);
        return;
      }

      const crumbData = await response.json();
      console.log(`[@service:jenkins:getCrumb] Crumb data:`, {
        crumbRequestField: crumbData.crumbRequestField,
        hasCrumb: !!crumbData.crumb,
      });

      this.crumb = {
        crumbRequestField: crumbData.crumbRequestField,
        crumb: crumbData.crumb,
      };
      console.log(`[@service:jenkins:getCrumb] Successfully got crumb`);
    } catch (error) {
      console.log(`[@service:jenkins:getCrumb] Error getting crumb:`, error);
      // Don't throw - some Jenkins instances don't use crumb
    }
  }

  /**
   * Create a new Jenkins pipeline job
   */
  async createJob(name: string, config: CICDJobConfig): Promise<CICDResponse> {
    try {
      console.log(`[@service:jenkins:createJob] Creating job: ${name}`);

      // Get crumb first
      await this.getCrumb();

      // Generate job configuration XML
      const jobConfig = this.generateJobConfig(config);

      // Create job in folder: tenant_name/username - no fallbacks
      // If tenantName is missing, we'll use a default
      const tenant = this.tenantName || 'default';
      const folder = `${tenant}/${this.username}`;
      const folderPath = `job/${tenant}/job/${this.username}/job/${name}`;
      
      // Always create the job in the tenant_name/username folder
      const createUrl = `${this.baseUrl}job/${encodeURIComponent(tenant)}/job/${encodeURIComponent(this.username)}/createItem?name=${encodeURIComponent(name)}`;
      
      console.log(`[@service:jenkins:createJob] Creating job in folder: ${folder}`);
      
      console.log(`[@service:jenkins:createJob] Final URL: ${createUrl}`);

      // Create job with 30s timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        // Prepare headers with crumb if available
        const headers: Record<string, string> = {
          Authorization: this.authHeader,
          'Content-Type': 'application/xml',
        };

        if (this.crumb.crumbRequestField && this.crumb.crumb) {
          headers[this.crumb.crumbRequestField] = this.crumb.crumb;
        }

        // Log the request details
        console.log('[@service:jenkins:createJob] Sending request to Jenkins:', {
          url: createUrl,
          headers: {
            ...headers,
            Authorization: 'Basic ***** (redacted)', // Don't log actual auth
          },
          body: jobConfig,
        });
        
        // Add a very clear log of the exact URL being used
        console.log(`[@service:jenkins:createJob] FINAL URL FOR JOB CREATION: ${createUrl}`);

        const response = await fetch(createUrl, {
          method: 'POST',
          headers,
          body: jobConfig,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to create job: ${response.statusText}. Details: ${errorText}`);
        }

        // Generate token for this job
        const jobToken = this.generateAuthToken(name);

        return {
          success: true,
          data: {
            id: name,
            name,
            url: `${this.baseUrl}${folderPath}`,
            token: jobToken,
            folder_path: folderPath,
          },
        };
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error('Jenkins job creation timed out after 30 seconds');
        }
        throw error;
      }
    } catch (error: any) {
      console.error(`[@service:jenkins:createJob] Error:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Trigger an existing Jenkins job
   */
  async triggerJob(jobId: string, params?: Record<string, any>): Promise<CICDResponse> {
    try {
      console.log(`[@service:jenkins:triggerJob] Triggering job: ${jobId}`);

      // Generate authentication token for remote triggering
      const authToken = this.generateAuthToken(jobId);
      console.log(`[@service:jenkins:triggerJob] Using auth token: ${authToken}`);

      // Determine the base URL for triggering
      let triggerUrl: string;
      let jobPath: string;

      // Always use tenant_name/username folder structure - no fallbacks
      // If tenantName is missing, use a default
      const tenant = this.tenantName || 'default';
      jobPath = `job/${tenant}/job/${this.username}/job/${jobId}`;
      console.log(`[@service:jenkins:triggerJob] Using folder: ${tenant}/${this.username}`);

      if (params) {
        // Add the auth token to the parameters
        params = { ...params, token: authToken };
        triggerUrl = `${this.baseUrl}${jobPath}/buildWithParameters`;
        console.log(`[@service:jenkins:triggerJob] Triggering with parameters at: ${triggerUrl}`);
      } else {
        // For builds without parameters, include token in URL
        triggerUrl = `${this.baseUrl}${jobPath}/build?token=${authToken}`;
        console.log(
          `[@service:jenkins:triggerJob] Triggering without parameters at: ${triggerUrl}`,
        );
      }

      const response = await fetch(triggerUrl, {
        method: 'POST',
        headers: {
          Authorization: this.authHeader,
        },
        body: params ? new URLSearchParams(params) : undefined,
      });

      if (!response.ok) {
        throw new Error(`Failed to trigger job: ${response.statusText}`);
      }

      return {
        success: true,
        data: { message: `Job ${jobId} triggered successfully` },
      };
    } catch (error: any) {
      console.error(`[@service:jenkins:triggerJob] Error:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get Jenkins job status
   */
  async getJobStatus(jobId: string): Promise<CICDResponse> {
    try {
      console.log(`[@service:jenkins:getJobStatus] Getting status for job: ${jobId}`);

      const statusUrl = `${this.baseUrl}job/${jobId}/lastBuild/api/json`;

      const response = await fetch(statusUrl, {
        headers: {
          Authorization: this.authHeader,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: true,
            data: { status: 'not_found' },
          };
        }
        throw new Error(`Failed to get job status: ${response.statusText}`);
      }

      const buildInfo = await response.json();

      // Map Jenkins build result to our status
      let status = buildInfo.building ? 'running' : buildInfo.result?.toLowerCase() || 'unknown';

      return {
        success: true,
        data: {
          status,
          url: buildInfo.url,
          duration: buildInfo.duration,
        },
      };
    } catch (error: any) {
      console.error(`[@service:jenkins:getJobStatus] Error:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Delete a Jenkins job
   */
  async deleteJob(jobId: string): Promise<CICDResponse> {
    try {
      console.log(`[@service:jenkins:deleteJob] Deleting job: ${jobId}`);

      const deleteUrl = `${this.baseUrl}job/${jobId}/doDelete`;

      const response = await fetch(deleteUrl, {
        method: 'POST',
        headers: {
          Authorization: this.authHeader,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete job: ${response.statusText}`);
      }

      return {
        success: true,
        data: { message: `Job ${jobId} deleted successfully` },
      };
    } catch (error: any) {
      console.error(`[@service:jenkins:deleteJob] Error:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate a consistent authentication token for remote triggering
   */
  private generateAuthToken(jobName: string): string {
    // Use tenant name if available, otherwise use a default
    const prefix = this.tenantName || 'default';

    // Create a predictable but unique token
    // Format: tenant_jobname_token
    const token = `${prefix}_${jobName}_token`.replace(/[^a-zA-Z0-9_]/g, '_');

    console.log(`[@service:jenkins:generateAuthToken] Generated token: ${token}`);
    return token;
  }

  /**
   * Generate Jenkins job configuration XML
   */
  private generateJobConfig(config: CICDJobConfig): string {
    // Generate auth token for remote triggering
    const authToken = this.generateAuthToken(config.name);

    return `<?xml version="1.1" encoding="UTF-8"?>
<flow-definition plugin="workflow-job">
  <description>${config.description || ''}</description>
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition" plugin="workflow-cps">
    <script>${config.pipeline}</script>
    <sandbox>true</sandbox>
  </definition>
  <triggers>
    <hudson.triggers.RemoteTrigger>
      <token>${authToken}</token>
    </hudson.triggers.RemoteTrigger>
  </triggers>
</flow-definition>`;
  }
}
