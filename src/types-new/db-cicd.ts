/**
 * CICD database table definitions
 * Aligned with Supabase schema
 */
import { BaseRow, Json } from './db-common';

/**
 * CICD providers table schema
 */
export interface CICDProvidersTable {
  Row: BaseRow & {
    type: string;
    name: string;
    url: string;
    config: Json;
    tenant_id: string;
    team_id: string;
    creator_id: string;
    port: number | null;
  };
  Insert: {
    id?: string;
    type: string;
    name: string;
    url: string;
    config: Json;
    tenant_id: string;
    team_id: string;
    creator_id: string;
    port?: number | null;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    type?: string;
    name?: string;
    url?: string;
    config?: Json;
    tenant_id?: string;
    team_id?: string;
    creator_id?: string;
    port?: number | null;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: 'cicd_providers_tenant_id_fkey';
      columns: ['tenant_id'];
      isOneToOne: false;
      referencedRelation: 'tenants';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'cicd_providers_team_id_fkey';
      columns: ['team_id'];
      isOneToOne: false;
      referencedRelation: 'teams';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'cicd_providers_creator_id_fkey';
      columns: ['creator_id'];
      isOneToOne: false;
      referencedRelation: 'profiles';
      referencedColumns: ['id'];
    }
  ];
}

/**
 * CICD jobs table schema
 */
export interface CICDJobsTable {
  Row: BaseRow & {
    provider_id: string;
    external_id: string;
    name: string;
    description: string | null;
    parameters: Json | null;
    creator_id: string;
    team_id: string;
  };
  Insert: {
    id?: string;
    provider_id: string;
    external_id: string;
    name: string;
    description?: string | null;
    parameters?: Json | null;
    creator_id: string;
    team_id: string;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    provider_id?: string;
    external_id?: string;
    name?: string;
    description?: string | null;
    parameters?: Json | null;
    creator_id?: string;
    team_id?: string;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: 'cicd_jobs_provider_id_fkey';
      columns: ['provider_id'];
      isOneToOne: false;
      referencedRelation: 'cicd_providers';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'cicd_jobs_team_id_fkey';
      columns: ['team_id'];
      isOneToOne: false;
      referencedRelation: 'teams';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'cicd_jobs_creator_id_fkey';
      columns: ['creator_id'];
      isOneToOne: false;
      referencedRelation: 'profiles';
      referencedColumns: ['id'];
    }
  ];
}

/**
 * CICD builds table schema
 */
export interface CICDBuildsTable {
  Row: BaseRow & {
    job_id: string;
    build_number: string | null;
    status: string;
    logs: string | null;
    parameters: Json | null;
    started_at: string | null;
    completed_at: string | null;
    duration: number | null;
    triggered_by: string | null;
    external_url: string | null;
  };
  Insert: {
    id?: string;
    job_id: string;
    build_number?: string | null;
    status: string;
    logs?: string | null;
    parameters?: Json | null;
    started_at?: string | null;
    completed_at?: string | null;
    duration?: number | null;
    triggered_by?: string | null;
    external_url?: string | null;
    created_at?: string;
    updated_at?: string;
  };
  Update: {
    id?: string;
    job_id?: string;
    build_number?: string | null;
    status?: string;
    logs?: string | null;
    parameters?: Json | null;
    started_at?: string | null;
    completed_at?: string | null;
    duration?: number | null;
    triggered_by?: string | null;
    external_url?: string | null;
    created_at?: string;
    updated_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: 'cicd_builds_job_id_fkey';
      columns: ['job_id'];
      isOneToOne: false;
      referencedRelation: 'cicd_jobs';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'cicd_builds_triggered_by_fkey';
      columns: ['triggered_by'];
      isOneToOne: false;
      referencedRelation: 'profiles';
      referencedColumns: ['id'];
    }
  ];
}
