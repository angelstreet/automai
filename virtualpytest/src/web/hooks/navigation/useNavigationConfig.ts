import { useState, useCallback } from 'react';

import { useRegistration } from '../../contexts/RegistrationContext';
import {
  UINavigationNode,
  UINavigationEdge,
  NavigationConfigState,
} from '../../types/pages/Navigation_Types';

export const useNavigationConfig = (state: NavigationConfigState) => {
  const { buildServerUrl } = useRegistration();

  // Note: Using buildServerUrl instead of relative URLs to avoid CORS issues
  // This routes through the proper server URL configuration

  // Session ID for lock management - persist across page reloads
  // Use lazy initialization to ensure it's only created once
  const [sessionId] = useState(() => {
    let id = sessionStorage.getItem('navigation-session-id');
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem('navigation-session-id', id);
      console.log(`[@hook:useNavigationConfig:init] Created new session ID: ${id}`);
    } else {
      console.log(`[@hook:useNavigationConfig:init] Using existing session ID: ${id}`);
    }
    return id;
  });
  const [isLocked, setIsLocked] = useState(false);
  const [lockInfo, setLockInfo] = useState<any>(null);
  const [isCheckingLock, setIsCheckingLock] = useState(false); // Start as false, only true when actively checking
  const [showReadOnlyOverlay, setShowReadOnlyOverlay] = useState(false); // Only true when definitively locked by someone else

  // Helper function to check if a lock belongs to our session
  const isOurLock = useCallback((lockInfo: any): boolean => {
    if (!lockInfo) return false;
    const lockSession = lockInfo.session_id || lockInfo.locked_by;
    return lockSession === sessionId;
  }, []);

  // Set checking lock state immediately (fixes race condition)
  const setCheckingLockState = useCallback((checking: boolean) => {
    setIsCheckingLock(checking);
  }, []);

  // Lock a navigation tree for editing
  const lockNavigationTree = useCallback(
    async (treeName: string): Promise<boolean> => {
      try {
        setIsCheckingLock(true);

        const statusResponse = await fetch(
          buildServerUrl(`/server/navigation/config/trees/${treeName}`),
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        );

        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          if (statusData.success && statusData.is_locked && isOurLock(statusData.lock_info)) {
            // We already have the lock! Reclaim it.
            console.log(
              `[@hook:useNavigationConfig:lockNavigationTree] Reclaiming existing lock for tree: ${treeName} (same session)`,
            );
            setIsLocked(true);
            setLockInfo(statusData.lock_info);
            setShowReadOnlyOverlay(false);
            return true;
          }
        }

        // If we don't have the lock, try to acquire it normally
        console.log(
          `[@hook:useNavigationConfig:lockNavigationTree] Attempting to acquire new lock for tree: ${treeName}`,
        );
        const response = await fetch(
          buildServerUrl(`/server/navigation/config/trees/${treeName}/lock`),
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              session_id: sessionId,
            }),
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          setIsLocked(true);
          setLockInfo({
            locked_by: sessionId,
            locked_at: data.locked_at,
          });
          setShowReadOnlyOverlay(false); // We have the lock
          console.log(
            `[@hook:useNavigationConfig:lockNavigationTree] Successfully locked tree: ${treeName}`,
          );
          return true;
        } else {
          console.log(
            `[@hook:useNavigationConfig:lockNavigationTree] Failed to lock tree: ${data.error}`,
          );
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
    },
    [buildServerUrl],
  );

  // Unlock a navigation tree
  const unlockNavigationTree = useCallback(
    async (treeName: string): Promise<boolean> => {
      try {
        console.log(
          `[@hook:useNavigationConfig:unlockNavigationTree] Attempting to unlock tree: ${treeName}`,
        );

        const response = await fetch(
          buildServerUrl(`/server/navigation/config/trees/${treeName}/unlock`),
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              session_id: sessionId,
            }),
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          setIsLocked(false);
          setLockInfo(null);
          console.log(
            `[@hook:useNavigationConfig:unlockNavigationTree] Successfully unlocked tree: ${treeName}`,
          );
          return true;
        } else {
          console.log(
            `[@hook:useNavigationConfig:unlockNavigationTree] Failed to unlock tree: ${data.error}`,
          );
          return false;
        }
      } catch (error) {
        console.error(
          `[@hook:useNavigationConfig:unlockNavigationTree] Error unlocking tree:`,
          error,
        );
        return false;
      }
    },
    [buildServerUrl],
  );

  // Load tree from config file
  const loadFromConfig = useCallback(
    async (treeName: string) => {
      try {
        state.setIsLoading(true);
        state.setError(null);

        const response = await fetch(
          buildServerUrl(`/server/navigation/config/trees/${treeName}`),
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        );

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

          // IMPORTANT: Do NOT set userInterface data from config file
          // Interface metadata should only come from database to avoid model conflicts
          // The config file may have outdated interface models that conflict with database
          console.log(
            `[@hook:useNavigationConfig:loadFromConfig] Ignoring userInterface from config file to prevent model conflicts`,
          );

          // Set initial state for change tracking
          state.setInitialState({ nodes: [...nodes], edges: [...edges] });

          // Clear unsaved changes
          state.setHasUnsavedChanges(false);

          // Update lock info
          setIsLocked(data.is_locked);
          setLockInfo(data.lock_info);
          setIsCheckingLock(false); // Lock check is complete when tree data is loaded

          // Show overlay only if locked by someone else
          const isLockedByOther = data.is_locked && !isOurLock(data.lock_info);
          setShowReadOnlyOverlay(isLockedByOther);

          // If locked by us (same session), we can reclaim it
          if (data.is_locked && isOurLock(data.lock_info)) {
            console.log(
              `[@hook:useNavigationConfig:loadFromConfig] Reclaiming lock during tree load for: ${treeName} (same session)`,
            );
            setIsLocked(true);
            setShowReadOnlyOverlay(false);
          }

          console.log(
            `[@hook:useNavigationConfig:loadFromConfig] Successfully loaded tree: ${treeName}`,
          );
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
    },
    [state, buildServerUrl],
  );

  // Save tree to config file
  const saveToConfig = useCallback(
    async (treeName: string) => {
      if (state.isSaving) return;

      try {
        state.setIsSaving(true);
        state.setSaveError(null);

        // Prepare safe arrays for saving
        const nodesToSave = Array.isArray(state.nodes) ? state.nodes : [];
        const edgesToSave = Array.isArray(state.edges) ? state.edges : [];

        console.log(
          `[@hook:useNavigationConfig:saveToConfig] Saving ${nodesToSave.length} nodes and ${edgesToSave.length} edges`,
        );

        const saveData = {
          session_id: sessionId,
          tree_data: {
            nodes: nodesToSave,
            edges: edgesToSave,
          },
        };

        const response = await fetch(
          buildServerUrl(`/server/navigation/config/saveTree/${treeName}`),
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(saveData),
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          console.log(
            `[@hook:useNavigationConfig:saveToConfig] Successfully saved tree: ${treeName}`,
          );
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
        state.setSaveError(
          error instanceof Error ? error.message : 'Failed to save navigation tree',
        );
      } finally {
        state.setIsSaving(false);
      }
    },
    [state, buildServerUrl],
  );

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
        console.log(
          `[@hook:useNavigationConfig:listAvailableTrees] Found ${data.trees.length} trees`,
        );
        return data.trees;
      } else {
        throw new Error(data.error || 'Failed to list navigation trees');
      }
    } catch (error) {
      console.error(`[@hook:useNavigationConfig:listAvailableTrees] Error listing trees:`, error);
      return [];
    }
  }, [buildServerUrl]);

  // Check if tree is locked by another session
  const checkTreeLockStatus = useCallback(
    async (treeName: string) => {
      try {
        const response = await fetch(
          buildServerUrl(`/server/navigation/config/trees/${treeName}`),
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        );

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
            isLockedByCurrentSession: data.lock_info?.locked_by === sessionId,
          };
        }
        return { isLocked: false, lockInfo: null, isLockedByCurrentSession: false };
      } catch (error) {
        console.error(
          `[@hook:useNavigationConfig:checkTreeLockStatus] Error checking lock status:`,
          error,
        );
        return { isLocked: false, lockInfo: null, isLockedByCurrentSession: false };
      }
    },
    [buildServerUrl],
  );

  // Create an empty tree structure
  const createEmptyTree = useCallback((): {
    nodes: UINavigationNode[];
    edges: UINavigationEdge[];
  } => {
    console.log('[@hook:useNavigationConfig:createEmptyTree] Creating empty tree structure');

    const entryNode: UINavigationNode = {
      id: 'entry-node',
      type: 'uiScreen',
      position: { x: 250, y: 100 },
      data: {
        label: 'Entry Point',
        type: 'screen',
        description: 'Starting point of the navigation flow',
        is_root: true,
      },
    };

    return {
      nodes: [entryNode],
      edges: [],
    };
  }, []);

  // Auto-unlock on page unload
  const setupAutoUnlock = useCallback(
    (treeName: string) => {
      const handleBeforeUnload = () => {
        if (isLocked) {
          // Use sendBeacon for reliable cleanup on page unload
          const unlockData = JSON.stringify({ session_id: sessionId });
          navigator.sendBeacon(
            buildServerUrl(`/server/navigation/config/trees/${treeName}/unlock`),
            new Blob([unlockData], { type: 'application/json' }),
          );
          // Clean up session storage
          sessionStorage.removeItem('navigation-session-id');
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    },
    [isLocked, buildServerUrl],
  );

  return {
    // Lock management
    isLocked,
    lockInfo,
    isCheckingLock,
    showReadOnlyOverlay,
    setCheckingLockState,
    sessionId,
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
