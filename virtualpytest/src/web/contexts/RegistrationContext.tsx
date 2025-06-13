import React, { createContext, useContext, useState, useCallback } from 'react';

import { useRegistrationLogic } from '../hooks/useRegistration';
import { Host } from '../types/common/Host_Types';

// Default team ID constant - centralized here for use across the application
export const DEFAULT_TEAM_ID = '7fdeb4bb-3639-4ec3-959f-b54769a219ce';

interface RegistrationContextType {
  // Host data
  availableHosts: Host[];
  selectedHost: Host | null;
  isLoading: boolean;
  error: string | null;

  // Data Management
  fetchHosts: () => Promise<void>;
  selectHost: (hostName: string) => void;
  clearSelection: () => void;

  // Convenience getters
  getHostByName: (hostName: string) => Host | null;
  getAvailableHosts: () => Host[];
}

const RegistrationContext = createContext<RegistrationContextType | undefined>(undefined);

interface RegistrationProviderProps {
  children: React.ReactNode;
}

export const RegistrationProvider: React.FC<RegistrationProviderProps> = ({ children }) => {
  const [availableHosts, setAvailableHosts] = useState<Host[]>([]);
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Use registration logic hook
  const { fetchHosts: fetchHostsLogic } = useRegistrationLogic();

  // Fetch hosts using the hook logic
  const fetchHosts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await fetchHostsLogic();

    setAvailableHosts(result.hosts);
    setError(result.error);
    setIsLoading(false);
  }, [fetchHostsLogic]);

  // Select host by name
  const selectHost = useCallback(
    (hostName: string) => {
      const host = availableHosts.find((h) => h.host_name === hostName);
      if (host) {
        setSelectedHost(host);
        console.log(`[@context:Registration] Selected host: ${host.host_name} (${host.host_url})`);
      } else {
        console.warn(`[@context:Registration] Host with name ${hostName} not found`);
      }
    },
    [availableHosts],
  );

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedHost(null);
    console.log('[@context:Registration] Cleared host selection');
  }, []);

  // Get host by name
  const getHostByName = useCallback(
    (hostName: string) => {
      return availableHosts.find((h) => h.host_name === hostName) || null;
    },
    [availableHosts],
  );

  // Get all available hosts
  const getAvailableHosts = useCallback(() => {
    return availableHosts;
  }, [availableHosts]);

  const value: RegistrationContextType = {
    // State
    availableHosts,
    selectedHost,
    isLoading,
    error,

    // Data Management
    fetchHosts,
    selectHost,
    clearSelection,

    // Convenience getters
    getHostByName,
    getAvailableHosts,
  };

  return <RegistrationContext.Provider value={value}>{children}</RegistrationContext.Provider>;
};

// Hook to use registration context
export const useRegistration = () => {
  const context = useContext(RegistrationContext);
  if (context === undefined) {
    throw new Error('useRegistration must be used within a RegistrationProvider');
  }
  return context;
};
