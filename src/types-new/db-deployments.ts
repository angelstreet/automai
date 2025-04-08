/**
 * Deployments database table definitions
 * Aligned with Supabase schema
 */
import { BaseRow, Json } from './db-common';

/**
 * Deployments table schema
 */
export interface DeploymentsTable {
  Row: BaseRow & {
    name: string;
    description: string | null;
    repository_id: string | null;
    status: string;
    schedule_type: string | null;
    scheduled_time: string | null;
    scripts_path: string[] | null;
    host_ids: string[] | null;
    user_id: string | null; // deprecated, use creator_id
    started_at: string | null;
    completed_at: string | null;
    cron_expression: string | null;
    repeat_count: number | null;
    environment_vars: Json | null;
    tenant_id: string;
    scripts_parameters: string[] | null;
    team_id: string;
    creator_id: string;
    cicd_provider_id: string | null;
  };
  Insert: {
    id?: string;
    name: string;
    description?: string | null;
    repository_id?: string | null;
    status?: string;
    schedule_type?: string | null;
    scheduled_time?: string | null;
    scripts_path?: string[] | null;
    host_ids?: string[] | null;
    user_id?: string | null;
    created_at?: string;
    started_at?: string | null;
    completed_at?: string | null;
    updated_at?: string;
    cron_expression?: string | null;
    repeat_count?: number | null;
    environment_vars?: Json | null;
    tenant_id: string;
    scripts_parameters?: string[] | null;
    team_id: string;
    creator_id: string;
    cicd_provider_id?: string | null;
  };
  Update: {
    id?: string;
    name?: string;
    description?: string | null;
    repository_id?: string | null;
    status?: string;
    schedule_type?: string | null;
    scheduled_time?: string | null;
    scripts_path?: string[] | null;
    host_ids?: string[] | null;
    user_id?: string | null;
    created_at?: string;
    started_at?: string | null;
    completed_at?: string | null;
    updated_at?: string;
    cron_expression?: string | null;
    repeat_count?: number | null;
    environment_vars?: Json | null;
    tenant_id?: string;
    scripts_parameters?: string[] | null;
    team_id?: string;
    creator_id?: string;
    cicd_provider_id?: string | null;
  };
  Relationships: [
    {
      foreignKeyName: 'deployments_repository_id_fkey';
      columns: ['repository_id'];
      isOneToOne: false;
      referencedRelation: 'repositories';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'deployments_user_id_fkey';
      columns: ['user_id'];
      isOneToOne: false;
      referencedRelation: 'profiles';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'deployments_tenant_id_fkey';
      columns: ['tenant_id'];
      isOneToOne: false;
      referencedRelation: 'tenants';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'deployments_team_id_fkey';
      columns: ['team_id'];
      isOneToOne: false;
      referencedRelation: 'teams';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'deployments_creator_id_fkey';
      columns: ['creator_id'];
      isOneToOne: false;
      referencedRelation: 'profiles';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'deployments_cicd_provider_id_fkey';
      columns: ['cicd_provider_id'];
      isOneToOne: false;
      referencedRelation: 'cicd_providers';
      referencedColumns: ['id'];
    }
  ];
}

/**
 * Deployment logs table schema
 */
export interface DeploymentLogsTable {
  Row: BaseRow & {
    deployment_id: string;
    host_id: string | null;
    level: string;
    message: string;
    timestamp: string;
  };
  Insert: {
    id?: string;
    deployment_id: string;
    host_id?: string | null;
    level: string;
    message: string;
    timestamp?: string;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    deployment_id?: string;
    host_id?: string | null;
    level?: string;
    message?: string;
    timestamp?: string;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: 'deployment_logs_deployment_id_fkey';
      columns: ['deployment_id'];
      isOneToOne: false;
      referencedRelation: 'deployments';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'deployment_logs_host_id_fkey';
      columns: ['host_id'];
      isOneToOne: false;
      referencedRelation: 'hosts';
      referencedColumns: ['id'];
    }
  ];
}

/**
 * Deployment CICD mappings table schema
 */
export interface DeploymentCICDMappingsTable {
  Row: BaseRow & {
    deployment_id: string | null;
    cicd_job_id: string | null;
    parameters: Json | null;
    build_number: string | null;
    build_url: string | null;
  };
  Insert: {
    id?: string;
    deployment_id?: string | null;
    cicd_job_id?: string | null;
    parameters?: Json | null;
    build_number?: string | null;
    build_url?: string | null;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    deployment_id?: string | null;
    cicd_job_id?: string | null;
    parameters?: Json | null;
    build_number?: string | null;
    build_url?: string | null;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: 'deployment_cicd_mappings_cicd_job_id_fkey';
      columns: ['cicd_job_id'];
      isOneToOne: false;
      referencedRelation: 'cicd_jobs';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'deployment_cicd_mappings_deployment_id_fkey';
      columns: ['deployment_id'];
      isOneToOne: false;
      referencedRelation: 'deployments';
      referencedColumns: ['id'];
    }
  ];
}
