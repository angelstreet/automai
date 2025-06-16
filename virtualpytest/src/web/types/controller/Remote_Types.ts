// Android Element interface for UI interaction
export interface AndroidElement {
  id: string;
  text?: string;
  className?: string;
  package?: string;
  contentDesc?: string;
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

// Android App interface
export interface AndroidApp {
  packageName: string;
  label: string;
  version?: string;
  icon?: string;
}

// Remote types
export type RemoteType = 'android-tv' | 'android-mobile' | 'ir' | 'bluetooth';

// Base connection configuration interface
export interface BaseConnectionConfig {
  [key: string]: any;
}

// Android connection configuration (for both TV and mobile)
export interface AndroidConnectionConfig extends BaseConnectionConfig {
  device_ip: string;
  device_port: string;
}

// IR connection configuration
export interface IRConnectionConfig extends BaseConnectionConfig {
  device_path: string;
  protocol: string;
  frequency: number;
}

// Bluetooth connection configuration
export interface BluetoothConnectionConfig extends BaseConnectionConfig {
  device_address: string;
  device_name?: string;
  pairing_pin?: string;
}

// Union type for all connection configurations
export type AnyConnectionConfig =
  | AndroidConnectionConfig
  | IRConnectionConfig
  | BluetoothConnectionConfig
  | BaseConnectionConfig;

// Connection form interface for UI forms
export interface ConnectionForm {
  device_ip: string;
  device_port: string;
}

// Remote device configuration interface (extends RemoteConfig with additional endpoints)
export interface RemoteDeviceConfig {
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
    screenshotAndDump?: string;
    getApps?: string;
    clickElement?: string;
    tapElement?: string;
    executeCommand?: string;
    getStatus?: string;
  };
}

// Android TV session interface
export interface AndroidTVSession extends RemoteSession {
  deviceInfo?: {
    model: string;
    manufacturer: string;
    androidVersion: string;
  };
  adbConnected?: boolean;
}

// Android Mobile session interface
export interface AndroidMobileSession extends RemoteSession {
  deviceInfo?: {
    model: string;
    manufacturer: string;
    androidVersion: string;
  };
  adbConnected?: boolean;
}

// Remote configuration interface
export interface RemoteConfig {
  type: string;
  name: string;
  icon: string;
  hasScreenshot: boolean;
  hasOverlay: boolean;
  serverEndpoints: {
    takeScreenshot: string;
    screenshotAndDump: string;
    getApps: string;
    clickElement: string;
    tapElement: string;
    executeCommand: string;
    getStatus: string;
  };
}

// Remote session interface
export interface RemoteSession {
  connected: boolean;
  connectionInfo?: string;
}

// Test result interface
export interface TestResult {
  success: boolean;
  message: string;
  timestamp: string;
  details?: any;
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

// Export aliases for compatibility with useControllerTypes hook
export type ControllerTypes = ControllerTypesResponse;
export type ControllerType = ControllerItem;
