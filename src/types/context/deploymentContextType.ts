/**
 * Deployment context types
 */

// Import component types
import {
  DeploymentStatus,
  LogEntry,
  DeploymentScript,
  DeploymentHost,
  Deployment,
  DeploymentFormData,
  DeploymentConfig,
  DeploymentData,
} from '@/types/component/deploymentComponentType';
import { Host } from '@/types/component/hostComponentType';

// Import CICD types

// Re-export core types for convenience
export type {
  DeploymentStatus,
  LogEntry,
  DeploymentScript,
  DeploymentHost,
  Deployment,
  DeploymentFormData,
  DeploymentConfig,
  DeploymentData,
  Host,
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
  repositories: any[]; // Using any to avoid import errors
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
