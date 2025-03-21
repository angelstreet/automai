'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
import { Host, HostFormData, HostConnectionStatus, HostAnalytics } from '@/app/[locale]/[tenant]/hosts/types';
import { 
  getHosts,
  getHost,
  createHost,
  updateHost,
  deleteHost,
  testHostConnection
} from '@/app/[locale]/[tenant]/hosts/actions';
import { getUser } from '@/app/actions/user';
import { AuthUser } from '@/types/user';
import { HostContextType, HostData, HostActions } from '@/types/context/host';
import { useRequestProtection } from '@/hooks/useRequestProtection';

// Initial state
const initialState: HostData = {
  hosts: [],
  filteredHosts: [],
  selectedHost: null,
  connectionStatuses: {},
  hostStats: {},
  hostTerminals: {},
  hostCapabilities: {},
  loading: false,
  error: null,
  isScanning: false,
  currentUser: null,
  loadingStatus: {
    state: 'idle',
    operation: null,
    entityId: null
  },
  filter: {
    query: '',
    status: 'all',
    type: 'all',
    sortBy: 'name',
    sortDir: 'asc'
  }
};

// Create context
const HostContext = createContext<HostContextType | undefined>(undefined);

// Provider component
export const HostProvider: React.FC<{ 
  children: ReactNode;
  userData?: AuthUser | null;
}> = ({ children, userData }) => {
  const [state, setState] = useState<HostData>(initialState);
  // Add render count for debugging
  const renderCount = useRef<number>(0);
  
  // Add request protection
  const { protectedFetch, safeUpdateState, renderCount: protectedRenderCount } = useRequestProtection('HostContext');
  
  // Add initialization tracker
  const initialized = useRef(false);
  
  // Fetch user data
  const refreshUserData = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const user = await getUser();
      setState(prev => ({ ...prev, currentUser: user }));
      return user;
    } catch (err) {
      console.error('Error fetching user data:', err);
      return null;
    }
  }, []);

  // Apply filters to hosts
  const applyFilters = useCallback((hosts: Host[], filter = state.filter) => {
    let filtered = [...hosts];
    
    // Text search
    if (filter.query) {
      const query = filter.query.toLowerCase();
      filtered = filtered.filter(host => 
        host.name.toLowerCase().includes(query) || 
        host.hostname?.toLowerCase().includes(query) ||
        (host.description && host.description.toLowerCase().includes(query))
      );
    }
    
    // Status filter
    if (filter.status !== 'all') {
      filtered = filtered.filter(host => {
        const status = state.connectionStatuses[host.id];
        if (filter.status === 'online' && status?.status === 'connected') return true;
        if (filter.status === 'offline' && (!status || status.status !== 'connected')) return true;
        return false;
      });
    }
    
    // Type filter
    if (filter.type !== 'all') {
      filtered = filtered.filter(host => host.host_type === filter.type);
    }
    
    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      if (filter.sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (filter.sortBy === 'status') {
        const statusA = state.connectionStatuses[a.id]?.status || 'unknown';
        const statusB = state.connectionStatuses[b.id]?.status || 'unknown';
        comparison = statusA.localeCompare(statusB);
      } else if (filter.sortBy === 'type') {
        comparison = (a.host_type || '').localeCompare(b.host_type || '');
      } else if (filter.sortBy === 'created') {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        comparison = dateA - dateB;
      }
      
      return filter.sortDir === 'asc' ? comparison : -comparison;
    });
    
    return filtered;
  }, [state.filter, state.connectionStatuses]);

  // Update filters
  const updateFilter = useCallback((newFilter: Partial<typeof state.filter>) => {
    setState(prev => {
      const updatedFilter = { ...prev.filter, ...newFilter };
      const filteredHosts = applyFilters(prev.hosts, updatedFilter);
      
      return {
        ...prev,
        filter: updatedFilter,
        filteredHosts
      };
    });
  }, [applyFilters]);

  // Fetch all hosts - DEFINE THIS BEFORE IT'S USED
  const fetchHosts = useCallback(async () => {
    // Use protectedFetch to prevent duplicate requests
    const hosts = await protectedFetch('fetchHosts', async () => {
      setState(prev => ({ 
        ...prev, 
        loading: true, 
        error: null,
        loadingStatus: { state: 'loading', operation: 'fetch_hosts', entityId: null }
      }));
      
      try {
        // Use cached user data when available
        const user = state.currentUser || await refreshUserData();
        
        console.log('[HostContext] fetchHosts called', {
          hasUser: !!user,
          renderCount: protectedRenderCount,
          componentState: 'loading'
        });
        
        // Pass user data to the action to avoid server refetching
        const result = await getHosts(
          { status: state.filter.status !== 'all' ? state.filter.status : undefined }, 
          user, 
          'HostContext', 
          protectedRenderCount
        );
        
        if (!result.success) {
          setState(prev => ({
            ...prev,
            error: { code: 'FETCH_ERROR', message: result.error || 'Failed to fetch hosts' },
            loading: false,
            loadingStatus: { state: 'error', operation: 'fetch_hosts', entityId: null }
          }));
          return [];
        }
        
        const fetchedHosts = result.data || [];
        const filteredHosts = applyFilters(fetchedHosts);
        
        // Use safeUpdateState to prevent unnecessary re-renders
        safeUpdateState(
          setState,
          { ...state, hosts: state.hosts, filteredHosts: state.filteredHosts },
          { 
            ...state, 
            hosts: fetchedHosts, 
            filteredHosts, 
            loading: false,
            loadingStatus: { state: 'success', operation: 'fetch_hosts', entityId: null }
          },
          'hosts'
        );
        
        console.log('[HostContext] fetchHosts complete', {
          hostCount: fetchedHosts.length,
          filteredCount: filteredHosts.length,
          componentState: 'loaded'
        });
        
        return fetchedHosts;
      } catch (err: any) {
        console.error('[HostContext] Error fetching hosts:', err);
        
        setState(prev => ({ 
          ...prev, 
          error: { code: 'FETCH_ERROR', message: err.message || 'Failed to load hosts' },
          loading: false,
          loadingStatus: { state: 'error', operation: 'fetch_hosts', entityId: null }
        }));
        
        return [];
      }
    });
    
    return hosts || [];
  }, [protectedFetch, refreshUserData, applyFilters, safeUpdateState, state]);

  // Initialize by fetching user data and hosts
  useEffect(() => {
    console.log('[HostContext] Initializing HostContext...');
    
    const initialize = async () => {
      // Prevent double initialization
      if (initialized.current) {
        console.log('[HostContext] Already initialized, skipping');
        return;
      }
      
      initialized.current = true;
      await refreshUserData();
      await fetchHosts();
    };
    
    initialize();
    
    return () => {
      console.log('[HostContext] HostContext unmounting...');
      initialized.current = false;
    };
  // Remove fetchHosts from dependencies to prevent loops
  }, [refreshUserData]);

  // Check a host's connection status
  const checkHostStatus = useCallback(async (hostId: string): Promise<HostConnectionStatus | null> => {
    try {
      // Stub implementation
      console.log('[HostContext] checkHostStatus called for host:', hostId);
      
      // Mock status for UI display
      const mockStatus: HostConnectionStatus = {
        status: 'connected',
        lastChecked: new Date().toISOString()
      };
      
      // Update connection status in state
      setState(prev => ({
        ...prev,
        connectionStatuses: {
          ...prev.connectionStatuses,
          [hostId]: mockStatus
        }
      }));
      
      return mockStatus;
    } catch (err) {
      console.error(`[HostContext] Error checking host status for ${hostId}:`, err);
      return null;
    }
  }, []);

  // Get host by ID
  const getHostById = useCallback(async (id: string): Promise<Host | null> => {
    try {
      // First check if we already have the host in state
      const cachedHost = state.hosts.find(host => host.id === id);
      if (cachedHost) return cachedHost;
      
      // If not cached, fetch from server
      console.log('[HostContext] Fetching host by ID:', id);
      const result = await getHost(id);
      return result.success && result.data ? result.data : null;
    } catch (err) {
      console.error(`[HostContext] Error getting host ${id}:`, err);
      return null;
    }
  }, [state.hosts]);

  // Add a new host
  const addHost = useCallback(async (hostData: any): Promise<{ success: boolean; hostId?: string; error?: string }> => {
    try {
      console.log('[HostContext] Adding new host');
      
      // Mock implementation
      const mockResult = {
        success: true,
        hostId: `new-host-${Date.now()}`
      };
      
      // Refresh the hosts list after adding
      fetchHosts();
      
      return mockResult;
    } catch (err: any) {
      console.error('[HostContext] Error adding host:', err);
      return { success: false, error: err.message };
    }
  }, [fetchHosts]);

  // Remove a host
  const removeHost = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('[HostContext] Removing host:', id);
      
      // Mock implementation
      const mockResult = { success: true };
      
      // Update local state
      setState(prev => ({
        ...prev,
        hosts: prev.hosts.filter(h => h.id !== id),
        filteredHosts: prev.filteredHosts.filter(h => h.id !== id)
      }));
      
      return mockResult;
    } catch (err: any) {
      console.error('[HostContext] Error removing host:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // Update an existing host
  const updateExistingHost = useCallback(async (id: string, updates: any): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('[HostContext] Updating host:', id);
      
      // Mock implementation
      const mockResult = { success: true };
      
      // Update local state
      setState(prev => ({
        ...prev,
        hosts: prev.hosts.map(h => h.id === id ? { ...h, ...updates } : h),
        filteredHosts: prev.filteredHosts.map(h => h.id === id ? { ...h, ...updates } : h)
      }));
      
      return mockResult;
    } catch (err: any) {
      console.error('[HostContext] Error updating host:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // Test connection
  const testConnection = useCallback(async (id: string): Promise<{ success: boolean; error?: string; message?: string }> => {
    try {
      console.log('[HostContext] Testing connection for host:', id);
      
      // Mock implementation
      return { success: true, message: 'Connection successful' };
    } catch (err: any) {
      console.error('[HostContext] Connection test failed:', err);
      return { success: false, error: err.message };
    }
  }, []);

  // Test all connections
  const testAllConnections = useCallback(async (): Promise<void> => {
    try {
      console.log('[HostContext] Testing all connections');
      
      // Mock implementation - do nothing
    } catch (err) {
      console.error('[HostContext] Test all connections failed:', err);
    }
  }, []);

  // Additional stub functions
  const verifyHostFingerprint = useCallback(async () => ({ success: true, verified: true }), []);
  const scanNetworkForHosts = useCallback(async () => [], []);
  const fetchHostStats = useCallback(async () => null, []);
  const selectHost = useCallback((host: Host | null) => {
    setState(prev => ({ ...prev, selectedHost: host }));
  }, []);
  const sendCommandToHost = useCallback(async () => ({ success: true }), []);
  const getTerminalsForHost = useCallback(async () => [], []);
  const executeCommandsOnHost = useCallback(async () => ({ success: true }), []);
  const abortCommandOnHost = useCallback(async () => ({ success: true }), []);
  const enableHostAccess = useCallback(async () => ({ success: true }), []);
  const fetchHostCapabilities = useCallback(async () => null, []);
  const isLoading = useCallback(() => false, []);
  const resetLoadingState = useCallback(() => {}, []);

  // Create context value
  const contextValue = {
    // State properties
    hosts: state.hosts,
    filteredHosts: state.filteredHosts,
    selectedHost: state.selectedHost,
    connectionStatuses: state.connectionStatuses,
    hostStats: state.hostStats,
    hostTerminals: state.hostTerminals,
    hostCapabilities: state.hostCapabilities,
    loadingStatus: state.loadingStatus,
    error: state.error,
    loading: state.loading,
    isScanning: state.isScanning,
    currentUser: state.currentUser,
    filter: state.filter,
    
    // Action methods
    fetchHosts,
    getHostById,
    addHost,
    updateHostById: updateExistingHost,
    removeHost,
    testConnection,
    testAllConnections,
    isLoading: () => !!state.loading,
    resetLoadingState: () => setState(prev => ({
      ...prev, 
      loading: false, 
      loadingStatus: {state: 'idle', operation: null, entityId: null}
    }))
  } as HostContextType;
  
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

// Alias with null-safety for the host context
export function useHost() {
  const context = useContext(HostContext);
  if (context === undefined) {
    console.warn('useHost must be used within a HostProvider, returning null');
    return null;
  }
  return context;
}