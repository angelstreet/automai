'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode } from 'react';
import { Host } from '@/app/[locale]/[tenant]/hosts/types';
import {
  getHosts,
  getHost,
  createHost,
  updateHost,
  deleteHost,
  testHostConnection,
} from '@/app/[locale]/[tenant]/hosts/actions';
import { useUser } from '@/context/UserContext';
import { AuthUser, User } from '@/types/user';
import { HostContextType, HostData, HostActions, LoadingStatus } from '@/types/context/host';
import { OPERATIONS, LOADING_STATES, generateErrorCode, ERROR_CODE_PREFIXES } from '@/types/context/constants';

// Interface for structured error handling
interface ContextError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// Initial state for host data
const initialHostData: HostData = {
  hosts: [],
  loadingStatus: {
    state: LOADING_STATES.IDLE,
    operation: null,
    entityId: null
  },
  error: null
};

// Convert User to AuthUser for compatibility with actions
const userToAuthUser = (user: User | null): AuthUser | null => {
  if (!user) return null;
  
  return {
    ...user,
    created_at: new Date().toISOString(), // Use current date as fallback
    updated_at: new Date().toISOString(), // Use current date as fallback
  };
};

// Helper to format errors consistently
const formatError = (error: any, defaultCode = 'UNKNOWN_ERROR'): ContextError => {
  if (typeof error === 'string') {
    return { code: generateErrorCode('HOST', defaultCode), message: error };
  }
  
  if (error instanceof Error) {
    return { code: generateErrorCode('HOST', defaultCode), message: error.message };
  }
  
  if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
    return error as ContextError;
  }
  
  return { 
    code: generateErrorCode('HOST', defaultCode), 
    message: 'An unexpected error occurred',
    details: { originalError: error }
  };
};

// Create context
const HostContext = createContext<HostContextType | undefined>(undefined);

// Host provider component
export const HostProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [hostData, setHostData] = useState<HostData>(initialHostData);
  const { user } = useUser();
  const authUser = useMemo(() => userToAuthUser(user), [user]);

  // Set loading state with operation info
  const setLoading = useCallback((operation: string, entityId?: string | null) => {
    setHostData(prev => ({
      ...prev,
      loadingStatus: {
        state: LOADING_STATES.LOADING,
        operation,
        entityId: entityId || null
      },
      error: null
    }));
  }, []);

  // Set error state with structured error
  const setError = useCallback((error: any, operation: string, entityId?: string | null) => {
    const formattedError = formatError(error, operation);
    
    setHostData(prev => ({
      ...prev,
      loadingStatus: {
        state: LOADING_STATES.ERROR,
        operation,
        entityId: entityId || null
      },
      error: formattedError
    }));
    
    console.error(`Host context error (${operation}):`, formattedError);
    return formattedError;
  }, []);
  
  // Set success state
  const setSuccess = useCallback((operation: string, entityId?: string | null) => {
    setHostData(prev => ({
      ...prev,
      loadingStatus: {
        state: LOADING_STATES.SUCCESS,
        operation,
        entityId: entityId || null
      },
      error: null
    }));
  }, []);

  // Reset loading state
  const resetLoadingState = useCallback(() => {
    setHostData(prev => ({
      ...prev,
      loadingStatus: {
        state: LOADING_STATES.IDLE,
        operation: null,
        entityId: null
      }
    }));
  }, []);

  // Fetch hosts with the current user
  const fetchHosts = useCallback(async () => {
    setLoading(OPERATIONS.FETCH_ALL);
    
    try {
      const result = await getHosts(undefined, authUser);
      
      if (result.success && result.data) {
        setHostData(prev => ({ 
          ...prev, 
          hosts: result.data, 
          loadingStatus: {
            state: LOADING_STATES.SUCCESS,
            operation: OPERATIONS.FETCH_ALL,
            entityId: null
          },
          error: null
        }));
        return result.data;
      } else {
        const error = setError(result.error || 'Failed to fetch hosts', OPERATIONS.FETCH_ALL);
        return [];
      }
    } catch (error: any) {
      setError(error, OPERATIONS.FETCH_ALL);
      return [];
    }
  }, [authUser, setLoading, setError]);

  // Get a specific host by ID
  const getHostById = useCallback(async (id: string): Promise<Host | null> => {
    setLoading(OPERATIONS.FETCH_ONE, id);
    
    try {
      const result = await getHost(id, authUser);
      
      if (result.success && result.data) {
        setSuccess(OPERATIONS.FETCH_ONE, id);
        return result.data;
      }
      
      setError(result.error || 'Host not found', OPERATIONS.FETCH_ONE, id);
      return null;
    } catch (error) {
      setError(error, OPERATIONS.FETCH_ONE, id);
      return null;
    }
  }, [authUser, setLoading, setSuccess, setError]);

  // Add a new host
  const addHost = useCallback(async (hostData: Omit<Host, 'id'>): Promise<{ success: boolean; hostId?: string; error?: string }> => {
    setLoading(OPERATIONS.CREATE);
    
    try {
      const result = await createHost(hostData, authUser);
      
      if (result.success && result.data) {
        setSuccess(OPERATIONS.CREATE);
        // Refresh the hosts list
        fetchHosts();
        return { success: true, hostId: result.data.id };
      }
      
      const error = setError(result.error || 'Failed to create host', OPERATIONS.CREATE);
      return { success: false, error: error.message };
    } catch (error: any) {
      const formattedError = setError(error, OPERATIONS.CREATE);
      return { success: false, error: formattedError.message };
    }
  }, [authUser, fetchHosts, setLoading, setSuccess, setError]);

  // Update an existing host
  const updateHostById = useCallback(async (
    id: string,
    updates: Partial<Omit<Host, 'id'>>
  ): Promise<{ success: boolean; error?: string }> => {
    setLoading(OPERATIONS.UPDATE, id);
    
    try {
      const result = await updateHost(id, updates, authUser);
      
      if (result.success) {
        setSuccess(OPERATIONS.UPDATE, id);
        // Refresh the hosts list
        fetchHosts();
        return { success: true };
      }
      
      const error = setError(result.error || 'Failed to update host', OPERATIONS.UPDATE, id);
      return { success: false, error: error.message };
    } catch (error: any) {
      const formattedError = setError(error, OPERATIONS.UPDATE, id);
      return { success: false, error: formattedError.message };
    }
  }, [authUser, fetchHosts, setLoading, setSuccess, setError]);

  // Delete a host
  const removeHost = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    setLoading(OPERATIONS.DELETE, id);
    
    try {
      const result = await deleteHost(id, authUser);
      
      if (result.success) {
        setSuccess(OPERATIONS.DELETE, id);
        // Refresh the hosts list
        fetchHosts();
        return { success: true };
      }
      
      const error = setError(result.error || 'Failed to delete host', OPERATIONS.DELETE, id);
      return { success: false, error: error.message };
    } catch (error: any) {
      const formattedError = setError(error, OPERATIONS.DELETE, id);
      return { success: false, error: formattedError.message };
    }
  }, [authUser, fetchHosts, setLoading, setSuccess, setError]);

  // Test connection to a host
  const testConnection = useCallback(async (id: string): Promise<{ success: boolean; error?: string; message?: string }> => {
    setLoading(OPERATIONS.TEST_CONNECTION, id);
    
    try {
      const result = await testHostConnection(id, authUser);
      
      if (result.success) {
        setSuccess(OPERATIONS.TEST_CONNECTION, id);
        return { success: true, message: result.message || 'Connection successful' };
      }
      
      const error = setError(result.error || 'Connection failed', OPERATIONS.TEST_CONNECTION, id);
      return { success: false, error: error.message };
    } catch (error: any) {
      const formattedError = setError(error, OPERATIONS.TEST_CONNECTION, id);
      return { success: false, error: formattedError.message };
    }
  }, [authUser, setLoading, setSuccess, setError]);

  // Test connection to all hosts
  const testAllConnections = useCallback(async (): Promise<void> => {
    setLoading(OPERATIONS.TEST_ALL_CONNECTIONS);
    
    try {
      // Get all hosts first
      const hostsResult = await getHosts(undefined, authUser);
      
      if (hostsResult.success && hostsResult.data) {
        const updatedHosts = [...hostsResult.data];
        
        // Test connection for each host
        for (const host of updatedHosts) {
          try {
            const testResult = await testHostConnection(host.id, authUser);
            
            // Update host status based on the test result
            const hostIndex = updatedHosts.findIndex(h => h.id === host.id);
            if (hostIndex >= 0) {
              updatedHosts[hostIndex] = {
                ...updatedHosts[hostIndex],
                status: testResult.success ? 'connected' : 'failed',
                errorMessage: testResult.error
              };
            }
          } catch (hostError) {
            console.error(`Error testing connection for host ${host.id}:`, hostError);
          }
        }
        
        // Update state with the updated hosts
        setHostData(prev => ({ 
          ...prev, 
          hosts: updatedHosts, 
          loadingStatus: {
            state: LOADING_STATES.SUCCESS,
            operation: OPERATIONS.TEST_ALL_CONNECTIONS,
            entityId: null
          },
          error: null
        }));
      } else {
        setError(hostsResult.error || 'Failed to fetch hosts for testing', OPERATIONS.TEST_ALL_CONNECTIONS);
      }
    } catch (error: any) {
      setError(error, OPERATIONS.TEST_ALL_CONNECTIONS);
    }
  }, [authUser, setLoading, setError]);

  // Initialize by fetching hosts
  useEffect(() => {
    if (authUser) {
      fetchHosts();
    }
  }, [authUser, fetchHosts]);

  // Helper for checking if a specific operation is loading
  const isLoading = useCallback((operation?: string, entityId?: string): boolean => {
    const { state, operation: currentOp, entityId: currentEntityId } = hostData.loadingStatus;
    
    if (state !== LOADING_STATES.LOADING) return false;
    
    if (!operation) return state === LOADING_STATES.LOADING;
    
    if (operation && !entityId) {
      return state === LOADING_STATES.LOADING && currentOp === operation;
    }
    
    return state === LOADING_STATES.LOADING && currentOp === operation && currentEntityId === entityId;
  }, [hostData.loadingStatus]);

  // Combine data and actions with memoization to prevent unnecessary renders
  const contextValue = useMemo<HostContextType>(() => ({
    // State
    hosts: hostData.hosts,
    loadingStatus: hostData.loadingStatus,
    error: hostData.error,
    loading: hostData.loadingStatus.state === LOADING_STATES.LOADING,
    
    // Loading status helpers
    isLoading,
    
    // Actions
    fetchHosts,
    getHostById,
    addHost,
    updateHostById,
    removeHost,
    testConnection,
    testAllConnections,
    resetLoadingState
  }), [
    hostData.hosts, 
    hostData.loadingStatus, 
    hostData.error,
    isLoading,
    fetchHosts,
    getHostById,
    addHost,
    updateHostById,
    removeHost,
    testConnection,
    testAllConnections,
    resetLoadingState
  ]);

  return (
    <HostContext.Provider value={contextValue}>
      {children}
    </HostContext.Provider>
  );
};

// Hook to use the context
export function useHostContext() {
  const context = useContext(HostContext);
  if (context === undefined) {
    throw new Error('useHostContext must be used within a HostProvider');
  }
  return context;
} 