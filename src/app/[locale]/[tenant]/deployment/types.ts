// Types for the deployment feature

export type DeploymentStatus = 
  | 'pending'
  | 'in_progress'
  | 'success'
  | 'failed'
  | 'cancelled'
  | 'scheduled';

export interface Script {
  id: string;
  name: string;
  path: string;
  repository: string;
}

export interface DeploymentScript extends Script {
  status: 'pending' | 'in_progress' | 'success' | 'failed';
  startTime?: string;
  endTime?: string;
  output?: string;
}

export interface Host {
  id: string;
  name: string;
  environment: string;
  status: string;
  ip?: string;
}

export interface DeploymentHost extends Host {
  status: 'pending' | 'running' | 'success' | 'failed';
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
  repository: Repository;
  status: DeploymentStatus;
  createdBy: string;
  startTime?: string;
  endTime?: string;
  scheduledTime?: string;
  scripts: DeploymentScript[];
  hosts: DeploymentHost[];
  logs: LogEntry[];
}

export interface DeploymentFormData {
  name: string;
  description: string;
  repository: string;
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