/**
 * Device API Service
 * 
 * This service handles all API calls related to device management.
 */

export interface Device {
  id: string;
  name: string;
  description: string;
  model: string;
  controller_configs?: any; // JSONB data for controller configurations
  created_at: string;
  updated_at: string;
}

export interface DeviceCreatePayload {
  name: string;
  description?: string;
  model?: string;
  controllerConfigs?: { [key: string]: any }; // Controller configurations from wizard
}

export interface ApiResponse<T> {
  status: string;
  device?: T;
  error?: string;
}

const API_BASE_URL = 'http://localhost:5009/api';

class DeviceApiService {
  /**
   * Get all devices
   */
  async getAllDevices(): Promise<Device[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/devices`, {
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
      const response = await fetch(`${API_BASE_URL}/devices/${id}`, {
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
      const response = await fetch(`${API_BASE_URL}/devices`, {
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
      const response = await fetch(`${API_BASE_URL}/devices/${id}`, {
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
      const response = await fetch(`${API_BASE_URL}/devices/${id}`, {
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

// Export a singleton instance
export const deviceApi = new DeviceApiService(); 