import { RemoteDeviceConfig } from '../../types/remote/remoteTypes';

// Android TV configuration - uses abstract remote controller
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
  serverEndpoints: {
    connect: '/server/control/take-control',
    disconnect: '/server/control/release-control',
    screenshot: '/server/remote/screenshot',  // Abstract remote controller
    command: '/server/remote/command',        // Abstract remote controller
  },
  connectionFields: [
    { name: 'device_ip', label: 'Device IP', required: true },
    { name: 'device_port', label: 'Device Port', default: '5555' }
  ]
};

// Android Mobile configuration - uses abstract remote controller
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
  serverEndpoints: {
    connect: '/server/control/take-control',
    disconnect: '/server/control/release-control',
    screenshot: '/server/remote/screenshot',     // Abstract remote controller
    command: '/server/remote/command',           // Abstract remote controller
    dumpUI: '/server/remote/screenshot-and-dump-ui',  // Abstract remote controller
    getApps: '/server/remote/get-apps',               // Abstract remote controller
    clickElement: '/server/remote/click-element'      // Abstract remote controller
  },
  connectionFields: [
    { name: 'device_ip', label: 'Device IP', required: true },
    { name: 'device_port', label: 'Device Port', default: '5555' }
  ]
};

// IR Remote configuration - uses abstract remote controller
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
  serverEndpoints: {
    connect: '/server/remote/connect',      // Abstract remote controller
    disconnect: '/server/remote/disconnect', // Abstract remote controller
    command: '/server/remote/command',      // Abstract remote controller
  },
  connectionFields: [
    { name: 'device_path', label: 'Device Path', required: true },
    { name: 'protocol', label: 'Protocol', required: true },
    { name: 'frequency', label: 'Frequency', required: true }
  ]
};

// Bluetooth Remote configuration - uses abstract remote controller
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
  serverEndpoints: {
    connect: '/server/remote/connect',      // Abstract remote controller
    disconnect: '/server/remote/disconnect', // Abstract remote controller
    command: '/server/remote/command',      // Abstract remote controller
  },
  connectionFields: [
    { name: 'device_address', label: 'Device Address', required: true },
    { name: 'device_name', label: 'Device Name', required: true },
    { name: 'pairing_pin', label: 'Pairing PIN', required: true }
  ]
};

// USB Power configuration - uses abstract power controller
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
  serverEndpoints: {
    connect: '',
    disconnect: '',
    command: '',
    powerOn: '/server/power/power-on',    // Abstract power controller
    powerOff: '/server/power/power-off',  // Abstract power controller
    reboot: '/server/power/reboot'        // Abstract power controller
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