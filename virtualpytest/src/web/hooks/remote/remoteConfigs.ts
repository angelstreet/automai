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
    defaults: '/api/virtualpytest/android-tv/defaults',
    connect: '/api/virtualpytest/android-tv/take-control',
    disconnect: '/api/virtualpytest/android-tv/release-control',
    screenshot: '/api/virtualpytest/android-tv/screenshot',
    command: '/api/virtualpytest/android-tv/command',
    config: '/api/virtualpytest/android-tv/config'
  },
  connectionFields: [
    { name: 'host_ip', label: 'Host IP', required: true },
    { name: 'host_port', label: 'Host Port', default: '22' },
    { name: 'host_username', label: 'Username', required: true },
    { name: 'host_password', label: 'Password', type: 'password', required: true },
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
    defaults: '/api/virtualpytest/android-mobile/defaults',
    connect: '/api/virtualpytest/android-mobile/take-control',
    disconnect: '/api/virtualpytest/android-mobile/release-control',
    screenshot: '/api/virtualpytest/android-mobile/screenshot',
    command: '/api/virtualpytest/android-mobile/command',
    config: '/api/virtualpytest/android-mobile/config'
  },
  connectionFields: [
    { name: 'host_ip', label: 'Host IP', required: true },
    { name: 'host_port', label: 'Host Port', default: '22' },
    { name: 'host_username', label: 'Username', required: true },
    { name: 'host_password', label: 'Password', type: 'password', required: true },
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
    defaults: '/api/virtualpytest/ir-remote/defaults',
    connect: '/api/virtualpytest/ir-remote/take-control',
    disconnect: '/api/virtualpytest/ir-remote/release-control',
    command: '/api/virtualpytest/ir-remote/command',
    config: '/api/virtualpytest/ir-remote/config'
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
    defaults: '/api/virtualpytest/bluetooth-remote/defaults',
    connect: '/api/virtualpytest/bluetooth-remote/take-control',
    disconnect: '/api/virtualpytest/bluetooth-remote/release-control',
    command: '/api/virtualpytest/bluetooth-remote/command',
    config: '/api/virtualpytest/bluetooth-remote/config'
  },
  connectionFields: [
    { name: 'device_address', label: 'Device Address', required: true },
    { name: 'device_name', label: 'Device Name', required: true },
    { name: 'pairing_pin', label: 'Pairing PIN', required: true }
  ]
};

// Configuration registry
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