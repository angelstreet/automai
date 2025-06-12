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
  packageName: string;
  label: string;
  version?: string;
  icon?: string;
}

// Remote types
export type RemoteType = 'android-tv' | 'android-mobile' | 'ir' | 'bluetooth';

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