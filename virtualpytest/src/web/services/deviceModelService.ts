import { Model } from '../types/model.types';

// API helper functions to call the backend
const API_BASE_URL = 'http://localhost:5009';
const DEFAULT_TEAM_ID = "7fdeb4bb-3639-4ec3-959f-b54769a219ce";

const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const teamId = localStorage.getItem('teamId') || sessionStorage.getItem('teamId') || DEFAULT_TEAM_ID;
  
  console.log(`[@service:deviceModelService:apiCall] Making API call to ${endpoint} with team_id: ${teamId}`);
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Team-ID': teamId,
      ...options.headers,
    },
    ...options,
  });
  
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error(`[@service:deviceModelService:apiCall] API call failed: ${response.status} - ${errorText}`);
    throw new Error(`API call failed: ${response.status} - ${errorText}`);
  }
  
  return response.json();
};

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface DatabaseModel {
  id: string;
  team_id: string;
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
  created_by?: string;
  updated_by?: string;
}

// Convert database model to UI model
const convertToUIModel = (dbModel: DatabaseModel): Model => ({
  id: dbModel.id,
  name: dbModel.name,
  types: dbModel.types,
  controllers: dbModel.controllers,
  version: dbModel.version,
  description: dbModel.description,
});

// Convert UI model to database model
const convertToDBModel = (uiModel: Omit<Model, 'id'>, teamId: string): Omit<DatabaseModel, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'updated_by'> => ({
  team_id: teamId,
  name: uiModel.name,
  types: uiModel.types,
  controllers: uiModel.controllers,
  version: uiModel.version,
  description: uiModel.description,
});

// Device Model Service Functions
export const deviceModelService = {
  // Get all device models for the team
  async getAll(): Promise<ApiResponse<Model[]>> {
    try {
      console.log('[@service:deviceModelService:getAll] Fetching all device models');
      const response = await apiCall('/api/virtualpytest/device-models');
      
      if (response.success && response.data) {
        const models = response.data.map(convertToUIModel);
        console.log(`[@service:deviceModelService:getAll] Successfully fetched ${models.length} device models`);
        return { success: true, data: models };
      } else {
        console.error('[@service:deviceModelService:getAll] Invalid response format');
        return { success: false, error: 'Invalid response format' };
      }
    } catch (error) {
      console.error('[@service:deviceModelService:getAll] Error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch device models' 
      };
    }
  },

  // Get a specific device model by ID
  async getById(id: string): Promise<ApiResponse<Model>> {
    try {
      console.log(`[@service:deviceModelService:getById] Fetching device model with ID: ${id}`);
      const response = await apiCall(`/api/virtualpytest/device-models/${id}`);
      
      if (response.success && response.data) {
        const model = convertToUIModel(response.data);
        console.log(`[@service:deviceModelService:getById] Successfully fetched device model: ${model.name}`);
        return { success: true, data: model };
      } else {
        console.error(`[@service:deviceModelService:getById] Model not found: ${id}`);
        return { success: false, error: 'Device model not found' };
      }
    } catch (error) {
      console.error(`[@service:deviceModelService:getById] Error:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch device model' 
      };
    }
  },

  // Create a new device model
  async create(model: Omit<Model, 'id'>): Promise<ApiResponse<Model>> {
    try {
      console.log(`[@service:deviceModelService:create] Creating device model: ${model.name}`);
      const teamId = localStorage.getItem('teamId') || sessionStorage.getItem('teamId') || DEFAULT_TEAM_ID;
      const dbModel = convertToDBModel(model, teamId);
      
      const response = await apiCall('/api/virtualpytest/device-models', {
        method: 'POST',
        body: JSON.stringify(dbModel),
      });
      
      if (response.success && response.data) {
        const createdModel = convertToUIModel(response.data);
        console.log(`[@service:deviceModelService:create] Successfully created device model with ID: ${createdModel.id}`);
        return { success: true, data: createdModel };
      } else {
        console.error('[@service:deviceModelService:create] Failed to create device model');
        return { success: false, error: response.error || 'Failed to create device model' };
      }
    } catch (error) {
      console.error('[@service:deviceModelService:create] Error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create device model' 
      };
    }
  },

  // Update an existing device model
  async update(id: string, model: Omit<Model, 'id'>): Promise<ApiResponse<Model>> {
    try {
      console.log(`[@service:deviceModelService:update] Updating device model: ${id}`);
      const teamId = localStorage.getItem('teamId') || sessionStorage.getItem('teamId') || DEFAULT_TEAM_ID;
      const dbModel = convertToDBModel(model, teamId);
      
      const response = await apiCall(`/api/virtualpytest/device-models/${id}`, {
        method: 'PUT',
        body: JSON.stringify(dbModel),
      });
      
      if (response.success && response.data) {
        const updatedModel = convertToUIModel(response.data);
        console.log(`[@service:deviceModelService:update] Successfully updated device model: ${updatedModel.name}`);
        return { success: true, data: updatedModel };
      } else {
        console.error(`[@service:deviceModelService:update] Failed to update device model: ${id}`);
        return { success: false, error: response.error || 'Failed to update device model' };
      }
    } catch (error) {
      console.error(`[@service:deviceModelService:update] Error:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update device model' 
      };
    }
  },

  // Delete a device model
  async delete(id: string): Promise<ApiResponse<void>> {
    try {
      console.log(`[@service:deviceModelService:delete] Deleting device model: ${id}`);
      const response = await apiCall(`/api/virtualpytest/device-models/${id}`, {
        method: 'DELETE',
      });
      
      if (response.success) {
        console.log(`[@service:deviceModelService:delete] Successfully deleted device model: ${id}`);
        return { success: true };
      } else {
        console.error(`[@service:deviceModelService:delete] Failed to delete device model: ${id}`);
        return { success: false, error: response.error || 'Failed to delete device model' };
      }
    } catch (error) {
      console.error(`[@service:deviceModelService:delete] Error:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete device model' 
      };
    }
  },
}; 