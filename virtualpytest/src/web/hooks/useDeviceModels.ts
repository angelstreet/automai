import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deviceModelService } from '../services/deviceModelService';
import { Model } from '../types/model.types';

// Query keys for React Query
const QUERY_KEYS = {
  deviceModels: ['deviceModels'] as const,
  deviceModel: (id: string) => ['deviceModels', id] as const,
};

export const useDeviceModels = () => {
  const queryClient = useQueryClient();

  // Get all device models
  const {
    data: models = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: QUERY_KEYS.deviceModels,
    queryFn: async () => {
      const response = await deviceModelService.getAll();
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch device models');
      }
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Create device model mutation
  const createMutation = useMutation({
    mutationFn: (model: Omit<Model, 'id'>) => deviceModelService.create(model),
    onSuccess: (response) => {
      if (response.success && response.data) {
        // Add the new model to the cache
        queryClient.setQueryData(QUERY_KEYS.deviceModels, (old: Model[] = []) => [
          ...old,
          response.data!
        ]);
        console.log('[@hook:useDeviceModels:create] Successfully created and cached new device model');
      }
    },
    onError: (error) => {
      console.error('[@hook:useDeviceModels:create] Error creating device model:', error);
    },
  });

  // Update device model mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, model }: { id: string; model: Omit<Model, 'id'> }) =>
      deviceModelService.update(id, model),
    onSuccess: (response, variables) => {
      if (response.success && response.data) {
        // Update the model in the cache
        queryClient.setQueryData(QUERY_KEYS.deviceModels, (old: Model[] = []) =>
          old.map((model) => (model.id === variables.id ? response.data! : model))
        );
        console.log('[@hook:useDeviceModels:update] Successfully updated and cached device model');
      }
    },
    onError: (error) => {
      console.error('[@hook:useDeviceModels:update] Error updating device model:', error);
    },
  });

  // Delete device model mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deviceModelService.delete(id),
    onSuccess: (response, id) => {
      if (response.success) {
        // Remove the model from the cache
        queryClient.setQueryData(QUERY_KEYS.deviceModels, (old: Model[] = []) =>
          old.filter((model) => model.id !== id)
        );
        console.log('[@hook:useDeviceModels:delete] Successfully deleted and removed from cache');
      }
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

// Hook for getting a single device model
export const useDeviceModel = (id: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.deviceModel(id),
    queryFn: async () => {
      const response = await deviceModelService.getById(id);
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch device model');
      }
      return response.data!;
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}; 