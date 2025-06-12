import { useState, useCallback, useRef } from 'react';
import { UINavigationNode, UINavigationEdge } from '../../types/pages/Navigation_Types';
import { useRegistration } from '../../contexts/RegistrationContext';

interface NavigationConfigState {
  currentTreeName: string;
  setCurrentTreeName: (name: string) => void;
  setNodes: (nodes: UINavigationNode[]) => void;
  setEdges: (edges: UINavigationEdge[]) => void;
  setInitialState: (state: { nodes: UINavigationNode[], edges: UINavigationEdge[] } | null) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setSaveError: (error: string | null) => void;
  setSaveSuccess: (success: boolean) => void;
  setIsSaving: (saving: boolean) => void;
  nodes: UINavigationNode[];
  edges: UINavigationEdge[];
  isSaving: boolean;
  setUserInterface: (userInterface: any | null) => void;
}

export const useNavigationConfig = (state: NavigationConfigState) => {
  // Get buildServerUrl from registration context
  const { buildServerUrl } = useRegistration();
  
  // Helper to get or create session ID
  const getSessionId = () => {
    let id = sessionStorage.getItem('navigation-session-id');
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem('navigation-session-id', id);
    }
    return id;
  };
  
  // Session ID for lock management - persist across page reloads
  const sessionId = useRef<string>(getSessionId());
  const [isLocked, setIsLocked] = useState(false);
  const [lockInfo, setLockInfo] = useState<any>(null);
  const [isCheckingLock, setIsCheckingLock] = useState(false); // Start as false, only true when actively checking
  const [showReadOnlyOverlay, setShowReadOnlyOverlay] = useState(false); // Only true when definitively locked by someone else

  // Set checking lock state immediately (fixes race condition)
  const setCheckingLockState = useCallback((checking: boolean) => {
    setIsCheckingLock(checking);
  }, []);

  // Lock a navigation tree for editing
  const lockNavigationTree = useCallback(async (treeName: string): Promise<boolean> => {
    try {
      console.log(`[@hook:useNavigationConfig:lockNavigationTree] Attempting to lock tree: ${treeName}`);
      setIsCheckingLock(true);
      
      const response = await fetch(buildServerUrl(`/server/navigation/config/trees/${treeName}/lock`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId.current
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setIsLocked(true);
        setLockInfo({
          locked_by: sessionId.current,
          locked_at: data.locked_at
        });
        setShowReadOnlyOverlay(false); // We have the lock
        console.log(`[@hook:useNavigationConfig:lockNavigationTree] Successfully locked tree: ${treeName}`);
        return true;
      } else {
        console.log(`[@hook:useNavigationConfig:lockNavigationTree] Failed to lock tree: ${data.error}`);
        setIsLocked(false);
        setLockInfo(data.current_lock);
        setShowReadOnlyOverlay(true); // Someone else has the lock
        return false;
      }
    } catch (error) {
      console.error(`[@hook:useNavigationConfig:lockNavigationTree] Error locking tree:`, error);
      setIsLocked(false);
      setShowReadOnlyOverlay(true); // Assume locked on error
      return false;
    } finally {
      setIsCheckingLock(false);
    }
  }, []);

  // Unlock a navigation tree
  const unlockNavigationTree = useCallback(async (treeName: string): Promise<boolean> => {
    try {
      console.log(`[@hook:useNavigationConfig:unlockNavigationTree] Attempting to unlock tree: ${treeName}`);
      
      const response = await fetch(buildServerUrl(`/server/navigation/config/trees/${treeName}/unlock`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId.current
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setIsLocked(false);
        setLockInfo(null);
        console.log(`[@hook:useNavigationConfig:unlockNavigationTree] Successfully unlocked tree: ${treeName}`);
        return true;
      } else {
        console.log(`[@hook:useNavigationConfig:unlockNavigationTree] Failed to unlock tree: ${data.error}`);
        return false;
      }
    } catch (error) {
      console.error(`[@hook:useNavigationConfig:unlockNavigationTree] Error unlocking tree:`, error);
      return false;
    }
  }, []);

  // Load tree from config file
  const loadFromConfig = useCallback(async (treeName: string) => {
    try {
      state.setIsLoading(true);
      state.setError(null);
      
      const response = await fetch(buildServerUrl(`/server/navigation/config/trees/${treeName}`), {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.tree_data) {
        const treeData = data.tree_data;
        
        
        // Update state with loaded data
        const nodes = treeData.nodes || [];
        const edges = treeData.edges || [];
        
        state.setNodes(nodes);
        state.setEdges(edges);
        // setAllNodes/setAllEdges removed - using single source of truth
        
        // Set userInterface data from response if available
        if (data.userinterface) {
          state.setUserInterface(data.userinterface);
        } else {
          state.setUserInterface(null);
        }
        
        // Set initial state for change tracking
        state.setInitialState({ nodes: [...nodes], edges: [...edges] });
        
        // Clear unsaved changes
        state.setHasUnsavedChanges(false);
        
        // Update lock info
        setIsLocked(data.is_locked);
        setLockInfo(data.lock_info);
        setIsCheckingLock(false); // Lock check is complete when tree data is loaded
        
        // Show overlay only if locked by someone else
        const isLockedByOther = data.is_locked && data.lock_info?.locked_by !== sessionId.current;
        setShowReadOnlyOverlay(isLockedByOther);
        
        console.log(`[@hook:useNavigationConfig:loadFromConfig] Successfully loaded tree: ${treeName}`);
      } else {
        throw new Error(data.error || 'Failed to load navigation tree from config');
      }
    } catch (error) {
      console.error(`[@hook:useNavigationConfig:loadFromConfig] Error loading tree:`, error);
      state.setError(error instanceof Error ? error.message : 'Failed to load navigation tree');
    } finally {
      state.setIsLoading(false);
      setIsCheckingLock(false); // Ensure lock check is marked complete even on error
    }
  }, [state]);

  // Save tree to config file
  const saveToConfig = useCallback(async (treeName: string) => {
    if (state.isSaving) return;

    try {
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

      const response = await fetch(buildServerUrl(`/server/navigation/saveTree/${treeName}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(saveData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        console.log(`[@hook:useNavigationConfig:saveToConfig] Successfully saved tree: ${treeName}`);
        console.log(`[@hook:useNavigationConfig:saveToConfig] Git result:`, data.git_result);
        
        // Update initial state for change tracking
        state.setInitialState({ nodes: [...nodesToSave], edges: [...edgesToSave] });
        state.setHasUnsavedChanges(false);
        state.setSaveSuccess(true);

        setTimeout(() => state.setSaveSuccess(false), 3000);
      } else {
        throw new Error(data.error || 'Failed to save navigation tree to config');
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
      
      const response = await fetch(buildServerUrl('/server/navigation/config/trees'), {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        console.log(`[@hook:useNavigationConfig:listAvailableTrees] Found ${data.trees.length} trees`);
        return data.trees;
      } else {
        throw new Error(data.error || 'Failed to list navigation trees');
      }
    } catch (error) {
      console.error(`[@hook:useNavigationConfig:listAvailableTrees] Error listing trees:`, error);
      return [];
    }
  }, []);

  // Check if tree is locked by another session
  const checkTreeLockStatus = useCallback(async (treeName: string) => {
    try {
      const response = await fetch(buildServerUrl(`/server/navigation/config/trees/${treeName}`), {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setIsLocked(data.is_locked);
        setLockInfo(data.lock_info);
        return {
          isLocked: data.is_locked,
          lockInfo: data.lock_info,
          isLockedByCurrentSession: data.lock_info?.locked_by === sessionId.current
        };
      }
      return { isLocked: false, lockInfo: null, isLockedByCurrentSession: false };
    } catch (error) {
      console.error(`[@hook:useNavigationConfig:checkTreeLockStatus] Error checking lock status:`, error);
      return { isLocked: false, lockInfo: null, isLockedByCurrentSession: false };
    }
  }, []);

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
          buildServerUrl(`/server/navigation/config/trees/${treeName}/unlock`),
          new Blob([unlockData], { type: 'application/json' })
        );
        // Clean up session storage
        sessionStorage.removeItem('navigation-session-id');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isLocked, buildServerUrl]);

  return {
    // Lock management
    isLocked,
    lockInfo,
    isCheckingLock,
    showReadOnlyOverlay,
    setCheckingLockState,
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