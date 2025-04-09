/**
 * Core Deployment type definitions
 * Contains all deployment-related data models
 */

import { Host } from './host-types';
import { Repository } from './repository-types';

/**
 * Deployment status types
 */
export type DeploymentStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';

/**
 * Log entry structure for deployment logs
 */
export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
}

/**
 * Host with deployment-specific information
 */
export interface DeploymentHost extends Omit<Host, 'status'> {
  status: 'pending' | 'deploying' | 'success' | 'failed';
}

/**
 * Deployment script definition
 */
export interface DeploymentScript {
  id: string;
  name: string;
  path: string;
  repository_id: string;
  language: string;
  content?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Core deployment entity
 */
export interface Deployment {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  status: DeploymentStatus;
  repository_id: string;
  host_id: string;
  script_id: string;
  logs?: LogEntry[];
  parameters?: Record<string, string>;
  started_at?: string;
  completed_at?: string;
  created_by?: string;
}

/**
 * Deployment configuration
 */
export interface DeploymentConfig {
  pre_deployment_steps?: string[];
  post_deployment_steps?: string[];
  timeout_seconds?: number;
  retry_count?: number;
  environment_variables?: Record<string, string>;
  notifications?: {
    on_success?: boolean;
    on_failure?: boolean;
    emails?: string[];
  };
}

/**
 * Complete deployment data with related entities
 */
export interface DeploymentData {
  deployment: Deployment;
  repository: Repository;
  host: Host;
  script: DeploymentScript;
  config?: DeploymentConfig;
  name: string;
  description?: string;
  repositoryId: string;
  selectedRepository?: Repository & { url?: string };
  branch?: string;
  schedule: 'now' | 'later';
  scheduledTime?: string;
  scriptIds: string[];
  scriptParameters: Record<string, Record<string, string>>;
  hostIds: string[];
  cronExpression?: string;
  repeatCount?: number;
  environmentVars: Array<{ key: string; value: string }>;
  notifications: {
    email: boolean;
    slack: boolean;
  };
  autoStart: boolean;
  cicd_provider_id: string;
  jenkinsConfig?: any;
}

/**
 * Form data for CICD deployment creation
 */
export interface CICDDeploymentFormData {
  name: string;
  description?: string;
  repository_id: string;
  host_id: string;
  script_id: string;
  parameters?: Record<string, string>;
  team_id: string;
  creator_id: string;
  cicd_provider_id: string;
  provider: {
    type: string;
    config: {
      url: string;
      username?: string;
      token: string;
      tenant_name?: string;
    };
  };
  configuration: {
    name: string;
    description?: string;
    branch: string;
    scriptIds: string[];
    parameters: string[];
    hostIds: string[];
    environmentVars?: Record<string, string>;
    schedule?: {
      enabled: boolean;
      cronExpression?: string;
      repeatCount?: number;
    };
    notifications?: {
      enabled: boolean;
      onSuccess?: boolean;
      onFailure?: boolean;
      emails?: string[];
    };
  };
  autoStart: boolean;
}
