import { useState, useCallback, useEffect, useMemo } from 'react';

import { Host } from '../../types/common/Host_Types';
import { useRegistration } from '../useRegistration';

interface UseNavigationPanelsProps {
  userInterface: any;
}

export const useNavigationPanels = ({ userInterface }: UseNavigationPanelsProps) => {
  // ========================================
  // NAVIGATION PANEL STATE
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

  // Get registration context for host management
  const { availableHosts, getHostByName, fetchHosts } = useRegistration();

  // ========================================
  // NAVIGATION PANEL HANDLERS
  // ========================================

  // Handle device selection
  const handleDeviceSelect = useCallback((host: Host | null) => {
    console.log(`[@hook:useNavigationPanels] Device selected:`, host?.host_name || 'null');

    if (!host) {
      setSelectedHost(null);
      return;
    }

    setSelectedHost(host);
    console.log(
      `[@hook:useNavigationPanels] Host selected: ${host.host_name} (device: ${host.device_name})`,
    );
  }, []);

  // Handle control state changes (called from header after successful device control)
  const handleControlStateChange = useCallback((active: boolean) => {
    console.log(`[@hook:useNavigationPanels] Control state changed to: ${active}`);
    setIsControlActive(active);

    if (active) {
      // Show panels when control is active
      setShowRemotePanel(true);
      setShowAVPanel(true);
      setIsRemotePanelOpen(true);
      console.log(`[@hook:useNavigationPanels] Panels shown after control activation`);
    } else {
      // Hide panels when control is inactive
      setShowRemotePanel(false);
      setShowAVPanel(false);
      setIsRemotePanelOpen(false);
      console.log(`[@hook:useNavigationPanels] Panels hidden after control deactivation`);
    }
  }, []);

  // Handle remote panel toggle
  const handleToggleRemotePanel = useCallback(() => {
    const newState = !isRemotePanelOpen;
    setIsRemotePanelOpen(newState);
    console.log(
      `[@hook:useNavigationPanels] Remote panel toggled: ${newState ? 'open' : 'closed'}`,
    );
  }, [isRemotePanelOpen]);

  // Handle connection change (for panels)
  const handleConnectionChange = useCallback((connected: boolean) => {
    console.log(`[@hook:useNavigationPanels] Connection state changed: ${connected}`);
    // Could update UI state based on connection status
  }, []);

  // Handle disconnect complete (for panels)
  const handleDisconnectComplete = useCallback(() => {
    console.log(`[@hook:useNavigationPanels] Disconnect complete`);
    setIsControlActive(false);
    setShowRemotePanel(false);
    setShowAVPanel(false);
    setIsRemotePanelOpen(false);
  }, []);

  // ========================================
  // HOST FILTERING EFFECTS
  // ========================================

  // Ensure hosts are fetched when component mounts
  useEffect(() => {
    console.log(
      `[@hook:useNavigationPanels] Component mounted, checking hosts. Current count: ${availableHosts.length}`,
    );
    if (availableHosts.length === 0) {
      console.log(`[@hook:useNavigationPanels] No hosts available, triggering fetch...`);
      fetchHosts();
    }
  }, [availableHosts.length, fetchHosts]); // Fixed dependencies

  // Update filtered hosts when availableHosts changes
  useEffect(() => {
    console.log(
      `[@hook:useNavigationPanels] Filtering hosts - availableHosts: ${availableHosts.length}, interface models:`,
      userInterface?.models,
    );

    if (userInterface?.models && availableHosts.length > 0) {
      console.log(
        `[@hook:useNavigationPanels] Available hosts for filtering:`,
        availableHosts.map((h) => ({ host_name: h.host_name, device_model: h.device_model })),
      );

      const compatibleHosts = availableHosts.filter((host) =>
        userInterface.models.includes(host.device_model),
      );

      console.log(
        `[@hook:useNavigationPanels] Filtered result: ${compatibleHosts.length}/${availableHosts.length} hosts`,
      );
      setFilteredAvailableHosts(compatibleHosts);
    } else {
      console.log(
        `[@hook:useNavigationPanels] No filtering - showing all ${availableHosts.length} hosts`,
      );
      setFilteredAvailableHosts(availableHosts);
    }
  }, [availableHosts, userInterface?.models]);

  return useMemo(
    () => ({
      // Panel and UI state
      selectedHost,
      isControlActive,
      isRemotePanelOpen,
      showRemotePanel,
      showAVPanel,
      isVerificationActive,

      // Panel and UI handlers
      handleDeviceSelect,
      handleControlStateChange,
      handleToggleRemotePanel,
      handleConnectionChange,
      handleDisconnectComplete,

      // Host data (filtered by interface models)
      availableHosts: filteredAvailableHosts,
      getHostByName,
      fetchHosts,
    }),
    [
      // State values
      selectedHost,
      isControlActive,
      isRemotePanelOpen,
      showRemotePanel,
      showAVPanel,
      isVerificationActive,
      filteredAvailableHosts,
      // Handlers (these are stable due to useCallback)
      handleDeviceSelect,
      handleControlStateChange,
      handleToggleRemotePanel,
      handleConnectionChange,
      handleDisconnectComplete,
      // External functions (these should be stable from useRegistration)
      getHostByName,
      fetchHosts,
    ],
  );
};
