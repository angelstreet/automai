/**
 * Power Control Types
 *
 * Types for power controller integration (Tapo and other power controllers)
 */

import { Host } from './common/Host_Types';

export interface PowerStatus {
  power_state: 'on' | 'off' | 'unknown';
  device_ip?: string;
  connected: boolean;
  device_info?: any;
  error?: string;
}

export interface PowerControlRequest {
  command: 'power_on' | 'power_off' | 'reboot';
  device_id: string;
  host?: Host;
}

export interface PowerControlResponse {
  success: boolean;
  message?: string;
  device_id?: string;
  error?: string;
}

export interface PowerStatusResponse {
  success: boolean;
  status?: PowerStatus;
  device_id?: string;
  error?: string;
}

export type PowerCommand = 'power_on' | 'power_off' | 'reboot';
export type PowerState = 'on' | 'off' | 'unknown';
