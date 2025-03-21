'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
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
export const HostProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<HostData>(initialState);
  
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
        host.hostname.toLowerCase().includes(query) ||
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

  // Fetch all hosts
  const fetchHosts = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Use cached user data when available
      const user = state.currentUser || await refreshUserData();
      console.log('[HostContext] fetchHosts called', {
        hasUser: !!user,
        renderCount: renderCount.current++,
        componentState: 'loading'
      });
      
      // Pass user data to the action to avoid server refetching
      const result = await getHosts(state.filter, user, 'HostContext', renderCount.current);
      
      if (!result.success) {
        setState(prev => ({
          ...prev,
          error: result.error || 'Failed to fetch hosts',
          loading: false
        }));
        return [];
      }
      
      const hosts = result.data || [];
      const filteredHosts = applyFilters(hosts);
      
      setState(prev => ({ 
        ...prev, 
        hosts, 
        filteredHosts,
        loading: false 
      }));
      
      // Check connection status for all hosts
      hosts.forEach(host => {
        checkHostStatus(host.id);
      });
      
      console.log('[HostContext] fetchHosts complete', {
        hostCount: hosts.length,
        filteredCount: filteredHosts.length,
        componentState: 'loaded'
      });
      
      return hosts;
    } catch (err: any) {
      console.error('[HostContext] Error fetching hosts:', err);
      setState(prev => ({ 
        ...prev, 
        error: err.message || 'Failed to load hosts', 
        loading: false 
      }));
      return [];
    }
  }, [state.currentUser, state.filter, refreshUserData, applyFilters, checkHostStatus]);

  // Fetch host by ID
  const getHostById = useCallback(async (id: string): Promise<Host | null> => {
    try {
      // First check if we already have the host in state
      const cachedHost = state.hosts.find(host => host.id === id);
      if (cachedHost) return cachedHost;
      
      return await getHost(id);
    } catch (err) {
      console.error(`Error getting host ${id}:`, err);
      return null;
    }
  }, [state.hosts]);

  // Add a new host
  const addHost = useCallback(async (data: HostFormData): Promise<{ success: boolean; hostId?: string; error?: string }> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await createHost(data);
      
      if (result.success && result.hostId) {
        // Refresh the hosts list to include the new host
        fetchHosts();
        return { success: true, hostId: result.hostId };
      }
      
      setState(prev => ({ 
        ...prev, 
        error: result.error || 'Failed to create host', 
        loading: false 
      }));
      
      return { success: false, error: result.error || 'Failed to create host' };
    } catch (err: any) {
      setState(prev => ({ 
        ...prev, 
        error: err.message || 'An unexpected error occurred', 
        loading: false 
      }));
      
      return { success: false, error: err.message || 'An unexpected error occurred' };
    }
  }, [fetchHosts]);

  // Update an existing host
  const updateExistingHost = useCallback(async (id: string, data: Partial<Host>): Promise<{ success: boolean; host?: Host; error?: string }> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await updateHost(id, data);
      
      if (result.success && result.host) {
        // Update the host in the local state
        setState(prev => {
          const updatedHosts = prev.hosts.map(h => 
            h.id === id ? result.host! : h
          );
          
          const filteredHosts = applyFilters(updatedHosts);
          
          return {
            ...prev,
            hosts: updatedHosts,
            filteredHosts,
            loading: false,
            // If this was the selected host, update it too
            selectedHost: prev.selectedHost?.id === id ? result.host : prev.selectedHost
          };
        });
        
        return { success: true, host: result.host };
      }
      
      setState(prev => ({ 
        ...prev, 
        error: result.error || 'Failed to update host', 
        loading: false 
      }));
      
      return { success: false, error: result.error || 'Failed to update host' };
    } catch (err: any) {
      setState(prev => ({ 
        ...prev, 
        error: err.message || 'An unexpected error occurred', 
        loading: false 
      }));
      
      return { success: false, error: err.message || 'An unexpected error occurred' };
    }
  }, [applyFilters]);

  // Delete a host
  const removeHost = useCallback(async (id: string): Promise<{ success: boolean; error?: string }> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const result = await deleteHost(id);
      
      if (result.success) {
        // Remove the host from the local state
        setState(prev => {
          const updatedHosts = prev.hosts.filter(h => h.id !== id);
          const filteredHosts = applyFilters(updatedHosts);
          
          // If this was the selected host, clear it
          const selectedHost = prev.selectedHost?.id === id ? null : prev.selectedHost;
          
          // Remove connection status for this host
          const { [id]: _, ...connectionStatuses } = prev.connectionStatuses;
          
          return {
            ...prev,
            hosts: updatedHosts,
            filteredHosts,
            selectedHost,
            connectionStatuses,
            loading: false
          };
        });
        
        return { success: true };
      }
      
      setState(prev => ({ 
        ...prev, 
        error: result.error || 'Failed to delete host', 
        loading: false 
      }));
      
      return { success: false, error: result.error || 'Failed to delete host' };
    } catch (err: any) {
      setState(prev => ({ 
        ...prev, 
        error: err.message || 'An unexpected error occurred', 
        loading: false 
      }));
      
      return { success: false, error: err.message || 'An unexpected error occurred' };
    }
  }, [applyFilters]);

  // Test connection to a host
  const testHostConnection = useCallback(async (hostData: HostFormData): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await testHostConnection(hostData);
      return result;
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to test connection' };
    }
  }, []);

  // Check a host's connection status
  const checkHostStatus = useCallback(async (hostId: string): Promise<HostConnectionStatus | null> => {
    try {
      // Stub implementation
      console.log('getHostStatus not implemented yet');
      
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
      console.error(`Error checking host status for ${hostId}:`, err);
      return null;
    }
  }, []);

  // Verify SSH fingerprint
  const verifyHostFingerprint = useCallback(async (fingerprint: string): Promise<{ success: boolean; verified: boolean; error?: string }> => {
    try {
      // Stub implementation
      console.log('verifyFingerprint not implemented yet');
      return { success: true, verified: true };
    } catch (err: any) {
      return { 
        success: false, 
        verified: false,
        error: err.message || 'Failed to verify fingerprint' 
      };
    }
  }, []);

  // Scan network for hosts
  const scanNetworkForHosts = useCallback(async (): Promise<Host[]> => {
    setState(prev => ({ ...prev, isScanning: true }));
    
    try {
      // Stub implementation
      console.log('scanNetwork not implemented yet');
      setState(prev => ({ ...prev, isScanning: false }));
      return [];
    } catch (err) {
      setState(prev => ({ ...prev, isScanning: false }));
      console.error('Error scanning network:', err);
      return [];
    }
  }, []);

  // Fetch analytics for a host
  const fetchHostStats = useCallback(async (hostId: string): Promise<HostAnalytics | null> => {
    try {
      // Stub implementation
      console.log('getHostStats not implemented yet');
      
      // Mock stats for UI display
      const mockStats: HostAnalytics = {
        cpu: 25,
        memory: 35,
        disk: 50,
        uptime: '3d 4h 12m',
        lastUpdated: new Date().toISOString()
      };
      
      // Update stats in state
      setState(prev => ({
        ...prev,
        hostStats: {
          ...prev.hostStats,
          [hostId]: mockStats
        }
      }));
      
      return mockStats;
    } catch (err) {
      console.error(`Error fetching stats for host ${hostId}:`, err);
      return null;
    }
  }, []);

  // Select a host
  const selectHost = useCallback((host: Host | null) => {
    setState(prev => ({ ...prev, selectedHost: host }));
    
    // If a host is selected, check its status and fetch stats
    if (host) {
      checkHostStatus(host.id);
      fetchHostStats(host.id);
    }
  }, [checkHostStatus, fetchHostStats]);

  // Send a command to a host
  const sendCommandToHost = useCallback(async (hostId: string, command: string): Promise<{ success: boolean; output?: string; error?: string }> => {
    try {
      // Stub implementation
      console.log('sendCommand not implemented yet');
      return { success: true, output: `Executed command: ${command}` };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to send command' };
    }
  }, []);

  // Get terminals for a host
  const getTerminalsForHost = useCallback(async (hostId: string): Promise<any[]> => {
    try {
      // Stub implementation
      console.log('getHostTerminals not implemented yet');
      
      // Mock terminals for UI display
      const mockTerminals = [
        { id: 'term-1', name: 'Terminal 1', status: 'active' }
      ];
      
      // Update terminals in state
      setState(prev => ({
        ...prev,
        hostTerminals: {
          ...prev.hostTerminals,
          [hostId]: mockTerminals
        }
      }));
      
      return mockTerminals;
    } catch (err) {
      console.error(`Error fetching terminals for host ${hostId}:`, err);
      return [];
    }
  }, []);

  // Execute commands on a host
  const executeCommandsOnHost = useCallback(async (hostId: string, commands: string[]): Promise<{ success: boolean; results?: any[]; error?: string }> => {
    try {
      // Stub implementation
      console.log('executeHostCommands not implemented yet');
      return { 
        success: true, 
        results: commands.map(cmd => ({ 
          command: cmd, 
          output: `Executed: ${cmd}`,
          status: 'success' 
        })) 
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to execute commands' };
    }
  }, []);

  // Abort a command on a host
  const abortCommandOnHost = useCallback(async (hostId: string, commandId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Stub implementation
      console.log('abortHostCommand not implemented yet');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to abort command' };
    }
  }, []);

  // Enable access to a host
  const enableHostAccess = useCallback(async (hostId: string, duration: number): Promise<{ success: boolean; token?: string; error?: string }> => {
    try {
      // Stub implementation
      console.log('enableAccessToHost not implemented yet');
      return { success: true, token: 'mock-access-token' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Failed to enable access' };
    }
  }, []);

  // Fetch host capabilities
  const fetchHostCapabilities = useCallback(async (hostId: string): Promise<any | null> => {
    try {
      // Stub implementation
      console.log('getHostCapabilities not implemented yet');
      
      // Mock capabilities for UI display
      const mockCapabilities = {
        canInstallPackages: true,
        hasDocker: true,
        hasKubernetes: false,
        supportedScripts: ['bash', 'python']
      };
      
      // Update capabilities in state
      setState(prev => ({
        ...prev,
        hostCapabilities: {
          ...prev.hostCapabilities,
          [hostId]: mockCapabilities
        }
      }));
      
      return mockCapabilities;
    } catch (err) {
      console.error(`