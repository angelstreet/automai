import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  AppBar,
  Toolbar,
  Button,
  IconButton,
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
} from '@mui/material';
import {
  Save as SaveIcon,
  Add as AddIcon,
  FitScreen as FitScreenIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useParams } from 'react-router-dom';
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';

// Types for our navigation tree
interface UINavigationNode extends Node {
  data: {
    label: string;
    type: 'screen' | 'dialog' | 'popup' | 'overlay';
    screenshot?: string;
    thumbnail?: string;
    description?: string;
  };
}

interface UINavigationEdge extends Edge {
  id: string;
  source: string;
  target: string;
  data?: {
    go?: string;        // Navigation key to go from source to target
    comeback?: string;  // Navigation key to return from target to source
    description?: string;
  };
}

// Custom Node Component for UI Screens
const UIScreenNode = ({ data, selected }: { data: any; selected: boolean }) => {
  return (
    <Box
      sx={{
        width: 200,
        height: 120,
        border: selected ? '2px solid #1976d2' : '1px solid #ccc',
        borderRadius: 2,
        backgroundColor: 'white',
        boxShadow: selected ? 3 : 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Header with node name and type */}
      <Box
        sx={{
          padding: 1,
          backgroundColor: 'white',
          borderBottom: '1px solid #eee',
          minHeight: 40,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontWeight: 'bold',
            display: 'block',
            textAlign: 'center',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            color: 'black', // Force black text for readability in dark mode
          }}
        >
          {data.label}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            textAlign: 'center',
            fontSize: '0.6rem',
            color: '#666', // Dark gray for secondary text, readable in dark mode
          }}
        >
          {data.type}
        </Typography>
      </Box>

      {/* Screenshot/Thumbnail area */}
      <Box
        sx={{
          flex: 1,
          backgroundColor: data.thumbnail ? 'transparent' : '#f5f5f5',
          backgroundImage: data.thumbnail ? `url(${data.thumbnail})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        {!data.thumbnail && (
          <Typography variant="caption" sx={{ color: '#666' }}>
            No Screenshot
          </Typography>
        )}
      </Box>
    </Box>
  );
};

// Custom Edge Component with Navigation Labels
const UINavigationEdge = ({ 
  id, 
  sourceX, 
  sourceY, 
  targetX, 
  targetY, 
  data 
}: any) => {
  const edgePath = `M${sourceX},${sourceY} L${targetX},${targetY}`;
  
  return (
    <g>
      <path
        id={id}
        style={{
          stroke: '#b1b1b7',
          strokeWidth: 2,
          fill: 'none',
          markerEnd: 'url(#arrowhead)',
        }}
        d={edgePath}
      />
      {data?.go && (
        <text
          x={(sourceX + targetX) / 2}
          y={(sourceY + targetY) / 2 - 10}
          textAnchor="middle"
          fontSize="10"
          fill="#666"
          style={{ pointerEvents: 'none' }}
        >
          {data.go}
        </text>
      )}
      {data?.comeback && (
        <text
          x={(sourceX + targetX) / 2}
          y={(sourceY + targetY) / 2 + 15}
          textAnchor="middle"
          fontSize="10"
          fill="#999"
          style={{ pointerEvents: 'none' }}
        >
          ← {data.comeback}
        </text>
      )}
    </g>
  );
};

// Node types for React Flow
const nodeTypes = {
  uiScreen: UIScreenNode,
};

const edgeTypes = {
  uiNavigation: UINavigationEdge,
};

// Main Navigation Editor Component
const NavigationEditorContent: React.FC = () => {
  const { treeName } = useParams<{ treeName: string }>();
  const reactFlowInstance = useReactFlow();
  
  // Sample initial nodes for demonstration
  const initialNodes: UINavigationNode[] = [
    {
      id: 'home',
      type: 'uiScreen',
      position: { x: 100, y: 100 },
      data: {
        label: 'Home Screen',
        type: 'screen',
        description: 'Main home screen of the application',
      },
    },
    {
      id: 'menu',
      type: 'uiScreen',
      position: { x: 400, y: 100 },
      data: {
        label: 'Main Menu',
        type: 'screen',
        description: 'Application main menu',
      },
    },
    {
      id: 'settings',
      type: 'uiScreen',
      position: { x: 700, y: 100 },
      data: {
        label: 'Settings',
        type: 'dialog',
        description: 'Settings dialog',
      },
    },
  ];

  const initialEdges: UINavigationEdge[] = [
    {
      id: 'home-to-menu',
      source: 'home',
      target: 'menu',
      type: 'uiNavigation',
      data: {
        go: 'RIGHT',
        comeback: 'LEFT',
        description: 'Navigate between home and menu',
      },
    },
    {
      id: 'menu-to-settings',
      source: 'menu',
      target: 'settings',
      type: 'uiNavigation',
      data: {
        go: 'ENTER',
        comeback: 'BACK',
        description: 'Open settings from menu',
      },
    },
  ];
  
  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  // UI state
  const [selectedNode, setSelectedNode] = useState<UINavigationNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<UINavigationEdge | null>(null);
  const [isNodeDialogOpen, setIsNodeDialogOpen] = useState(false);
  const [isEdgeDialogOpen, setIsEdgeDialogOpen] = useState(false);
  const [isNewNode, setIsNewNode] = useState(false); // Track if this is a newly created node
  const [nodeForm, setNodeForm] = useState({
    label: '',
    type: 'screen' as 'screen' | 'dialog' | 'popup' | 'overlay',
    description: '',
  });
  const [edgeForm, setEdgeForm] = useState({
    go: '',
    comeback: '',
    description: '',
  });

  // Handle clicking on the background/pane to deselect
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  // Close selection panel
  const closeSelectionPanel = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    event.stopPropagation(); // Prevent pane click from firing
    setSelectedNode(node as UINavigationNode);
    setSelectedEdge(null);
  }, []);

  // Handle edge selection
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    event.stopPropagation(); // Prevent pane click from firing
    setSelectedEdge(edge as UINavigationEdge);
    setSelectedNode(null);
  }, []);

  // Handle connection between nodes
  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge: UINavigationEdge = {
        ...params,
        id: `edge-${Date.now()}`,
        type: 'uiNavigation',
        data: { go: '', comeback: '' },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  // Add new node
  const addNewNode = useCallback(() => {
    const newNode: UINavigationNode = {
      id: `node-${Date.now()}`,
      type: 'uiScreen',
      position: { x: Math.random() * 400, y: Math.random() * 400 },
      data: {
        label: 'New Screen',
        type: 'screen',
        description: '',
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setSelectedNode(newNode);
    setNodeForm({
      label: newNode.data.label,
      type: newNode.data.type,
      description: newNode.data.description || '',
    });
    setIsNodeDialogOpen(true);
    setIsNewNode(true);
  }, [setNodes]);

  // Save node changes
  const saveNodeChanges = useCallback(() => {
    if (!selectedNode) return;
    
    // Validate required fields
    if (!nodeForm.label.trim()) {
      return; // Don't save if screen name is empty
    }
    
    setNodes((nds) =>
      nds.map((node) =>
        node.id === selectedNode.id
          ? {
              ...node,
              data: {
                ...node.data,
                label: nodeForm.label,
                type: nodeForm.type,
                description: nodeForm.description,
              },
            }
          : node
      )
    );
    setIsNodeDialogOpen(false);
    setIsNewNode(false);
  }, [selectedNode, nodeForm, setNodes]);

  // Cancel node changes
  const cancelNodeChanges = useCallback(() => {
    if (isNewNode && selectedNode) {
      // Delete the newly created node if canceling
      setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
      setSelectedNode(null);
    }
    setIsNodeDialogOpen(false);
    setIsNewNode(false);
  }, [isNewNode, selectedNode, setNodes]);

  // Save edge changes
  const saveEdgeChanges = useCallback(() => {
    if (!selectedEdge) return;
    
    setEdges((eds) =>
      eds.map((edge) =>
        edge.id === selectedEdge.id
          ? {
              ...edge,
              data: {
                ...edge.data,
                go: edgeForm.go,
                comeback: edgeForm.comeback,
                description: edgeForm.description,
              },
            }
          : edge
      )
    );
    setIsEdgeDialogOpen(false);
  }, [selectedEdge, edgeForm, setEdges]);

  // Delete selected node or edge
  const deleteSelected = useCallback(() => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
      setEdges((eds) => eds.filter((edge) => 
        edge.source !== selectedNode.id && edge.target !== selectedNode.id
      ));
      setSelectedNode(null);
    } else if (selectedEdge) {
      setEdges((eds) => eds.filter((edge) => edge.id !== selectedEdge.id));
      setSelectedEdge(null);
    }
  }, [selectedNode, selectedEdge, setNodes, setEdges]);

  // Fit view
  const fitView = useCallback(() => {
    reactFlowInstance.fitView();
  }, [reactFlowInstance]);

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar variant="dense">
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Navigation Editor: {decodeURIComponent(treeName || '')}
          </Typography>
          
          <Button
            startIcon={<AddIcon />}
            onClick={addNewNode}
            size="small"
            sx={{ mr: 1 }}
          >
            Add Screen
          </Button>
          
          <IconButton onClick={fitView} size="small" title="Fit View">
            <FitScreenIcon />
          </IconButton>
          
          <IconButton size="small" title="Save">
            <SaveIcon />
          </IconButton>
          
          <IconButton 
            onClick={() => window.close()} 
            size="small" 
            title="Close"
          >
            <CloseIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Main Editor Area */}
      <Box sx={{ flex: 1, position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          attributionPosition="bottom-left"
          onPaneClick={onPaneClick}
        >
          <Controls />
          <MiniMap />
          <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          
          {/* Custom arrow marker */}
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

        {/* Selection Info Panel */}
        {(selectedNode || selectedEdge) && (
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
                {/* Header with title and close button on same level */}
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
                      setIsNewNode(false); // This is editing an existing node
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
                {/* Header with title and close button on same level */}
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
            onClick={saveNodeChanges} 
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
            onClick={saveEdgeChanges} 
            variant="contained"
            disabled={!edgeForm.go && !edgeForm.comeback}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// Main component wrapped with ReactFlowProvider
const NavigationEditor: React.FC = () => {
  return (
    <ReactFlowProvider>
      <NavigationEditorContent />
    </ReactFlowProvider>
  );
};

export default NavigationEditor; 