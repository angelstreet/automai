import React, { useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls, 
  ReactFlowProvider,
  MiniMap,
  MarkerType,
  ConnectionLineType,
  BackgroundVariant
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
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
  Snackbar,
  Alert,
  Container
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
  Error as ErrorIcon
} from '@mui/icons-material';

// Import extracted components and hooks
import { useNavigationEditor } from '../hooks/useNavigationEditor';
import { UINavigationNode } from '../components/navigation/UINavigationNode';
import { UINavigationEdge } from '../components/navigation/UINavigationEdge';
import { NodeEditDialog } from '../components/navigation/NodeEditDialog';
import { EdgeEditDialog } from '../components/navigation/EdgeEditDialog';

// Define node types for ReactFlow
const nodeTypes = {
  uiScreen: UINavigationNode,
};

// Define edge types for ReactFlow
const edgeTypes = {
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
      {/* Header with AppBar */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar variant="dense" sx={{ minHeight: 48 }}>
          {/* Only show back button if not at root level */}
          {navigationPath.length > 1 && (
            <IconButton 
              edge="start" 
              onClick={navigateToParent} 
              size="small" 
              title="Back to Trees"
              sx={{ mr: 1 }}
            >
              <ArrowBackIcon />
            </IconButton>
          )}
          
          {/* Breadcrumb navigation */}
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            {navigationNamePath.map((treeName, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center' }}>
                {index > 0 && (
                  <Typography variant="h6" sx={{ mx: 0.5, color: 'text.secondary' }}>
                    &gt;
                  </Typography>
                )}
                <Button
                  variant="text"
                  size="small"
                  onClick={() => navigateToTreeLevel(index)}
                  sx={{
                    textTransform: 'none',
                    minWidth: 'auto',
                    fontWeight: index === navigationNamePath.length - 1 ? 'bold' : 'normal',
                    color: index === navigationNamePath.length - 1 ? 'primary.main' : 'text.secondary',
                  }}
                >
                  {decodeURIComponent(treeName)}
                  {index === navigationNamePath.length - 1 && hasUnsavedChanges && (
                    <Typography component="span" sx={{ color: 'warning.main', ml: 0.5 }}>
                      *
                    </Typography>
                  )}
                </Button>
              </Box>
            ))}
          </Box>
          
          <Button
            startIcon={<AddIcon />}
            onClick={addNewNode}
            size="small"
            sx={{ mr: 1 }}
            disabled={isLoading || !!error}
          >
            Add Screen
          </Button>
          
          <IconButton 
            onClick={fitView} 
            size="small" 
            title="Fit View" 
            disabled={isLoading || !!error}
          >
            <FitScreenIcon />
          </IconButton>
          
          <IconButton 
            onClick={undo} 
            size="small" 
            title="Undo" 
            disabled={historyIndex <= 0 || isLoading || !!error}
          >
            <UndoIcon />
          </IconButton>
          
          <IconButton 
            onClick={redo} 
            size="small" 
            title="Redo" 
            disabled={historyIndex >= history.length - 1 || isLoading || !!error}
          >
            <RedoIcon />
          </IconButton>
          
          <IconButton 
            onClick={saveToDatabase} 
            size="small" 
            title={hasUnsavedChanges ? "Save Changes to Database" : "Save to Database"}
            disabled={isLoading || !!error}
            color={hasUnsavedChanges ? "primary" : "default"}
          >
            {isLoading ? <CircularProgress size={20} /> : <SaveIcon />}
          </IconButton>
          
          <IconButton 
            onClick={discardChanges} 
            size="small" 
            title={hasUnsavedChanges ? "Discard Unsaved Changes" : "Discard Changes"}
            color={hasUnsavedChanges ? "warning" : "default"}
            disabled={isLoading || !!error}
          >
            <CancelIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

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
              Loading navigation tree...
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
                  type: 'smoothstep',
                  animated: false,
                  style: { strokeWidth: 2, stroke: '#b1b1b7' },
                  markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: '#b1b1b7',
                  },
                }}
                fitView
                attributionPosition="bottom-left"
                connectionLineType={ConnectionLineType.SmoothStep}
                snapToGrid={true}
                snapGrid={[15, 15]}
                deleteKeyCode="Delete"
                multiSelectionKeyCode="Shift"
                style={{ width: '100%', height: '100%' }}
              >
                <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
                <Controls position="bottom-right" showZoom={true} showFitView={true} showInteractive={false} />
                <MiniMap 
                  position="top-right"
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
                    
                    <Typography variant="body2" color="textSecondary" gutterBottom sx={{ mb: 0.5 }}>
                      Type: {selectedNode.data.type}
                    </Typography>
                    {selectedNode.data.description && (
                      <Typography variant="body2" gutterBottom sx={{ mb: 1 }}>
                        {selectedNode.data.description}
                      </Typography>
                    )}
                    {selectedNode.data.hasChildren && (
                      <Typography variant="body2" color="success.main" gutterBottom sx={{ mb: 1 }}>
                        💡 Double-click to explore child tree
                      </Typography>
                    )}
                    <Box sx={{ mt: 1.5, display: 'flex', gap: 0.5 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.75rem', px: 1 }}
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
                        sx={{ fontSize: '0.75rem', px: 1 }}
                        onClick={deleteSelected}
                      >
                        Delete
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
                    
                    {selectedEdge.data?.go && (
                      <Typography variant="body2" gutterBottom sx={{ mb: 0.5 }}>
                        Go: {selectedEdge.data.go}
                      </Typography>
                    )}
                    {selectedEdge.data?.comeback && (
                      <Typography variant="body2" gutterBottom sx={{ mb: 0.5 }}>
                        Return: {selectedEdge.data.comeback}
                      </Typography>
                    )}
                    <Box sx={{ mt: 1.5, display: 'flex', gap: 0.5 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.75rem', px: 1 }}
                        onClick={() => {
                          setEdgeForm({
                            go: selectedEdge.data?.go || '',
                            comeback: selectedEdge.data?.comeback || '',
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
      <Dialog open={isNodeDialogOpen} onClose={cancelNodeChanges} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Screen</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Screen Name"
              value={nodeForm.label}
              onChange={(e) => setNodeForm({ ...nodeForm, label: e.target.value })}
              fullWidth
              required
              error={!nodeForm.label.trim()}
              helperText={!nodeForm.label.trim() ? "Screen name is required" : ""}
            />
            
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                value={nodeForm.type}
                label="Type"
                onChange={(e) => setNodeForm({ ...nodeForm, type: e.target.value as any })}
              >
                <MenuItem value="screen">Screen</MenuItem>
                <MenuItem value="dialog">Dialog</MenuItem>
                <MenuItem value="popup">Popup</MenuItem>
                <MenuItem value="overlay">Overlay</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              label="Description"
              value={nodeForm.description}
              onChange={(e) => setNodeForm({ ...nodeForm, description: e.target.value })}
              multiline
              rows={3}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelNodeChanges}>Cancel</Button>
          <Button 
            onClick={handleNodeFormSubmit} 
            variant="contained"
            disabled={!nodeForm.label.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edge Edit Dialog */}
      <Dialog open={isEdgeDialogOpen} onClose={() => setIsEdgeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Navigation</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Navigation Key (Go)"
              value={edgeForm.go}
              onChange={(e) => setEdgeForm({ ...edgeForm, go: e.target.value })}
              placeholder="e.g., RIGHT, ENTER, OK"
              fullWidth
              helperText="Key or action to navigate from source to target"
            />
            
            <TextField
              label="Return Key (Comeback)"
              value={edgeForm.comeback}
              onChange={(e) => setEdgeForm({ ...edgeForm, comeback: e.target.value })}
              placeholder="e.g., LEFT, BACK, ESC"
              fullWidth
              helperText="Key or action to return from target to source"
            />
            
            <TextField
              label="Description"
              value={edgeForm.description}
              onChange={(e) => setEdgeForm({ ...edgeForm, description: e.target.value })}
              multiline
              rows={2}
              fullWidth
            />
            
            <Typography variant="caption" color="textSecondary">
              Note: At least one navigation direction (Go or Comeback) must be specified.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsEdgeDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleEdgeFormSubmit} 
            variant="contained"
            disabled={!edgeForm.go && !edgeForm.comeback}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

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