import React, { createContext, useContext, useState, useCallback } from 'react';
import { AVControllerProxy } from '../controllers/AVControllerProxy';
import { RemoteControllerProxy } from '../controllers/RemoteControllerProxy';
import { VerificationControllerProxy } from '../controllers/VerificationControllerProxy';
import { 
  DeviceRegistration, 
  DeviceWithProxies, 
  DevicesResponse,
  DeviceConnection 
} from '../types/pages/Device_Types';

// Default team ID constant - centralized here for use across the application
export const DEFAULT_TEAM_ID = "7fdeb4bb-3639-4ec3-959f-b54769a219ce";

interface RegistrationContextType {
  // Host data
  availableHosts: DeviceWithProxies[];
  selectedHost: DeviceWithProxies | null;
  isLoading: boolean;
  error: string | null;
  
  // Data Management
  fetchHosts: () => Promise<void>;
  selectHost: (hostId: string) => void;
  clearSelection: () => void;
  
  // Device Lock Management
  lockDevice: (hostId: string, sessionId?: string) => Promise<boolean>;
  unlockDevice: (hostId: string) => Promise<boolean>;
  isDeviceLocked: (hostId: string) => boolean;
  canLockDevice: (hostId: string) => boolean;
  
  // URL Builders (NO hardcoded values)
  buildServerUrl: (endpoint: string) => string;        // Always to main server
  buildHostUrl: (hostName: string, endpoint: string) => string;   // To specific host
  buildNginxUrl: (hostId: string, path: string) => string;      // To host's nginx
  
  // Convenience getters
  getHostById: (hostId: string) => DeviceWithProxies | null;
  getAvailableHosts: () => DeviceWithProxies[];
}

const RegistrationContext = createContext<RegistrationContextType | undefined>(undefined);

interface RegistrationProviderProps {
  children: React.ReactNode;
}

export const RegistrationProvider: React.FC<RegistrationProviderProps> = ({ children }) => {
  const [availableHosts, setAvailableHosts] = useState<DeviceWithProxies[]>([]);
  const [selectedHost, setSelectedHost] = useState<DeviceWithProxies | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Server configuration - ALWAYS use VITE_SERVER_PORT for API calls
  const getServerBaseUrl = () => {
    // For API calls, we need to use the correct server host from environment
    // NOT the window.location.hostname which could be the device IP
    
    // Get server configuration from environment
    const serverPort = (import.meta as any).env.VITE_SERVER_PORT || '5119'; // Port from env with fallback
    const serverHost = (import.meta as any).env.VITE_SERVER_HOST || 'localhost'; // Host from env with localhost fallback
    const serverProtocol = window.location.protocol.replace(':', ''); // 'http' or 'https'
    
    // Build server URL using environment configuration
    const baseUrl = `${serverProtocol}://${serverHost}:${serverPort}`;

    
    return baseUrl;
  };

  const SERVER_BASE_URL = getServerBaseUrl();

  // Build server URL (always goes to main server)
  const buildServerUrl = useCallback((endpoint: string) => {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${SERVER_BASE_URL}/${cleanEndpoint}`;
  }, []);

  // Build host URL (goes directly to specific host)
  const buildHostUrl = useCallback((hostName: string, endpoint: string) => {
    const host = availableHosts.find(h => h.host_name === hostName);
    if (!host) {
      throw new Error(`Host with name ${hostName} not found`);
    }
    
    // Use the pre-built flask_url from host registration
    if (!host.connection?.flask_url) {
      throw new Error(`Host ${hostName} does not have a flask_url in connection data`);
    }
    
    const baseUrl = host.connection.flask_url;
    
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    const finalUrl = `${baseUrl}/${cleanEndpoint}`;
    console.log(`[@context:Registration] Final host URL: ${finalUrl}`);
    return finalUrl;
  }, [availableHosts]);

  // Create controller proxies for a host device - REMOVED from useCallback to break circular dependency
  const createControllerProxies = (host: DeviceWithProxies) => {
    console.log(`[@context:Registration] Creating controller proxies for host: ${host.name} (${host.id})`);
    
    const proxies: DeviceWithProxies['controllerProxies'] = {};
    
    // Create AV controller proxy if host has AV capabilities
    if (host.controller_types?.includes('av') || host.capabilities?.includes('av')) {
      try {
        
        // Create a local buildHostUrl function to avoid dependency issues
        const localBuildHostUrl = (hostName: string, endpoint: string) => {
          if (!host.connection?.flask_url) {
            throw new Error(`Host ${hostName} does not have a flask_url in connection data`);
          }
          const baseUrl = host.connection.flask_url;
          const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
          return `${baseUrl}/${cleanEndpoint}`;
        };
        proxies.av = new AVControllerProxy(host, localBuildHostUrl);
        
      } catch (error) {
        console.error(`[@context:Registration] Failed to create AV controller proxy for host ${host.name}:`, error);
        // Don't throw - just log and continue
      }
    }
    
    // Create remote controller proxy if host has remote capabilities
    if (host.controller_types?.includes('remote') || host.capabilities?.includes('remote')) {
      try {
        // Create a local buildHostUrl function to avoid dependency issues
        const localBuildHostUrl = (hostName: string, endpoint: string) => {
          if (!host.connection?.flask_url) {
            throw new Error(`Host ${hostName} does not have a flask_url in connection data`);
          }
          const baseUrl = host.connection.flask_url;
          const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
          return `${baseUrl}/${cleanEndpoint}`;
        };
        proxies.remote = new RemoteControllerProxy(host, localBuildHostUrl);
        } catch (error) {
        console.error(`[@context:Registration] Failed to create remote controller proxy for host ${host.name}:`, error);
        // Don't throw - just log and continue
      }
    }
    
    // Create verification controller proxy if host has verification capabilities
    if (host.controller_types?.includes('verification') || host.capabilities?.includes('verification')) {
      try {
        // Create a local buildHostUrl function to avoid dependency issues
        const localBuildHostUrl = (hostName: string, endpoint: string) => {
          if (!host.connection?.flask_url) {
            throw new Error(`Host ${hostName} does not have a flask_url in connection data`);
          }
          const baseUrl = host.connection.flask_url;
          const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
          return `${baseUrl}/${cleanEndpoint}`;
        };
        proxies.verification = new VerificationControllerProxy(host, localBuildHostUrl);
      } catch (error) {
        console.error(`[@context:Registration] Failed to create verification controller proxy for host ${host.name}:`, error);
        // Don't throw - just log and continue
      }
    }
    
    console.log(`[@context:Registration] Created ${Object.keys(proxies).length} controller proxies for host: ${host.name}`);
    return proxies;
  };

  // Fetch hosts from server - FIXED: Removed createControllerProxies from dependency array
  const fetchHosts = useCallback(async () => {
    console.log('[@context:Registration] fetchHosts function called!');
    try {
      setIsLoading(true);
      setError(null);
      
      const fullUrl = `${SERVER_BASE_URL}/server/system/clients/devices`; 
      const response = await fetch(fullUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const result = await response.json();
      if (result.success) {
        const rawHosts = result.devices || [];
        console.log('[@context:Registration] Raw hosts from server:', rawHosts);
        
        // Simply use the server response as-is, just add required legacy fields for Dashboard
        const hosts = rawHosts.map((host: any) => ({
          // Use server data directly - no transformation
          ...host,
          // Remove confusing id field - just use clear field names
          // Legacy field mappings ONLY for Dashboard compatibility
          client_id: host.id || host.device_id,
          device_model: host.model,
          local_ip: host.connection?.flask_url ? 
            host.connection.flask_url.replace(/https?:\/\//, '').split(':')[0] : 
            host.device_ip || 'unknown',
          client_port: host.connection?.flask_url ? 
            host.connection.flask_url.split(':')[2] || '5119' : 
            host.device_port || '5119',
          public_ip: host.connection?.flask_url ? 
            host.connection.flask_url.replace(/https?:\/\//, '').split(':')[0] : 
            host.device_ip || 'unknown',
          // Device lock properties (with defaults if not provided by server)
          isLocked: host.isLocked || false,
          lockedBy: host.lockedBy || undefined,
          lockedAt: host.lockedAt || undefined,
        }));
        
        console.log('[@context:Registration] Mapped hosts:', hosts);
        
        // Store hosts WITHOUT controller proxies - proxies will be created only when taking control
        const hostsWithoutProxies = hosts.map((host: DeviceWithProxies) => ({
          ...host,
          controllerProxies: {} // Empty proxies object - will be populated on take control
        }));
        
        console.log('[@context:Registration] Hosts without controller proxies:', hostsWithoutProxies);
        setAvailableHosts(hostsWithoutProxies);
        console.log(`[@context:Registration] Successfully loaded ${hostsWithoutProxies.length} hosts (proxies will be created on take control)`);
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
  }, []); // FIXED: Empty dependency array to prevent infinite loop

  // Build nginx URL (for host media/files)
  const buildNginxUrl = useCallback((hostId: string, path: string) => {
    const host = availableHosts.find(h => h.id === hostId);
    if (!host) {
      throw new Error(`Host with ID ${hostId} not found`);
    }
    
    // Use the pre-built nginx_url from host registration
    if (!host.connection?.nginx_url) {
      throw new Error(`Host ${hostId} does not have a nginx_url in connection data`);
    }
    
    const baseUrl = host.connection.nginx_url;
   
    
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    const finalUrl = `${baseUrl}/${cleanPath}`;
    
    return finalUrl;
  }, [availableHosts]);

  // Select host by ID
  const selectHost = useCallback((hostId: string) => {
    const host = availableHosts.find(h => h.id === hostId);
    if (host) {
      setSelectedHost(host);
      console.log(`[@context:Registration] Selected host: ${host.name} (${host.local_ip}:${host.client_port})`);
    } else {
      console.warn(`[@context:Registration] Host with ID ${hostId} not found`);
    }
  }, [availableHosts]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedHost(null);
    console.log('[@context:Registration] Cleared host selection');
  }, []);

  // Get host by ID
  const getHostById = useCallback((hostId: string) => {
    return availableHosts.find(h => h.id === hostId) || null;
  }, [availableHosts]);

  // Get all available hosts
  const getAvailableHosts = useCallback(() => {
    return availableHosts;
  }, [availableHosts]);

  // Device Lock Management Functions
  const lockDevice = useCallback(async (hostId: string, sessionId?: string): Promise<boolean> => {
    try {
      console.log(`[@context:Registration] Attempting to lock device: ${hostId}`);
      
      // Check if device exists and is not already locked
      const host = availableHosts.find(h => h.id === hostId);
      if (!host) {
        console.error(`[@context:Registration] Host ${hostId} not found`);
        return false;
      }
      
      if (host.isLocked) {
        console.warn(`[@context:Registration] Host ${hostId} is already locked by: ${host.lockedBy}`);
        return false;
      }
      
      // Call main server control endpoint to take control (which includes locking)
      const response = await fetch(buildServerUrl('/server/control/take-control'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_id: hostId,
          session_id: sessionId || 'default-session',
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to take control of device: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`[@context:Registration] Successfully took control of device: ${hostId}`);
        
        // NOW create controller proxies since we have control
        console.log(`[@context:Registration] Creating controller proxies for controlled device: ${hostId}`);
        const controllerProxies = createControllerProxies(host);
        
        // Update local state with lock info AND controller proxies
        setAvailableHosts(prev => prev.map(h => 
          h.id === hostId 
            ? { 
                ...h, 
                isLocked: true, 
                lockedBy: sessionId || 'default-session',
                lockedAt: Date.now(),
                controllerProxies // Add proxies now that we have control
              }
            : h
        ));
        
        console.log(`[@context:Registration] Device ${hostId} locked and controller proxies created`);
        return true;
      } else {
        console.error(`[@context:Registration] Server failed to take control of device: ${result.error}`);
        return false;
      }
      
    } catch (error: any) {
      console.error(`[@context:Registration] Error taking control of device ${hostId}:`, error);
      return false;
    }
  }, [availableHosts, buildServerUrl, createControllerProxies]);

  const unlockDevice = useCallback(async (hostId: string): Promise<boolean> => {
    try {
      console.log(`[@context:Registration] Attempting to release control of device: ${hostId}`);
      
      // Call main server control endpoint to release control (which includes unlocking)
      const response = await fetch(buildServerUrl('/server/release-control'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_id: hostId,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to release control of device: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        console.log(`[@context:Registration] Successfully released control of device: ${hostId}`);
         
        // Update local state - remove lock info AND controller proxies
        setAvailableHosts(prev => prev.map(h => 
          h.id === hostId 
            ? { 
                ...h, 
                isLocked: false, 
                lockedBy: undefined,
                lockedAt: undefined,
                controllerProxies: {} // Remove proxies when releasing control
              }
            : h
        ));
        
        console.log(`[@context:Registration] Device ${hostId} unlocked and controller proxies removed`);
        return true;
      } else {
        console.error(`[@context:Registration] Server failed to release control of device: ${result.error}`);
        return false;
      }
      
    } catch (error: any) {
      console.error(`[@context:Registration] Error releasing control of device ${hostId}:`, error);
      return false;
    }
  }, [buildServerUrl]);

  const isDeviceLocked = useCallback((hostId: string): boolean => {
    const host = availableHosts.find(h => h.id === hostId);
    return host?.isLocked || false;
  }, [availableHosts]);

  const canLockDevice = useCallback((hostId: string): boolean => {
    const host = availableHosts.find(h => h.id === hostId);
    if (!host) return false;
    
    // Can lock if device exists, is online, and not already locked
    return host.status === 'online' && !host.isLocked;
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
    
    // Device Lock Management
    lockDevice,
    unlockDevice,
    isDeviceLocked,
    canLockDevice,
    
    // URL Builders
    buildServerUrl,
    buildHostUrl,
    buildNginxUrl,
    
    // Convenience getters
    getHostById,
    getAvailableHosts,
  };

  return (
    <RegistrationContext.Provider value={value}>
      {children}
    </RegistrationContext.Provider>
  );
};

// Hook to use registration context
export const useRegistration = () => {
  const context = useContext(RegistrationContext);
  if (context === undefined) {
    throw new Error('useRegistration must be used within a RegistrationProvider');
  }
  return context;
};