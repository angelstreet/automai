/**
 * Core CICD provider configuration
 */
export interface CICDProviderConfig {
  id: string;
  type: 'jenkins' | 'github' | 'gitlab' | 'circleci';
  name: string;
  url: string;
  port?: number;
  auth_type: 'token' | 'basic';
  credentials: {
    token?: string;
    username?: string;
    password?: string;
  };
}

/**
 * Response structure for CICD operations
 */
export interface CICDResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Core CICD provider interface
 */
export interface CICDProvider {
  /**
   * Create a new job in the CI/CD system
   */
  createJob(
    name: string,
    config: CICDJobConfig,
    folder?: string,
    options?: Record<string, any>,
  ): Promise<CICDResponse>;

  /**
   * Trigger an existing job
   */
  triggerJob(jobId: string, params?: Record<string, any>): Promise<CICDResponse>;

  /**
   * Get the status of a job
   */
  getJobStatus(jobId: string): Promise<CICDResponse>;
}

/**
 * Configuration for creating a new job
 */
export interface CICDJobConfig {
  name: string;
  description?: string;
  pipeline: string;
  parameters?: Array<{
    name: string;
    type: 'string' | 'boolean' | 'choice';
    description?: string;
    defaultValue?: string;
    choices?: string[];
  }>;
  triggers?: {
    type: 'webhook' | 'cron';
    token?: string;
    schedule?: string;
  };
}
