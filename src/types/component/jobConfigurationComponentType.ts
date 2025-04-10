/**
 * Type definitions for Job Configurations
 */

export interface JobConfiguration {
  id: string;
  name: string;
  description: string | null;
  team_id: string;
  user_id: string;

  // Repository information
  repository_id: string | null;
  repository_url: string | null;
  branch: string | null;

  // Scripts and hosts
  scripts: string[];
  scripts_parameters: string[] | Record<string, any>[];
  hosts: string[];

  // Environment variables
  environment_vars: Record<string, string>;

  // Schedule
  schedule_enabled: boolean;
  cron_expression: string | null;
  repeat_count: number | null;

  // Notifications
  notifications_enabled: boolean;
  notification_on_success: boolean;
  notification_on_failure: boolean;

  // Job type (e.g., 'deployment', 'test', 'backup', etc.)
  job_type: string;

  // Additional configuration (JSON)
  config: Record<string, any>;

  // Timestamps
  created_at: string;
  updated_at?: string;
}

// Type for job run status
export enum JobRunStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// Type for job runs
export interface JobRun {
  id: string;
  config_id: string;
  user_id: string;
  status: JobRunStatus;
  results: Record<string, any> | null;
  logs: string[] | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  error?: string | null;
}
