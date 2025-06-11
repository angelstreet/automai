import { useState, useCallback, useRef } from 'react';
import { UINavigationNode, UINavigationEdge } from '../../types/pages/Navigation_Types';

interface NavigationConfigState {
  currentTreeName: string;
  setCurrentTreeName: (name: string) => void;
  setNodes: (nodes: UINavigationNode[]) => void;
  setEdges: (edges: UINavigationEdge[]) => void;
  // setAllNodes/setAllEdges removed - using single source of truth
  setInitialState: (state: { nodes: UINavigationNode[], edges: UINavigationEdge[] } | null) => void;
  setHistory: (history: { nodes: UINavigationNode[], edges: UINavigationEdge[] }[]) => void;
  setHistoryIndex: (index: number) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSaveError: (error: string | null) => void;
  setSaveSuccess: (success: boolean) => void;
  setIsSaving: (saving: boolean) => void;
  nodes: UINavigationNode[];
  edges: UINavigationEdge[];
  // allNodes/allEdges removed - using single source of truth
  isSaving: boolean;
  apiCall: (endpoint: string, options?: RequestInit) => Promise<any>;
}

export const useNavigationConfig = (state: NavigationConfigState) => {
  // Session ID for lock management
  const sessionId = useRef<string>(crypto.randomUUID());
  const [isLocked, setIsLocked] = useState(false);
  const [lockInfo, setLockInfo] = useState<any>(null);

  // Lock a navigation tree for editing
  const lockNavigationTree = useCallback(async (treeName: string): Promise<boolean> => {
    try {
      console.log(`[@hook:useNavigationConfig:lockNavigationTree] Attempting to lock tree: ${treeName}`);
      
      const response = await state.apiCall(`/api/navigation/config/trees/${treeName}/lock`, {
        method: 'POST',
        body: JSON.stringify({
          session_id: sessionId.current
        }),
      });

      if (response.success) {
        setIsLocked(true);
        setLockInfo({
          locked_by: sessionId.current,
          locked_at: response.locked_at
        });
        console.log(`[@hook:useNavigationConfig:lockNavigationTree] Successfully locked tree: ${treeName}`);
        return true;
      } else {
        console.log(`[@hook:useNavigationConfig:lockNavigationTree] Failed to lock tree: ${response.error}`);
        setLockInfo(response.current_lock);
        return false;
      }
    } catch (error) {
      console.error(`[@hook:useNavigationConfig:lockNavigationTree] Error locking tree:`, error);
      return false;
    }
  }, [state.apiCall]);

  // Unlock a navigation tree
  const unlockNavigationTree = useCallback(async (treeName: string): Promise<boolean> => {
    try {
      console.log(`[@hook:useNavigationConfig:unlockNavigationTree] Attempting to unlock tree: ${treeName}`);
      
      const response = await state.apiCall(`/api/navigation/config/trees/${treeName}/unlock`, {
        method: 'POST',
        body: JSON.stringify({
          session_id: sessionId.current
        }),
      });

      if (response.success) {
        setIsLocked(false);
        setLockInfo(null);
        console.log(`[@hook:useNavigationConfig:unlockNavigationTree] Successfully unlocked tree: ${treeName}`);
        return true;
      } else {
        console.log(`[@hook:useNavigationConfig:unlockNavigationTree] Failed to unlock tree: ${response.error}`);
        return false;
      }
    } catch (error) {
      console.error(`[@hook:useNavigationConfig:unlockNavigationTree] Error unlocking tree:`, error);
      return false;
    }
  }, [state.apiCall]);

  // Load tree from config file
  const loadFromConfig = useCallback(async (treeName: string) => {
    try {
      console.log(`[@hook:useNavigationConfig:loadFromConfig] Loading tree from config: ${treeName}`);
      state.setIsLoading(true);
      state.setError(null);
      
      const response = await state.apiCall(`/api/navigation/config/trees/${treeName}`);
      
      if (response.success && response.tree_data) {
        const treeData = response.tree_data;
        
        console.log(`[@hook:useNavigationConfig:loadFromConfig] Loaded tree with ${treeData.nodes?.length || 0} nodes and ${treeData.edges?.length || 0} edges from config`);
        
        // Update state with loaded data
        const nodes = treeData.nodes || [];
        const edges = treeData.edges || [];
        
        state.setNodes(nodes);
        state.setEdges(edges);
        // setAllNodes/setAllEdges removed - using single source of truth
        
        // Set initial state for change tracking
        state.setInitialState({ nodes: [...nodes], edges: [...edges] });
        
        // Reset history
        state.setHistory([{ nodes: [...nodes], edges: [...edges] }]);
        state.setHistoryIndex(0);
        
        // Clear unsaved changes
        state.setHasUnsavedChanges(false);
        
        // Update lock info
        setIsLocked(response.is_locked);
        setLockInfo(response.lock_info);
        
        console.log(`[@hook:useNavigationConfig:loadFromConfig] Successfully loaded tree: ${treeName}`);
      } else {
        throw new Error(response.error || 'Failed to load navigation tree from config');
      }
    } catch (error) {
      console.error(`[@hook:useNavigationConfig:loadFromConfig] Error loading tree:`, error);
      state.setError(error instanceof Error ? error.message : 'Failed to load navigation tree');
    } finally {
      state.setIsLoading(false);
    }
  }, [state]);

  // Save tree to config file
  const saveToConfig = useCallback(async (treeName: string) => {
    if (state.isSaving) return;

    try {
      console.log(`[@hook:useNavigationConfig:saveToConfig] Saving tree to config: ${treeName}`);
      state.setIsSaving(true);
      state.setSaveError(null);

      // Prepare safe arrays for saving
      const nodesToSave = Array.isArray(state.nodes) ? state.nodes : [];
      const edgesToSave = Array.isArray(state.edges) ? state.edges : [];

      console.log(`[@hook:useNavigationConfig:saveToConfig] Saving ${nodesToSave.length} nodes and ${edgesToSave.length} edges`);

      const saveData = {
        session_id: sessionId.current,
        tree_data: {
          nodes: nodesToSave,
          edges: edgesToSave
        }
      };

      const response = await state.apiCall(`/api/navigation/config/trees/${treeName}`, {
        method: 'PUT',
        body: JSON.stringify(saveData),
      });

      if (response.success) {
        console.log(`[@hook:useNavigationConfig:saveToConfig] Successfully saved tree: ${treeName}`);
        console.log(`[@hook:useNavigationConfig:saveToConfig] Git result:`, response.git_result);
        
        // Update initial state for change tracking
        state.setInitialState({ nodes: [...nodesToSave], edges: [...edgesToSave] });
        state.setHasUnsavedChanges(false);
        state.setSaveSuccess(true);

        setTimeout(() => state.setSaveSuccess(false), 3000);
      } else {
        throw new Error(response.error || 'Failed to save navigation tree to config');
      }
    } catch (error) {
      console.error(`[@hook:useNavigationConfig:saveToConfig] Error saving tree:`, error);
      state.setSaveError(error instanceof Error ? error.message : 'Failed to save navigation tree');
    } finally {
      state.setIsSaving(false);
    }
  }, [state]);

  // List available navigation trees
  const listAvailableTrees = useCallback(async () => {
    try {
      console.log(`[@hook:useNavigationConfig:listAvailableTrees] Fetching available trees`);
      
      const response = await state.apiCall('/api/navigation/config/trees');
      
      if (response.success) {
        console.log(`[@hook:useNavigationConfig:listAvailableTrees] Found ${response.trees.length} trees`);
        return response.trees;
      } else {
        throw new Error(response.error || 'Failed to list navigation trees');
      }
    } catch (error) {
      console.error(`[@hook:useNavigationConfig:listAvailableTrees] Error listing trees:`, error);
      return [];
    }
  }, [state.apiCall]);

  // Check if tree is locked by another session
  const checkTreeLockStatus = useCallback(async (treeName: string) => {
    try {
      const response = await state.apiCall(`/api/navigation/config/trees/${treeName}`);
      
      if (response.success) {
        setIsLocked(response.is_locked);
        setLockInfo(response.lock_info);
        return {
          isLocked: response.is_locked,
          lockInfo: response.lock_info,
          isLockedByCurrentSession: response.lock_info?.locked_by === sessionId.current
        };
      }
      return { isLocked: false, lockInfo: null, isLockedByCurrentSession: false };
    } catch (error) {
      console.error(`[@hook:useNavigationConfig:checkTreeLockStatus] Error checking lock status:`, error);
      return { isLocked: false, lockInfo: null, isLockedByCurrentSession: false };
    }
  }, [state.apiCall]);

  // Create an empty tree structure
  const createEmptyTree = useCallback((): { nodes: UINavigationNode[], edges: UINavigationEdge[] } => {
    console.log('[@hook:useNavigationConfig:createEmptyTree] Creating empty tree structure');
    
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

  // Auto-unlock on page unload
  const setupAutoUnlock = useCallback((treeName: string) => {
    const handleBeforeUnload = () => {
      if (isLocked) {
        // Use sendBeacon for reliable cleanup on page unload
        const unlockData = JSON.stringify({ session_id: sessionId.current });
        navigator.sendBeacon(
          `/api/navigation/config/trees/${treeName}/unlock`,
          new Blob([unlockData], { type: 'application/json' })
        );
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isLocked]);

  return {
    // Lock management
    isLocked,
    lockInfo,
    sessionId: sessionId.current,
    lockNavigationTree,
    unlockNavigationTree,
    checkTreeLockStatus,
    setupAutoUnlock,
    
    // Config operations
    loadFromConfig,
    saveToConfig,
    listAvailableTrees,
    createEmptyTree,
  };
}; 