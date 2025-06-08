export type ControllerType = 'remote' | 'av' | 'verification' | 'network' | 'power';

export type RemoteControllerImplementation = 
  | 'android_tv' 
  | 'android_mobile' 
  | 'ir_remote' 
  | 'bluetooth_remote';

export type AVControllerImplementation = 
  | 'hdmi_stream';

export type VerificationControllerImplementation = 
  | 'adb_verification'
  | 'image_verification'
  | 'text_verification';

export type NetworkControllerImplementation = 
  | 'network' 
  | 'rtsp' 
  | 'http_stream' 
  | 'webrtc';

export type PowerControllerImplementation = 
  | 'mock' 
  | 'smart_plug' 
  | 'ipmi';

export interface ControllerInputField {
  name: string;
  label: string;
  type: 'text' | 'password' | 'number' | 'select' | 'textarea';
  required: boolean;
  placeholder?: string;
  defaultValue?: string | number;
  description?: string;
  options?: { value: string; label: string; }[]; // For select fields
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