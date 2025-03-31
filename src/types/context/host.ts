/**
 * Loading status states
 */
export type LoadingState = 'idle' | 'loading' | 'success' | 'error';

/**
 * Loading status interface with operation tracking
 */
export interface LoadingStatus {
  state: LoadingState;
  operation: string | null;
  entityId: string | null;
}

/**
 * Structured error interface
 */
export interface ContextError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

/**
 * Host data interface - contains all state
 */
export interface HostData {
  hosts: Host[];
  filteredHosts: Host[];
  selectedHost: Host | null;
  connectionStatuses: Record<string, any>;
  hostStats: Record<string, any>;
  hostTerminals: Record<string, any>;
  hostCapabilities: Record<string, any>;
  loadingStatus: LoadingStatus;
  error: ContextError | null;
  // Keep loading boolean for backward compatibility
  loading?: boolean;
  isScanning?: boolean;
  currentUser: any | null;
  filter: {
    query: string;
    status: string;
    type: string;
    sortBy: string;
    sortDir: string;
  };
}

/**
 * Host actions interface - contains all functions
 */
export interface HostActions {
  /**
   * Fetch all hosts from the server
   * @returns Promise resolving to the list of hosts
   */
  fetchHosts: () => Promise<Host[]>;

  /**
   * Get a specific host by ID
   * @param id Host ID
   * @returns Promise resolving to the host or null
   */
  getHostById: (id: string) => Promise<Host | null>;

  /**
   * Add a new host
   * @param hostData Host data without ID
   * @returns Promise resolving to success object with host ID or error
   */
  addHost: (hostData: Omit<Host, 'id'>) => Promise<{
    success: boolean;
    hostId?: string;
    error?: string;
  }>;

  /**
   * Update an existing host
   * @param id Host ID
   * @param updates Partial host data to update
   * @returns Promise resolving to success object or error
   */
  updateHostById: (
    id: string,
    updates: Partial<Omit<Host, 'id'>>,
  ) => Promise<{
    success: boolean;
    error?: string;
  }>;

  /**
   * Remove a host
   * @param id Host ID
   * @returns Promise resolving to success object or error
   */
  removeHost: (id: string) => Promise<{
    success: boolean;
    error?: string;
  }>;

  /**
   * Test connection to a host
   * @param id Host ID
   * @returns Promise resolving to success object with message or error
   */
  testConnection: (id: string) => Promise<{
    success: boolean;
    error?: string;
    message?: string;
  }>;

  /**
   * Test connection to all hosts
   * @returns Promise resolving when all connections are tested
   */
  testAllConnections: () => Promise<void>;

  /**
   * Check if a specific operation is loading
   * @param operation Optional operation name
   * @param entityId Optional entity ID
   * @returns True if the operation is loading
   */
  isLoading: (operation?: string, entityId?: string) => boolean;

  /**
   * Reset loading state to idle
   */
  resetLoadingState: () => void;
}

/**
 * Combined host context type
 */
export interface HostContextType extends HostData, HostActions {}

export type ConnectionType = 'portainer' | 'docker' | 'ssh' | 'unknown';
export type VMType = 'container' | 'vm' | 'portainer' | 'docker';

export interface VMConfig {
  name: string;
  description: string;
  type: VMType;
  image: string;
  cpu: number;
  memory: number;
}
export interface Host {
  id: string;
  name: string;
  description?: string;

  // Connection details
  type: 'ssh' | 'docker' | 'portainer';
  ip: string;
  port?: number;
  hostname?: string;
  host_type?: string;

  // SSH specific fields
  user?: string;
  password?: string;

  // Status fields
  status: 'connected' | 'failed' | 'pending' | 'testing';

  created_at: Date;
  updated_at: Date;
  is_windows: Boolean;

  // Additional fields used in components
  os_type?: string;
  errorMessage?: string;
}

export interface HostFormData {
  name: string;
  description?: string;
  type: 'ssh' | 'docker' | 'portainer';
  ip: string;
  port?: number;
  username?: string;
  password?: string;
}

export interface HostConnectionStatus {
  status: string;
  lastChecked: string;
  message?: string;
}

export interface HostAnalytics {
  cpu: number;
  memory: number;
  disk: number;
  uptime: string;
  lastUpdated: string;
}
