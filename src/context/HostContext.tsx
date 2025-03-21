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
  // Add render count for debugging
  const renderCount = useRef<number>(0);
  
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

  // Initialize by fetching user data and hosts
  useEffect(() => {
    const initialize = async () => {
      await refreshUserData();
      fetchHosts();
    };
    
    initialize();
  }, [refreshUserData, fetchHosts]);

  // Create context value
  const contextValue: HostContextType = {
    // State
    ...state,
    
    // Actions
    fetchHosts,
    getHost: getHostById,
    addHost,
    updateHost: updateExistingHost,
    deleteHost: removeHost,
    testConnection: testHostConnection,
    checkHostStatus,
    verifyFingerprint: verifyHostFingerprint,
    scanNetwork: scanNetworkForHosts,
    fetchHostStats,
    selectHost,
    updateFilter,
    sendCommand: sendCommandToHost,
    getHostTerminals: getTerminalsForHost,
    executeHostCommands: executeCommandsOnHost,
    abortHostCommand: abortCommandOnHost,
    enableAccessToHost: enableHostAccess,
    fetchHostCapabilities,
    refreshUserData
  };
  
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