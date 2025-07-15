import { useCallback, useState, useEffect, useMemo } from 'react';

import { useDeviceData } from '../../contexts/device/DeviceDataContext';
import { useNavigation } from '../../contexts/navigation/NavigationContext';
import { Host } from '../../types/common/Host_Types';
import {
  UINavigationNode,
  NodeForm,
  NavigationStep,
  NavigationPreviewResponse,
  NavigationExecuteResponse,
} from '../../types/pages/Navigation_Types';

export interface UseNodeProps {
  selectedHost?: Host;
  selectedDeviceId?: string;
  isControlActive?: boolean;
  treeId?: string;
  currentNodeId?: string;
}

export const useNode = (props?: UseNodeProps) => {
  const { getModelReferences, referencesLoading } = useDeviceData();
  const { currentNodeId, updateCurrentPosition, updateNodesWithMinimapIndicators } =
    useNavigation();

  // Get the selected device from the host's devices array
  const selectedDevice = useMemo(() => {
    return props?.selectedHost?.devices?.find(
      (device) => device.device_id === props?.selectedDeviceId,
    );
  }, [props?.selectedHost, props?.selectedDeviceId]);

  // Get the device model from the selected device
  const deviceModel = selectedDevice?.device_model;

  // Get model references using the device model
  const modelReferences = useMemo(() => {
    if (!deviceModel) {
      return {};
    }
    return getModelReferences(deviceModel);
  }, [getModelReferences, deviceModel]);

  // State for screenshot operations
  const [screenshotSaveStatus, setScreenshotSaveStatus] = useState<'idle' | 'success' | 'error'>(
    'idle',
  );

  // Navigation state for NodeGotoPanel
  const [navigationSteps, setNavigationSteps] = useState<NavigationStep[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [navigationError, setNavigationError] = useState<string | null>(null);
  const [executionMessage, setExecutionMessage] = useState<string | null>(null);

  /**
   * Get node form data with verifications (already resolved by NavigationConfigContext)
   */
  const getNodeFormWithVerifications = useCallback((node: UINavigationNode): NodeForm => {
    return {
      label: node.data.label,
      type: node.data.type,
      description: node.data.description || '',
      screenshot: node.data.screenshot,
      depth: node.data.depth || 0,
      parent: node.data.parent || [],
      menu_type: node.data.menu_type,
      verifications: node.data.verifications || [], // Already resolved
      verification_ids: node.data.verification_ids || [],
    };
  }, []);

  /**
   * Take and save screenshot for a node
   */
  const takeAndSaveScreenshot = useCallback(
    async (
      label: string,
      nodeId: string,
      onUpdateNode?: (nodeId: string, updatedData: any) => void,
    ) => {
      if (!props?.selectedHost || !props?.selectedDeviceId) {
        return { success: false, message: 'Host or device not available' };
      }

      try {
        const response = await fetch('/server/av/saveScreenshot', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host: props.selectedHost,
            device_id: props.selectedDeviceId,
            filename: label,
            device_model: 'android_mobile',
          }),
        });

        const result = await response.json();

        if (result.success) {
          if (onUpdateNode) {
            onUpdateNode(nodeId, {
              screenshot: result.screenshot_url,
              screenshot_timestamp: Date.now(), // ✅ Force cache bust on same URL
            });
          }
          return { success: true, screenshot_url: result.screenshot_url };
        } else {
          return { success: false, message: result.message };
        }
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    },
    [props?.selectedHost, props?.selectedDeviceId],
  );

  /**
   * Handle screenshot confirmation and execution
   */
  const handleScreenshotConfirm = useCallback(
    async (
      selectedNode: UINavigationNode,
      onUpdateNode?: (nodeId: string, updatedData: any) => void,
    ) => {
      if (!props?.isControlActive || !props?.selectedHost || !props?.selectedDeviceId) {
        return;
      }

      const result = await takeAndSaveScreenshot(
        selectedNode.data.label,
        selectedNode.id,
        onUpdateNode,
      );

      if (result.success) {
        setScreenshotSaveStatus('success');
        setTimeout(() => setScreenshotSaveStatus('idle'), 3000);
      } else {
        setScreenshotSaveStatus('error');
        setTimeout(() => setScreenshotSaveStatus('idle'), 3000);
      }
    },
    [props?.isControlActive, props?.selectedHost, props?.selectedDeviceId, takeAndSaveScreenshot],
  );

  /**
   * Get parent names from parent IDs
   */
  const getParentNames = useCallback((parentIds: string[], nodes: UINavigationNode[]): string => {
    if (!parentIds || parentIds.length === 0) return 'None';
    if (!nodes || !Array.isArray(nodes)) return 'None';

    const parentNames = parentIds.map((id) => {
      const parentNode = nodes.find((node) => node.id === id);
      return parentNode ? parentNode.data.label : id;
    });

    return parentNames.join(' > ');
  }, []);

  /**
   * Get full path for navigation (NodeGotoPanel)
   */
  const getFullPath = useCallback(
    (selectedNode: UINavigationNode, nodes: UINavigationNode[]): string => {
      const parentNames = getParentNames(selectedNode.data.parent || [], nodes);
      if (parentNames === 'None') {
        return selectedNode.data.label;
      }
      return `${parentNames} → ${selectedNode.data.label}`;
    },
    [getParentNames],
  );

  /**
   * Find the home root node (entry point) from the tree
   */
  const findHomeRootNode = useCallback((nodes: UINavigationNode[]): string | undefined => {
    // First, try to find a node marked as isRoot
    const rootNode = nodes.find((node) => node.data.is_root === true);
    if (rootNode) {
      return rootNode.id;
    }

    // Fallback: find a node with label "home" (case insensitive)
    const homeNode = nodes.find((node) => node.data.label?.toLowerCase() === 'home');
    if (homeNode) {
      return homeNode.id;
    }

    // Last fallback: find the first non-entry node
    const nonEntryNode = nodes.find((node) => node.data.type !== 'entry');
    if (nonEntryNode) {
      return nonEntryNode.id;
    }

    return undefined;
  }, []);

  /**
   * Load navigation preview for NodeGotoPanel
   */
  const loadNavigationPreview = useCallback(
    async (
      selectedNode: UINavigationNode,
      allNodes?: UINavigationNode[],
      shouldUpdateMinimap: boolean = false,
    ) => {
      if (!props?.treeId) return;

      setIsLoadingPreview(true);
      setNavigationError(null);

      try {
        // Use only context currentNodeId - no fallbacks
        const startingNodeId = currentNodeId;

        const url = new URL(
          `/server/pathfinding/preview/${props.treeId}/${selectedNode.id}`,
          window.location.origin,
        );

        // Only add current_node_id if we have a valid starting node
        if (startingNodeId) {
          url.searchParams.append('current_node_id', startingNodeId);
        }

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const result: NavigationPreviewResponse = await response.json();

        if (result.success) {
          // Use the correct property name from server response
          const steps = result.transitions || [];
          setNavigationSteps(steps);

          // Only update minimap indicators if explicitly requested (during execution)
          if (shouldUpdateMinimap) {
            updateNodesWithMinimapIndicators(steps);
          }
        } else {
          setNavigationError(result.error || 'Failed to load navigation preview');
        }
      } catch (err) {
        setNavigationError(
          `Failed to load navigation preview: ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
      } finally {
        setIsLoadingPreview(false);
      }
    },
    [props?.treeId, currentNodeId, updateNodesWithMinimapIndicators],
  );

  /**
   * Execute navigation for NodeGotoPanel using standardized action/verification execution
   */
  const executeNavigation = useCallback(
    async (selectedNode: UINavigationNode, allNodes?: UINavigationNode[]) => {
      if (!props?.treeId) return;

      setIsExecuting(true);
      setNavigationError(null);

      try {
        // Use only context currentNodeId - no fallbacks
        const startingNodeId = currentNodeId;

        // 1. Get navigation path using existing pathfinding preview
        const url = new URL(
          `/server/pathfinding/preview/${props.treeId}/${selectedNode.id}`,
          window.location.origin,
        );

        if (startingNodeId) {
          url.searchParams.append('current_node_id', startingNodeId);
        }

        const previewResponse = await fetch(url.toString());
        const previewResult = await previewResponse.json();

        if (!previewResult.success) {
          throw new Error(previewResult.error || 'Failed to get navigation path');
        }

        const transitions = previewResult.transitions || [];

        if (transitions.length === 0) {
          throw new Error('No navigation path available');
        }

        console.log(
          `[@hook:useNode:executeNavigation] Found ${transitions.length} transitions to execute`,
        );

        // 2. Execute each transition using standardized action executor
        let transitionsExecuted = 0;
        let actionsExecuted = 0;
        const totalActions = transitions.reduce((sum, t) => sum + (t.actions?.length || 0), 0);

        for (let i = 0; i < transitions.length; i++) {
          const transition = transitions[i];
          const actions = transition.actions || [];
          const retryActions = transition.retryActions || [];
          const finalWaitTime = transition.finalWaitTime || 2000;

          console.log(
            `[@hook:useNode:executeNavigation] Executing transition ${i + 1}/${transitions.length}: ${transition.description}`,
          );

          if (actions.length > 0) {
            // Use standardized action execution via API (same as useAction hook)
            const actionResponse = await fetch('/server/action/executeBatch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                host: props.selectedHost,
                device_id: props.selectedDeviceId,
                actions: actions,
                retry_actions: retryActions,
                final_wait_time: finalWaitTime,
              }),
            });

            const actionResult = await actionResponse.json();

            if (!actionResult.success) {
              throw new Error(
                `Action execution failed in transition ${i + 1}: ${actionResult.error || 'Unknown error'}`,
              );
            }

            actionsExecuted += actionResult.passed_count || 0;
            console.log(
              `[@hook:useNode:executeNavigation] Transition ${i + 1} actions completed: ${actionResult.passed_count}/${actions.length} passed`,
            );
          }

          transitionsExecuted++;
        }

        // 3. Execute target node verifications using standardized verification executor
        const nodeVerifications = selectedNode.data.verifications || [];
        let verificationResults = [];

        if (nodeVerifications.length > 0) {
          console.log(
            `[@hook:useNode:executeNavigation] Executing ${nodeVerifications.length} target node verifications`,
          );

          // Get device model for verification context
          const device = props.selectedHost?.devices?.find(
            (d) => d.device_id === props.selectedDeviceId,
          );
          const deviceModel = device?.device_model || 'unknown';

          // Use standardized verification execution via API (same as useVerification hook)
          const verificationResponse = await fetch('/server/verification/executeBatch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              host: props.selectedHost,
              device_id: props.selectedDeviceId,
              verifications: nodeVerifications,
              model: deviceModel,
            }),
          });

          const verificationResult = await verificationResponse.json();
          verificationResults = verificationResult.results || [];

          if (!verificationResult.success) {
            throw new Error(
              `Target node verification failed: ${verificationResult.error || 'Unknown error'}`,
            );
          }

          console.log(
            `[@hook:useNode:executeNavigation] Target node verifications completed: ${verificationResult.passed_count}/${nodeVerifications.length} passed`,
          );
        }

        // 4. Navigation completed successfully
        const successMessage = `Navigation completed successfully! Executed ${transitionsExecuted}/${transitions.length} transitions, ${actionsExecuted}/${totalActions} actions`;
        setExecutionMessage(successMessage);
        setIsExecuting(false);

        // Update current position after successful navigation
        updateCurrentPosition(selectedNode.id, selectedNode.data.label);

        // Reload preview with minimap updates to show navigation route
        await loadNavigationPreview(selectedNode, allNodes, true);

        console.log(`[@hook:useNode:executeNavigation] Navigation completed successfully`);
      } catch (error: any) {
        console.error(`[@hook:useNode:executeNavigation] Navigation failed:`, error);
        const errorMessage = error.message || 'Navigation failed';
        setExecutionMessage(`Navigation failed: ${errorMessage}`);
        setIsExecuting(false);
      }
    },
    [
      props?.treeId,
      props?.selectedHost,
      props?.selectedDeviceId,
      currentNodeId,
      updateCurrentPosition,
      loadNavigationPreview,
    ],
  );

  /**
   * Clear navigation state when node changes
   */
  const clearNavigationState = useCallback(() => {
    setNavigationError(null);
    setExecutionMessage(null);
    // Clear navigation route indicators
    updateNodesWithMinimapIndicators([]);
  }, [updateNodesWithMinimapIndicators]);

  /**
   * Clear only navigation messages without affecting minimap indicators
   * Used when opening goto panel to clear previous messages but keep minimap unchanged
   */
  const clearNavigationMessages = useCallback(() => {
    setNavigationError(null);
    setExecutionMessage(null);
    // ❌ DON'T update minimap indicators when just clearing messages for preview
  }, []);

  /**
   * Check if node is an entry node
   */
  const isEntryNode = useCallback((node: UINavigationNode): boolean => {
    return node.data.type === 'entry';
  }, []);

  /**
   * Check if node is protected from deletion
   */
  const isProtectedNode = useCallback((node: UINavigationNode): boolean => {
    return (
      node.data.is_root ||
      node.data.type === 'entry' ||
      node.id === 'entry-node' ||
      node.data.label?.toLowerCase() === 'home' ||
      node.id?.toLowerCase().includes('entry') ||
      node.id?.toLowerCase().includes('home')
    );
  }, []);

  /**
   * Check button visibility states
   */
  const buttonVisibility = useMemo(() => {
    return {
      showSaveScreenshotButton: props?.isControlActive && props?.selectedHost,
      showGoToButton: props?.isControlActive && props?.selectedHost && props?.treeId,
      canRunGoto: props?.isControlActive && props?.selectedHost,
    };
  }, [props?.isControlActive, props?.selectedHost, props?.treeId]);

  const getButtonVisibility = useCallback(() => buttonVisibility, [buttonVisibility]);

  // Auto-clear screenshot status when node selection might change
  useEffect(() => {
    setScreenshotSaveStatus('idle');
  }, [props?.selectedHost, props?.selectedDeviceId]);

  return {
    // Core node operations
    getNodeFormWithVerifications,
    getParentNames,
    isProtectedNode,
    getButtonVisibility,

    // Screenshot operations
    takeAndSaveScreenshot,
    handleScreenshotConfirm,
    screenshotSaveStatus,

    // Model references
    modelReferences,
    referencesLoading,
    deviceModel,

    // NodeGotoPanel operations
    navigationSteps,
    isLoadingPreview,
    isExecuting,
    navigationError,
    executionMessage,
    loadNavigationPreview,
    executeNavigation,
    clearNavigationState,
    getFullPath,

    // Current position information
    currentNodeId,
    updateCurrentPosition,
    updateNodesWithMinimapIndicators,

    // Additional helper functions
    isEntryNode,

    // New functions
    clearNavigationMessages,
  };
};
