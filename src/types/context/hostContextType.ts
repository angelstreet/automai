/**
 * Host context types
 */

// Import component types
import {
  Host,
  HostStatus,
  HostConnectionType,
  HostFormData,
  HostConnectionStatus,
  HostAnalytics,
  VMType,
  VMConfig
} from '@/types/component/hostComponentType';

// Re-export core types for convenience
export type {
  Host,
  HostStatus,
  HostConnectionType,
  HostFormData,
  HostConnectionStatus,
  HostAnalytics,
  VMType,
  VMConfig
};

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
