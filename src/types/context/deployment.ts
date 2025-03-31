import { AuthUser } from '../user';

/**
 * Deployment data interface - contains all state
 */
export interface DeploymentData {
  deployments: Deployment[];
  repositories: any[];
  loading: boolean;
  error: string | null;
  isRefreshing: boolean;
  currentUser: AuthUser | null;
}

/**
 * Deployment actions interface - contains all functions
 */
export interface DeploymentActions {
  // Core deployment actions
  fetchDeployments: (forceFresh?: boolean) => Promise<void>;
  fetchDeploymentById: (id: string) => Promise<Deployment | null>;
  createDeployment: (formData: DeploymentFormData) => Promise<{
    success: boolean;
    deploymentId?: string;
    error?: string;
  }>;
  abortDeployment: (id: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
  refreshDeployment: (id: string) => Promise<{
    success: boolean;
    deployment?: Deployment;
    error?: string;
  }>;
  deleteDeployment: (id: string) => Promise<{
    success: boolean;
    error?: string;
  }>;

  // Supporting data fetching
  fetchScriptsForRepository: (repositoryId: string) => Promise<any[]>;
  fetchAvailableHosts: () => Promise<any[]>;
  fetchRepositories: () => Promise<any[]>;
  fetchDeploymentStatus: (id: string) => Promise<{
    success: boolean;
    deployment?: any;
    cicd?: any;
    error?: string;
  }>;

  // User management
  refreshUserData: () => Promise<AuthUser | null>;
}

/**
 * Combined deployment context type
 */
export interface DeploymentContextType extends DeploymentData, DeploymentActions {}

/**
 * Cache keys for deployment data
 */
export const DEPLOYMENT_CACHE_KEYS = {
  DEPLOYMENTS: 'deployments',
  DEPLOYMENT_DETAILS: (id: string) => `deployment-${id}`,
  SCRIPTS: (repositoryId: string) => `scripts-${repositoryId}`,
  HOSTS: 'hosts',
  DEPLOYMENT_STATUS: (id: string) => `deployment-status-${id}`,
};

// Types for the deployment feature

export type DeploymentStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'aborted'
  | 'scheduled';

export interface ScriptParameter {
  id: string;
  name: string;
  description?: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  required: boolean;
  default?: string | number | boolean;
  options?: string[]; // For select type
}

export interface Script {
  id: string;
  name: string;
  path: string;
  repository?: string;
  description?: string;
  type?: 'python' | 'shell';
  parameters?: ScriptParameter[];
}

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

export interface Host {
  id: string;
  name: string;
  environment: string;
  status: string;
  ip?: string;
}

export interface DeploymentHost {
  id: string;
  name: string;
  environment: string;
  status: 'pending' | 'deploying' | 'success' | 'failed';
}

export interface Repository {
  id: string;
  name: string;
  owner: string;
}

export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
}

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

// CI/CD Provider and Job interfaces
export interface CICDProvider {
  id: string;
  name: string;
  type: string;
  url: string;
  tenant_id: string;
  auth_type: string;
  credentials?: Record<string, string>;
  created_at: string;
}

export interface CICDJob {
  id: string;
  provider_id: string;
  name: string;
  description?: string;
  parameters?: Array<{
    name: string;
    type: string;
    description?: string;
    default?: any;
    required: boolean;
    choices?: string[];
  }>;
  tenant_id: string;
  created_at: string;
}

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

// Add to deployment data
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
