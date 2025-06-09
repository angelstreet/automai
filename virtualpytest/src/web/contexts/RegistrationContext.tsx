import React, { createContext, useContext, useState, useCallback } from 'react';

// Default team ID constant - centralized here for use across the application
export const DEFAULT_TEAM_ID = "7fdeb4bb-3639-4ec3-959f-b54769a219ce";

interface DeviceConnection {
  flask_url: string;
  nginx_url: string;
}

interface RegisteredHost {
  id: string;
  name: string;
  model: string;
  description?: string;
  connection: DeviceConnection;
  status: string;
  isLocked: boolean;           // NEW - Device lock status
  lockedBy?: string;          // NEW - Session/user who locked it (optional)
  lockedAt?: number;          // NEW - Timestamp when locked (optional)
  last_seen: number;
  registered_at: string;
  capabilities: string[];
  system_stats: {
    cpu: {
      percent: number;
    };
    memory: {
      percent: number;
      used_gb: number;
      total_gb: number;
    };
    disk: {
      percent: number;
      used_gb: number;
      total_gb: number;
    };
    timestamp: number;
    error?: string;
  };
  // Legacy fields for compatibility with Dashboard
  client_id: string;
  device_model: string;
  local_ip: string;
  client_port: string;
  public_ip: string;
  controller_types?: string[];
  controller_configs?: any;
}

interface RegistrationContextType {
  // Host data
  availableHosts: RegisteredHost[];
  selectedHost: RegisteredHost | null;
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
  buildHostUrl: (hostId: string, endpoint: string) => string;   // To specific host
  buildNginxUrl: (hostId: string, path: string) => string;      // To host's nginx
  
  // Convenience getters
  getHostById: (hostId: string) => RegisteredHost | null;
  getAvailableHosts: () => RegisteredHost[];
  
  // Legacy compatibility (for gradual migration)
  buildApiUrl: (endpoint: string) => string;
  setAvailableHosts: (hosts: RegisteredHost[]) => void;
  setSelectedHost: (host: RegisteredHost | null) => void;
  selectHostById: (hostId: string) => void;
}

const RegistrationContext = createContext<RegistrationContextType | undefined>(undefined);

interface RegistrationProviderProps {
  children: React.ReactNode;
}

export const RegistrationProvider: React.FC<RegistrationProviderProps> = ({ children }) => {
  const [availableHosts, setAvailableHosts] = useState<RegisteredHost[]>([]);
  const [selectedHost, setSelectedHost] = useState<RegisteredHost | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Server configuration - ALWAYS use VITE_SERVER_PORT for API calls
  const getServerBaseUrl = () => {
    // For API calls, we ALWAYS need to use the actual server port from environment
    // regardless of whether we're in development or production mode
    
    // Get server configuration from environment
    const serverPort = (import.meta as any).env.VITE_SERVER_PORT || '5119'; // Port from env with fallback
    const serverProtocol = window.location.protocol.replace(':', ''); // 'http' or 'https'
    const serverIp = window.location.hostname; // Get IP from current URL
    
    // Build server URL using same protocol and IP as frontend, but with server port
    const baseUrl = `${serverProtocol}://${serverIp}:${serverPort}`;
    
    console.log('[@context:Registration] API Server Configuration:');
    console.log('[@context:Registration] Frontend URL:', window.location.href);
    console.log('[@context:Registration] Frontend protocol:', window.location.protocol);
    console.log('[@context:Registration] Frontend hostname:', window.location.hostname);
    console.log('[@context:Registration] Frontend port:', window.location.port);
    console.log('[@context:Registration] VITE_SERVER_PORT from env:', (import.meta as any).env.VITE_SERVER_PORT);
    console.log('[@context:Registration] Using API server port:', serverPort);
    console.log('[@context:Registration] Built API server URL:', baseUrl);
    
    return baseUrl;
  };

  const SERVER_BASE_URL = getServerBaseUrl();

  // Fetch hosts from server
  const fetchHosts = useCallback(async () => {
    console.log('[@context:Registration] fetchHosts function called!');
    try {
      setIsLoading(true);
      setError(null);
      
      const fullUrl = `${SERVER_BASE_URL}/api/system/clients/devices`;
      console.log('[@context:Registration] Fetching hosts from server');
      console.log('[@context:Registration] SERVER_BASE_URL:', SERVER_BASE_URL);
      console.log('[@context:Registration] Full URL:', fullUrl);
      console.log('[@context:Registration] Making fetch request...');
      
      const response = await fetch(fullUrl);
      
      console.log('[@context:Registration] Fetch response received');
      console.log('[@context:Registration] Response status:', response.status);
      console.log('[@context:Registration] Response statusText:', response.statusText);
      console.log('[@context:Registration] Response headers:', Object.fromEntries(response.headers.entries()));
      console.log('[@context:Registration] Response ok:', response.ok);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      console.log('[@context:Registration] Parsing JSON response...');
      const result = await response.json();
      console.log('[@context:Registration] Parsed JSON result:', result);
      
      if (result.success) {
        const rawHosts = result.devices || [];
        console.log('[@context:Registration] Raw hosts from server:', rawHosts);
        
        // Map server response to include legacy fields for Dashboard compatibility
        const hosts = rawHosts.map((host: any) => ({
          ...host,
          // Device lock properties (with defaults if not provided by server)
          isLocked: host.isLocked || false,
          lockedBy: host.lockedBy || undefined,
          lockedAt: host.lockedAt || undefined,
          // Legacy field mappings for Dashboard compatibility
          client_id: host.id,
          device_model: host.model,
          local_ip: host.connection?.flask_url ? 
            host.connection.flask_url.replace('http://', '').split(':')[0] : 
            'unknown',
          client_port: host.connection?.flask_url ? 
            host.connection.flask_url.split(':')[2] || '5119' : 
            '5119',
          public_ip: host.connection?.flask_url ? 
            host.connection.flask_url.replace('http://', '').split(':')[0] : 
            'unknown',
          // Ensure system_stats has default structure if missing
          system_stats: host.system_stats || {
            cpu: { percent: 0 },
            memory: { percent: 0, used_gb: 0, total_gb: 0 },
            disk: { percent: 0, used_gb: 0, total_gb: 0 },
            timestamp: Date.now() / 1000,
            error: 'Stats not available'
          }
        }));
        
        console.log('[@context:Registration] Mapped hosts:', hosts);
        setAvailableHosts(hosts);
        console.log(`[@context:Registration] Successfully loaded ${hosts.length} hosts`);
      } else {
        throw new Error(result.error || 'Server returned success: false');
      }
      
    } catch (err: any) {
      console.error('[@context:Registration] Error fetching hosts:', err);
      console.error('[@context:Registration] Error name:', err.name);
      console.error('[@context:Registration] Error message:', err.message);
      console.error('[@context:Registration] Error stack:', err.stack);
      console.error('[@context:Registration] Error constructor:', err.constructor.name);
      console.error('[@context:Registration] Full error object:', err);
      
      // Additional debugging for network errors
      if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
        console.error('[@context:Registration] This is likely a network connectivity issue:');
        console.error('[@context:Registration] - Check if the server is running');
        console.error('[@context:Registration] - Check if the URL is accessible:', `${SERVER_BASE_URL}/api/system/clients/devices`);
        console.error('[@context:Registration] - Check for CORS issues');
        console.error('[@context:Registration] - Check for mixed content issues (HTTPS->HTTP)');
        console.error('[@context:Registration] - Check browser network tab for more details');
        console.error('[@context:Registration] - Frontend protocol:', window.location.protocol);
        console.error('[@context:Registration] - Backend URL protocol:', SERVER_BASE_URL.split(':')[0]);
      }
      
      setError(err.message || 'Failed to fetch hosts');
      setAvailableHosts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Build server URL (always goes to main server)
  const buildServerUrl = useCallback((endpoint: string) => {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${SERVER_BASE_URL}/${cleanEndpoint}`;
  }, []);

  // Build host URL (goes directly to specific host)
  const buildHostUrl = useCallback((hostId: string, endpoint: string) => {
    const host = availableHosts.find(h => h.id === hostId);
    if (!host) {
      throw new Error(`Host with ID ${hostId} not found`);
    }
    
    // Use the host's registered protocol and connection info
    // If flask_url is available, use it directly; otherwise build from components
    let baseUrl: string;
    
    if (host.connection?.flask_url) {
      // Use the flask_url directly from host registration
      baseUrl = host.connection.flask_url;
    } else {
      // Build URL from host registration components
      // Get protocol from current page (same as server URL logic) or fallback to https
      const protocol = window.location.protocol.replace(':', ''); // 'http' or 'https'
      const hostIp = host.local_ip;
      const hostPort = host.client_port;
      
      baseUrl = `${protocol}://${hostIp}:${hostPort}`;
    }
    
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${baseUrl}/${cleanEndpoint}`;
  }, [availableHosts]);

  // Build nginx URL (for host media/files)
  const buildNginxUrl = useCallback((hostId: string, path: string) => {
    const host = availableHosts.find(h => h.id === hostId);
    if (!host) {
      throw new Error(`Host with ID ${hostId} not found`);
    }
    
    // Use the host's registered nginx URL or build from components
    let baseUrl: string;
    
    if (host.connection?.nginx_url) {
      // Use the nginx_url directly from host registration
      baseUrl = host.connection.nginx_url;
    } else {
      // Build nginx URL from host registration components
      // Get protocol from current page (same as server URL logic) or fallback to https
      const protocol = window.location.protocol.replace(':', ''); // 'http' or 'https'
      const hostIp = host.local_ip;
      const nginxPort = '444'; // Standard nginx port
      
      baseUrl = `${protocol}://${hostIp}:${nginxPort}`;
    }
    
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${baseUrl}/${cleanPath}`;
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

  // Legacy compatibility functions (for gradual migration)
  const buildApiUrl = useCallback((endpoint: string) => {
    return buildServerUrl(endpoint);
  }, [buildServerUrl]);

  const selectHostById = useCallback((hostId: string) => {
    selectHost(hostId);
  }, [selectHost]);

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
        // Update local state
        setAvailableHosts(prev => prev.map(h => 
          h.id === hostId 
            ? { 
                ...h, 
                isLocked: true, 
                lockedBy: sessionId || 'default-session',
                lockedAt: Date.now() 
              }
            : h
        ));
        
        console.log(`[@context:Registration] Successfully took control of device: ${hostId}`);
        return true;
      } else {
        console.error(`[@context:Registration] Server failed to take control of device: ${result.error}`);
        return false;
      }
      
    } catch (error: any) {
      console.error(`[@context:Registration] Error taking control of device ${hostId}:`, error);
      return false;
    }
  }, [availableHosts, buildServerUrl]);

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
        // Update local state
        setAvailableHosts(prev => prev.map(h => 
          h.id === hostId 
            ? { 
                ...h, 
                isLocked: false, 
                lockedBy: undefined,
                lockedAt: undefined 
              }
            : h
        ));
        
        console.log(`[@context:Registration] Successfully released control of device: ${hostId}`);
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
    
    // Legacy compatibility
    buildApiUrl,
    setAvailableHosts,
    setSelectedHost,
    selectHostById,
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