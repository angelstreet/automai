// New interfaces for device management
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

export interface EnvironmentProfile {
  id: string;
  name: string;
  device_id: string;
  remote_controller_id?: string;
  av_controller_id?: string;
  verification_controller_id?: string;
  team_id: string;
  created_at?: string;
  updated_at?: string;
} 