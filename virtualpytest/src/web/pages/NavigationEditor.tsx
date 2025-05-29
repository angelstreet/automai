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
      />

      {/* Main Editor Area */}
      <Box sx={{ 
        flex: 1, 
        position: 'relative', 
        minHeight: '500px',
        overflow: 'hidden'
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
                    // Note: setReactFlowInstance would be called here if available from the hook
                    console.log('[@component:NavigationEditor] ReactFlow instance initialized');
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