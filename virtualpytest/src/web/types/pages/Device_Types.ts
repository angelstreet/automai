/**
 * Device Types - Comprehensive device type definitions
 * 
 * This file contains both:
 * 1. Logical Device Types - For device management/database entities
 * 2. Runtime Device Types - For connected hosts/clients from server
 */

import { SystemStats } from './Dashboard_Types';

// =====================================
// LOGICAL DEVICE TYPES (Database/Management)
// =====================================

// Physical device interfaces for device management
export interface Device {
  id: string;
  name: string;
  type: 'android_mobile' | 'firetv' | 'appletv' | 'stb_eos' | 'linux' | 'windows' | 'stb';
  model: string;
  version: string;
  environment: 'prod' | 'preprod' | 'dev' | 'staging';
  connection_config: { [key: string]: any };
  status: 'available' | 'in_use' | 'maintenance' | 'offline';
  team_id: string;
  created_at?: string;
  updated_at?: string;
}

// Device type constants for validation
export const DeviceTypes = {
  ANDROID_MOBILE: 'android_mobile',
  FIRETV: 'firetv',
  APPLETV: 'appletv',
  STB_EOS: 'stb_eos',
  LINUX: 'linux',
  WINDOWS: 'windows',
  STB: 'stb',
} as const;

export type DeviceType = typeof DeviceTypes[keyof typeof DeviceTypes];

// Device environment constants
export const DeviceEnvironments = {
  PROD: 'prod',
  PREPROD: 'preprod',
  DEV: 'dev',
  STAGING: 'staging',
} as const;

export type DeviceEnvironment = typeof DeviceEnvironments[keyof typeof DeviceEnvironments];

// Device status constants
export const DeviceStatuses = {
  AVAILABLE: 'available',
  IN_USE: 'in_use',
  MAINTENANCE: 'maintenance',
  OFFLINE: 'offline',
} as const;

export type DeviceStatus = typeof DeviceStatuses[keyof typeof DeviceStatuses];

// =====================================
// RUNTIME DEVICE TYPES (Connected Hosts/Clients)
// =====================================

/**
 * Runtime device types for actual connected hosts/clients
 * Server endpoint: /server/system/clients/devices
 * Returns: { success: boolean, devices: DeviceRegistration[] }
 */

// Device connection information
export interface DeviceConnection {
  flask_url: string;
  nginx_url: string;
}

// Core device registration data as returned by server
export interface DeviceRegistration {
  // Server-provided core fields
  id: string;                    // Device ID from server
  name: string;                  // Device name 
  host_name: string;            // Host name (e.g., "mac-host")
  model: string;                // Device model
  description?: string;         // Optional description
  connection: DeviceConnection; // Connection URLs
  status: string;               // Device status (online/offline)
  last_seen: number;            // Unix timestamp
  registered_at: string;        // ISO timestamp
  capabilities: string[];       // Device capabilities
  system_stats: SystemStats;   // System resource usage (imported from Dashboard_Types)
  
  // === COMPLETE HOST NETWORKING ===
  host_ip: string;             // Host IP address
  host_port_internal: string;  // Where Flask actually runs
  host_port_external: string;  // For server communication (may be port-forwarded)
  host_port_web: string;       // HTTPS/nginx port
  
  // Device lock management
  isLocked: boolean;            // Device lock status
  lockedBy?: string;           // Session/user who locked it
  lockedAt?: number;           // Timestamp when locked
  
  // Legacy compatibility fields (for Dashboard and backward compatibility)
  client_id: string;           // Maps to id field
  device_model: string;        // Maps to model field
  local_ip: string;           // Extracted from connection.flask_url
  client_port: string;        // Extracted from connection.flask_url
  public_ip: string;          // Same as local_ip for now
  host_port: string;          // Legacy field - maps to host_port_external
  
  // Controller configuration
  controller_types?: string[];  // Available controller types
  controller_configs?: any;    // Controller-specific configs
}

// For components that need the controller proxies attached
export interface DeviceWithProxies extends DeviceRegistration {
  controllerProxies?: {
    av?: any;           // AVControllerProxy
    remote?: any;       // RemoteControllerProxy  
    verification?: any; // VerificationControllerProxy
  };
}

// Server response structure
export interface DevicesResponse {
  success: boolean;
  devices?: DeviceRegistration[];
  error?: string;
}

// Type aliases for backward compatibility
export type RegisteredHost = DeviceRegistration;
export type ConnectedDevice = DeviceRegistration;
export type Host = DeviceRegistration; 