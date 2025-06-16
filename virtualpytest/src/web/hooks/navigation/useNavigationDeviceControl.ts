import { useState, useCallback, useEffect } from 'react';

import { Host } from '../../types/common/Host_Types';
import { useRegistration } from '../useRegistration';
import { useToast } from '../useToast';

interface UseNavigationDeviceControlProps {
  userInterface: any;
  buildServerUrl: (path: string) => string;
}

export const useNavigationDeviceControl = ({
  userInterface,
  buildServerUrl,
}: UseNavigationDeviceControlProps) => {
  // ========================================
  // DEVICE CONTROL STATE
  // ========================================

  // Device control state
  const [selectedHost, setSelectedHost] = useState<Host | null>(null);
  const [isControlActive, setIsControlActive] = useState(false);
  const [isControlLoading, setIsControlLoading] = useState(false);
  const [isRemotePanelOpen, setIsRemotePanelOpen] = useState(false);
  const [showRemotePanel, setShowRemotePanel] = useState(false);
  const [showAVPanel, setShowAVPanel] = useState(false);
  const [isVerificationActive, _setIsVerificationActive] = useState(false);

  // Filtered hosts based on interface models
  const [filteredAvailableHosts, setFilteredAvailableHosts] = useState<Host[]>([]);

  // Get registration context for host management
  const { availableHosts, getHostByName, fetchHosts } = useRegistration();

  // Get toast context for error notifications
  const { showError } = useToast();

  // ========================================
  // DEVICE CONTROL HANDLERS
  // ========================================

  // Handle device selection
  const handleDeviceSelect = useCallback(
    (hostName: string | null) => {
      console.log(`[@hook:useNavigationDeviceControl] Device selected: ${hostName}`);

      if (!hostName) {
        setSelectedHost(null);
        return;
      }

      const host = getHostByName(hostName);
      if (host) {
        setSelectedHost(host);
        console.log(
          `[@hook:useNavigationDeviceControl] Host found and selected: ${host.host_name} (device: ${host.device_name})`,
        );
      } else {
        console.warn(`[@hook:useNavigationDeviceControl] Host not found: ${hostName}`);
        setSelectedHost(null);
      }
    },
    [getHostByName],
  );

  // Handle take control
  const handleTakeControl = useCallback(async () => {
    if (!selectedHost) {
      console.warn('[@hook:useNavigationDeviceControl] No host selected for take control');
      return;
    }

    console.log(
      `[@hook:useNavigationDeviceControl] Taking control of device: ${selectedHost.host_name}`,
    );

    setIsControlLoading(true);
    let errorShown = false; // Flag to prevent duplicate toasts

    try {
      if (!isControlActive) {
        console.log(
          `[@hook:useNavigationDeviceControl] Taking control of host: ${selectedHost?.host_name}`,
        );

        // STEP 1: Take control using correct server route (with locked_by_same_user handling)
        const response = await fetch(buildServerUrl('server/control/take-control'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host_name: selectedHost?.host_name,
            session_id: 'navigation-editor-session',
          }),
        });

        const result = await response.json();

        if (result.success) {
          console.log(`[@hook:useNavigationDeviceControl] Control taken successfully`);

          // STEP 2: Show panels after successful control
          setIsControlActive(true);
          setShowRemotePanel(true);
          setShowAVPanel(true);
          setIsRemotePanelOpen(true);
          console.log(`[@hook:useNavigationDeviceControl] Panels shown after successful control`);
        } else {
          // Check if it's locked by same user - if so, treat as success (handles page refresh scenario)
          if (response.status === 409 && result.locked_by_same_user) {
            console.log(
              `[@hook:useNavigationDeviceControl] Device ${selectedHost.host_name} locked by same user, treating as success`,
            );

            // STEP 2: Show panels after successful reclaim
            setIsControlActive(true);
            setShowRemotePanel(true);
            setShowAVPanel(true);
            setIsRemotePanelOpen(true);
            console.log(`[@hook:useNavigationDeviceControl] Panels shown after successful reclaim`);
          } else {
            console.error(
              `[@hook:useNavigationDeviceControl] Failed to take control:`,
              result.error,
            );
            const errorMessage = result.error || 'Failed to take control';
            showError(`Device Control Failed: ${errorMessage}`);
            errorShown = true;
            throw new Error(errorMessage);
          }
        }
      } else {
        console.log(
          `[@hook:useNavigationDeviceControl] Releasing control of host: ${selectedHost?.host_name}`,
        );

        // STEP 1: Release control using correct server route
        const response = await fetch(buildServerUrl('server/control/release-control'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host_name: selectedHost?.host_name,
            session_id: 'navigation-editor-session',
          }),
        });

        const result = await response.json();
        console.log(`[@hook:useNavigationDeviceControl] Release control result:`, result);

        // STEP 2: Hide panels regardless of server response
        setIsControlActive(false);
        setShowRemotePanel(false);
        setShowAVPanel(false);
        setIsRemotePanelOpen(false);
        console.log(`[@hook:useNavigationDeviceControl] Control released, panels hidden`);
      }
    } catch (error) {
      console.error('[@hook:useNavigationDeviceControl] Error during take control:', error);

      // Only show toast if we haven't already shown one
      if (!errorShown && error instanceof Error) {
        showError(`Device Control Error: ${error.message}`);
      }

      // Reset state on error
      setIsControlActive(false);
      setShowRemotePanel(false);
      setShowAVPanel(false);
      setIsRemotePanelOpen(false);
    } finally {
      setIsControlLoading(false);
    }
  }, [selectedHost, isControlActive, buildServerUrl, showError]);

  // Handle remote panel toggle
  const handleToggleRemotePanel = useCallback(() => {
    const newState = !isRemotePanelOpen;
    setIsRemotePanelOpen(newState);
    console.log(
      `[@hook:useNavigationDeviceControl] Remote panel toggled: ${newState ? 'open' : 'closed'}`,
    );
  }, [isRemotePanelOpen]);

  // Handle connection change (for panels)
  const handleConnectionChange = useCallback((connected: boolean) => {
    console.log(`[@hook:useNavigationDeviceControl] Connection state changed: ${connected}`);
    // Could update UI state based on connection status
  }, []);

  // Handle disconnect complete (for panels)
  const handleDisconnectComplete = useCallback(() => {
    console.log(`[@hook:useNavigationDeviceControl] Disconnect complete`);
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
      `[@hook:useNavigationDeviceControl] Component mounted, checking hosts. Current count: ${availableHosts.length}`,
    );
    if (availableHosts.length === 0) {
      console.log(`[@hook:useNavigationDeviceControl] No hosts available, triggering fetch...`);
      fetchHosts();
    }
  }, [availableHosts.length, fetchHosts]); // Fixed dependencies

  // Update filtered hosts when availableHosts changes
  useEffect(() => {
    console.log(
      `[@hook:useNavigationDeviceControl] Filtering hosts - availableHosts: ${availableHosts.length}, interface models:`,
      userInterface?.models,
    );

    if (userInterface?.models && availableHosts.length > 0) {
      console.log(
        `[@hook:useNavigationDeviceControl] Available hosts for filtering:`,
        availableHosts.map((h) => ({ host_name: h.host_name, device_model: h.device_model })),
      );

      const compatibleHosts = availableHosts.filter((host) =>
        userInterface.models.includes(host.device_model),
      );

      console.log(
        `[@hook:useNavigationDeviceControl] Filtered result: ${compatibleHosts.length}/${availableHosts.length} hosts`,
      );
      setFilteredAvailableHosts(compatibleHosts);
    } else {
      console.log(
        `[@hook:useNavigationDeviceControl] No filtering - showing all ${availableHosts.length} hosts`,
      );
      setFilteredAvailableHosts(availableHosts);
    }
  }, [availableHosts, userInterface?.models]);

  return {
    // Device control state
    selectedHost,
    isControlActive,
    isControlLoading,
    isRemotePanelOpen,
    showRemotePanel,
    showAVPanel,
    isVerificationActive,

    // Device control handlers
    handleDeviceSelect,
    handleTakeControl,
    handleToggleRemotePanel,
    handleConnectionChange,
    handleDisconnectComplete,

    // Host data (filtered by interface models)
    availableHosts: filteredAvailableHosts,
    getHostByName,
    fetchHosts,
  };
};
