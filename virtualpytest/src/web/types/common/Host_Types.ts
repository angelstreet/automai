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
import type { Actions } from '../controller/Action_Types';
import { SystemStats } from '../pages/Dashboard_Types';
import type { Verifications } from '../verification/Verification_Types';

/**
 * Controller object interfaces
 */
export interface ControllerObject {
  type: string;
  implementation: string;
  status?: any;
}

/**
 * Canonical Host Type - Used consistently across all layers
 *
 * This represents a host machine (Flask server) that manages a device.
 * Matches exactly what the host sends during registration and
 * what the server should store and return to the frontend.
 */
export interface DeviceCapabilities {
  av?: string; // 'hdmi_stream' | null
  remote?: string; // 'android_mobile' | 'android_tv' | 'appium' | null
  power?: string; // 'tapo' | null
  verification?: string[]; // ['image', 'text', 'adb', 'appium']
}

export interface Device {
  device_id: string; // Device identifier (device1, device2, etc.)
  device_name: string; // Device display name (matches server format)
  device_model: string; // Device model for controller configuration (matches server format)
  device_ip?: string; // Device IP address (for ADB/device control)
  device_port?: string; // Device port (for ADB/device control)
  device_capabilities: DeviceCapabilities; // New detailed capability format (matches server format)
  device_controller_types?: string[]; // Device-specific controller types (prefixed for consistency)

  // === DEVICE-LEVEL VERIFICATION AND ACTIONS ===
  device_verification_types?: Verifications; // Device verification types (simplified naming)
  device_action_types?: Actions; // Device action types (simplified naming)
}

export interface Host {
  // === PRIMARY IDENTIFICATION ===
  host_name: string; // Host machine name (primary identifier)
  description?: string; // Optional description

  // === NETWORK CONFIGURATION ===
  host_url: string; // Host base URL (e.g., https://virtualpytest.com or http://localhost:6109)
  host_port: number; // Host port number

  // === MULTI-DEVICE CONFIGURATION ===
  devices: Device[]; // Array of devices controlled by this host
  device_count: number; // Number of devices

  // === STATUS AND METADATA ===
  status: 'online' | 'offline' | 'unreachable' | 'maintenance';
  last_seen: number; // Unix timestamp
  registered_at: string; // ISO timestamp
  system_stats: SystemStats; // System resource usage

  // === DEVICE LOCK MANAGEMENT ===
  isLocked: boolean; // Device lock status
  lockedBy?: string; // Session/user who locked it
  lockedAt?: number; // Timestamp when locked
}

/**
 * Host registration payload (what host sends to server)
 * This should match exactly what's in host_utils.py
 */
export interface HostRegistrationPayload {
  host_name: string;
  host_url: string;
  host_port: number;
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

export type HostStatusType = (typeof HostStatus)[keyof typeof HostStatus];
