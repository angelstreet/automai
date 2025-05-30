import React, { useEffect, useCallback, useState, useRef } from 'react';
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
import { AndroidMobileRemotePanel } from '../components/remote/AndroidMobileRemotePanel';
import { AndroidTVRemotePanel } from '../components/remote/AndroidTVRemotePanel';
import { IRRemotePanel } from '../components/remote/IRRemotePanel';
import { BluetoothRemotePanel } from '../components/remote/BluetoothRemotePanel';

// Import remote connection hooks
import { useAndroidMobileConnection } from '../hooks/remote/useAndroidMobileConnection';
import { useAndroidTVConnection } from '../hooks/remote/useAndroidTVConnection';
import { useIRRemoteConnection } from '../hooks/remote/useIRRemoteConnection';
import { useBluetoothRemoteConnection } from '../hooks/remote/useBluetoothRemoteConnection';

// Import device utilities
import { getDeviceRemoteConfig, extractConnectionConfigForAndroid, extractConnectionConfigForIR, extractConnectionConfigForBluetooth } from '../utils/deviceRemoteMapping';
import { deviceApi, Device } from '../services/deviceService';

// Node types for React Flow
const nodeTypes = {
  uiScreen: UINavigationNode,
  uiMenu: UIMenuNode,
};

const edgeTypes = {
  uiNavigation: UINavigationEdge,
  smoothstep: UINavigationEdge,
};

const NavigationEditorContent: React.FC = () => {
  // Basic remote control state
  const [isRemotePanelOpen, setIsRemotePanelOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [isControlActive, setIsControlActive] = useState(false);
  
  // Device state
  const [devices, setDevices] = useState<Device[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(true);

  // Get the selected device data
  const selectedDeviceData = devices.find(d => d.name === selectedDevice);
  const remoteConfig = selectedDeviceData ? getDeviceRemoteConfig(selectedDeviceData) : null;

  // Connection hooks for different device types
  const androidMobileHook = useAndroidMobileConnection();
  const androidTVHook = useAndroidTVConnection();
  const irRemoteHook = useIRRemoteConnection();
  const bluetoothRemoteHook = useBluetoothRemoteConnection();

  // Get the appropriate hook based on remote type
  const getActiveHook = () => {
    if (!remoteConfig) return null;
    
    switch (remoteConfig.type) {
      case 'android_mobile':
        return androidMobileHook;
      case 'android_tv':
        return androidTVHook;
      case 'ir_remote':
        return irRemoteHook;
      case 'bluetooth_remote':
        return bluetoothRemoteHook;
      default:
        return null;
    }
  };

  const activeHook = getActiveHook();

  // Fetch devices
  const fetchDevices = async () => {
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
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  // Auto-populate connection form when device is selected
  useEffect(() => {
    if (selectedDeviceData?.controller_configs?.remote && activeHook) {
      const remoteConfig = selectedDeviceData.controller_configs.remote;
      
      console.log(`[@component:NavigationEditor] Auto-populating connection form for device: ${selectedDeviceData.name}`, remoteConfig);
      
      if (remoteConfig.type === 'android_mobile' || remoteConfig.type === 'android_tv') {
        const connectionConfig = extractConnectionConfigForAndroid(remoteConfig);
        console.log('[@component:NavigationEditor] Extracted Android connection config:', connectionConfig);
        if (connectionConfig && activeHook.setConnectionForm) {
          activeHook.setConnectionForm(connectionConfig);
        }
      } else if (remoteConfig.type === 'ir_remote') {
        const connectionConfig = extractConnectionConfigForIR(remoteConfig);
        console.log('[@component:NavigationEditor] Extracted IR connection config:', connectionConfig);
        if (connectionConfig && activeHook.setConnectionForm) {
          activeHook.setConnectionForm(connectionConfig);
        }
      } else if (remoteConfig.type === 'bluetooth_remote') {
        const connectionConfig = extractConnectionConfigForBluetooth(remoteConfig);
        console.log('[@component:NavigationEditor] Extracted Bluetooth connection config:', connectionConfig);
        if (connectionConfig && activeHook.setConnectionForm) {
          activeHook.setConnectionForm(connectionConfig);
        }
      }
    }
  }, [selectedDeviceData, activeHook]);

  // Handle disconnection when control is released
  useEffect(() => {
    if (!activeHook || !remoteConfig) return;

    // Only handle disconnection when control is released
    if (!isControlActive && activeHook.session.connected) {
      console.log(`[@component:NavigationEditor] Control released, disconnecting from ${remoteConfig.type} device`);
      if (remoteConfig.type === 'android_tv') {
        activeHook.handleReleaseControl?.();
      } else {
        activeHook.handleDisconnect?.();
      }
    }
  }, [isControlActive, activeHook, remoteConfig]);

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
    setReactFlowInstance,
    
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
  const handleToggleRemotePanel = () => {
    setIsRemotePanelOpen(!isRemotePanelOpen);
  };

  const handleDeviceSelect = (device: string | null) => {
    // If changing device while connected, disconnect first
    if (selectedDevice && selectedDevice !== device && isControlActive) {
      console.log('[@component:NavigationEditor] Switching devices, stopping current control');
      setIsControlActive(false);
    }
    setSelectedDevice(device);
  };

  const handleTakeControl = () => {
    setIsControlActive(!isControlActive);
  };

  // Filter devices based on user interface models
  const getFilteredDevices = () => {
    if (!userInterface || !userInterface.models || !Array.isArray(userInterface.models)) {
      console.log('[@component:NavigationEditor] No user interface models found, showing all devices');
      return devices;
    }

    const interfaceModels = userInterface.models;
    const filteredDevices = devices.filter(device => 
      interfaceModels.includes(device.model)
    );

    console.log(`[@component:NavigationEditor] Filtered devices: ${filteredDevices.length}/${devices.length} devices match models: ${interfaceModels.join(', ')}`);
    return filteredDevices;
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
        devices={getFilteredDevices()}
        devicesLoading={devicesLoading}
        selectedDevice={selectedDevice}
        isControlActive={isControlActive}
        isRemotePanelOpen={isRemotePanelOpen}
        remoteConfig={remoteConfig}
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
          marginRight: isRemotePanelOpen ? '350px' : '0px'
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
        {isRemotePanelOpen && remoteConfig && (() => {
          const isCompact = true; // NavigationEditor side panel is always compact
          
          return (
            <Box sx={{
              position: 'fixed',
              right: 0,
              top: '130px', // Adjust based on your header height
              width: '350px', // Slightly wider for remote controls
              height: 'calc(100vh - 130px)',
              bgcolor: 'background.paper',
              borderLeft: '1px solid',
              borderColor: 'divider',
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.1)'
            }}>
              {/* Remote Panel Header */}
              <Box sx={{ 
                p: isCompact ? 1 : 2, 
                borderBottom: '1px solid', 
                borderColor: 'divider',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center'
              }}>
                <Typography variant={isCompact ? "subtitle1" : "h6"} component="div">
                  {remoteConfig.type === 'android_mobile' ? 'Android Mobile Remote' :
                   remoteConfig.type === 'android_tv' ? 'Android TV Remote' :
                   remoteConfig.type === 'ir_remote' ? 'IR Remote' :
                   remoteConfig.type === 'bluetooth_remote' ? 'Bluetooth Remote' :
                   'Remote Control'}
                </Typography>
              </Box>
              
              {/* Connection Status - Hidden in compact mode */}
              {!isCompact && (
                <Box sx={{ p: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" color={activeHook?.session.connected ? "success.main" : "textSecondary"}>
                    {activeHook?.session.connected ? `Connected to ${selectedDevice}` : `Connecting to ${selectedDevice}...`}
                  </Typography>
                </Box>
              )}
              
              {/* Remote Panel Content - Dynamic based on device type */}
              {remoteConfig.type === 'android_mobile' ? (
                <AndroidMobileRemotePanel
                  connectionConfig={extractConnectionConfigForAndroid(selectedDeviceData?.controller_configs?.remote)}
                  autoConnect={isControlActive}
                  compact={true}
                  showScreenshot={false}
                  sx={{ 
                    flex: 1,
                    height: '100%',
                    '& .MuiTypography-h6': {
                      fontSize: '1rem'
                    }
                  }}
                />
              ) : remoteConfig.type === 'android_tv' ? (
                <AndroidTVRemotePanel
                  connectionConfig={extractConnectionConfigForAndroid(selectedDeviceData?.controller_configs?.remote)}
                  autoConnect={isControlActive}
                  compact={true}
                  showScreenshot={false}
                  onDisconnectComplete={() => {
                    // Trigger the same actions as the header "Release" button
                    handleTakeControl(); // This will set isControlActive to false
                    // Close the remote panel after releasing control
                    if (isRemotePanelOpen) {
                      handleToggleRemotePanel();
                    }
                  }}
                  sx={{ 
                    flex: 1,
                    height: '100%',
                    '& .MuiTypography-h6': {
                      fontSize: '1rem'
                    }
                  }}
                />
              ) : remoteConfig.type === 'ir_remote' ? (
                <IRRemotePanel
                  connectionConfig={extractConnectionConfigForIR(selectedDeviceData?.controller_configs?.remote)}
                  autoConnect={isControlActive}
                  compact={true}
                  sx={{ 
                    flex: 1,
                    height: '100%',
                    '& .MuiTypography-h6': {
                      fontSize: '1rem'
                    }
                  }}
                />
              ) : remoteConfig.type === 'bluetooth_remote' ? (
                <BluetoothRemotePanel
                  connectionConfig={extractConnectionConfigForBluetooth(selectedDeviceData?.controller_configs?.remote)}
                  autoConnect={isControlActive}
                  compact={true}
                  sx={{ 
                    flex: 1,
                    height: '100%',
                    '& .MuiTypography-h6': {
                      fontSize: '1rem'
                    }
                  }}
                />
              ) : (
                <Box sx={{ p: 2, textAlign: 'center' }}>
                  <Typography variant="body2" color="textSecondary">
                    Unsupported remote type: {remoteConfig.type}
                  </Typography>
                </Box>
              )}
            </Box>
          );
        })()}
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