/**
 * Host database table definitions
 */
import { BaseRow } from './db-common';

/**
 * Hosts table schema
 * Aligned with public.hosts table in Supabase
 */
export interface HostsTable {
  Row: BaseRow & {
    name: string;
    description: string | null;
    type: string;
    ip: string;
    port: number | null;
    user: string | null;
    password: string | null;
    status: string;
    is_windows: boolean;
    team_id: string;
    creator_id: string;
    tenant_id: string | null;
    hostname: string | null;
    tags: string[] | null;
    provider: string | null;
    region: string | null;
    instance_type: string | null;
    is_active: boolean | null;
    last_heartbeat: string | null;
    last_deploy: string | null;
    error: string | null;
    os: string | null;
    ip_address: string | null;
    ssh_port: number | null;
    ssh_user: string | null;
    instance_id: string | null;
    // ADB Host Connection
    host_id: string | null; // ID of the SSH host that has ADB installed and can connect to this device
    ip_local: string | null; // Local/private IP address for devices
    device_type: string | null; // Device type classification
    auth_type: string | null; // Authentication type
    private_key: string | null; // SSH private key
    vnc_port: number | null; // VNC port for remote desktop
    vnc_password: string | null; // VNC password
  };
  Insert: {
    id?: string;
    created_at?: string;
    updated_at?: string;
    name: string;
    description?: string | null;
    type: string;
    ip: string;
    port?: number | null;
    user?: string | null;
    password?: string | null;
    status?: string;
    is_windows?: boolean;
    team_id: string;
    creator_id: string;
    tenant_id?: string | null;
    hostname?: string | null;
    tags?: string[] | null;
    provider?: string | null;
    region?: string | null;
    instance_type?: string | null;
    is_active?: boolean | null;
    last_heartbeat?: string | null;
    last_deploy?: string | null;
    error?: string | null;
    os?: string | null;
    ip_address?: string | null;
    ssh_port?: number | null;
    ssh_user?: string | null;
    instance_id?: string | null;
    // ADB Host Connection
    host_id?: string | null;
    ip_local?: string | null;
    device_type?: string | null;
    auth_type?: string | null;
    private_key?: string | null;
    vnc_port?: number | null;
    vnc_password?: string | null;
  };
  Update: {
    id?: string;
    created_at?: string;
    updated_at?: string;
    name?: string;
    description?: string | null;
    type?: string;
    ip?: string;
    port?: number | null;
    user?: string | null;
    password?: string | null;
    status?: string;
    is_windows?: boolean;
    team_id?: string;
    creator_id?: string;
    tenant_id?: string | null;
    hostname?: string | null;
    tags?: string[] | null;
    provider?: string | null;
    region?: string | null;
    instance_type?: string | null;
    is_active?: boolean | null;
    last_heartbeat?: string | null;
    last_deploy?: string | null;
    error?: string | null;
    os?: string | null;
    ip_address?: string | null;
    ssh_port?: number | null;
    ssh_user?: string | null;
    instance_id?: string | null;
    // ADB Host Connection
    host_id?: string | null;
    ip_local?: string | null;
    device_type?: string | null;
    auth_type?: string | null;
    private_key?: string | null;
    vnc_port?: number | null;
    vnc_password?: string | null;
  };
  Relationships: [
    {
      foreignKeyName: 'hosts_creator_id_fkey';
      columns: ['creator_id'];
      isOneToOne: false;
      referencedRelation: 'profiles';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'hosts_team_id_fkey';
      columns: ['team_id'];
      isOneToOne: false;
      referencedRelation: 'teams';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'hosts_tenant_id_fkey';
      columns: ['tenant_id'];
      isOneToOne: false;
      referencedRelation: 'tenants';
      referencedColumns: ['id'];
    },
  ];
}

/**
 * Host logs table schema
 */
export interface HostLogsTable {
  Row: BaseRow & {
    host_id: string;
    message: string;
    level: string;
  };
  Insert: {
    id?: string;
    created_at?: string;
    updated_at?: string;
    host_id: string;
    message: string;
    level: string;
  };
  Update: {
    id?: string;
    created_at?: string;
    updated_at?: string;
    host_id?: string;
    message?: string;
    level?: string;
  };
  Relationships: [
    {
      foreignKeyName: 'host_logs_host_id_fkey';
      columns: ['host_id'];
      isOneToOne: false;
      referencedRelation: 'hosts';
      referencedColumns: ['id'];
    },
  ];
}

/**
 * Host analytics table schema
 * Stores performance metrics for hosts
 */
export interface HostAnalyticsTable {
  Row: BaseRow & {
    host_id: string;
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
    uptime: number;
  };
  Insert: {
    id?: string;
    created_at?: string;
    updated_at?: string;
    host_id: string;
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
    uptime: number;
  };
  Update: {
    id?: string;
    created_at?: string;
    updated_at?: string;
    host_id?: string;
    cpu_usage?: number;
    memory_usage?: number;
    disk_usage?: number;
    uptime?: number;
  };
  Relationships: [
    {
      foreignKeyName: 'host_analytics_host_id_fkey';
      columns: ['host_id'];
      isOneToOne: false;
      referencedRelation: 'hosts';
      referencedColumns: ['id'];
    },
  ];
}

/**
 * Host Events table schema
 */
export interface HostEventsTable {
  Row: BaseRow & {
    host_id: string;
    event_type: string;
    details: Record<string, any> | null;
    status: string;
    team_id: string | null;
    tenant_id: string | null;
    creator_id: string;
  };
  Insert: {
    id?: string;
    created_at?: string;
    updated_at?: string;
    host_id: string;
    event_type: string;
    details?: Record<string, any> | null;
    status?: string;
    team_id?: string | null;
    tenant_id?: string | null;
    creator_id: string;
  };
  Update: {
    id?: string;
    created_at?: string;
    updated_at?: string;
    host_id?: string;
    event_type?: string;
    details?: Record<string, any> | null;
    status?: string;
    team_id?: string | null;
    tenant_id?: string | null;
    creator_id?: string;
  };
  Relationships: [
    {
      foreignKeyName: 'host_events_host_id_fkey';
      columns: ['host_id'];
      isOneToOne: false;
      referencedRelation: 'hosts';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'host_events_creator_id_fkey';
      columns: ['creator_id'];
      isOneToOne: false;
      referencedRelation: 'profiles';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'host_events_team_id_fkey';
      columns: ['team_id'];
      isOneToOne: false;
      referencedRelation: 'teams';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'host_events_tenant_id_fkey';
      columns: ['tenant_id'];
      isOneToOne: false;
      referencedRelation: 'tenants';
      referencedColumns: ['id'];
    },
  ];
}

/**
 * Host Metrics table schema
 */
export interface HostMetricsTable {
  Row: BaseRow & {
    host_id: string;
    metric_type: string;
    value: number;
    unit: string | null;
    timestamp: string;
    details: Record<string, any> | null;
    team_id: string | null;
    tenant_id: string | null;
  };
  Insert: {
    id?: string;
    created_at?: string;
    updated_at?: string;
    host_id: string;
    metric_type: string;
    value: number;
    unit?: string | null;
    timestamp?: string;
    details?: Record<string, any> | null;
    team_id?: string | null;
    tenant_id?: string | null;
  };
  Update: {
    id?: string;
    created_at?: string;
    updated_at?: string;
    host_id?: string;
    metric_type?: string;
    value?: number;
    unit?: string | null;
    timestamp?: string;
    details?: Record<string, any> | null;
    team_id?: string | null;
    tenant_id?: string | null;
  };
  Relationships: [
    {
      foreignKeyName: 'host_metrics_host_id_fkey';
      columns: ['host_id'];
      isOneToOne: false;
      referencedRelation: 'hosts';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'host_metrics_team_id_fkey';
      columns: ['team_id'];
      isOneToOne: false;
      referencedRelation: 'teams';
      referencedColumns: ['id'];
    },
    {
      foreignKeyName: 'host_metrics_tenant_id_fkey';
      columns: ['tenant_id'];
      isOneToOne: false;
      referencedRelation: 'tenants';
      referencedColumns: ['id'];
    },
  ];
}
