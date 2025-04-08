/**
 * CICD Job status
 */
export type CICDJobStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';

/**
 * CICD Job database model
 */
export interface CICDJob {
  id: string;
  name: string;
  provider_id: string;
  external_id: string;
  trigger_token: string;
  trigger_url: string;
  job_url: string;
  status: CICDJobStatus;
  created_at: string;
  updated_at: string;
}

/**
 * CICD Job creation parameters
 */
export interface CreateCICDJobParams {
  name: string;
  provider_id: string;
  description?: string;
  repository: {
    url: string;
    branch: string;
  };
  scripts: Array<{
    path: string;
    type: 'shell' | 'python';
    parameters?: string[];
  }>;
  hosts: Array<{
    name: string;
    ip: string;
    username: string;
    environment?: string;
  }>;
}
