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
import { AuthUser } from '@/types/user';
import { HostContextType, HostData, HostActions } from '@/types/context/host';
import { useRequestProtection } from '@/hooks/useRequestProtection';
import { persistedData, InnerAppContext } from './AppContext';
import { useUser } from '@/context'; // Import useUser from centralized context

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

// Provider component
export const HostProvider: React.FC<{
  children: ReactNode;
  userData?: AuthUser | null;
}> = ({ children, userData }) => {
  log('[HostContext] HostProvider initializing');

  // Check for multiple instances of HostProvider
  useEffect(() => {
    if (HOST_CONTEXT_INITIALIZED) {
      console.warn(
        '[HostContext] Multiple instances of HostProvider detected. ' +
          'This can cause performance issues and unexpected behavior. ' +
          'Ensure that HostProvider is only used once in the component tree, ' +
          'preferably in the AppProvider.',
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

  // Get user data from UserContext instead of fetching directly
  const userContext = useUser();

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
  // Add render count for debugging
  const renderCount = useRef<number>(0);

  // Add request protection
  const {
    protectedFetch,
    safeUpdateState,
    renderCount: protectedRenderCount,
  } = useRequestProtection('HostContext');

  // Add initialization tracker
  const initialized = useRef(false);
  // Add a data loaded tracker to prevent multiple data loads
  const dataLoaded = useRef(false);

  // Update local state with user data from UserContext
  useEffect(() => {
    if (userContext?.user && userContext.user !== state.currentUser) {
      log('[HostContext] Updating user data from UserContext:', {
        id: userContext.user.id,
        tenant: userContext.user.tenant_name,
        role: userContext.user.role,
      });
      setState((prevState) => ({
        ...prevState,
        currentUser: userContext.user,
      }));
    }
  }, [userContext?.user, state.currentUser]);

  // Get user data from UserContext or fall back to provided userData
  const getUserData = useCallback((): AuthUser | null => {
    // First try to get from state
    if (state.currentUser) {
      return state.currentUser;
    }

    // Then try from UserContext - add null check
    if (userContext?.user) {
      return userContext.user;
    }

    // Finally try from props
    if (userData) {
      return userData;
    }

    return null;
  }, [state.currentUser, userContext?.user, userData]);

  // Refresh user data (now just gets it from UserContext)
  const refreshUserData = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const user = getUserData();
      if (!user && userContext?.refreshUser) {
        // If we don't have user data, try to refresh it from UserContext
        await userContext.refreshUser();
        // Now check if it's available
        if (userContext?.user) {
          setState((prev) => ({ ...prev, currentUser: userContext.user }));
          return userContext.user;
        }
      } else if (user) {
        setState((prev) => ({ ...prev, currentUser: user }));
        return user;
      }

      log('[HostContext] No user data available');
      return null;
    } catch (err) {
      log('[HostContext] Error getting user data:', err);
      return null;
    }
  }, [getUserData, userContext]);

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

  // Update filters
  const updateFilter = useCallback(
    (newFilter: Partial<typeof state.filter>) => {
      setState((prev) => {
        const updatedFilter = { ...prev.filter, ...newFilter };
        const filteredHosts = applyFilters(prev.hosts, updatedFilter);

        return {
          ...prev,
          filter: updatedFilter,
          filteredHosts,
        };
      });
    },
    [applyFilters],
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
        // Get user data from UserContext first
        const user = getUserData() || (await refreshUserData());

        log('[HostContext] fetchHosts called', {
          hasUser: !!user,
          userSource: user
            ? user === userContext.user
              ? 'UserContext'
              : user === state.currentUser
                ? 'state'
                : 'refreshed'
            : 'none',
          renderCount: protectedRenderCount,
          componentState: 'loading',
        });

        // Pass user data to the action to avoid server refetching
        const result = await getHosts(
          { status: state.filter.status !== 'all' ? state.filter.status : undefined },
          user,
          'HostContext',
          protectedRenderCount,
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
    getUserData,
    refreshUserData,
    applyFilters,
    safeUpdateState,
    state,
    userContext.user,
  ]);

  // Initialize by fetching host data
  useEffect(() => {
    const fetchData = async () => {
      // Early return if already initialized and processed data
      if (initialized.current) {
        return;
      }

      // First check if we have persisted data
      if (persistedData?.hostData?.hosts?.length > 0) {
        console.log(
          '[HostContext] Using persisted host data:',
          persistedData.hostData.hosts.length,
        );

        // Update state with persisted data
        setState((prevState) => ({
          ...prevState,
          hosts: persistedData.hostData.hosts,
          filteredHosts: persistedData.hostData.hosts,
          loading: false,
        }));

        initialized.current = true;
        return;
      }

      // Set loading state
      setState((prevState) => ({ ...prevState, loading: true, error: null }));

      try {
        // Get user data from UserContext if available
        const user = getUserData();

        // Call the hosts action with user data if available
        const response = await getHosts(
          undefined, // No filter for initial load
          user, // Pass user data from UserContext if available
        );

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
  }, [getUserData]); // Include getUserData in dependencies

  // Check a host's connection status
  const checkHostStatus = useCallback(
    async (hostId: string): Promise<HostConnectionStatus | null> => {
      try {
        console.log('[HostContext] checkHostStatus called for host:', hostId);

        // Call test connection to check status
        const result = await testHostConnection(hostId);

        const status: HostConnectionStatus = {
          status: result.success ? 'connected' : 'failed',
          lastChecked: new Date().toISOString(),
          message: result.message,
        };

        // Update connection status in state
        setState((prev) => ({
          ...prev,
          connectionStatuses: {
            ...prev.connectionStatuses,
            [hostId]: status,
          },
        }));

        return status;
      } catch (err) {
        log(`[HostContext] Error checking host status for ${hostId}:`, err);
        return null;
      }
    },
    [],
  );

  // Get host by ID
  const getHostById = useCallback(
    async (id: string): Promise<Host | null> => {
      try {
        // First check if we already have the host in state
        const cachedHost = state.hosts.find((host) => host.id === id);
        if (cachedHost) return cachedHost;

        // If not cached, fetch from server
        log('[HostContext] Fetching host by ID:', id);
        const result = await getHost(id);
        return result.success && result.data ? result.data : null;
      } catch (err) {
        log(`[HostContext] Error getting host ${id}:`, err);
        return null;
      }
    },
    [state.hosts],
  );

  // Add a new host
  const addHost = useCallback(
    async (hostData: any): Promise<{ success: boolean; hostId?: string; error?: string }> => {
      try {
        log('[HostContext] Adding new host');

        // Call API to create host
        const result = await createHost(hostData);

        if (result.success && result.data) {
          // Refresh the hosts list after adding
          fetchHosts();
          return { success: true, hostId: result.data.id };
        }

        return { success: false, error: result.error || 'Failed to create host' };
      } catch (err: any) {
        log('[HostContext] Error adding host:', err);
        return { success: false, error: err.message };
      }
    },
    [fetchHosts],
  );

  // Remove a host
  const removeHost = useCallback(
    async (id: string): Promise<{ success: boolean; error?: string }> => {
      try {
        log('[HostContext] Removing host:', id);

        // Call API to delete host
        const result = await deleteHost(id);

        if (result.success) {
          // Update local state
          setState((prev) => ({
            ...prev,
            hosts: prev.hosts.filter((h) => h.id !== id),
            filteredHosts: prev.filteredHosts.filter((h) => h.id !== id),
          }));

          return { success: true };
        }

        return { success: false, error: result.error || 'Failed to delete host' };
      } catch (err: any) {
        log('[HostContext] Error removing host:', err);
        return { success: false, error: err.message };
      }
    },
    [],
  );

  // Update an existing host
  const updateExistingHost = useCallback(
    async (id: string, updates: any): Promise<{ success: boolean; error?: string }> => {
      try {
        log('[HostContext] Updating host:', id);

        // Call API to update host
        const result = await updateHost(id, updates);

        if (result.success && result.data) {
          // Update local state with proper type safety
          setState((prev) => ({
            ...prev,
            hosts: prev.hosts.map((h) => (h.id === id && result.data ? result.data : h)),
            filteredHosts: prev.filteredHosts.map((h) =>
              h.id === id && result.data ? result.data : h,
            ),
          }));

          return { success: true };
        }

        return { success: false, error: result.error || 'Failed to update host' };
      } catch (err: any) {
        log('[HostContext] Error updating host:', err);
        return { success: false, error: err.message };
      }
    },
    [],
  );

  // Test connection
  const testConnection = useCallback(
    async (id: string): Promise<{ success: boolean; error?: string; message?: string }> => {
      try {
        console.log(
          `[${new Date().toISOString()}] [HostContext] Testing connection for host: ${id} - CALLING SERVER ACTION`,
        );

        // First update UI state to show testing
        setState((prevState) => ({
          ...prevState,
          connectionStatuses: {
            ...prevState.connectionStatuses,
            [id]: { status: 'testing', lastChecked: new Date().toISOString() },
          },
        }));

        // Add a delay to show the testing animation
        await new Promise((resolve) => setTimeout(resolve, 1200));

        // Call the actual server action
        const result = await testHostConnection(id);
        console.log(`[${new Date().toISOString()}] [HostContext] Test connection result:`, result);

        // Update the UI with the result
        setState((prevState) => ({
          ...prevState,
          connectionStatuses: {
            ...prevState.connectionStatuses,
            [id]: {
              status: result.success ? 'connected' : 'failed',
              lastChecked: new Date().toISOString(),
              message: result.message || (result.success ? 'Connected' : 'Failed'),
            },
          },
          hosts: prevState.hosts.map((host) =>
            host.id === id ? { ...host, status: result.success ? 'connected' : 'failed' } : host,
          ),
          filteredHosts: prevState.filteredHosts.map((host) =>
            host.id === id ? { ...host, status: result.success ? 'connected' : 'failed' } : host,
          ),
        }));

        return result;
      } catch (err: any) {
        console.error(`[${new Date().toISOString()}] [HostContext] Connection test failed:`, err);

        // Update UI to show failure
        setState((prevState) => ({
          ...prevState,
          connectionStatuses: {
            ...prevState.connectionStatuses,
            [id]: {
              status: 'failed',
              lastChecked: new Date().toISOString(),
              message: err.message || 'Connection test failed',
            },
          },
          hosts: prevState.hosts.map((host) =>
            host.id === id ? { ...host, status: 'failed' } : host,
          ),
          filteredHosts: prevState.filteredHosts.map((host) =>
            host.id === id ? { ...host, status: 'failed' } : host,
          ),
        }));

        return { success: false, error: err.message };
      }
    },
    [],
  );

  // Test all connections
  const testAllConnections = useCallback(async (): Promise<void> => {
    try {
      console.log(
        `[${new Date().toISOString()}] [HostContext] Testing all connections - CALLING SERVER ACTIONS`,
      );

      // Get current list of hosts
      const currentHosts = [...state.hosts];
      console.log(
        `[${new Date().toISOString()}] [HostContext] Testing ${currentHosts.length} hosts`,
      );

      // First update all hosts to testing state in the UI
      setState((prevState) => ({
        ...prevState,
        connectionStatuses: {
          ...prevState.connectionStatuses,
          ...Object.fromEntries(
            currentHosts.map((host) => [
              host.id,
              { status: 'testing', lastChecked: new Date().toISOString() },
            ]),
          ),
        },
        hosts: prevState.hosts.map((host) => ({ ...host, status: 'testing' })),
        filteredHosts: prevState.filteredHosts.map((host) => ({ ...host, status: 'testing' })),
      }));

      // Add a delay to show the testing animation
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // Test each host individually
      for (const host of currentHosts) {
        console.log(`[${new Date().toISOString()}] [HostContext] Testing host: ${host.id}`);

        try {
          // Call the actual server action
          const result = await testHostConnection(host.id);
          console.log(
            `[${new Date().toISOString()}] [HostContext] Test result for ${host.id}:`,
            result,
          );

          // Update the state for this specific host
          setState((prevState) => ({
            ...prevState,
            connectionStatuses: {
              ...prevState.connectionStatuses,
              [host.id]: {
                status: result.success ? 'connected' : 'failed',
                lastChecked: new Date().toISOString(),
                message: result.message || (result.success ? 'Connected' : 'Failed'),
              },
            },
            hosts: prevState.hosts.map((h) =>
              h.id === host.id ? { ...h, status: result.success ? 'connected' : 'failed' } : h,
            ),
            filteredHosts: prevState.filteredHosts.map((h) =>
              h.id === host.id ? { ...h, status: result.success ? 'connected' : 'failed' } : h,
            ),
          }));

          // Small delay between hosts
          await new Promise((resolve) => setTimeout(resolve, 500));
        } catch (hostError) {
          console.error(
            `[${new Date().toISOString()}] [HostContext] Error testing host ${host.id}:`,
            hostError,
          );

          // Update state for the failed host
          setState((prevState) => ({
            ...prevState,
            connectionStatuses: {
              ...prevState.connectionStatuses,
              [host.id]: {
                status: 'failed',
                lastChecked: new Date().toISOString(),
                message: hostError instanceof Error ? hostError.message : 'Test failed',
              },
            },
            hosts: prevState.hosts.map((h) => (h.id === host.id ? { ...h, status: 'failed' } : h)),
            filteredHosts: prevState.filteredHosts.map((h) =>
              h.id === host.id ? { ...h, status: 'failed' } : h,
            ),
          }));

          // Small delay between hosts
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      console.log(`[${new Date().toISOString()}] [HostContext] All hosts tested`);
    } catch (err) {
      console.error(
        `[${new Date().toISOString()}] [HostContext] Test all connections failed:`,
        err,
      );
    }
  }, [state.hosts, testHostConnection]);

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
      getHostById,
      addHost,
      updateHostById: updateExistingHost,
      removeHost,
      testConnection,
      testAllConnections,
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
      getHostById,
      addHost,
      updateExistingHost,
      removeHost,
      testConnection,
      testAllConnections,
    ],
  );

  // Add one useful log when data is loaded
  useEffect(() => {
    if (state.hosts.length > 0 && !state.loading) {
      console.log('[HostContext] Hosts loaded:', {
        count: state.hosts.length,
        filtered: state.filteredHosts.length,
      });
    }
  }, [state.hosts.length, state.filteredHosts.length, state.loading]);

  // Initialize state from persisted data if available
  const [hosts, setHosts] = useState<Host[]>(persistedData?.hostData?.hosts || []);

  const [loading, setLoading] = useState<boolean>(
    persistedData?.hostData?.loading !== undefined ? persistedData.hostData.loading : true,
  );

  // Persist host data for cross-page navigation
  useEffect(() => {
    if (typeof persistedData !== 'undefined') {
      persistedData.hostData = {
        hosts: state.hosts,
        loading: state.loading,
        error: state.error,
        // Include other state you want to persist
      };
      console.log('[HostContext] Persisted host data for cross-page navigation');
    }
  }, [state.hosts, state.loading, state.error]);

  // Register with the central AppContext
  const appContext = useContext(InnerAppContext);
  
  useEffect(() => {
    if (appContext) {
      // Update the central context with this context's values
      appContext.host = contextValue;
      log('[HostContext] Registered with central AppContext');
    }
  }, [appContext, contextValue]);
  
  return <HostContext.Provider value={contextValue}>{children}</HostContext.Provider>;
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
