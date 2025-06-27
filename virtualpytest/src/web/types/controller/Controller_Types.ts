/**
 * Controller Types - Definitions for device controllers and their capabilities
 *
 * This file defines:
 * 1. Device model to controller mapping
 * 2. Verification controller types and their available operations
 * 3. Remote controller actions
 * 4. Controller configuration types
 */

/**
 * Device Model to Controller Mapping
 * Maps device models to their supported verification controllers
 */
export const DEVICE_MODEL_CONTROLLER_MAPPING = {
  android_mobile: ['image', 'audio', 'text', 'video', 'adb'],
  android_tv: ['image', 'audio', 'text', 'video'],
  ios_phone: ['image', 'text', 'appium'],
  ios_mobile: ['image', 'text', 'appium'],
  stb: ['image', 'audio', 'text', 'video'],
} as const;

export type DeviceModel = keyof typeof DEVICE_MODEL_CONTROLLER_MAPPING;
export type VerificationControllerType = 'image' | 'audio' | 'text' | 'video' | 'adb' | 'appium';

/**
 * Get verification controller types for a device model
 */
export function getVerificationControllersForModel(model: string): VerificationControllerType[] {
  return [...(DEVICE_MODEL_CONTROLLER_MAPPING[model as DeviceModel] || [])];
}

/**
 * Check if a device model supports a specific verification controller
 */
export function supportsVerificationController(
  model: string,
  controllerType: VerificationControllerType,
): boolean {
  const supportedControllers = getVerificationControllersForModel(model);
  return supportedControllers.includes(controllerType);
}

// Controller interfaces for device control management
export interface Controller {
  id: string;
  name: string;
  type: 'remote' | 'av' | 'verification';
  config: { [key: string]: any };
  device_name: string;
  team_id: string;
  created_at?: string;
  updated_at?: string;
}

// Controller type constants for validation
export const ControllerTypes = {
  REMOTE: 'remote',
  AV: 'av',
  VERIFICATION: 'verification',
} as const;

export type ControllerType = (typeof ControllerTypes)[keyof typeof ControllerTypes];

// Controller status interface
export interface ControllerStatus {
  id: string;
  status: 'available' | 'in_use' | 'maintenance' | 'offline';
  last_seen?: string;
  current_session?: string;
}

// Controller capability interface
export interface ControllerCapability {
  type: ControllerType;
  name: string;
  description: string;
  supported_devices: string[]; // Device types this controller supports
  required_config: string[]; // Required configuration fields
}

// =====================================================
// CONTROLLER CONFIGURATION TYPES (moved from Common_Base_Types)
// =====================================================

export type ControllerTypeExtended = 'remote' | 'av' | 'verification' | 'network' | 'power';

export type RemoteControllerImplementation =
  | 'android_tv'
  | 'android_mobile'
  | 'ir_remote'
  | 'bluetooth_remote';

export type AVControllerImplementation = 'hdmi_stream';

export type VerificationControllerImplementation =
  | 'adb_verification'
  | 'image_verification'
  | 'text_verification';

export type NetworkControllerImplementation = 'network' | 'rtsp' | 'http_stream' | 'webrtc';

export type PowerControllerImplementation = 'mock' | 'smart_plug' | 'ipmi';

export interface ControllerInputField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'number' | 'select' | 'textarea';
  required: boolean;
  placeholder?: string;
  defaultValue?: string | number;
  description?: string;
  options?: { value: string; label: string }[]; // For select fields
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
  };
}

export interface ControllerConfiguration {
  id: string;
  name: string;
  description: string;
  implementation: string;
  status: 'available' | 'placeholder' | 'unavailable';
  inputFields: ControllerInputField[];
}

export interface ControllerConfigMap {
  remote: ControllerConfiguration[];
  av: ControllerConfiguration[];
  verification: ControllerConfiguration[];
  network: ControllerConfiguration[];
  power: ControllerConfiguration[];
}

// Device form data with controller configurations
export interface DeviceFormData {
  name: string;
  description: string;
  model: string;
  controllerConfigs: {
    [controllerType: string]: {
      implementation: string;
      parameters: { [key: string]: any };
    };
  };
}

// All controller configuration types are now defined above in this file
