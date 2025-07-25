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
import React, { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import ReactFlow, {
  Background,
  Controls,
  ReactFlowProvider,
  MiniMap,
  ConnectionLineType,
  BackgroundVariant,
  MarkerType,
  Node,
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
import { NodeGotoPanel } from '../components/navigation/Navigation_NodeGotoPanel';
import { NodeSelectionPanel } from '../components/navigation/Navigation_NodeSelectionPanel';
import { useTheme } from '../contexts/ThemeContext';
import { useDeviceData } from '../contexts/device/DeviceDataContext';
import { useHostManager } from '../contexts/index';
import {
  NavigationConfigProvider,
  useNavigationConfig,
} from '../contexts/navigation/NavigationConfigContext';
import { useNavigation } from '../contexts/navigation/NavigationContext';
import { NavigationEditorProvider } from '../contexts/navigation/NavigationEditorProvider';
import {
  NavigationStackProvider,
  useNavigationStack,
} from '../contexts/navigation/NavigationStackContext';
import { NavigationBreadcrumbCompact } from '../components/navigation/NavigationBreadcrumbCompact';
import { useNavigationEditor } from '../hooks/navigation/useNavigationEditor';
import { useNestedNavigation } from '../hooks/navigation/useNestedNavigation';
import {
  NodeForm,
  EdgeForm,
  UINavigationNode as UINavigationNodeType,
} from '../types/pages/Navigation_Types';
import { getZIndex } from '../utils/zIndexUtils';

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
  markerEnd: {
    type: MarkerType.ArrowClosed,
    width: 20,
    height: 20,
    color: '#b1b1b7',
  },
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

// miniMapStyle moved inside component to use theme context

const proOptions = { hideAttribution: true };

// MiniMap nodeColor function - defined outside component to prevent recreation
const miniMapNodeColor = (node: any) => {
  // Check if this is the current position node
  const isCurrentPosition = node.data?.isCurrentPosition;

  // Check if this is part of navigation route
  const isOnNavigationRoute = node.data?.isOnNavigationRoute;

  // Current position gets bright purple
  if (isCurrentPosition) {
    return '#9c27b0'; // Bright purple for current position
  }

  // Navigation route nodes get orange/amber
  if (isOnNavigationRoute) {
    return '#ff9800'; // Orange for navigation route
  }

  // Default colors based on node type
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
    case 'entry':
      return '#ef4444'; // Red for entry points
    default:
      return '#6b7280';
  }
};

// Helper function to get node label by ID
const getNodeLabelById = (nodeId: string, nodes: Node[]): string => {
  const node = nodes.find((n) => n.id === nodeId);
  return node?.data?.label || nodeId;
};

const NavigationEditorContent: React.FC<{ userInterfaceId?: string }> = React.memo(
  ({ userInterfaceId }) => {
    const location = useLocation();
    const userInterfaceFromState = location.state?.userInterface;

    // Get theme context for dynamic styling
    const { actualMode } = useTheme();

    // Get navigation stack for nested navigation
    const { popLevel, pushLevel, currentLevel, stack, isNested } = useNavigationStack();

    // Get current node ID from NavigationContext
    const { currentNodeId } = useNavigation();

    // Get the actual tree ID from NavigationConfigContext
    const { actualTreeId } = useNavigationConfig();

    // Get navigation context for nested navigation
    const navigation = useNavigation();

    // Dynamic miniMapStyle based on theme - black background in dark mode, white in light mode
    const miniMapStyle = useMemo(
      () => ({
        backgroundColor: actualMode === 'dark' ? '#1f2937' : '#ffffff',
        border: `1px solid ${actualMode === 'dark' ? '#374151' : '#e5e7eb'}`,
        borderRadius: '8px',
        boxShadow:
          actualMode === 'dark'
            ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
            : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      }),
      [actualMode],
    );

    // Use the restored navigation editor hook
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
      treeId,
      interfaceId,
      hasUnsavedChanges,
      isDiscardDialogOpen,
      userInterface,

      // View state for single-level navigation

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
      onNodeDoubleClick: originalOnNodeDoubleClick,
      onPaneClick,

      // Actions
      loadFromConfig,
      saveToConfig,
      isLocked,
      showReadOnlyOverlay,
      lockNavigationTree,
      handleNodeFormSubmit,
      handleEdgeFormSubmit,
      addNewNode,
      cancelNodeChanges,
      discardChanges,
      performDiscardChanges,
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

      // Error state
      error,

      // Host data (filtered by userInterface models)
      availableHosts,
    } = useNavigationEditor();

    // Initialize nested navigation hook
    const nestedNavigation = useNestedNavigation({
      setNodes,
      setEdges,
      openNodeDialog: navigation.openNodeDialog,
    });

    // Use the correct userInterfaceId - prefer prop over URL param
    const actualUserInterfaceId = userInterfaceId || interfaceId;

    // Get host manager from context (excluding availableHosts - we get that from useNavigationEditor)
    const {
      selectedHost,
      selectedDeviceId,
      isControlActive,
      isRemotePanelOpen,
      showRemotePanel,
      showAVPanel,
      handleDeviceSelect,
      handleControlStateChange,
      handleToggleRemotePanel,
      handleDisconnectComplete,
    } = useHostManager();

    // Track the last loaded tree ID to prevent unnecessary reloads
    const lastLoadedTreeId = useRef<string | null>(null);

    // Track AV panel collapsed state
    const [isAVPanelCollapsed, setIsAVPanelCollapsed] = useState(true);
    const [isAVPanelMinimized, setIsAVPanelMinimized] = useState(false);
    const [captureMode, setCaptureMode] = useState<'stream' | 'screenshot' | 'video'>('stream');

    // Goto panel state
    const [showGotoPanel, setShowGotoPanel] = useState(false);
    const [selectedNodeForGoto, setSelectedNodeForGoto] = useState<UINavigationNodeType | null>(
      null,
    );

    // Wrap the original click handlers to close goto panel
    const wrappedOnNodeClick = useCallback(
      (event: React.MouseEvent, node: any) => {
        // Close goto panel if it's open
        if (showGotoPanel) {
          setShowGotoPanel(false);
          setSelectedNodeForGoto(null);
        }
        // Call the original handler
        onNodeClick(event, node);
      },
      [onNodeClick, showGotoPanel],
    );

    const wrappedOnEdgeClick = useCallback(
      (event: React.MouseEvent, edge: any) => {
        // Close goto panel if it's open
        if (showGotoPanel) {
          setShowGotoPanel(false);
          setSelectedNodeForGoto(null);
        }
        // Call the original handler
        onEdgeClick(event, edge);
      },
      [onEdgeClick, showGotoPanel],
    );

    // Wrap the pane click handler to also close goto panel
    const wrappedOnPaneClick = useCallback(() => {
      // Close goto panel if it's open
      if (showGotoPanel) {
        setShowGotoPanel(false);
        setSelectedNodeForGoto(null);
      }
      // Call the original handler
      onPaneClick();
    }, [onPaneClick, showGotoPanel]);

    // Memoize the AV panel collapsed change handler to prevent infinite loops
    const handleAVPanelCollapsedChange = useCallback((isCollapsed: boolean) => {
      setIsAVPanelCollapsed(isCollapsed);
    }, []);

    // Handle minimized state changes from HDMIStream
    const handleAVPanelMinimizedChange = useCallback((isMinimized: boolean) => {
      setIsAVPanelMinimized(isMinimized);
    }, []);

    // Handle capture mode changes from HDMIStream
    const handleCaptureModeChange = useCallback((mode: 'stream' | 'screenshot' | 'video') => {
      setCaptureMode(mode);
    }, []);

    // Handle opening goto panel
    const handleOpenGotoPanel = useCallback((node: UINavigationNodeType) => {
      setSelectedNodeForGoto(node);
      setShowGotoPanel(true);
    }, []);

    // Handle closing goto panel
    const handleCloseGotoPanel = useCallback(() => {
      setShowGotoPanel(false);
      setSelectedNodeForGoto(null);
    }, []);

    // Handle navigation back to parent tree
    const handleNavigateBack = useCallback(async () => {
      popLevel();
      // Reload main tree - simplified version
      if (loadFromConfig && actualUserInterfaceId) {
        await loadFromConfig(actualUserInterfaceId);
      }
    }, [popLevel, loadFromConfig, actualUserInterfaceId]);

    // Memoize the selectedHost to prevent unnecessary re-renders
    const stableSelectedHost = useMemo(() => selectedHost, [selectedHost]);

    // Centralized reference management - both verification references and actions
    const { setControlState } = useDeviceData();

    // Set control state in device data context when it changes
    useEffect(() => {
      setControlState(stableSelectedHost, selectedDeviceId, isControlActive);
    }, [stableSelectedHost, selectedDeviceId, isControlActive, setControlState]);

    // ========================================
    // 1. INITIALIZATION & REFERENCES
    // ========================================

    // Create a unified save function that handles both root and subtree saves
    const handleSaveToConfig = useCallback(
      async (saveTarget: 'root' | 'subtree' | 'auto' = 'auto') => {
        try {
          // Auto-determine save target if not specified
          const shouldSaveAsSubtree =
            saveTarget === 'subtree' || (saveTarget === 'auto' && isNested && currentLevel);

          if (shouldSaveAsSubtree && currentLevel) {
            // Save as subtree - check if subtree already exists
            console.log(
              `[@NavigationEditor] Saving as subtree for: ${currentLevel.parentNodeLabel}`,
            );

            // First, check if a subtree already exists for this node
            const checkResponse = await fetch(
              `/server/navigationTrees/getNodeSubTrees/${actualTreeId}/${currentLevel.parentNodeId}`,
            );
            const checkResult = await checkResponse.json();

            if (checkResult.success && checkResult.sub_trees && checkResult.sub_trees.length > 0) {
              // Update existing subtree
              const existingSubTree = checkResult.sub_trees[0]; // Use the first subtree
              console.log(`[@NavigationEditor] Updating existing subtree: ${existingSubTree.id}`);

              const updateResponse = await fetch(
                `/server/navigationTrees/updateTree/${existingSubTree.id}`,
                {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    tree_data: { nodes, edges },
                    description: `Updated actions for ${currentLevel.parentNodeLabel}`,
                    modification_type: 'update',
                    changes_summary: 'Updated subtree from nested navigation editor',
                  }),
                },
              );
              const updateResult = await updateResponse.json();

              if (updateResult.success) {
                console.log('Sub-tree updated successfully');
                setHasUnsavedChanges(false);
              } else {
                console.error('Failed to update sub-tree:', updateResult.message);
                throw new Error(updateResult.message);
              }
            } else {
              // Create new subtree
              console.log(`[@NavigationEditor] Creating new subtree`);
              const response = await fetch('/server/navigationTrees/createSubTree', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  parent_tree_id: actualTreeId,
                  parent_node_id: currentLevel.parentNodeId,
                  sub_tree_name: currentLevel.treeName,
                  tree_data: { nodes, edges },
                  description: `Actions for ${currentLevel.parentNodeLabel}`,
                }),
              });
              const result = await response.json();

              if (result.success) {
                console.log('Sub-tree created successfully');
                setHasUnsavedChanges(false);
              } else {
                console.error('Failed to create sub-tree:', result.message);
                throw new Error(result.message);
              }
            }
          } else if (actualUserInterfaceId) {
            // Save as root tree
            console.log('[@NavigationEditor] Saving as root tree');
            await saveToConfig(actualUserInterfaceId);
          } else {
            throw new Error('Cannot save: missing userInterface ID');
          }
        } catch (error) {
          console.error('Error saving tree:', error);
          // Re-throw to let the UI handle the error
          throw error;
        }
      },
      [
        isNested,
        currentLevel,
        actualTreeId,
        nodes,
        edges,
        actualUserInterfaceId,
        saveToConfig,
        setHasUnsavedChanges,
      ],
    );

    // Wrapper for the header component (matches expected signature)
    const handleSaveForHeader = useCallback(() => {
      handleSaveToConfig('auto');
    }, [handleSaveToConfig]);

    // Auto-fit view when entering nested navigation
    useEffect(() => {
      if (isNested && stack.length > 0) {
        // Small delay to ensure nodes are rendered before fitting view
        const timer = setTimeout(() => {
          fitView();
        }, 100);
        return () => clearTimeout(timer);
      }
    }, [isNested, stack.length, fitView]);

    // Lifecycle refs to prevent unnecessary re-renders

    // Set user interface from navigation state (passed from UserInterface.tsx)
    useEffect(() => {
      if (userInterfaceFromState) {
        setUserInterfaceFromProps(userInterfaceFromState);
      }
    }, [userInterfaceFromState, setUserInterfaceFromProps]);

    // Show message if tree ID is missing
    useEffect(() => {
      if (!treeId && !interfaceId) {
        console.warn('[@component:NavigationEditor] Missing tree ID in URL');
      }
    }, [treeId, interfaceId]);

    // Effect to load tree when tree name changes
    useEffect(() => {
      // Only load if we have a tree name and userInterface is loaded
      if (userInterface?.id && !isLoadingInterface) {
        // Check if we already loaded this userInterface to prevent infinite loops
        if (lastLoadedTreeId.current === userInterface.id) {
          return;
        }
        lastLoadedTreeId.current = userInterface.id;

        // STEP 1: Acquire navigation tree lock on mount (prevent concurrent editing)
        if (lockNavigationTree) {
          lockNavigationTree(userInterface.id)
            .then((lockSuccess: boolean) => {
              if (lockSuccess) {
                console.log(
                  `[@component:NavigationEditor] Navigation tree locked for editing: ${userInterface.id}`,
                );
                // STEP 2: Load tree data after acquiring lock
                if (loadFromConfig) {
                  loadFromConfig(userInterface.id);
                }
              } else {
                console.warn(
                  `[@component:NavigationEditor] Failed to lock navigation tree: ${userInterface.id} - entering read-only mode`,
                );
                // Still load tree but in read-only mode
                if (loadFromConfig) {
                  loadFromConfig(userInterface.id);
                }
              }
            })
            .catch((error: any) => {
              console.error(
                `[@component:NavigationEditor] Error locking navigation tree: ${userInterface.id}`,
                error,
              );
              // Still try to load in read-only mode
              if (loadFromConfig) {
                loadFromConfig(userInterface.id);
              }
            });
        } else {
          console.warn('[@component:NavigationEditor] lockNavigationTree function not available');
          if (loadFromConfig) {
            loadFromConfig(userInterface.id);
          }
        }

        // No auto-unlock for navigation tree - keep it locked for editing session
      }
    }, [userInterface?.id, isLoadingInterface, lockNavigationTree, loadFromConfig]);

    // Simple update handlers - complex validation logic moved to device control component
    const handleUpdateNode = useCallback(
      (nodeId: string, updatedData: any) => {
        const updatedNodes = nodes.map((node) =>
          node.id === nodeId ? { ...node, data: { ...node.data, ...updatedData } } : node,
        );
        setNodes(updatedNodes);
        if (selectedNode?.id === nodeId) {
          setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, ...updatedData } });
        }
        setHasUnsavedChanges(true);
      },
      [nodes, setNodes, setSelectedNode, setHasUnsavedChanges, selectedNode],
    );

    // Wrapper for node form submission to handle the form data
    const handleNodeFormSubmitWrapper = useCallback(() => {
      if (nodeForm) {
        console.log(
          '[@component:NavigationEditor] Submitting node form with verifications:',
          nodeForm.verifications?.length || 0,
        );
        handleNodeFormSubmit(nodeForm);
        console.log('[@component:NavigationEditor] Node form submitted successfully');
      }
    }, [nodeForm, handleNodeFormSubmit]);

    // Wrapper for add new node to provide default parameters
    const handleAddNewNodeWrapper = useCallback(() => {
      addNewNode('screen', { x: 250, y: 250 });
    }, [addNewNode]);

    const handleUpdateEdge = useCallback(
      (edgeId: string, updatedData: any) => {
        const updatedEdges = edges.map((edge) =>
          edge.id === edgeId ? { ...edge, data: { ...edge.data, ...updatedData } } : edge,
        );
        setEdges(updatedEdges);
        if (selectedEdge?.id === edgeId) {
          setSelectedEdge({ ...selectedEdge, data: { ...selectedEdge.data, ...updatedData } });
        }
        setHasUnsavedChanges(true);
      },
      [edges, setEdges, setSelectedEdge, setHasUnsavedChanges, selectedEdge],
    );

    // ========================================
    // 7. RENDER
    // ========================================

    // State for edge labels
    const [edgeLabels, setEdgeLabels] = useState<{ fromLabel: string; toLabel: string }>({
      fromLabel: '',
      toLabel: '',
    });

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
          hasUnsavedChanges={hasUnsavedChanges}
          focusNodeId={focusNodeId}
          availableFocusNodes={availableFocusNodes}
          maxDisplayDepth={maxDisplayDepth}
          totalNodes={allNodes.length}
          visibleNodes={nodes.length}
          isLoading={isLoadingInterface}
          error={error}
          isLocked={isLocked ?? false}
          treeId={actualTreeId || treeId || ''}
          selectedHost={selectedHost}
          selectedDeviceId={selectedDeviceId}
          isRemotePanelOpen={isRemotePanelOpen}
          availableHosts={availableHosts}
          onAddNewNode={handleAddNewNodeWrapper}
          onFitView={fitView}
          onSaveToConfig={handleSaveForHeader}
          onDiscardChanges={discardChanges}
          onDepthChange={setDisplayDepth}
          onResetFocus={resetFocus}
          onToggleRemotePanel={handleToggleRemotePanel}
          onControlStateChange={handleControlStateChange}
          onDeviceSelect={handleDeviceSelect}
        />

        {/* Compact Breadcrumb - positioned below header, aligned left */}
        <NavigationBreadcrumbCompact onNavigateBack={handleNavigateBack} />

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
                      zIndex: getZIndex('READ_ONLY_INDICATOR'),
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
                      Tree locked by another user
                    </Typography>
                  </Box>
                )}

                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onNodeClick={wrappedOnNodeClick}
                  onEdgeClick={wrappedOnEdgeClick}
                  onNodeDoubleClick={nestedNavigation.handleNodeDoubleClick}
                  onPaneClick={wrappedOnPaneClick}
                  onInit={setReactFlowInstance}
                  nodeTypes={nodeTypes}
                  edgeTypes={edgeTypes}
                  defaultEdgeOptions={defaultEdgeOptions}
                  connectionLineType={ConnectionLineType.SmoothStep}
                  defaultViewport={defaultViewport}
                  translateExtent={translateExtent}
                  nodeExtent={nodeExtent}
                  snapToGrid={true}
                  snapGrid={snapGrid}
                  style={reactFlowStyle}
                  nodeOrigin={nodeOrigin}
                  proOptions={proOptions}
                >
                  <Background variant={BackgroundVariant.Dots} gap={15} size={1} />
                  <Controls />
                  <MiniMap
                    style={miniMapStyle}
                    nodeColor={miniMapNodeColor}
                    maskColor="rgba(255, 255, 255, 0.2)"
                    pannable
                    zoomable
                    position="top-right"
                  />
                </ReactFlow>
              </div>

              {/* Side Panels */}
              {selectedNode || selectedEdge ? (
                <>
                  {selectedNode && selectedNode.data.type !== 'entry' ? (
                    <>
                      {/* Node Selection Panel */}
                      <NodeSelectionPanel
                        selectedNode={selectedNode}
                        nodes={nodes}
                        onClose={closeSelectionPanel}
                        onDelete={deleteSelected}
                        setNodeForm={setNodeForm as React.Dispatch<React.SetStateAction<NodeForm>>}
                        setIsNodeDialogOpen={setIsNodeDialogOpen}
                        onReset={resetNode}
                        onUpdateNode={handleUpdateNode}
                        isControlActive={isControlActive}
                        selectedHost={selectedHost || undefined}
                        selectedDeviceId={selectedDeviceId || undefined}
                        treeId={actualTreeId || treeId || ''}
                        currentNodeId={currentNodeId || undefined}
                        onOpenGotoPanel={handleOpenGotoPanel}
                      />
                    </>
                  ) : selectedEdge ? (
                    <>
                      {/* Edge Selection Panel(s) */}
                      <EdgeSelectionPanel
                        selectedEdge={selectedEdge}
                        onClose={closeSelectionPanel}
                        onEdit={() => {}}
                        onDelete={deleteSelected}
                        setEdgeForm={setEdgeForm as React.Dispatch<React.SetStateAction<EdgeForm>>}
                        setIsEdgeDialogOpen={setIsEdgeDialogOpen}
                        isControlActive={isControlActive}
                        selectedHost={selectedHost || undefined}
                        onEditWithLabels={(fromLabel, toLabel) =>
                          setEdgeLabels({ fromLabel, toLabel })
                        }
                      />

                      {/* Second panel for bidirectional edge if it exists */}
                      {(selectedEdge as any).bidirectionalEdge && (
                        <EdgeSelectionPanel
                          selectedEdge={(selectedEdge as any).bidirectionalEdge}
                          onClose={closeSelectionPanel}
                          onEdit={() => {}}
                          onDelete={deleteSelected}
                          setEdgeForm={
                            setEdgeForm as React.Dispatch<React.SetStateAction<EdgeForm>>
                          }
                          setIsEdgeDialogOpen={setIsEdgeDialogOpen}
                          isControlActive={isControlActive}
                          selectedHost={selectedHost || undefined}
                          panelIndex={1}
                          onEditWithLabels={(fromLabel, toLabel) =>
                            setEdgeLabels({ fromLabel, toLabel })
                          }
                        />
                      )}
                    </>
                  ) : null}
                </>
              ) : null}
            </>
          </Box>

          {/* Remote Control Panel is now handled by NavigationEditorDeviceControl component */}
        </Box>

        {/* Autonomous Panels - Now self-positioning with configurable layouts */}
        {showRemotePanel && selectedHost && selectedDeviceId && (
          <RemotePanel {...remotePanelProps} />
        )}

        {showAVPanel && selectedHost && selectedDeviceId && <HDMIStream {...hdmiStreamProps} />}

        {/* Node Goto Panel */}
        {showGotoPanel && selectedNodeForGoto && (actualTreeId || treeId) && (
          <NodeGotoPanel
            selectedNode={selectedNodeForGoto}
            nodes={nodes}
            treeId={actualTreeId || treeId || ''}
            onClose={handleCloseGotoPanel}
            currentNodeId={currentNodeId || undefined}
            selectedHost={selectedHost || undefined}
            selectedDeviceId={selectedDeviceId || undefined}
            isControlActive={isControlActive}
          />
        )}

        {/* Node Edit Dialog */}
        {isNodeDialogOpen && (
          <NodeEditDialog
            isOpen={isNodeDialogOpen}
            nodeForm={nodeForm}
            nodes={nodes}
            setNodeForm={setNodeForm as (form: NodeForm | null) => void}
            onSubmit={handleNodeFormSubmitWrapper}
            onClose={cancelNodeChanges}
            onResetNode={() => selectedNode && resetNode(selectedNode.id)}
            model={userInterface?.models?.[0] || 'android_mobile'}
            isControlActive={isControlActive}
            selectedHost={selectedHost}
            selectedDeviceId={selectedDeviceId || undefined}
          />
        )}

        {/* Edge Edit Dialog */}
        {isEdgeDialogOpen && selectedHost && (
          <EdgeEditDialog
            isOpen={isEdgeDialogOpen}
            edgeForm={edgeForm}
            setEdgeForm={setEdgeForm as React.Dispatch<React.SetStateAction<EdgeForm>>}
            onSubmit={handleEdgeFormSubmit}
            onClose={() => setIsEdgeDialogOpen(false)}
            selectedEdge={selectedEdge}
            isControlActive={isControlActive}
            selectedHost={selectedHost}
            fromLabel={edgeLabels.fromLabel}
            toLabel={edgeLabels.toLabel}
          />
        )}

        {/* Discard Changes Confirmation Dialog */}
        <Dialog
          open={isDiscardDialogOpen}
          onClose={() => setIsDiscardDialogOpen(false)}
          sx={{ zIndex: getZIndex('NAVIGATION_CONFIRMATION') }}
        >
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
  },
  () => {
    // Custom comparison function - since this component has no props,
    // it should only re-render when its internal hooks change
    // Return true to prevent re-render, false to allow re-render
    return false; // Always allow re-render since we depend on context hooks
  },
);

const NavigationEditor: React.FC = () => {
  // Get userInterface directly from location.state to avoid timing issues
  const location = useLocation();
  const userInterfaceFromState = location.state?.userInterface;

  // Memoize userInterface for consistency
  const stableUserInterface = useMemo(() => userInterfaceFromState, [userInterfaceFromState]);

  // Ensure we have userInterfaceId before rendering
  const userInterfaceId = stableUserInterface?.id;

  if (!userInterfaceId) {
    console.warn(
      '[@component:NavigationEditor] Missing userInterfaceId, cannot save verifications',
    );
    return (
      <ReactFlowProvider>
        <NavigationConfigProvider>
          <NavigationEditorProvider>
            <NavigationEditorContent />
          </NavigationEditorProvider>
        </NavigationConfigProvider>
      </ReactFlowProvider>
    );
  }

  return (
    <ReactFlowProvider>
      <NavigationConfigProvider>
        <NavigationEditorProvider>
          <NavigationStackProvider>
            <NavigationEditorContent userInterfaceId={userInterfaceId} />
          </NavigationStackProvider>
        </NavigationEditorProvider>
      </NavigationConfigProvider>
    </ReactFlowProvider>
  );
};

export default NavigationEditor;
