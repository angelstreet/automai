// Android Element interface for UI interaction
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

// Android App interface
export interface AndroidApp {
  package: string;
  name: string;
  version?: string;
  icon?: string;
}

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

// Controller types
export const ControllerTypes = {
  REMOTE: 'remote',
  AV: 'av',
  VERIFICATION: 'verification',
  POWER: 'power',
  NETWORK: 'network'
} as const;

export type ControllerType = typeof ControllerTypes[keyof typeof ControllerTypes];

// Connection form interface
export interface ConnectionForm {
  device_ip: string;
  device_port: string;
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