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
import { useParams, useNavigate } from 'react-router-dom';
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
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow';
import 'reactflow/dist/style.css';

// Remove the navigationService import - we'll use direct API calls instead
// import { navigationService, NavigationNode, NavigationEdge, NavigationTreeData } from '../src/services/navigationService';

// Define types locally since we're not using the service
interface UINavigationNode extends Node {
  data: {
    label: string;
    type: 'screen' | 'dialog' | 'popup' | 'overlay';
    screenshot?: string;
    thumbnail?: string;
    description?: string;
    hasChildren?: boolean;
    childTreeId?: string;
    childTreeName?: string;
    parentTree?: string;
  };
}

// Use ReactFlow's Edge type directly with our custom data
type UINavigationEdge = Edge<{
  go?: string;
  comeback?: string;
  description?: string;
}>;

interface NavigationTreeData {
  nodes: UINavigationNode[];
  edges: UINavigationEdge[];
}

// API helper functions to call the Python backend
const API_BASE_URL = 'http://localhost:5009';

const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });
  
  if (!response.ok) {
    throw new Error(`API call failed: ${response.status}`);
  }
  
  return response.json();
};

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
  const { treeId, treeName, interfaceId } = useParams<{ treeId: string, treeName: string, interfaceId: string }>();
  const navigate = useNavigate();
  const reactFlowInstance = useReactFlow();
  
  // Navigation state for breadcrumbs and nested trees
  const [currentTreeId, setCurrentTreeId] = useState<string>(treeId || 'home');
  const [currentTreeName, setCurrentTreeName] = useState<string>(treeName || 'home');
  const [navigationPath, setNavigationPath] = useState<string[]>([treeId || 'home']);
  const [navigationNamePath, setNavigationNamePath] = useState<string[]>([treeName || 'home']);
  
  // Add state for save operation
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);
  
  // State for user interface and root tree
  const [userInterface, setUserInterface] = useState<any>(null);
  const [rootTree, setRootTree] = useState<any>(null);
  const [isLoadingInterface, setIsLoadingInterface] = useState<boolean>(!!interfaceId);
  
  // Fetch user interface and root tree if interfaceId is provided
  useEffect(() => {
    const fetchUserInterface = async () => {
      if (interfaceId) {
        setIsLoadingInterface(true);
        try {
          console.log(`[@component:NavigationEditor] Fetching user interface: ${interfaceId}`);
          const response = await apiCall(`/api/navigation/userinterfaces/${interfaceId}`);
          if (response.userinterface) {
            setUserInterface(response.userinterface);
            if (response.root_navigation_tree) {
              setRootTree(response.root_navigation_tree);
              setCurrentTreeId(response.root_navigation_tree.id);
              setCurrentTreeName(response.root_navigation_tree.name);
              setNavigationPath([response.root_navigation_tree.id]);
              setNavigationNamePath([response.root_navigation_tree.name]);
              // Update URL to reflect both ID and name of the root tree
              navigate(`/navigation-editor/${response.root_navigation_tree.name}/${response.root_navigation_tree.id}`);
            }
          } else {
            console.error(`[@component:NavigationEditor] Failed to fetch user interface: ${interfaceId}`);
          }
        } catch (error) {
          console.error(`[@component:NavigationEditor] Error fetching user interface:`, error);
        } finally {
          setIsLoadingInterface(false);
        }
      }
    };
    fetchUserInterface();
  }, [interfaceId, navigate]);
  
  // Show message if tree ID is missing
  useEffect(() => {
    if (!treeId && !interfaceId) {
      console.log('[@component:NavigationEditor] Missing tree ID in URL');
    }
  }, [treeId, interfaceId]);
  
  // Create an empty tree structure
  const createEmptyTree = useCallback((): { nodes: UINavigationNode[], edges: UINavigationEdge[] } => {
    return {
      nodes: [],
      edges: []
    };
  }, []);

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // State for history management
  const [history, setHistory] = useState<{ nodes: UINavigationNode[], edges: UINavigationEdge[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [initialState, setInitialState] = useState<{ nodes: UINavigationNode[], edges: UINavigationEdge[] } | null>(null);

  // Initialize tree data when component mounts
  useEffect(() => {
    loadFromDatabase(currentTreeId);
  }, [currentTreeId]);

  // Function to save current state to history
  const saveStateToHistory = useCallback((newNodes: UINavigationNode[], newEdges: UINavigationEdge[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ nodes: [...newNodes], edges: [...newEdges] });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex, setHistory, setHistoryIndex]);

  // Override onNodesChange to save to history and track changes
  const onNodesChangeWithHistory = useCallback((changes: any[]) => {
    onNodesChange(changes);
    setNodes((currentNodes) => {
      const newNodes = [...currentNodes];
      saveStateToHistory(newNodes, edges);
      setHasUnsavedChanges(true);
      return newNodes;
    });
  }, [onNodesChange, edges, saveStateToHistory]);

  // Override onEdgesChange to save to history and track changes
  const onEdgesChangeWithHistory = useCallback((changes: any[]) => {
    onEdgesChange(changes);
    setEdges((currentEdges) => {
      const newEdges = [...currentEdges];
      saveStateToHistory(nodes, newEdges);
      setHasUnsavedChanges(true);
      return newEdges;
    });
  }, [onEdgesChange, nodes, saveStateToHistory]);

  // Override onConnect to save to history and track changes
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
      setHasUnsavedChanges(true);
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

  // Load from database function
  const loadFromDatabase = useCallback(async (treeId: string) => {
    try {
      console.log(`[@component:NavigationEditor] Loading tree from database: ${treeId}`);
      
      // Call the Python backend API to get tree by ID
      const response = await apiCall(`/api/navigation/trees/${treeId}`);
      
      if (response.success && response.data) {
        const treeData = response.data.metadata || { nodes: [], edges: [] };
        const actualTreeName = response.data.name || treeName || 'Unnamed Tree';
        
        // Update the URL if the name in the database is different
        if (treeName !== actualTreeName) {
          navigate(`/navigation-editor/${encodeURIComponent(actualTreeName)}/${treeId}`);
          setCurrentTreeName(actualTreeName);
          setNavigationNamePath(prev => {
            const newPath = [...prev];
            newPath[newPath.length - 1] = actualTreeName;
            return newPath;
          });
        } else {
          setCurrentTreeName(actualTreeName);
        }
        
        // Validate that we have nodes and edges
        if (treeData.nodes && Array.isArray(treeData.nodes)) {
          setNodes(treeData.nodes);
          setInitialState({ nodes: treeData.nodes, edges: treeData.edges || [] });
          console.log(`[@component:NavigationEditor] Successfully loaded ${treeData.nodes.length} nodes from database for tree ID: ${treeId}`);
        }
        
        if (treeData.edges && Array.isArray(treeData.edges)) {
          setEdges(treeData.edges);
          console.log(`[@component:NavigationEditor] Successfully loaded ${treeData.edges.length} edges from database for tree ID: ${treeId}`);
        }
        
        // Initialize history with loaded data
        setHistory([{ nodes: treeData.nodes || [], edges: treeData.edges || [] }]);
        setHistoryIndex(0);
        setHasUnsavedChanges(false);
        setSaveError(null);
        setSaveSuccess(false);
      } else {
        // Tree doesn't exist, create a new one
        console.log(`[@component:NavigationEditor] Tree ${treeId} not found, creating a new one...`);
        
        // Prepare the tree data for creation
        const newTreeData = {
          name: treeName || treeId, // Use the name from URL if available
          description: `Navigation tree for ${treeId}`,
          tree_data: {
            nodes: [],
            edges: []
          }
        };
        
        // Create the new tree
        try {
          const createResponse = await apiCall('/api/navigation/trees', {
            method: 'POST',
            body: JSON.stringify(newTreeData),
          });
          
          if (createResponse.success) {
            console.log(`[@component:NavigationEditor] Successfully created new tree with ID: ${createResponse.data.id}`);
            
            // Update URL with the new ID if it's different
            if (treeId !== createResponse.data.id) {
              navigate(`/navigation-editor/${encodeURIComponent(treeName || createResponse.data.name || 'Unnamed Tree')}/${createResponse.data.id}`);
              setCurrentTreeId(createResponse.data.id);
              setNavigationPath([createResponse.data.id]);
            }
            
            // Start with empty tree
            const emptyState = createEmptyTree();
            setNodes(emptyState.nodes);
            setEdges(emptyState.edges);
            setInitialState(emptyState);
            setHistory([emptyState]);
            setHistoryIndex(0);
            setHasUnsavedChanges(false);
          } else {
            throw new Error(`Failed to create tree: ${createResponse.error}`);
          }
        } catch (createError) {
          console.error(`[@component:NavigationEditor] Error creating tree:`, createError);
          // Start with empty tree but mark as unsaved
          const emptyState = createEmptyTree();
          setNodes(emptyState.nodes);
          setEdges(emptyState.edges);
          setInitialState(emptyState);
          setHistory([emptyState]);
          setHistoryIndex(0);
          setHasUnsavedChanges(true); // Mark as unsaved so user knows they need to save
          setSaveError(`Failed to create tree: ${createError instanceof Error ? createError.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error(`[@component:NavigationEditor] Error loading tree from database:`, error);
      // On error, start with empty tree
      const emptyState = createEmptyTree();
      setNodes(emptyState.nodes);
      setEdges(emptyState.edges);
      setInitialState(emptyState);
      setHistory([emptyState]);
      setHistoryIndex(0);
      setHasUnsavedChanges(false);
    }
  }, [setNodes, setEdges, createEmptyTree, treeId, treeName, navigate]);

  // Convert tree data for export/import (keeping existing format)
  const convertToNavigationTreeData = (nodes: UINavigationNode[], edges: UINavigationEdge[]): NavigationTreeData => {
    return {
      nodes: nodes.map(node => ({
        id: node.id,
        type: 'uiScreen',
        position: node.position,
        data: node.data,
      })) as UINavigationNode[],
      edges: edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: edge.type,
        data: edge.data,
      })) as UINavigationEdge[],
    };
  };

  const convertFromNavigationTreeData = (treeData: NavigationTreeData): { nodes: UINavigationNode[], edges: UINavigationEdge[] } => {
    return {
      nodes: treeData.nodes || [],
      edges: treeData.edges || [],
    };
  };

  // Discard changes function with confirmation
  const discardChanges = useCallback(() => {
    if (hasUnsavedChanges) {
      setIsDiscardDialogOpen(true);
    } else {
      performDiscardChanges();
    }
  }, [hasUnsavedChanges]);

  // Save to database function
  const saveToDatabase = useCallback(async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    
    try {
      console.log(`[@component:NavigationEditor] Starting save to database for tree: ${currentTreeId}`);
      
      // First, check if we already have this tree in the database
      const checkResponse = await apiCall(`/api/navigation/trees/${currentTreeId}`);
      
      if (checkResponse.success && checkResponse.data) {
        // Tree exists, update it
        const treeId = checkResponse.data.id;
        console.log(`[@component:NavigationEditor] Updating existing tree with ID: ${treeId}`);
        
        // Prepare the update data
        const updateData = {
          tree_data: {
            nodes: nodes,
            edges: edges
          }
        };
        
        // Update the tree
        const updateResponse = await apiCall(`/api/navigation/trees/${treeId}`, {
          method: 'PUT',
          body: JSON.stringify(updateData),
        });
        
        if (updateResponse.success) {
          console.log(`[@component:NavigationEditor] Successfully updated tree ID: ${treeId}`);
          setInitialState({ nodes: [...nodes], edges: [...edges] });
          setHasUnsavedChanges(false);
          setSaveSuccess(true);
          
          // Clear success message after 3 seconds
          setTimeout(() => setSaveSuccess(false), 3000);
        } else {
          throw new Error(updateResponse.error || 'Failed to update navigation tree');
        }
      } else {
        // Tree doesn't exist, create a new one
        console.log(`[@component:NavigationEditor] Creating new tree with ID: ${currentTreeId}`);
        
        // Prepare the tree data in the format expected by the backend
        const treeData = {
          name: currentTreeName || currentTreeId, // Use the name from state
          description: `Navigation tree for ${currentTreeId}`,
          tree_data: {
            nodes: nodes,
            edges: edges
          }
        };
        
        // Call the Python backend API to create a new tree
        const createResponse = await apiCall('/api/navigation/trees', {
          method: 'POST',
          body: JSON.stringify(treeData),
        });
        
        if (createResponse.success) {
          console.log(`[@component:NavigationEditor] Successfully created new tree with ID: ${createResponse.data.id}`);
          setInitialState({ nodes: [...nodes], edges: [...edges] });
          setHasUnsavedChanges(false);
          setSaveSuccess(true);
          navigate(`/navigation-editor/${encodeURIComponent(currentTreeName || createResponse.data.name || 'Unnamed Tree')}/${createResponse.data.id}`);
          setCurrentTreeId(createResponse.data.id);
          setNavigationPath([createResponse.data.id]);
          
          // Clear success message after 3 seconds
          setTimeout(() => setSaveSuccess(false), 3000);
        } else {
          throw new Error(createResponse.error || 'Failed to create navigation tree');
        }
      }
    } catch (error) {
      console.error(`[@component:NavigationEditor] Error saving tree:`, error);
      setSaveError(error instanceof Error ? error.message : 'Failed to save navigation tree');
    } finally {
      setIsSaving(false);
    }
  }, [currentTreeId, currentTreeName, nodes, edges, isSaving, navigate]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+S or Cmd+S to save
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        if (!isSaving) {
          saveToDatabase();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [saveToDatabase, isSaving]);

  // Actually perform the discard operation
  const performDiscardChanges = useCallback(() => {
    if (initialState) {
      setNodes([...initialState.nodes]);
      setEdges([...initialState.edges]);
      setHistory([{ nodes: initialState.nodes, edges: initialState.edges }]);
      setHistoryIndex(0);
      setHasUnsavedChanges(false);
      setSaveError(null);
      setSaveSuccess(false);
      setIsDiscardDialogOpen(false);
      console.log('[@component:NavigationEditor] Discarded changes, reverted to initial state.');
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
    
    if (uiNode.data.hasChildren && uiNode.data.childTreeId) {
      // Prevent navigating to the same tree level
      if (currentTreeId === uiNode.data.childTreeId) {
        console.log(`[@component:NavigationEditor] Already at tree level: ${uiNode.data.childTreeId}`);
        return;
      }
      
      // Navigate to child tree
      const newPath = [...navigationPath, uiNode.data.childTreeId];
      const newNamePath = [...navigationNamePath, uiNode.data.childTreeName || uiNode.data.label];
      setNavigationPath(newPath);
      setNavigationNamePath(newNamePath);
      setCurrentTreeId(uiNode.data.childTreeId);
      setCurrentTreeName(uiNode.data.childTreeName || uiNode.data.label);
      navigate(`/navigation-editor/${encodeURIComponent(uiNode.data.childTreeName || uiNode.data.label)}/${uiNode.data.childTreeId}`);
      
      // Load child tree data from database
      loadFromDatabase(uiNode.data.childTreeId);
      
      console.log(`[@component:NavigationEditor] Navigating to child tree: ${uiNode.data.childTreeId}`);
    }
  }, [navigationPath, navigationNamePath, currentTreeId, loadFromDatabase, navigate]);

  // Navigate back in breadcrumb
  const navigateToTreeLevel = useCallback((index: number) => {
    const newPath = navigationPath.slice(0, index + 1);
    const newNamePath = navigationNamePath.slice(0, index + 1);
    const targetTreeId = newPath[newPath.length - 1];
    const targetTreeName = newNamePath[newNamePath.length - 1];
    
    // Prevent navigating to the same tree level
    if (currentTreeId === targetTreeId) {
      return;
    }
    
    setNavigationPath(newPath);
    setNavigationNamePath(newNamePath);
    setCurrentTreeId(targetTreeId);
    setCurrentTreeName(targetTreeName);
    navigate(`/navigation-editor/${encodeURIComponent(targetTreeName)}/${targetTreeId}`);
    
    // Load tree data for that level from database
    loadFromDatabase(targetTreeId);
    
    console.log(`[@component:NavigationEditor] Navigating back to: ${targetTreeId}`);
  }, [navigationPath, navigationNamePath, currentTreeId, loadFromDatabase, navigate]);

  // Go back to parent tree
  const goBackToParent = useCallback(() => {
    if (navigationPath.length > 1) {
      const newPath = navigationPath.slice(0, -1);
      const newNamePath = navigationNamePath.slice(0, -1);
      const targetTreeId = newPath[newPath.length - 1];
      const targetTreeName = newNamePath[newNamePath.length - 1];
      
      setNavigationPath(newPath);
      setNavigationNamePath(newNamePath);
      setCurrentTreeId(targetTreeId);
      setCurrentTreeName(targetTreeName);
      navigate(`/navigation-editor/${encodeURIComponent(targetTreeName)}/${targetTreeId}`);
      
      // Load parent tree data from database
      loadFromDatabase(targetTreeId);
      
      console.log(`[@component:NavigationEditor] Going back to parent: ${targetTreeId}`);
    }
  }, [navigationPath, navigationNamePath, loadFromDatabase, navigate]);

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

  // Save node changes with change tracking
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
    setHasUnsavedChanges(true);
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

  // Save edge changes with change tracking
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
    setHasUnsavedChanges(true);
    setIsEdgeDialogOpen(false);
  }, [selectedEdge, edgeForm, setEdges]);

  // Delete selected node or edge with change tracking
  const deleteSelected = useCallback(() => {
    if (selectedNode) {
      setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
      setEdges((eds) => eds.filter((edge) => 
        edge.source !== selectedNode.id && edge.target !== selectedNode.id
      ));
      setSelectedNode(null);
      setHasUnsavedChanges(true);
    } else if (selectedEdge) {
      setEdges((eds) => eds.filter((edge) => edge.id !== selectedEdge.id));
      setSelectedEdge(null);
      setHasUnsavedChanges(true);
    }
  }, [selectedNode, selectedEdge, setNodes, setEdges]);

  // Fit view
  const fitView = useCallback(() => {
    reactFlowInstance.fitView();
  }, [reactFlowInstance]);

  if (!treeId && !interfaceId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">No Navigation Tree Selected</h2>
          <p className="text-gray-600 mb-6">Please select a navigation tree to edit from the dashboard.</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }
  
  if (isLoadingInterface) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Loading Navigation Data...</h2>
          <p className="text-gray-600">Please wait while we fetch the navigation tree for this user interface.</p>
        </div>
      </div>
    );
  }

  return (
    <Box sx={{ 
      height: 'calc(100vh - 100px)', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
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
                    fontWeight: index === navigationPath.length - 1 ? 'bold' : 'normal',
                    color: index === navigationPath.length - 1 ? 'primary.main' : 'text.secondary',
                  }}
                >
                  {decodeURIComponent(treeName)}
                  {index === navigationPath.length - 1 && hasUnsavedChanges && (
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
          
          <IconButton 
            onClick={saveToDatabase} 
            size="small" 
            title={hasUnsavedChanges ? "Save Changes to Database" : "Save to Database"}
            disabled={isSaving}
            color={hasUnsavedChanges ? "primary" : "default"}
          >
            {isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
          </IconButton>
          
          <IconButton 
            onClick={discardChanges} 
            size="small" 
            title={hasUnsavedChanges ? "Discard Unsaved Changes" : "Discard Changes"}
            color={hasUnsavedChanges ? "warning" : "default"}
          >
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
      <Box sx={{ 
        flex: 1, 
        position: 'relative', 
        height: 'calc(100vh - 180px)',
        overflow: 'hidden'
      }}>
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
          style={{ height: '100%', overflow: 'hidden' }}
        >
          <Controls position="bottom-left" showZoom={true} showFitView={true} showInteractive={false}  />
          <MiniMap style={{ bottom: 10 }} />
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

      {/* Snackbar for save success */}
      <Snackbar
        open={saveSuccess}
        autoHideDuration={3000}
        onClose={() => setSaveSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSaveSuccess(false)} severity="success" sx={{ width: '100%' }}>
          Navigation tree saved successfully!
        </Alert>
      </Snackbar>

      {/* Snackbar for save error */}
      <Snackbar
        open={!!saveError}
        autoHideDuration={6000}
        onClose={() => setSaveError(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSaveError(null)} severity="error" sx={{ width: '100%' }}>
          Error saving tree: {saveError}
        </Alert>
      </Snackbar>
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