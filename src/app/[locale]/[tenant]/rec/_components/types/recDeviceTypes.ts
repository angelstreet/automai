/**
 * Device types for remote control system
 */
export type DeviceType = 'androidTv' | 'androidPhone' | 'host';

/**
 * Base device configuration
 */
export interface BaseDeviceConfig {
  id: string;
  name: string;
  type: DeviceType;
}

/**
 * Android device configuration (TV or Phone)
 */
export interface AndroidDeviceConfig extends BaseDeviceConfig {
  type: 'androidTv' | 'androidPhone';
  streamUrl: string;
  remoteConfig: {
    hostId: string;
    deviceId: string;
  };
}

/**
 * Host device configuration (VNC)
 */
export interface HostDeviceConfig extends BaseDeviceConfig {
  type: 'host';
  vncConfig: {
    ip: string;
    port: number;
    password?: string;
  };
}

/**
 * Union type for all device configurations
 */
export type DeviceConfig = AndroidDeviceConfig | HostDeviceConfig;

/**
 * Remote control types
 */
export type RemoteType = 'androidTv' | 'androidPhone' | 'none';

/**
 * Device preview props
 */
export interface DevicePreviewProps {
  device: DeviceConfig;
  onClick: (device: DeviceConfig) => void;
}

/**
 * Device modal props
 */
export interface DeviceModalProps {
  device: DeviceConfig | null;
  isOpen: boolean;
  onClose: () => void;
}
