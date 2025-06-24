import { createContext } from 'react';

import { Host } from '../types/common/Host_Types';

// ========================================
// TYPES
// ========================================

export interface HostManagerContextType {
  // Panel and UI state
  selectedHost: Host | null;
  isControlActive: boolean;
  isRemotePanelOpen: boolean;
  showRemotePanel: boolean;
  showAVPanel: boolean;
  isVerificationActive: boolean;

  // Host data (filtered by interface models)
  availableHosts: Host[];
  getHostByName: (name: string) => Host | null;
  fetchHosts: () => void;

  // Device control functions
  takeControl: (
    hostName: string,
    sessionId?: string,
  ) => Promise<{
    success: boolean;
    error?: string;
    errorType?: string;
    details?: any;
  }>;

  releaseControl: (
    hostName: string,
    sessionId?: string,
  ) => Promise<{
    success: boolean;
    error?: string;
    errorType?: string;
    details?: any;
  }>;

  // Status checking methods
  isDeviceLocked: (host: Host | null) => boolean;
  canLockDevice: (host: Host | null) => boolean;
  hasActiveLock: (hostName: string) => boolean;

  // Panel and UI handlers
  handleDeviceSelect: (host: Host | null) => void;
  handleControlStateChange: (active: boolean) => void;
  handleToggleRemotePanel: () => void;
  handleConnectionChange: (connected: boolean) => void;
  handleDisconnectComplete: () => void;
}

// ========================================
// CONTEXT
// ========================================

export const HostManagerContext = createContext<HostManagerContextType | null>(null);
