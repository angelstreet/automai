import React, { useState, useCallback, useEffect, useMemo } from 'react';

import { useRegistration } from '../hooks/useRegistration';
import { Host } from '../types/common/Host_Types';
import { HostManagerContext } from './HostManagerContext';

interface HostManagerProviderProps {
  children: React.ReactNode;
  userInterface?: {
    models?: string[];
  };
}

/**
 * Provider component for host management
 * This component provides access to host data and device control functionality
 */
export const HostManagerProvider: React.FC<HostManagerProviderProps> = ({
  children,
  userInterface,
}) => {
  console.log('[@context:HostManagerProvider] Initializing host manager context');

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
    console.log(`[@context:HostManagerProvider] Device selected:`, host?.host_name || 'null');

    if (!host) {
      setSelectedHost(null);
      return;
    }

    setSelectedHost(host);
    // Fix device_name property access
    const deviceName = host.devices && host.devices.length > 0 ? host.devices[0].name : 'unknown';
    console.log(
      `[@context:HostManagerProvider] Host selected: ${host.host_name} (device: ${deviceName})`,
    );
  }, []);

  // Handle control state changes (called from header after successful device control)
  const handleControlStateChange = useCallback((active: boolean) => {
    console.log(`[@context:HostManagerProvider] Control state changed to: ${active}`);
    setIsControlActive(active);

    if (active) {
      // Show panels when control is active
      setShowRemotePanel(true);
      setShowAVPanel(true);
      setIsRemotePanelOpen(true);
      console.log(`[@context:HostManagerProvider] Panels shown after control activation`);
    } else {
      // Hide panels when control is inactive
      setShowRemotePanel(false);
      setShowAVPanel(false);
      setIsRemotePanelOpen(false);
      console.log(`[@context:HostManagerProvider] Panels hidden after control deactivation`);
    }
  }, []);

  // Handle remote panel toggle
  const handleToggleRemotePanel = useCallback(() => {
    const newState = !isRemotePanelOpen;
    setIsRemotePanelOpen(newState);
    console.log(
      `[@context:HostManagerProvider] Remote panel toggled: ${newState ? 'open' : 'closed'}`,
    );
  }, [isRemotePanelOpen]);

  // Handle connection change (for panels)
  const handleConnectionChange = useCallback((connected: boolean) => {
    console.log(`[@context:HostManagerProvider] Connection state changed: ${connected}`);
    // Could update UI state based on connection status
  }, []);

  // Handle disconnect complete (for panels)
  const handleDisconnectComplete = useCallback(() => {
    console.log(`[@context:HostManagerProvider] Disconnect complete`);
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
      `[@context:HostManagerProvider] Component mounted, checking hosts. Current count: ${availableHosts.length}`,
    );
    if (availableHosts.length === 0) {
      console.log(`[@context:HostManagerProvider] No hosts available, triggering fetch...`);
      fetchHosts();
    }
  }, [availableHosts.length, fetchHosts]);

  // Update filtered hosts when availableHosts changes
  useEffect(() => {
    console.log(
      `[@context:HostManagerProvider] Filtering hosts - availableHosts: ${availableHosts.length}, interface models:`,
      stableUserInterface?.models,
    );

    if (stableUserInterface?.models && availableHosts.length > 0) {
      console.log(
        `[@context:HostManagerProvider] Available hosts for filtering:`,
        availableHosts.map((h) => ({
          host_name: h.host_name,
          device_models: h.devices?.map((d) => d.model) || [],
        })),
      );

      // Fix model filtering to check device models
      const compatibleHosts = availableHosts.filter((host) =>
        host.devices?.some((device) => stableUserInterface.models!.includes(device.model)),
      );

      console.log(
        `[@context:HostManagerProvider] Filtered result: ${compatibleHosts.length}/${availableHosts.length} hosts`,
      );
      setFilteredAvailableHosts(compatibleHosts);
    } else {
      console.log(
        `[@context:HostManagerProvider] No filtering - showing all ${availableHosts.length} hosts`,
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
      // Include all dependencies
      selectedHost,
      isControlActive,
      isRemotePanelOpen,
      showRemotePanel,
      showAVPanel,
      isVerificationActive,
      filteredAvailableHosts,
      getHostByName,
      fetchHosts,
      handleDeviceSelect,
      handleControlStateChange,
      handleToggleRemotePanel,
      handleConnectionChange,
      handleDisconnectComplete,
    ],
  );

  return <HostManagerContext.Provider value={contextValue}>{children}</HostManagerContext.Provider>;
};

HostManagerProvider.displayName = 'HostManagerProvider';
