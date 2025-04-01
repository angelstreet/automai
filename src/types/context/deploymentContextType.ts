/**
 * Deployment context types
 */

// Import component types
import { Host } from '@/types/component/hostComponentType';
import {
  DeploymentStatus,
  Repository,
  LogEntry,
  DeploymentScript,
  DeploymentHost,
  Deployment,
  DeploymentFormData,
  DeploymentConfig,
  DeploymentData,
} from '@/types/component/deploymentComponentType';

// Import CICD types
import { CICDProvider, CICDJob } from '@/types/component/cicdComponentType';

// Re-export core types for convenience
export {
  DeploymentStatus,
  Repository,
  LogEntry,
  DeploymentScript,
  DeploymentHost,
  Deployment,
  DeploymentFormData,
  DeploymentConfig,
  DeploymentData,
  Host
};

/**
 * Deployment context data interface
 */
export interface DeploymentContextData {
  deployments: Deployment[];
  loading: boolean;
  error: Error | null;
  selectedDeployment: Deployment | null;
  hosts: Host[];
  repositories: Repository[];
  cicdProviders: CICDProvider[];
  cicdJobs: CICDJob[];
}

/**
 * Deployment context actions interface
 */
export interface DeploymentContextActions {
  createDeployment: (data: DeploymentFormData) => Promise<Deployment | null>;
  updateDeployment: (id: string, data: Partial<DeploymentFormData>) => Promise<Deployment | null>;
  deleteDeployment: (id: string) => Promise<boolean>;
  selectDeployment: (id: string) => void;
  refreshDeployments: () => Promise<Deployment[]>;
  startDeployment: (id: string) => Promise<boolean>;
  stopDeployment: (id: string) => Promise<boolean>;
  getDeploymentLogs: (id: string) => Promise<LogEntry[]>;
}

/**
 * Complete deployment context type
 */
export interface DeploymentContextType extends DeploymentContextData, DeploymentContextActions {}
