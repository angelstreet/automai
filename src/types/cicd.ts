/**
 * CI/CD Providers types
 */

export type CICDProviderType = 'jenkins' | 'github' | 'gitlab' | 'azure_devops';

export type CICDAuthType = 'token' | 'basic_auth' | 'oauth';

export interface CICDCredentials {
  username?: string;
  password?: string;
  token?: string;
}

export interface CICDProviderConfig {
  auth_type: CICDAuthType;
  credentials: CICDCredentials;
}

export interface CICDProvider {
  id: string;
  tenant_id: string;
  name: string;
  type: CICDProviderType;
  url: string;
  config: CICDProviderConfig;
  status?: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface CICDProviderPayload {
  id?: string;
  name: string;
  type: CICDProviderType;
  url: string;
  config: {
    auth_type: CICDAuthType;
    credentials: CICDCredentials;
  };
}

/**
 * Results from server actions
 */
export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CICDProviderListResult extends ActionResult {
  data: CICDProvider[];
}

export interface CICDProviderActionResult extends ActionResult {
  data?: CICDProvider;
}

/**
 * Job types
 */
export interface CICDJob {
  id: string;
  name: string;
  provider_id: string;
  job_path: string;
  parameters?: Record<string, any>;
}

export interface CICDBuild {
  id: string;
  job_id: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  start_time: string;
  end_time?: string;
  logs?: string;
} 