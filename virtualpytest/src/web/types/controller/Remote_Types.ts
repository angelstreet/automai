// Android Element interface for UI interaction (web interface version)
export interface AndroidElement {
  id: string;
  text?: string;
  className?: string;
  package?: string;
  bounds: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
  clickable: boolean;
  enabled: boolean;
  focused: boolean;
  selected: boolean;
}

// Android App interface (web interface version)
export interface AndroidApp {
  packageName: string;
  label: string;
  version?: string;
  icon?: string;
}

// Base remote configuration type (removed usb-power as it belongs in power controller)
export type RemoteType = 'android-tv' | 'android-mobile' | 'ir' | 'bluetooth';

// Base connection configuration interface (cleaned up - no SSH fields needed)
export interface BaseConnectionConfig {
  device_ip?: string; // Optional - abstract controller manages this
  device_port?: string; // Optional - abstract controller manages this
}

// Connection form interface
export interface ConnectionForm {
  device_ip: string;
  device_port: string;
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

// Remote configuration interface
export interface RemoteConfig {
  type: string;
  name: string;
  icon: string;
  hasScreenshot: boolean;
  hasOverlay: boolean;
  serverEndpoints: {
    connect: string;
    disconnect: string;
    screenshot?: string;
    command: string;
    dumpUI?: string;
    getApps?: string;
    clickElement?: string;
    tapCoordinates?: string;
  };
}

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

// Controller item interface for API responses
export interface ControllerItem {
  id: string;
  name: string;
  description: string;
  status: 'available' | 'placeholder';
}

// Controller types structure for API responses
export interface ControllerTypesResponse {
  remote: ControllerItem[];
  av: ControllerItem[];
  network: ControllerItem[];
  verification: ControllerItem[];
  power: ControllerItem[];
}

// Session types for different controllers
export interface RemoteSession {
  connected: boolean;
  connectionInfo?: string;
}

// Legacy types for backward compatibility
export interface AndroidTVSession {
  connected: boolean;
  device_ip: string;
}

export interface AndroidMobileSession {
  connected: boolean;
  device_ip: string;
}

// Test result interface
export interface TestResult {
  success: boolean;
  message: string;
  timestamp: string;
  details?: any;
}

// Export aliases for compatibility with useControllerTypes hook
export type ControllerTypes = ControllerTypesResponse;
export type ControllerType = ControllerItem; 