import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
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

// Import the modular hooks
import { useNavigationState } from './navigation/useNavigationState';
import { useConnectionRules } from './navigation/useConnectionRules';
import { useNavigationHistory } from './navigation/useNavigationHistory';
import { useNavigationCRUD } from './navigation/useNavigationCRUD';
import { useNavigationConfig } from './navigation/useNavigationConfig';
import { useNodeEdgeManagement } from './navigation/useNodeEdgeManagement';

// Import registration context and default team ID
import { useRegistration, DEFAULT_TEAM_ID } from '../contexts/RegistrationContext';

export const useNavigationEditor = () => {
  const navigate = useNavigate();
  
  // Use registration context for centralized URL management
  const { buildServerUrl } = useRegistration();
  
  // Initialize teamId in localStorage if not already set
  useEffect(() => {
    if (!localStorage.getItem('teamId') && !sessionStorage.getItem('teamId')) {
      console.log(`[@hook:useNavigationEditor] Setting default team_id in localStorage: ${DEFAULT_TEAM_ID}`);
      localStorage.setItem('teamId', DEFAULT_TEAM_ID);
    }
  }, []);
  
  // Create apiCall function using buildServerUrl
  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
  // Get team_id from localStorage or other state management, or use default
  const teamId = localStorage.getItem('teamId') || sessionStorage.getItem('teamId') || DEFAULT_TEAM_ID;
  
  console.log(`[@hook:useNavigationEditor:apiCall] Making API call to ${endpoint} with team_id: ${teamId}`);
  
    const response = await fetch(buildServerUrl(endpoint), {
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
  }, [buildServerUrl]);
  
  // Use the modular state hook
  const navigationState = useNavigationState();
  
  // Connection rules hook
  const { validateConnection, getRulesSummary } = useConnectionRules();
  
  // CRUD operations hook (legacy database operations)
  const crudHook = useNavigationCRUD({
    currentTreeId: navigationState.currentTreeId,
    currentTreeName: navigationState.currentTreeName,
    setCurrentTreeId: navigationState.setCurrentTreeId,
    setCurrentTreeName: navigationState.setCurrentTreeName,
    setNavigationPath: navigationState.setNavigationPath,
    setNavigationNamePath: navigationState.setNavigationNamePath,
    setNodes: navigationState.setNodes,
    setEdges: navigationState.setEdges,
    setAllNodes: navigationState.setAllNodes,
    setAllEdges: navigationState.setAllEdges,
    setInitialState: navigationState.setInitialState,
    setHistory: navigationState.setHistory,
    setHistoryIndex: navigationState.setHistoryIndex,
    setHasUnsavedChanges: navigationState.setHasUnsavedChanges,
    setIsLoading: navigationState.setIsLoading,
    setError: navigationState.setError,
    setSaveError: navigationState.setSaveError,
    setSaveSuccess: navigationState.setSaveSuccess,
    setIsSaving: navigationState.setIsSaving,
    setCurrentViewRootId: navigationState.setCurrentViewRootId,
    setViewPath: navigationState.setViewPath,
    setUserInterface: navigationState.setUserInterface,
    nodes: navigationState.nodes,
    edges: navigationState.edges,
    allNodes: navigationState.allNodes,
    allEdges: navigationState.allEdges,
    isSaving: navigationState.isSaving,
    apiCall, // Pass the apiCall function
  });
  
  // Navigation config operations hook (new JSON config file operations)
  const configHook = useNavigationConfig({
    currentTreeName: navigationState.currentTreeName,
    setCurrentTreeName: navigationState.setCurrentTreeName,
    setNodes: navigationState.setNodes,
    setEdges: navigationState.setEdges,
    setAllNodes: navigationState.setAllNodes,
    setAllEdges: navigationState.setAllEdges,
    setInitialState: navigationState.setInitialState,
    setHistory: navigationState.setHistory,
    setHistoryIndex: navigationState.setHistoryIndex,
    setHasUnsavedChanges: navigationState.setHasUnsavedChanges,
    setIsLoading: navigationState.setIsLoading,
    setError: navigationState.setError,
    setSaveError: navigationState.setSaveError,
    setSaveSuccess: navigationState.setSaveSuccess,
    setIsSaving: navigationState.setIsSaving,
    nodes: navigationState.nodes,
    edges: navigationState.edges,
    allNodes: navigationState.allNodes,
    allEdges: navigationState.allEdges,
    isSaving: navigationState.isSaving,
    apiCall, // Pass the apiCall function
  });
  
  // History management hook
  const historyHook = useNavigationHistory(
    {
      history: navigationState.history,
      historyIndex: navigationState.historyIndex,
      setHistory: navigationState.setHistory,
      setHistoryIndex: navigationState.setHistoryIndex,
    },
    {
      nodes: navigationState.nodes,
      edges: navigationState.edges,
      setNodes: navigationState.setNodes,
      setEdges: navigationState.setEdges,
      setHasUnsavedChanges: navigationState.setHasUnsavedChanges,
    }
  );
  
  // Node/Edge management hook
  const nodeEdgeHook = useNodeEdgeManagement({
    nodes: navigationState.nodes,
    edges: navigationState.edges,
    selectedNode: navigationState.selectedNode,
    selectedEdge: navigationState.selectedEdge,
    nodeForm: navigationState.nodeForm,
    edgeForm: navigationState.edgeForm,
    isNewNode: navigationState.isNewNode,
    setNodes: navigationState.setNodes,
    setEdges: navigationState.setEdges,
    setSelectedNode: navigationState.setSelectedNode,
    setSelectedEdge: navigationState.setSelectedEdge,
    setNodeForm: navigationState.setNodeForm,
    setEdgeForm: navigationState.setEdgeForm,
    setIsNodeDialogOpen: navigationState.setIsNodeDialogOpen,
    setIsEdgeDialogOpen: navigationState.setIsEdgeDialogOpen,
    setIsNewNode: navigationState.setIsNewNode,
    setHasUnsavedChanges: navigationState.setHasUnsavedChanges,
    setAllNodes: navigationState.setAllNodes,
    setAllEdges: navigationState.setAllEdges,
  });

  // Additional state that might need local management
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);

  // Override onNodesChange to prevent automatic position changes
  const customOnNodesChange = useCallback((changes: any[]) => {
    console.log('[@hook:useNavigationEditor] onNodesChange called with changes:', changes);
    
    // Track position changes separately to update allNodes as well
    const positionChanges = changes.filter(change => change.type === 'position');
    
    // Filter out position changes that might be caused by auto-layout
    const filteredChanges = changes.filter(change => {
      // Allow user-initiated changes (drag, select, etc.)
      if (change.type === 'select' || change.type === 'remove') {
        return true;
      }
      
      // For position changes, only allow if they're user-initiated (dragging = true)
      if (change.type === 'position') {
        // Allow position changes when user is actively dragging
        const isUserDrag = change.dragging === true || change.dragging === undefined;
        if (isUserDrag) {
          console.log('[@hook:useNavigationEditor] Allowing user-initiated position change for node:', change.id);
          return true;
        } else {
          console.log('[@hook:useNavigationEditor] Filtered out automatic position change for node:', change.id);
          return false;
        }
      }
      
      // Allow dimension changes
      if (change.type === 'dimensions') {
        return true;
      }
      
      // Allow other change types
      return true;
    });
    
    // Apply changes to the filtered nodes
    if (filteredChanges.length > 0) {
      navigationState.onNodesChange(filteredChanges);
    }
    
    // Also apply position changes to allNodes to keep them in sync
    if (positionChanges.length > 0) {
      const userPositionChanges = positionChanges.filter(change => 
        change.dragging === true || change.dragging === undefined
      );
      
      if (userPositionChanges.length > 0) {
        navigationState.setAllNodes(prevAllNodes => {
          const updatedAllNodes = [...prevAllNodes];
          userPositionChanges.forEach(change => {
            const nodeIndex = updatedAllNodes.findIndex(node => node.id === change.id);
            if (nodeIndex !== -1 && change.position) {
              console.log('[@hook:useNavigationEditor] Updating position in allNodes for node:', change.id, 'to:', change.position);
              updatedAllNodes[nodeIndex] = {
                ...updatedAllNodes[nodeIndex],
                position: change.position
              };
            }
          });
          return updatedAllNodes;
        });
        
        // Mark as having unsaved changes when positions change
        navigationState.setHasUnsavedChanges(true);
      }
    }
  }, [navigationState.onNodesChange, navigationState.setAllNodes, navigationState.setHasUnsavedChanges]);

  // Override onEdgesChange to save to history and track changes
  const onEdgesChangeWithHistory = useCallback((changes: any[]) => {
    navigationState.onEdgesChange(changes);
    // Only save to history for meaningful changes (not just selection)
    const hasMeaningfulChange = changes.some(change => 
      change.type === 'add' || 
      change.type === 'remove'
    );
    
    if (hasMeaningfulChange) {
      setTimeout(() => {
        historyHook.saveToHistory();
        navigationState.setHasUnsavedChanges(true);
      }, 0);
    }
  }, [navigationState.onEdgesChange, historyHook.saveToHistory, navigationState.setHasUnsavedChanges]);

  // Override onConnect to save to history and track changes
  const onConnectHistory = useCallback((params: Connection) => {
    console.log('[@component:NavigationEditor] onConnectHistory called with params:', params);
    
    if (!params.source || !params.target) return;

    const sourceNode = navigationState.nodes.find((n) => n.id === params.source);
    const targetNode = navigationState.nodes.find((n) => n.id === params.target);
    
    if (!sourceNode || !targetNode) {
      console.error('[@component:NavigationEditor] Source or target node not found for connection');
      return;
    }
    
    // DEBUG: Log the current state of both nodes before connection
    console.log('[@component:NavigationEditor] BEFORE CONNECTION - Source node:', {
      id: sourceNode.id,
      label: sourceNode.data.label,
      type: sourceNode.data.type,
      parent: sourceNode.data.parent,
      depth: sourceNode.data.depth
    });
    console.log('[@component:NavigationEditor] BEFORE CONNECTION - Target node:', {
      id: targetNode.id,
      label: targetNode.data.label,
      type: targetNode.data.type,
      parent: targetNode.data.parent,
      depth: targetNode.data.depth
    });
    console.log('[@component:NavigationEditor] Connection params:', {
      sourceHandle: params.sourceHandle,
      targetHandle: params.targetHandle
    });
    
    // Use the new connection rules function
    const connectionResult = validateConnection(sourceNode, targetNode, params);
    
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
      // Update both filtered nodes and allNodes
      const updateNodeFunction = (nds: UINavigationNode[]) => nds.map((node) => {
        if (node.id === sourceNode.id && connectionResult.sourceNodeUpdates) {
          console.log(`[@component:NavigationEditor] Updating source node ${sourceNode.data.label}:`, connectionResult.sourceNodeUpdates);
          return {
            ...node,
            // Explicitly preserve position to prevent auto-reorganization
            position: node.position,
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
            // Explicitly preserve position to prevent auto-reorganization
            position: node.position,
            data: {
              ...node.data,
              ...connectionResult.targetNodeUpdates
            }
          };
        }
        return node;
      });
      
      navigationState.setNodes(updateNodeFunction);
      navigationState.setAllNodes(updateNodeFunction);
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
    navigationState.setEdges((eds) => addEdge(newEdge, eds));
    
    // Also add edge to allEdges (complete dataset) - with debugging
    console.log('[@component:NavigationEditor] Before adding edge to allEdges, current allEdges count:', navigationState.allEdges.length);
    navigationState.setAllEdges((allEds) => {
      const updatedEdges = addEdge(newEdge, allEds);
      console.log('[@component:NavigationEditor] After adding edge to allEdges, new count:', updatedEdges.length);
      return updatedEdges;
    });
    
    // Ensure allEdges update persists after any potential filter resets
    setTimeout(() => {
      navigationState.setAllEdges((allEds) => {
        // Check if the edge is already there, if not add it
        const edgeExists = allEds.some(edge => edge.id === newEdge.id);
        if (!edgeExists) {
          console.log('[@component:NavigationEditor] Edge missing from allEdges after timeout, re-adding:', newEdge.id);
          return addEdge(newEdge, allEds);
        }
        console.log('[@component:NavigationEditor] Edge confirmed in allEdges after timeout:', newEdge.id);
        return allEds;
      });
    }, 100);
    
    // Mark as having unsaved changes
    navigationState.setHasUnsavedChanges(true);
    
    console.log('[@component:NavigationEditor] Connection created successfully:', {
      edgeId,
      edgeType: connectionResult.edgeType,
      sourceLabel: sourceNode.data.label,
      targetLabel: targetNode.data.label
    });
  }, [navigationState.nodes, navigationState.setNodes, navigationState.setAllNodes, navigationState.setEdges, navigationState.setAllEdges, navigationState.setHasUnsavedChanges, validateConnection]);

  // Fetch user interface and root tree if interfaceId is provided
  useEffect(() => {
    const fetchUserInterface = async () => {
      if (navigationState.interfaceId) {
        navigationState.setIsLoadingInterface(true);
        try {
          console.log(`[@component:NavigationEditor] Fetching user interface: ${navigationState.interfaceId}`);
          const response = await apiCall(`/server/navigation/userinterfaces/${navigationState.interfaceId}`);
          if (response.userinterface) {
            navigationState.setUserInterface(response.userinterface);
            if (response.root_navigation_tree) {
              navigationState.setRootTree(response.root_navigation_tree);
              navigationState.setCurrentTreeId(response.root_navigation_tree.id);
              navigationState.setCurrentTreeName(response.root_navigation_tree.name);
              navigationState.setNavigationPath([response.root_navigation_tree.id]);
              navigationState.setNavigationNamePath([response.root_navigation_tree.name]);
              // Update URL to reflect both ID and name of the root tree
              navigate(`/navigation-editor/${response.root_navigation_tree.name}/${response.root_navigation_tree.id}`);
            }
          } else {
            console.error(`[@component:NavigationEditor] Failed to fetch user interface: ${navigationState.interfaceId}`);
          }
        } catch (error) {
          console.error(`[@component:NavigationEditor] Error fetching user interface:`, error);
        } finally {
          navigationState.setIsLoadingInterface(false);
        }
      }
    };
    fetchUserInterface();
  }, [navigationState.interfaceId, navigate]);

  // Handle clicking on the background/pane to deselect
  const onPaneClick = useCallback(() => {
    navigationState.setSelectedNode(null);
    navigationState.setSelectedEdge(null);
  }, [navigationState.setSelectedNode, navigationState.setSelectedEdge]);

  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: UINavigationNode) => {
    event.stopPropagation(); // Prevent pane click from firing
    navigationState.setSelectedNode(node as UINavigationNode);
    navigationState.setSelectedEdge(null);
  }, [navigationState.setSelectedNode, navigationState.setSelectedEdge]);

  // Handle edge selection
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: UINavigationEdge) => {
    event.stopPropagation(); // Prevent pane click from firing
    navigationState.setSelectedEdge(edge as UINavigationEdge);
    navigationState.setSelectedNode(null);
  }, [navigationState.setSelectedEdge, navigationState.setSelectedNode]);

  // Handle double-click on node for navigation
  const onNodeDoubleClickUpdated = useCallback((event: React.MouseEvent, node: UINavigationNode) => {
    event.stopPropagation();
    const uiNode = node as UINavigationNode;
    
    console.log(`[@hook:useNavigationEditor] Double-click on node: ${uiNode.data.label} (type: ${uiNode.data.type})`);
    
    // Check if there's currently a filter applied
    if (navigationState.focusNodeId) {
      // If filter is applied, reset it to show all nodes
      console.log(`[@hook:useNavigationEditor] Filter is active (focused on: ${navigationState.focusNodeId}), resetting filter`);
      navigationState.setFocusNodeId(null);
      navigationState.setMaxDisplayDepth(5);
      console.log(`[@hook:useNavigationEditor] Filter reset - showing all nodes`);
    } else {
      // If no filter is applied, focus on the double-clicked node (if it's focusable)
      const isFocusableNode = uiNode.data.type === 'menu' || uiNode.data.is_root;
      
      if (isFocusableNode) {
        console.log(`[@hook:useNavigationEditor] No filter active, focusing on node: ${uiNode.data.label} (${uiNode.id})`);
        navigationState.setFocusNodeId(uiNode.id);
        // Set a reasonable depth for viewing the focused node and its children
        navigationState.setMaxDisplayDepth(3);
        console.log(`[@hook:useNavigationEditor] Focused on node: ${uiNode.data.label} with depth limit 3`);
      } else {
        console.log(`[@hook:useNavigationEditor] Node ${uiNode.data.label} is not focusable (type: ${uiNode.data.type}), double-click ignored`);
      }
    }
  }, [navigationState]);

  // Navigate back in breadcrumb
  const navigateToTreeLevel = useCallback((index: number) => {
    const newPath = navigationState.navigationPath.slice(0, index + 1);
    const newNamePath = navigationState.navigationNamePath.slice(0, index + 1);
    const targetTreeId = newPath[newPath.length - 1];
    const targetTreeName = newNamePath[newNamePath.length - 1];
    
    // Prevent navigating to the same tree level
    if (navigationState.currentTreeId === targetTreeId) {
      return;
    }
    
    navigationState.setNavigationPath(newPath);
    navigationState.setNavigationNamePath(newNamePath);
    navigationState.setCurrentTreeId(targetTreeId);
    navigationState.setCurrentTreeName(targetTreeName);
    navigate(`/navigation-editor/${encodeURIComponent(targetTreeName)}/${targetTreeId}`);
    
    // Load tree data for that level from config
    configHook.loadFromConfig(targetTreeName);
    
    console.log(`[@component:NavigationEditor] Navigating back to: ${targetTreeName}`);
  }, [navigationState, configHook.loadFromConfig, navigate]);

  // Go back to parent tree
  const goBackToParent = useCallback(() => {
    if (navigationState.navigationPath.length > 1) {
      const newPath = navigationState.navigationPath.slice(0, -1);
      const newNamePath = navigationState.navigationNamePath.slice(0, -1);
      const targetTreeId = newPath[newPath.length - 1];
      const targetTreeName = newNamePath[newNamePath.length - 1];
      
      navigationState.setNavigationPath(newPath);
      navigationState.setNavigationNamePath(newNamePath);
      navigationState.setCurrentTreeId(targetTreeId);
      navigationState.setCurrentTreeName(targetTreeName);
      navigate(`/navigation-editor/${encodeURIComponent(targetTreeName)}/${targetTreeId}`);
      
      // Load parent tree data from config
      configHook.loadFromConfig(targetTreeName);
      
      console.log(`[@component:NavigationEditor] Going back to parent: ${targetTreeId}`);
    }
  }, [navigationState, configHook.loadFromConfig, navigate]);

  // Discard changes function with confirmation
  const discardChanges = useCallback(() => {
    if (navigationState.hasUnsavedChanges) {
      navigationState.setIsDiscardDialogOpen(true);
    } else {
      performDiscardChanges();
    }
  }, [navigationState.hasUnsavedChanges, navigationState.setIsDiscardDialogOpen]);

  // Actually perform the discard operation
  const performDiscardChanges = useCallback(() => {
    if (navigationState.initialState) {
      navigationState.setNodes([...navigationState.initialState.nodes]);
      navigationState.setEdges([...navigationState.initialState.edges]);
      navigationState.setHistory([{ nodes: navigationState.initialState.nodes, edges: navigationState.initialState.edges }]);
      navigationState.setHistoryIndex(0);
      navigationState.setHasUnsavedChanges(false);
      navigationState.setSaveError(null);
      navigationState.setSaveSuccess(false);
      navigationState.setIsDiscardDialogOpen(false);
      console.log('[@component:NavigationEditor] Discarded changes, reverted to initial state.');
    }
  }, [navigationState]);

  // Fit view
  const fitView = useCallback(() => {
    if (navigationState.reactFlowInstance) {
      // Get the current visible nodes from navigationState (which are already filtered)
      const visibleNodes = navigationState.nodes;
      
      if (visibleNodes.length > 0) {
        console.log(`[@hook:useNavigationEditor] Fitting view to ${visibleNodes.length} visible nodes`);
        // Fit view to only the visible/filtered nodes
        navigationState.reactFlowInstance.fitView({
          nodes: visibleNodes.map(node => ({ id: node.id })),
          padding: 0.1, // 10% padding around the visible nodes
          duration: 300, // Smooth animation
        });
      } else {
        console.log(`[@hook:useNavigationEditor] No visible nodes to fit view to, using default fitView`);
        // Fallback to default fitView if no visible nodes
        navigationState.reactFlowInstance.fitView();
      }
    }
  }, [navigationState.reactFlowInstance, navigationState.nodes]);

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

  // Helper function to check if a node is descendant of another
  const isNodeDescendantOf = useCallback((node: UINavigationNode, ancestorId: string, nodes: UINavigationNode[]): boolean => {
    if (!node.data.parent || node.data.parent.length === 0) return false;
    
    // Check if ancestorId is in the parent chain
    return node.data.parent.includes(ancestorId);
  }, []);

  // Get filtered nodes based on focus node and depth
  const filteredNodes = useMemo(() => {
    console.log(`[@hook:useNavigationEditor] Filtering nodes - focusNodeId: ${navigationState.focusNodeId}, maxDisplayDepth: ${navigationState.maxDisplayDepth}, total nodes: ${navigationState.allNodes.length}`);
    
    // Preserve previous filtered nodes for reference equality check
    const prevFilteredNodes = navigationState.nodes;
    
    if (!navigationState.focusNodeId) {
      // No focus node selected (All option) - apply depth filtering to all nodes
      console.log(`[@hook:useNavigationEditor] No focus node - applying depth filter (max depth: ${navigationState.maxDisplayDepth}) to all ${navigationState.allNodes.length} nodes`);
      const depthFiltered = navigationState.allNodes.filter(node => {
        const nodeDepth = node.data.depth || 0;
        const shouldInclude = nodeDepth <= navigationState.maxDisplayDepth;
        console.log(`[@hook:useNavigationEditor] Node ${node.data.label} - depth: ${nodeDepth}, max: ${navigationState.maxDisplayDepth}, include: ${shouldInclude}`);
        return shouldInclude;
      });
      console.log(`[@hook:useNavigationEditor] Depth filtering complete - showing ${depthFiltered.length} of ${navigationState.allNodes.length} nodes`);
      
      // Preserve object references if the filtered set is the same
      const prevIds = new Set(prevFilteredNodes.map(n => n.id));
      const newIds = new Set(depthFiltered.map(n => n.id));
      if (prevFilteredNodes.length === depthFiltered.length && 
          [...newIds].every(id => prevIds.has(id))) {
        // Same set of nodes, return previous array to maintain reference equality
        console.log(`[@hook:useNavigationEditor] Filtered nodes unchanged, preserving references`);
        return prevFilteredNodes;
      }
      
      return depthFiltered;
    }

    // Find the focus node
    const focusNode = navigationState.allNodes.find(n => n.id === navigationState.focusNodeId);
    if (!focusNode) {
      console.log(`[@hook:useNavigationEditor] Focus node ${navigationState.focusNodeId} not found, showing all nodes`);
      
      // Check if we can preserve previous references
      const prevIds = new Set(prevFilteredNodes.map(n => n.id));
      const allIds = new Set(navigationState.allNodes.map(n => n.id));
      if (prevFilteredNodes.length === navigationState.allNodes.length && 
          [...allIds].every(id => prevIds.has(id))) {
        console.log(`[@hook:useNavigationEditor] All nodes unchanged, preserving references`);
        return prevFilteredNodes;
      }
      
      return navigationState.allNodes;
    }

    const focusDepth = focusNode.data.depth || 0;
    // Calculate the maximum absolute depth to show (focus depth + relative depth levels)
    const maxAbsoluteDepth = focusDepth + navigationState.maxDisplayDepth;
    console.log(`[@hook:useNavigationEditor] Focus node found: ${focusNode.data.label} at depth ${focusDepth}, max absolute depth: ${maxAbsoluteDepth} (focus + ${navigationState.maxDisplayDepth} levels)`);
    
    // Show focus node, its siblings, and its descendants up to maxDisplayDepth levels deep from the focus node
    const filtered = navigationState.allNodes.filter(node => {
      const nodeDepth = node.data.depth || 0;
      
      // Include the focus node itself
      if (node.id === navigationState.focusNodeId) {
        console.log(`[@hook:useNavigationEditor] Including focus node: ${node.data.label} at depth ${nodeDepth}`);
        return true;
      }
      
      // Check if this node is a descendant of the focus node first
      const isDescendant = isNodeDescendantOf(node, navigationState.focusNodeId!, navigationState.allNodes);
      if (isDescendant) {
        // For descendants, check against the maximum absolute depth
        const shouldInclude = nodeDepth <= maxAbsoluteDepth;
        console.log(`[@hook:useNavigationEditor] Descendant ${node.data.label} - depth: ${nodeDepth}, max absolute: ${maxAbsoluteDepth}, include: ${shouldInclude}`);
        return shouldInclude;
      }
      
      // Include true siblings (nodes at the same depth with the same parent, but not descendants)
      if (nodeDepth === focusDepth) {
        const focusParent = focusNode.data.parent || [];
        const nodeParent = node.data.parent || [];
        
        // Check if they have the same parent chain (true siblings)
        const areSiblings = JSON.stringify(focusParent) === JSON.stringify(nodeParent);
        if (areSiblings) {
          console.log(`[@hook:useNavigationEditor] Including true sibling: ${node.data.label} (same depth: ${nodeDepth}, same parent)`);
          return true;
        }
      }
      
      return false;
    });
    
    console.log(`[@hook:useNavigationEditor] Focus filtering complete - showing ${filtered.length} nodes (depths ${focusDepth} to ${maxAbsoluteDepth})`);
    
    // Preserve object references if the filtered set is the same
    const prevIds = new Set(prevFilteredNodes.map(n => n.id));
    const newIds = new Set(filtered.map(n => n.id));
    if (prevFilteredNodes.length === filtered.length && 
        [...newIds].every(id => prevIds.has(id))) {
      // Same set of nodes, return previous array to maintain reference equality
      console.log(`[@hook:useNavigationEditor] Focus filtered nodes unchanged, preserving references`);
      return prevFilteredNodes;
    }
    
    return filtered;
  }, [navigationState.allNodes, navigationState.focusNodeId, navigationState.maxDisplayDepth, navigationState.nodes, isNodeDescendantOf]);

  // Get filtered edges (only between visible nodes)
  const filteredEdges = useMemo(() => {
    const visibleNodeIds = new Set(filteredNodes.map(n => n.id));
    
    // Preserve previous filtered edges for reference equality check
    const prevFilteredEdges = navigationState.edges;
    
    const newFilteredEdges = navigationState.allEdges.filter(edge => 
      visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
    );
    
    // Preserve object references if the filtered set is the same
    const prevIds = new Set(prevFilteredEdges.map(e => e.id));
    const newIds = new Set(newFilteredEdges.map(e => e.id));
    if (prevFilteredEdges.length === newFilteredEdges.length && 
        [...newIds].every(id => prevIds.has(id))) {
      // Same set of edges, return previous array to maintain reference equality
      console.log(`[@hook:useNavigationEditor] Filtered edges unchanged, preserving references`);
      return prevFilteredEdges;
    }
    
    return newFilteredEdges;
  }, [navigationState.allEdges, filteredNodes, navigationState.edges]);

  // Keep the getFilteredNodes and getFilteredEdges functions for backward compatibility
  const getFilteredNodes = useCallback(() => filteredNodes, [filteredNodes]);
  const getFilteredEdges = useCallback(() => filteredEdges, [filteredEdges]);

  // Navigate to parent view (breadcrumb click)
  const navigateToParentView = useCallback((targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= navigationState.viewPath.length) return;
    
    const targetView = navigationState.viewPath[targetIndex];
    navigationState.setCurrentViewRootId(targetView.id);
    navigationState.setViewPath(prev => prev.slice(0, targetIndex + 1));
    console.log(`[@hook:useNavigationEditor] Navigated to parent view: ${targetView.name}`);
  }, [navigationState]);

  // Update the ReactFlow nodes and edges based on filtering
  useEffect(() => {
    // Don't filter while loading data to prevent loops
    if (navigationState.isLoading || navigationState.isSaving) {
      return;
    }
    
    // Only update if the arrays have actually changed (reference equality check)
    if (navigationState.nodes !== filteredNodes) {
      console.log(`[@hook:useNavigationEditor] Updating ReactFlow nodes - ${filteredNodes.length} nodes`);
      navigationState.setNodes(filteredNodes);
    }
    
    if (navigationState.edges !== filteredEdges) {
      console.log(`[@hook:useNavigationEditor] Updating ReactFlow edges - ${filteredEdges.length} edges`);
      navigationState.setEdges(filteredEdges);
    }
    
    // Only log if something actually changed
    if (navigationState.nodes !== filteredNodes || navigationState.edges !== filteredEdges) {
      console.log(`[@hook:useNavigationEditor] Applied filter - showing ${filteredNodes.length} nodes, ${filteredEdges.length} edges`);
    }
  }, [filteredNodes, filteredEdges, navigationState.setNodes, navigationState.setEdges, navigationState.isLoading, navigationState.isSaving, navigationState.nodes, navigationState.edges]);

  // Progressive loading function for TV menus
  const loadChildrenAtDepth = useCallback(async (nodeId: string, targetDepth: number) => {
    if (navigationState.isProgressiveLoading || targetDepth <= navigationState.loadedDepth) return;
    
    navigationState.setIsProgressiveLoading(true);
    console.log(`[@hook:useNavigationEditor] Loading children at depth ${targetDepth} for node ${nodeId}`);
    
    try {
      // In a real implementation, this would call an API
      // For now, we simulate progressive loading
      const response = await fetch(`/server/navigation/trees/${navigationState.currentTreeId}/load-depth`, {
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
        navigationState.setNodes(prevNodes => {
          const existingIds = new Set(prevNodes.map(n => n.id));
          const newNodes = data.nodes.filter((n: UINavigationNode) => !existingIds.has(n.id));
          return [...prevNodes, ...newNodes];
        });
        
        navigationState.setEdges(prevEdges => {
          const existingIds = new Set(prevEdges.map(e => e.id));
          const newEdges = data.edges.filter((e: UINavigationEdge) => !existingIds.has(e.id));
          return [...prevEdges, ...newEdges];
        });
        
        navigationState.setLoadedDepth(targetDepth);
        navigationState.setMaxDepth(data.max_depth || targetDepth);
        
        console.log(`[@hook:useNavigationEditor] Successfully loaded depth ${targetDepth}, max depth: ${data.max_depth}`);
      }
    } catch (error) {
      console.error(`[@hook:useNavigationEditor] Error loading children at depth ${targetDepth}:`, error);
    } finally {
      navigationState.setIsProgressiveLoading(false);
    }
  }, [navigationState]);

  // Handle menu node entry (when user "enters" a menu)
  const handleMenuEntry = useCallback(async (menuNode: UINavigationNode) => {
    console.log(`[@hook:useNavigationEditor] Entering menu: ${menuNode.data.label}`);
    
    const currentDepth = menuNode.data.depth || 0;
    const nextDepth = currentDepth + 1;
    
    // If we need to load more depth, do it progressively
    if (nextDepth > navigationState.loadedDepth) {
      await loadChildrenAtDepth(menuNode.id, nextDepth);
    }
    
    // Filter nodes to show only relevant ones for current context
    const relevantNodes = navigationState.allNodes.filter(node => {
      const nodeDepth = node.data.depth || 0;
      // Show current menu and its immediate children
      return nodeDepth <= nextDepth && 
             (nodeDepth <= currentDepth || (node.data.parent && node.data.parent.includes(menuNode.id)));
    });
    
    navigationState.setNodes(relevantNodes);
  }, [navigationState, loadChildrenAtDepth]);

  // Update available focus nodes when all nodes change
  useEffect(() => {
    console.log(`[@hook:useNavigationEditor] All nodes updated - ${navigationState.allNodes.length} total nodes:`);
    navigationState.allNodes.forEach(node => {
      const parentChain = node.data.parent ? node.data.parent.join(' > ') : 'none';
      console.log(`[@hook:useNavigationEditor] Node: ${node.data.label} (id: ${node.id}, depth: ${node.data.depth || 0}, parent: ${parentChain}, type: ${node.data.type})`);
    });
    
    const focusableNodes = navigationState.allNodes
      .filter(node => node.data.type === 'menu' || node.data.is_root)
      .map(node => ({
        id: node.id,
        label: node.data.label,
        depth: node.data.depth || 0
      }))
      .sort((a, b) => a.depth - b.depth || a.label.localeCompare(b.label));
    
    navigationState.setAvailableFocusNodes(focusableNodes);
  }, [navigationState.allNodes]);

  // Debug: Track changes to edges arrays
  useEffect(() => {
    console.log(`[@hook:useNavigationEditor] Filtered edges changed - count: ${navigationState.edges.length}`);
    navigationState.edges.forEach((edge, index) => {
      console.log(`[@hook:useNavigationEditor] Filtered edge ${index}: ${edge.id} (${edge.source} → ${edge.target})`);
    });
  }, [navigationState.edges]);

  useEffect(() => {
    console.log(`[@hook:useNavigationEditor] All edges changed - count: ${navigationState.allEdges.length}`);
    navigationState.allEdges.forEach((edge, index) => {
      console.log(`[@hook:useNavigationEditor] All edge ${index}: ${edge.id} (${edge.source} → ${edge.target})`);
    });
  }, [navigationState.allEdges]);

  // Focus on specific node (dropdown selection)
  const setFocusNode = useCallback((nodeId: string | null) => {
    console.log(`[@hook:useNavigationEditor] Setting focus node: ${nodeId}`);
    navigationState.setFocusNodeId(nodeId);
    
    // Removed auto-fit view - let user manually fit view if needed
  }, [navigationState]);

  // Set max display depth (dropdown selection)
  const setDisplayDepth = useCallback((depth: number) => {
    console.log(`[@hook:useNavigationEditor] Setting display depth: ${depth}`);
    navigationState.setMaxDisplayDepth(depth);
    
    // Removed auto-fit view - let user manually fit view if needed
  }, [navigationState]);

  // Reset focus to show all root level nodes
  const resetFocus = useCallback(() => {
    console.log(`[@hook:useNavigationEditor] Resetting focus to All and D1`);
    navigationState.setFocusNodeId(null);
    navigationState.setMaxDisplayDepth(5);
    
    // Removed auto-fit view - let user manually fit view if needed
  }, [navigationState]);

  return {
    // State
    nodes: navigationState.nodes,
    edges: navigationState.edges,
    treeName: navigationState.currentTreeName,
    isLoadingInterface: navigationState.isLoadingInterface,
    selectedNode: navigationState.selectedNode,
    selectedEdge: navigationState.selectedEdge,
    isNodeDialogOpen: navigationState.isNodeDialogOpen,
    isEdgeDialogOpen: navigationState.isEdgeDialogOpen,
    nodeForm: navigationState.nodeForm,
    edgeForm: navigationState.edgeForm,
    isLoading: navigationState.isSaving,
    error: navigationState.saveError,
    success: navigationState.saveSuccess ? 'Navigation tree saved successfully!' : null,
    pendingConnection,
    reactFlowWrapper: navigationState.reactFlowWrapper,
    reactFlowInstance: navigationState.reactFlowInstance,
    treeId: navigationState.currentTreeId,
    interfaceId: navigationState.interfaceId,
    
    // Tree state (simplified)
    currentTreeId: navigationState.currentTreeId,
    currentTreeName: navigationState.currentTreeName,
    navigationPath: navigationState.navigationPath,
    navigationNamePath: navigationState.navigationNamePath,
    hasUnsavedChanges: navigationState.hasUnsavedChanges,
    isDiscardDialogOpen: navigationState.isDiscardDialogOpen,
    userInterface: navigationState.userInterface,
    rootTree: navigationState.rootTree,
    
    // History state
    history: navigationState.history,
    historyIndex: navigationState.historyIndex,
    
    // All nodes and edges (for filtering)
    allNodes: navigationState.allNodes,
    allEdges: navigationState.allEdges,
    
    // View state for single-level navigation
    viewPath: navigationState.viewPath,
    
    // Tree filtering state and functions
    focusNodeId: navigationState.focusNodeId,
    maxDisplayDepth: navigationState.maxDisplayDepth,
    availableFocusNodes: navigationState.availableFocusNodes,
    getFilteredNodes,
    isNodeDescendantOf,
    getFilteredEdges,
    setFocusNode,
    setDisplayDepth,
    resetFocus,
    
    // Progressive loading state and functions
    loadedDepth: navigationState.loadedDepth,
    maxDepth: navigationState.maxDepth,
    isProgressiveLoading: navigationState.isProgressiveLoading,
    loadChildrenAtDepth,
    handleMenuEntry,
    
    // Setters
    setNodes: navigationState.setNodes,
    setEdges: navigationState.setEdges,
    setAllNodes: navigationState.setAllNodes,
    setHasUnsavedChanges: navigationState.setHasUnsavedChanges,
    setTreeName: navigationState.setCurrentTreeName,
    setIsLoadingInterface: navigationState.setIsLoadingInterface,
    setSelectedNode: navigationState.setSelectedNode,
    setSelectedEdge: navigationState.setSelectedEdge,
    setIsNodeDialogOpen: navigationState.setIsNodeDialogOpen,
    setIsEdgeDialogOpen: navigationState.setIsEdgeDialogOpen,
    setNodeForm: navigationState.setNodeForm,
    setEdgeForm: navigationState.setEdgeForm,
    setIsLoading: navigationState.setIsSaving,
    setError: navigationState.setSaveError,
    setSuccess: navigationState.setSaveSuccess,
    setPendingConnection,
    setReactFlowInstance: navigationState.setReactFlowInstance,
    setIsDiscardDialogOpen: navigationState.setIsDiscardDialogOpen,
    
    // Event handlers
    onNodesChange: customOnNodesChange,
    onEdgesChange: onEdgesChangeWithHistory,
    onConnect: onConnectHistory,
    onNodeClick,
    onEdgeClick,
    onNodeDoubleClick: onNodeDoubleClickUpdated,
    onPaneClick,
    
    // Actions from CRUD hook (legacy database operations)
    loadFromDatabase: crudHook.loadFromDatabase,
    saveToDatabase: crudHook.saveToDatabase,
    createEmptyTree: crudHook.createEmptyTree,
    convertTreeData: crudHook.convertToNavigationTreeData,
    
    // Actions from Config hook (new JSON config file operations)
    loadFromConfig: configHook.loadFromConfig,
    saveToConfig: configHook.saveToConfig,
    listAvailableTrees: configHook.listAvailableTrees,
    createEmptyTreeConfig: configHook.createEmptyTree,
    
    // Lock management from Config hook
    isLocked: configHook.isLocked,
    lockInfo: configHook.lockInfo,
    sessionId: configHook.sessionId,
    lockNavigationTree: configHook.lockNavigationTree,
    unlockNavigationTree: configHook.unlockNavigationTree,
    checkTreeLockStatus: configHook.checkTreeLockStatus,
    setupAutoUnlock: configHook.setupAutoUnlock,
    
    // Actions from Node/Edge management hook
    handleNodeFormSubmit: nodeEdgeHook.saveNodeChanges,
    handleEdgeFormSubmit: nodeEdgeHook.saveEdgeChanges,
    handleDeleteNode: nodeEdgeHook.deleteSelected,
    handleDeleteEdge: nodeEdgeHook.deleteSelected,
    addNewNode: nodeEdgeHook.addNewNode,
    cancelNodeChanges: nodeEdgeHook.cancelNodeChanges,
    closeSelectionPanel: nodeEdgeHook.closeSelectionPanel,
    deleteSelected: nodeEdgeHook.deleteSelected,
    resetNode: nodeEdgeHook.resetNode,
    
    // Actions from History hook
    undo: historyHook.undo,
    redo: historyHook.redo,
    
    // Additional actions
    discardChanges,
    performDiscardChanges,
    fitView,
    
    // Navigation actions
    navigateToTreeLevel,
    goBackToParent,
    navigateToParentView,
    navigateToParent,
    
    // Configuration
    defaultEdgeOptions,
    
    // Connection rules and debugging
    getConnectionRulesSummary: getRulesSummary,
  };
}; 