import { DeviceFormData } from './controllerConfigTypes';

// Device interface extending the form data with id and additional fields
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
export type DeviceModelCreatePayload = Omit<DeviceModel, 'id' | 'created_at' | 'updated_at' | 'team_id'>;

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

// Re-export DeviceFormData for backward compatibility
export { DeviceFormData } from './controllerConfigTypes'; 