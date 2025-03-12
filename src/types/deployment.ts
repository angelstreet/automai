// Deployment types
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
  }
  
  export type DeploymentStatus = 
    | 'pending'
    | 'scheduled'
    | 'in_progress'
    | 'success'
    | 'failed'
    | 'cancelled'
    | 'partial_success';
  
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
  
  export interface DeploymentHost {
    id: string;
    name: string;
    environment: string;
    status: 'pending' | 'deploying' | 'success' | 'failed';
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
  
  // Form related types
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