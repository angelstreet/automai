import { AndroidElement } from './types';

// Base remote configuration type
export type RemoteType = 'android-tv' | 'android-mobile' | 'ir' | 'bluetooth' | 'usb-power';

// Base connection configuration interface (shared across Android remotes)
export interface BaseConnectionConfig {
  device_ip: string;
  device_port?: string;
}

// IR Remote connection configuration
export interface IRConnectionConfig {
  device_path: string;
  protocol: string;
  frequency: string;
}

// Bluetooth Remote connection configuration  
export interface BluetoothConnectionConfig {
  device_address: string;
  device_name: string;
  pairing_pin: string;
}

// Union type for all connection configs
export type AnyConnectionConfig = BaseConnectionConfig | IRConnectionConfig | BluetoothConnectionConfig;

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
  serverEndpoints: {
    defaults?: string;  // Optional - removed for abstract controllers
    connect: string;
    disconnect: string;
    screenshot?: string;
    command: string;
    config?: string;
    // Android Mobile specific endpoints
    dumpUI?: string;
    getApps?: string;
    clickElement?: string;
    // USB Power specific endpoints
    powerOn?: string;
    powerOff?: string;
    reboot?: string;
  };
  connectionFields: Array<{
    name: string; // Allow any string for field names
    label: string;
    type?: 'text' | 'password';
    required?: boolean;
    default?: string;
  }>;
}

// Re-export existing types for compatibility
export * from './types'; 