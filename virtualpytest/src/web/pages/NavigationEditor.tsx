import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls, 
  ReactFlowProvider,
  MiniMap,
  ConnectionLineType,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert,
  Typography,
  Button,
  IconButton
} from '@mui/material';
import {
  Close as CloseIcon,
} from '@mui/icons-material';

// Import extracted components and hooks
import { useNavigationEditor } from '../hooks';
import { UINavigationNode } from '../components/navigation/Navigation_NavigationNode';
import { UIMenuNode } from '../components/navigation/Navigation_MenuNode';
import { NodeEditDialog } from '../components/navigation/Navigation_NodeEditDialog';
import { EdgeEditDialog } from '../components/navigation/Navigation_EdgeEditDialog';
import { EdgeSelectionPanel } from '../components/navigation/Navigation_EdgeSelectionPanel';
import { NodeSelectionPanel } from '../components/navigation/Navigation_NodeSelectionPanel';
import { NavigationEditorHeader } from '../components/navigation/Navigation_EditorHeader';
import { VerificationResultsDisplay } from '../components/verification/VerificationResultsDisplay';

// Import NEW generic remote components instead of device-specific ones
import { CompactRemote } from '../components/remote/CompactRemote';
import { CompactAndroidMobile } from '../components/remote/CompactAndroidMobile';

// Import ScreenDefinitionEditor
import { ScreenDefinitionEditor } from '../components/userinterface/UserInterface_ScreenDefinitionEditor';

// Import device utilities
import { getDeviceRemoteConfig, extractConnectionConfigForAndroid, extractConnectionConfigForIR, extractConnectionConfigForBluetooth } from '../utils/device/deviceRemoteMappingUtils';

// Import registration context
import { useRegistration } from '../contexts/RegistrationContext';

// Import NavigationEdgeComponent
import { NavigationEdgeComponent } from '../components/navigation/Navigation_NavigationEdge';

// Node types for React Flow
const nodeTypes = {
  uiScreen: UINavigationNode,
  uiMenu: UIMenuNode,
};

const edgeTypes = {
  uiNavigation: NavigationEdgeComponent,
  smoothstep: NavigationEdgeComponent,
};

const NavigationEditorContent: React.FC = () => {
  // Use registration context only for host management, not URL building
  const { 
    availableHosts, 
    selectedHost, 
    selectHost,
    clearSelection,
    fetchHosts,
  } = useRegistration();
  
  // Create a wrapper for selectHost to match the expected interface
  const handleHostSelect = useCallback((hostNameOrNull: string | null) => {
    if (hostNameOrNull) {
      // Find the host by name and select it
      const host = availableHosts.find(h => h.name === hostNameOrNull);
      if (host) {
        selectHost(host.id);
      }
    } else {
      // Clear selection using the modern clearSelection function
      clearSelection();
    }
  }, [availableHosts, selectHost, clearSelection]);
  
  // Basic remote control state
  const [isRemotePanelOpen, setIsRemotePanelOpen] = useState(false);
  const [isControlActive, setIsControlActive] = useState(false);
  
  // Verification state
  const [isVerificationActive, setIsVerificationActive] = useState(false);
  const [verificationControllerStatus, setVerificationControllerStatus] = useState<{
    image_controller_available: boolean;
    text_controller_available: boolean;
  }>({
    image_controller_available: false,
    text_controller_available: false,
  });
  
  // Add verification results state 
  const [verificationResults, setVerificationResults] = useState<any[]>([]);
  const [verificationPassCondition, setVerificationPassCondition] = useState<'all' | 'any'>('all');
  const [lastVerifiedNodeId, setLastVerifiedNodeId] = useState<string | null>(null);

  // Simple loading states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize computed values based on selectedHost from registration context
  const remoteConfig = useMemo(() => {
    return selectedHost ? getDeviceRemoteConfig(selectedHost) : null;
  }, [selectedHost]);
  
  const hasAVCapabilities = useMemo(() => {
    return selectedHost?.controller_configs?.av?.parameters != null;
  }, [selectedHost]);

  // Memoize connection configs to prevent object recreation
  const androidConnectionConfig = useMemo(() => {
    if (!selectedHost?.controller_configs?.remote) return null;
    return extractConnectionConfigForAndroid(selectedHost.controller_configs.remote);
  }, [selectedHost?.controller_configs?.remote]);

  const irConnectionConfig = useMemo(() => {
    if (!selectedHost?.controller_configs?.remote) return null;
    return extractConnectionConfigForIR(selectedHost.controller_configs.remote);
  }, [selectedHost?.controller_configs?.remote]);

  const bluetoothConnectionConfig = useMemo(() => {
    if (!selectedHost?.controller_configs?.remote) return null;
    return extractConnectionConfigForBluetooth(selectedHost.controller_configs.remote);
  }, [selectedHost?.controller_configs?.remote]);

  // Use registration context's fetchHosts instead of separate device fetching
  useEffect(() => {
    fetchHosts();
  }, [fetchHosts]);

  // Auto-populate connection form when host is selected
  useEffect(() => {
    if (!selectedHost?.controller_configs?.remote) return;

    const deviceRemoteConfig = selectedHost.controller_configs.remote;
    
    console.log(`[@component:NavigationEditor] Auto-populating connection form for host: ${selectedHost.name}`, deviceRemoteConfig);
    console.log(`[@component:NavigationEditor] Host ${selectedHost.name} has remote type: ${deviceRemoteConfig.type}`);
    
    if (hasAVCapabilities) {
      console.log(`[@component:NavigationEditor] Host ${selectedHost.name} has AV capabilities for screen definition`);
    }
  }, [selectedHost?.name, selectedHost?.controller_configs?.remote, hasAVCapabilities]);

  // Handle disconnection when control is released
  useEffect(() => {
    if (!remoteConfig || isControlActive) return;

    console.log(`[@component:NavigationEditor] Control released, disconnecting from ${remoteConfig.type} device`);
    console.log(`[@component:NavigationEditor] Disconnection will be handled by the generic remote component`);
  }, [isControlActive, remoteConfig?.type]);

  // Auto-open/close remote panel when control state changes
  useEffect(() => {
    console.log(`[@component:NavigationEditor] Auto-open useEffect triggered: isControlActive=${isControlActive}, remoteConfig=${remoteConfig ? 'available' : 'null'}, isRemotePanelOpen=${isRemotePanelOpen}`);
    
    if (isControlActive && remoteConfig && !isRemotePanelOpen) {
      console.log('[@component:NavigationEditor] Control activated, automatically opening remote panel');
      setIsRemotePanelOpen(true);
    } else if (!isControlActive && isRemotePanelOpen) {
      console.log('[@component:NavigationEditor] Control released, automatically closing remote panel');
      setIsRemotePanelOpen(false);
    } else if (isControlActive && !remoteConfig) {
      console.log('[@component:NavigationEditor] Control is active but remoteConfig is null - device data may not be refreshed yet');
    }
  }, [isControlActive, remoteConfig, isRemotePanelOpen]);

  const {
    // State
    nodes,
    edges,
    isLoadingInterface,
    selectedNode,
    selectedEdge,
    isNodeDialogOpen,
    isEdgeDialogOpen,
    nodeForm,
    edgeForm,
    success,
    reactFlowWrapper,
    reactFlowInstance,
    treeId,
    interfaceId,
    
    // Navigation state
    currentTreeId,
    currentTreeName,
    navigationPath,
    navigationNamePath,
    hasUnsavedChanges,
    isDiscardDialogOpen,
    userInterface,
    
    // History state
    history,
    historyIndex,
    
    // View state for single-level navigation
    viewPath,
    navigateToParentView,
    
    // Tree filtering state
    focusNodeId,
    maxDisplayDepth,
    availableFocusNodes,
    allNodes,
    setFocusNode,
    setDisplayDepth,
    resetFocus,
    
    // Setters
    setIsNodeDialogOpen,
    setIsEdgeDialogOpen,
    setNodeForm,
    setEdgeForm,
    setIsDiscardDialogOpen,
    
    // Event handlers
    onNodesChange,
    onEdgesChange,
    onConnect,
    onNodeClick,
    onEdgeClick,
    onNodeDoubleClick,
    onPaneClick,
    
    // Actions
    saveToDatabase,
    loadFromConfig,
    saveToConfig,
    isLocked,
    lockInfo,
    sessionId,
    lockNavigationTree,
    unlockNavigationTree,
    setupAutoUnlock,
    handleNodeFormSubmit,
    handleEdgeFormSubmit,
    navigateToParent,
    addNewNode,
    cancelNodeChanges,
    discardChanges,
    performDiscardChanges,
    navigateToTreeLevel,
    closeSelectionPanel,
    undo,
    redo,
    fitView,
    deleteSelected,
    resetNode,
    
    // Additional setters we need
    setNodes,
    setSelectedNode,
    setReactFlowInstance,
    setAllNodes,
    setHasUnsavedChanges,
    setEdges,
    setSelectedEdge,
    
  } = useNavigationEditor();
  
  // Track the last loaded tree ID to prevent unnecessary reloads
  const lastLoadedTreeId = useRef<string | null>(null);
  
  // Show message if tree ID is missing
  useEffect(() => {
    if (!treeId && !interfaceId) {
      console.log('[@component:NavigationEditor] Missing tree ID in URL');
    }
  }, [treeId, interfaceId]);
  
  // Load tree data when component mounts or treeId changes
  useEffect(() => {
    if (currentTreeName && !isLoadingInterface && currentTreeName !== lastLoadedTreeId.current) {
      console.log(`[@component:NavigationEditor] Loading tree data from config: ${currentTreeName}`);
      lastLoadedTreeId.current = currentTreeName;
      
      // Load from config instead of database
      loadFromConfig(currentTreeName);
      
      // Setup auto-unlock for this tree
      const cleanup = setupAutoUnlock(currentTreeName);
      
      // Return cleanup function
      return cleanup;
    }
  }, [currentTreeName, isLoadingInterface, loadFromConfig, setupAutoUnlock]);

  // Simplified take control handler
  const handleTakeControl = useCallback(async () => {
    const device = selectedHost;
    const deviceId = device?.id; // Use 'id' instead of 'device_id' for RegisteredHost
    
    if (!deviceId) {
      console.error('[@component:NavigationEditor] No device selected or device ID missing');
      return;
    }

    console.log(`[@component:NavigationEditor] Taking control of device: ${deviceId}`);
    setIsLoading(true);
    setError(null);

    try {
      // Instead of HTTP call, just activate control and use controller proxies
      console.log('[@component:NavigationEditor] Activating control - using controller proxies approach');
      
      setIsControlActive(true);
      
      // Show remote UI if device has remote capabilities and controller proxy exists
      const remoteConfig = getDeviceRemoteConfig(device);
      if (remoteConfig && device?.controllerProxies?.remote) {
        console.log('[@component:NavigationEditor] Device has remote capabilities and controller proxy, showing remote UI');
        setIsRemotePanelOpen(true);
      }
      
      // Check for verification capabilities
      if (device?.controllerProxies?.verification) {
        console.log('[@component:NavigationEditor] Device has verification capabilities');
        setIsVerificationActive(true);
        setVerificationControllerStatus({
          image_controller_available: device.controllerProxies.verification.hasCapability('image') || device.controllerProxies.verification.hasCapability('verification'),
          text_controller_available: device.controllerProxies.verification.hasCapability('text') || device.controllerProxies.verification.hasCapability('ocr'),
        });
      }
      
      console.log('[@component:NavigationEditor] Control activated successfully using controller proxies');
    } catch (error) {
      console.error('[@component:NavigationEditor] Take control failed:', error);
      setError(error instanceof Error ? error.message : 'Failed to take control');
      setIsControlActive(false);
    } finally {
      setIsLoading(false);
    }
  }, [selectedHost, getDeviceRemoteConfig]);

  // Simplified release control handler
  const handleReleaseControl = useCallback(async () => {
    console.log('[@component:NavigationEditor] Releasing control');
    
    setIsRemotePanelOpen(false);
    setIsControlActive(false);
    setIsVerificationActive(false);
    setVerificationControllerStatus({
      image_controller_available: false,
      text_controller_available: false,
    });
    
    console.log('[@component:NavigationEditor] Control released');
  }, []);

  // Handle remote panel toggle
  const handleToggleRemotePanel = useCallback(() => {
    if (isRemotePanelOpen) {
      setIsRemotePanelOpen(false);
    } else if (isControlActive) {
      setIsRemotePanelOpen(true);
    }
  }, [isRemotePanelOpen, isControlActive]);

  // Handle taking screenshot using AV controller proxy
  const handleTakeScreenshot = useCallback(async () => {
    if (!selectedHost || !isControlActive || !selectedNode) {
      console.log('[@component:NavigationEditor] Cannot take screenshot: no device selected, not in control, or no node selected');
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
        const parentNode = nodes.find(node => node.id === parentId);
        if (parentNode) {
          parentName = parentNode.data.label || 'unknown';
        }
      }

      console.log(`[@component:NavigationEditor] Taking screenshot for device: ${selectedHost.name}, parent: ${parentName}, node: ${nodeName}`);
      
      // Use AV controller proxy instead of direct HTTP call
      const avControllerProxy = selectedHost?.controllerProxies?.av;
      if (!avControllerProxy) {
        throw new Error('AV controller proxy not available. Host may not have AV capabilities or proxy creation failed.');
      }
      
      console.log('[@component:NavigationEditor] AV controller proxy found, calling take_screenshot...');
      
      // Call take_screenshot on the AV controller proxy
      const screenshotUrl = await avControllerProxy.take_screenshot();
      
      if (screenshotUrl) {
        console.log('[@component:NavigationEditor] Screenshot taken successfully:', screenshotUrl);
        
        // Create updated node with screenshot
        const updatedNode = {
          ...selectedNode,
          data: {
            ...selectedNode.data,
            screenshot: `data:image/png;base64,${screenshotUrl}` // Assuming base64 format
          }
        };
        
        // Update nodes
        const updateNodeFunction = (nodes: any[]) => 
          nodes.map(node => 
            node.id === selectedNode.id ? updatedNode : node
          );
        
        setNodes(updateNodeFunction);
        setAllNodes(updateNodeFunction);
        setSelectedNode(updatedNode);
        setHasUnsavedChanges(true);
        
        console.log(`[@component:NavigationEditor] Screenshot captured and node updated`);
      } else {
        console.error('[@component:NavigationEditor] Screenshot failed - no URL returned');
      }
    } catch (error) {
      console.error('[@component:NavigationEditor] Error taking screenshot:', error);
    }
  }, [selectedHost, isControlActive, selectedNode, nodes, setNodes, setAllNodes, setSelectedNode, setHasUnsavedChanges]);

  // Handle verification execution using verification controller proxy
  const handleVerification = useCallback(async (nodeId: string, verifications: any[]) => {
    if (!isVerificationActive || !verifications || verifications.length === 0) {
      console.log('[@component:NavigationEditor] Cannot execute verifications: controllers not active or no verifications');
      return;
    }

    try {
      console.log(`[@component:NavigationEditor] Executing ${verifications.length} verifications for node: ${nodeId}`);
      
      // Clear previous results and set current node
      setVerificationResults([]);
      setLastVerifiedNodeId(nodeId);
      
      // Use verification controller proxy instead of server endpoint
      const verificationControllerProxy = selectedHost?.controllerProxies?.verification;
      if (!verificationControllerProxy) {
        throw new Error('Verification controller proxy not available. Host may not have verification capabilities or proxy creation failed.');
      }
      
      console.log('[@component:NavigationEditor] Verification controller proxy found, calling executeVerificationBatch...');
      
      // Call executeVerificationBatch on the verification controller proxy
      const response = await verificationControllerProxy.executeVerificationBatch({
        verifications: verifications,
        model: selectedHost?.model || 'android_mobile',
        node_id: nodeId,
        source_filename: 'current_screenshot.jpg' // Default source filename
      });
      
      if (response.success && response.data?.results) {
        console.log('[@component:NavigationEditor] Verification results:', response.data);
        
        // Process results to match VerificationTestResult interface
        const processedResults = response.data.results.map((result: any, index: number) => {
          const verification = verifications[index];
          
          console.log(`[@component:NavigationEditor] Processing result ${index}:`, result);
          console.log(`[@component:NavigationEditor] Verification ${index}:`, verification);
          
          // Determine result type
          let resultType: 'PASS' | 'FAIL' | 'ERROR' = 'FAIL';
          if (result.success) {
            resultType = 'PASS';
          } else if (result.error && !result.message) {
            resultType = 'ERROR';
          }
          
          const processedResult = {
            success: result.success,
            message: result.message,
            error: result.error,
            threshold: result.threshold,
            resultType: resultType,
            sourceImageUrl: result.source_image_url,
            referenceImageUrl: result.reference_image_url,
            extractedText: result.extracted_text,
            searchedText: result.searched_text,
            imageFilter: result.image_filter,
            detectedLanguage: result.detected_language,
            languageConfidence: result.language_confidence,
            ocrConfidence: result.ocr_confidence,
            // Add ADB-specific fields
            search_term: result.search_term,
            wait_time: result.wait_time,
            total_matches: result.total_matches,
            matches: result.matches,
          };
          
          console.log(`[@component:NavigationEditor] Processed result ${index}:`, processedResult);
          return processedResult;
        });
        
        console.log(`[@component:NavigationEditor] Setting verification results:`, processedResults);
        setVerificationResults(processedResults);
        
        // Show summary like in NodeVerificationsList
        if (response.data.results) {
          const passed = response.data.results.filter((r: any) => r.success).length;
          const total = response.data.results.length;
          console.log(`[@component:NavigationEditor] Verification completed: ${passed}/${total} passed`);
          
          // Log final result based on pass condition
          const finalPassed = verificationPassCondition === 'all'
            ? passed === total
            : passed > 0;
          console.log(`[@component:NavigationEditor] Final result (${verificationPassCondition}): ${finalPassed ? 'PASS' : 'FAIL'}`);
        }
      } else {
        console.error('[@component:NavigationEditor] Verification failed:', response.error);
        setVerificationResults([]);
      }
    } catch (error) {
      console.error('[@component:NavigationEditor] Error executing verifications:', error);
      setVerificationResults([]);
    }
  }, [isVerificationActive, selectedHost, verificationPassCondition, setVerificationResults, setLastVerifiedNodeId]);

  // Handle node updates - callback for NodeSelectionPanel
  const handleUpdateNode = useCallback((nodeId: string, updatedData: any) => {
    console.log(`[@component:NavigationEditor] Updating node ${nodeId} with data:`, updatedData);
    
    // Check if this is a validation update that needs special handling
    if (updatedData._validation_update && updatedData._validation_result) {
      const validationResult = updatedData._validation_result.success;
      
      // Create a function to update nodes with validation results
      const updateNodeFunction = (nodes: any[]) => 
        nodes.map(node => {
          if (node.id === nodeId) {
            const existingData = node.data || {};
            const existingVerifications = existingData.verifications || [];
            
            // Update verifications with validation result
            let updatedVerifications;
            if (existingVerifications.length > 0) {
              // Update the first verification's last_run_result
              updatedVerifications = existingVerifications.map((verification: any, index: number) => {
                if (index === 0) {
                  const existingResults = verification.last_run_result || [];
                  const updatedResults = [validationResult, ...existingResults].slice(0, 10); // Keep last 10
                  return {
                    ...verification,
                    last_run_result: updatedResults
                  };
                }
                return verification;
              });
            } else {
              // Create a default verification with the validation result
              updatedVerifications = [{
                type: 'validation',
                last_run_result: [validationResult]
              }];
            }
            
            return {
              ...node,
              data: {
                ...existingData,
                verifications: updatedVerifications,
                last_validation_timestamp: updatedData._validation_result.timestamp
              }
            };
          }
          return node;
        });
      
      // Update both filtered nodes and allNodes arrays
      setNodes(updateNodeFunction);
      setAllNodes(updateNodeFunction);
      
      // Update selected node if it's the one being updated
      if (selectedNode && selectedNode.id === nodeId) {
        const updatedNodeData = updateNodeFunction([selectedNode])[0];
        setSelectedNode(updatedNodeData);
      }
      
      console.log(`[@component:NavigationEditor] Updated node ${nodeId} with validation result: ${validationResult}`);
    } else {
      // Regular update - use simple object spread
      const updateNodeFunction = (nodes: any[]) => 
        nodes.map(node => 
          node.id === nodeId ? { ...node, data: { ...node.data, ...updatedData } } : node
        );
      
      // Update both filtered nodes and allNodes arrays
      setNodes(updateNodeFunction);
      setAllNodes(updateNodeFunction);
      
      // Update selected node if it's the one being updated
      if (selectedNode && selectedNode.id === nodeId) {
        const updatedNode = { ...selectedNode, data: { ...selectedNode.data, ...updatedData } };
        setSelectedNode(updatedNode);
      }
      
      console.log(`[@component:NavigationEditor] Updated node ${nodeId} with regular data`);
    }
    
    // Mark tree as having unsaved changes
    setHasUnsavedChanges(true);
    
    console.log(`[@component:NavigationEditor] Updated node ${nodeId} and marked tree as having unsaved changes`);
  }, [setNodes, setAllNodes, setSelectedNode, setHasUnsavedChanges, selectedNode]);

  // Handle edge updates - callback for EdgeSelectionPanel
  const handleUpdateEdge = useCallback((edgeId: string, updatedData: any) => {
    console.log(`[@component:NavigationEditor] Updating edge ${edgeId} with data:`, updatedData);
    
    // Check if this is a validation update that needs special handling
    if (updatedData._validation_update && updatedData._validation_result) {
      const validationResult = updatedData._validation_result.success;
      
      // Update edges array with validation results
      setEdges(prevEdges => 
        prevEdges.map(edge => {
          if (edge.id === edgeId) {
            const existingData = edge.data || {};
            const existingActions = existingData.actions || [];
            
            // Update actions with validation result
            let updatedActions;
            if (existingActions.length > 0) {
              // Update the first action's last_run_result
              updatedActions = existingActions.map((action: any, index: number) => {
                if (index === 0) {
                  const existingResults = action.last_run_result || [];
                  const updatedResults = [validationResult, ...existingResults].slice(0, 10); // Keep last 10
                  return {
                    ...action,
                    last_run_result: updatedResults
                  };
                }
                return action;
              });
            } else {
              // Create a default action with the validation result
              updatedActions = [{
                type: 'validation',
                last_run_result: [validationResult]
              }];
            }
            
            return {
              ...edge,
              data: {
                ...existingData,
                actions: updatedActions,
                last_validation_timestamp: updatedData._validation_result.timestamp
              }
            };
          }
          return edge;
        })
      );
      
      // Update selected edge if it's the one being updated
      if (selectedEdge && selectedEdge.id === edgeId) {
        setSelectedEdge(prevEdge => {
          if (!prevEdge || prevEdge.id !== edgeId) return prevEdge;
          
          const existingData = prevEdge.data || {};
          const existingActions = existingData.actions || [];
          
          let updatedActions;
          if (existingActions.length > 0) {
            updatedActions = existingActions.map((action: any, index: number) => {
              if (index === 0) {
                const existingResults = action.last_run_result || [];
                const updatedResults = [validationResult, ...existingResults].slice(0, 10);
                return {
                  ...action,
                  last_run_result: updatedResults
                };
              }
              return action;
            });
          } else {
            updatedActions = [{
              type: 'validation',
              last_run_result: [validationResult]
            }];
          }
          
          return {
            ...prevEdge,
            data: {
              ...existingData,
              actions: updatedActions,
              last_validation_timestamp: updatedData._validation_result.timestamp
            }
          };
        });
      }
      
      console.log(`[@component:NavigationEditor] Updated edge ${edgeId} with validation result: ${validationResult}`);
    } else {
      // Regular update - use simple object spread
      setEdges(prevEdges => 
        prevEdges.map(edge => 
          edge.id === edgeId ? { ...edge, data: { ...edge.data, ...updatedData } } : edge
        )
      );
      
      // Update selected edge if it's the one being updated
      if (selectedEdge && selectedEdge.id === edgeId) {
        const updatedEdge = { ...selectedEdge, data: { ...selectedEdge.data, ...updatedData } };
        setSelectedEdge(updatedEdge);
      }
      
      console.log(`[@component:NavigationEditor] Updated edge ${edgeId} with regular data`);
    }
    
    // Mark tree as having unsaved changes
    setHasUnsavedChanges(true);
    
    console.log(`[@component:NavigationEditor] Updated edge ${edgeId} and marked tree as having unsaved changes`);
  }, [setEdges, setSelectedEdge, setHasUnsavedChanges, selectedEdge]);

  // Show message if tree ID is missing
  useEffect(() => {
    if (!treeId && !interfaceId) {
      console.log('[@component:NavigationEditor] Missing tree ID in URL');
    }
  }, [treeId, interfaceId]);
  
  // Load tree data when component mounts or treeId changes
  useEffect(() => {
    if (currentTreeName && !isLoadingInterface && currentTreeName !== lastLoadedTreeId.current) {
      console.log(`[@component:NavigationEditor] Loading tree data from config: ${currentTreeName}`);
      lastLoadedTreeId.current = currentTreeName;
      
      // Load from config instead of database
      loadFromConfig(currentTreeName);
      
      // Setup auto-unlock for this tree
      const cleanup = setupAutoUnlock(currentTreeName);
      
      // Return cleanup function
      return cleanup;
    }
  }, [currentTreeName, isLoadingInterface, loadFromConfig, setupAutoUnlock]);

  // Clear verification results when a different node is selected
  useEffect(() => {
    if (selectedNode?.id && lastVerifiedNodeId && selectedNode.id !== lastVerifiedNodeId) {
      setVerificationResults([]);
      setLastVerifiedNodeId(null);
    }
  }, [selectedNode?.id, lastVerifiedNodeId]);

  // Validation colors are automatically loaded from localStorage by Zustand persistence
  // No manual initialization needed
  
  return (
    <Box sx={{ 
      width: '100%',
      height: 'calc(100vh - 100px)', 
      minHeight: '500px',
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header with NavigationEditorHeader component */}
      <NavigationEditorHeader
        navigationPath={navigationPath}
        navigationNamePath={navigationNamePath}
        viewPath={viewPath}
        hasUnsavedChanges={hasUnsavedChanges}
        focusNodeId={focusNodeId}
        availableFocusNodes={availableFocusNodes}
        maxDisplayDepth={maxDisplayDepth}
        totalNodes={allNodes.length}
        visibleNodes={nodes.length}
        isLoading={isLoading}
        error={error}
        historyIndex={historyIndex}
        historyLength={history.length}
        isLocked={isLocked}
        lockInfo={lockInfo}
        sessionId={sessionId}
        userInterface={userInterface}
        selectedDevice={selectedHost?.name || null}
        isControlActive={isControlActive}
        isRemotePanelOpen={isRemotePanelOpen}
        devicesLoading={false}
        treeId={currentTreeId}
        onNavigateToParent={navigateToParent}
        onNavigateToTreeLevel={navigateToTreeLevel}
        onNavigateToParentView={navigateToParentView}
        onAddNewNode={addNewNode}
        onFitView={fitView}
        onUndo={undo}
        onRedo={redo}
        onSaveToDatabase={saveToDatabase}
        onSaveToConfig={() => saveToConfig(currentTreeName)}
        onLockTree={() => lockNavigationTree(currentTreeName)}
        onUnlockTree={() => unlockNavigationTree(currentTreeName)}
        onDiscardChanges={discardChanges}
        onFocusNodeChange={setFocusNode}
        onDepthChange={setDisplayDepth}
        onResetFocus={resetFocus}
        onToggleRemotePanel={handleToggleRemotePanel}
        onDeviceSelect={handleHostSelect}
        onTakeControl={handleTakeControl}
        onUpdateNode={handleUpdateNode}
        onUpdateEdge={handleUpdateEdge}
      />

      {/* Main Container with side-by-side layout */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex',
        minHeight: '500px',
        overflow: 'hidden'
      }}>
        {/* Main Editor Area */}
        <Box sx={{ 
          flex: 1, 
          position: 'relative', 
          minHeight: '500px',
          overflow: 'hidden',
          transition: 'margin-right',
          marginRight: isRemotePanelOpen ? '180px' : '0px'
        }}>
          <>
            <div 
              ref={reactFlowWrapper} 
              style={{ 
                width: '100%',
                height: '100%',
                minHeight: '500px'
              }}
            >
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onEdgeClick={onEdgeClick}
                onNodeDoubleClick={onNodeDoubleClick}
                onPaneClick={onPaneClick}
                onInit={(instance) => {
                  if (instance && !reactFlowInstance) {
                    console.log('[@component:NavigationEditor] ReactFlow instance initialized');
                    setReactFlowInstance(instance);
                  }
                }}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                defaultEdgeOptions={{
                  type: 'uiNavigation',
                  animated: false,
                  style: { strokeWidth: 2, stroke: '#b1b1b7' },
                }}
                defaultViewport={{ x: 0, y: 0, zoom: 1 }}
                // Ensure consistent viewport and prevent auto-fitting
                translateExtent={[[-5000, -5000], [10000, 10000]]}
                nodeExtent={[[-5000, -5000], [10000, 10000]]}
                attributionPosition="bottom-left"
                connectionLineType={ConnectionLineType.SmoothStep}
                snapToGrid={true}
                snapGrid={[15, 15]}
                deleteKeyCode="Delete"
                multiSelectionKeyCode="Shift"
                style={{ width: '100%', height: '100%' }}
                fitView={false}
                nodesDraggable={true}
                nodesConnectable={true}
                elementsSelectable={true}
                preventScrolling={false}
                panOnDrag={true}
                panOnScroll={false}
                zoomOnScroll={true}
                zoomOnPinch={true}
                zoomOnDoubleClick={false}
                minZoom={0.1}
                maxZoom={4}
                // Disable React Flow's auto-positioning features
                proOptions={{ hideAttribution: true }}
                // Prevent automatic layout algorithms
                nodeOrigin={[0, 0]}
                // Additional props to prevent automatic positioning
                autoPanOnConnect={false}
                autoPanOnNodeDrag={false}
                connectOnClick={false}
                // Prevent automatic centering or repositioning
                onlyRenderVisibleElements={false}
              >
                <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
                <Controls position="top-left" showZoom={true} showFitView={true} showInteractive={false} />
                <MiniMap 
                  position="bottom-right"
                  style={{
                    backgroundColor: 'var(--card, #ffffff)',
                    border: '1px solid var(--border, #e5e7eb)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                  }}
                  nodeColor={(node) => {
                    switch (node.data?.type) {
                      case 'screen': return '#3b82f6';
                      case 'dialog': return '#8b5cf6';
                      case 'popup': return '#f59e0b';
                      case 'overlay': return '#10b981';
                      case 'menu': return '#ffc107';
                      default: return '#6b7280';
                    }
                  }}
                  maskColor="rgba(0, 0, 0, 0.1)"
                />
              </ReactFlow>
            </div>

            {/* Screen Definition Editor - Show when device has AV capabilities and control is active */}
            {selectedHost && hasAVCapabilities && isControlActive && (
              <ScreenDefinitionEditor
                selectedHostDevice={selectedHost}
                autoConnect={true}
                onDisconnectComplete={handleReleaseControl}
              />
            )}

            {/* Verification Results Display - Show when there are verification results */}
            {(() => {
              const shouldShow = verificationResults.length > 0 && lastVerifiedNodeId;
              console.log(`[@component:NavigationEditor] Verification display check: results.length=${verificationResults.length}, lastVerifiedNodeId=${lastVerifiedNodeId}, shouldShow=${shouldShow}`);
              if (shouldShow) {
                console.log(`[@component:NavigationEditor] Rendering verification results for node:`, nodes.find(n => n.id === lastVerifiedNodeId)?.data.label);
              }
              return shouldShow;
            })() && (
              <Box sx={{
                position: 'absolute',
                bottom: 16,
                left: 16,
                right: selectedNode || selectedEdge ? '220px' : '16px', // Account for selection panel
                maxWidth: '800px',
                bgcolor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                p: 2,
                zIndex: 900,
                maxHeight: '300px',
                overflow: 'auto',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6" sx={{ fontSize: '1rem', mb: 1 }}>
                    Verification Results - Node: {nodes.find(n => n.id === lastVerifiedNodeId)?.data.label || lastVerifiedNodeId}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => {
                      setVerificationResults([]);
                      setLastVerifiedNodeId(null);
                    }}
                    sx={{ p: 0.25 }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
                
                <VerificationResultsDisplay
                  testResults={verificationResults}
                  verifications={nodes.find(n => n.id === lastVerifiedNodeId)?.data.verifications || []}
                  passCondition={verificationPassCondition}
                  onPassConditionChange={setVerificationPassCondition}
                  showPassConditionSelector={true}
                  compact={false}
                />
              </Box>
            )}

            {/* Selection Info Panel */}
            {(selectedNode || selectedEdge) ? (
              <>
                {selectedNode && (
                  <NodeSelectionPanel
                    selectedNode={selectedNode}
                    nodes={nodes}
                    onClose={closeSelectionPanel}
                    onEdit={() => {}}
                    onDelete={deleteSelected}
                    onAddChildren={() => {}}
                    setNodeForm={setNodeForm}
                    setIsNodeDialogOpen={setIsNodeDialogOpen}
                    onReset={resetNode}
                    isControlActive={isControlActive}
                    selectedDevice={selectedHost?.name || null}
                    onTakeScreenshot={handleTakeScreenshot}
                    treeId={currentTreeId || ''}
                    currentNodeId={focusNodeId || undefined}
                    onVerification={handleVerification}
                    isVerificationActive={isVerificationActive}
                    verificationControllerStatus={verificationControllerStatus}
                    onUpdateNode={handleUpdateNode}
                  />
                )}
                
                {selectedEdge && (
                  <EdgeSelectionPanel
                    selectedEdge={selectedEdge}
                    onClose={closeSelectionPanel}
                    onEdit={() => {}}
                    onDelete={deleteSelected}
                    setEdgeForm={setEdgeForm}
                    setIsEdgeDialogOpen={setIsEdgeDialogOpen}
                    isControlActive={isControlActive}
                    selectedDevice={selectedHost?.name || null}
                    controllerTypes={userInterface?.models || []}
                    onUpdateEdge={handleUpdateEdge}
                  />
                )}
              </>
            ) : null}
          </>
        </Box>

        {/* Remote Control Panel - Only show if device has remote capabilities */}
        {isRemotePanelOpen && remoteConfig && (
          <>
            {/* Android Mobile uses compact component instead of modal */}
            {remoteConfig.type === 'android_mobile' ? (
              <Box sx={{
                position: 'fixed',
                right: 0,
                top: '130px',
                width: '320px',
                height: 'calc(100vh - 130px)',
                bgcolor: 'background.paper',
                borderLeft: '1px solid',
                borderColor: 'divider',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.1)'
              }}>
                <Box sx={{ 
                  p: 1, 
                  borderBottom: '1px solid', 
                  borderColor: 'divider',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <Typography variant="h6" component="div">
                    Android Mobile Remote
                  </Typography>
                </Box>
                
                <CompactAndroidMobile
                  onDisconnectComplete={handleReleaseControl}
                />
              </Box>
            ) : (
              <Box sx={{
                position: 'fixed',
                right: 0,
                top: '130px',
                width: '320px',
                height: 'calc(100vh - 130px)',
                bgcolor: 'background.paper',
                borderLeft: '1px solid',
                borderColor: 'divider',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.1)'
              }}>
                <Box sx={{ 
                  p: 0, 
                  borderBottom: '1px solid', 
                  borderColor: 'divider',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}>
                  <Typography variant="h6" component="div">
                    {remoteConfig.type === 'android_tv' ? 'Android TV Remote' :
                     remoteConfig.type === 'ir_remote' ? 'IR Remote' :
                     remoteConfig.type === 'bluetooth_remote' ? 'Bluetooth Remote' :
                     'Remote Control'}
                  </Typography>
                </Box>
                
                {/* Remote Panel Content - Dynamic based on device type */}
                {remoteConfig.type === 'android_tv' ? (
                  <CompactRemote
                    remoteType="android-tv"
                    connectionConfig={androidConnectionConfig || undefined}
                    autoConnect={isControlActive}
                    showScreenshot={false}
                    onDisconnectComplete={handleReleaseControl}
                  />
                ) : remoteConfig.type === 'ir_remote' ? (
                  <CompactRemote
                    remoteType="ir"
                    connectionConfig={(irConnectionConfig || undefined) as any}
                    autoConnect={isControlActive}
                    onDisconnectComplete={handleReleaseControl}
                  />
                ) : remoteConfig.type === 'bluetooth_remote' ? (
                  <CompactRemote
                    remoteType="bluetooth"
                    connectionConfig={(bluetoothConnectionConfig || undefined) as any}
                    autoConnect={isControlActive}
                    onDisconnectComplete={handleReleaseControl}
                  />
                ) : (
                  <Box sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="textSecondary">
                      Unsupported remote type: {remoteConfig.type}
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </>
        )}
      </Box>

      {/* Node Edit Dialog */}
      <NodeEditDialog
        isOpen={isNodeDialogOpen}
        nodeForm={nodeForm}
        nodes={nodes}
        setNodeForm={setNodeForm}
        onSubmit={handleNodeFormSubmit}
        onClose={cancelNodeChanges}
        onResetNode={resetNode}
        verificationControllerTypes={['text', 'image']}
        isVerificationActive={isVerificationActive}
        selectedDevice={selectedHost?.name || null}
        selectedHostDevice={selectedHost}
        isControlActive={isControlActive}
        model={userInterface?.models?.[0] || 'android_mobile'}
      />

      {/* Edge Edit Dialog */}
      <EdgeEditDialog
        isOpen={isEdgeDialogOpen}
        edgeForm={edgeForm}
        setEdgeForm={setEdgeForm}
        onSubmit={handleEdgeFormSubmit}
        onClose={() => setIsEdgeDialogOpen(false)}
        controllerTypes={userInterface?.models || []}
        selectedEdge={selectedEdge}
        isControlActive={isControlActive}
        selectedDevice={selectedHost?.name || null}
        selectedHostDevice={selectedHost}
      />

      {/* Discard Changes Confirmation Dialog */}
      <Dialog open={isDiscardDialogOpen} onClose={() => setIsDiscardDialogOpen(false)}>
        <DialogTitle>Discard Changes?</DialogTitle>
        <DialogContent>
          <Typography>
            You have unsaved changes. Are you sure you want to discard them and revert to the last saved state?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDiscardDialogOpen(false)}>Cancel</Button>
          <Button onClick={performDiscardChanges} color="warning" variant="contained">
            Discard Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Messages */}
      {success && (
      <Snackbar
          open={!!success}
        autoHideDuration={3000}
          onClose={() => {}}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
          <Alert severity="success" sx={{ width: '100%' }}>
            {success}
        </Alert>
      </Snackbar>
      )}
    </Box>
  );
};

const NavigationEditor: React.FC = () => {
  return (
    <ReactFlowProvider>
      <NavigationEditorContent />
    </ReactFlowProvider>
  );
};

export default NavigationEditor; 