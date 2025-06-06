import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

interface DeviceConnection {
  flask_url: string;
  nginx_url: string;
}

interface RegisteredClient {
  id: string;
  name: string;
  model: string;
  connection: DeviceConnection;
  status: string;
  last_seen: number;
  capabilities: string[];
  controller_types: string[];
  controller_configs?: any;
}

interface RegistrationContextType {
  // Registration state
  isRegistered: boolean;
  registrationLoading: boolean;
  registrationError: string | null;
  
  // Current client info
  currentClient: RegisteredClient | null;
  
  // Available registered clients (for multi-client scenarios)
  availableClients: RegisteredClient[];
  
  // Connection helpers
  getFlaskUrl: () => string;
  getNginxUrl: () => string;
  buildApiUrl: (endpoint: string) => string;
  buildNginxUrl: (path: string) => string;
  
  // Actions
  refreshRegistration: () => Promise<void>;
  selectClient: (clientId: string) => void;
}

const RegistrationContext = createContext<RegistrationContextType | undefined>(undefined);

interface RegistrationProviderProps {
  children: React.ReactNode;
}

export const RegistrationProvider: React.FC<RegistrationProviderProps> = ({ children }) => {
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationLoading, setRegistrationLoading] = useState(true);
  const [registrationError, setRegistrationError] = useState<string | null>(null);
  const [currentClient, setCurrentClient] = useState<RegisteredClient | null>(null);
  const [availableClients, setAvailableClients] = useState<RegisteredClient[]>([]);

  // Get server URL from environment with fallback
  const getServerUrl = useCallback(() => {
    const serverUrl = process.env.SERVER_URL || 'http://localhost';
    const serverPort = process.env.SERVER_PORT || '5009';
    return `${serverUrl}:${serverPort}`;
  }, []);

  // Register this client with the server
  const registerClient = useCallback(async () => {
    try {
      console.log('[@context:Registration] Starting client registration');
      setRegistrationLoading(true);
      setRegistrationError(null);

      const serverUrl = getServerUrl();
      
      // Get client information from environment or generate
      const clientData = {
        client_id: process.env.CLIENT_ID || generateClientId(),
        public_ip: process.env.CLIENT_IP || 'localhost',
        local_ip: process.env.CLIENT_IP || 'localhost', 
        client_port: process.env.CLIENT_PORT || '5119',
        name: process.env.CLIENT_NAME || 'virtualpytest-client',
        device_model: process.env.DEVICE_MODEL || 'android_mobile',
        controller_types: ['remote', 'av', 'verification'],
        capabilities: ['stream', 'capture', 'verification'],
        status: 'online',
        system_stats: {
          cpu: { percent: 0 },
          memory: { percent: 0, used_gb: 0, total_gb: 0 },
          disk: { percent: 0, used_gb: 0, total_gb: 0 },
          timestamp: Date.now() / 1000
        }
      };

      console.log(`[@context:Registration] Registering with server: ${serverUrl}`);
      
      const response = await fetch(`${serverUrl}/api/system/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clientData),
      });

      if (!response.ok) {
        throw new Error(`Registration failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        console.log('[@context:Registration] Client registered successfully');
        setIsRegistered(true);
        
        // Set current client data
        const clientInfo: RegisteredClient = {
          id: clientData.client_id,
          name: clientData.name,
          model: clientData.device_model,
          connection: {
            flask_url: `http://${clientData.local_ip}:${clientData.client_port}`,
            nginx_url: `https://${clientData.local_ip}:444` // Default nginx port
          },
          status: 'online',
          last_seen: Date.now(),
          capabilities: clientData.capabilities,
          controller_types: clientData.controller_types
        };
        
        setCurrentClient(clientInfo);
        
        // Also fetch other available clients
        await fetchAvailableClients();
        
      } else {
        throw new Error(result.error || 'Registration failed');
      }
      
    } catch (error: any) {
      console.error('[@context:Registration] Registration error:', error);
      setRegistrationError(error.message);
      setIsRegistered(false);
    } finally {
      setRegistrationLoading(false);
    }
  }, [getServerUrl]);

  // Fetch available registered clients
  const fetchAvailableClients = useCallback(async () => {
    try {
      const serverUrl = getServerUrl();
      const response = await fetch(`${serverUrl}/api/system/clients/devices`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setAvailableClients(result.devices || []);
          console.log(`[@context:Registration] Found ${result.devices?.length || 0} available clients`);
        }
      }
    } catch (error) {
      console.warn('[@context:Registration] Failed to fetch available clients:', error);
    }
  }, [getServerUrl]);

  // Generate a simple client ID
  const generateClientId = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  // Connection helper functions
  const getFlaskUrl = useCallback(() => {
    if (currentClient?.connection?.flask_url) {
      return currentClient.connection.flask_url;
    }
    return getServerUrl();
  }, [currentClient?.connection?.flask_url, getServerUrl]);

  const getNginxUrl = useCallback(() => {
    if (currentClient?.connection?.nginx_url) {
      return currentClient.connection.nginx_url;
    }
    const serverUrl = process.env.SERVER_URL || 'http://localhost';
    const nginxPort = process.env.NGINX_PORT || '444';
    return `${serverUrl}:${nginxPort}`;
  }, [currentClient?.connection?.nginx_url]);

  const buildApiUrl = useCallback((endpoint: string) => {
    const baseUrl = getFlaskUrl();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return `${baseUrl}/${cleanEndpoint}`;
  }, [getFlaskUrl]);

  const buildNginxUrl = useCallback((path: string) => {
    const baseUrl = getNginxUrl();
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${baseUrl}/${cleanPath}`;
  }, [getNginxUrl]);

  // Select a different client (for multi-client scenarios)
  const selectClient = useCallback((clientId: string) => {
    const client = availableClients.find(c => c.id === clientId);
    if (client) {
      setCurrentClient(client);
      console.log(`[@context:Registration] Selected client: ${client.name}`);
    }
  }, [availableClients]);

  // Refresh registration and available clients
  const refreshRegistration = useCallback(async () => {
    await registerClient();
  }, [registerClient]);

  // Register on mount
  useEffect(() => {
    registerClient();
  }, [registerClient]);

  // Set up periodic ping to maintain registration
  useEffect(() => {
    if (!isRegistered) return;

    const pingInterval = setInterval(async () => {
      try {
        const serverUrl = getServerUrl();
        await fetch(`${serverUrl}/api/system/ping`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            client_id: currentClient?.id
          }),
        });
      } catch (error) {
        console.warn('[@context:Registration] Ping failed:', error);
      }
    }, 30000); // Ping every 30 seconds

    return () => clearInterval(pingInterval);
  }, [isRegistered, currentClient?.id, getServerUrl]);

  const value: RegistrationContextType = {
    isRegistered,
    registrationLoading,
    registrationError,
    currentClient,
    availableClients,
    getFlaskUrl,
    getNginxUrl,
    buildApiUrl,
    buildNginxUrl,
    refreshRegistration,
    selectClient,
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