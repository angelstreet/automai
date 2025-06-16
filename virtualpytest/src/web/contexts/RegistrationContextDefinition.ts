import { createContext } from 'react';
import { Host } from '../types/common/Host_Types';

interface RegistrationContextType {
  // Host data
  availableHosts: Host[];
  selectedHost: Host | null;
  isLoading: boolean;
  error: string | null;

  // Data Management
  fetchHosts: () => Promise<void>;
  selectHost: (hostName: string) => void;
  clearSelection: () => void;

  // Convenience getters
  getHostByName: (hostName: string) => Host | null;
  getAvailableHosts: () => Host[];
}

export const RegistrationContext = createContext<RegistrationContextType | undefined>(undefined);
export type { RegistrationContextType };
