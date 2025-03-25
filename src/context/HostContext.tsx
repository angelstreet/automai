'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
  useMemo,
} from 'react';
import { useHosts, useHostById, refreshHosts, testConnection } from '@/hooks/useHostData';
import type { Host, HostConnectionStatus } from '@/app/[locale]/[tenant]/hosts/types';
import type { ContextError, LoadingStatus } from '@/types/context/host';
import { 
  createHost, 
  updateHost, 
  deleteHost 
} from '@/app/[locale]/[tenant]/hosts/actions';

// Host context type definition
interface HostContextType {
  hosts: Host[];
  filteredHosts: Host[];
  selectedHost: Host | null;
  loading: boolean;
  error: ContextError | null;
  connectionStatuses: Record<string, HostConnectionStatus>;
  loadingStatus: LoadingStatus;
  filter: {
    query: string;
    status: string;
    type: string;
    sortBy: string;
    sortDir: string;
  };
  // Methods
  fetchHosts: () => Promise<Host[]>;
  getHostById: (id: string) => Promise<Host | null>;
  addHost: (hostData: Omit<Host, 'id'>) => Promise<{ success: boolean; hostId?: string; error?: string }>;
  updateHostById: (id: string, updates: Partial<Omit<Host, 'id'>>) => Promise<{ success: boolean; error?: string }>;
  removeHost: (id: string) => Promise<{ success: boolean; error?: string }>;
  testConnection: (id: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  filterHosts: (filterOptions: any) => void;
  selectHost: (host: Host | null) => void;
  isLoading: (operation?: string, entityId?: string) => boolean;
  resetLoadingState: () => void;
}

// Create context
const HostContext = createContext<HostContextType | undefined>(undefined);

// Provider component
export function HostProvider({ children }: { children: ReactNode }) {
  // Use SWR hook for hosts data
  const { data, error, mutate } = useHosts();
  
  // Local state
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [connectionStatuses, setConnectionStatuses] = useState<Record<string, HostConnectionStatus>>({});
  const [loadingStatus, setLoadingStatus] = useState<LoadingStatus>({
    state: 'idle',
    operation: null,
    entityId: null
  });
  const [filter, setFilter] = useState({
    query: '',
    status: 'all',
    type: 'all',
    sortBy: 'name',
    sortDir: 'asc',
  });
  
  // Extract hosts from data
  const hosts = useMemo(() => 
    data || [], 
    [data]
  );
  
  // Apply filters to hosts
  const filteredHosts = useMemo(() => {
    let filtered = [...hosts];
    
    // Text search
    if (filter.query) {
      const query = filter.query.toLowerCase();
      filtered = filtered.filter(
        host => 
          host.name.toLowerCase().includes(query) ||
          host.hostname?.toLowerCase().includes(query) ||
          (host.description && host.description.toLowerCase().includes(query))
      );
    }
    
    // Status filter
    if (filter.status !== 'all') {
      filtered = filtered.filter(host => {
        const status = connectionStatuses[host.id];
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
        const statusA = connectionStatuses[a.id]?.status || 'unknown';
        const statusB = connectionStatuses[b.id]?.status || 'unknown';
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
  }, [hosts, filter, connectionStatuses]);
  
  // Methods
  const fetchHosts = useCallback(async () => {
    setLoadingStatus({
      state: 'loading',
      operation: 'fetch_hosts',
      entityId: null
    });
    
    try {
      await mutate();
      
      setLoadingStatus({
        state: 'success',
        operation: 'fetch_hosts',
        entityId: null
      });
      
      return hosts;
    } catch (err) {
      setLoadingStatus({
        state: 'error',
        operation: 'fetch_hosts',
        entityId: null
      });
      
      return [];
    }
  }, [mutate, hosts]);
  
  const getHostById = useCallback(async (id: string) => {
    setLoadingStatus({
      state: 'loading',
      operation: 'get_host',
      entityId: id
    });
    
    try {
      const { data } = await useHostById(id);
      
      setLoadingStatus({
        state: 'success',
        operation: 'get_host',
        entityId: id
      });
      
      return data || null;
    } catch (err) {
      setLoadingStatus({
        state: 'error',
        operation: 'get_host',
        entityId: id
      });
      
      return null;
    }
  }, []);
  
  const addHost = useCallback(async (hostData: Omit<Host, 'id'>) => {
    setLoadingStatus({
      state: 'loading',
      operation: 'add_host',
      entityId: null
    });
    
    try {
      const result = await createHost(hostData);
      
      if (result.success) {
        // Refresh the hosts list
        await refreshHosts();
        await mutate();
        
        setLoadingStatus({
          state: 'success',
          operation: 'add_host',
          entityId: result.data?.id
        });
        
        return { 
          success: true, 
          hostId: result.data?.id 
        };
      } else {
        setLoadingStatus({
          state: 'error',
          operation: 'add_host',
          entityId: null
        });
        
        return { 
          success: false, 
          error: result.error 
        };
      }
    } catch (err: any) {
      setLoadingStatus({
        state: 'error',
        operation: 'add_host',
        entityId: null
      });
      
      return { 
        success: false, 
        error: err.message 
      };
    }
  }, [mutate]);
  
  const updateHostById = useCallback(async (id: string, updates: Partial<Omit<Host, 'id'>>) => {
    setLoadingStatus({
      state: 'loading',
      operation: 'update_host',
      entityId: id
    });
    
    try {
      const result = await updateHost(id, updates);
      
      if (result.success) {
        // Refresh the hosts list and specific host
        await refreshHosts({ hostId: id });
        await mutate();
        
        setLoadingStatus({
          state: 'success',
          operation: 'update_host',
          entityId: id
        });
        
        return { success: true };
      } else {
        setLoadingStatus({
          state: 'error',
          operation: 'update_host',
          entityId: id
        });
        
        return { 
          success: false, 
          error: result.error 
        };
      }
    } catch (err: any) {
      setLoadingStatus({
        state: 'error',
        operation: 'update_host',
        entityId: id
      });
      
      return { 
        success: false, 
        error: err.message 
      };
    }
  }, [mutate]);
  
  const removeHost = useCallback(async (id: string) => {
    setLoadingStatus({
      state: 'loading',
      operation: 'remove_host',
      entityId: id
    });
    
    try {
      const result = await deleteHost(id);
      
      if (result.success) {
        // Refresh the hosts list
        await refreshHosts();
        await mutate();
        
        // If the deleted host was selected, clear the selection
        if (selectedHost && selectedHost.id === id) {
          setSelectedHost(null);
        }
        
        setLoadingStatus({
          state: 'success',
          operation: 'remove_host',
          entityId: id
        });
        
        return { success: true };
      } else {
        setLoadingStatus({
          state: 'error',
          operation: 'remove_host',
          entityId: id
        });
        
        return { 
          success: false, 
          error: result.error 
        };
      }
    } catch (err: any) {
      setLoadingStatus({
        state: 'error',
        operation: 'remove_host',
        entityId: id
      });
      
      return { 
        success: false, 
        error: err.message 
      };
    }
  }, [mutate, selectedHost]);
  
  const testHostConnection = useCallback(async (id: string) => {
    setLoadingStatus({
      state: 'loading',
      operation: 'test_connection',
      entityId: id
    });
    
    try {
      // Update connection status to testing
      setConnectionStatuses(prev => ({
        ...prev,
        [id]: {
          status: 'testing',
          lastChecked: new Date().toISOString()
        }
      }));
      
      const result = await testConnection(id);
      
      // Update connection status based on result
      setConnectionStatuses(prev => ({
        ...prev,
        [id]: {
          status: result.success ? 'connected' : 'failed',
          lastChecked: new Date().toISOString(),
          message: result.message || result.error
        }
      }));
      
      setLoadingStatus({
        state: result.success ? 'success' : 'error',
        operation: 'test_connection',
        entityId: id
      });
      
      return result;
    } catch (err: any) {
      // Update connection status to failed
      setConnectionStatuses(prev => ({
        ...prev,
        [id]: {
          status: 'failed',
          lastChecked: new Date().toISOString(),
          message: err.message
        }
      }));
      
      setLoadingStatus({
        state: 'error',
        operation: 'test_connection',
        entityId: id
      });
      
      return { 
        success: false, 
        error: err.message 
      };
    }
  }, []);
  
  const filterHosts = useCallback((filterOptions: any) => {
    setFilter(prev => ({ ...prev, ...filterOptions }));
  }, []);
  
  const selectHost = useCallback((host: Host | null) => {
    setSelectedHost(host);
  }, []);
  
  const isLoading = useCallback((operation?: string, entityId?: string) => {
    if (!operation) {
      return loadingStatus.state === 'loading';
    }
    
    if (!entityId) {
      return loadingStatus.state === 'loading' && loadingStatus.operation === operation;
    }
    
    return (
      loadingStatus.state === 'loading' &&
      loadingStatus.operation === operation &&
      loadingStatus.entityId === entityId
    );
  }, [loadingStatus]);
  
  const resetLoadingState = useCallback(() => {
    setLoadingStatus({
      state: 'idle',
      operation: null,
      entityId: null
    });
  }, []);
  
  // Create context value with memoization
  const contextValue = useMemo(() => ({
    hosts,
    filteredHosts,
    selectedHost,
    loading: !data && !error,
    error: error ? { code: 'FETCH_ERROR', message: String(error) } : null,
    connectionStatuses,
    loadingStatus,
    filter,
    fetchHosts,
    getHostById,
    addHost,
    updateHostById,
    removeHost,
    testConnection: testHostConnection,
    filterHosts,
    selectHost,
    isLoading,
    resetLoadingState,
  }), [
    hosts,
    filteredHosts,
    selectedHost,
    data,
    error,
    connectionStatuses,
    loadingStatus,
    filter,
    fetchHosts,
    getHostById,
    addHost,
    updateHostById,
    removeHost,
    testHostConnection,
    filterHosts,
    selectHost,
    isLoading,
    resetLoadingState,
  ]);
  
  return (
    <HostContext.Provider value={contextValue}>
      {children}
    </HostContext.Provider>
  );
}

// Hook to use the context
export function useHost() {
  const context = useContext(HostContext);
  
  if (context === undefined) {
    throw new Error('useHost must be used within a HostProvider');
  }
  
  return context;
}