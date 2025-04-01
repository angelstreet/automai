/**
 * Core Deployment type definitions
 */
import { Host } from './host';
import { Repository } from './repository';

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
  tenant_id: string;
  provider_id?: string;
  selectedScripts?: string[];
  selectedHosts?: string[];
  parameters?: { script_path: string; raw: string }[];
  schedule?: string;
  scheduledTime?: string;
  cronExpression?: string;
  repeatCount?: number;
  environmentVars?: { name: string; value: string }[];
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
    providerId?: string;
    jobId?: string;
    parameters?: Record<string, any>;
  };
  autoStart?: boolean;
  cicdProviderId?: string;
}
