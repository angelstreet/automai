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
} from '@mui/material';
import { useLocation } from 'react-router-dom';

// Import extracted components and hooks
import { useNavigationEditor } from '../hooks';
import { UINavigationNode } from '../components/navigation/Navigation_NavigationNode';
import { UIMenuNode } from '../components/navigation/Navigation_MenuNode';
import { NodeEditDialog } from '../components/navigation/Navigation_NodeEditDialog';
import { EdgeEditDialog } from '../components/navigation/Navigation_EdgeEditDialog';
import { EdgeSelectionPanel } from '../components/navigation/Navigation_EdgeSelectionPanel';
import { NodeSelectionPanel } from '../components/navigation/Navigation_NodeSelectionPanel';
import { NavigationEditorHeader } from '../components/navigation/Navigation_EditorHeader';

// Import device control component
import { NavigationEditorDeviceControl } from './NavigationEditorDeviceControl';

// Import device utilities
import { getDeviceRemoteConfig } from '../utils/device/deviceRemoteMappingUtils';

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
  // ========================================
  // 1. INITIALIZATION & SETUP
  // ========================================
  
  // Get user interface data from navigation state (passed from UserInterface.tsx)
  const location = useLocation();
  const userInterfaceFromState = location.state?.userInterface;
  
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
    loadFromConfig,
    saveToConfig,
    isLocked,
    lockInfo,
    isCheckingLock,
    showReadOnlyOverlay,
    setCheckingLockState,
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
    fitView,
    deleteSelected,
    resetNode,
    setUserInterfaceFromProps,
    
    // Additional setters we need
    setNodes,
    setSelectedNode,
    setReactFlowInstance,
    setHasUnsavedChanges,
    setEdges,
    setSelectedEdge,
    
  } = useNavigationEditor();

  // Track the last loaded tree ID to prevent unnecessary reloads
  const lastLoadedTreeId = useRef<string | null>(null);

  // ========================================
  // 2. TREE LOADING & LOCK MANAGEMENT
  // ========================================
  
  // Set user interface from navigation state (passed from UserInterface.tsx)
  useEffect(() => {
    if (userInterfaceFromState) {
      console.log('[@component:NavigationEditor] Setting user interface from navigation state:', userInterfaceFromState.name);
      setUserInterfaceFromProps(userInterfaceFromState);
    }
  }, [userInterfaceFromState, setUserInterfaceFromProps]);
  
  // Show message if tree ID is missing
  useEffect(() => {
    if (!treeId && !interfaceId) {
      console.log('[@component:NavigationEditor] Missing tree ID in URL');
    }
  }, [treeId, interfaceId]);
  
  // Load tree data when component mounts or treeId changes - LOCK FIRST APPROACH
  useEffect(() => {
    if (currentTreeName && !isLoadingInterface && currentTreeName !== lastLoadedTreeId.current) {
      console.log(`[@component:NavigationEditor] Starting lock-first workflow for tree: ${currentTreeName}`);
      lastLoadedTreeId.current = currentTreeName;
      
      // Fix race condition: Set checking state immediately
      setCheckingLockState(true);
      
      // STEP 1: First acquire lock (this is the critical requirement)
      lockNavigationTree(currentTreeName).then(lockSuccess => {
        if (lockSuccess) {
          console.log(`[@component:NavigationEditor] Lock acquired successfully for tree: ${currentTreeName}`);
          // STEP 2: If lock acquired, load the tree data
          loadFromConfig(currentTreeName);
        } else {
          console.warn(`[@component:NavigationEditor] Failed to acquire lock for tree: ${currentTreeName} - entering read-only mode`);
          // STEP 3: If lock failed, still load tree but in read-only mode
          loadFromConfig(currentTreeName);
          // Note: isLocked state will be false, which will trigger read-only UI
        }
      }).catch(error => {
        console.error(`[@component:NavigationEditor] Error during lock acquisition for tree: ${currentTreeName}`, error);
        // Still try to load in read-only mode
        loadFromConfig(currentTreeName);
      });
      
      // Setup auto-unlock for this tree (cleanup function)
      const cleanup = setupAutoUnlock(currentTreeName);
      
      // Return cleanup function
      return cleanup;
    }
  }, [currentTreeName, isLoadingInterface, loadFromConfig, lockNavigationTree, setupAutoUnlock, setCheckingLockState]);

  // ========================================
  // 3. DEVICE & HOST MANAGEMENT
  // ========================================
  
  // Device control state is now managed by NavigationEditorDeviceControl component
  const [isRemotePanelOpen, setIsRemotePanelOpen] = useState(false);
  const [isControlActive, setIsControlActive] = useState(false);
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

  // Memoize computed values based on selectedHost from registration context
  const remoteConfig = useMemo(() => {
    return selectedHost ? getDeviceRemoteConfig(selectedHost) : null;
  }, [selectedHost]);
  
  const hasAVCapabilities = useMemo(() => {
    return selectedHost?.controller_configs?.av?.parameters != null;
  }, [selectedHost]);

  // Use registration context's fetchHosts instead of separate device fetching
  useEffect(() => {
    fetchHosts();
  }, [fetchHosts]);

  // ========================================
  // 4. EVENT HANDLERS SETUP
  // ========================================

  // Simple update handlers - complex validation logic moved to device control component
  const handleUpdateNode = useCallback((nodeId: string, updatedData: any) => {
    setNodes(nodes => nodes.map(node => 
      node.id === nodeId ? { ...node, data: { ...node.data, ...updatedData } } : node
    ));
    if (selectedNode?.id === nodeId) {
      setSelectedNode(node => node ? { ...node, data: { ...node.data, ...updatedData } } : node);
    }
    setHasUnsavedChanges(true);
  }, [setNodes, setSelectedNode, setHasUnsavedChanges, selectedNode]);

  const handleUpdateEdge = useCallback((edgeId: string, updatedData: any) => {
    setEdges(edges => edges.map(edge => 
      edge.id === edgeId ? { ...edge, data: { ...edge.data, ...updatedData } } : edge
    ));
    if (selectedEdge?.id === edgeId) {
      setSelectedEdge(edge => edge ? { ...edge, data: { ...edge.data, ...updatedData } } : edge);
    }
    setHasUnsavedChanges(true);
  }, [setEdges, setSelectedEdge, setHasUnsavedChanges, selectedEdge]);

  // ========================================
  // 5. RENDER
  // ========================================

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
        isLoading={false} // Loading handled by device control component
        error={null} // Error handling moved to device control component
        // History props removed - using page reload for cancel changes
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
        // onUndo/onRedo removed - using page reload for cancel changes

        onSaveToConfig={() => saveToConfig(currentTreeName)}
        onLockTree={() => lockNavigationTree(currentTreeName)}
        onUnlockTree={() => unlockNavigationTree(currentTreeName)}
        onDiscardChanges={discardChanges}
        onFocusNodeChange={setFocusNode}
        onDepthChange={setDisplayDepth}
        onResetFocus={resetFocus}
        onToggleRemotePanel={() => {}} // Handled by device control component
        onDeviceSelect={handleHostSelect}
        onTakeControl={() => {}} // Handled by device control component
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
                minHeight: '500px',
                position: 'relative'
              }}
            >
              {/* Read-Only Overlay - only when definitively locked by someone else */}
              {showReadOnlyOverlay && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    zIndex: 1000,
                    backgroundColor: 'warning.light',
                    color: 'warning.contrastText',
                    px: 1,
                    py: 0.5 ,
                    borderRadius: 1,
                    boxShadow: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    fontSize: '0.675rem',
                    fontWeight: 'medium'
                  }}
                >
                  🔒 READ-ONLY MODE
                  <Typography variant="caption" sx={{opacity: 0.8 }}>
                    Tree is locked
                  </Typography>
                </Box>
              )}
              
              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={isLocked ? onNodesChange : undefined}
                onEdgesChange={isLocked ? onEdgesChange : undefined}
                onConnect={isLocked ? onConnect : undefined}
                onNodeClick={onNodeClick}
                onEdgeClick={onEdgeClick}
                onNodeDoubleClick={onNodeDoubleClick}
                onPaneClick={onPaneClick}
                onInit={(instance) => {
                  if (instance && !reactFlowInstance) {
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
                deleteKeyCode={isLocked ? "Delete" : null}
                multiSelectionKeyCode="Shift"
                style={{ width: '100%', height: '100%' }}
                fitView={false}
                nodesDraggable={isLocked}
                nodesConnectable={isLocked}
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

            {/* Device Control Component - Handles all device/remote/verification logic */}
            <NavigationEditorDeviceControl
              selectedHost={selectedHost}
              isControlActive={isControlActive}
              isRemotePanelOpen={isRemotePanelOpen}
              isVerificationActive={isVerificationActive}
              verificationControllerStatus={verificationControllerStatus}
              verificationResults={verificationResults}
              verificationPassCondition={verificationPassCondition}
              lastVerifiedNodeId={lastVerifiedNodeId}
              nodes={nodes}
              selectedNode={selectedNode}
              selectedEdge={selectedEdge}
              userInterface={userInterface}
              onReleaseControl={() => {}} // Handled by device control component
              onUpdateNode={handleUpdateNode}
              onSetVerificationResults={setVerificationResults}
              onSetLastVerifiedNodeId={setLastVerifiedNodeId}
              onSetVerificationPassCondition={setVerificationPassCondition}
              onSetNodes={setNodes}
              onSetSelectedNode={setSelectedNode}
              onSetHasUnsavedChanges={setHasUnsavedChanges}
            />

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
                    onTakeScreenshot={() => {}} // Handled by device control component
                    treeId={currentTreeId || ''}
                    currentNodeId={focusNodeId || undefined}
                    onVerification={() => {}} // Handled by device control component
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

        {/* Remote Control Panel is now handled by NavigationEditorDeviceControl component */}
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