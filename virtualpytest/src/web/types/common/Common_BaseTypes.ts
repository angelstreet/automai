export interface Model {
  id: string;
  name: string;
  types: string[];
  controllers: {
    remote: string;
    av: string;
    network: string;
    power: string;
  };
  version: string;
  description: string;
}

export type ModelCreateData = Omit<Model, 'id'>;

export const MODEL_TYPES = [
  'Android Mobile',
  'Android TV',
  'Android Tablet',
  'iOs Phone',
  'iOs Tablet',
  'Fire TV',
  'Nvidia Shield',
  'Apple TV',
  'STB',
  'Linux',
  'Windows',
  'Tizen TV',
  'LG TV',
] as const;

export const CONTROLLER_TYPES = [
  'Audio Video Controller',
  'Power Controller',
  'Remote Controller',
  'Network Controller',
] as const;

export type ModelType = (typeof MODEL_TYPES)[number];

// Device types
export interface Device extends DeviceFormData {
  id: string;
  created_at?: string;
  updated_at?: string;
  team_id?: string;
  status?: 'available' | 'in_use' | 'maintenance' | 'offline';
}

// Device create payload type (same as DeviceFormData)
export type DeviceCreatePayload = DeviceFormData;

// Device update payload type (partial DeviceFormData)
export type DeviceUpdatePayload = Partial<DeviceFormData>;

// Device API response types
export interface DeviceApiResponse {
  success: boolean;
  device?: Device;
  error?: string;
}

export interface DevicesListResponse {
  success: boolean;
  devices?: Device[];
  error?: string;
}

// Device model types for compatibility with existing code
export interface DeviceModel {
  id: string;
  name: string;
  types: string[];
  controllers: {
    remote?: string;
    av?: string;
    verification?: string;
    network?: string;
    power?: string;
  };
  version: string;
  description: string;
  created_at?: string;
  updated_at?: string;
  team_id?: string;
}

// Device model create payload
export type DeviceModelCreatePayload = Omit<
  DeviceModel,
  'id' | 'created_at' | 'updated_at' | 'team_id'
>;

// Device model update payload
export type DeviceModelUpdatePayload = Partial<DeviceModelCreatePayload>;

// Device model API response types
export interface DeviceModelApiResponse {
  success: boolean;
  model?: DeviceModel;
  error?: string;
}

export interface DeviceModelsListResponse {
  success: boolean;
  models?: DeviceModel[];
  error?: string;
}

// Controller Configuration Types
export type ControllerType = 'remote' | 'av' | 'verification' | 'network' | 'power';

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

// Wizard step interface
export interface WizardStep {
  id: string;
  title: string;
  description: string;
  component: React.ComponentType<any>;
  isValid: boolean;
  isComplete: boolean;
}

/**
 * Generic server response structure for all endpoints
 */
export interface ServerResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
