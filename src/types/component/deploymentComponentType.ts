/**
 * Core Deployment type definitions
 */
import { Host } from './hostComponentType';
import { Repository } from './repositoryComponentType';

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
 * Deployment script information
 */
export interface DeploymentScript {
  id: string;
  repositoryId: string;
  name: string;
  path: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  startedAt?: string;
  completedAt?: string;
  logs?: string[];
}

/**
 * Host with deployment-specific information
 */
export interface DeploymentHost extends Omit<Host, 'status'> {
  status: 'pending' | 'deploying' | 'success' | 'failed';
}

/**
 * Primary Deployment interface
 */
export interface Deployment {
  id: string;
  name: string;
  description?: string;
  repositoryId?: string;
  scriptsPath?: string[];
  scriptsParameters?: string[];
  hostIds?: string[];
  status: DeploymentStatus;
  scheduleType?: 'now' | 'later' | 'cron';
  scheduledTime?: string | null;
  cronExpression?: string | null;
  repeatCount?: number;
  environmentVars?: { name: string; value: string }[];
  tenantId: string;
  userId: string;
  team_id?: string;
  creator_id?: string;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
}

/**
 * Deployment form data used when creating or updating deployments
 */
export interface DeploymentFormData {
  name: string;
  description?: string;
  repository?: string;
  repositoryId?: string;
  tenant_id?: string;
  provider_id?: string;
  selectedScripts?: string[];
  selectedHosts?: string[];
  schedule?: 'now' | 'later' | 'cron';
  schedule_type?: 'now' | 'later' | 'cron';
  scheduledTime?: string;
  cronExpression?: string;
  repeatCount?: number;
  environmentVars?: Array<{ key: string; value: string }>;
  parameters?: Array<{ script_path: string; raw: string }>;
  notifications?: {
    email: boolean;
    slack: boolean;
  };
  cicd_provider_id?: string;
  cicdProviderId?: string;
  targetHostId?: string;
  branch?: string;
  scheduled?: boolean;
  autoStart?: boolean;
  configuration?: {
    scriptIds?: string[];
    hostIds?: string[];
    schedule?: 'now' | 'later' | 'cron';
    scheduledTime?: string;
    cronExpression?: string;
    repeatCount?: number;
    environmentVars?: any[];
    parameters?: Record<string, any>;
    notifications?: {
      email: boolean;
      slack: boolean;
    };
    scriptMapping?: Record<string, { path: string; name: string; type: string }>;
  };
  scriptMapping?: Record<string, { path: string; name: string; type: string }>;
}

/**
 * Deployment configuration
 */
export interface DeploymentConfig {
  schedule: 'immediate' | 'scheduled';
  scheduledTime?: string;
  environmentVariables: Record<string, string>;
  notifications: {
    email: boolean;
    slack: boolean;
  };
  runnerType: 'jenkins' | 'direct' | 'docker';
  runnerId?: string;
}

/**
 * Full deployment data
 */
export interface DeploymentData {
  id?: string;
  name: string;
  description: string;
  repositoryId: string;
  selectedRepository?: Repository | null;
  branch: string;
  schedule: 'now' | 'later';
  scheduledTime: string;
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
  jenkinsConfig?: {
    enabled: boolean;
    provider_id?: string;
    jobId?: string;
    parameters?: Record<string, any>;
  };
  autoStart?: boolean;
  cicd_provider_id?: string;
}
