'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';

import { STORAGE_KEYS, ViewMode, DEFAULT_VIEW_MODE } from '@/app/[locale]/[tenant]/hosts/constants';
import {
  getHosts,
  createHost,
  updateHost,
  deleteHost,
  testHostConnection,
  getHostById,
} from '@/app/actions/hostsAction';
import { useToast } from '@/components/shadcn/use-toast';

/**
 * Hook for managing hosts and view preferences
 *
 * Provides functions for fetching, creating, updating, deleting, and testing hosts
 * Also manages view mode preference (grid/table)
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

  // View mode state management
  const [viewMode, setViewMode] = useState<ViewMode>(DEFAULT_VIEW_MODE); // Always start with default

  // Initialize view mode from localStorage, but only on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem(STORAGE_KEYS.HOST_VIEW_MODE);
      console.log(
        `[@hook:useHost] Loading view mode from localStorage: ${savedMode || 'none, using default'}`,
      );

      if (savedMode === 'grid' || savedMode === 'table') {
        setViewMode(savedMode as ViewMode);
      }
    }
  }, []);

  // Update localStorage when viewMode changes, skip initial render
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log(`[@hook:useHost] Saving view mode to localStorage: ${viewMode}`);
      localStorage.setItem(STORAGE_KEYS.HOST_VIEW_MODE, viewMode);
    }
  }, [viewMode]);

  // Toggle view mode function
  const toggleViewMode = () => {
    const newMode = viewMode === 'grid' ? 'table' : 'grid';
    console.log(`[@hook:useHost] Toggling view mode from ${viewMode} to ${newMode}`);
    setViewMode(newMode);
  };

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
    mutationFn: (data: HostInput) => createHost(data),
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
    mutationFn: ({ id, data }: { id: string; data: Partial<HostInput> }) => updateHost(id, data),
    onSuccess: (response) => {
      if (response.success) {
        toast({
          title: 'Success',
          description: 'Host updated successfully',
        });
        queryClient.invalidateQueries({ queryKey: ['hosts'] });
        queryClient.invalidateQueries({ queryKey: ['host', response.data?.id] });
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
      // Refresh host data after testing
      queryClient.invalidateQueries({ queryKey: ['hosts'] });
      queryClient.invalidateQueries({ queryKey: ['host', response.data?.id] });
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

    // View mode
    viewMode,
    setViewMode,
    toggleViewMode,

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
