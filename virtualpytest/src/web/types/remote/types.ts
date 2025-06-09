// Base controller types
export interface ControllerType {
  id: string;
  name: string;
  description: string;
  status: 'available' | 'placeholder';
}

export interface ControllerTypes {
  remote: ControllerType[];
  av: ControllerType[];
  network: ControllerType[];
  verification: ControllerType[];
  power: ControllerType[];
}

// Test result types
export interface TestResult {
  success: boolean;
  test_results: any;
  message: string;
}

// Session types for different controllers (simplified - no SSH fields)
export interface RemoteSession {
  connected: boolean;
  connectionInfo?: string; // Generic connection info (IP for Android, device path for IR, etc.)
}

// Legacy types for backward compatibility - deprecated
/** @deprecated Use RemoteSession instead */
export interface AndroidTVSession {
  connected: boolean;
  device_ip: string;
}

/** @deprecated Use RemoteSession instead */
export interface AndroidMobileSession {
  connected: boolean;
  device_ip: string;
}

// Connection form types (simplified - abstract controller handles SSH)
export interface ConnectionForm {
  device_ip: string;
  device_port: string;
}

export interface IRConnectionForm {
  device_path: string;
  protocol: string;
  frequency: string;
}

export interface BluetoothConnectionForm {
  device_address: string;
  device_name: string;
  pairing_pin: string;
}

// Remote configuration types
export interface RemoteInfo {
  name: string;
  type: string;
  image_url: string;
  default_scale: number;
  min_scale: number;
  max_scale: number;
  button_scale_factor?: number;
  global_offset?: {
    x: number;
    y: number;
  };
  text_style?: {
    fontSize?: string;
    fontWeight?: string;
    color?: string;
    textShadow?: string;
  };
}

export interface ButtonConfig {
  key: string;
  position: any;
  size: any;
  shape: string;
  comment: string;
}

export interface RemoteConfig {
  remote_info: RemoteInfo;
  button_layout: { [key: string]: ButtonConfig };
}

// Android Mobile specific types
export interface AndroidElement {
  id: number;
  tag: string;
  text: string;
  resourceId: string;
  contentDesc: string;
  className: string;
  bounds: string;
}

export interface AndroidApp {
  packageName: string;
  label: string;
}

// Controller creation types
export interface NewController {
  name: string;
  controller_type: string;
  implementation: string;
  parameters: Record<string, any>;
}

export interface TestController {
  controller_type: string;
  implementation: string;
  parameters: Record<string, any>;
} 