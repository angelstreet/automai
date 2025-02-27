export type ConnectionType = 'portainer' | 'docker' | 'ssh' | 'unknown';

export type VMType = 'container' | 'vm' | 'portainer' | 'docker';

export interface Device {
  id: string;
  name: string;
  status: 'running' | 'warning' | 'error' | 'offline';
  statusLabel: string;
  connectionType: 'portainer' | 'docker' | 'ssh';
  containers: {
    running: number;
    total: number;
  };
  alerts: Array<{
    id: string;
    type: 'memory' | 'cpu' | 'error';
    message: string;
  }>;
}

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
  
  // SSH specific fields
  user?: string;
  
  // Status fields
  status: 'connected' | 'failed' | 'pending';
  lastConnected?: Date;
  errorMessage?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

// For backward compatibility during transition
export type Machine = Host; 