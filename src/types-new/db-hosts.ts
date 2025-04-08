/**
 * Host database table definitions
 */
import { BaseRow } from './db-common';

/**
 * Hosts table schema
 */
export interface HostsTable {
  Row: BaseRow & {
    description: string | null;
    ip: string;
    is_windows: boolean;
    name: string;
    password: string | null;
    port: number | null;
    status: string;
    type: string;
    user: string | null;
    vm_type: string | null;
    vm_config: string | null; // JSON string
  };
  Insert: {
    created_at?: string;
    description?: string | null;
    id?: string;
    ip: string;
    is_windows?: boolean;
    name: string;
    password?: string | null;
    port?: number | null;
    status?: string;
    type: string;
    updated_at?: string;
    user?: string | null;
    vm_type?: string | null;
    vm_config?: string | null;
  };
  Update: {
    created_at?: string;
    description?: string | null;
    id?: string;
    ip?: string;
    is_windows?: boolean;
    name?: string;
    password?: string | null;
    port?: number | null;
    status?: string;
    type?: string;
    updated_at?: string;
    user?: string | null;
    vm_type?: string | null;
    vm_config?: string | null;
  };
  Relationships: [];
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
    created_at?: string;
    host_id: string;
    id?: string;
    level: string;
    message: string;
    updated_at?: string;
  };
  Update: {
    created_at?: string;
    host_id?: string;
    id?: string;
    level?: string;
    message?: string;
    updated_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: 'host_logs_host_id_fkey';
      columns: ['host_id'];
      isOneToOne: false;
      referencedRelation: 'hosts';
      referencedColumns: ['id'];
    }
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
    created_at?: string;
    cpu_usage: number;
    disk_usage: number;
    host_id: string;
    id?: string;
    memory_usage: number;
    updated_at?: string;
    uptime: number;
  };
  Update: {
    created_at?: string;
    cpu_usage?: number;
    disk_usage?: number;
    host_id?: string;
    id?: string;
    memory_usage?: number;
    updated_at?: string;
    uptime?: number;
  };
  Relationships: [
    {
      foreignKeyName: 'host_analytics_host_id_fkey';
      columns: ['host_id'];
      isOneToOne: false;
      referencedRelation: 'hosts';
      referencedColumns: ['id'];
    }
  ];
}
