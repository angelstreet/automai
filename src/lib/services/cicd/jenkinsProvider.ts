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
    this.baseUrl = config.url.endsWith('/') ? config.url : `${config.url}/`;

    // Set up authentication with better error handling
    if (!config.auth_type) {
      console.warn(`[@service:jenkins:initialize] No auth_type provided, defaulting to 'token'`);
      config.auth_type = 'token';
    }

    try {
      if (config.auth_type === 'token') {
        const token = config.credentials?.token || '';
        console.log(
          `[@service:jenkins:initialize] Using token authentication. Token exists: ${Boolean(token)}`,
        );
        this.authHeader = `Bearer ${token}`;
      } else if (config.auth_type === 'basic_auth') {
        const username = config.credentials?.username || '';
        const password = config.credentials?.password || '';
        console.log(
          `[@service:jenkins:initialize] Using basic auth. Username exists: ${Boolean(username)}, Password exists: ${Boolean(password)}`,
        );
        this.authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
      } else {
        console.error(
          `[@service:jenkins:initialize] Unsupported authentication type: ${config.auth_type}`,
        );
        throw new Error(`Unsupported authentication type: ${config.auth_type}`);
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
    jobName: string,
    pipelineConfig: CICDPipelineConfig,
    folderPath?: string,
  ): Promise<CICDResponse<string>> {
    try {
      console.log(`[@service:jenkins:createJob] Creating new job: ${jobName}`);

      // Determine the URL (with folder support)
      let url = this.baseUrl;
      if (folderPath) {
        url += `job/${encodeURIComponent(folderPath)}/`;
      }
      url += `createItem?name=${encodeURIComponent(jobName)}`;

      // Generate a Jenkins pipeline script from the pipelineConfig
      const pipelineScript = this.generatePipelineFromConfig(pipelineConfig);

      // Create job XML definition for Jenkins pipeline
      const jobXml = `<?xml version='1.1' encoding='UTF-8'?>
<flow-definition plugin="workflow-job">
  <description>${pipelineConfig.description || ''}</description>
  <keepDependencies>false</keepDependencies>
  <definition class="org.jenkinsci.plugins.workflow.cps.CpsFlowDefinition" plugin="workflow-cps">
    <script>${pipelineScript}</script>
    <sandbox>true</sandbox>
  </definition>
  <disabled>false</disabled>
</flow-definition>`;

      // Make the API request to create the job
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/xml',
        },
        body: jobXml,
      });

      if (!response.ok) {
        console.error(
          `[@service:jenkins:createJob] Failed to create job ${jobName}: ${response.status} ${response.statusText}`,
        );
        return {
          success: false,
          error: `Failed to create Jenkins job: ${response.status} ${response.statusText}`,
        };
      }

      // Get the job URL for confirmation
      const jobUrl = `${this.baseUrl}job/${encodeURIComponent(jobName)}/`;
      console.log(`[@service:jenkins:createJob] Job ${jobName} created successfully at ${jobUrl}`);

      return {
        success: true,
        data: jobName,
      };
    } catch (error: any) {
      console.error(`[@service:jenkins:createJob] Error creating job ${jobName}:`, error);
      return {
        success: false,
        error: error.message || `Failed to create Jenkins job ${jobName}`,
      };
    }
  }

  /**
   * Generate a Jenkins pipeline script from CICDPipelineConfig
   */
  private generatePipelineFromConfig(pipelineConfig: CICDPipelineConfig): string {
    const { repository, stages, parameters } = pipelineConfig;
    // Unused variables are prefixed with underscore
    const _name = pipelineConfig.name;
    const _description = pipelineConfig.description;
    const _triggers = pipelineConfig.triggers;

    // Start building the pipeline script
    let pipeline = `pipeline {
  agent any
  
  parameters {
    string(name: 'REPOSITORY_ID', defaultValue: '${repository.id}', description: 'Repository ID')`;

    // Add any additional parameters
    if (parameters && parameters.length > 0) {
      for (const param of parameters) {
        pipeline += `
    string(name: '${param.name}', defaultValue: '${param.defaultValue || ''}', description: '${param.description || ''}')`;
      }
    }

    pipeline += `
  }
  
  stages {`;

    // Add stages
    for (const stage of stages) {
      pipeline += `
    stage('${stage.name}') {
      steps {
        script {`;

      // Add steps for each stage
      for (const step of stage.steps) {
        if (step.type === 'shell' || step.type === 'bash') {
          pipeline += `
          sh '''${step.command}'''`;
        } else if (step.type === 'powershell' || step.type === 'pwsh') {
          pipeline += `
          powershell '''${step.command}'''`;
        } else {
          // Default to shell command
          pipeline += `
          sh '${step.command}'`;
        }
      }

      pipeline += `
        }
      }
    }`;
    }

    // Close the stages and pipeline sections
    pipeline += `
  }
  
  post {
    success {
      echo 'Deployment successful'
    }
    failure {
      echo 'Deployment failed'
    }
  }
}`;

    return pipeline;
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
