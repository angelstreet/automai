/**
 * Device Model API Service
 * 
 * This service handles all API calls related to device model management.
 */

import { useMemo } from 'react';
import { useRegistration } from '../contexts/RegistrationContext';
import { Model, ModelCreateData } from '../types/model.types';

export interface ApiResponse<T> {
  status: string;
  devicemodel?: T;
  error?: string;
}

class DeviceModelApiService {
  private buildUrl: (endpoint: string) => string;

  constructor(buildUrl: (endpoint: string) => string) {
    this.buildUrl = buildUrl;
  }

  /**
   * Get all device models
   */
  async getAllDeviceModels(): Promise<Model[]> {
    try {
      const response = await fetch(this.buildUrl('/api/devicemodels'), {
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
      const response = await fetch(this.buildUrl(`/api/devicemodels/${id}`), {
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
  async createDeviceModel(payload: ModelCreateData): Promise<Model> {
    try {
      const response = await fetch(this.buildUrl('/api/devicemodels'), {
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
      if (data.status === 'success' && data.devicemodel) {
        return data.devicemodel;
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
  async updateDeviceModel(id: string, payload: ModelCreateData): Promise<Model> {
    try {
      const response = await fetch(this.buildUrl(`/api/devicemodels/${id}`), {
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
      if (data.status === 'success' && data.devicemodel) {
        return data.devicemodel;
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
      const response = await fetch(this.buildUrl(`/api/devicemodels/${id}`), {
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

// Hook to create service instance with context
export const useDeviceModelApi = () => {
  const { buildServerUrl } = useRegistration();
  
  // Use useMemo to create a stable reference to prevent infinite loops
  return useMemo(() => {
    return new DeviceModelApiService(buildServerUrl);
  }, [buildServerUrl]);
}; 