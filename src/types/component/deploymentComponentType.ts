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

/**
 * Complete deployment data with related entities
 */
export interface DeploymentData {
  name: string;
  description?: string;
  repositoryId: string;
  selectedRepository?: Repository & { url?: string };
  branch?: string;
  schedule: 'now' | 'later';
  scheduledTime?: string;
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
  autoStart: boolean;
  jenkinsConfig?: any;
}

// Re-export types from deployment/types.ts
export type {
  DeploymentScript,
  Deployment,
  DeploymentFormData,
} from '@/app/[locale]/[tenant]/deployment/types';
