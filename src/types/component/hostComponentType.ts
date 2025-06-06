/**
 * Core Host type definitions
 * Consolidated from previous host.ts and deployment.ts
 */

/**
 * Host status enumeration
 */
export type HostStatus = 'connected' | 'failed' | 'pending' | 'testing' | 'deploying' | 'success';

/**
 * Host connection type
 */
export type HostConnectionType = 'ssh' | 'docker' | 'portainer' | 'device';

/**
 * Primary Host interface used across the application
 */
export interface Host {
  id: string;
  name: string;
  description?: string;

  // Connection details
  type: HostConnectionType;
  ip: string;
  ip_local?: string; // Local/private IP address
  port?: number;
  hostname?: string;
  host_type?: string;
  environment?: string;

  // Device classification
  device_type?: string; // windows, linux, android_mobile, android_tablet, ios_phone, ios_tablet, tv_tizen, tv_lg, tv_android, appletv, stb_eos, stb_apollo

  // ADB Host Connection (for devices that need ADB)
  host_id?: string; // ID of the SSH host that has ADB installed and can connect to this device

  // Authentication details
  user?: string;
  password?: string;
  auth_type?: 'password' | 'privateKey'; // Authentication method
  private_key?: string; // SSH private key

  // VNC specific fields
  vnc_port?: string | number;
  vnc_password?: string;

  // Reservation management
  reserved_by?: string | null; // User ID who has reserved this host

  // Status fields
  status: HostStatus;

  // Timestamps
  created_at: Date | string;
  updated_at: Date | string;

  // System properties
  is_windows: boolean;

  // Ownership and permissions
  team_id?: string; // The team that owns this host
  creator_id?: string; // The user that created this host

  // Additional metadata
  os_type?: string;
  errorMessage?: string;
}

/**
 * Host form data used when creating or updating hosts
 */
export interface HostFormData {
  name: string;
  description?: string;
  type: HostConnectionType;
  ip: string;
  port?: number;
  username?: string;
  password?: string;
  is_windows?: boolean;
}

/**
 * Connection status information for a host
 */
export interface HostConnectionStatus {
  status: string;
  lastChecked: string;
  message?: string;
}

/**
 * Host system analytics data
 */
export interface HostAnalytics {
  cpu: number;
  memory: number;
  disk: number;
  uptime: string;
  lastUpdated: string;
}

/**
 * VM type identifiers
 */
export type VMType = 'docker' | 'vm' | 'kubernetes' | 'aws' | 'gcp' | 'azure';

/**
 * VM configuration for provisioning
 */
export interface VMConfig {
  name: string;
  description: string;
  type: VMType;
  image: string;
  cpu: number;
  memory: number;
}
