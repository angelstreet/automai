/**
 * Device API Service
 * 
 * This service handles all API calls related to device management.
 */

import { useMemo } from 'react';
import { useRegistration } from '../contexts/RegistrationContext';

export interface Device {
  id: string;
  device_id?: string;
  name: string;
  device_name?: string;
  model: string;
  device_model?: string;
  description?: string;
  status: string;
  last_seen: number;
  capabilities: string[];
  controller_configs?: any; // Controller configurations object
  connection?: {
    flask_url: string;
    nginx_url: string;
  };
  host_id?: string;
  host_name?: string;
  host_ip?: string;
  host_port?: string;
  device_ip?: string;
  device_port?: string;
}

export interface DeviceCreatePayload {
  name: string;
  model: string;
  description?: string;
  controllerConfigs?: any; // Controller configurations for creation
}

export interface ApiResponse<T> {
  status: string;
  device?: T;
  devices?: T[];
  error?: string;
}

class DeviceApiService {
  private buildUrl: (endpoint: string) => string;

  constructor(buildUrl: (endpoint: string) => string) {
    this.buildUrl = buildUrl;
  }

  /**
   * Get all devices
   */
  async getAllDevices(): Promise<Device[]> {
    try {
      const response = await fetch(this.buildUrl('/api/devices'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching devices:', error);
      throw error;
    }
  }

  /**
   * Get a specific device by ID
   */
  async getDevice(id: string): Promise<Device> {
    try {
      const response = await fetch(this.buildUrl(`/api/devices/${id}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching device ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create a new device
   */
  async createDevice(payload: DeviceCreatePayload): Promise<Device> {
    try {
      const response = await fetch(this.buildUrl('/api/devices'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse<Device> = await response.json();
      if (data.status === 'success' && data.device) {
        return data.device;
      } else {
        throw new Error(data.error || 'Failed to create device');
      }
    } catch (error) {
      console.error('Error creating device:', error);
      throw error;
    }
  }

  /**
   * Update an existing device
   */
  async updateDevice(id: string, payload: DeviceCreatePayload): Promise<Device> {
    try {
      const response = await fetch(this.buildUrl(`/api/devices/${id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data: ApiResponse<Device> = await response.json();
      if (data.status === 'success' && data.device) {
        return data.device;
      } else {
        throw new Error(data.error || 'Failed to update device');
      }
    } catch (error) {
      console.error(`Error updating device ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a device
   */
  async deleteDevice(id: string): Promise<void> {
    try {
      const response = await fetch(this.buildUrl(`/api/devices/${id}`), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.status !== 'success') {
        throw new Error(data.error || 'Failed to delete device');
      }
    } catch (error) {
      console.error(`Error deleting device ${id}:`, error);
      throw error;
    }
  }
}

// Hook to create service instance with context
export const useDeviceApi = () => {
  const { buildServerUrl } = useRegistration();
  
  // Use useMemo to create a stable reference to prevent infinite loops
  return useMemo(() => {
    return new DeviceApiService(buildServerUrl);
  }, [buildServerUrl]);
}; 