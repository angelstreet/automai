import React, { useEffect, useCallback, useState } from 'react';
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
  IconButton,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Button,
  Typography,
  Container
} from '@mui/material';
import {
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';

// Import extracted components and hooks
import { useNavigationEditor } from '../hooks/useNavigationEditor';
import { UINavigationNode } from '../components/navigation/UINavigationNode';
import { UINavigationEdge } from '../components/navigation/UINavigationEdge';
import { NavigationToolbar } from '../components/navigation/NavigationToolbar';
import { NodeEditDialog } from '../components/navigation/NodeEditDialog';
import { EdgeEditDialog } from '../components/navigation/EdgeEditDialog';
import { StatusMessages } from '../components/navigation/StatusMessages';

// Node types for React Flow
const nodeTypes = {
  uiScreen: UINavigationNode,
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
    addChildNode,
    
    // Setters
    setIsNodeDialogOpen,
    setIsEdgeDialogOpen,
    setNodeForm,
    setEdgeForm,
    setReactFlowInstance,
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
    
    // Configuration
    defaultEdgeOptions
  } = useNavigationEditor();
  
  // Add Children dialog state
  const [isAddChildDialogOpen, setIsAddChildDialogOpen] = useState(false);
  const [childForm, setChildForm] = useState({
    label: '',
    type: 'screen' as const,
    description: '',
    toAction: '',
    fromAction: ''
  });
  
  // Show message if tree ID is missing
  useEffect(() => {
    if (!treeId && !interfaceId) {
      console.log('[@component:NavigationEditor] Missing tree ID in URL');
    }
  }, [treeId, interfaceId]);
  
  // Load tree data when component mounts or treeId changes
  useEffect(() => {
    if (currentTreeId && !isLoadingInterface) {
      loadFromDatabase();
    }
  }, [currentTreeId, isLoadingInterface, loadFromDatabase]);

  return (
    <Box sx={{ 
      width: '100%',
      height: 'calc(100vh - 100px)', 
      minHeight: '500px',
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Header with NavigationToolbar */}
      <NavigationToolbar
        navigationPath={navigationPath}
        navigationNamePath={navigationNamePath}
        viewPath={viewPath}
        hasUnsavedChanges={hasUnsavedChanges}
        isLoading={isLoading}
        error={error}
        historyIndex={historyIndex}
        historyLength={history.length}
        navigateToParent={navigateToParent}
        navigateToTreeLevel={navigateToTreeLevel}
        navigateToParentView={navigateToParentView}
        addNewNode={addNewNode}
        fitView={fitView}
        undo={undo}
        redo={redo}
        saveToDatabase={saveToDatabase}
        discardChanges={discardChanges}
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
                onInit={setReactFlowInstance}
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
                      default: return '#6b7280';
                    }
                  }}
                  maskColor="rgba(0, 0, 0, 0.1)"
                />
                
                {/* Custom arrow marker for edges */}
                <defs>
                  <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon
                      points="0 0, 10 3.5, 0 7"
                      fill="#b1b1b7"
                    />
                  </marker>
                </defs>
              </ReactFlow>
            </div>

            {/* Selection Info Panel */}
            {(selectedNode || selectedEdge) ? (
              <Paper
                sx={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  width: 200,
                  p: 1.5,
                  zIndex: 1000,
                }}
              >
                {selectedNode && (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="h6" sx={{ margin: 0, fontSize: '1rem' }}>
                        Screen: {selectedNode.data.label}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={closeSelectionPanel}
                        sx={{ p: 0.25 }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    
                   
                   
                    {selectedNode.data.hasChildren && (
                      <Typography variant="body2" color="success.main" gutterBottom sx={{ mb: 1 }}>
                        💡 Double-click to explore child tree
                      </Typography>
                    )}
                    <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {/* First row: Edit and Delete */}
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.75rem', px: 1, flex: 1 }}
                          onClick={() => {
                            setNodeForm({
                              label: selectedNode.data.label,
                              type: selectedNode.data.type,
                              description: selectedNode.data.description || '',
                            });
                            setIsNodeDialogOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          sx={{ fontSize: '0.75rem', px: 1, flex: 1 }}
                          onClick={deleteSelected}
                        >
                          Delete
                        </Button>
                      </Box>
                      
                      {/* Second row: Add Children */}
                      <Button
                        size="small"
                        variant="outlined"
                        color="success"
                        sx={{ fontSize: '0.75rem', px: 1 }}
                        onClick={() => {
                          setChildForm({
                            label: '',
                            type: 'screen',
                            description: '',
                            toAction: '',
                            fromAction: ''
                          });
                          setIsAddChildDialogOpen(true);
                        }}
                      >
                        Add Children
                      </Button>
                    </Box>
                  </Box>
                )}
                
                {selectedEdge && (
                  <Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="h6" sx={{ margin: 0, fontSize: '1rem' }}>
                        Navigation Edge
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={closeSelectionPanel}
                        sx={{ p: 0.25 }}
                      >
                        <CloseIcon fontSize="small" />
                      </IconButton>
                    </Box>
                    
                    {/* Show From/To information */}
                    {selectedEdge.data?.from && (
                      <Typography variant="body2" gutterBottom sx={{ mb: 0.5 }}>
                        From: {selectedEdge.data.from}
                      </Typography>
                    )}
                    {selectedEdge.data?.to && (
                      <Typography variant="body2" gutterBottom sx={{ mb: 0.5 }}>
                        To: {selectedEdge.data.to}
                      </Typography>
                    )}
                    
                    {selectedEdge.data?.action && (
                      <Typography variant="body2" gutterBottom sx={{ mb: 0.5 }}>
                        Action: {selectedEdge.data.action}
                      </Typography>
                    )}
                    
                    {selectedEdge.data?.description && (
                      <Typography variant="body2" gutterBottom sx={{ mb: 0.5 }}>
                        Description: {selectedEdge.data.description}
                      </Typography>
                    )}
                    
                    <Box sx={{ mt: 1.5, display: 'flex', gap: 0.5 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.75rem', px: 1 }}
                        onClick={() => {
                          setEdgeForm({
                            action: selectedEdge.data?.action || '',
                            description: selectedEdge.data?.description || '',
                          });
                          setIsEdgeDialogOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        sx={{ fontSize: '0.75rem', px: 1 }}
                        onClick={deleteSelected}
                      >
                        Delete
                      </Button>
                    </Box>
                  </Box>
                )}
              </Paper>
            ) : null}
          </>
        )}
      </Box>

      {/* Node Edit Dialog */}
      <NodeEditDialog
        isOpen={isNodeDialogOpen}
        nodeForm={nodeForm}
        setNodeForm={setNodeForm}
        onSubmit={handleNodeFormSubmit}
        onClose={cancelNodeChanges}
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

      {/* Status Messages */}
      <StatusMessages error={error} success={success} />
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