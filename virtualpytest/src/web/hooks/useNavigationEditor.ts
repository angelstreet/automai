import { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  useNodesState, 
  useEdgesState, 
  addEdge, 
  Connection, 
  Edge, 
  ReactFlowInstance,
  MarkerType,
  useReactFlow
} from 'reactflow';
import { UINavigationNode, UINavigationEdge, NavigationTreeData, NodeForm, EdgeForm } from '../types/navigationTypes';

// API helper functions to call the Python backend
const API_BASE_URL = 'http://localhost:5009';
const DEFAULT_TEAM_ID = "7fdeb4bb-3639-4ec3-959f-b54769a219ce";  // Match the server-side default

const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  // Get team_id from localStorage or other state management, or use default
  const teamId = localStorage.getItem('teamId') || sessionStorage.getItem('teamId') || DEFAULT_TEAM_ID;
  
  console.log(`[@hook:useNavigationEditor:apiCall] Making API call to ${endpoint} with team_id: ${teamId}`);
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      // Include team_id in header to ensure proper RLS permissions
      'X-Team-ID': teamId,
      ...options.headers,
    },
    ...options,
  });
  
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error(`[@hook:useNavigationEditor:apiCall] API call failed: ${response.status} - ${errorText}`);
    throw new Error(`API call failed: ${response.status}`);
  }
  
  return response.json();
};

export const useNavigationEditor = () => {
  const navigate = useNavigate();
  const { treeId, treeName, interfaceId } = useParams<{ treeId: string, treeName: string, interfaceId: string }>();
  
  // Initialize teamId in localStorage if not already set
  useEffect(() => {
    if (!localStorage.getItem('teamId') && !sessionStorage.getItem('teamId')) {
      console.log(`[@hook:useNavigationEditor] Setting default team_id in localStorage: ${DEFAULT_TEAM_ID}`);
      localStorage.setItem('teamId', DEFAULT_TEAM_ID);
    }
  }, []);
  
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
  
  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // State for history management
  const [history, setHistory] = useState<{ nodes: UINavigationNode[], edges: UINavigationEdge[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [initialState, setInitialState] = useState<{ nodes: UINavigationNode[], edges: UINavigationEdge[] } | null>(null);

  // View state for single-level navigation
  const [allNodes, setAllNodes] = useState<UINavigationNode[]>([]);
  const [allEdges, setAllEdges] = useState<UINavigationEdge[]>([]);
  const [currentViewRootId, setCurrentViewRootId] = useState<string | null>(null);
  const [viewPath, setViewPath] = useState<{id: string, name: string}[]>([]);

  // UI state
  const [selectedNode, setSelectedNode] = useState<UINavigationNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<UINavigationEdge | null>(null);
  const [isNodeDialogOpen, setIsNodeDialogOpen] = useState(false);
  const [isEdgeDialogOpen, setIsEdgeDialogOpen] = useState(false);
  const [isNewNode, setIsNewNode] = useState(false); // Track if this is a newly created node
  const [nodeForm, setNodeForm] = useState<NodeForm>({
    label: '',
    type: 'screen',
    description: ''
  });
  const [edgeForm, setEdgeForm] = useState<EdgeForm>({
    action: '',
    description: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
  
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

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

  // Function to save current state to history
  const saveToHistory = useCallback(() => {
    const newState = { nodes: [...nodes], edges: [...edges] };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [nodes, edges, history, historyIndex]);

  // Override onNodesChange to save to history and track changes
  const onNodesChangeWithHistory = useCallback((changes: any[]) => {
    onNodesChange(changes);
    setNodes((currentNodes) => {
      const newNodes = [...currentNodes];
      saveToHistory();
      setHasUnsavedChanges(true);
      return newNodes;
    });
  }, [onNodesChange, saveToHistory]);

  // Override onEdgesChange to save to history and track changes
  const onEdgesChangeWithHistory = useCallback((changes: any[]) => {
    onEdgesChange(changes);
    setEdges((currentEdges) => {
      const newEdges = [...currentEdges];
      saveToHistory();
      setHasUnsavedChanges(true);
      return newEdges;
    });
  }, [onEdgesChange, saveToHistory]);

  // Override onConnect to save to history and track changes
  const onConnectHistory = useCallback((params: Connection) => {
    if (!params.source || !params.target) return;
    console.log('[@component:NavigationEditor] Attempting to connect nodes:', params.source, 'to', params.target);
    console.log('[@component:NavigationEditor] Connection details:', {
      source: params.source,
      target: params.target,
      sourceHandle: params.sourceHandle,
      targetHandle: params.targetHandle
    });
    
    // Determine edge type based on handles (top = blue, bottom = red)
    const isTopConnection = params.sourceHandle?.includes('top') || params.targetHandle?.includes('top');
    const isBottomConnection = params.sourceHandle?.includes('bottom') || params.targetHandle?.includes('bottom');
    const edgeType = isTopConnection ? 'top' : isBottomConnection ? 'bottom' : 'default';
    
    const newEdge: UINavigationEdge = {
      id: `edge-${Date.now()}`,
      source: params.source,
      target: params.target,
      sourceHandle: params.sourceHandle,
      targetHandle: params.targetHandle,
      type: 'uiNavigation',
      data: { 
        action: 'ACTION',  // Default action, user can edit
        edgeType: edgeType  // Add edge type for coloring
      },
    };
    
    console.log('[@component:NavigationEditor] Created edge:', newEdge);
    
    setEdges((eds) => {
      const updatedEdges = addEdge(newEdge, eds);
      saveToHistory();
      setHasUnsavedChanges(true);
      return updatedEdges;
    });
  }, [saveToHistory, setEdges]);

  // Undo function
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1];
      setNodes([...previousState.nodes]);
      setEdges([...previousState.edges]);
      setHistoryIndex(historyIndex - 1);
      setHasUnsavedChanges(true);
    }
  }, [history, historyIndex, setNodes, setEdges]);

  // Redo function
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setNodes([...nextState.nodes]);
      setEdges([...nextState.edges]);
      setHistoryIndex(historyIndex + 1);
      setHasUnsavedChanges(true);
    }
  }, [history, historyIndex, setNodes, setEdges]);

  // Create an empty tree structure
  const createEmptyTree = useCallback((): { nodes: UINavigationNode[], edges: UINavigationEdge[] } => {
    console.log('[@hook:useNavigationEditor] Creating empty tree structure');
    
    const entryNode: UINavigationNode = {
      id: 'entry-node',
      type: 'uiScreen',
      position: { x: 250, y: 100 },
      data: {
        label: 'Entry Point',
        type: 'screen',
        description: 'Starting point of the navigation flow'
      }
    };

    return {
      nodes: [entryNode],
      edges: []
    };
  }, []);

  // Load tree from database
  const loadFromDatabase = useCallback(async () => {
    try {
      console.log(`[@component:NavigationEditor] Loading complete tree from database: ${currentTreeId}`);
      setIsLoading(true);
      setError(null);
      
      // Call the Python backend API to get complete tree with nodes and edges
      const response = await apiCall(`/api/navigation/trees/${currentTreeId}/complete`);
      
      if (response.success && (response.tree_info || response.tree_data)) {
        const treeInfo = response.tree_info || {};
        const treeData = response.tree_data || { nodes: [], edges: [] };
        const actualTreeName = treeInfo.name || currentTreeName || 'Unnamed Tree';
        
        console.log(`[@component:NavigationEditor] Loaded tree with ${treeData.nodes?.length || 0} nodes and ${treeData.edges?.length || 0} edges from database`);
        
        // Update the URL if the name in the database is different
        if (currentTreeName !== actualTreeName) {
          navigate(`/navigation-editor/${encodeURIComponent(actualTreeName)}/${currentTreeId}`);
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
          setAllNodes(treeData.nodes);  // Store all nodes
          setInitialState({ nodes: treeData.nodes, edges: treeData.edges || [] });
          console.log(`[@component:NavigationEditor] Successfully loaded ${treeData.nodes.length} nodes from database for tree ID: ${currentTreeId}`);
          
          // Initialize view state - find root node (no parent) or use first node
          const rootNode = treeData.nodes.find((n: UINavigationNode) => !n.data.parentNodeId) || treeData.nodes[0];
          if (rootNode) {
            setCurrentViewRootId(rootNode.id);
            setViewPath([{ id: rootNode.id, name: rootNode.data.label }]);
          }
        } else {
          // If no nodes, just set empty arrays
          setNodes([]);
          setAllNodes([]);
          setInitialState({ nodes: [], edges: [] });
          setCurrentViewRootId(null);
          setViewPath([]);
          console.log(`[@component:NavigationEditor] No nodes found for tree ID: ${currentTreeId}`);
        }
        
        if (treeData.edges && Array.isArray(treeData.edges)) {
          setEdges(treeData.edges);
          setAllEdges(treeData.edges);  // Store all edges
          console.log(`[@component:NavigationEditor] Successfully loaded ${treeData.edges.length} edges from database for tree ID: ${currentTreeId}`);
        } else {
          // If no edges, just set empty array
          setEdges([]);
          setAllEdges([]);
          console.log(`[@component:NavigationEditor] No edges found for tree ID: ${currentTreeId}`);
        }
        
        // Initialize history with loaded data
        setHistory([{ nodes: treeData.nodes || [], edges: treeData.edges || [] }]);
        setHistoryIndex(0);
        setHasUnsavedChanges(false);
        setSaveError(null);
        setSaveSuccess(false);
      } else {
        // Tree doesn't exist, display error
        console.error(`[@component:NavigationEditor] Tree ${currentTreeId} not found in database`);
        setError(`Tree with ID ${currentTreeId} not found in database. Please select a valid tree.`);
        setNodes([]);
        setEdges([]);
        setInitialState(null);
        setHistory([]);
        setHistoryIndex(-1);
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error(`[@component:NavigationEditor] Error loading tree from database:`, error);
      setError(`Failed to load tree: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setNodes([]);
      setEdges([]);
      setInitialState(null);
      setHistory([]);
      setHistoryIndex(-1);
      setHasUnsavedChanges(false);
    } finally {
      setIsLoading(false);
    }
  }, [setNodes, setEdges, currentTreeId, currentTreeName, navigate, setError]);

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

  // Save to database function
  const saveToDatabase = useCallback(async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    
    try {
      console.log(`[@component:NavigationEditor] Starting save to database for tree: ${currentTreeId}`);
      
      // First, check if we already have this tree in the database
      const checkResponse = await apiCall(`/api/navigation/trees/${currentTreeId}/complete`);
      
      if (checkResponse.success && (checkResponse.tree_info || checkResponse.tree_data)) {
        // Tree exists, update it using the complete endpoint
        console.log(`[@component:NavigationEditor] Updating existing tree with ID: ${currentTreeId}`);
        
        // Prepare the update data
        const updateData = {
          tree_data: {
            nodes: nodes,
            edges: edges
          }
        };
        
        // Update the tree using the complete endpoint
        const updateResponse = await apiCall(`/api/navigation/trees/${currentTreeId}/complete`, {
          method: 'PUT',
          body: JSON.stringify(updateData),
        });
        
        if (updateResponse.success) {
          console.log(`[@component:NavigationEditor] Successfully updated complete tree ID: ${currentTreeId}`);
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
  const onNodeClick = useCallback((event: React.MouseEvent, node: UINavigationNode) => {
    event.stopPropagation(); // Prevent pane click from firing
    setSelectedNode(node as UINavigationNode);
    setSelectedEdge(null);
  }, []);

  // Handle edge selection
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: UINavigationEdge) => {
    event.stopPropagation(); // Prevent pane click from firing
    setSelectedEdge(edge as UINavigationEdge);
    setSelectedNode(null);
  }, []);

  // Handle double-click on node to navigate to child view
  const navigateToChildView = useCallback((nodeId: string) => {
    const node = allNodes.find(n => n.id === nodeId);
    if (!node || !node.data.hasChildren) return;
    
    setCurrentViewRootId(nodeId);
    setViewPath(prev => [...prev, { id: nodeId, name: node.data.label }]);
    console.log(`[@hook:useNavigationEditor] Navigated to child view: ${node.data.label}`);
  }, [allNodes]);

  // Handle double-click on node (updated for single-level navigation)
  const onNodeDoubleClickUpdated = useCallback((event: React.MouseEvent, node: UINavigationNode) => {
    event.stopPropagation();
    const uiNode = node as UINavigationNode;
    
    // Use new single-level navigation
    if (uiNode.data.hasChildren) {
      navigateToChildView(uiNode.id);
    }
  }, [navigateToChildView]);

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
    loadFromDatabase();
    
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
      loadFromDatabase();
      
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
                action: edgeForm.action,
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
    reactFlowInstance?.fitView();
  }, [reactFlowInstance]);

  // Navigate back to parent
  const navigateToParent = useCallback(() => {
    console.log('[@hook:useNavigationEditor] Navigating back to navigation trees list');
    navigate('/navigation-trees');
  }, [navigate]);

  // Default edge options
  const defaultEdgeOptions = {
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#b1b1b7' },
  };

  // Get current view filtered nodes (show all nodes)
  const getCurrentViewNodes = useCallback(() => {
    return allNodes;
  }, [allNodes]);

  // Get current view filtered edges (only between visible nodes)
  const getCurrentViewEdges = useCallback(() => {
    const visibleNodes = getCurrentViewNodes();
    const visibleNodeIds = visibleNodes.map(n => n.id);
    
    return allEdges.filter(e => 
      visibleNodeIds.includes(e.source) && visibleNodeIds.includes(e.target)
    );
  }, [allEdges, getCurrentViewNodes]);

  // Navigate to parent view (breadcrumb click)
  const navigateToParentView = useCallback((targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= viewPath.length) return;
    
    const targetView = viewPath[targetIndex];
    setCurrentViewRootId(targetView.id);
    setViewPath(prev => prev.slice(0, targetIndex + 1));
    console.log(`[@hook:useNavigationEditor] Navigated to parent view: ${targetView.name}`);
  }, [viewPath]);

  // Add child node function
  const addChildNode = useCallback((parentId: string, childData: { label: string, type: any, description: string }, toAction: string, fromAction: string) => {
    const parentNode = allNodes.find(n => n.id === parentId);
    if (!parentNode) return;
    
    // Create child node
    const childId = `node-${Date.now()}`;
    const childNode: UINavigationNode = {
      id: childId,
      type: 'uiScreen',
      position: { 
        x: parentNode.position.x + (allNodes.filter(n => n.data.parentNodeId === parentId).length * 250),
        y: parentNode.position.y + 200 
      },
      data: {
        ...childData,
        parentNodeId: parentId,
        hasChildren: false
      }
    };
    
    // Create edges
    const toEdge: UINavigationEdge = {
      id: `edge-${Date.now()}-to`,
      source: parentId,
      target: childId,
      type: 'uiNavigation',  // Use the type that has arrow support
      data: { 
        action: toAction,
        from: parentNode.data.label,
        to: childData.label
      }
    };
    
    const fromEdge: UINavigationEdge = {
      id: `edge-${Date.now()}-from`,
      source: childId,
      target: parentId,
      type: 'uiNavigation',  // Use the type that has arrow support
      data: { 
        action: fromAction,
        from: childData.label,
        to: parentNode.data.label
      }
    };
    
    // Update state
    setAllNodes(prev => {
      const updated = prev.map(n => 
        n.id === parentId ? { ...n, data: { ...n.data, hasChildren: true } } : n
      );
      return [...updated, childNode];
    });
    
    setAllEdges(prev => [...prev, toEdge, fromEdge]);
    setHasUnsavedChanges(true);
    
    console.log(`[@hook:useNavigationEditor] Added child node: ${childData.label} to parent: ${parentNode.data.label}`);
  }, [allNodes]);

  // Update the ReactFlow nodes and edges based on current view
  useEffect(() => {
    const viewNodes = getCurrentViewNodes();
    const viewEdges = getCurrentViewEdges();
    setNodes(viewNodes);
    setEdges(viewEdges);
  }, [allNodes, allEdges, currentViewRootId, getCurrentViewNodes, getCurrentViewEdges, setNodes, setEdges]);

  return {
    // State
    nodes,
    edges,
    treeName: currentTreeName,
    isLoadingInterface,
    selectedNode,
    selectedEdge,
    isNodeDialogOpen,
    isEdgeDialogOpen,
    nodeForm,
    edgeForm,
    isLoading: isSaving,
    error: saveError,
    success: saveSuccess ? 'Navigation tree saved successfully!' : null,
    pendingConnection,
    reactFlowWrapper,
    reactFlowInstance,
    treeId: currentTreeId,
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
    allNodes,
    allEdges,
    currentViewRootId,
    viewPath,
    
    // Setters
    setNodes,
    setEdges,
    setTreeName: setCurrentTreeName,
    setIsLoadingInterface,
    setSelectedNode,
    setSelectedEdge,
    setIsNodeDialogOpen,
    setIsEdgeDialogOpen,
    setNodeForm,
    setEdgeForm,
    setIsLoading: setIsSaving,
    setError: setSaveError,
    setSuccess: setSaveSuccess,
    setPendingConnection,
    setReactFlowInstance,
    setIsDiscardDialogOpen,
    
    // Event handlers
    onNodesChange: onNodesChangeWithHistory,
    onEdgesChange: onEdgesChangeWithHistory,
    onConnect: onConnectHistory,
    onNodeClick,
    onEdgeClick,
    onNodeDoubleClick: onNodeDoubleClickUpdated,
    onPaneClick,
    
    // Actions
    loadFromDatabase,
    saveToDatabase,
    handleNodeFormSubmit: saveNodeChanges,
    handleEdgeFormSubmit: saveEdgeChanges,
    handleDeleteNode: deleteSelected,
    handleDeleteEdge: deleteSelected,
    navigateToChildTree: () => {}, // Will be implemented if needed
    navigateToParent,
    createEmptyTree,
    convertTreeData: convertToNavigationTreeData,
    
    // Additional actions
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
    
    // New navigation functions
    navigateToChildView,
    navigateToParentView,
    addChildNode,
    
    // Configuration
    defaultEdgeOptions
  };
}; 