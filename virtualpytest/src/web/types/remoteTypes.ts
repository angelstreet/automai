import { AndroidElement } from './controllerSessionTypes';

// Base remote configuration type (removed usb-power as it belongs in power controller)
export type RemoteType = 'android-tv' | 'android-mobile' | 'ir' | 'bluetooth';

// Base connection configuration interface (cleaned up - no SSH fields needed)
export interface BaseConnectionConfig {
  device_ip?: string; // Optional - abstract controller manages this
  device_port?: string; // Optional - abstract controller manages this
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
  // Abstract controller endpoints
  serverEndpoints: {
    connect: string;
    disconnect: string;
    screenshot?: string;
    command: string;
    // Android Mobile specific endpoints
    dumpUI?: string;
    getApps?: string;
    clickElement?: string;
    tapCoordinates?: string;
  };
}

// Re-export existing types for compatibility
export * from './controllerSessionTypes'; 