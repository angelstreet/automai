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

  // SSH specific fields
  user?: string;
  password?: string;

  // Status fields
  status: 'connected' | 'failed' | 'pending';

  created_at: Date;
  updated_at: Date;
  is_windows: Boolean;
} 