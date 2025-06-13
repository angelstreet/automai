/**
 * Device Models Hook
 *
 * This hook handles all device model operations using React Query for caching
 * and state management. It includes CRUD operations and proper error handling.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { useRegistration } from '../../contexts/RegistrationContext';
import { Model, ModelCreateData } from '../../types/common/Common_BaseTypes';

// Server Response interface
export interface ServerResponse<T> {
  status: string;
  devicemodel?: T;
  error?: string;
}

// Query keys for React Query
const QUERY_KEYS = {
  deviceModels: ['deviceModels'] as const,
  deviceModel: (id: string) => ['deviceModels', id] as const,
};

// Device Model Server Service Class
class DeviceModelServerService {
  private buildUrl: (endpoint: string) => string;

  constructor(buildUrl: (endpoint: string) => string) {
    this.buildUrl = buildUrl;
  }

  /**
   * Get all device models
   */
  async getAllDeviceModels(): Promise<Model[]> {
    try {
      console.log('[@hook:useDeviceModels:getAllDeviceModels] Fetching all device models');
      const response = await fetch(this.buildUrl('/server/devicemodel/getAllModels'), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(
        `[@hook:useDeviceModels:getAllDeviceModels] Successfully fetched ${data.length || 0} device models`,
      );
      return data;
    } catch (error) {
      console.error(
        '[@hook:useDeviceModels:getAllDeviceModels] Error fetching device models:',
        error,
      );
      throw error;
    }
  }

  /**
   * Get a specific device model by ID
   */
  async getDeviceModel(id: string): Promise<Model> {
    try {
      console.log(`[@hook:useDeviceModels:getDeviceModel] Fetching device model: ${id}`);
      const response = await fetch(this.buildUrl(`/server/devicemodel/getDeviceModel/${id}`), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log(
        `[@hook:useDeviceModels:getDeviceModel] Successfully fetched device model: ${id}`,
      );
      return data;
    } catch (error) {
      console.error(
        `[@hook:useDeviceModels:getDeviceModel] Error fetching device model ${id}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Create a new device model
   */
  async createDeviceModel(model: Omit<Model, 'id' | 'created_at' | 'updated_at'>): Promise<Model> {
    try {
      console.log('[@hook:useDeviceModels:createDeviceModel] Creating device model:', model);
      const response = await fetch(this.buildUrl('/server/devicemodel/createDeviceModel'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(model),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const createdModel = result.model;
      console.log(
        `[@hook:useDeviceModels:createDeviceModel] Successfully created device model: ${createdModel.name}`,
      );
      return createdModel;
    } catch (error) {
      console.error(
        '[@hook:useDeviceModels:createDeviceModel] Error creating device model:',
        error,
      );
      throw error;
    }
  }

  /**
   * Update an existing device model
   */
  async updateDeviceModel(
    id: string,
    model: Partial<Omit<Model, 'id' | 'created_at' | 'updated_at'>>,
  ): Promise<Model> {
    try {
      console.log(`[@hook:useDeviceModels:updateDeviceModel] Updating device model: ${id}`, model);
      const response = await fetch(this.buildUrl(`/server/devicemodel/updateDeviceModel/${id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(model),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const updatedModel = result.model;
      console.log(
        `[@hook:useDeviceModels:updateDeviceModel] Successfully updated device model: ${id}`,
      );
      return updatedModel;
    } catch (error) {
      console.error(
        `[@hook:useDeviceModels:updateDeviceModel] Error updating device model ${id}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Delete a device model
   */
  async deleteDeviceModel(id: string): Promise<void> {
    try {
      console.log(`[@hook:useDeviceModels:deleteDeviceModel] Deleting device model: ${id}`);
      const response = await fetch(this.buildUrl(`/server/devicemodel/deleteDeviceModel/${id}`), {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      console.log(
        `[@hook:useDeviceModels:deleteDeviceModel] Successfully deleted device model: ${id}`,
      );
    } catch (error) {
      console.error(
        `[@hook:useDeviceModels:deleteDeviceModel] Error deleting device model ${id}:`,
        error,
      );
      throw error;
    }
  }
}

/**
 * Hook for device model operations
 * Provides CRUD operations with React Query caching and state management
 */
export const useDeviceModels = () => {
  const { buildServerUrl } = useRegistration();
  const queryClient = useQueryClient();

  // Create stable server service instance
  const serverService = useMemo(() => {
    return new DeviceModelServerService(buildServerUrl);
  }, [buildServerUrl]);

  // Get all device models
  const {
    data: models = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.deviceModels,
    queryFn: () => serverService.getAllDeviceModels(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create device model mutation
  const createMutation = useMutation({
    mutationFn: (payload: ModelCreateData) => serverService.createDeviceModel(payload),
    onSuccess: (newModel) => {
      // Add the new model to the cache
      queryClient.setQueryData(QUERY_KEYS.deviceModels, (old: Model[] = []) => [...old, newModel]);
      console.log(
        '[@hook:useDeviceModels:create] Successfully created and cached new device model',
      );
    },
    onError: (error) => {
      console.error('[@hook:useDeviceModels:create] Error creating device model:', error);
    },
  });

  // Update device model mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ModelCreateData }) =>
      serverService.updateDeviceModel(id, payload),
    onSuccess: (updatedModel, variables) => {
      // Update the model in the cache
      queryClient.setQueryData(QUERY_KEYS.deviceModels, (old: Model[] = []) =>
        old.map((model) => (model.id === variables.id ? updatedModel : model)),
      );
      // Also update individual model cache if it exists
      queryClient.setQueryData(QUERY_KEYS.deviceModel(variables.id), updatedModel);
      console.log('[@hook:useDeviceModels:update] Successfully updated and cached device model');
    },
    onError: (error) => {
      console.error('[@hook:useDeviceModels:update] Error updating device model:', error);
    },
  });

  // Delete device model mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => serverService.deleteDeviceModel(id),
    onSuccess: (_, id) => {
      // Remove the model from the cache
      queryClient.setQueryData(QUERY_KEYS.deviceModels, (old: Model[] = []) =>
        old.filter((model) => model.id !== id),
      );
      // Remove individual model cache
      queryClient.removeQueries({ queryKey: QUERY_KEYS.deviceModel(id) });
      console.log('[@hook:useDeviceModels:delete] Successfully deleted and removed from cache');
    },
    onError: (error) => {
      console.error('[@hook:useDeviceModels:delete] Error deleting device model:', error);
    },
  });

  return {
    // Data
    models,

    // Status
    isLoading,
    error: error instanceof Error ? error.message : null,

    // Actions
    refetch,
    createModel: createMutation.mutateAsync,
    updateModel: updateMutation.mutateAsync,
    deleteModel: deleteMutation.mutateAsync,

    // Mutation status
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,

    // Mutation errors
    createError: createMutation.error instanceof Error ? createMutation.error.message : null,
    updateError: updateMutation.error instanceof Error ? updateMutation.error.message : null,
    deleteError: deleteMutation.error instanceof Error ? deleteMutation.error.message : null,
  };
};

/**
 * Hook for getting a single device model by ID
 */
export const useDeviceModel = (id: string) => {
  const { buildServerUrl } = useRegistration();

  // Create stable server service instance
  const serverService = useMemo(() => {
    return new DeviceModelServerService(buildServerUrl);
  }, [buildServerUrl]);

  return useQuery({
    queryKey: QUERY_KEYS.deviceModel(id),
    queryFn: () => serverService.getDeviceModel(id),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
