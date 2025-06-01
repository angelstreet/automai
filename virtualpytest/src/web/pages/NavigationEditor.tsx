import React, { useEffect, useCallback, useState, useRef, useMemo } from 'react';
import ReactFlow, {
  Background,
  Controls, 
  ReactFlowProvider,
  MiniMap,
  MarkerType,
  ConnectionLineType,
  BackgroundVariant,
  Handle,
  Position,
  getBezierPath,
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  useReactFlow,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Box,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Paper,
  Snackbar,
  Alert,
  Container,
  Typography,
  Button
} from '@mui/material';
import {
  Add as AddIcon,
  FitScreen as FitScreenIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
  Error as ErrorIcon,
  CloudUpload as CloudUploadIcon,
  CloudDownload as CloudDownloadIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';

// Import extracted components and hooks
import { useNavigationEditor } from '../hooks/useNavigationEditor';
import { UINavigationNode } from '../components/navigation/UINavigationNode';
import { UIMenuNode } from '../components/navigation/UIMenuNode';
import { UINavigationEdge } from '../components/navigation/UINavigationEdge';
import { NodeEditDialog } from '../components/navigation/NodeEditDialog';
import { EdgeEditDialog } from '../components/navigation/EdgeEditDialog';
import { EdgeSelectionPanel } from '../components/navigation/EdgeSelectionPanel';
import { NodeSelectionPanel } from '../components/navigation/NodeSelectionPanel';
import { NavigationEditorHeader } from '../components/navigation/NavigationEditorHeader';

// Import NEW generic remote components instead of device-specific ones
import { CompactRemote } from '../components/remote/CompactRemote';
import { CompactAndroidMobile } from '../components/remote/CompactAndroidMobile';
import { RemotePanel } from '../components/remote/RemotePanel';

// Import ScreenDefinitionEditor
import { ScreenDefinitionEditor } from '../components/user-interface/ScreenDefinitionEditor';

// Import device utilities
import { getDeviceRemoteConfig, extractConnectionConfigForAndroid, extractConnectionConfigForIR, extractConnectionConfigForBluetooth } from '../utils/deviceRemoteMapping';
import { deviceApi, Device } from '../services/deviceService';

// Import the hook to access SSH session state
import { useRemoteConnection } from '../hooks/remote/useRemoteConnection';

// Node types for React Flow
const nodeTypes = {
  uiScreen: UINavigationNode,
  uiMenu: UIMenuNode,
};

const edgeTypes = {
  uiNavigation: UINavigationEdge,
  smoothstep: UINavigationEdge,
};

// SSH Session State Tracker Component for Android Mobile
interface SSHSessionTrackerProps {
  connectionConfig?: any;
  autoConnect?: boolean;
  onDisconnectComplete?: () => void;
  onSessionStateChange?: (session: { connected: boolean; connectionLoading: boolean; connectionError: string | null }) => void;
  sx?: any;
}

function CompactAndroidMobileWithSessionTracking({
  connectionConfig,
  autoConnect,
  onDisconnectComplete,
  onSessionStateChange,
  sx
}: SSHSessionTrackerProps) {
  const { session, connectionLoading, connectionError } = useRemoteConnection('android-mobile');
  
  // Update parent component when SSH session state changes
  useEffect(() => {
    if (onSessionStateChange) {
      onSessionStateChange({
        connected: session.connected,
        connectionLoading: connectionLoading,
        connectionError: connectionError,
      });
    }
  }, [session.connected, connectionLoading, connectionError, onSessionStateChange]);
  
  return (
    <CompactAndroidMobile
      connectionConfig={connectionConfig}
      autoConnect={autoConnect}
      onDisconnectComplete={onDisconnectComplete}
      sx={sx}
    />
  );
}

// SSH Session State Tracker Component for Generic Remote
interface CompactRemoteWithSessionTrackingProps {
  remoteType: 'android-tv' | 'ir' | 'bluetooth';
  connectionConfig?: any;
  autoConnect?: boolean;
  showScreenshot?: boolean;
  onDisconnectComplete?: () => void;
  onSessionStateChange?: (session: { connected: boolean; connectionLoading: boolean; connectionError: string | null }) => void;
  sx?: any;
}

function CompactRemoteWithSessionTracking({
  remoteType,
  connectionConfig,
  autoConnect,
  showScreenshot = false,
  onDisconnectComplete,
  onSessionStateChange,
  sx
}: CompactRemoteWithSessionTrackingProps) {
  const { session, connectionLoading, connectionError } = useRemoteConnection(remoteType);
  
  // Update parent component when SSH session state changes
  useEffect(() => {
    if (onSessionStateChange) {
      onSessionStateChange({
        connected: session.connected,
        connectionLoading: connectionLoading,
        connectionError: connectionError,
      });
    }
  }, [session.connected, connectionLoading, connectionError, onSessionStateChange]);
  
  return (
    <CompactRemote
      remoteType={remoteType}
      connectionConfig={connectionConfig}
      autoConnect={autoConnect}
      showScreenshot={showScreenshot}
      onDisconnectComplete={onDisconnectComplete}
      sx={sx}
    />
  );
}

const NavigationEditorContent: React.FC = () => {
  // Basic remote control state
  const [isRemotePanelOpen, setIsRemotePanelOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [isControlActive, setIsControlActive] = useState(false);
  
  // SSH session state for coordination between remote panel and screen definition editor
  const [sshSession, setSSHSession] = useState<{
    connected: boolean;
    connectionLoading: boolean;
    connectionError: string | null;
  }>({
    connected: false,
    connectionLoading: false,
    connectionError: null,
  });
  
  // Device state
  const [devices, setDevices] = useState<Device[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);

  // Memoize computed values to prevent re-renders
  const selectedDeviceData = useMemo(() => {
    return devices.find(d => d.name === selectedDevice) || null;
  }, [devices, selectedDevice]);

  const remoteConfig = useMemo(() => {
    return selectedDeviceData ? getDeviceRemoteConfig(selectedDeviceData) : null;
  }, [selectedDeviceData]);
  
  const hasAVCapabilities = useMemo(() => {
    return selectedDeviceData?.controller_configs?.av?.parameters != null;
  }, [selectedDeviceData]);

  // Memoize connection configs to prevent object recreation
  const androidConnectionConfig = useMemo(() => {
    if (!selectedDeviceData?.controller_configs?.remote) return null;
    return extractConnectionConfigForAndroid(selectedDeviceData.controller_configs.remote);
  }, [selectedDeviceData?.controller_configs?.remote]);

  const irConnectionConfig = useMemo(() => {
    if (!selectedDeviceData?.controller_configs?.remote) return null;
    return extractConnectionConfigForIR(selectedDeviceData.controller_configs.remote);
  }, [selectedDeviceData?.controller_configs?.remote]);

  const bluetoothConnectionConfig = useMemo(() => {
    if (!selectedDeviceData?.controller_configs?.remote) return null;
    return extractConnectionConfigForBluetooth(selectedDeviceData.controller_configs.remote);
  }, [selectedDeviceData?.controller_configs?.remote]);

  // Fetch devices
  const fetchDevices = useCallback(async () => {
    console.log('[@component:NavigationEditor] Fetching devices');
    try {
      setDevicesLoading(true);
      const fetchedDevices = await deviceApi.getAllDevices();
      setDevices(fetchedDevices);
      console.log(`[@component:NavigationEditor] Successfully loaded ${fetchedDevices.length} devices`);
    } catch (error: any) {
      console.error('[@component:NavigationEditor] Error fetching devices:', error);
      setDevices([]);
    } finally {
      setDevicesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // Auto-populate connection form when device is selected - stabilized dependencies
  useEffect(() => {
    if (!selectedDeviceData?.controller_configs?.remote) return;

    const deviceRemoteConfig = selectedDeviceData.controller_configs.remote;
    
    console.log(`[@component:NavigationEditor] Auto-populating connection form for device: ${selectedDeviceData.name}`, deviceRemoteConfig);
    console.log(`[@component:NavigationEditor] Device ${selectedDeviceData.name} has remote type: ${deviceRemoteConfig.type}`);
    
    if (hasAVCapabilities) {
      console.log(`[@component:NavigationEditor] Device ${selectedDeviceData.name} has AV capabilities for screen definition`);
    }
  }, [selectedDeviceData?.name, selectedDeviceData?.controller_configs?.remote, hasAVCapabilities]);

  // Handle disconnection when control is released - stabilized dependencies
  useEffect(() => {
    if (!remoteConfig || isControlActive) return;

    console.log(`[@component:NavigationEditor] Control released, disconnecting from ${remoteConfig.type} device`);
    console.log(`[@component:NavigationEditor] Disconnection will be handled by the generic remote component`);
  }, [isControlActive, remoteConfig?.type]);

  const {
    // State
    nodes,
    edges,
    treeName,
    isLoadingInterface,
    selectedNode,
    selectedEdge,
    isNodeDialogOpen,
    isEdgeDialogOpen,
    nodeForm,
    edgeForm,
    isLoading,
    error,
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
    rootTree,
    
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
    loadFromDatabase,
    saveToDatabase,
    handleNodeFormSubmit,
    handleEdgeFormSubmit,
    handleDeleteNode,
    handleDeleteEdge,
    navigateToParent,
    addNewNode,
    cancelNodeChanges,
    discardChanges,
    performDiscardChanges,
    navigateToTreeLevel,
    goBackToParent,
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
    
    // Configuration
    defaultEdgeOptions,
    
    // Connection rules and debugging
    getConnectionRulesSummary,
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
    if (currentTreeId && !isLoadingInterface && currentTreeId !== lastLoadedTreeId.current) {
      console.log(`[@component:NavigationEditor] Loading tree data for: ${currentTreeId}`);
      lastLoadedTreeId.current = currentTreeId;
      loadFromDatabase();
    }
  }, [currentTreeId, isLoadingInterface]);

  // Handle remote control actions
  const handleToggleRemotePanel = useCallback(() => {
    setIsRemotePanelOpen(prev => !prev);
  }, []);

  const handleDeviceSelect = useCallback((device: string | null) => {
    // If changing device while connected, disconnect first
    if (selectedDevice && selectedDevice !== device && isControlActive) {
      console.log('[@component:NavigationEditor] Switching devices, stopping current control');
      setIsControlActive(false);
    }
    
    // Reset SSH session state when changing devices
    if (selectedDevice !== device) {
      setSSHSession({
        connected: false,
        connectionLoading: false,
        connectionError: null,
      });
    }
    
    setSelectedDevice(device);
  }, [selectedDevice, isControlActive]);

  const handleTakeControl = useCallback(async () => {
    const wasControlActive = isControlActive;
    
    // If we're releasing control, check if stream needs to be restarted BEFORE disconnecting
    if (wasControlActive && selectedDeviceData && hasAVCapabilities) {
      console.log('[@component:NavigationEditor] Releasing control, checking stream status before disconnect...');
      
      try {
        // Check current stream status while SSH connection is still active
        const response = await fetch('http://localhost:5009/api/virtualpytest/screen-definition/stream/status');
        if (response.ok) {
          const data = await response.json();
          if (data.success && !data.is_active) {
            console.log('[@component:NavigationEditor] Stream was stopped, will restart after disconnect...');
            
            // Restart the stream before disconnecting
            const restartResponse = await fetch('http://localhost:5009/api/virtualpytest/screen-definition/stream/restart', {
              method: 'POST'
            });
            
            if (restartResponse.ok) {
              const restartData = await restartResponse.json();
              if (restartData.success) {
                console.log('[@component:NavigationEditor] Stream restarted successfully before releasing control');
              }
            }
          } else if (data.success && data.is_active) {
            console.log('[@component:NavigationEditor] Stream is already running, no restart needed');
          }
        } else {
          console.log('[@component:NavigationEditor] Stream status check failed, SSH connection may not be available');
        }
      } catch (error) {
        console.log('[@component:NavigationEditor] Could not check/restart stream before disconnect:', error);
        // Don't throw error, just log it
      }
    }
    
    // Now set control to false, which will trigger disconnect
    setIsControlActive(!isControlActive);
  }, [isControlActive, selectedDeviceData, hasAVCapabilities]);

  // Memoize session state change handler to prevent recreating on every render
  const handleSessionStateChange = useCallback((session: {
    connected: boolean;
    connectionLoading: boolean;
    connectionError: string | null;
  }) => {
    setSSHSession(session);
  }, []);

  // Memoize disconnect complete handler
  const handleDisconnectComplete = useCallback(() => {
    handleTakeControl();
    if (isRemotePanelOpen) {
      handleToggleRemotePanel();
    }
  }, [handleTakeControl, isRemotePanelOpen, handleToggleRemotePanel]);

  // Handle taking screenshot
  const handleTakeScreenshot = async () => {
    if (!selectedDevice || !isControlActive || !selectedNode) {
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

      console.log(`[@component:NavigationEditor] Taking screenshot for device: ${selectedDevice}, parent: ${parentName}, node: ${nodeName}`);
      
      // Call screenshot API with parent and node name parameters
      const response = await fetch('http://localhost:5009/api/virtualpytest/screen-definition/screenshot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          device_model: selectedDeviceData?.model || 'android_mobile',
          video_device: selectedDeviceData?.controller_configs?.av?.parameters?.video_device || '/dev/video0',
          parent_name: parentName,
          node_name: nodeName,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[@component:NavigationEditor] Screenshot taken successfully:', data);
        
        if (data.success) {
          console.log(`[@component:NavigationEditor] Screenshot saved to: ${data.screenshot_path}`);
          
          // Use the additional_screenshot_path if available (parent/node structure), otherwise fall back to screenshot_path
          const screenshotPath = data.additional_screenshot_path || data.screenshot_path;
          const screenshotUrl = `http://localhost:5009/api/virtualpytest/screen-definition/images?path=${encodeURIComponent(screenshotPath)}`;
          
          // Create updated node with screenshot
          const updatedNode = {
            ...selectedNode,
            data: {
              ...selectedNode.data,
              screenshot: screenshotUrl
            }
          };
          
          // Create a function to update nodes consistently
          const updateNodeFunction = (nodes: any[]) => 
            nodes.map(node => 
              node.id === selectedNode.id ? updatedNode : node
            );
          
          // Update both filtered nodes and allNodes arrays
          setNodes(updateNodeFunction);
          setAllNodes(updateNodeFunction);
          
          // Update selected node so the panel reflects the change
          setSelectedNode(updatedNode);
          
          // Mark tree as having unsaved changes
          setHasUnsavedChanges(true);
          
          console.log(`[@component:NavigationEditor] Updated node ${selectedNode.id} with screenshot: ${screenshotUrl}`);
          console.log(`[@component:NavigationEditor] Marked tree as having unsaved changes`);
          
          // You can add additional logic here like:
          // - Show a success notification
          // - Save the tree to database to persist the screenshot
          // - Display the screenshot path to the user
        } else {
          console.error('[@component:NavigationEditor] Screenshot failed:', data.error);
        }
      } else {
        console.error('[@component:NavigationEditor] Screenshot failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('[@component:NavigationEditor] Error taking screenshot:', error);
    }
  };

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
        userInterface={userInterface}
        selectedDevice={selectedDevice}
        isControlActive={isControlActive}
        isRemotePanelOpen={isRemotePanelOpen}
        devices={devices}
        devicesLoading={devicesLoading}
        onNavigateToParent={navigateToParent}
        onNavigateToTreeLevel={navigateToTreeLevel}
        onNavigateToParentView={navigateToParentView}
        onAddNewNode={addNewNode}
        onFitView={fitView}
        onUndo={undo}
        onRedo={redo}
        onSaveToDatabase={saveToDatabase}
        onDiscardChanges={discardChanges}
        onFocusNodeChange={setFocusNode}
        onDepthChange={setDisplayDepth}
        onResetFocus={resetFocus}
        onToggleRemotePanel={handleToggleRemotePanel}
        onDeviceSelect={handleDeviceSelect}
        onTakeControl={handleTakeControl}
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
          {isLoading ? (
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100%' 
            }}>
              <CircularProgress />
              <Typography variant="h6" sx={{ ml: 2 }}>
                {isLoadingInterface ? 'Loading navigation tree...' : 'Saving navigation tree...'}
              </Typography>
            </Box>
          ) : error ? (
            <Container maxWidth="md" sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              justifyContent: 'center', 
              alignItems: 'center', 
              height: '100%',
              textAlign: 'center'
            }}>
              <ErrorIcon color="error" sx={{ fontSize: 64, mb: 2 }} />
              <Typography variant="h5" color="error" gutterBottom>
                Error Loading Navigation Tree
              </Typography>
              <Typography variant="body1" paragraph>
                {error}
              </Typography>
              <Button 
                variant="contained" 
                onClick={navigateToParent} 
                startIcon={<ArrowBackIcon />}
              >
                Return to Navigation Trees
              </Button>
            </Container>
          ) : (
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
                  attributionPosition="bottom-left"
                  connectionLineType={ConnectionLineType.SmoothStep}
                  snapToGrid={true}
                  snapGrid={[15, 15]}
                  deleteKeyCode="Delete"
                  multiSelectionKeyCode="Shift"
                  style={{ width: '100%', height: '100%' }}
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
              {selectedDeviceData && hasAVCapabilities && isControlActive && (
                <ScreenDefinitionEditor
                  deviceConfig={selectedDeviceData.controller_configs}
                  deviceModel={selectedDeviceData.model}
                  autoConnect={true}
                  onDisconnectComplete={() => {
                    // Called when screen definition editor disconnects
                    console.log('[@component:NavigationEditor] Screen definition editor disconnected');
                  }}
                />
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
                      selectedDevice={selectedDevice}
                      onTakeScreenshot={handleTakeScreenshot}
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
                    />
                  )}
                </>
              ) : null}
            </>
          )}
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
                
                <CompactAndroidMobileWithSessionTracking
                  connectionConfig={androidConnectionConfig}
                  autoConnect={isControlActive}
                  onDisconnectComplete={handleDisconnectComplete}
                  onSessionStateChange={handleSessionStateChange}
                  sx={{ flex: 1, height: '100%' }}
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
                  <CompactRemoteWithSessionTracking
                    remoteType="android-tv"
                    connectionConfig={androidConnectionConfig}
                    autoConnect={isControlActive}
                    showScreenshot={false}
                    onDisconnectComplete={handleDisconnectComplete}
                    onSessionStateChange={handleSessionStateChange}
                    sx={{ flex: 1, height: '100%' }}
                  />
                ) : remoteConfig.type === 'ir_remote' ? (
                  <CompactRemoteWithSessionTracking
                    remoteType="ir"
                    connectionConfig={irConnectionConfig}
                    autoConnect={isControlActive}
                    onDisconnectComplete={handleDisconnectComplete}
                    onSessionStateChange={handleSessionStateChange}
                    sx={{ flex: 1, height: '100%' }}
                  />
                ) : remoteConfig.type === 'bluetooth_remote' ? (
                  <CompactRemoteWithSessionTracking
                    remoteType="bluetooth"
                    connectionConfig={bluetoothConnectionConfig}
                    autoConnect={isControlActive}
                    onDisconnectComplete={handleDisconnectComplete}
                    onSessionStateChange={handleSessionStateChange}
                    sx={{ flex: 1, height: '100%' }}
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
      />

      {/* Edge Edit Dialog */}
      <EdgeEditDialog
        isOpen={isEdgeDialogOpen}
        edgeForm={edgeForm}
        setEdgeForm={setEdgeForm}
        onSubmit={handleEdgeFormSubmit}
        onClose={() => setIsEdgeDialogOpen(false)}
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