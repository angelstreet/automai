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

    // Check if port is specified directly or in the config object
    const port = (config as any).port || (config as any).config?.port;

    if (port && !baseUrl.includes(':')) {
      console.log(`[@service:jenkins:initialize] Adding port ${port} to URL`);
      try {
        const urlObj = new URL(baseUrl);
        // Only add port if it's not the default port for the protocol
        if (
          (urlObj.protocol === 'http:' && port !== 80) ||
          (urlObj.protocol === 'https:' && port !== 443)
        ) {
          urlObj.port = port.toString();
          baseUrl = urlObj.toString();
        }
      } catch (error: any) {
        console.error(
          `[@service:jenkins:initialize] Invalid URL format: ${baseUrl}, error: ${error.message}`,
        );
      }
    }

    // Log the URL we're using
    console.log(`[@service:jenkins:initialize] Using Jenkins URL: ${baseUrl}`);

    // Ensure URL ends with a slash
    this.baseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;

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

      url += 'createItem?name=' + encodeURIComponent(jobName);

      // Create a Jenkins pipeline job config XML
      const jobConfigXml = this.createPipelineJobConfig(pipelineConfig);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/xml',
        },
        body: jobConfigXml,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `[@service:jenkins:createJob] Error response: ${response.status} - ${errorText}`,
        );
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
