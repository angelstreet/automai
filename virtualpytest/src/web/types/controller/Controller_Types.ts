/**
 * Controller Types - Definitions for device controllers and their capabilities
 *
 * This file defines:
 * 1. Device model to controller mapping
 * 2. Verification controller types and their available operations
 * 3. Remote controller actions
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

// Device form data interface for device management
export interface DeviceFormData {
  name: string;
  description: string;
  model: string;
  controllerConfigs: { [key: string]: any };
}

// Re-export controller configuration types from Common_BaseTypes with correct path
export type {
  ControllerConfiguration,
  ControllerInputField,
  ControllerConfigMap,
  DeviceFormData as CommonDeviceFormData, // Alias to avoid conflict with local DeviceFormData
} from '../common/Common_BaseTypes';

// Import types for creating aliases
import type { ControllerConfiguration } from '../common/Common_BaseTypes';

// Additional type aliases for backward compatibility
export type ControllerImplementation = ControllerConfiguration;
export type ControllerConfig = ControllerConfiguration;
