import { RemoteDeviceConfig } from '../../types/remote/remoteTypes';

// Android TV configuration - extracted from existing AndroidTVRemotePanel
export const ANDROID_TV_CONFIG: RemoteDeviceConfig = {
  type: 'android-tv',
  name: 'Android TV',
  icon: 'Android',
  hasScreenshot: true,
  hasOverlay: true,
  defaultPorts: {
    host: '22',
    device: '5555'
  },
  apiEndpoints: {
    defaults: '/server/remote/android-tv/defaults',
    connect: '/server/remote/android-tv/take-control',
    disconnect: '/server/remote/android-tv/release-control',
    screenshot: '/server/remote/android-tv/screenshot',
    command: '/server/remote/android-tv/command',
    config: '/server/remote/android-tv/config'
  },
  connectionFields: [
    { name: 'device_ip', label: 'Device IP', required: true },
    { name: 'device_port', label: 'Device Port', default: '5555' }
  ]
};

// Android Mobile configuration - similar to Android TV but with mobile-specific endpoints
export const ANDROID_MOBILE_CONFIG: RemoteDeviceConfig = {
  type: 'android-mobile',
  name: 'Android Mobile',
  icon: 'PhoneAndroid',
  hasScreenshot: true,
  hasOverlay: true,
  defaultPorts: {
    host: '22',
    device: '5555'
  },
  apiEndpoints: {
    defaults: '/server/remote/android-mobile/defaults',
    connect: '/server/remote/android-mobile/take-control',
    disconnect: '/server/remote/android-mobile/release-control',
    screenshot: '/server/remote/android-mobile/screenshot',
    command: '/server/remote/android-mobile/command',
    config: '/server/remote/android-mobile/config',
    // Android Mobile specific endpoints
    dumpUI: '/server/remote/android-mobile/screenshot-and-dump-ui',
    getApps: '/server/remote/android-mobile/get-apps',
    clickElement: '/server/remote/android-mobile/click-element'
  },
  connectionFields: [
    { name: 'device_ip', label: 'Device IP', required: true },
    { name: 'device_port', label: 'Device Port', default: '5555' }
  ]
};

// IR Remote configuration
export const IR_CONFIG: RemoteDeviceConfig = {
  type: 'ir',
  name: 'IR Remote',
  icon: 'Router',
  hasScreenshot: false,
  hasOverlay: false,
  defaultPorts: {
    host: '',
    device: ''
  },
  apiEndpoints: {
    defaults: '/server/remote/ir-remote/defaults',
    connect: '/server/remote/ir-remote/connect',
    disconnect: '/server/remote/ir-remote/disconnect',
    command: '/server/remote/ir-remote/command',
    config: '/server/remote/ir-remote/config'
  },
  connectionFields: [
    { name: 'device_path', label: 'Device Path', required: true },
    { name: 'protocol', label: 'Protocol', required: true },
    { name: 'frequency', label: 'Frequency', required: true }
  ]
};

// Bluetooth Remote configuration
export const BLUETOOTH_CONFIG: RemoteDeviceConfig = {
  type: 'bluetooth',
  name: 'Bluetooth Remote',
  icon: 'Bluetooth',
  hasScreenshot: false,
  hasOverlay: false,
  defaultPorts: {
    host: '',
    device: ''
  },
  apiEndpoints: {
    defaults: '/server/remote/bluetooth-remote/defaults',
    connect: '/server/remote/bluetooth-remote/connect',
    disconnect: '/server/remote/bluetooth-remote/disconnect',
    command: '/server/remote/bluetooth-remote/command',
    config: '/server/remote/bluetooth-remote/config'
  },
  connectionFields: [
    { name: 'device_address', label: 'Device Address', required: true },
    { name: 'device_name', label: 'Device Name', required: true },
    { name: 'pairing_pin', label: 'Pairing PIN', required: true }
  ]
};

// USB Power configuration
export const USB_POWER_CONFIG: RemoteDeviceConfig = {
  type: 'usb-power',
  name: 'USB Power Control',
  icon: 'Power',
  hasScreenshot: false,
  hasOverlay: false,
  defaultPorts: {
    host: '22',
    device: ''
  },
  apiEndpoints: {
    defaults: '/server/power/usb-power/defaults',
    connect: '',
    disconnect: '',
    command: '',
    // USB Power specific endpoints
    powerOn: '/server/power/usb-power/power-on',
    powerOff: '/server/power/usb-power/power-off',
    reboot: '/server/power/usb-power/reboot'
  },
  connectionFields: [
    { name: 'usb_hub', label: 'USB Hub', default: '1' }
  ]
};

// Configuration registry
export const REMOTE_CONFIGS = {
  'android-tv': ANDROID_TV_CONFIG,
  'android-mobile': ANDROID_MOBILE_CONFIG,
  'ir': IR_CONFIG,
  'bluetooth': BLUETOOTH_CONFIG,
  'usb-power': USB_POWER_CONFIG,
} as const;

// Helper function to get config by type
export function getRemoteConfig(remoteType: string): RemoteDeviceConfig | null {
  return REMOTE_CONFIGS[remoteType as keyof typeof REMOTE_CONFIGS] || null;
} 