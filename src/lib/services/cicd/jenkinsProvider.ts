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

  constructor(config: CICDProviderConfig) {
    console.log(`[@service:jenkins:constructor] Initializing Jenkins provider: ${config.name}`);

    // Setup base URL with port if provided
    this.baseUrl = config.port ? `${config.url}:${config.port}` : config.url;
    this.baseUrl = this.baseUrl.endsWith('/') ? this.baseUrl : `${this.baseUrl}/`;
    this.tenantName = config.tenant_name;

    // Setup authentication
    if (config.auth_type === 'token') {
      // For token auth, use username:token format
      const authString = `${config.credentials.username}:${config.credentials.token}`;
      console.log(
        `[@service:jenkins:constructor] Using token auth with username: ${config.credentials.username}`,
      );
      this.authHeader = `Basic ${Buffer.from(authString).toString('base64')}`;
    } else {
      // For basic auth, use username:password format
      const { username, password } = config.credentials;
      const authString = `${username}:${password}`;
      console.log(`[@service:jenkins:constructor] Using basic auth with username: ${username}`);
      this.authHeader = `Basic ${Buffer.from(authString).toString('base64')}`;
    }

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

      // Use tenant_name from config for folder structure if available
      const folderPath = this.tenantName ? `job/${this.tenantName}/job/${name}` : `job/${name}`;
      const createUrl = `${this.baseUrl}createItem?name=${encodeURIComponent(name)}`;

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

        return {
          success: true,
          data: {
            id: name,
            name,
            url: `${this.baseUrl}${folderPath}`,
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

      const triggerUrl = params
        ? `${this.baseUrl}job/${jobId}/buildWithParameters`
        : `${this.baseUrl}job/${jobId}/build`;

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
   * Generate Jenkins job configuration XML
   */
  private generateJobConfig(config: CICDJobConfig): string {
    return `<?xml version="1.1" encoding="UTF-8"?>
<flow-definition plugin="workflow-job">
  <description>${config.description || ''}</description>
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition" plugin="workflow-cps">
    <script>${config.pipeline}</script>
    <sandbox>true</sandbox>
  </definition>
</flow-definition>`;
  }
}
