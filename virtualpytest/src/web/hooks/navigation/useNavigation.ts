import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useRegistration } from '../../contexts/RegistrationContext';

export interface NavigationHookResult {
  // Interface data
  interfaceName: string | undefined;
  interfaceModels: string[];
  isLoadingInterface: boolean;
  interfaceError: string | null;

  // Host data
  availableHosts: any[];
  filteredHosts: any[];
  isLoadingHosts: boolean;

  // Device selection
  selectedDeviceName: string | null;
  setSelectedDeviceName: (deviceName: string | null) => void;

  // Device control state
  isControlActive: boolean;
  setIsControlActive: (active: boolean) => void;
  isRemotePanelOpen: boolean;
  setIsRemotePanelOpen: (open: boolean) => void;
  isVerificationActive: boolean;
  setIsVerificationActive: (active: boolean) => void;
  verificationControllerStatus: {
    image_controller_available: boolean;
    text_controller_available: boolean;
  };
  setVerificationControllerStatus: (status: {
    image_controller_available: boolean;
    text_controller_available: boolean;
  }) => void;
  verificationResults: any[];
  setVerificationResults: (results: any[]) => void;
  verificationPassCondition: 'all' | 'any';
  setVerificationPassCondition: (condition: 'all' | 'any') => void;
  lastVerifiedNodeId: string | null;
  setLastVerifiedNodeId: (nodeId: string | null) => void;

  // Device control actions
  handleTakeControl: () => Promise<void>;
  handleTakeScreenshot: (
    selectedNode: any,
    nodes: any[],
    setNodes: any,
    setAllNodes: any,
    setSelectedNode: any,
    setHasUnsavedChanges: any,
  ) => Promise<void>;
  handleToggleRemotePanel: () => void;
}

export const useNavigation = (): NavigationHookResult => {
  // Extract interface name from URL
  const { interfaceName } = useParams<{ interfaceName: string }>();

  // Get hosts from registration context
  const { availableHosts, fetchHosts } = useRegistration();

  // Interface state
  const [interfaceModels, setInterfaceModels] = useState<string[]>([]);
  const [isLoadingInterface, setIsLoadingInterface] = useState(false);
  const [interfaceError, setInterfaceError] = useState<string | null>(null);

  // Device selection state
  const [selectedDeviceName, setSelectedDeviceName] = useState<string | null>(null);

  // Device control state
  const [isControlActive, setIsControlActive] = useState(false);
  const [isRemotePanelOpen, setIsRemotePanelOpen] = useState(false);
  const [isVerificationActive, setIsVerificationActive] = useState(false);
  const [verificationControllerStatus, setVerificationControllerStatus] = useState<{
    image_controller_available: boolean;
    text_controller_available: boolean;
  }>({
    image_controller_available: false,
    text_controller_available: false,
  });
  const [verificationResults, setVerificationResults] = useState<any[]>([]);
  const [verificationPassCondition, setVerificationPassCondition] = useState<'all' | 'any'>('all');
  const [lastVerifiedNodeId, setLastVerifiedNodeId] = useState<string | null>(null);

  // Fetch interface models when interface name is available
  useEffect(() => {
    if (interfaceName) {
      setIsLoadingInterface(true);
      setInterfaceError(null);

      console.log(`[@hook:useNavigation] Fetching interface models for: ${interfaceName}`);

      fetch(`/server/userinterface/getUserInterfaceByName/${interfaceName}`)
        .then((response) => response.json())
        .then((data) => {
          if (data && data.models) {
            setInterfaceModels(data.models);
            console.log(
              `[@hook:useNavigation] Loaded models for interface ${interfaceName}:`,
              data.models,
            );
          } else {
            console.warn(`[@hook:useNavigation] No models found for interface: ${interfaceName}`);
            setInterfaceModels([]);
          }
        })
        .catch((error) => {
          console.error(`[@hook:useNavigation] Error fetching interface models:`, error);
          setInterfaceError(error.message);
          setInterfaceModels([]);
        })
        .finally(() => {
          setIsLoadingInterface(false);
        });
    }
  }, [interfaceName]);

  // Fetch hosts on mount
  useEffect(() => {
    fetchHosts();
  }, [fetchHosts]);

  // Filter hosts based on interface models
  const filteredHosts = useMemo(() => {
    if (interfaceModels.length === 0) {
      console.log(
        `[@hook:useNavigation] No models loaded, showing all ${availableHosts.length} hosts`,
      );
      return availableHosts;
    }

    const filtered = availableHosts.filter((host) => interfaceModels.includes(host.device_model));

    console.log(
      `[@hook:useNavigation] Filtered hosts: ${filtered.length}/${availableHosts.length} hosts match models: ${interfaceModels.join(', ')}`,
    );

    return filtered;
  }, [availableHosts, interfaceModels]);

  // Get selected device data
  const selectedDeviceData = useMemo(() => {
    return filteredHosts.find((host) => host.device_name === selectedDeviceName);
  }, [filteredHosts, selectedDeviceName]);

  // Device control handlers
  const handleToggleRemotePanel = useCallback(() => {
    setIsRemotePanelOpen((prev) => !prev);
    console.log(`[@hook:useNavigation] Remote panel toggled: ${!isRemotePanelOpen}`);
  }, [isRemotePanelOpen]);

  const handleTakeControl = useCallback(async () => {
    const wasControlActive = isControlActive;

    console.log(
      `[@hook:useNavigation] ${wasControlActive ? 'Releasing' : 'Taking'} control of device: ${selectedDeviceName}`,
    );

    // If we're releasing control, check if stream needs to be restarted BEFORE disconnecting
    if (wasControlActive && selectedDeviceData) {
      console.log(
        '[@hook:useNavigation] Releasing control, checking stream status before disconnect...',
      );

      try {
        // Check current stream status while SSH connection is still active
        const response = await fetch('/api/virtualpytest/screen-definition/stream/status');
        if (response.ok) {
          const data = await response.json();
          if (data.success && !data.is_active) {
            console.log(
              '[@hook:useNavigation] Stream was stopped, will restart after disconnect...',
            );

            // Restart the stream before disconnecting
            const restartResponse = await fetch(
              '/api/virtualpytest/screen-definition/stream/restart',
              {
                method: 'POST',
              },
            );

            if (restartResponse.ok) {
              const restartData = await restartResponse.json();
              if (restartData.success) {
                console.log(
                  '[@hook:useNavigation] Stream restarted successfully before releasing control',
                );
              }
            }
          } else if (data.success && data.is_active) {
            console.log('[@hook:useNavigation] Stream is already running, no restart needed');
          }
        } else {
          console.log(
            '[@hook:useNavigation] Stream status check failed, SSH connection may not be available',
          );
        }
      } catch (error) {
        console.log(
          '[@hook:useNavigation] Could not check/restart stream before disconnect:',
          error,
        );
        // Don't throw error, just log it
      }
    }

    // Toggle control state
    setIsControlActive(!isControlActive);
  }, [isControlActive, selectedDeviceName, selectedDeviceData]);

  const handleTakeScreenshot = useCallback(
    async (
      selectedNode: any,
      nodes: any[],
      setNodes: any,
      setAllNodes: any,
      setSelectedNode: any,
      setHasUnsavedChanges: any,
    ) => {
      if (!selectedDeviceName || !isControlActive || !selectedNode) {
        console.log(
          '[@hook:useNavigation] Cannot take screenshot: no device selected, not in control, or no node selected',
        );
        return;
      }

      try {
        // Get node name from selected node
        const nodeName = selectedNode.data.label || 'unknown';

        // Get parent name from selected node
        let parentName = 'root';
        if (selectedNode.data.parent && selectedNode.data.parent.length > 0) {
          // Find the parent node by ID
          const parentId = selectedNode.data.parent[selectedNode.data.parent.length - 1]; // Get the immediate parent
          const parentNode = nodes.find((node: any) => node.id === parentId);
          if (parentNode) {
            parentName = parentNode.data.label || 'unknown';
          }
        }

        console.log(
          `[@hook:useNavigation] Taking screenshot for device: ${selectedDeviceName}, parent: ${parentName}, node: ${nodeName}`,
        );

        // Call screenshot API with parent and node name parameters
        const response = await fetch('/api/virtualpytest/screen-definition/screenshot', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            device_model: selectedDeviceData?.device_model || 'android_mobile',
            video_device:
              selectedDeviceData?.controller_configs?.av?.parameters?.video_device || '/dev/video0',
            parent_name: parentName,
            node_name: nodeName,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          console.log('[@hook:useNavigation] Screenshot taken successfully:', data);

          if (data.success) {
            console.log(`[@hook:useNavigation] Screenshot saved to: ${data.screenshot_path}`);

            // Use the additional_screenshot_path if available (parent/node structure), otherwise fall back to screenshot_path
            const screenshotPath = data.additional_screenshot_path || data.screenshot_path;
            const screenshotUrl = `/api/virtualpytest/screen-definition/images?path=${encodeURIComponent(screenshotPath)}`;

            // Create updated node with screenshot
            const updatedNode = {
              ...selectedNode,
              data: {
                ...selectedNode.data,
                screenshot: screenshotUrl,
              },
            };

            // Create a function to update nodes consistently
            const updateNodeFunction = (nodes: any[]) =>
              nodes.map((node: any) => (node.id === selectedNode.id ? updatedNode : node));

            // Update both filtered nodes and allNodes arrays
            setNodes(updateNodeFunction);
            setAllNodes(updateNodeFunction);

            // Update selected node so the panel reflects the change
            setSelectedNode(updatedNode);

            // Mark tree as having unsaved changes
            setHasUnsavedChanges(true);

            console.log(
              `[@hook:useNavigation] Updated node ${selectedNode.id} with screenshot: ${screenshotUrl}`,
            );
            console.log(`[@hook:useNavigation] Marked tree as having unsaved changes`);
          } else {
            console.error('[@hook:useNavigation] Screenshot failed:', data.error);
          }
        } else {
          console.error(
            '[@hook:useNavigation] Screenshot failed:',
            response.status,
            response.statusText,
          );
        }
      } catch (error) {
        console.error('[@hook:useNavigation] Error taking screenshot:', error);
      }
    },
    [selectedDeviceName, isControlActive, selectedDeviceData],
  );

  return {
    // Interface data
    interfaceName,
    interfaceModels,
    isLoadingInterface,
    interfaceError,

    // Host data
    availableHosts,
    filteredHosts,
    isLoadingHosts: false, // Registration context handles this

    // Device selection
    selectedDeviceName,
    setSelectedDeviceName,

    // Device control state
    isControlActive,
    setIsControlActive,
    isRemotePanelOpen,
    setIsRemotePanelOpen,
    isVerificationActive,
    setIsVerificationActive,
    verificationControllerStatus,
    setVerificationControllerStatus,
    verificationResults,
    setVerificationResults,
    verificationPassCondition,
    setVerificationPassCondition,
    lastVerifiedNodeId,
    setLastVerifiedNodeId,

    // Device control actions
    handleTakeControl,
    handleTakeScreenshot,
    handleToggleRemotePanel,
  };
};
