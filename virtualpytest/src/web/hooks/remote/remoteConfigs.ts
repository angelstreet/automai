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

// Configuration registry
export const REMOTE_CONFIGS = {
  'android-tv': ANDROID_TV_CONFIG,
  // Future configs will be added here
} as const;

// Helper function to get config by type
export function getRemoteConfig(remoteType: string): RemoteDeviceConfig | null {
  return REMOTE_CONFIGS[remoteType as keyof typeof REMOTE_CONFIGS] || null;
} 