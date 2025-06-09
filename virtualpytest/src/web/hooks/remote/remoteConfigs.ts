import { RemoteDeviceConfig } from '../../types/remote/remoteTypes';

// Android TV configuration - uses abstract remote controller
export const ANDROID_TV_CONFIG: RemoteDeviceConfig = {
  type: 'android-tv',
  name: 'Android TV',
  icon: 'Android',
  hasScreenshot: true,
  hasOverlay: true,
  serverEndpoints: {
    connect: '/server/control/take-control',
    disconnect: '/server/control/release-control',
    screenshot: '/server/remote/screenshot',  // Abstract remote controller
    command: '/server/remote/command',        // Abstract remote controller
  },
  // No connection fields needed - abstract controller handles everything
  connectionFields: []
};

// Android Mobile configuration - uses abstract remote controller
export const ANDROID_MOBILE_CONFIG: RemoteDeviceConfig = {
  type: 'android-mobile',
  name: 'Android Mobile',
  icon: 'PhoneAndroid',
  hasScreenshot: true,
  hasOverlay: true,
  serverEndpoints: {
    connect: '/server/control/take-control',
    disconnect: '/server/control/release-control',
    screenshot: '/server/remote/screenshot',     // Abstract remote controller
    command: '/server/remote/command',           // Abstract remote controller
    dumpUI: '/server/remote/screenshot-and-dump-ui',  // Abstract remote controller
    getApps: '/server/remote/get-apps',               // Abstract remote controller
    clickElement: '/server/remote/click-element'      // Abstract remote controller
  },
  // No connection fields needed - abstract controller handles everything
  connectionFields: []
};

// IR Remote configuration - uses abstract remote controller
export const IR_CONFIG: RemoteDeviceConfig = {
  type: 'ir',
  name: 'IR Remote',
  icon: 'Router',
  hasScreenshot: false,
  hasOverlay: false,
  serverEndpoints: {
    connect: '/server/remote/connect',      // Abstract remote controller
    disconnect: '/server/remote/disconnect', // Abstract remote controller
    command: '/server/remote/command',      // Abstract remote controller
  },
  // No connection fields needed - abstract controller handles everything
  connectionFields: []
};

// Bluetooth Remote configuration - uses abstract remote controller
export const BLUETOOTH_CONFIG: RemoteDeviceConfig = {
  type: 'bluetooth',
  name: 'Bluetooth Remote',
  icon: 'Bluetooth',
  hasScreenshot: false,
  hasOverlay: false,
  serverEndpoints: {
    connect: '/server/remote/connect',      // Abstract remote controller
    disconnect: '/server/remote/disconnect', // Abstract remote controller
    command: '/server/remote/command',      // Abstract remote controller
  },
  // No connection fields needed - abstract controller handles everything
  connectionFields: []
};

// Configuration registry (USB_POWER_CONFIG moved to power controller)
export const REMOTE_CONFIGS = {
  'android-tv': ANDROID_TV_CONFIG,
  'android-mobile': ANDROID_MOBILE_CONFIG,
  'ir': IR_CONFIG,
  'bluetooth': BLUETOOTH_CONFIG,
} as const;

// Helper function to get config by type
export function getRemoteConfig(remoteType: string): RemoteDeviceConfig | null {
  return REMOTE_CONFIGS[remoteType as keyof typeof REMOTE_CONFIGS] || null;
} 