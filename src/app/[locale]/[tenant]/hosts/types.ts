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
