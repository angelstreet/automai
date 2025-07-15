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
import { useValidationColors } from '../validation/useValidationColors';

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
  const {
    setNavigationEdgesSuccess,
    setNavigationEdgesFailure,
    resetNavigationEdgeColors,
    setNodeVerificationSuccess,
    setNodeVerificationFailure,
    resetNodeVerificationColors,
  } = useValidationColors();

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
  const [navigationTransitions, setNavigationTransitions] = useState<NavigationStep[]>([]);
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
   * Shows the actual navigation path from current position, not hierarchical structure
   */
  const getFullPath = useCallback(
    (selectedNode: UINavigationNode, nodes: UINavigationNode[]): string => {
      // If we have navigation transitions, use them to show the actual path
      if (navigationTransitions && navigationTransitions.length > 0) {
        const pathSegments: string[] = [];

        // Add the starting position from the first transition
        const firstTransition = navigationTransitions[0] as any;
        if (firstTransition?.from_node_label) {
          pathSegments.push(firstTransition.from_node_label);
        }

        // Add each transition target
        navigationTransitions.forEach((transition: any) => {
          if (transition?.to_node_label) {
            pathSegments.push(transition.to_node_label);
          }
        });

        return pathSegments.join(' → ');
      }

      // If we have a current position, show current → target
      if (currentNodeId) {
        const currentNode = nodes.find((node) => node.id === currentNodeId);
        const currentLabel = currentNode?.data.label || 'Current';

        // If already at target, just show the target
        if (currentNodeId === selectedNode.id) {
          return selectedNode.data.label;
        }

        return `${currentLabel} → ${selectedNode.data.label}`;
      }

      // Fallback to hierarchical structure if no current position
      const parentNames = getParentNames(selectedNode.data.parent || [], nodes);
      if (parentNames === 'None') {
        return selectedNode.data.label;
      }
      return `${parentNames} → ${selectedNode.data.label}`;
    },
    [getParentNames, navigationTransitions, currentNodeId],
  );

  /**
   * Load navigation preview for NodeGotoPanel
   */
  const loadNavigationPreview = useCallback(
    async (
      selectedNode: UINavigationNode,
      _allNodes?: UINavigationNode[],
      shouldUpdateMinimap: boolean = false,
    ): Promise<NavigationStep[]> => {
      if (!props?.treeId) return [];

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
          const transitions = result.transitions || [];
          setNavigationTransitions(transitions);

          // Only update minimap indicators if explicitly requested (during execution)
          if (shouldUpdateMinimap) {
            updateNodesWithMinimapIndicators(transitions);
          }

          return transitions;
        } else {
          setNavigationError(result.error || 'Failed to load navigation preview');
          return [];
        }
      } catch (err) {
        setNavigationError(
          `Failed to load navigation preview: ${err instanceof Error ? err.message : 'Unknown error'}`,
        );
        return [];
      } finally {
        setIsLoadingPreview(false);
      }
    },
    [props?.treeId, currentNodeId, updateNodesWithMinimapIndicators],
  );

  /**
   * Execute navigation using NavigationExecutor API
   */
  const executeNavigation = useCallback(
    async (selectedNode: UINavigationNode) => {
      if (!props?.treeId) return;

      setIsExecuting(true);
      setNavigationError(null);

      // Reset edge colors to grey before starting new navigation
      resetNavigationEdgeColors();

      // Reset node verification colors before starting new navigation
      resetNodeVerificationColors(currentNodeId);

      const startTime = Date.now();

      try {
        console.log(
          `[@hook:useNode:executeNavigation] Starting navigation to ${selectedNode.id} using NavigationExecutor`,
        );

        // Use NavigationExecutor API endpoint
        const response = await fetch(
          `/server/navigation/execute/${props.treeId}/${selectedNode.id}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              host: props.selectedHost,
              device_id: props.selectedDeviceId,
              current_node_id: currentNodeId,
            }),
          },
        );

        const result: NavigationExecuteResponse = await response.json();

        if (!result.success) {
          // Create an error object that includes the result data for position tracking
          const error = new Error(result.error || 'Navigation execution failed');
          (error as any).response = { data: result };
          throw error;
        }

        const duration = Date.now() - startTime;
        const durationSeconds = (duration / 1000).toFixed(1);

        console.log(`[@hook:useNode:executeNavigation] Navigation completed successfully`);
        console.log(
          `[@hook:useNode:executeNavigation] Executed ${result.transitions_executed}/${result.total_transitions} transitions, ${result.actions_executed}/${result.total_actions} actions`,
        );

        // Simple success message with duration
        const successMessage = `Navigation to ${selectedNode.data.label} completed successfully (${durationSeconds}s)`;
        setExecutionMessage(successMessage);
        setIsExecuting(false);

        // Update current position to where we actually ended up
        const finalPositionNodeId = result.final_position_node_id || selectedNode.id;
        updateCurrentPosition(finalPositionNodeId, selectedNode.data.label);

        // Handle node verification results if present
        if (result.verification_results && result.verification_results.length > 0) {
          const verificationSuccess = result.verification_results.every((vr: any) => vr.success);
          if (verificationSuccess) {
            setNodeVerificationSuccess(selectedNode.id);
          } else {
            setNodeVerificationFailure(selectedNode.id);
          }
        }

        // Set edges to green for successful navigation transitions using the current transitions
        // No need to reload preview since we just completed the navigation successfully
        if (navigationTransitions && navigationTransitions.length > 0) {
          setNavigationEdgesSuccess(navigationTransitions);
        }
      } catch (error: any) {
        console.error(`[@hook:useNode:executeNavigation] Navigation failed:`, error);
        const errorMessage = error.message || 'Navigation failed';
        setExecutionMessage(`Navigation failed: ${errorMessage}`);
        setNavigationError(errorMessage);
        setIsExecuting(false);

        // Try to get the response data to see where we actually ended up
        let finalPositionNodeId = currentNodeId; // Default to current position

        // Check if we have response data with final_position_node_id
        if (error.response?.data?.final_position_node_id) {
          finalPositionNodeId = error.response.data.final_position_node_id;
        }

        // Update current position to where we actually are after partial navigation
        if (finalPositionNodeId && finalPositionNodeId !== currentNodeId) {
          // We need to find the node label for the final position
          // For now, we'll update with the node ID and let the system resolve the label
          updateCurrentPosition(finalPositionNodeId, null);
        }

        // Set edges to red for failed navigation using the current transitions
        if (navigationTransitions && navigationTransitions.length > 0) {
          // Try to extract failed transition index from error message or response
          let failedTransitionIndex: number | undefined;

          // Check if the error contains transition failure information
          if (error.response?.data?.failed_transition) {
            failedTransitionIndex = error.response.data.failed_transition - 1; // Convert to 0-based index
          } else if (error.message?.includes('transition')) {
            // Try to parse transition number from error message
            const match = error.message.match(/transition (\d+)/i);
            if (match) {
              failedTransitionIndex = parseInt(match[1]) - 1; // Convert to 0-based index
            }
          }

          setNavigationEdgesFailure(navigationTransitions, failedTransitionIndex);
        }
      }
    },
    [
      props?.treeId,
      props?.selectedHost,
      props?.selectedDeviceId,
      currentNodeId,
      updateCurrentPosition,
      navigationTransitions,
      resetNavigationEdgeColors,
      setNavigationEdgesSuccess,
      setNavigationEdgesFailure,
      resetNodeVerificationColors,
      setNodeVerificationSuccess,
      setNodeVerificationFailure,
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
    navigationTransitions,
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
