/**
 * Host Types - Canonical host type definitions for host machines that control devices
 * 
 * A Host represents a machine running Flask that can control a device.
 * 
 * Used consistently across all layers:
 * 1. Host Registration (what host sends to server)
 * 2. Server Storage (what server stores in memory registry)  
 * 3. Frontend Interface (what frontend receives from API)
 * 
 * NO DATA TRANSFORMATION should occur between these layers.
 */

import { SystemStats } from '../pages/Dashboard_Types';

/**
 * Canonical Host Type - Used consistently across all layers
 * 
 * This represents a host machine (Flask server) that manages a device.
 * Matches exactly what the host sends during registration and
 * what the server should store and return to the frontend.
 */
export interface Host {
  // === PRIMARY IDENTIFICATION ===
  host_name: string;             // Host machine name (primary identifier)

  description?: string;          // Optional description
  
  // === NETWORK CONFIGURATION ===
  host_ip: string;               // Host IP address
  host_port_internal: number;   // Where Flask actually runs on host
  host_port_external: number;   // For server communication (may be port-forwarded)
  host_port_web: number;        // HTTPS/nginx port

   // === DEVICE CONFIGURATION ===
  device_ip: string;             // Device IP address (for ADB/device control)
  device_port: string;           // Device port (for ADB/device control)
  device_name: string;           // Device display name
  device_model: string;          // Device model for controller configuration
  
  // === STATUS AND METADATA ===
  status: 'online' | 'offline' | 'unreachable' | 'maintenance';
  last_seen: number;             // Unix timestamp
  registered_at: string;        // ISO timestamp
  system_stats: SystemStats;    // System resource usage
  
  // === HOST CAPABILITIES ===
  capabilities: string[];        // Available capabilities (av, remote, verification, power)
  controller_configs?: any;      // Controller-specific configurations
  controller_types?: string[];   // Available controller types
  
  // === DEVICE LOCK MANAGEMENT ===
  isLocked: boolean;             // Device lock status
  lockedBy?: string;            // Session/user who locked it
  lockedAt?: number;            // Timestamp when locked
}

/**
 * Host registration payload (what host sends to server)
 * This should match exactly what's in host_utils.py
 */
export interface HostRegistrationPayload {
  host_name: string;
  host_ip: string;
  host_port_internal: number;
  host_port_external: number;
  host_port_web: number;
  device_name: string;
  device_model: string;
  device_ip: string;
  device_port: string;
  system_stats: SystemStats;
}

export const HostStatus = {
  ONLINE: 'online',
  OFFLINE: 'offline', 
  UNREACHABLE: 'unreachable',
  MAINTENANCE: 'maintenance',
} as const;

export type HostStatusType = typeof HostStatus[keyof typeof HostStatus]; 