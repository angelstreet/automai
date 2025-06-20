'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useEffect } from 'react';

import {
  getHosts,
  createHost,
  updateHost,
  deleteHost,
  testHostConnection,
  getHostById,
  testConnection,
} from '@/app/actions/hostsAction';
import { useToast } from '@/components/shadcn/use-toast';
import { HostInput } from '@/types/context/hostContextType';

// Generate a unique ID for each hook instance
let hookInstanceCounter = 0;

/**
 * Hook for managing hosts
 *
 * Provides functions for fetching, creating, updating, deleting, and testing hosts
 * Uses React Query for data fetching and caching
 */
export function useHost(componentName = 'unknown') {
  const queryClient = useQueryClient();
  const instanceId = useRef(++hookInstanceCounter);
  const isMounted = useRef(false);

  // Log mount/unmount for debugging
  useEffect(() => {
    const currentInstanceId = instanceId.current;

    if (!isMounted.current) {
      console.log(
        `[@hook:useCICD:useCICD] Hook mounted #${currentInstanceId} in component: ${componentName}`,
      );
      isMounted.current = true;
    }

    return () => {
      console.log(
        `[@hook:useCICD:useCICD] Hook unmounted #${currentInstanceId} from component: ${componentName}`,
      );
    };
  }, [componentName]);

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

      // Log incoming data for debugging
      console.log('[@hook:useHost:createHostMutation] Input data:', {
        name: data.name,
        type: data.type,
        ip: data.ip,
        ip_local: data.ip_local,
        device_type: data.device_type,
        port: data.port,
        status: data.status,
        is_windows: data.is_windows,
      });

      const hostData = {
        ...data,
        // Only set default status to 'connected' for SSH hosts, preserve original status for devices
        status: data.type === 'device' ? data.status || 'pending' : data.status || 'connected',
        created_at: data.created_at || currentDateTime,
        updated_at: data.updated_at || currentDateTime,
        is_windows: data.is_windows ?? false,
      };

      console.log(
        '[@hook:useHost:createHostMutation] Processed data being sent to server action:',
        {
          name: hostData.name,
          type: hostData.type,
          ip: hostData.ip,
          ip_local: hostData.ip_local,
          device_type: hostData.device_type,
          port: hostData.port,
          status: hostData.status,
          is_windows: hostData.is_windows,
        },
      );

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
    mutationFn: (params: string | { id: string; skipRevalidation?: boolean }) => {
      if (typeof params === 'string') {
        // Backward compatibility: if just a string ID is passed
        return testHostConnection(params);
      } else {
        // New format: if an object with ID and options is passed
        return testHostConnection(params.id, { skipRevalidation: params.skipRevalidation });
      }
    },
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

  // Test direct connection mutation - for testing new host configurations
  const testDirectConnectionMutation = useMutation({
    mutationFn: (data: {
      type: string;
      ip: string;
      port?: number;
      username?: string;
      authType?: 'password' | 'privateKey';
      password?: string;
      privateKey?: string;
    }) => {
      console.log('[@hook:useHost:testDirectConnection] Testing connection with config:', {
        type: data.type,
        ip: data.ip,
        port: data.port,
        username: data.username,
        authType: data.authType,
        hasPassword: !!data.password,
        hasPrivateKey: !!data.privateKey,
      });
      return testConnection(data);
    },
    onSuccess: (response: {
      success: boolean;
      error?: string;
      message?: string;
      is_windows?: boolean;
    }) => {
      // Don't show success toast to avoid UI clutter, but log the result
      console.log('[@hook:useHost:testDirectConnection] Test result:', {
        success: response.success,
        error: response.error,
        is_windows: response.is_windows,
      });
      return response;
    },
    onError: (error: any) => {
      console.error('[@hook:useHost:testDirectConnection] Error:', error);
      // Don't show error toast - let the UI handle error display
      return {
        success: false,
        error: error.message || 'Failed to test connection',
      };
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
    testDirectConnection: testDirectConnectionMutation.mutateAsync,

    // Mutation status
    isCreating: createHostMutation.isPending,
    isUpdating: updateHostMutation.isPending,
    isDeleting: deleteHostMutation.isPending,
    isTesting: testConnectionMutation.isPending || testDirectConnectionMutation.isPending,
  };
}
