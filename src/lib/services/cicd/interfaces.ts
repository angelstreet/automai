/**
 * Common interfaces for CI/CD providers
 */

// Response type for all CI/CD service methods
export interface CICDResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

// CI/CD job definition
export interface CICDJob {
  id: string;
  name: string;
  url?: string;
  description?: string;
  parameters?: CICDJobParameter[];
}

// CI/CD job parameter
export interface CICDJobParameter {
  name: string;
  type: 'string' | 'boolean' | 'number' | 'choice';
  description?: string;
  default?: string | boolean | number;
  required: boolean;
  choices?: string[]; // For choice parameters
}

// CI/CD build definition
export interface CICDBuild {
  id: string;
  job_id: string;
  url?: string;
  status: 'pending' | 'running' | 'success' | 'failure' | 'unknown';
  created_at: string;
  updated_at: string;
}

// CI/CD provider configuration
export interface CICDProviderConfig {
  id: string;
  url: string;
  auth_type: 'token' | 'basic_auth' | 'oauth';
  credentials: Record<string, string>;
  type: string;
  name: string;
}

// CI/CD provider interface that all providers must implement
export interface CICDProvider {
  // Initialize the provider with configuration
  initialize(config: CICDProviderConfig): void;

  // Test connection to the provider
  testConnection(): Promise<CICDResponse<boolean>>;

  // Get available jobs
  getAvailableJobs(): Promise<CICDResponse<CICDJob[]>>;

  // Get job details
  getJobDetails(jobId: string): Promise<CICDResponse<CICDJob>>;

  // Trigger a build for a job
  triggerJob(jobId: string, parameters?: Record<string, any>): Promise<CICDResponse<CICDBuild>>;

  // Get build status
  getBuildStatus(jobId: string, buildId: string): Promise<CICDResponse<CICDBuild>>;

  // Get build logs
  getBuildLogs(jobId: string, buildId: string): Promise<CICDResponse<string>>;

  // Create a new job
  createJob(
    jobName: string,
    pipelineConfig: CICDPipelineConfig,
    folderPath?: string,
  ): Promise<CICDResponse<string>>;

  // Delete a job
  deleteJob(jobId: string, folderPath?: string): Promise<CICDResponse<boolean>>;
}

/**
 * Generic CI/CD Pipeline Configuration
 */
export interface CICDPipelineConfig {
  name: string;
  description?: string;
  repository: {
    id: string;
    // Add other repository-specific fields as needed
  };
  stages: CICDStage[];
  parameters?: CICDParameter[];
  triggers?: CICDTrigger[];
}

export interface CICDStage {
  name: string;
  steps: CICDStep[];
}

export interface CICDStep {
  type: string;
  command?: string;
  script?: string;
  parameters?: Record<string, any>;
}

export interface CICDParameter {
  name: string;
  type: 'string' | 'text' | 'boolean' | 'choice';
  description?: string;
  defaultValue?: any;
  choices?: string[];
}

export interface CICDTrigger {
  type: 'webhook' | 'schedule' | 'manual';
  config?: Record<string, any>;
}
