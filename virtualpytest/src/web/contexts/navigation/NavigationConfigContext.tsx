import React, { createContext, useState, useCallback, useMemo } from 'react';

import { useUserSession } from '../../hooks/useUserSession';
import {
  NavigationConfigContextType,
  NavigationConfigState,
  NavigationConfigProviderProps,
} from '../../types/pages/NavigationConfig_Types';
import { UINavigationNode } from '../../types/pages/Navigation_Types';

// ========================================
// CONTEXT
// ========================================

export const NavigationConfigContext = createContext<NavigationConfigContextType | null>(null);

export const NavigationConfigProvider: React.FC<NavigationConfigProviderProps> = ({ children }) => {
  // ========================================
  // USER SESSION
  // ========================================

  // Get user session info (session ID and user ID)
  const { sessionId, userId } = useUserSession();

  // ========================================
  // STATE
  // ========================================

  const [isLocked, setIsLocked] = useState(false);
  const [lockInfo, setLockInfo] = useState<any>(null);
  const [isCheckingLock, setIsCheckingLock] = useState(false);
  const [showReadOnlyOverlay, setShowReadOnlyOverlay] = useState(false);

  // ========================================
  // LOCK MANAGEMENT
  // ========================================

  // Set checking lock state immediately (fixes race condition)
  const setCheckingLockState = useCallback((checking: boolean) => {
    setIsCheckingLock(checking);
  }, []);

  // Check lock status for a tree
  const checkTreeLockStatus = useCallback(
    async (userInterfaceId: string) => {
      try {
        setIsCheckingLock(true);

        const response = await fetch(
          `/server/navigationTrees/lockStatus?userinterface_id=${userInterfaceId}`,
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
          const lockData = data.lock || null;

          if (lockData) {
            // Tree is locked by someone
            const isOurLock = lockData.session_id === sessionId;

            setIsLocked(isOurLock);
            setLockInfo(lockData);
            setShowReadOnlyOverlay(!isOurLock);
          } else {
            // Tree is not locked - user still needs to take control
            setIsLocked(false);
            setLockInfo(null);
            setShowReadOnlyOverlay(true);
          }
        } else {
          console.error(
            `[@context:NavigationConfigProvider:checkTreeLockStatus] Error:`,
            data.error,
          );
          setIsLocked(false);
          setLockInfo(null);
          setShowReadOnlyOverlay(true);
        }
      } catch (error) {
        console.error(`[@context:NavigationConfigProvider:checkTreeLockStatus] Error:`, error);
        setIsLocked(false);
        setLockInfo(null);
        setShowReadOnlyOverlay(true);
      } finally {
        setIsCheckingLock(false);
      }
    },
    [sessionId],
  );

  // Try to lock a tree
  const lockNavigationTree = useCallback(
    async (userInterfaceId: string): Promise<boolean> => {
      try {
        setIsCheckingLock(true);

        const response = await fetch(`/server/navigationTrees/lockAcquire`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userinterface_id: userInterfaceId,
            session_id: sessionId,
            user_id: userId,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          setIsLocked(true);
          setLockInfo(data.lock);
          setShowReadOnlyOverlay(false);
          return true;
        } else {
          // Lock failed, check if it's locked by someone else
          await checkTreeLockStatus(userInterfaceId);
          return false;
        }
      } catch (error) {
        console.error(`[@context:NavigationConfigProvider:lockNavigationTree] Error:`, error);
        setIsLocked(false);
        setLockInfo(null);
        setShowReadOnlyOverlay(true);
        return false;
      } finally {
        setIsCheckingLock(false);
      }
    },
    [sessionId, userId, checkTreeLockStatus],
  );

  // Unlock a tree
  const unlockNavigationTree = useCallback(
    async (userInterfaceId: string): Promise<boolean> => {
      try {
        setIsCheckingLock(true);

        const response = await fetch(`/server/navigationTrees/lockRelease`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userinterface_id: userInterfaceId,
            session_id: sessionId,
            user_id: userId,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          setIsLocked(false);
          setLockInfo(null);
          setShowReadOnlyOverlay(true);
          return true;
        } else {
          console.error(
            `[@context:NavigationConfigProvider:unlockNavigationTree] Error:`,
            data.error,
          );
          return false;
        }
      } catch (error) {
        console.error(`[@context:NavigationConfigProvider:unlockNavigationTree] Error:`, error);
        // On error, assume we don't have control
        setIsLocked(false);
        setLockInfo(null);
        setShowReadOnlyOverlay(true);
        return false;
      } finally {
        setIsCheckingLock(false);
      }
    },
    [sessionId, userId],
  );

  // Setup auto-unlock on page unload
  const setupAutoUnlock = useCallback(
    (userInterfaceId: string) => {
      console.log(
        `[@context:NavigationConfigProvider:setupAutoUnlock] Setting up auto-unlock for userInterface: ${userInterfaceId}`,
      );

      // Return cleanup function
      return () => {
        console.log(
          `[@context:NavigationConfigProvider:setupAutoUnlock] Cleaning up and unlocking userInterface: ${userInterfaceId}`,
        );
        // Always try to unlock - the server will handle checking if we have the lock
        unlockNavigationTree(userInterfaceId).catch((error) => {
          console.error(
            `[@context:NavigationConfigProvider:setupAutoUnlock] Error during auto-unlock:`,
            error,
          );
        });
      };
    },
    [unlockNavigationTree],
  );

  // ========================================
  // CONFIG OPERATIONS
  // ========================================

  // Load tree from database
  const loadFromConfig = useCallback(
    async (userInterfaceId: string, state: NavigationConfigState) => {
      try {
        state.setIsLoading(true);
        state.setError(null);

        // Use optimized tree-by-userinterface-id endpoint for fastest lookup
        const response = await fetch(
          `/server/navigationTrees/getTreeByUserInterfaceId/${userInterfaceId}`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();

        if (result.success && result.tree) {
          // Get the tree data directly
          const tree = result.tree;
          const treeData = tree.metadata || {};

          // Update state with loaded data
          let nodes = treeData.nodes || [];
          let edges = treeData.edges || [];

          state.setNodes(nodes);
          state.setEdges(edges);

          console.log(
            `[@context:NavigationConfigProvider:loadFromConfig] Loaded tree: ${tree.name} (ID: ${tree.id}) with ${nodes.length} nodes and ${edges.length} edges`,
          );

          // Set initial state for change tracking
          state.setInitialState({ nodes: [...nodes], edges: [...edges] });
          state.setHasUnsavedChanges(false);

          // Enable editing when tree is loaded (tree lock acquired on mount)
          setIsLocked(true);
          setLockInfo(null);
          setIsCheckingLock(false);
          setShowReadOnlyOverlay(false);
        } else {
          // Create empty tree structure
          state.setNodes([]);
          state.setEdges([]);
          state.setInitialState({ nodes: [], edges: [] });
          state.setHasUnsavedChanges(false);

          // Enable editing for new trees (tree lock acquired on mount)
          setIsLocked(true);
          setLockInfo(null);
          setIsCheckingLock(false);
          setShowReadOnlyOverlay(false);
        }
      } catch (error) {
        console.error(
          `[@context:NavigationConfigProvider:loadFromConfig] Error loading tree:`,
          error,
        );
        state.setError(error instanceof Error ? error.message : 'Unknown error occurred');
      } finally {
        state.setIsLoading(false);
      }
    },
    [],
  );

  // Save tree to database
  const saveToConfig = useCallback(
    async (userInterfaceId: string, state: NavigationConfigState) => {
      try {
        state.setIsLoading(true);
        state.setError(null);

        // Prepare tree data for saving - only store structure and IDs
        const treeDataForSaving = {
          nodes: state.nodes.map((node: UINavigationNode) => ({
            ...node,
            data: {
              ...node.data,
              // Store verification_ids for reference
              verification_ids: node.data.verification_ids || [],
            },
          })),
          edges: state.edges.map((edge: any) => ({
            ...edge,
            data: {
              ...edge.data,
              // Store action_ids for reference
              action_ids: edge.data?.action_ids || [],
            },
          })),
        };

        const requestBody = {
          userinterface_id: userInterfaceId,
          tree_data: treeDataForSaving,
          description: `Navigation tree for interface: ${userInterfaceId}`,
          modification_type: 'update',
          changes_summary: 'Updated navigation tree from editor',
        };

        const response = await fetch(`/server/navigationTrees/saveTree`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            '[@context:NavigationConfigProvider:saveToConfig] Response error text:',
            errorText,
          );
          throw new Error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        }

        const data = await response.json();

        if (data.success) {
          // Update initial state to reflect saved state
          state.setInitialState({ nodes: [...state.nodes], edges: [...state.edges] });
          state.setHasUnsavedChanges(false);
        } else {
          console.error('[@context:NavigationConfigProvider:saveToConfig] Save failed:', data);
          throw new Error(data.message || 'Failed to save navigation tree to database');
        }
      } catch (error) {
        console.error(`[@context:NavigationConfigProvider:saveToConfig] Error saving tree:`, error);
        state.setError(error instanceof Error ? error.message : 'Unknown error occurred');
      } finally {
        state.setIsLoading(false);
      }
    },
    [],
  );

  // List available user interfaces
  const listAvailableUserInterfaces = useCallback(async (): Promise<any[]> => {
    try {
      const response = await fetch('/server/userinterface/getAllUserInterfaces');

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // The navigation endpoint returns the data directly, not wrapped in success object
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error(
        `[@context:NavigationConfigProvider:listAvailableUserInterfaces] Error:`,
        error,
      );
      return [];
    }
  }, []);

  // Create empty tree
  const createEmptyTree = useCallback(async (treeName: string, state: NavigationConfigState) => {
    try {
      state.setIsLoading(true);
      state.setError(null);

      const response = await fetch(`/server/navigationTrees/saveTree`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: treeName,
          tree_data: {
            nodes: [],
            edges: [],
          },
          description: `New navigation tree: ${treeName}`,
          modification_type: 'create',
          changes_summary: 'Created new empty navigation tree',
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        state.setNodes([]);
        state.setEdges([]);
        state.setInitialState({ nodes: [], edges: [] });
        state.setHasUnsavedChanges(false);
        console.log(
          `[@context:NavigationConfigProvider:createEmptyTree] Created empty tree: ${treeName}`,
        );
      } else {
        throw new Error(data.message || 'Failed to create empty navigation tree');
      }
    } catch (error) {
      console.error(`[@context:NavigationConfigProvider:createEmptyTree] Error:`, error);
      state.setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      state.setIsLoading(false);
    }
  }, []);

  // ========================================
  // CONTEXT VALUE
  // ========================================

  const contextValue: NavigationConfigContextType = useMemo(
    () => ({
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
      listAvailableUserInterfaces,
      createEmptyTree,

      // User identification
      sessionId,
      userId,
    }),
    [
      // Lock state
      isLocked,
      lockInfo,
      isCheckingLock,
      showReadOnlyOverlay,
      // Add stable functions to dependencies
      setCheckingLockState,
      lockNavigationTree,
      unlockNavigationTree,
      checkTreeLockStatus,
      setupAutoUnlock,
      loadFromConfig,
      saveToConfig,
      listAvailableUserInterfaces,
      createEmptyTree,
      // User session data is stable from singleton
      sessionId,
      userId,
    ],
  );

  return (
    <NavigationConfigContext.Provider value={contextValue}>
      {children}
    </NavigationConfigContext.Provider>
  );
};

NavigationConfigProvider.displayName = 'NavigationConfigProvider';
