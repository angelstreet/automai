import { AuthUser } from '@/types/user';
import { Deployment, DeploymentFormData } from '@/app/[locale]/[tenant]/deployment/types';

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
  fetchDeployments: () => Promise<void>;
  fetchDeploymentById: (id: string) => Promise<Deployment | null>;
  createDeployment: (formData: DeploymentFormData) => Promise<{ 
    success: boolean; 
    deploymentId?: string; 
    error?: string 
  }>;
  abortDeployment: (id: string) => Promise<{ 
    success: boolean; 
    error?: string 
  }>;
  refreshDeployment: (id: string) => Promise<{ 
    success: boolean; 
    deployment?: Deployment; 
    error?: string 
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
  DEPLOYMENT_STATUS: (id: string) => `deployment-status-${id}`
}; 