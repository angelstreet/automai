// Types for the deployment feature

export type DeploymentStatus = 
  | 'pending'
  | 'scheduled'
  | 'in_progress'
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'partial_success';

export interface Script {
  id: string;
  name: string;
  path: string;
  repository: string;
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
  createdBy: string;
  createdAt: string;
  scheduledFor?: string;
  startedAt?: string;
  completedAt?: string;
  scripts: DeploymentScript[];
  hosts: DeploymentHost[];
  configuration: DeploymentConfig;
  logs?: LogEntry[];
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

export interface DeploymentFormData {
  name: string;
  description: string;
  repositoryId: string;
  selectedScripts: string[];
  selectedHosts: string[];
  schedule: 'now' | 'later';
  scheduledTime: string;
  environmentVars: Array<{key: string, value: string}>;
  notifications: {
    email: boolean;
    slack: boolean;
  };
}

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
  parameters?: ScriptParameter[];
}

// Add to deployment data
export interface DeploymentData {
  id?: string;
  name: string;
  description: string;
  repositoryId: string;
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
    jobName?: string;
    jenkinsUrl?: string;
    credentials?: string;
    customParameters?: Record<string, string>;
  };
}