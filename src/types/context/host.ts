/**
 * Re-exports of Host types from the core module
 * This file maintains backward compatibility during the migration
 */

export {
  Host,
  HostStatus,
  HostConnectionType,
  HostFormData,
  HostConnectionStatus,
  HostAnalytics,
} from '@/types/core/host';

/**
 * Host data interface for the context
 */
export interface HostData {
  hosts: Host[];
  loading: boolean;
  error: Error | null;
  selectedHost: Host | null;
}

/**
 * Host actions interface for the context
 */
export interface HostActions {
  createHost: (data: HostFormData) => Promise<Host | null>;
  updateHost: (id: string, data: Partial<HostFormData>) => Promise<Host | null>;
  deleteHost: (id: string) => Promise<boolean>;
  testConnection: (hostData: HostFormData) => Promise<boolean>;
  selectHost: (id: string) => void;
  refreshHosts: () => Promise<Host[]>;
}

/**
 * Host context type combining data and actions
 */
export interface HostContextType extends HostData, HostActions {}

/**
 * VM type identifiers
 */
export type VMType = 'docker' | 'vm' | 'kubernetes' | 'aws' | 'gcp' | 'azure';

/**
 * VM configuration for provisioning
 */
export interface VMConfig {
  name: string;
  description: string;
  type: VMType;
  image: string;
  cpu: number;
  memory: number;
}
