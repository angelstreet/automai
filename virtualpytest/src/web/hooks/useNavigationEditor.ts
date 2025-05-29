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

interface ConnectionResult {
  isAllowed: boolean;
  reason?: string;
  edgeType: 'default' | 'top' | 'bottom' | 'menu';
  sourceNodeUpdates?: Partial<UINavigationNode['data']>;
  targetNodeUpdates?: Partial<UINavigationNode['data']>;
}

/**
 * Returns a summary of all connection rules for reference
 */
const getConnectionRulesSummary = () => {
  return {
    rules: [
      {
        name: "RULE 1: Menu Node Connections",
        description: "Menu nodes can connect using any handle type and establish parent-child relationships",
        cases: [
          "Menu → Any Node: Target inherits menu's parent chain + menu ID",
          "Any Node → Menu: Source inherits menu's parent chain + menu ID"
        ]
      },
      {
        name: "RULE 2: Screen-to-Screen Connections",
        description: "Left/Right handles for lateral navigation between screens",
        cases: [
          "Both nodes must be screens (not menus)",
          "No parent inheritance occurs",
          "Creates 'default' edge type"
        ]
      },
      {
        name: "RULE 3: Top/Bottom Handle Validation",
        description: "Top/Bottom handles require at least one menu node",
        cases: [
          "Must involve at least one menu node",
          "Creates 'top' or 'bottom' edge types"
        ]
      },
      {
        name: "RULE 4: Default Fallback",
        description: "Allow connection without parent inheritance",
        cases: [
          "Used when no other rules apply",
          "No parent chain modifications"
        ]
      }
    ],
    parentInheritance: {
      "Empty parent": "New nodes start with parent: [], depth: 0",
      "Menu inheritance": "Non-menu nodes inherit complete parent chain from connected menu + menu ID",
      "Screen connections": "Screen-to-screen connections don't modify parent chains",
      "Edge deletion": "Removing last incoming edge resets node to parent: [], depth: 0"
    }
  };
};

/**
 * Establishes connection rules and parent inheritance logic
 * @param sourceNode - The source node attempting to connect
 * @param targetNode - The target node being connected to
 * @param params - Connection parameters including handle information
 * @returns ConnectionResult with validation and update information
 */
const establishConnectionRules = (
  sourceNode: UINavigationNode,
  targetNode: UINavigationNode,
  params: Connection
): ConnectionResult => {
  console.log('[@hook:establishConnectionRules] Evaluating connection:', {
    source: sourceNode.data.label,
    target: targetNode.data.label,
    sourceHandle: params.sourceHandle,
    targetHandle: params.targetHandle,
    sourceType: sourceNode.data.type,
    targetType: targetNode.data.type,
    sourceParent: sourceNode.data.parent,
    targetParent: targetNode.data.parent,
  });

  // Analyze handle types
  const isLeftRightConnection = (
    (params.sourceHandle?.includes('left') || params.sourceHandle?.includes('right')) &&
    (params.targetHandle?.includes('left') || params.targetHandle?.includes('right'))
  );
  
  const isTopBottomConnection = (
    (params.sourceHandle?.includes('top') || params.sourceHandle?.includes('bottom')) &&
    (params.targetHandle?.includes('top') || params.targetHandle?.includes('bottom'))
  );

  const isTopConnection = params.sourceHandle?.includes('top') || params.targetHandle?.includes('top');
  const isBottomConnection = params.sourceHandle?.includes('bottom') || params.targetHandle?.includes('bottom');

  const hasMenuNode = sourceNode.data.type === 'menu' || targetNode.data.type === 'menu';

  // RULE 1: Menu nodes can connect using any handle type
  if (hasMenuNode) {
    console.log('[@hook:establishConnectionRules] Menu node connection - evaluating parent inheritance');
    
    // Determine edge type based on handles
    let edgeType: 'default' | 'top' | 'bottom' | 'menu' = 'menu';
    if (isTopConnection) edgeType = 'top';
    else if (isBottomConnection) edgeType = 'bottom';

    // PARENT INHERITANCE LOGIC
    if (sourceNode.data.type === 'menu') {
      // Case 1: Menu → Any Node (menu becomes parent of target)
      const newParentChain = [
        ...(sourceNode.data.parent || []),
        sourceNode.id
      ];
      
      console.log('[@hook:establishConnectionRules] Menu → Node: Target inherits parent chain:', newParentChain);
      
      return {
        isAllowed: true,
        edgeType,
        targetNodeUpdates: {
          parent: newParentChain,
          depth: newParentChain.length
        }
      };
    } else {
      // Case 2: Any Node → Menu (menu becomes parent of source)
      const newParentChain = [
        ...(targetNode.data.parent || []),
        targetNode.id
      ];
      
      console.log('[@hook:establishConnectionRules] Node → Menu: Source inherits parent chain:', newParentChain);
      
      return {
        isAllowed: true,
        edgeType,
        sourceNodeUpdates: {
          parent: newParentChain,
          depth: newParentChain.length
        }
      };
    }
  }

  // RULE 2: Left/Right handles for screen-to-screen connections
  if (isLeftRightConnection) {
    // Both nodes must be screens (not menus)
    if (sourceNode.data.type === 'menu' || targetNode.data.type === 'menu') {
      return {
        isAllowed: false,
        reason: 'Left/right handles cannot connect menu nodes to non-menu nodes',
        edgeType: 'default'
      };
    }
    
    console.log('[@hook:establishConnectionRules] Screen-to-screen connection via left/right handles - no parent inheritance');
    
    return {
      isAllowed: true,
      edgeType: 'default'
      // No parent updates for screen-to-screen connections
    };
  }

  // RULE 3: Top/Bottom handles should involve menu nodes
  if (isTopBottomConnection) {
    if (!hasMenuNode) {
      return {
        isAllowed: false,
        reason: 'Top/bottom handles are intended for menu navigation and require at least one menu node',
        edgeType: isTopConnection ? 'top' : 'bottom'
      };
    }
    
    // This case should be handled by RULE 1 above, but adding for completeness
    console.log('[@hook:establishConnectionRules] Top/bottom connection with menu node');
    return {
      isAllowed: true,
      edgeType: isTopConnection ? 'top' : 'bottom'
    };
  }

  // RULE 4: Default case - allow connection without parent inheritance
  console.log('[@hook:establishConnectionRules] Default connection - no parent inheritance');
  return {
    isAllowed: true,
    edgeType: 'default'
  };
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

  // Tree filtering state - replaces breadcrumb navigation
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null); // Which node to focus on
  const [maxDisplayDepth, setMaxDisplayDepth] = useState<number>(2); // How many depth levels to show
  const [availableFocusNodes, setAvailableFocusNodes] = useState<{id: string, label: string, depth: number}[]>([]);

  // Progressive loading state (keep existing)
  const [loadedDepth, setLoadedDepth] = useState(2); // Start with depth 2 loaded
  const [maxDepth, setMaxDepth] = useState(0); // Track maximum depth available
  const [isProgressiveLoading, setIsProgressiveLoading] = useState(false);

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

    const sourceNode = nodes.find((n) => n.id === params.source);
    const targetNode = nodes.find((n) => n.id === params.target);
    
    if (!sourceNode || !targetNode) {
      console.error('[@component:NavigationEditor] Source or target node not found for connection');
      return;
    }
    
    // Use the new connection rules function
    const connectionResult = establishConnectionRules(sourceNode, targetNode, params);
    
    // Check if connection is allowed
    if (!connectionResult.isAllowed) {
      console.error('[@component:NavigationEditor] Connection rejected:', connectionResult.reason);
      return;
    }
    
    console.log('[@component:NavigationEditor] Connection approved:', {
      edgeType: connectionResult.edgeType,
      sourceUpdates: connectionResult.sourceNodeUpdates,
      targetUpdates: connectionResult.targetNodeUpdates
    });

    // Apply node updates if any
    if (connectionResult.sourceNodeUpdates || connectionResult.targetNodeUpdates) {
      setNodes((nds) => nds.map((node) => {
        if (node.id === sourceNode.id && connectionResult.sourceNodeUpdates) {
          console.log(`[@component:NavigationEditor] Updating source node ${sourceNode.data.label}:`, connectionResult.sourceNodeUpdates);
          return {
            ...node,
            data: {
              ...node.data,
              ...connectionResult.sourceNodeUpdates
            }
          };
        }
        if (node.id === targetNode.id && connectionResult.targetNodeUpdates) {
          console.log(`[@component:NavigationEditor] Updating target node ${targetNode.data.label}:`, connectionResult.targetNodeUpdates);
          return {
            ...node,
            data: {
              ...node.data,
              ...connectionResult.targetNodeUpdates
            }
          };
        }
        return node;
      }));
    }

    // Create the edge
    const edgeId = `${params.source}-${params.target}`;
    const newEdge: UINavigationEdge = {
      id: edgeId,
      source: params.source,
      target: params.target,
      sourceHandle: params.sourceHandle,
      targetHandle: params.targetHandle,
      type: 'uiNavigation',
      data: {
        edgeType: connectionResult.edgeType,
        description: `Connection from ${sourceNode.data.label} to ${targetNode.data.label}`,
        from: sourceNode.data.label,
        to: targetNode.data.label,
      },
    };

    // Add edge using history-aware setter
    setEdges((eds) => addEdge(newEdge, eds));
    
    // Mark as having unsaved changes
    setHasUnsavedChanges(true);
    
    console.log('[@component:NavigationEditor] Connection created successfully:', {
      edgeId,
      edgeType: connectionResult.edgeType,
      sourceLabel: sourceNode.data.label,
      targetLabel: targetNode.data.label
    });
  }, [nodes, setNodes, setEdges]);

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
        description: 'Starting point of the navigation flow',
        is_root: true // Mark as root node for the first tree
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
          
          // Initialize view state - use first node as root
          const rootNode = treeData.nodes[0];
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
          is_root: allNodes.length === 0 || !allNodes.some(node => node.data.is_root), // Only first tree is root
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
  }, [currentTreeId, currentTreeName, nodes, edges, isSaving, navigate, allNodes]);

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
    if (!node) return;
    
    setCurrentViewRootId(nodeId);
    setViewPath(prev => [...prev, { id: nodeId, name: node.data.label }]);
    console.log(`[@hook:useNavigationEditor] Navigated to child view: ${node.data.label}`);
  }, [allNodes]);

  // Handle double-click on node (updated for nested tree navigation)
  const onNodeDoubleClickUpdated = useCallback((event: React.MouseEvent, node: UINavigationNode) => {
    event.stopPropagation();
    const uiNode = node as UINavigationNode;
    
    // Only allow navigation for menu type nodes
    if (uiNode.data.type === 'menu') {
      console.log(`[@hook:useNavigationEditor] Double-click on menu node: ${uiNode.data.label}`);
      
      // Check if this menu node has an associated tree
      if (uiNode.data.tree_id && uiNode.data.tree_name) {
        console.log(`[@hook:useNavigationEditor] Navigating to menu tree: ${uiNode.data.tree_name} (ID: ${uiNode.data.tree_id})`);
        
        // Add to navigation path
        const newPath = [...navigationPath, uiNode.data.tree_id];
        const newNamePath = [...navigationNamePath, uiNode.data.tree_name];
        
        setNavigationPath(newPath);
        setNavigationNamePath(newNamePath);
        setCurrentTreeId(uiNode.data.tree_id);
        setCurrentTreeName(uiNode.data.tree_name);
        
        // Update URL to reflect the new tree
        navigate(`/navigation-editor/${encodeURIComponent(uiNode.data.tree_name)}/${uiNode.data.tree_id}`);
        
        // Load the tree data from database
        loadFromDatabase();
        
        console.log(`[@hook:useNavigationEditor] Navigation completed to tree: ${uiNode.data.tree_name}`);
      } else {
        console.log(`[@hook:useNavigationEditor] Menu node ${uiNode.data.label} does not have an associated tree yet`);
        // You could optionally create the tree here if it doesn't exist
      }
    } else {
      console.log(`[@hook:useNavigationEditor] Double-click on ${uiNode.data.type} node: ${uiNode.data.label}, navigation not allowed (only menu nodes can navigate)`);
    }
  }, [navigationPath, navigationNamePath, navigate, loadFromDatabase]);

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
    const nodeId = `node-${Date.now()}`;
    const newNode: UINavigationNode = {
      id: nodeId,
      type: 'uiScreen',
      position: { x: Math.random() * 300 + 100, y: Math.random() * 300 + 100 },
      data: {
        label: 'New Node',
        type: 'screen',
        description: '',
        // Initialize with empty parent array and depth 0
        parent: [],
        depth: 0,
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
    setHasUnsavedChanges(true);
    console.log('[@component:NavigationEditor] Added new node:', newNode.data.label);
  }, [setNodes]);

  // Save node changes with change tracking
  const saveNodeChanges = useCallback(async () => {
    if (!selectedNode) return;
    
    // Validate required fields
    if (!nodeForm.label.trim()) {
      return; // Don't save if screen name is empty
    }
    
    // Simple node data update - no tree creation needed
    let updatedNodeData = {
      ...selectedNode.data,
      label: nodeForm.label,
      type: nodeForm.type,
      description: nodeForm.description,
      // For TV menus, we can set depth here if needed
      depth: nodeForm.depth || 0,
      menu_type: nodeForm.menu_type || (nodeForm.type === 'menu' ? 'main' : undefined),
    };
    
    // Update the node in the single tree
    setNodes((nds) =>
      nds.map((node) =>
        node.id === selectedNode.id
          ? {
              ...node,
              type: nodeForm.type === 'menu' ? 'uiMenu' : 'uiScreen', // Use uiMenu type for menu nodes
              data: updatedNodeData,
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
    
    // Get source and target node names for the edge
    const sourceNode = nodes.find(node => node.id === selectedEdge.source);
    const targetNode = nodes.find(node => node.id === selectedEdge.target);
    const fromNodeName = sourceNode?.data?.label || selectedEdge.source;
    const toNodeName = targetNode?.data?.label || selectedEdge.target;
    
    setEdges((eds) =>
      eds.map((edge) =>
        edge.id === selectedEdge.id
          ? {
              ...edge,
              data: {
                ...edge.data,
                action: edgeForm.action,
                description: edgeForm.description,
                from: fromNodeName,  // Update with current node name
                to: toNodeName       // Update with current node name
              },
            }
          : edge
      )
    );
    setHasUnsavedChanges(true);
    setIsEdgeDialogOpen(false);
  }, [selectedEdge, edgeForm, setEdges, nodes]);

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
      // Before deleting the edge, check if we need to clean up parent relationships
      setEdges((eds) => {
        const newEdges = eds.filter((edge) => edge.id !== selectedEdge.id);
        
        // Check if the target node of the deleted edge has any remaining incoming edges
        const targetNodeId = selectedEdge.target;
        const hasRemainingIncomingEdges = newEdges.some(edge => edge.target === targetNodeId);
        
        if (!hasRemainingIncomingEdges) {
          // No more incoming edges, clear parent chain and reset depth
          setNodes((nds) => nds.map((node) => {
            if (node.id === targetNodeId) {
              console.log(`[@hook:useNavigationEditor] Clearing parent/depth for node ${node.data.label} - no remaining incoming edges`);
              return {
                ...node,
                data: {
                  ...node.data,
                  parent: [],
                  depth: 0
                }
              };
            }
            return node;
          }));
        } else {
          console.log(`[@hook:useNavigationEditor] Node ${targetNodeId} still has incoming edges, keeping parent/depth`);
        }
        
        return newEdges;
      });
      
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
    console.log('[@hook:useNavigationEditor] Navigating back to interface configuration');
    navigate('/configuration/interface');
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

  // Helper function to check if a node is descendant of another
  const isNodeDescendantOf = useCallback((node: UINavigationNode, ancestorId: string, nodes: UINavigationNode[]): boolean => {
    if (!node.data.parent || node.data.parent.length === 0) return false;
    
    // Check if ancestorId is in the parent chain
    return node.data.parent.includes(ancestorId);
  }, []);

  // Get filtered nodes based on focus node and depth
  const getFilteredNodes = useCallback(() => {
    console.log(`[@hook:useNavigationEditor] Filtering nodes - focusNodeId: ${focusNodeId}, maxDisplayDepth: ${maxDisplayDepth}, total nodes: ${allNodes.length}`);
    
    if (!focusNodeId) {
      // No focus node selected (All option) - show ALL nodes without any filtering
      console.log(`[@hook:useNavigationEditor] No focus node - showing ALL ${allNodes.length} nodes`);
      return allNodes;
    }

    // Find the focus node
    const focusNode = allNodes.find(n => n.id === focusNodeId);
    if (!focusNode) {
      console.log(`[@hook:useNavigationEditor] Focus node ${focusNodeId} not found, showing all nodes`);
      return allNodes;
    }

    const focusDepth = focusNode.data.depth || 0;
    console.log(`[@hook:useNavigationEditor] Focus node found: ${focusNode.data.label} at depth ${focusDepth}`);
    
    // Show focus node and its descendants up to maxDisplayDepth levels deep
    const filtered = allNodes.filter(node => {
      const nodeDepth = node.data.depth || 0;
      
      // Include the focus node itself
      if (node.id === focusNodeId) {
        console.log(`[@hook:useNavigationEditor] Including focus node: ${node.data.label}`);
        return true;
      }
      
      // Check if this node is a descendant of the focus node
      const isDescendant = isNodeDescendantOf(node, focusNodeId, allNodes);
      if (isDescendant) {
        const relativeDepth = nodeDepth - focusDepth;
        const shouldInclude = relativeDepth <= maxDisplayDepth && relativeDepth > 0;
        console.log(`[@hook:useNavigationEditor] Descendant ${node.data.label} - depth: ${nodeDepth}, relative: ${relativeDepth}, include: ${shouldInclude}`);
        return shouldInclude;
      }
      
      return false;
    });
    
    console.log(`[@hook:useNavigationEditor] Focus filtering complete - showing ${filtered.length} nodes`);
    return filtered;
  }, [allNodes, focusNodeId, maxDisplayDepth, isNodeDescendantOf]);

  // Get filtered edges (only between visible nodes)
  const getFilteredEdges = useCallback(() => {
    const visibleNodes = getFilteredNodes();
    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));
    
    return allEdges.filter(edge => 
      visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    );
  }, [allEdges, getFilteredNodes]);

  // Navigate to parent view (breadcrumb click)
  const navigateToParentView = useCallback((targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= viewPath.length) return;
    
    const targetView = viewPath[targetIndex];
    setCurrentViewRootId(targetView.id);
    setViewPath(prev => prev.slice(0, targetIndex + 1));
    console.log(`[@hook:useNavigationEditor] Navigated to parent view: ${targetView.name}`);
  }, [viewPath]);

  // Update the ReactFlow nodes and edges based on filtering (replaces old view logic)
  useEffect(() => {
    const filteredNodes = getFilteredNodes();
    const filteredEdges = getFilteredEdges();
    
    setNodes(filteredNodes);
    setEdges(filteredEdges);
    
    console.log(`[@hook:useNavigationEditor] Applied filter - showing ${filteredNodes.length} nodes, ${filteredEdges.length} edges`);
  }, [allNodes, allEdges, focusNodeId, maxDisplayDepth, getFilteredNodes, getFilteredEdges, setNodes, setEdges]);

  // Progressive loading function for TV menus
  const loadChildrenAtDepth = useCallback(async (nodeId: string, targetDepth: number) => {
    if (isProgressiveLoading || targetDepth <= loadedDepth) return;
    
    setIsProgressiveLoading(true);
    console.log(`[@hook:useNavigationEditor] Loading children at depth ${targetDepth} for node ${nodeId}`);
    
    try {
      // In a real implementation, this would call an API
      // For now, we simulate progressive loading
      const response = await fetch(`/api/navigation/trees/${currentTreeId}/load-depth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node_id: nodeId,
          depth: targetDepth,
          load_children: true
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Add new nodes and edges to existing ones
        setNodes(prevNodes => {
          const existingIds = new Set(prevNodes.map(n => n.id));
          const newNodes = data.nodes.filter((n: UINavigationNode) => !existingIds.has(n.id));
          return [...prevNodes, ...newNodes];
        });
        
        setEdges(prevEdges => {
          const existingIds = new Set(prevEdges.map(e => e.id));
          const newEdges = data.edges.filter((e: UINavigationEdge) => !existingIds.has(e.id));
          return [...prevEdges, ...newEdges];
        });
        
        setLoadedDepth(targetDepth);
        setMaxDepth(data.max_depth || targetDepth);
        
        console.log(`[@hook:useNavigationEditor] Successfully loaded depth ${targetDepth}, max depth: ${data.max_depth}`);
      }
    } catch (error) {
      console.error(`[@hook:useNavigationEditor] Error loading children at depth ${targetDepth}:`, error);
    } finally {
      setIsProgressiveLoading(false);
    }
  }, [currentTreeId, loadedDepth, isProgressiveLoading]);

  // Handle menu node entry (when user "enters" a menu)
  const handleMenuEntry = useCallback(async (menuNode: UINavigationNode) => {
    console.log(`[@hook:useNavigationEditor] Entering menu: ${menuNode.data.label}`);
    
    const currentDepth = menuNode.data.depth || 0;
    const nextDepth = currentDepth + 1;
    
    // If we need to load more depth, do it progressively
    if (nextDepth > loadedDepth) {
      await loadChildrenAtDepth(menuNode.id, nextDepth);
    }
    
    // Filter nodes to show only relevant ones for current context
    const relevantNodes = allNodes.filter(node => {
      const nodeDepth = node.data.depth || 0;
      // Show current menu and its immediate children
      return nodeDepth <= nextDepth && 
             (nodeDepth <= currentDepth || (node.data.parent && node.data.parent.includes(menuNode.id)));
    });
    
    setNodes(relevantNodes);
  }, [loadedDepth, loadChildrenAtDepth, allNodes]);

  // Update available focus nodes when all nodes change
  useEffect(() => {
    console.log(`[@hook:useNavigationEditor] All nodes updated - ${allNodes.length} total nodes:`);
    allNodes.forEach(node => {
      const parentChain = node.data.parent ? node.data.parent.join(' > ') : 'none';
      console.log(`[@hook:useNavigationEditor] Node: ${node.data.label} (id: ${node.id}, depth: ${node.data.depth || 0}, parent: ${parentChain}, type: ${node.data.type})`);
    });
    
    const focusableNodes = allNodes
      .filter(node => node.data.type === 'menu' || node.data.is_root)
      .map(node => ({
        id: node.id,
        label: node.data.label,
        depth: node.data.depth || 0
      }))
      .sort((a, b) => a.depth - b.depth || a.label.localeCompare(b.label));
    
    setAvailableFocusNodes(focusableNodes);
    
    // REMOVED: Don't auto-select a focus node - let user choose "All" option
    // if (!focusNodeId && focusableNodes.length > 0) {
    //   const rootNode = focusableNodes.find(n => n.depth === 0) || focusableNodes[0];
    //   setFocusNodeId(rootNode.id);
    // }
  }, [allNodes]); // Removed focusNodeId dependency to prevent auto-selection

  // Focus on specific node (dropdown selection)
  const setFocusNode = useCallback((nodeId: string | null) => {
    console.log(`[@hook:useNavigationEditor] Setting focus node: ${nodeId}`);
    setFocusNodeId(nodeId);
    
    // Auto-fit view to show the filtered content
    setTimeout(() => {
      reactFlowInstance?.fitView({ padding: 0.1 });
    }, 100);
  }, [reactFlowInstance]);

  // Set max display depth (dropdown selection)
  const setDisplayDepth = useCallback((depth: number) => {
    console.log(`[@hook:useNavigationEditor] Setting display depth: ${depth}`);
    setMaxDisplayDepth(depth);
    
    // Auto-fit view after depth change
    setTimeout(() => {
      reactFlowInstance?.fitView({ padding: 0.1 });
    }, 100);
  }, [reactFlowInstance]);

  // Reset focus to show all root level nodes
  const resetFocus = useCallback(() => {
    console.log(`[@hook:useNavigationEditor] Resetting focus to root level`);
    setFocusNodeId(null);
    setMaxDisplayDepth(2);
    
    setTimeout(() => {
      reactFlowInstance?.fitView({ padding: 0.1 });
    }, 100);
  }, [reactFlowInstance]);

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
    
    // Tree state (simplified)
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
    
    // All nodes and edges (for filtering)
    allNodes,
    allEdges,
    
    // View state for single-level navigation
    viewPath,
    
    // Tree filtering state and functions
    focusNodeId,
    maxDisplayDepth,
    availableFocusNodes,
    getFilteredNodes,
    isNodeDescendantOf,
    getFilteredEdges,
    setFocusNode,
    setDisplayDepth,
    resetFocus,
    
    // Progressive loading state and functions
    loadedDepth,
    maxDepth,
    isProgressiveLoading,
    loadChildrenAtDepth,
    handleMenuEntry,
    
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
    navigateToParent,
    createEmptyTree,
    convertTreeData: convertToNavigationTreeData,
    
    // Additional actions
    addNewNode,
    cancelNodeChanges,
    discardChanges,
    performDiscardChanges,
    closeSelectionPanel,
    undo,
    redo,
    fitView,
    deleteSelected,
    
    // Navigation actions
    navigateToTreeLevel,
    goBackToParent,
    navigateToParentView,
    
    // Configuration
    defaultEdgeOptions,
    
    // Connection rules and debugging
    getConnectionRulesSummary,
  };
}; 