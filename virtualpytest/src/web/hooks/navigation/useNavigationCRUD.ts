import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UINavigationNode, UINavigationEdge, NavigationTreeData } from '../../types/navigationTypes';

// Get server port from environment variable with fallback to 5119
const getServerPort = () => {
  return (import.meta as any).env.VITE_SERVER_PORT || '5119';
};

const API_BASE_URL = `http://localhost:${getServerPort()}`;
const DEFAULT_TEAM_ID = "7fdeb4bb-3639-4ec3-959f-b54769a219ce";

const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const teamId = localStorage.getItem('teamId') || sessionStorage.getItem('teamId') || DEFAULT_TEAM_ID;
  
  console.log(`[@hook:useNavigationCRUD:apiCall] Making API call to ${endpoint} with team_id: ${teamId}`);
  
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-Team-ID': teamId,
      ...options.headers,
    },
    ...options,
  });
  
  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error(`[@hook:useNavigationCRUD:apiCall] API call failed: ${response.status} - ${errorText}`);
    throw new Error(`API call failed: ${response.status}`);
  }
  
  return response.json();
};

interface CRUDState {
  currentTreeId: string;
  currentTreeName: string;
  setCurrentTreeId: (id: string) => void;
  setCurrentTreeName: (name: string) => void;
  setNavigationPath: (path: string[]) => void;
  setNavigationNamePath: (path: string[]) => void;
  setNodes: (nodes: UINavigationNode[]) => void;
  setEdges: (edges: UINavigationEdge[]) => void;
  setAllNodes: (nodes: UINavigationNode[]) => void;
  setAllEdges: (edges: UINavigationEdge[]) => void;
  setInitialState: (state: { nodes: UINavigationNode[], edges: UINavigationEdge[] } | null) => void;
  setHistory: (history: { nodes: UINavigationNode[], edges: UINavigationEdge[] }[]) => void;
  setHistoryIndex: (index: number) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSaveError: (error: string | null) => void;
  setSaveSuccess: (success: boolean) => void;
  setIsSaving: (saving: boolean) => void;
  setCurrentViewRootId: (id: string | null) => void;
  setViewPath: (path: {id: string, name: string}[]) => void;
  nodes: UINavigationNode[];
  edges: UINavigationEdge[];
  allNodes: UINavigationNode[];
  allEdges: UINavigationEdge[];
  isSaving: boolean;
  setUserInterface: (userInterface: any | null) => void;
}

export const useNavigationCRUD = (state: CRUDState) => {
  const navigate = useNavigate();

  // Create an empty tree structure
  const createEmptyTree = useCallback((): { nodes: UINavigationNode[], edges: UINavigationEdge[] } => {
    console.log('[@hook:useNavigationCRUD] Creating empty tree structure');
    
    const entryNode: UINavigationNode = {
      id: 'entry-node',
      type: 'uiScreen',
      position: { x: 250, y: 100 },
      data: {
        label: 'Entry Point',
        type: 'screen',
        description: 'Starting point of the navigation flow',
        is_root: true
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
      console.log(`[@hook:useNavigationCRUD] Loading complete tree from database: ${state.currentTreeId}`);
      state.setIsLoading(true);
      state.setError(null);
      
      const response = await apiCall(`/api/navigation/trees/${state.currentTreeId}/complete`);
      
      if (response.success && (response.tree_info || response.tree_data)) {
        const treeInfo = response.tree_info || {};
        const treeData = response.tree_data || { nodes: [], edges: [] };
        const userInterface = response.userinterface || null;
        const actualTreeName = treeInfo.name || state.currentTreeName || 'Unnamed Tree';
        
        console.log(`[@hook:useNavigationCRUD] Loaded tree with ${treeData.nodes?.length || 0} nodes and ${treeData.edges?.length || 0} edges from database`);
        
        // Set userInterface if available
        if (userInterface) {
          console.log(`[@hook:useNavigationCRUD] Setting userInterface: ${userInterface.name} with models: ${userInterface.models || []}`);
          state.setUserInterface(userInterface);
        } else {
          console.log(`[@hook:useNavigationCRUD] No userInterface found for tree: ${state.currentTreeId}`);
          state.setUserInterface(null);
        }
        
        // Update the URL if the name in the database is different
        if (state.currentTreeName !== actualTreeName) {
          navigate(`/navigation-editor/${encodeURIComponent(actualTreeName)}/${state.currentTreeId}`);
          state.setCurrentTreeName(actualTreeName);
          state.setNavigationNamePath(prev => {
            const newPath = [...prev];
            newPath[newPath.length - 1] = actualTreeName;
            return newPath;
          });
        } else {
          state.setCurrentTreeName(actualTreeName);
        }
        
        // Validate that we have nodes and edges
        if (treeData.nodes && Array.isArray(treeData.nodes)) {
          // Ensure all nodes have valid position data to prevent auto-positioning
          const validatedNodes = treeData.nodes.map((node: UINavigationNode, index: number) => {
            // Check if position is missing or invalid
            if (!node.position || 
                typeof node.position.x !== 'number' || 
                typeof node.position.y !== 'number' ||
                isNaN(node.position.x) || 
                isNaN(node.position.y)) {
              
              console.log(`[@hook:useNavigationCRUD] Node ${node.data?.label || node.id} missing or invalid position, setting default position`);
              
              // Provide a default position to prevent auto-positioning
              // Use a grid layout for nodes without positions
              const defaultX = 200 + (index % 5) * 250; // 5 columns
              const defaultY = 100 + Math.floor(index / 5) * 150; // Row spacing
              
              return {
                ...node,
                position: { x: defaultX, y: defaultY }
              };
            }
            
            // Check if position is unreasonably far outside typical bounds
            // React Flow might auto-correct positions that are too extreme
            const REASONABLE_BOUNDS = {
              minX: -5000,
              maxX: 10000,
              minY: -5000,
              maxY: 10000
            };
            
            if (node.position.x < REASONABLE_BOUNDS.minX || 
                node.position.x > REASONABLE_BOUNDS.maxX ||
                node.position.y < REASONABLE_BOUNDS.minY || 
                node.position.y > REASONABLE_BOUNDS.maxY) {
              
              console.log(`[@hook:useNavigationCRUD] Node ${node.data?.label || node.id} position outside reasonable bounds (${node.position.x}, ${node.position.y}), repositioning`);
              
              // Reposition to a safe location
              const safeX = Math.max(REASONABLE_BOUNDS.minX + 100, Math.min(node.position.x, REASONABLE_BOUNDS.maxX - 100));
              const safeY = Math.max(REASONABLE_BOUNDS.minY + 100, Math.min(node.position.y, REASONABLE_BOUNDS.maxY - 100));
              
              return {
                ...node,
                position: { x: safeX, y: safeY }
              };
            }
            
            // Position is valid, keep as is
            return node;
          });
          
          console.log(`[@hook:useNavigationCRUD] Validated ${validatedNodes.length} nodes with positions`);
          
          state.setAllNodes(validatedNodes);
          state.setInitialState({ nodes: validatedNodes, edges: treeData.edges || [] });
          console.log(`[@hook:useNavigationCRUD] Successfully loaded ${validatedNodes.length} nodes from database for tree ID: ${state.currentTreeId}`);
          
          // Initialize view state - use first node as root
          const rootNode = validatedNodes[0];
          if (rootNode) {
            state.setCurrentViewRootId(rootNode.id);
            state.setViewPath([{ id: rootNode.id, name: rootNode.data.label }]);
          }
          
          // Small delay to ensure React Flow has processed positions before any filtering
          setTimeout(() => {
            console.log(`[@hook:useNavigationCRUD] Position validation complete, ready for filtering`);
          }, 100);
        } else {
          state.setAllNodes([]);
          state.setInitialState({ nodes: [], edges: [] });
          state.setCurrentViewRootId(null);
          state.setViewPath([]);
          console.log(`[@hook:useNavigationCRUD] No nodes found for tree ID: ${state.currentTreeId}`);
        }
        
        if (treeData.edges && Array.isArray(treeData.edges)) {
          state.setAllEdges(treeData.edges);
          console.log(`[@hook:useNavigationCRUD] Successfully loaded ${treeData.edges.length} edges from database for tree ID: ${state.currentTreeId}`);
        } else {
          state.setAllEdges([]);
          console.log(`[@hook:useNavigationCRUD] No edges found for tree ID: ${state.currentTreeId}`);
        }
        
        // Initialize history with loaded data
        state.setHistory([{ nodes: treeData.nodes || [], edges: treeData.edges || [] }]);
        state.setHistoryIndex(0);
        state.setHasUnsavedChanges(false);
        state.setSaveError(null);
        state.setSaveSuccess(false);
      } else {
        console.error(`[@hook:useNavigationCRUD] Tree ${state.currentTreeId} not found in database`);
        state.setError(`Tree with ID ${state.currentTreeId} not found in database. Please select a valid tree.`);
        state.setAllNodes([]);
        state.setAllEdges([]);
        state.setInitialState(null);
        state.setHistory([]);
        state.setHistoryIndex(-1);
        state.setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error(`[@hook:useNavigationCRUD] Error loading tree from database:`, error);
      state.setError(`Failed to load tree: ${error instanceof Error ? error.message : 'Unknown error'}`);
      state.setAllNodes([]);
      state.setAllEdges([]);
      state.setInitialState(null);
      state.setHistory([]);
      state.setHistoryIndex(-1);
      state.setHasUnsavedChanges(false);
    } finally {
      state.setIsLoading(false);
    }
  }, [state, navigate]);

  // Save to database function
  const saveToDatabase = useCallback(async () => {
    if (state.isSaving) return;
    
    state.setIsSaving(true);
    state.setSaveError(null);
    state.setSaveSuccess(false);
    
    try {
      console.log(`[@hook:useNavigationCRUD] Starting save to database for tree: ${state.currentTreeId}`);
      
      // DEBUG: Log the exact state being saved
      console.log(`[@hook:useNavigationCRUD] DEBUG - allNodes:`, state.allNodes);
      console.log(`[@hook:useNavigationCRUD] DEBUG - allEdges:`, state.allEdges);
      console.log(`[@hook:useNavigationCRUD] DEBUG - filtered nodes:`, state.nodes);
      console.log(`[@hook:useNavigationCRUD] DEBUG - filtered edges:`, state.edges);
      
      // Ensure allNodes and allEdges are defined
      const nodesToSave = state.allNodes || [];
      const edgesToSave = state.allEdges || [];
      
      console.log(`[@hook:useNavigationCRUD] Saving ${nodesToSave.length} total nodes and ${edgesToSave.length} total edges`);
      
      // Check if tree exists
      const checkResponse = await apiCall(`/api/navigation/trees/${state.currentTreeId}/complete`);
      
      if (checkResponse.success && (checkResponse.tree_info || checkResponse.tree_data)) {
        // Tree exists, update it
        console.log(`[@hook:useNavigationCRUD] Updating existing tree with ID: ${state.currentTreeId}`);
        
        const updateData = {
          tree_data: {
            nodes: nodesToSave,  // Use safe nodes array
            edges: edgesToSave   // Use safe edges array
          }
        };
        
        const updateResponse = await apiCall(`/api/navigation/trees/${state.currentTreeId}/complete`, {
          method: 'PUT',
          body: JSON.stringify(updateData),
        });
        
        if (updateResponse.success) {
          console.log(`[@hook:useNavigationCRUD] Successfully updated complete tree ID: ${state.currentTreeId}`);
          state.setInitialState({ nodes: [...nodesToSave], edges: [...edgesToSave] });
          state.setHasUnsavedChanges(false);
          state.setSaveSuccess(true);
          
          setTimeout(() => state.setSaveSuccess(false), 3000);
        } else {
          throw new Error(updateResponse.error || 'Failed to update navigation tree');
        }
      } else {
        // Tree doesn't exist, create new one
        console.log(`[@hook:useNavigationCRUD] Creating new tree with ID: ${state.currentTreeId}`);
        
        const treeData = {
          name: state.currentTreeName || state.currentTreeId,
          description: `Navigation tree for ${state.currentTreeId}`,
          is_root: nodesToSave.length === 0 || !nodesToSave.some(node => node.data.is_root),
          tree_data: {
            nodes: nodesToSave,  // Use safe nodes array
            edges: edgesToSave   // Use safe edges array
          }
        };
        
        const createResponse = await apiCall('/api/navigation/trees', {
          method: 'POST',
          body: JSON.stringify(treeData),
        });
        
        if (createResponse.success) {
          console.log(`[@hook:useNavigationCRUD] Successfully created new tree with ID: ${createResponse.data.id}`);
          state.setInitialState({ nodes: [...nodesToSave], edges: [...edgesToSave] });
          state.setHasUnsavedChanges(false);
          state.setSaveSuccess(true);
          navigate(`/navigation-editor/${encodeURIComponent(state.currentTreeName || createResponse.data.name || 'Unnamed Tree')}/${createResponse.data.id}`);
          state.setCurrentTreeId(createResponse.data.id);
          state.setNavigationPath([createResponse.data.id]);
          
          setTimeout(() => state.setSaveSuccess(false), 3000);
        } else {
          throw new Error(createResponse.error || 'Failed to create navigation tree');
        }
      }
    } catch (error) {
      console.error(`[@hook:useNavigationCRUD] Error saving tree:`, error);
      state.setSaveError(error instanceof Error ? error.message : 'Failed to save navigation tree');
    } finally {
      state.setIsSaving(false);
    }
  }, [state, navigate]);

  // Convert tree data for export/import
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

  return {
    loadFromDatabase,
    saveToDatabase,
    createEmptyTree,
    convertToNavigationTreeData,
    convertFromNavigationTreeData,
  };
}; 