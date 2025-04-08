/**
 * Core host type definitions
 * Contains all host-related data models
 */

/**
 * Host status enum
 * Represents the current operational status of a host
 */
export type HostStatus = 'online' | 'offline' | 'unreachable' | 'pending' | 'error';

/**
 * Host connection type
 * Defines how the system connects to the host
 */
export type HostConnectionType = 'ssh' | 'agent' | 'api';

/**
 * Virtual machine type
 * Defines the virtualization technology used
 */
export type VMType = 'docker' | 'kubernetes' | 'vm' | 'bare-metal';

/**
 * Virtual machine configuration
 * Hardware and OS specifications
 */
export interface VMConfig {
  cpu: number;
  memory: number;
  disk: number;
  os: string;
}

/**
 * Core Host entity
 * Represents a machine that can be managed by the system
 */
export interface Host {
  id: string;
  name: string;
  description?: string;
  ip: string;
  port?: number;
  user?: string;
  password?: string;
  is_windows: boolean;
  type: HostConnectionType;
  status: HostStatus;
  created_at: string;
  updated_at: string;
  vm_type?: VMType;
  vm_config?: VMConfig;
}

/**
 * Host connection status
 * Represents the current state of the connection to a host
 */
export type HostConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

/**
 * Host form data
 * Used for creating or updating a host
 */
export interface HostFormData {
  name: string;
  description?: string;
  ip: string;
  port?: number;
  user?: string;
  password?: string;
  is_windows: boolean;
  type: HostConnectionType;
}

/**
 * Host analytics data
 * Performance metrics collected from a host
 */
export interface HostAnalytics {
  id: string;
  host_id: string;
  cpu_usage: number;
  memory_usage: number;
  disk_usage: number;
  uptime: number;
  timestamp: string;
}
