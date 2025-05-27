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

// Session types for different controllers
export interface AndroidTVSession {
  connected: boolean;
  host_ip: string;
  device_ip: string;
}

export interface IRRemoteSession {
  connected: boolean;
  device_path: string;
  protocol: string;
}

export interface BluetoothRemoteSession {
  connected: boolean;
  device_address: string;
  device_name: string;
}

export interface AndroidMobileSession {
  connected: boolean;
  host_ip: string;
  device_ip: string;
}

// Connection form types
export interface ConnectionForm {
  host_ip: string;
  host_username: string;
  host_password: string;
  host_port: string;
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
  text: string;
  contentDesc: string;
  resourceId: string;
  tag: string;
  bounds: string;
  clickable: boolean;
  enabled: boolean;
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