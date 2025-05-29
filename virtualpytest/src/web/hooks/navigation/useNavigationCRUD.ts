import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UINavigationNode, UINavigationEdge, NavigationTreeData } from '../../types/navigationTypes';

// API helper functions to call the Python backend
const API_BASE_URL = 'http://localhost:5009';
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
  isSaving: boolean;
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
        const actualTreeName = treeInfo.name || state.currentTreeName || 'Unnamed Tree';
        
        console.log(`[@hook:useNavigationCRUD] Loaded tree with ${treeData.nodes?.length || 0} nodes and ${treeData.edges?.length || 0} edges from database`);
        
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
          state.setAllNodes(treeData.nodes);
          state.setInitialState({ nodes: treeData.nodes, edges: treeData.edges || [] });
          console.log(`[@hook:useNavigationCRUD] Successfully loaded ${treeData.nodes.length} nodes from database for tree ID: ${state.currentTreeId}`);
          
          // Initialize view state - use first node as root
          const rootNode = treeData.nodes[0];
          if (rootNode) {
            state.setCurrentViewRootId(rootNode.id);
            state.setViewPath([{ id: rootNode.id, name: rootNode.data.label }]);
          }
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
      
      // Check if tree exists
      const checkResponse = await apiCall(`/api/navigation/trees/${state.currentTreeId}/complete`);
      
      if (checkResponse.success && (checkResponse.tree_info || checkResponse.tree_data)) {
        // Tree exists, update it
        console.log(`[@hook:useNavigationCRUD] Updating existing tree with ID: ${state.currentTreeId}`);
        
        const updateData = {
          tree_data: {
            nodes: state.nodes,
            edges: state.edges
          }
        };
        
        const updateResponse = await apiCall(`/api/navigation/trees/${state.currentTreeId}/complete`, {
          method: 'PUT',
          body: JSON.stringify(updateData),
        });
        
        if (updateResponse.success) {
          console.log(`[@hook:useNavigationCRUD] Successfully updated complete tree ID: ${state.currentTreeId}`);
          state.setInitialState({ nodes: [...state.nodes], edges: [...state.edges] });
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
          is_root: state.allNodes.length === 0 || !state.allNodes.some(node => node.data.is_root),
          tree_data: {
            nodes: state.nodes,
            edges: state.edges
          }
        };
        
        const createResponse = await apiCall('/api/navigation/trees', {
          method: 'POST',
          body: JSON.stringify(treeData),
        });
        
        if (createResponse.success) {
          console.log(`[@hook:useNavigationCRUD] Successfully created new tree with ID: ${createResponse.data.id}`);
          state.setInitialState({ nodes: [...state.nodes], edges: [...state.edges] });
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