import { RemoteDeviceConfig } from '../../types/remote/remoteTypes';

// Android TV configuration - uses direct host communication
export const ANDROID_TV_CONFIG: RemoteDeviceConfig = {
  type: 'android-tv',
  name: 'Android TV',
  icon: 'Android',
  hasScreenshot: true,
  hasOverlay: true,
  serverEndpoints: {
    connect: '/server/control/take-control',        // Server handles device locking
    disconnect: '/server/control/release-control',  // Server handles device unlocking
    screenshot: '/host/remote/screenshot',          // Direct host communication
    command: '/host/remote/command',                // Direct host communication
  }
};

// Android Mobile configuration - uses direct host communication
export const ANDROID_MOBILE_CONFIG: RemoteDeviceConfig = {
  type: 'android-mobile',
  name: 'Android Mobile',
  icon: 'PhoneAndroid',
  hasScreenshot: true,
  hasOverlay: true,
  serverEndpoints: {
    connect: '/server/control/take-control',        // Server handles device locking
    disconnect: '/server/control/release-control',  // Server handles device unlocking
    screenshot: '/host/remote/screenshot',          // Direct host communication
    command: '/host/remote/command',                // Direct host communication
    dumpUI: '/host/remote/screenshot-and-dump-ui', // Direct host communication
    getApps: '/host/remote/get-apps',               // Direct host communication
    clickElement: '/host/remote/click-element',     // Direct host communication
    tapCoordinates: '/host/remote/tap-coordinates'  // Direct host communication
  }
};

// IR Remote configuration - uses direct host communication
export const IR_CONFIG: RemoteDeviceConfig = {
  type: 'ir',
  name: 'IR Remote',
  icon: 'Router',
  hasScreenshot: false,
  hasOverlay: false,
  serverEndpoints: {
    connect: '/host/remote/connect',      // Direct host communication
    disconnect: '/host/remote/disconnect', // Direct host communication
    command: '/host/remote/command',      // Direct host communication
  }
};

// Bluetooth Remote configuration - uses direct host communication
export const BLUETOOTH_CONFIG: RemoteDeviceConfig = {
  type: 'bluetooth',
  name: 'Bluetooth Remote',
  icon: 'Bluetooth',
  hasScreenshot: false,
  hasOverlay: false,
  serverEndpoints: {
    connect: '/host/remote/connect',      // Direct host communication
    disconnect: '/host/remote/disconnect', // Direct host communication
    command: '/host/remote/command',      // Direct host communication
  }
};

// Configuration registry (USB_POWER_CONFIG moved to power controller)
export const REMOTE_CONFIGS = {
  'android-tv': ANDROID_TV_CONFIG,
  'android-mobile': ANDROID_MOBILE_CONFIG,
  'ir': IR_CONFIG,
  'bluetooth': BLUETOOTH_CONFIG,
} as const;

// Hook to get remote configurations
export function useRemoteConfigs() {
  // Get all available remote configurations
  const getConfigs = () => REMOTE_CONFIGS;
  
  // Get config by type
  const getConfigByType = (remoteType: string): RemoteDeviceConfig | null => {
    return REMOTE_CONFIGS[remoteType as keyof typeof REMOTE_CONFIGS] || null;
  };
  
  // Get all config types
  const getConfigTypes = () => Object.keys(REMOTE_CONFIGS);
  
  // Get configs as array
  const getConfigsArray = (): RemoteDeviceConfig[] => {
    return Object.values(REMOTE_CONFIGS);
  };

  return {
    configs: REMOTE_CONFIGS,
    getConfigs,
    getConfigByType,
    getConfigTypes,
    getConfigsArray,
  };
}

// Helper function to get config by type (kept for backward compatibility)
export function getRemoteConfig(remoteType: string): RemoteDeviceConfig | null {
  return REMOTE_CONFIGS[remoteType as keyof typeof REMOTE_CONFIGS] || null;
} 