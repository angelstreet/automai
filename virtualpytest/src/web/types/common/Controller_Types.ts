// Controller interfaces for device control management
export interface Controller {
  id: string;
  name: string;
  type: 'remote' | 'av' | 'verification';
  config: { [key: string]: any };
  device_id: string;
  team_id: string;
  created_at?: string;
  updated_at?: string;
}

// Controller type constants for validation
export const ControllerTypes = {
  REMOTE: 'remote',
  AV: 'av',
  VERIFICATION: 'verification',
} as const;

export type ControllerType = typeof ControllerTypes[keyof typeof ControllerTypes];

// Controller status interface
export interface ControllerStatus {
  id: string;
  status: 'available' | 'in_use' | 'maintenance' | 'offline';
  last_seen?: string;
  current_session?: string;
}

// Controller capability interface
export interface ControllerCapability {
  type: ControllerType;
  name: string;
  description: string;
  supported_devices: string[]; // Device types this controller supports
  required_config: string[]; // Required configuration fields
}

// Re-export controller configuration types from Common_BaseTypes
export type { 
  ControllerConfiguration as ControllerImplementation,
  ControllerConfiguration as ControllerConfig,
  ControllerConfigMap 
} from './Common_BaseTypes'; 