import React, { useState, useCallback, useEffect } from 'react';
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
  Snackbar,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Save as SaveIcon,
  Add as AddIcon,
  FitScreen as FitScreenIcon,
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
  Undo as UndoIcon,
  Redo as RedoIcon,
  Cancel as CancelIcon,
  CloudUpload as CloudUploadIcon,
  CloudDownload as CloudDownloadIcon,
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
  Handle,
  Position,
  ConnectionLineType,
} from 'reactflow';
import 'reactflow/dist/style.css';

// Import navigation service
import { navigationService, NavigationNode, NavigationEdge, NavigationTreeData } from '../src/services/navigationService';

// Types for our navigation tree
interface UINavigationNode extends Node {
  data: {
    label: string;
    type: 'screen' | 'dialog' | 'popup' | 'overlay';
    screenshot?: string;
    thumbnail?: string;
    description?: string;
    hasChildren?: boolean; // Indicates if this node has child trees
    childTreeName?: string; // Name of the child tree to navigate to
    parentTree?: string; // Name of the parent tree
  };
}

interface UINavigationEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
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
      {/* Connection Handles - More visible for sibling navigation */}
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={true}
        style={{
          background: '#1976d2',
          width: 16,
          height: 16,
          border: '3px solid white',
          left: -8,
          borderRadius: '50%',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          opacity: 1,
          visibility: 'visible',
          zIndex: 100,
        }}
      />
      <Handle
        type="source"
        position={Position.Right}
        isConnectable={true}
        style={{
          background: '#1976d2',
          width: 16,
          height: 16,
          border: '3px solid white',
          right: -8,
          borderRadius: '50%',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          opacity: 1,
          visibility: 'visible',
          zIndex: 100,
        }}
      />
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={true}
        style={{
          background: '#1976d2',
          width: 16,
          height: 16,
          border: '3px solid white',
          top: -8,
          borderRadius: '50%',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          opacity: 1,
          visibility: 'visible',
          zIndex: 100,
        }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={true}
        style={{
          background: '#1976d2',
          width: 16,
          height: 16,
          border: '3px solid white',
          bottom: -8,
          borderRadius: '50%',
          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
          opacity: 1,
          visibility: 'visible',
          zIndex: 100,
        }}
      />

      {/* Children indicator */}
      {data.hasChildren && (
        <Box
          sx={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 16,
            height: 16,
            backgroundColor: '#4caf50',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            color: 'white',
            fontWeight: 'bold',
            zIndex: 10,
          }}
        >
          +
        </Box>
      )}

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
          {data.hasChildren && ' • Has Children'}
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
            {data.hasChildren ? 'Double-click to explore' : 'No Screenshot'}
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

const NavigationEditorContent: React.FC = () => {
  const { treeName } = useParams<{ treeName: string }>();
  const reactFlowInstance = useReactFlow();
  
  // Navigation state for breadcrumbs and nested trees
  const [currentTreeName, setCurrentTreeName] = useState<string>(treeName || 'home');
  const [navigationPath, setNavigationPath] = useState<string[]>([treeName || 'home']);
  
  // Function to generate tree data based on current tree level
  const getTreeData = useCallback((treeLevel: string): { nodes: UINavigationNode[], edges: UINavigationEdge[] } => {
    if (treeLevel === 'home' || treeLevel === 'horizon_stb') {
      // Root level - main navigation
      return {
        nodes: [
          {
            id: 'home',
            type: 'uiScreen',
            position: { x: 100, y: 200 },
            data: {
              label: 'Home Screen',
              type: 'screen',
              description: 'Main home screen of the application',
              hasChildren: true,
              childTreeName: 'home_children',
            },
          },
          {
            id: 'menu',
            type: 'uiScreen',
            position: { x: 400, y: 200 },
            data: {
              label: 'Main Menu',
              type: 'screen',
              description: 'Application main menu',
              hasChildren: true,
              childTreeName: 'menu_children',
            },
          },
          {
            id: 'settings',
            type: 'uiScreen',
            position: { x: 700, y: 200 },
            data: {
              label: 'Settings',
              type: 'dialog',
              description: 'Settings dialog',
              hasChildren: false,
            },
          },
        ],
        edges: [
          {
            id: 'home-to-menu',
            source: 'home',
            target: 'menu',
            type: 'smoothstep',
            data: { go: 'RIGHT', comeback: 'LEFT', description: 'Navigate between home and menu' },
          },
          {
            id: 'menu-to-settings',
            source: 'menu',
            target: 'settings',
            type: 'smoothstep',
            data: { go: 'ENTER', comeback: 'BACK', description: 'Open settings from menu' },
          },
        ],
      };
    } else if (treeLevel === 'home_children') {
      // Home children level
      return {
        nodes: [
          {
            id: 'home_child1',
            type: 'uiScreen',
            position: { x: 100, y: 200 },
            data: {
              label: 'Home Widget 1',
              type: 'screen',
              description: 'First home widget',
              hasChildren: false,
            },
          },
          {
            id: 'home_child2',
            type: 'uiScreen',
            position: { x: 400, y: 200 },
            data: {
              label: 'Home Widget 2',
              type: 'screen',
              description: 'Second home widget',
              hasChildren: true,
              childTreeName: 'home_widget2_children',
            },
          },
          {
            id: 'home_child3',
            type: 'uiScreen',
            position: { x: 700, y: 200 },
            data: {
              label: 'Home Widget 3',
              type: 'screen',
              description: 'Third home widget',
              hasChildren: false,
            },
          },
        ],
        edges: [
          {
            id: 'home_child1-to-child2',
            source: 'home_child1',
            target: 'home_child2',
            type: 'smoothstep',
            data: { go: 'RIGHT', comeback: 'LEFT', description: 'Navigate between widgets' },
          },
          {
            id: 'home_child2-to-child3',
            source: 'home_child2',
            target: 'home_child3',
            type: 'smoothstep',
            data: { go: 'RIGHT', comeback: 'LEFT', description: 'Navigate between widgets' },
          },
        ],
      };
    } else if (treeLevel === 'menu_children') {
      // Menu children level
      return {
        nodes: [
          {
            id: 'menu_child1',
            type: 'uiScreen',
            position: { x: 100, y: 200 },
            data: {
              label: 'Menu Option 1',
              type: 'screen',
              description: 'First menu option',
              hasChildren: false,
            },
          },
          {
            id: 'menu_child2',
            type: 'uiScreen',
            position: { x: 400, y: 200 },
            data: {
              label: 'Menu Option 2',
              type: 'screen',
              description: 'Second menu option',
              hasChildren: false,
            },
          },
        ],
        edges: [
          {
            id: 'menu_child1-to-child2',
            source: 'menu_child1',
            target: 'menu_child2',
            type: 'smoothstep',
            data: { go: 'RIGHT', comeback: 'LEFT', description: 'Navigate between options' },
          },
        ],
      };
    } else {
      // Default empty tree for other levels
      return {
        nodes: [
          {
            id: 'placeholder',
            type: 'uiScreen',
            position: { x: 400, y: 200 },
            data: {
              label: 'Empty Tree',
              type: 'screen',
              description: 'This tree level is empty',
              hasChildren: false,
            },
          },
        ],
        edges: [],
      };
    }
  }, []);

  // Initialize tree data based on current level
  const currentTreeData = getTreeData(currentTreeName);
  
  // Sample initial nodes for demonstration
  const initialNodes: UINavigationNode[] = currentTreeData.nodes;
  const initialEdges: UINavigationEdge[] = currentTreeData.edges;
  
  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  // State for history management
  const [history, setHistory] = useState<{ nodes: UINavigationNode[], edges: UINavigationEdge[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [initialState, setInitialState] = useState<{ nodes: UINavigationNode[], edges: UINavigationEdge[] } | null>(null);

  // Update tree data when currentTreeName changes and initialize history
  useEffect(() => {
    const newTreeData = getTreeData(currentTreeName);
    setNodes(newTreeData.nodes);
    setEdges(newTreeData.edges);
    setInitialState({ nodes: newTreeData.nodes, edges: newTreeData.edges });
    setHistory([{ nodes: newTreeData.nodes, edges: newTreeData.edges }]);
    setHistoryIndex(0);
  }, [currentTreeName, getTreeData, setNodes, setEdges]);

  // Function to save current state to history
  const saveStateToHistory = useCallback((newNodes: UINavigationNode[], newEdges: UINavigationEdge[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ nodes: [...newNodes], edges: [...newEdges] });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex, setHistory, setHistoryIndex]);

  // Override onNodesChange to save to history
  const onNodesChangeWithHistory = useCallback((changes: any[]) => {
    onNodesChange(changes);
    setNodes((currentNodes) => {
      const newNodes = [...currentNodes];
      saveStateToHistory(newNodes, edges);
      return newNodes;
    });
  }, [onNodesChange, edges, saveStateToHistory]);

  // Override onEdgesChange to save to history
  const onEdgesChangeWithHistory = useCallback((changes: any[]) => {
    onEdgesChange(changes);
    setEdges((currentEdges) => {
      const newEdges = [...currentEdges];
      saveStateToHistory(nodes, newEdges);
      return newEdges;
    });
  }, [onEdgesChange, nodes, saveStateToHistory]);

  // Override onConnect to save to history
  const onConnectHistory = useCallback((params: Connection) => {
    if (!params.source || !params.target) return;
    console.log('[@component:NavigationEditor] Attempting to connect nodes:', params.source, 'to', params.target);
    
    const newEdge: UINavigationEdge = {
      id: `edge-${Date.now()}`,
      source: params.source,
      target: params.target,
      type: 'smoothstep',
      data: { go: '', comeback: '' },
    };
    setEdges((eds) => {
      const updatedEdges = addEdge(newEdge, eds);
      saveStateToHistory(nodes, updatedEdges);
      return updatedEdges;
    });
  }, [nodes, saveStateToHistory, setEdges]);

  // Undo function
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      setNodes([...history[newIndex].nodes]);
      setEdges([...history[newIndex].edges]);
    }
  }, [history, historyIndex, setNodes, setEdges]);

  // Redo function
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      setNodes([...history[newIndex].nodes]);
      setEdges([...history[newIndex].edges]);
    }
  }, [history, historyIndex, setNodes, setEdges]);

  // Save to database function
  const saveToDatabase = useCallback(() => {
    console.log('[@component:NavigationEditor] Saving to database:', { nodes, edges });
    // Placeholder for actual database save logic
    // Replace with API call or database operation
    alert('Saved to database (simulated). Check console for details.');
  }, [nodes, edges]);

  // Discard changes function
  const discardChanges = useCallback(() => {
    if (initialState) {
      setNodes([...initialState.nodes]);
      setEdges([...initialState.edges]);
      setHistory([{ nodes: initialState.nodes, edges: initialState.edges }]);
      setHistoryIndex(0);
      console.log('[@component:NavigationEditor] Discarded changes, reverted to initial state.');
      alert('Changes discarded. Reverted to initial state.');
    }
  }, [initialState, setNodes, setEdges]);

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

  // Handle double-click on node to navigate to child tree
  const onNodeDoubleClick = useCallback((event: React.MouseEvent, node: Node) => {
    event.stopPropagation();
    const uiNode = node as UINavigationNode;
    
    if (uiNode.data.hasChildren && uiNode.data.childTreeName) {
      // Prevent navigating to the same tree level
      if (currentTreeName === uiNode.data.childTreeName) {
        console.log(`Already at tree level: ${uiNode.data.childTreeName}`);
        return;
      }
      
      // Navigate to child tree
      const newPath = [...navigationPath, uiNode.data.childTreeName];
      setNavigationPath(newPath);
      setCurrentTreeName(uiNode.data.childTreeName);
      
      // Load new tree data
      const newTreeData = getTreeData(uiNode.data.childTreeName);
      setNodes(newTreeData.nodes);
      setEdges(newTreeData.edges);
      
      console.log(`Navigating to child tree: ${uiNode.data.childTreeName}`);
    }
  }, [navigationPath, currentTreeName, getTreeData, setNodes, setEdges]);

  // Navigate back in breadcrumb
  const navigateToTreeLevel = useCallback((index: number) => {
    const newPath = navigationPath.slice(0, index + 1);
    const targetTreeName = newPath[newPath.length - 1];
    
    // Prevent navigating to the same tree level
    if (currentTreeName === targetTreeName) {
      return;
    }
    
    setNavigationPath(newPath);
    setCurrentTreeName(targetTreeName);
    
    // Load tree data for that level
    const newTreeData = getTreeData(targetTreeName);
    setNodes(newTreeData.nodes);
    setEdges(newTreeData.edges);
    
    console.log(`Navigating back to: ${targetTreeName}`);
  }, [navigationPath, currentTreeName, getTreeData, setNodes, setEdges]);

  // Go back to parent tree
  const goBackToParent = useCallback(() => {
    if (navigationPath.length > 1) {
      const newPath = navigationPath.slice(0, -1);
      const targetTreeName = newPath[newPath.length - 1];
      
      setNavigationPath(newPath);
      setCurrentTreeName(targetTreeName);
      
      // Load parent tree data
      const newTreeData = getTreeData(targetTreeName);
      setNodes(newTreeData.nodes);
      setEdges(newTreeData.edges);
      
      console.log(`Going back to parent: ${targetTreeName}`);
    }
  }, [navigationPath, getTreeData, setNodes, setEdges]);

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
          {/* Back button */}
          {navigationPath.length > 1 && (
            <IconButton 
              onClick={goBackToParent} 
              size="small" 
              title="Go Back"
              sx={{ mr: 1 }}
            >
              <ArrowBackIcon />
            </IconButton>
          )}
          
          {/* Breadcrumb navigation */}
          <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
            {navigationPath.map((treeName, index) => (
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
                    fontWeight: index === navigationPath.length - 1 ? 'bold' : 'normal',
                    color: index === navigationPath.length - 1 ? 'primary.main' : 'text.secondary',
                  }}
                >
                  {decodeURIComponent(treeName)}
                </Button>
              </Box>
            ))}
          </Box>
          
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
          
          <IconButton onClick={undo} size="small" title="Undo" disabled={historyIndex <= 0}>
            <UndoIcon />
          </IconButton>
          
          <IconButton onClick={redo} size="small" title="Redo" disabled={historyIndex >= history.length - 1}>
            <RedoIcon />
          </IconButton>
          
          <IconButton onClick={saveToDatabase} size="small" title="Save to Database">
            <SaveIcon />
          </IconButton>
          
          <IconButton onClick={discardChanges} size="small" title="Discard Changes">
            <CancelIcon />
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
          onNodesChange={onNodesChangeWithHistory}
          onEdgesChange={onEdgesChangeWithHistory}
          onConnect={onConnectHistory}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onNodeDoubleClick={onNodeDoubleClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          attributionPosition="bottom-left"
          onPaneClick={onPaneClick}
          connectionLineType={ConnectionLineType.SmoothStep}
          defaultEdgeOptions={{
            type: 'smoothstep',
            animated: false,
            style: { strokeWidth: 2, stroke: '#b1b1b7' },
          }}
          snapToGrid={true}
          snapGrid={[15, 15]}
          deleteKeyCode="Delete"
          multiSelectionKeyCode="Shift"
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

        {/* Selection Info Panel or Help Panel */}
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
        ) : null}
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