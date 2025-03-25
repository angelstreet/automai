'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
  useRef,
  useMemo,
} from 'react';
import {
  Host,
  HostFormData,
  HostConnectionStatus,
  HostAnalytics,
} from '@/app/[locale]/[tenant]/hosts/types';
import {
  getHosts,
  getHost,
  createHost,
  updateHost,
  deleteHost,
  testHostConnection,
} from '@/app/[locale]/[tenant]/hosts/actions';
import { HostContextType, HostData } from '@/types/context/host';
import { useRequestProtection } from '@/hooks/useRequestProtection';
import { persistedData } from './AppContext';

// Singleton flag to prevent multiple instances
let HOST_CONTEXT_INITIALIZED = false;

// Reduce logging with a DEBUG flag
const DEBUG = false;
const log = (...args: any[]) => DEBUG && console.log(...args);

// Initial state
const initialHostData: HostData = {
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
    entityId: null,
  },
  filter: {
    query: '',
    status: 'all',
    type: 'all',
    sortBy: 'name',
    sortDir: 'asc',
  },
};

// Create context
const HostContext = createContext<HostContextType | undefined>(undefined);

// Provider component - simplified without authentication checks
export const HostProvider: React.FC<{
  children: ReactNode;
  userData?: any | null;
}> = ({ children, userData }) => {
  log('[HostContext] HostProvider initializing');

  // Check for multiple instances of HostProvider
  useEffect(() => {
    if (HOST_CONTEXT_INITIALIZED) {
      console.warn(
        '[HostContext] Multiple instances of HostProvider detected. ' +
          'This can cause performance issues and unexpected behavior.'
      );
    } else {
      HOST_CONTEXT_INITIALIZED = true;
      log('[HostContext] HostProvider initialized as singleton');
    }

    return () => {
      // Only reset on the instance that set it to true
      if (HOST_CONTEXT_INITIALIZED) {
        HOST_CONTEXT_INITIALIZED = false;
        log('[HostContext] HostProvider singleton instance unmounted');
      }
    };
  }, []);

  // Get initial host data synchronously from localStorage
  const [initialState, setInitialState] = useState<HostData>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cachedHosts = localStorage.getItem('cached_hosts');
        if (cachedHosts) {
          const parsedHosts = JSON.parse(cachedHosts);
          log('[HostContext] Using initial cached host data from localStorage');
          return parsedHosts;
        }
      } catch (e) {
        // Ignore localStorage errors
        log('[HostContext] Error reading from localStorage:', e);
      }
    }
    return initialHostData;
  });

  const [state, setState] = useState<HostData>(initialState);
  
  // Add request protection
  const {
    protectedFetch,
    safeUpdateState,
    renderCount: protectedRenderCount,
  } = useRequestProtection('HostContext');

  // Add initialization tracker
  const initialized = useRef(false);
  
  // Update state with user data from props if provided
  useEffect(() => {
    if (userData && userData !== state.currentUser) {
      setState((prevState) => ({
        ...prevState,
        currentUser: userData,
      }));
    }
  }, [userData, state.currentUser]);

  useEffect(() => {
    if (state.hosts.length > 0) {
      try {
        localStorage.setItem('cached_hosts', JSON.stringify(state));
        log('[HostContext] Saved host data to localStorage');
      } catch (e) {
        log('[HostContext] Error saving to localStorage:', e);
      }
    }
  }, [state.hosts.length]);

  // Apply filters to hosts
  const applyFilters = useCallback(
    (hosts: Host[], filter = state.filter) => {
      let filtered = [...hosts];

      // Text search
      if (filter.query) {
        const query = filter.query.toLowerCase();
        filtered = filtered.filter(
          (host) =>
            host.name.toLowerCase().includes(query) ||
            host.hostname?.toLowerCase().includes(query) ||
            (host.description && host.description.toLowerCase().includes(query)),
        );
      }

      // Status filter
      if (filter.status !== 'all') {
        filtered = filtered.filter((host) => {
          const status = state.connectionStatuses[host.id];
          if (filter.status === 'online' && status?.status === 'connected') return true;
          if (filter.status === 'offline' && (!status || status.status !== 'connected'))
            return true;
          return false;
        });
      }

      // Type filter
      if (filter.type !== 'all') {
        filtered = filtered.filter((host) => host.host_type === filter.type);
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
    },
    [state.filter, state.connectionStatuses],
  );

  // Fetch all hosts - DEFINE THIS BEFORE IT'S USED
  const fetchHosts = useCallback(async () => {
    // Use protectedFetch to prevent duplicate requests
    const hosts = await protectedFetch('fetchHosts', async () => {
      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
        loadingStatus: { state: 'loading', operation: 'fetch_hosts', entityId: null },
      }));

      try {
        // No authentication check needed here, AppContext ensures we're authenticated
        const result = await getHosts(
          { status: state.filter.status !== 'all' ? state.filter.status : undefined },
          state.currentUser
        );

        if (!result.success) {
          setState((prev) => ({
            ...prev,
            error: { code: 'FETCH_ERROR', message: result.error || 'Failed to fetch hosts' },
            loading: false,
            loadingStatus: { state: 'error', operation: 'fetch_hosts', entityId: null },
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
            loadingStatus: { state: 'success', operation: 'fetch_hosts', entityId: null },
          },
          'hosts',
        );

        log('[HostContext] fetchHosts complete', {
          hostCount: fetchedHosts.length,
          filteredCount: filteredHosts.length,
          componentState: 'loaded',
        });

        return fetchedHosts;
      } catch (err: any) {
        log('[HostContext] Error fetching hosts:', err);

        setState((prev) => ({
          ...prev,
          error: { code: 'FETCH_ERROR', message: err.message || 'Failed to load hosts' },
          loading: false,
          loadingStatus: { state: 'error', operation: 'fetch_hosts', entityId: null },
        }));

        return [];
      }
    });

    return hosts || [];
  }, [
    protectedFetch,
    applyFilters,
    safeUpdateState,
    state,
  ]);

  // Initialize by fetching host data
  useEffect(() => {
    const fetchData = async () => {
      // Early return if already initialized
      if (initialized.current) {
        return;
      }

      // First check if we have persisted data
      if (persistedData?.hosts?.length > 0) {
        log('[HostContext] Using persistedData hosts:', persistedData.hosts.length);

        // Update state with persisted data
        setState((prevState) => ({
          ...prevState,
          hosts: persistedData.hosts,
          filteredHosts: persistedData.hosts,
          loading: false,
        }));

        initialized.current = true;
        // Still fetch in background to refresh data
        fetchHosts();
        return;
      }

      // Check legacy persistedData format
      if (persistedData?.hostData?.hosts?.length > 0) {
        log('[HostContext] Using legacy persisted host data:', persistedData.hostData.hosts.length);

        // Update state with persisted data
        setState((prevState) => ({
          ...prevState,
          hosts: persistedData.hostData.hosts,
          filteredHosts: persistedData.hostData.hosts,
          loading: false,
        }));

        initialized.current = true;
        // Still fetch in background to refresh data
        fetchHosts();
        return;
      }

      // Set loading state
      setState((prevState) => ({ ...prevState, loading: true, error: null }));

      try {
        // Call the hosts action
        const response = await getHosts();

        if (response.success && response.data) {
          setState((prevState) => ({
            ...prevState,
            hosts: response.data,
            filteredHosts: response.data,
            loading: false,
          }));
        } else {
          throw new Error(response.error || 'Failed to fetch hosts');
        }
      } catch (err) {
        console.error('[HostContext] Error fetching hosts:', err);
        setState((prevState) => ({
          ...prevState,
          error: { code: 'FETCH_ERROR', message: err.message || 'Failed to fetch hosts' },
          loading: false,
        }));
      }

      initialized.current = true;
    };

    fetchData();
  }, [fetchHosts]); 

  // Rest of the implementation (remaining functions)...
  // Add other methods like getHostById, addHost, etc.

  // Create context value with proper memoization
  const contextValue = useMemo(
    () => ({
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
      getHostById: async (id: string) => null, // Implement this
      addHost: async (hostData: any) => ({ success: false }), // Implement this
      updateHostById: async (id: string, updates: any) => ({ success: false }), // Implement this
      removeHost: async (id: string) => ({ success: false }), // Implement this
      testConnection: async (id: string) => ({ success: false }), // Implement this
      testAllConnections: async () => {}, // Implement this
      isLoading: () => !!state.loading,
      resetLoadingState: () =>
        setState((prev) => ({
          ...prev,
          loading: false,
          loadingStatus: { state: 'idle', operation: null, entityId: null },
        })),
    }),
    [
      // State dependencies
      state.hosts,
      state.filteredHosts,
      state.selectedHost,
      state.connectionStatuses,
      state.hostStats,
      state.hostTerminals,
      state.hostCapabilities,
      state.loadingStatus,
      state.error,
      state.loading,
      state.isScanning,
      state.currentUser,
      state.filter,

      // Function dependencies
      fetchHosts,
    ],
  );

  // Persist host data for cross-page navigation
  useEffect(() => {
    if (typeof persistedData !== 'undefined' && state.hosts.length > 0) {
      persistedData.hosts = state.hosts;
      log('[HostContext] Persisted host data for cross-page navigation');
    }
  }, [state.hosts]);
  
  return <HostContext.Provider value={contextValue}>{children}</HostContext.Provider>;
};

// Hook to use the context - simplified, authentication check is moved to AppContext
export function useHost() {
  const context = useContext(HostContext);
  
  if (context === undefined) {
    throw new Error('useHost must be used within a HostProvider');
  }
  
  return context;
}
