/**
 * Controller Hooks
 * Consolidated controller and remote functionality hooks
 */

// Main controller management hook
export { default as useControllers } from '../useControllers';

// Remote control hooks from remote/ directory
export { useControllerTypes } from '../remote/useControllerTypes';
export { useRemoteConnection } from '../remote/useRemoteConnection';
export { 
  getRemoteConfig, 
  REMOTE_CONFIGS, 
  ANDROID_TV_CONFIG, 
  ANDROID_MOBILE_CONFIG,
  IR_CONFIG,
  BLUETOOTH_CONFIG 
} from '../remote/useRemoteConfigs'; 