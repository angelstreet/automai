import { useState, useCallback } from 'react';

import {
  UINavigationNode,
  UINavigationEdge,
  NavigationConfigState,
} from '../../types/pages/Navigation_Types';
import { buildServerUrl } from '../../utils/frontendUtils';
import { useUserSession } from '../useUserSession';

export const useNavigationConfig = (state: NavigationConfigState) => {
  // Note: Using buildServerUrl instead of relative URLs to avoid CORS issues
  // This routes through the proper server URL configuration

  // Use shared user session for consistent identification
  const { userId, sessionId, isOurLock } = useUserSession();

  const [isLocked, setIsLocked] = useState(false);
  const [lockInfo, setLockInfo] = useState<any>(null);
  const [isCheckingLock, setIsCheckingLock] = useState(false); // Start as false, only true when actively checking
  const [showReadOnlyOverlay, setShowReadOnlyOverlay] = useState(false); // Only true when definitively locked by someone else

  // Set checking lock state immediately (fixes race condition)
  const setCheckingLockState = useCallback((checking: boolean) => {
    setIsCheckingLock(checking);
  }, []);

  // Lock a navigation tree with simplified user-based locking
  const lockNavigationTree = useCallback(
    async (treeName: string): Promise<boolean> => {
      try {
        setIsCheckingLock(true);
        console.log(
          `[@hook:useNavigationConfig:lockNavigationTree] Attempting to lock tree: ${treeName} with user ID: ${userId}`,
        );
        const response = await fetch(
          buildServerUrl(`/server/navigation/config/trees/${treeName}/lock`),
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              session_id: userId, // Use user ID as the lock identifier
            }),
          },
        );

        if (!response.ok) {
          // Handle 409 conflict - check if it's locked by us
          if (response.status === 409) {
            const conflictData = await response.json();
            if (conflictData.existing_lock && isOurLock(conflictData.existing_lock)) {
              console.log(
                `[@hook:useNavigationConfig:lockNavigationTree] Tree locked by same user, reclaiming: ${treeName}`,
              );
              setIsLocked(true);
              setLockInfo(conflictData.existing_lock);
              setShowReadOnlyOverlay(false);
              return true;
            }
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          setIsLocked(true);
          setLockInfo({
            locked_by: userId,
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
    [isOurLock, userId],
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
              session_id: userId, // Use user ID as the lock identifier
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
    [userId],
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

          // Use userInterface data from config file as single source of truth
          if (data.userinterface) {
            console.log(
              `[@hook:useNavigationConfig:loadFromConfig] Loading userInterface from config file: ${data.userinterface.name} with models: ${data.userinterface.models?.join(', ') || 'none'}`,
            );
            state.setUserInterface(data.userinterface);
          } else {
            console.log(
              `[@hook:useNavigationConfig:loadFromConfig] No userInterface data found in config file for tree: ${treeName}`,
            );
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
          const isLockedByOther = data.is_locked && !isOurLock(data.lock_info);
          setShowReadOnlyOverlay(isLockedByOther);

          // If locked by us (same user), we can reclaim it
          if (data.is_locked && isOurLock(data.lock_info)) {
            console.log(
              `[@hook:useNavigationConfig:loadFromConfig] Reclaiming lock during tree load for: ${treeName} (same user)`,
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
        state.setError(error instanceof Error ? error.message : 'Unknown error occurred');
      } finally {
        state.setIsLoading(false);
      }
    },
    [state, isOurLock],
  );

  // Save tree to config file
  const saveToConfig = useCallback(
    async (treeName: string) => {
      try {
        state.setIsLoading(true);
        state.setError(null);

        const response = await fetch(
          buildServerUrl(`/server/navigation/config/trees/${treeName}`),
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tree_data: {
                nodes: state.nodes,
                edges: state.edges,
              },
              userinterface: state.userInterface,
            }),
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          // Update initial state to reflect saved state
          state.setInitialState({ nodes: [...state.nodes], edges: [...state.edges] });
          state.setHasUnsavedChanges(false);
          console.log(
            `[@hook:useNavigationConfig:saveToConfig] Successfully saved tree: ${treeName}`,
          );
        } else {
          throw new Error(data.error || 'Failed to save navigation tree to config');
        }
      } catch (error) {
        console.error(`[@hook:useNavigationConfig:saveToConfig] Error saving tree:`, error);
        state.setError(error instanceof Error ? error.message : 'Unknown error occurred');
      } finally {
        state.setIsLoading(false);
      }
    },
    [state],
  );

  // List available trees
  const listAvailableTrees = useCallback(async (): Promise<string[]> => {
    try {
      const response = await fetch(buildServerUrl('/server/navigation/config/trees'));

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        return data.trees || [];
      } else {
        throw new Error(data.error || 'Failed to list available trees');
      }
    } catch (error) {
      console.error(`[@hook:useNavigationConfig:listAvailableTrees] Error:`, error);
      return [];
    }
  }, []);

  // Create empty tree
  const createEmptyTree = useCallback(
    async (treeName: string) => {
      try {
        state.setIsLoading(true);
        state.setError(null);

        const response = await fetch(
          buildServerUrl(`/server/navigation/config/trees/${treeName}`),
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              tree_data: {
                nodes: [],
                edges: [],
              },
              userinterface: null,
            }),
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          // Initialize empty state
          state.setNodes([]);
          state.setEdges([]);
          state.setUserInterface(null);
          state.setInitialState({ nodes: [], edges: [] });
          state.setHasUnsavedChanges(false);
          console.log(
            `[@hook:useNavigationConfig:createEmptyTree] Successfully created tree: ${treeName}`,
          );
        } else {
          throw new Error(data.error || 'Failed to create empty navigation tree');
        }
      } catch (error) {
        console.error(`[@hook:useNavigationConfig:createEmptyTree] Error:`, error);
        state.setError(error instanceof Error ? error.message : 'Unknown error occurred');
      } finally {
        state.setIsLoading(false);
      }
    },
    [state],
  );

  // Check tree lock status using existing tree endpoint
  const checkTreeLockStatus = useCallback(
    async (treeName: string) => {
      try {
        setIsCheckingLock(true);
        console.log(
          `[@hook:useNavigationConfig:checkTreeLockStatus] Checking lock status for tree: ${treeName}`,
        );

        const response = await fetch(buildServerUrl(`/server/navigation/config/trees/${treeName}`));

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setIsLocked(data.is_locked);
            setLockInfo(data.lock_info);
            const isLockedByOther = data.is_locked && !isOurLock(data.lock_info);
            setShowReadOnlyOverlay(isLockedByOther);
            console.log(
              `[@hook:useNavigationConfig:checkTreeLockStatus] Lock status updated for tree: ${treeName}, locked: ${data.is_locked}`,
            );
          }
        }
      } catch (error) {
        console.error(`[@hook:useNavigationConfig:checkTreeLockStatus] Error:`, error);
      } finally {
        setIsCheckingLock(false);
      }
    },
    [isOurLock],
  );

  // Auto-unlock on page unload
  const setupAutoUnlock = useCallback(
    (treeName: string) => {
      const handleBeforeUnload = () => {
        if (isLocked) {
          // Use sendBeacon for reliable cleanup on page unload
          const unlockData = JSON.stringify({ session_id: userId });
          navigator.sendBeacon(
            buildServerUrl(`/server/navigation/config/trees/${treeName}/unlock`),
            new Blob([unlockData], { type: 'application/json' }),
          );
        }
      };

      window.addEventListener('beforeunload', handleBeforeUnload);

      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    },
    [isLocked, userId],
  );

  return {
    // Lock management
    isLocked,
    lockInfo,
    isCheckingLock,
    showReadOnlyOverlay,
    setCheckingLockState,
    lockNavigationTree,
    unlockNavigationTree,
    checkTreeLockStatus,
    setupAutoUnlock,

    // Config operations
    loadFromConfig,
    saveToConfig,
    listAvailableTrees,
    createEmptyTree,

    // User identification
    sessionId,
    userId,
  };
};
