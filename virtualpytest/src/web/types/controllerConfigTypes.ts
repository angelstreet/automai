// Controller configuration types for device management
export interface DeviceFormData {
  name: string;
  description: string;
  model: string;
  controllerConfigs: { [key: string]: any };
}

// Re-export from Common_BaseTypes for backward compatibility
export type { 
  ControllerConfiguration,
  ControllerInputField,
  ControllerConfigMap 
} from './common/Common_BaseTypes'; 