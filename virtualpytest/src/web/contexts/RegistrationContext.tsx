import React, { createContext, useContext, useState, useCallback } from 'react';

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

  // Device Lock Management
  lockDevice: (hostName: string, sessionId?: string) => Promise<boolean>;
  unlockDevice: (hostName: string) => Promise<boolean>;
  isDeviceLocked: (hostName: string) => boolean;
  canLockDevice: (hostName: string) => boolean;

  // URL Builders (NO hardcoded values)
  vite_buildServerUrl: (endpoint: string) => string; // Frontend to main server
  buildHostWebUrl: (hostName: string, path: string) => string; // To host's nginx

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

  // Server configuration - Use VITE_SERVER_URL for all API calls
  const SERVER_BASE_URL = (import.meta as any).env.VITE_SERVER_URL || 'http://localhost:5109';

  // Build server URL (always goes to main server) - Frontend uses VITE_SERVER_URL
  const vite_buildServerUrl = useCallback(
    (endpoint: string) => {
      const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
      return `${SERVER_BASE_URL}/${cleanEndpoint}`;
    },
    [SERVER_BASE_URL],
  );

  // Fetch hosts from server
  const fetchHosts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const fullUrl = `${SERVER_BASE_URL}/server/system/getAllHosts`;
      const response = await fetch(fullUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      if (result.success) {
        const rawHosts = result.hosts || [];
        console.log(`[@context:Registration] Received ${rawHosts.length} hosts from server`);

        // Use server response directly - no transformation needed
        // Server already returns the correct structure with all host and device info
        setAvailableHosts(rawHosts);
      } else {
        throw new Error(result.error || 'Server returned success: false');
      }
    } catch (err: any) {
      console.error('[@context:Registration] Error fetching hosts:', err);

      setError(err.message || 'Failed to fetch hosts');
      setAvailableHosts([]);
    } finally {
      setIsLoading(false);
    }
  }, [SERVER_BASE_URL]);

  // Build nginx URL (for host media/files)
  const buildHostWebUrl = useCallback(
    (hostName: string, path: string) => {
      const host = availableHosts.find((h) => h.host_name === hostName);
      if (!host) {
        throw new Error(`Host with name ${hostName} not found`);
      }

      // Build nginx URL from host data
      if (!host.host_url) {
        throw new Error(`Host ${hostName} does not have required connection data for nginx`);
      }

      const cleanPath = path.startsWith('/') ? path.slice(1) : path;
      const finalUrl = `${host.host_url}/${cleanPath}`;

      return finalUrl;
    },
    [availableHosts],
  );

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

  // Device Lock Management Functions
  const lockDevice = useCallback(
    async (hostName: string, sessionId?: string): Promise<boolean> => {
      try {
        console.log(`[@context:Registration] Attempting to lock device: ${hostName}`);

        // Check if device exists and is not already locked
        const host = availableHosts.find((h) => h.host_name === hostName);
        if (!host) {
          console.error(`[@context:Registration] Host ${hostName} not found`);
          return false;
        }

        if (host.isLocked) {
          console.warn(
            `[@context:Registration] Host ${hostName} is already locked by: ${host.lockedBy}`,
          );
          return false;
        }

        // Call main server control endpoint to take control (which includes locking)
        const response = await fetch(vite_buildServerUrl('/server/control/take-control'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host_name: hostName,
            session_id: sessionId || 'default-session',
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to take control of device: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.success) {
          console.log(`[@context:Registration] Successfully took control of device: ${hostName}`);

          // Update local state with lock info
          setAvailableHosts((prev) =>
            prev.map((h) =>
              h.host_name === hostName
                ? {
                    ...h,
                    isLocked: true,
                    lockedBy: sessionId || 'default-session',
                    lockedAt: Date.now(),
                  }
                : h,
            ),
          );

          console.log(`[@context:Registration] Device ${hostName} locked successfully`);
          return true;
        } else {
          console.error(
            `[@context:Registration] Server failed to take control of device: ${result.error}`,
          );
          return false;
        }
      } catch (error: any) {
        console.error(`[@context:Registration] Error taking control of device ${hostName}:`, error);
        return false;
      }
    },
    [availableHosts, vite_buildServerUrl],
  );

  const unlockDevice = useCallback(
    async (hostName: string): Promise<boolean> => {
      try {
        console.log(`[@context:Registration] Attempting to release control of device: ${hostName}`);

        // Call main server control endpoint to release control (which includes unlocking)
        const response = await fetch(vite_buildServerUrl('/server/release-control'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host_name: hostName,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to release control of device: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.success) {
          console.log(
            `[@context:Registration] Successfully released control of device: ${hostName}`,
          );

          // Update local state - remove lock info
          setAvailableHosts((prev) =>
            prev.map((h) =>
              h.host_name === hostName
                ? {
                    ...h,
                    isLocked: false,
                    lockedBy: undefined,
                    lockedAt: undefined,
                  }
                : h,
            ),
          );

          console.log(`[@context:Registration] Device ${hostName} unlocked successfully`);
          return true;
        } else {
          console.error(
            `[@context:Registration] Server failed to release control of device: ${result.error}`,
          );
          return false;
        }
      } catch (error: any) {
        console.error(
          `[@context:Registration] Error releasing control of device ${hostName}:`,
          error,
        );
        return false;
      }
    },
    [vite_buildServerUrl],
  );

  const isDeviceLocked = useCallback(
    (hostName: string): boolean => {
      const host = availableHosts.find((h) => h.host_name === hostName);
      return host?.isLocked || false;
    },
    [availableHosts],
  );

  const canLockDevice = useCallback(
    (hostName: string): boolean => {
      const host = availableHosts.find((h) => h.host_name === hostName);
      if (!host) return false;

      // Can lock if device exists, is online, and not already locked
      return host.status === 'online' && !host.isLocked;
    },
    [availableHosts],
  );

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

    // Device Lock Management
    lockDevice,
    unlockDevice,
    isDeviceLocked,
    canLockDevice,

    // URL Builders
    vite_buildServerUrl,
    buildHostWebUrl,

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
