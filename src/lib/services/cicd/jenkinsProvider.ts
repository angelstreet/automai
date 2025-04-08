import {
  CICDProvider,
  CICDProviderConfig,
  CICDResponse,
  CICDJobConfig,
} from '@/types-new/cicd-provider';

export class JenkinsProvider implements CICDProvider {
  private baseUrl: string;
  private authHeader: string;

  constructor(config: CICDProviderConfig) {
    console.log(`[@service:jenkins:constructor] Initializing Jenkins provider: ${config.name}`);

    // Setup base URL with port if provided
    this.baseUrl = config.port ? `${config.url}:${config.port}` : config.url;
    this.baseUrl = this.baseUrl.endsWith('/') ? this.baseUrl : `${this.baseUrl}/`;

    // Setup authentication
    if (config.auth_type === 'token') {
      this.authHeader = `Bearer ${config.credentials.token}`;
    } else {
      const { username, password } = config.credentials;
      const base64Credentials = Buffer.from(`${username}:${password}`).toString('base64');
      this.authHeader = `Basic ${base64Credentials}`;
    }
  }

  /**
   * Create a new Jenkins pipeline job
   */
  async createJob(name: string, config: CICDJobConfig, folder?: string): Promise<CICDResponse> {
    try {
      console.log(`[@service:jenkins:createJob] Creating job: ${name}`);

      // Generate job configuration XML
      const jobConfig = this.generateJobConfig(config);

      // Construct job URL with folder support
      const jobPath = folder ? `job/${folder}/job/${name}` : `job/${name}`;
      const createUrl = `${this.baseUrl}createItem?name=${encodeURIComponent(name)}`;

      // Create job with 30s timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout

      try {
        const response = await fetch(createUrl, {
          method: 'POST',
          headers: {
            Authorization: this.authHeader,
            'Content-Type': 'application/xml',
          },
          body: jobConfig,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`Failed to create job: ${response.statusText}`);
        }

        return {
          success: true,
          data: {
            id: name,
            name,
            url: `${this.baseUrl}${jobPath}`,
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
