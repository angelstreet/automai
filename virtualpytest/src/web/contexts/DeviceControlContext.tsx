import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';

import { Host } from '../types/common/Host_Types';
import { useRegistration } from '../hooks/useRegistration';

// ========================================
// TYPES
// ========================================

interface DeviceControlContextType {
  // Panel and UI state
  selectedHost: Host | null;
  isControlActive: boolean;
  isRemotePanelOpen: boolean;
  showRemotePanel: boolean;
  showAVPanel: boolean;
  isVerificationActive: boolean;

  // Host data (filtered by interface models)
  availableHosts: Host[];
  getHostByName: (name: string) => Host | undefined;
  fetchHosts: () => void;

  // Panel and UI handlers
  handleDeviceSelect: (host: Host | null) => void;
  handleControlStateChange: (active: boolean) => void;
  handleToggleRemotePanel: () => void;
  handleConnectionChange: (connected: boolean) => void;
  handleDisconnectComplete: () => void;
}

interface DeviceControlProviderProps {
  children: React.ReactNode;
  userInterface?: {
    models?: string[];
  };
}

// ========================================
// CONTEXT
// ========================================

const DeviceControlContext = createContext<DeviceControlContextType | null>(null);

export const DeviceControlProvider: React.FC<DeviceControlProviderProps> = React.memo(
  ({ children, userInterface }) => {
    console.log('[@context:DeviceControlProvider] Initializing device control context');

    // ========================================
    // STATE
    // ========================================

    // Panel and UI state
    const [selectedHost, setSelectedHost] = useState<Host | null>(null);
    const [isControlActive, setIsControlActive] = useState(false);
    const [isRemotePanelOpen, setIsRemotePanelOpen] = useState(false);
    const [showRemotePanel, setShowRemotePanel] = useState(false);
    const [showAVPanel, setShowAVPanel] = useState(false);
    const [isVerificationActive, _setIsVerificationActive] = useState(false);

    // Filtered hosts based on interface models
    const [filteredAvailableHosts, setFilteredAvailableHosts] = useState<Host[]>([]);

    // Memoize userInterface to prevent unnecessary re-renders
    const stableUserInterface = useMemo(() => userInterface, [userInterface]);

    // Get registration context for host management
    const { availableHosts, getHostByName, fetchHosts } = useRegistration();

    // ========================================
    // HANDLERS
    // ========================================

    // Handle device selection
    const handleDeviceSelect = useCallback((host: Host | null) => {
      console.log(`[@context:DeviceControlProvider] Device selected:`, host?.host_name || 'null');

      if (!host) {
        setSelectedHost(null);
        return;
      }

      setSelectedHost(host);
      console.log(
        `[@context:DeviceControlProvider] Host selected: ${host.host_name} (device: ${host.device_name})`,
      );
    }, []);

    // Handle control state changes (called from header after successful device control)
    const handleControlStateChange = useCallback((active: boolean) => {
      console.log(`[@context:DeviceControlProvider] Control state changed to: ${active}`);
      setIsControlActive(active);

      if (active) {
        // Show panels when control is active
        setShowRemotePanel(true);
        setShowAVPanel(true);
        setIsRemotePanelOpen(true);
        console.log(`[@context:DeviceControlProvider] Panels shown after control activation`);
      } else {
        // Hide panels when control is inactive
        setShowRemotePanel(false);
        setShowAVPanel(false);
        setIsRemotePanelOpen(false);
        console.log(`[@context:DeviceControlProvider] Panels hidden after control deactivation`);
      }
    }, []);

    // Handle remote panel toggle
    const handleToggleRemotePanel = useCallback(() => {
      const newState = !isRemotePanelOpen;
      setIsRemotePanelOpen(newState);
      console.log(
        `[@context:DeviceControlProvider] Remote panel toggled: ${newState ? 'open' : 'closed'}`,
      );
    }, [isRemotePanelOpen]);

    // Handle connection change (for panels)
    const handleConnectionChange = useCallback((connected: boolean) => {
      console.log(`[@context:DeviceControlProvider] Connection state changed: ${connected}`);
      // Could update UI state based on connection status
    }, []);

    // Handle disconnect complete (for panels)
    const handleDisconnectComplete = useCallback(() => {
      console.log(`[@context:DeviceControlProvider] Disconnect complete`);
      setIsControlActive(false);
      setShowRemotePanel(false);
      setShowAVPanel(false);
      setIsRemotePanelOpen(false);
    }, []);

    // ========================================
    // EFFECTS
    // ========================================

    // Ensure hosts are fetched when component mounts
    useEffect(() => {
      console.log(
        `[@context:DeviceControlProvider] Component mounted, checking hosts. Current count: ${availableHosts.length}`,
      );
      if (availableHosts.length === 0) {
        console.log(`[@context:DeviceControlProvider] No hosts available, triggering fetch...`);
        fetchHosts();
      }
    }, [availableHosts.length, fetchHosts]);

    // Update filtered hosts when availableHosts changes
    useEffect(() => {
      console.log(
        `[@context:DeviceControlProvider] Filtering hosts - availableHosts: ${availableHosts.length}, interface models:`,
        stableUserInterface?.models,
      );

      if (stableUserInterface?.models && availableHosts.length > 0) {
        console.log(
          `[@context:DeviceControlProvider] Available hosts for filtering:`,
          availableHosts.map((h) => ({ host_name: h.host_name, device_model: h.device_model })),
        );

        const compatibleHosts = availableHosts.filter((host) =>
          stableUserInterface.models!.includes(host.device_model),
        );

        console.log(
          `[@context:DeviceControlProvider] Filtered result: ${compatibleHosts.length}/${availableHosts.length} hosts`,
        );
        setFilteredAvailableHosts(compatibleHosts);
      } else {
        console.log(
          `[@context:DeviceControlProvider] No filtering - showing all ${availableHosts.length} hosts`,
        );
        setFilteredAvailableHosts(availableHosts);
      }
    }, [availableHosts, stableUserInterface?.models]);

    // ========================================
    // CONTEXT VALUE
    // ========================================

    const contextValue = useMemo(
      () => ({
        // Panel and UI state
        selectedHost,
        isControlActive,
        isRemotePanelOpen,
        showRemotePanel,
        showAVPanel,
        isVerificationActive,

        // Host data (filtered by interface models)
        availableHosts: filteredAvailableHosts,
        getHostByName,
        fetchHosts,

        // Panel and UI handlers
        handleDeviceSelect,
        handleControlStateChange,
        handleToggleRemotePanel,
        handleConnectionChange,
        handleDisconnectComplete,
      }),
      [
        // Only include state values that actually change
        selectedHost,
        isControlActive,
        isRemotePanelOpen,
        showRemotePanel,
        showAVPanel,
        isVerificationActive,
        filteredAvailableHosts,
        // Remove stable functions from dependencies to prevent unnecessary re-renders
        // getHostByName,
        // fetchHosts,
        // handleDeviceSelect,
        // handleControlStateChange,
        // handleToggleRemotePanel,
        // handleConnectionChange,
        // handleDisconnectComplete,
      ],
    );

    return (
      <DeviceControlContext.Provider value={contextValue}>{children}</DeviceControlContext.Provider>
    );
  },
);

// ========================================
// HOOK
// ========================================

export const useDeviceControl = (): DeviceControlContextType => {
  const context = useContext(DeviceControlContext);
  if (!context) {
    throw new Error('useDeviceControl must be used within a DeviceControlProvider');
  }
  return context;
};
