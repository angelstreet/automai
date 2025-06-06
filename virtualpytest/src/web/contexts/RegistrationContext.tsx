import React, { createContext, useContext, useState, useCallback } from 'react';

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

  // Server configuration - client connects directly to server IP
  // No environment variables needed - server IP is known
  const SERVER_BASE_URL = 'http://127.0.0.1:5009';

  // Fetch hosts from server
  const fetchHosts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('[@context:Registration] Fetching hosts from server');
      const response = await fetch(`${SERVER_BASE_URL}/api/system/clients/devices`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        const rawHosts = result.devices || [];
        
        // Map server response to include legacy fields for Dashboard compatibility
        const hosts = rawHosts.map((host: any) => ({
          ...host,
          // Legacy field mappings for Dashboard compatibility
          client_id: host.id,
          device_model: host.model,
          local_ip: host.connection?.flask_url ? 
            host.connection.flask_url.replace('http://', '').split(':')[0] : 
            'unknown',
          client_port: host.connection?.flask_url ? 
            host.connection.flask_url.split(':')[2] || '5009' : 
            '5009',
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
        
        setAvailableHosts(hosts);
        console.log(`[@context:Registration] Successfully loaded ${hosts.length} hosts`);
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
    
    const baseUrl = host.connection?.flask_url || `http://${host.local_ip}:${host.client_port}`;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${baseUrl}/${cleanEndpoint}`;
  }, [availableHosts]);

  // Build nginx URL (for host media/files)
  const buildNginxUrl = useCallback((hostId: string, path: string) => {
    const host = availableHosts.find(h => h.id === hostId);
    if (!host) {
      throw new Error(`Host with ID ${hostId} not found`);
    }
    
    const baseUrl = host.connection?.nginx_url || `https://${host.local_ip}:444`;
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