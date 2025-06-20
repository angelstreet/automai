import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams } from 'react-router-dom';

import { useRegistration } from '../useRegistration';

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

  // Device selection and control
  selectedDevice: string | null;
  isControlActive: boolean;
  isRemotePanelOpen: boolean;
  setSelectedDevice: (device: string | null) => void;
  handleTakeControl: () => Promise<void>;
  handleToggleRemotePanel: () => void;

  // Tree state
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (value: boolean) => void;
  focusNodeId: string | null;
  setFocusNodeId: (nodeId: string | null) => void;
  maxDisplayDepth: number;
  setMaxDisplayDepth: (depth: number) => void;

  // Screenshot functionality
  handleTakeScreenshot: (
    selectedNode: any,
    nodes: any[],
    setNodes: any,
    setAllNodes: any,
    setSelectedNode: any,
    setHasUnsavedChanges: any,
  ) => Promise<void>;
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

  // Device selection and control state
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [isControlActive, setIsControlActive] = useState(false);
  const [isRemotePanelOpen, setIsRemotePanelOpen] = useState(false);

  // Tree state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [maxDisplayDepth, setMaxDisplayDepth] = useState(3);

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

    // Debug logging: Show all available host device models
    console.log(`[@hook:useNavigation] Interface models:`, interfaceModels);
    console.log(
      `[@hook:useNavigation] Available hosts device models:`,
      availableHosts.map((host) => ({
        host_name: host.host_name,
        device_model: host.device_model,
        device_name: host.device_name,
      })),
    );

    const filtered = availableHosts.filter((host) => interfaceModels.includes(host.device_model));

    console.log(
      `[@hook:useNavigation] Filtered hosts: ${filtered.length}/${availableHosts.length} hosts match models: ${interfaceModels.join(', ')}`,
    );

    // Debug logging: Show which hosts were filtered out and why
    const filteredOut = availableHosts.filter(
      (host) => !interfaceModels.includes(host.device_model),
    );
    if (filteredOut.length > 0) {
      console.log(
        `[@hook:useNavigation] Hosts filtered out:`,
        filteredOut.map((host) => ({
          host_name: host.host_name,
          device_model: host.device_model,
          reason: `device_model "${host.device_model}" not in interface models [${interfaceModels.join(', ')}]`,
        })),
      );
    }

    return filtered;
  }, [availableHosts, interfaceModels]);

  // Handle take control
  const handleTakeControl = useCallback(async () => {
    if (!selectedDevice) {
      console.log('[@hook:useNavigation] Cannot take control: no device selected');
      return;
    }

    const wasControlActive = isControlActive;
    const controlAction = wasControlActive ? 'release-control' : 'take-control';

    console.log(
      `[@hook:useNavigation] ${wasControlActive ? 'Releasing' : 'Taking'} control of device: ${selectedDevice}`,
    );

    try {
      const response = await fetch(`/server/control/${controlAction}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host_name: selectedDevice,
          session_id: 'default-session',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setIsControlActive(!wasControlActive);
          if (!wasControlActive) {
            setIsRemotePanelOpen(true);
          } else {
            setIsRemotePanelOpen(false);
          }
          console.log(
            `[@hook:useNavigation] Successfully ${wasControlActive ? 'released' : 'taken'} control of device: ${selectedDevice}`,
          );
        } else {
          console.error(`[@hook:useNavigation] Failed to ${controlAction}: ${data.error}`);
        }
      } else {
        console.error(
          `[@hook:useNavigation] Server error during ${controlAction}: ${response.status} ${response.statusText}`,
        );
      }
    } catch (error) {
      console.error(`[@hook:useNavigation] Error during control operation:`, error);
    }
  }, [selectedDevice, isControlActive]);

  // Handle remote panel toggle
  const handleToggleRemotePanel = useCallback(() => {
    setIsRemotePanelOpen((prev) => !prev);
    console.log(`[@hook:useNavigation] Remote panel toggled: ${!isRemotePanelOpen}`);
  }, [isRemotePanelOpen]);

  // Screenshot functionality
  const handleTakeScreenshot = useCallback(
    async (
      selectedNode: any,
      nodes: any[],
      setNodes: any,
      setAllNodes: any,
      setSelectedNode: any,
      setHasUnsavedChanges: any,
    ) => {
      if (!selectedDevice || !selectedNode) {
        console.log(
          '[@hook:useNavigation] Cannot take screenshot: no device selected or no node selected',
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
          `[@hook:useNavigation] Taking screenshot for device: ${selectedDevice}, parent: ${parentName}, node: ${nodeName}`,
        );

        // Call screenshot API with parent and node name parameters
        const response = await fetch('/api/virtualpytest/screen-definition/screenshot', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            device_model: selectedDevice,
            video_device: '/dev/video0', // Use default video device
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
    [selectedDevice],
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
    isLoadingHosts: false,

    // Device selection and control
    selectedDevice,
    isControlActive,
    isRemotePanelOpen,
    setSelectedDevice,
    handleTakeControl,
    handleToggleRemotePanel,

    // Tree state
    hasUnsavedChanges,
    setHasUnsavedChanges,
    focusNodeId,
    setFocusNodeId,
    maxDisplayDepth,
    setMaxDisplayDepth,

    // Screenshot functionality
    handleTakeScreenshot,
  };
};
