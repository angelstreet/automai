import { createContext } from 'react';

import { Host } from '../types/common/Host_Types';

// ========================================
// TYPES
// ========================================

export interface HostManagerContextType {
  // Panel and UI state
  selectedHost: Host | null;
  selectedDeviceId: string | null;
  isControlActive: boolean;
  isRemotePanelOpen: boolean;
  showRemotePanel: boolean;
  showAVPanel: boolean;
  isVerificationActive: boolean;

  // Host data (filtered by interface models)
  availableHosts: Host[];
  getHostByName: (name: string) => Host | null;
  isLoading: boolean;
  error: string | null;

  // NEW: Direct data access functions (Phase 1.1)
  getAllHosts: () => Host[];
  getHostsByModel: (models: string[]) => Host[];
  getAllDevices: () => any[];
  getDevicesFromHost: (hostName: string) => any[];
  getDevicesByCapability: (capability: string) => { host: Host; device: any }[];

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
  handleDeviceSelect: (host: Host | null, deviceId: string | null) => void;
  handleControlStateChange: (active: boolean) => void;
  handleToggleRemotePanel: () => void;
  handleConnectionChange: (connected: boolean) => void;
  handleDisconnectComplete: () => void;

  // Panel and control actions
  setSelectedHost: (host: Host | null) => void;
  setSelectedDeviceId: (deviceId: string | null) => void;
  setIsControlActive: (active: boolean) => void;
  setIsRemotePanelOpen: (open: boolean) => void;
  setShowRemotePanel: (show: boolean) => void;
  setShowAVPanel: (show: boolean) => void;
  setIsVerificationActive: (active: boolean) => void;

  // Lock management
  reclaimLocks: () => Promise<boolean>;
}

// ========================================
// CONTEXT
// ========================================

export const HostManagerContext = createContext<HostManagerContextType | undefined>(undefined);
