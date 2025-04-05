'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  getHosts,
  createHost,
  updateHost,
  deleteHost,
  testHostConnection,
  getHostById,
} from '@/app/actions/hostsAction';
import { useToast } from '@/components/shadcn/use-toast';
import { HostInput } from '@/types/context/hostContextType';

/**
 * Hook for managing hosts
 *
 * Provides functions for fetching, creating, updating, deleting, and testing hosts
 * Uses React Query for data fetching and caching
 */
export function useHost() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get all hosts query
  const {
    data: hostsResponse,
    isLoading: isLoadingHosts,
    error: hostsError,
    refetch: refetchHosts,
  } = useQuery({
    queryKey: ['hosts'],
    queryFn: () => getHosts(),
  });

  // Get host by ID query factory
  const getHostQuery = (id: string) => {
    return useQuery({
      queryKey: ['host', id],
      queryFn: () => getHostById(id),
      enabled: !!id,
    });
  };

  // Create host mutation
  const createHostMutation = useMutation({
    mutationFn: (data: HostInput) => {
      // Ensure required fields have default values
      const currentDateTime = new Date().toISOString();
      const hostData = {
        ...data,
        status: data.status || 'connected',
        created_at: data.created_at || currentDateTime,
        updated_at: data.updated_at || currentDateTime,
        is_windows: data.is_windows ?? false,
      };
      return createHost(hostData);
    },
    onSuccess: (response) => {
      if (response.success) {
        queryClient.invalidateQueries({ queryKey: ['hosts'] });
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to create host',
          variant: 'destructive',
        });
      }
      return response;
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create host',
        variant: 'destructive',
      });
    },
  });

  // Update host mutation
  const updateHostMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<HostInput> }) => {
      // Add updated_at timestamp if not provided
      const updatedData = {
        ...data,
        updated_at: data.updated_at || new Date().toISOString(),
      };
      return updateHost(id, updatedData);
    },
    onSuccess: (response) => {
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Host updated successfully',
        });
        queryClient.invalidateQueries({ queryKey: ['hosts'] });
        if (response.data && 'id' in response.data) {
          queryClient.invalidateQueries({ queryKey: ['host', response.data.id] });
        }
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to update host',
          variant: 'destructive',
        });
      }
      return response;
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update host',
        variant: 'destructive',
      });
    },
  });

  // Delete host mutation
  const deleteHostMutation = useMutation({
    mutationFn: (id: string) => deleteHost(id),
    onSuccess: (response) => {
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Host deleted successfully',
        });
        queryClient.invalidateQueries({ queryKey: ['hosts'] });
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to delete host',
          variant: 'destructive',
        });
      }
      return response;
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete host',
        variant: 'destructive',
      });
    },
  });

  // Test host connection
  const testConnectionMutation = useMutation({
    mutationFn: (id: string) => testHostConnection(id),
    onSuccess: (response) => {
      if (response.success) {
        // Success toast removed
      } else {
        toast({
          title: 'Connection Failed',
          description: response.error || 'Could not connect to host',
          variant: 'destructive',
        });
      }

      // REMOVED: Don't automatically refresh host data after testing
      // Let the client decide when to refresh all hosts after testing all connections
      // queryClient.invalidateQueries({ queryKey: ['hosts'] });

      // REMOVED: Don't automatically refresh individual host data
      // if (
      //   typeof response === 'object' &&
      //   response !== null &&
      //   'data' in response &&
      //   response.data &&
      //   typeof response.data === 'object' &&
      //   'id' in response.data
      // ) {
      //   queryClient.invalidateQueries({ queryKey: ['host', response.data.id] });
      // }

      return response;
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to test host connection',
        variant: 'destructive',
      });
    },
  });

  return {
    // Data
    hosts: hostsResponse?.data || [],

    // Status
    isLoading: isLoadingHosts,
    error: hostsError,

    // Query functions
    getHostById: getHostQuery,
    refetchHosts,

    // Mutation functions
    createHost: createHostMutation.mutateAsync,
    updateHost: updateHostMutation.mutateAsync,
    deleteHost: deleteHostMutation.mutateAsync,
    testConnection: testConnectionMutation.mutateAsync,

    // Mutation status
    isCreating: createHostMutation.isPending,
    isUpdating: updateHostMutation.isPending,
    isDeleting: deleteHostMutation.isPending,
    isTesting: testConnectionMutation.isPending,
  };
}
