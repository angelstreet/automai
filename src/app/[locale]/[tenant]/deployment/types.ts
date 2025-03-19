// Types for the deployment feature

export type DeploymentStatus = 
  | 'pending'
  | 'scheduled'
  | 'in_progress'
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'partial_success';

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
  repositoryId: string;
  status: DeploymentStatus;
  userId: string;
  tenantId: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  scheduledTime?: string;
  scheduleType: string;
  cronExpression?: string;
  repeatCount?: number;
  scriptsPath: string[];
  scriptsParameters: string[];
  hostIds: string[];
  environmentVars?: any[];
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
  url?: string;
  created_at: string;
}

export interface DeploymentFormData {
  name: string;
  description: string;
  repository: string;  // Changed from repositoryId to match the current implementation
  selectedScripts: string[];
  selectedHosts: string[];
  schedule: 'now' | 'later';
  scheduledTime: string;
  cronExpression?: string;
  repeatCount?: number;
  environmentVars: Array<{key: string, value: string}>;
  parameters?: Record<string, any>;
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
  // Maps script IDs to their file paths for better script resolution
  scriptMapping?: Record<string, {
    path: string;
    name: string;
    type: string;
  }>;
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
  environmentVars: Array<{key: string, value: string}>;
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
}