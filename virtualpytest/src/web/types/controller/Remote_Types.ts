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

// Appium Element interface for universal UI interaction
export interface AppiumElement {
  id: string;
  text?: string;
  className?: string;
  package?: string; // Android package or iOS bundle ID
  contentDesc?: string; // Android content-desc or iOS accessibility label
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
  // Platform-specific attributes
  platform: string; // 'ios', 'android', etc.
  resource_id?: string; // Android resource-id
  accessibility_id?: string; // iOS accessibility-id
  name?: string; // iOS name attribute
  label?: string; // iOS label attribute
  value?: string; // iOS value attribute
}

// Appium App interface for universal app representation
export interface AppiumApp {
  identifier: string; // Package name (Android) or Bundle ID (iOS)
  label: string;
  version?: string;
  platform?: string; // 'ios', 'android', etc.
}

// Remote types
export type RemoteType = 'android-tv' | 'android-mobile' | 'appium-remote' | 'ir' | 'bluetooth';

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

// Appium connection configuration
export interface AppiumConnectionConfig extends BaseConnectionConfig {
  device_udid: string;
  platform_name: string;
  platform_version?: string;
  appium_url?: string;
  automation_name?: string;
  app_package?: string; // Android
  app_activity?: string; // Android
  bundle_id?: string; // iOS
}

// Union type for all connection configurations
export type AnyConnectionConfig =
  | AndroidConnectionConfig
  | IRConnectionConfig
  | BluetoothConnectionConfig
  | AppiumConnectionConfig
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

// Appium session interface
export interface AppiumSession extends RemoteSession {
  deviceInfo?: {
    platform: string;
    platformVersion: string;
    deviceName: string;
    udid: string;
    automationName: string;
  };
  appiumConnected?: boolean;
  sessionId?: string;
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
