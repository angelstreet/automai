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
  config?: Record<string, any>;
  report_url?: string | null;
  is_active: boolean;
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
  repositoryId?: string;
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
  provider_id?: string;
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
}
