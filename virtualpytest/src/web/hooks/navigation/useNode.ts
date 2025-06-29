import { useCallback, useState, useEffect, useMemo } from 'react';

import { useDeviceData } from '../../contexts/device/DeviceDataContext';
import { Host } from '../../types/common/Host_Types';
import {
  UINavigationNode,
  NodeForm,
  NavigationStep,
  NavigationPreviewResponse,
  NavigationExecuteResponse,
} from '../../types/pages/Navigation_Types';
import { Verification } from '../../types/verification/Verification_Types';
import { useVerification } from '../verification/useVerification';

export interface UseNodeProps {
  selectedHost?: Host;
  selectedDeviceId?: string;
  isControlActive?: boolean;
  treeId?: string;
  currentNodeId?: string;
}

export const useNode = (props?: UseNodeProps) => {
  const { getVerifications, getModelReferences, referencesLoading } = useDeviceData();

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
      return {}; // Return empty object without calling getModelReferences when deviceModel is undefined
    }
    const references = getModelReferences(deviceModel);

    return references;
  }, [getModelReferences, deviceModel]);

  // State for various node operations
  const [screenshotSaveStatus, setScreenshotSaveStatus] = useState<'idle' | 'success' | 'error'>(
    'idle',
  );
  const [gotoResult, setGotoResult] = useState<string>('');
  const [isRunningGoto, setIsRunningGoto] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Navigation state
  const [navigationSteps, setNavigationSteps] = useState<NavigationStep[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [navigationError, setNavigationError] = useState<string | null>(null);
  const [executionMessage, setExecutionMessage] = useState<string | null>(null);

  // Verification hook for NodeEditDialog
  const verification = useVerification({
    selectedHost: props?.selectedHost || null,
    captureSourcePath: undefined,
  });

  /**
   * Get node form data with properly formatted verifications
   */
  const getNodeFormWithVerifications = useCallback(
    (node: UINavigationNode): NodeForm => {
      const allVerifications = getVerifications();

      // Match verification_ids with actual verification objects
      const nodeVerifications: Verification[] = [];
      if (node.data.verification_ids && node.data.verification_ids.length > 0) {
        for (const verificationId of node.data.verification_ids) {
          const verification = allVerifications.find((v: any) => v.id === verificationId);
          if (verification) {
            nodeVerifications.push(verification);
          } else {
            console.warn(`[useNode] Could not find verification with ID: ${verificationId}`);
          }
        }
      }

      console.log(
        `[useNode] Found ${nodeVerifications.length} verifications for node ${node.data.label}`,
      );

      return {
        label: node.data.label,
        type: node.data.type,
        description: node.data.description || '',
        screenshot: node.data.screenshot,
        depth: node.data.depth || 0,
        parent: node.data.parent || [],
        menu_type: node.data.menu_type,
        verifications: nodeVerifications,
        verification_ids: node.data.verification_ids || [],
      };
    },
    [getVerifications],
  );

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
        console.error('[useNode] Cannot take screenshot - host or device not available');
        return { success: false, message: 'Host or device not available' };
      }

      try {
        console.log(`[useNode] Taking screenshot for node: ${nodeId} (${label})`);

        const response = await fetch('/server/navigation/takeNodeScreenshot', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host: props.selectedHost,
            device_id: props.selectedDeviceId,
            node_id: nodeId,
            label: label,
          }),
        });

        const result = await response.json();

        if (result.success) {
          console.log(`[useNode] Screenshot saved successfully: ${result.screenshot_url}`);

          if (onUpdateNode) {
            onUpdateNode(nodeId, { screenshot: result.screenshot_url });
          }

          return { success: true, screenshot_url: result.screenshot_url };
        } else {
          console.error(`[useNode] Screenshot failed: ${result.message}`);
          return { success: false, message: result.message };
        }
      } catch (error) {
        console.error('[useNode] Screenshot error:', error);
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
      if (!props?.isControlActive || !props?.selectedHost) {
        console.warn(
          '[useNode] Cannot take screenshot - device control not active or host not available',
        );
        return;
      }

      if (!props?.selectedDeviceId) {
        console.warn('[useNode] Cannot take screenshot - no device selected');
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
        console.error('[useNode] Screenshot failed:', result.message);
        setScreenshotSaveStatus('error');
        setTimeout(() => setScreenshotSaveStatus('idle'), 3000);
      }
    },
    [props?.isControlActive, props?.selectedHost, props?.selectedDeviceId, takeAndSaveScreenshot],
  );

  /**
   * Run goto operation for NodeEditDialog
   */
  const runGoto = useCallback(async () => {
    const canRunGoto = props?.isControlActive && props?.selectedHost;
    if (!canRunGoto) return;

    setIsRunningGoto(true);
    setGotoResult('Running goto operation...');

    try {
      // Mock implementation - replace with actual goto logic
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setGotoResult('✅ Goto operation completed successfully');
    } catch (error) {
      setGotoResult(`❌ Goto operation failed: ${error}`);
    } finally {
      setIsRunningGoto(false);
    }
  }, [props?.isControlActive, props?.selectedHost]);

  /**
   * Handle verification changes for NodeEditDialog
   */
  const handleVerificationsChange = useCallback(
    (
      newVerifications: Verification[],
      nodeForm: NodeForm,
      setNodeForm: (form: NodeForm) => void,
    ) => {
      console.log('[useNode] Updating nodeForm with new verifications:', newVerifications);

      verification.handleVerificationsChange(newVerifications);
      setNodeForm({
        ...nodeForm,
        verifications: newVerifications,
      });
    },
    [verification],
  );

  /**
   * Initialize verifications for NodeEditDialog
   */
  const initializeVerifications = useCallback(
    (nodeForm: NodeForm | null) => {
      if (!nodeForm) return;

      console.log('[useNode] Initializing verifications');
      const nodeVerifications = nodeForm.verifications || [];
      console.log('[useNode] Using verifications from nodeForm:', nodeVerifications);
      verification.handleVerificationsChange(nodeVerifications);
    },
    [verification],
  );

  /**
   * Handle save operation for NodeEditDialog
   */
  const handleSave = useCallback((onSubmit: () => void) => {
    onSubmit();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  }, []);

  /**
   * Validate form for NodeEditDialog
   */
  const isFormValid = useCallback(
    (nodeForm: NodeForm | null) => {
      const basicFormValid = nodeForm?.label?.trim();
      const verificationsValid =
        !verification.verifications ||
        verification.verifications.every((verificationItem) => {
          if (!verificationItem.command) return true;

          if (verificationItem.verification_type === 'image') {
            const hasImagePath = verificationItem.params?.image_path;
            return Boolean(hasImagePath);
          } else if (verificationItem.verification_type === 'text') {
            const hasText = verificationItem.params?.text;
            return Boolean(hasText);
          }

          return true;
        });
      return basicFormValid && verificationsValid;
    },
    [verification.verifications],
  );

  /**
   * Reset dialog state when closing
   */
  const resetDialogState = useCallback(() => {
    setSaveSuccess(false);
    verification.handleVerificationsChange([]);
  }, [verification]);

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
   * Load navigation preview for NodeGotoPanel
   */
  const loadNavigationPreview = useCallback(
    async (selectedNode: UINavigationNode) => {
      if (!props?.treeId) return;

      setIsLoadingPreview(true);
      setNavigationError(null);

      try {
        console.log(`[useNode] Loading navigation preview for node: ${selectedNode.id}`);

        const url = new URL(
          `/server/navigation/preview/${props.treeId}/${selectedNode.id}`,
          window.location.origin,
        );
        if (props.currentNodeId) {
          url.searchParams.append('current_node_id', props.currentNodeId);
        }

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const result: NavigationPreviewResponse = await response.json();

        if (result.success) {
          setNavigationSteps(result.steps);
          console.log(`[useNode] Loaded ${result.total_steps} navigation steps`);
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
    [props?.treeId, props?.currentNodeId],
  );

  /**
   * Execute navigation for NodeGotoPanel
   */
  const executeNavigation = useCallback(
    async (selectedNode: UINavigationNode) => {
      if (!props?.treeId) return;

      setIsExecuting(true);
      setNavigationError(null);

      try {
        console.log(`[useNode] Executing navigation to node: ${selectedNode.id}`);

        const response = await fetch(
          `/server/navigation/navigate/${props.treeId}/${selectedNode.id}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              current_node_id: props.currentNodeId,
              execute: true,
            }),
          },
        );

        const result: NavigationExecuteResponse = await response.json();

        if (result.success) {
          let successMessage = 'Navigation completed successfully!';

          if (result.steps_executed && result.total_steps) {
            successMessage = `Executed ${result.steps_executed}/${result.total_steps} steps in ${result.execution_time?.toFixed(2) || 0}s`;
          }

          setExecutionMessage(successMessage);
          setIsExecuting(false);

          // Refresh the step list to show any updates
          await loadNavigationPreview(selectedNode);
        } else {
          const errorMessage = result.error || 'Navigation failed';
          setExecutionMessage(`Navigation failed: ${errorMessage}`);
          setIsExecuting(false);
        }
      } catch (err) {
        let errorMessage = `Navigation execution failed: ${err instanceof Error ? err.message : 'Unknown error'}`;

        if (err instanceof Error) {
          if (err.message.includes('fetch')) {
            errorMessage =
              'Unable to connect to navigation service. Please check if the backend is running.';
          } else if (err.message.includes('timeout')) {
            errorMessage =
              'Navigation request timed out. The operation may take longer than expected.';
          }
        }

        setNavigationError(errorMessage);
        console.error('[useNode] Navigation execution error:', err);
      }
    },
    [props?.treeId, props?.currentNodeId, loadNavigationPreview],
  );

  /**
   * Clear navigation state when node changes
   */
  const clearNavigationState = useCallback(() => {
    setNavigationError(null);
    setExecutionMessage(null);
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
   * Check button visibility states - memoized to prevent unnecessary re-renders
   */
  const buttonVisibility = useMemo(() => {
    return {
      showSaveScreenshotButton: props?.isControlActive && props?.selectedHost,
      showGoToButton: props?.isControlActive && props?.selectedHost && props?.treeId,
      canRunGoto: props?.isControlActive && props?.selectedHost,
    };
  }, [props?.isControlActive, props?.selectedHost, props?.treeId]);

  /**
   * Memoized function to get button visibility
   */
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

    // Model references (for VerificationsList)
    modelReferences,
    referencesLoading,
    deviceModel,

    // NodeEditDialog operations
    verification,
    runGoto,
    handleVerificationsChange,
    initializeVerifications,
    handleSave,
    isFormValid,
    resetDialogState,
    gotoResult,
    isRunningGoto,
    saveSuccess,

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

    // Additional helper functions
    isEntryNode,
  };
};
