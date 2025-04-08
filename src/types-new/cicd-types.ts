/**
 * Core CICD type definitions
 * Contains all CICD-related data models
 */

/**
 * CICD provider type
 */
export type CICDProviderType = 'jenkins' | 'github' | 'gitlab' | 'azure' | 'custom';

/**
 * CICD authentication type
 */
export type CICDAuthType = 'token' | 'basic_auth' | 'oauth';

/**
 * CICD credentials
 */
export interface CICDCredentials {
  username?: string;
  password?: string;
  token?: string;
  client_id?: string;
  client_secret?: string;
}

/**
 * CICD job parameter
 */
export interface CICDJobParameter {
  name: string;
  type: 'string' | 'boolean' | 'number' | 'choice';
  description?: string;
  default?: string | boolean | number;
  required: boolean;
  choices?: string[]; // For choice parameters
}

/**
 * CICD Job definition
 */
export interface CICDJob {
  id: string;
  name: string;
  url?: string;
  description?: string;
  parameters?: CICDJobParameter[];
  provider_id: string;
  created_at: string;
  updated_at: string;
}

/**
 * CICD build status
 */
export type CICDBuildStatus = 'pending' | 'running' | 'success' | 'failure' | 'cancelled' | 'unknown';

/**
 * CICD build definition
 */
export interface CICDBuild {
  id: string;
  job_id: string;
  url?: string;
  status: CICDBuildStatus;
  created_at: string;
  updated_at: string;
  logs?: string;
  duration?: number;
  triggered_by?: string;
}

/**
 * CICD provider configuration
 */
export interface CICDProviderConfig {
  id: string;
  url: string;
  auth_type: CICDAuthType;
  credentials: CICDCredentials;
  type: CICDProviderType;
  name: string;
}

/**
 * CICD provider entity
 */
export interface CICDProvider {
  id: string;
  name: string;
  type: CICDProviderType;
  url: string;
  auth_type: CICDAuthType;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  team_id?: string;
}

/**
 * CICD provider creation payload
 */
export interface CICDProviderPayload {
  name: string;
  type: CICDProviderType;
  url: string;
  auth_type: CICDAuthType;
  credentials: CICDCredentials;
  team_id?: string;
}

/**
 * CICD pipeline configuration
 */
export interface CICDPipelineConfig {
  name: string;
  description?: string;
  repository: {
    id: string;
    name?: string;
    url?: string;
  };
  stages: CICDStage[];
  parameters?: CICDParameter[];
  triggers?: CICDTrigger[];
}

/**
 * CICD stage
 */
export interface CICDStage {
  name: string;
  steps: CICDStep[];
}

/**
 * CICD step
 */
export interface CICDStep {
  type: string;
  command?: string;
  script?: string;
  parameters?: Record<string, any>;
}

/**
 * CICD parameter
 */
export interface CICDParameter {
  name: string;
  type: 'string' | 'text' | 'boolean' | 'choice';
  description?: string;
  defaultValue?: any;
  choices?: string[];
}

/**
 * CICD trigger
 */
export interface CICDTrigger {
  type: 'webhook' | 'schedule' | 'manual';
  config?: Record<string, any>;
}
