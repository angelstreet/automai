// Export layout configurations
export * from './layoutConfig';

// Export remote panel configurations
export * from './remote/remotePanelLayout';

// Export AV panel configurations
export * from './av/avPanelLayout';

// Export power configurations
export * from './powerConfigs';

// Export validation colors
export * from './validationColors';

// Remote Configurations
export {
  androidMobileRemoteConfig,
  type AndroidMobileRemoteConfig,
} from './remote/androidMobileRemote';
export { androidTvRemoteConfig, type AndroidTvRemoteConfig } from './remote/androidTvRemote';
export { bluetoothRemoteConfig, type BluetoothRemoteConfig } from './remote/bluetoothRemote';
export { infraredRemoteConfig, type InfraredRemoteConfig } from './remote/infraredRemote';

// AV Configurations
export { hdmiStreamConfig, type HdmiStreamConfig } from './av/hdmiStream';

// Import types for union types
import type { HdmiStreamConfig } from './av/hdmiStream';
import type { AndroidMobileRemoteConfig } from './remote/androidMobileRemote';
import type { AndroidTvRemoteConfig } from './remote/androidTvRemote';
import type { BluetoothRemoteConfig } from './remote/bluetoothRemote';
import type { InfraredRemoteConfig } from './remote/infraredRemote';

// Union types for all configurations
export type RemoteConfig =
  | AndroidMobileRemoteConfig
  | AndroidTvRemoteConfig
  | BluetoothRemoteConfig
  | InfraredRemoteConfig;

export type RemoteType = RemoteConfig['remote_info']['type'];

export type StreamConfig = HdmiStreamConfig;

export type StreamType = StreamConfig['stream_info']['type'];
