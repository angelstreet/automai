import { RemoteDeviceConfig } from '../../types/controller/Remote_Types';

// Android TV configuration - uses server route proxying to host
export const ANDROID_TV_CONFIG: RemoteDeviceConfig = {
  type: 'android-tv',
  name: 'Android TV',
  icon: 'Android',
  hasScreenshot: true,
  hasOverlay: true,
  serverEndpoints: {
    connect: '/server/control/take-control',
    disconnect: '/server/control/release-control',
    screenshot: '/server/remote/take-screenshot',
    command: '/server/remote/execute-command',
  },
};

// Android Mobile configuration - uses server route proxying to host
export const ANDROID_MOBILE_CONFIG: RemoteDeviceConfig = {
  type: 'android-mobile',
  name: 'Android Mobile',
  icon: 'PhoneAndroid',
  hasScreenshot: true,
  hasOverlay: true,
  serverEndpoints: {
    connect: '/server/control/take-control',
    disconnect: '/server/control/release-control',
    screenshot: '/server/remote/take-screenshot',
    command: '/server/remote/execute-command',
    dumpUI: '/server/remote/screenshot-and-dump',
    getApps: '/server/remote/get-apps',
    clickElement: '/server/remote/click-element',
    tapCoordinates: '/server/remote/tap-element',
  },
};

// IR Remote configuration - uses server route proxying to host
export const IR_CONFIG: RemoteDeviceConfig = {
  type: 'ir',
  name: 'IR Remote',
  icon: 'Router',
  hasScreenshot: false,
  hasOverlay: false,
  serverEndpoints: {
    connect: '/server/remote/connect',
    disconnect: '/server/remote/disconnect',
    command: '/server/remote/execute-command',
  },
};

// Bluetooth Remote configuration - uses server route proxying to host
export const BLUETOOTH_CONFIG: RemoteDeviceConfig = {
  type: 'bluetooth',
  name: 'Bluetooth Remote',
  icon: 'Bluetooth',
  hasScreenshot: false,
  hasOverlay: false,
  serverEndpoints: {
    connect: '/server/remote/connect',
    disconnect: '/server/remote/disconnect',
    command: '/server/remote/execute-command',
  },
};

// Configuration registry (USB_POWER_CONFIG moved to power controller)
export const REMOTE_CONFIGS = {
  'android-tv': ANDROID_TV_CONFIG,
  'android-mobile': ANDROID_MOBILE_CONFIG,
  ir: IR_CONFIG,
  bluetooth: BLUETOOTH_CONFIG,
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
