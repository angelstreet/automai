/**
 * Re-exports of Deployment types from the core module
 * This file maintains backward compatibility during the migration
 */

export { Host } from '@/types/core/host';

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
} from '@/types/core/deployment';

// CI/CD Provider types specific to the deployment context
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
