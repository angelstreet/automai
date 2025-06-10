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