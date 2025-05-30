// Base remote configuration type
export type RemoteType = 'android-tv' | 'android-mobile' | 'ir' | 'bluetooth';

// Base connection configuration interface (shared across all remotes)
export interface BaseConnectionConfig {
  host_ip: string;
  host_port?: string;
  host_username: string;
  host_password: string;
  device_ip: string;
  device_port?: string;
}

// Remote device configuration
export interface RemoteDeviceConfig {
  type: RemoteType;
  name: string;
  icon: string;
  hasScreenshot: boolean;
  hasOverlay: boolean;
  defaultPorts: {
    host: string;
    device: string;
  };
  apiEndpoints: {
    defaults: string;
    connect: string;
    disconnect: string;
    screenshot?: string;
    command: string;
    config?: string;
  };
  connectionFields: Array<{
    name: keyof BaseConnectionConfig;
    label: string;
    type?: 'text' | 'password';
    required?: boolean;
    default?: string;
  }>;
}

// Re-export existing types for compatibility
export * from './types'; 