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
            {/* Tree level breadcrumb */}
            {navigationNamePath.map((treeName, index) => (
              <Box key={`tree-${index}`} sx={{ display: 'flex', alignItems: 'center' }}>
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
                    fontWeight: 'normal',
                    color: 'text.secondary',
                  }}
                >
                  {decodeURIComponent(treeName)}
                </Button>
              </Box>
            ))}
            
            {/* View level breadcrumb */}
            {viewPath.length > 1 && viewPath.map((level, index) => (
              <Box key={`view-${index}`} sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ mx: 0.5, color: 'text.secondary' }}>
                  &gt;
                </Typography>
                <Button
                  variant="text"
                  size="small"
                  onClick={() => navigateToParentView(index)}
                  sx={{
                    textTransform: 'none',
                    minWidth: 'auto',
                    fontWeight: index === viewPath.length - 1 ? 'bold' : 'normal',
                    color: index === viewPath.length - 1 ? 'primary.main' : 'text.secondary',
                  }}
                >
                  {level.name}
                  {index === viewPath.length - 1 && hasUnsavedChanges && (
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
          
          <Typography 
            variant="caption" 
            sx={{ 
              mr: 2, 
              color: 'text.secondary',
              fontSize: '0.7rem',
              display: { xs: 'none', md: 'block' }
            }}
          >
           
          </Typography>
          
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
                    onClose={closeSelectionPanel}
                    onEdit={() => {}}
                    onDelete={deleteSelected}
                    onAddChildren={() => {}}
                    setNodeForm={setNodeForm}
                    setIsNodeDialogOpen={setIsNodeDialogOpen}
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
                <MenuItem value="menu">Menu</MenuItem>
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