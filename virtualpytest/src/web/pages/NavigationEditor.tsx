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
import React, { useEffect, useCallback, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import ReactFlow, {
  Background,
  Controls,
  ReactFlowProvider,
  MiniMap,
  ConnectionLineType,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';

// Import extracted components and hooks
import { HDMIStream } from '../components/controller/av/HDMIStream';
import { RemotePanel } from '../components/controller/remote/RemotePanel';
import { EdgeEditDialog } from '../components/navigation/Navigation_EdgeEditDialog';
import { EdgeSelectionPanel } from '../components/navigation/Navigation_EdgeSelectionPanel';
import { NavigationEditorHeader } from '../components/navigation/Navigation_EditorHeader';
import { UIMenuNode } from '../components/navigation/Navigation_MenuNode';
import { NavigationEdgeComponent } from '../components/navigation/Navigation_NavigationEdge';
import { UINavigationNode } from '../components/navigation/Navigation_NavigationNode';
import { NodeEditDialog } from '../components/navigation/Navigation_NodeEditDialog';
import { NodeSelectionPanel } from '../components/navigation/Navigation_NodeSelectionPanel';
import { useNavigationEditor } from '../hooks';

// Node types for React Flow - defined outside component to prevent recreation on every render
const nodeTypes = {
  uiScreen: UINavigationNode,
  uiMenu: UIMenuNode,
};

const edgeTypes = {
  uiNavigation: NavigationEdgeComponent,
  smoothstep: NavigationEdgeComponent,
};

// Default options - defined outside component to prevent recreation
const defaultEdgeOptions = {
  type: 'uiNavigation',
  animated: false,
  style: { strokeWidth: 2, stroke: '#b1b1b7' },
};

const defaultViewport = { x: 0, y: 0, zoom: 1 };

const translateExtent: [[number, number], [number, number]] = [
  [-5000, -5000],
  [10000, 10000],
];
const nodeExtent: [[number, number], [number, number]] = [
  [-5000, -5000],
  [10000, 10000],
];

const snapGrid: [number, number] = [15, 15];

const reactFlowStyle = { width: '100%', height: '100%' };

const nodeOrigin: [number, number] = [0, 0];

const miniMapStyle = {
  backgroundColor: 'var(--card, #ffffff)',
  border: '1px solid var(--border, #e5e7eb)',
  borderRadius: '8px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
};

const proOptions = { hideAttribution: true };

// MiniMap nodeColor function - defined outside component to prevent recreation
const miniMapNodeColor = (node: any) => {
  switch (node.data?.type) {
    case 'screen':
      return '#3b82f6';
    case 'dialog':
      return '#8b5cf6';
    case 'popup':
      return '#f59e0b';
    case 'overlay':
      return '#10b981';
    case 'menu':
      return '#ffc107';
    default:
      return '#6b7280';
  }
};

const NavigationEditorContent: React.FC = () => {
  // DEBUG: Track re-renders
  console.log('[@component:NavigationEditorContent] Re-rendering...');

  // ========================================
  // 1. INITIALIZATION & SETUP
  // ========================================

  // Objects are already defined outside component, no need to memoize again

  // Get user interface data from navigation state (passed from UserInterface.tsx)
  const location = useLocation();
  const userInterfaceFromState = location.state?.userInterface;

  // Use navigation hook for device management
  // This hook handles: interface fetching, host filtering, device control, take control, screenshots
  // The header will use this same hook to be autonomous

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

    // Device control state & handlers
    selectedHost,
    isControlActive,
    isRemotePanelOpen,
    showRemotePanel,
    showAVPanel,
    handleDeviceSelect,
    handleControlStateChange,
    handleToggleRemotePanel,
    handleDisconnectComplete,
  } = useNavigationEditor();

  // Track the last loaded tree ID to prevent unnecessary reloads
  const lastLoadedTreeId = useRef<string | null>(null);

  // Track AV panel expanded state
  const [isAVPanelExpanded, setIsAVPanelExpanded] = useState(false);

  // Memoize the AV panel expanded change handler to prevent infinite loops
  const handleAVPanelExpandedChange = useCallback((isExpanded: boolean) => {
    setIsAVPanelExpanded(isExpanded);
  }, []);

  // ========================================
  // 2. TREE LOADING & LOCK MANAGEMENT
  // ========================================

  // Set user interface from navigation state (passed from UserInterface.tsx)
  useEffect(() => {
    if (userInterfaceFromState) {
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
      lastLoadedTreeId.current = currentTreeName;

      // Fix race condition: Set checking state immediately
      setCheckingLockState(true);

      // STEP 1: First acquire lock (this is the critical requirement)
      lockNavigationTree(currentTreeName)
        .then((lockSuccess) => {
          if (lockSuccess) {
            console.log(
              `[@component:NavigationEditor] Lock acquired successfully for tree: ${currentTreeName}`,
            );
            // STEP 2: If lock acquired, load the tree data (nodes/edges only, not interface metadata)
            loadFromConfig(currentTreeName);
          } else {
            console.warn(
              `[@component:NavigationEditor] Failed to acquire lock for tree: ${currentTreeName} - entering read-only mode`,
            );
            // STEP 3: If lock failed, still load tree but in read-only mode
            loadFromConfig(currentTreeName);
            // Note: isLocked state will be false, which will trigger read-only UI
          }
        })
        .catch((error) => {
          console.error(
            `[@component:NavigationEditor] Error during lock acquisition for tree: ${currentTreeName}`,
            error,
          );
          // Still try to load in read-only mode
          loadFromConfig(currentTreeName);
        });

      // Setup auto-unlock for this tree (cleanup function)
      const cleanup = setupAutoUnlock(currentTreeName);

      // Return cleanup function
      return cleanup;
    }
  }, [
    currentTreeName,
    isLoadingInterface,
    loadFromConfig,
    lockNavigationTree,
    setupAutoUnlock,
    setCheckingLockState,
  ]);

  // ========================================
  // 3. DEVICE CONTROL - HANDLED BY HOOK
  // ========================================

  // All device control logic is now in useNavigation hook

  // ========================================
  // 6. EVENT HANDLERS SETUP
  // ========================================

  // Simple update handlers - complex validation logic moved to device control component
  const handleUpdateNode = useCallback(
    (nodeId: string, updatedData: any) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === nodeId ? { ...node, data: { ...node.data, ...updatedData } } : node,
        ),
      );
      if (selectedNode?.id === nodeId) {
        setSelectedNode((node) =>
          node ? { ...node, data: { ...node.data, ...updatedData } } : node,
        );
      }
      setHasUnsavedChanges(true);
    },
    [setNodes, setSelectedNode, setHasUnsavedChanges, selectedNode],
  );

  const handleUpdateEdge = useCallback(
    (edgeId: string, updatedData: any) => {
      setEdges((edges) =>
        edges.map((edge) =>
          edge.id === edgeId ? { ...edge, data: { ...edge.data, ...updatedData } } : edge,
        ),
      );
      if (selectedEdge?.id === edgeId) {
        setSelectedEdge((edge) =>
          edge ? { ...edge, data: { ...edge.data, ...updatedData } } : edge,
        );
      }
      setHasUnsavedChanges(true);
    },
    [setEdges, setSelectedEdge, setHasUnsavedChanges, selectedEdge],
  );

  // ========================================
  // 7. RENDER
  // ========================================

  return (
    <Box
      sx={{
        width: '100%',
        height: 'calc(100vh - 100px)',
        minHeight: '500px',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
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
        isLoading={false} // Tree loading handled separately from device control loading
        error={null} // Error handling moved to device control component
        // History props removed - using page reload for cancel changes
        isLocked={isLocked}
        lockInfo={lockInfo}
        sessionId={sessionId}
        userInterface={userInterface}
        devicesLoading={false}
        treeId={currentTreeId}
        // Device control props - now provided by hook
        selectedHost={selectedHost}
        isControlActive={isControlActive}
        isRemotePanelOpen={isRemotePanelOpen}
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
        onToggleRemotePanel={handleToggleRemotePanel}
        onDeviceSelect={handleDeviceSelect}
        onControlStateChange={handleControlStateChange}
        onUpdateNode={handleUpdateNode}
        onUpdateEdge={handleUpdateEdge}
      />

      {/* Main Container with side-by-side layout */}
      <Box
        sx={{
          flex: 1,
          display: 'flex',
          minHeight: '500px',
          overflow: 'hidden',
        }}
      >
        {/* Main Editor Area */}
        <Box
          sx={{
            flex: 1,
            position: 'relative',
            minHeight: '500px',
            overflow: 'hidden',
            transition: 'margin-right',
            marginRight: '0px', // Remote panel managed by header
          }}
        >
          <>
            <div
              ref={reactFlowWrapper}
              style={{
                width: '100%',
                height: '100%',
                minHeight: '500px',
                position: 'relative',
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
                    py: 0.5,
                    borderRadius: 1,
                    boxShadow: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    fontSize: '0.675rem',
                    fontWeight: 'medium',
                  }}
                >
                  🔒 READ-ONLY MODE
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>
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
                defaultEdgeOptions={defaultEdgeOptions}
                defaultViewport={defaultViewport}
                // Ensure consistent viewport and prevent auto-fitting
                translateExtent={translateExtent}
                nodeExtent={nodeExtent}
                attributionPosition="bottom-left"
                connectionLineType={ConnectionLineType.SmoothStep}
                snapToGrid={true}
                snapGrid={snapGrid}
                deleteKeyCode={isLocked ? 'Delete' : null}
                multiSelectionKeyCode="Shift"
                style={reactFlowStyle}
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
                proOptions={proOptions}
                // Prevent automatic layout algorithms
                nodeOrigin={nodeOrigin}
                // Additional props to prevent automatic positioning
                autoPanOnConnect={false}
                autoPanOnNodeDrag={false}
                connectOnClick={false}
                // Prevent automatic centering or repositioning
                onlyRenderVisibleElements={false}
              >
                <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
                <Controls
                  position="top-left"
                  showZoom={true}
                  showFitView={true}
                  showInteractive={false}
                />
                <MiniMap
                  position="bottom-right"
                  style={miniMapStyle}
                  nodeColor={miniMapNodeColor}
                  maskColor="rgba(0, 0, 0, 0.1)"
                />
              </ReactFlow>
            </div>

            {/* Device Control Component - Simplified without selectedHost */}
            {/* NavigationEditorDeviceControl removed - logic should be in take control action */}

            {/* Selection Info Panel */}
            {selectedNode || selectedEdge ? (
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
                    treeId={currentTreeId || ''}
                    currentNodeId={focusNodeId || undefined}
                    onUpdateNode={handleUpdateNode}
                    isControlActive={isControlActive}
                    selectedHost={selectedHost}
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
                    controllerTypes={userInterface?.models || []}
                    onUpdateEdge={handleUpdateEdge}
                    isControlActive={isControlActive}
                    selectedHost={selectedHost}
                  />
                )}
              </>
            ) : null}
          </>
        </Box>

        {/* Remote Control Panel is now handled by NavigationEditorDeviceControl component */}
      </Box>

      {/* Autonomous Panels - Now self-positioning with configurable layouts */}
      {showRemotePanel && selectedHost && (
        <RemotePanel
          host={selectedHost}
          onReleaseControl={handleDisconnectComplete}
          streamExpanded={isAVPanelExpanded}
        />
      )}

      {showAVPanel && selectedHost && (
        <HDMIStream
          host={selectedHost}
          onDisconnectComplete={handleDisconnectComplete}
          onExpandedChange={handleAVPanelExpandedChange}
        />
      )}

      {/* Node Edit Dialog */}
      <NodeEditDialog
        isOpen={isNodeDialogOpen}
        nodeForm={nodeForm}
        nodes={nodes}
        setNodeForm={setNodeForm}
        onSubmit={handleNodeFormSubmit}
        onClose={cancelNodeChanges}
        onResetNode={resetNode}
        model={userInterface?.models?.[0] || 'android_mobile'}
        isControlActive={isControlActive}
        selectedHost={selectedHost}
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
        selectedHost={selectedHost}
      />

      {/* Discard Changes Confirmation Dialog */}
      <Dialog open={isDiscardDialogOpen} onClose={() => setIsDiscardDialogOpen(false)}>
        <DialogTitle>Discard Changes?</DialogTitle>
        <DialogContent>
          <Typography>
            You have unsaved changes. Are you sure you want to discard them and revert to the last
            saved state?
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
