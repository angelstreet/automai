/**
 * Device Model API Service
 * 
 * This service handles all API calls related to device model management.
 */

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
  created_at: string;
  updated_at: string;
}

export interface ModelCreatePayload {
  name: string;
  types: string[];
  controllers: {
    remote: string;
    av: string;
    network: string;
    power: string;
  };
  version?: string;
  description?: string;
}

export interface ApiResponse<T> {
  status: string;
  model?: T;
  error?: string;
}

const API_BASE_URL = 'http://localhost:5009/api';

class DeviceModelApiService {
  /**
   * Get all device models
   */
  async getAllDeviceModels(): Promise<Model[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/devicemodels`, {
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
      console.error('Error fetching device models:', error);
      throw error;
    }
  }

  /**
   * Get a specific device model by ID
   */
  async getDeviceModel(id: string): Promise<Model> {
    try {
      const response = await fetch(`${API_BASE_URL}/devicemodels/${id}`, {
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
      console.error(`Error fetching device model ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create a new device model
   */
  async createDeviceModel(payload: ModelCreatePayload): Promise<Model> {
    try {
      const response = await fetch(`${API_BASE_URL}/devicemodels`, {
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

      const data: ApiResponse<Model> = await response.json();
      if (data.status === 'success' && data.model) {
        return data.model;
      } else {
        throw new Error(data.error || 'Failed to create device model');
      }
    } catch (error) {
      console.error('Error creating device model:', error);
      throw error;
    }
  }

  /**
   * Update an existing device model
   */
  async updateDeviceModel(id: string, payload: ModelCreatePayload): Promise<Model> {
    try {
      const response = await fetch(`${API_BASE_URL}/devicemodels/${id}`, {
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

      const data: ApiResponse<Model> = await response.json();
      if (data.status === 'success' && data.model) {
        return data.model;
      } else {
        throw new Error(data.error || 'Failed to update device model');
      }
    } catch (error) {
      console.error(`Error updating device model ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a device model
   */
  async deleteDeviceModel(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/devicemodels/${id}`, {
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
        throw new Error(data.error || 'Failed to delete device model');
      }
    } catch (error) {
      console.error(`Error deleting device model ${id}:`, error);
      throw error;
    }
  }
}

// Export a singleton instance
export const deviceModelApi = new DeviceModelApiService(); 