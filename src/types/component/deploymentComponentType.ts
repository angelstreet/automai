/**
 * Core Deployment type definitions
 */
import { Host } from './hostComponentType';
import { Repository } from './repositoryComponentType';

/**
 * Deployment status types
 */
export type DeploymentStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';

/**
 * Log entry structure for deployment logs
 */
export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARNING' | 'ERROR';
  message: string;
}

/**
 * Host with deployment-specific information
 */
export interface DeploymentHost extends Omit<Host, 'status'> {
  status: 'pending' | 'deploying' | 'success' | 'failed';
}

// Re-export types from deployment/types.ts
export type {
  DeploymentScript,
  Deployment,
  DeploymentFormData,
  DeploymentData,
} from '@/app/[locale]/[tenant]/deployment/types';
