/**
 * Type definitions for Job Configurations
 */

export interface JobConfiguration {
  id: string;
  name: string;
  description: string | null;
  team_id: string;
  creator_id: string;
  tenant_id: string;

  // Repository information
  repository_id: string | null;
  branch: string | null;

  // Scripts and hosts
  scripts_path: string[];
  scripts_parameters: string[] | Record<string, any>[];
  host_ids: string[];

  // Environment variables
  environment_vars: Record<string, string>;

  // Schedule
  schedule_type?: string | null;
  cron_expression: string | null;
  repeat_count: number | null;

  // Status field from database
  is_active: boolean;

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
  team_id: string;
  tenant_id: string;
  status: JobRunStatus;
  output: Record<string, any> | null;
  logs: Record<string, any> | null;
  error?: string | null;
  report_url?: string | null;
  created_at: string;
  updated_at?: string;
  queued_at?: string;
  started_at?: string;
  completed_at?: string;
  execution_parameters?: Record<string, any>;
  scheduled_time?: string;
  worker_id?: string;
  execution_attempt?: number;
  execution_number?: number;
}
