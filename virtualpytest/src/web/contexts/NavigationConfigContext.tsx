import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

import { UINavigationNode, UINavigationEdge } from '../types/pages/Navigation_Types';

import { useUserSession } from '../hooks/useUserSession';

// ========================================
// TYPES
// ========================================

interface NavigationConfigContextType {
  // Lock management
  isLocked: boolean;
  lockInfo: any;
  isCheckingLock: boolean;
  showReadOnlyOverlay: boolean;
  setCheckingLockState: (checking: boolean) => void;
  lockNavigationTree: (userInterfaceId: string) => Promise<boolean>;
  unlockNavigationTree: (userInterfaceId: string) => Promise<boolean>;
  checkTreeLockStatus: (userInterfaceId: string) => Promise<void>;
  setupAutoUnlock: (userInterfaceId: string) => () => void;

  // Config operations
  loadFromConfig: (userInterfaceId: string, state: NavigationConfigState) => Promise<void>;
  saveToConfig: (userInterfaceId: string, state: NavigationConfigState) => Promise<void>;
  listAvailableUserInterfaces: () => Promise<any[]>;
  createEmptyTree: (userInterfaceId: string, state: NavigationConfigState) => Promise<void>;

  // User identification
  sessionId: string;
  userId: string;
}

interface NavigationConfigState {
  nodes: UINavigationNode[];
  edges: UINavigationEdge[];
  userInterface: any;
  setNodes: (nodes: UINavigationNode[]) => void;
  setEdges: (edges: UINavigationEdge[]) => void;
  setUserInterface: (ui: any) => void;
  setInitialState: (state: { nodes: UINavigationNode[]; edges: UINavigationEdge[] } | null) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

interface NavigationConfigProviderProps {
  children: React.ReactNode;
}

// ========================================
// CONTEXT
// ========================================

const NavigationConfigContext = createContext<NavigationConfigContextType | null>(null);

export const NavigationConfigProvider: React.FC<NavigationConfigProviderProps> = React.memo(
  ({ children }) => {
    console.log('[@context:NavigationConfigProvider] Initializing navigation config context');

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
            `/server/navigation-trees/lock/status?userinterface_id=${userInterfaceId}`,
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
              // Tree is not locked
              setIsLocked(false);
              setLockInfo(null);
              setShowReadOnlyOverlay(false);
            }
          } else {
            console.error(
              `[@context:NavigationConfigProvider:checkTreeLockStatus] Error:`,
              data.error,
            );
            setIsLocked(false);
            setLockInfo(null);
            setShowReadOnlyOverlay(false);
          }
        } catch (error) {
          console.error(`[@context:NavigationConfigProvider:checkTreeLockStatus] Error:`, error);
          setIsLocked(false);
          setLockInfo(null);
          setShowReadOnlyOverlay(false);
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

          const response = await fetch(`/server/navigation-trees/lock/acquire`, {
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
          setShowReadOnlyOverlay(false);
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

          const response = await fetch(`/server/navigation-trees/lock/release`, {
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
            setShowReadOnlyOverlay(false);
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

          // Get trees for this userInterface directly by ID
          const response = await fetch(
            `/server/navigation-trees/list?userinterface_id=${userInterfaceId}`,
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

          if (data.success && data.trees && data.trees.length > 0) {
            // Get the first tree (root tree)
            const tree = data.trees[0];
            const treeData = tree.metadata || {};

            // Update state with loaded data
            let nodes = treeData.nodes || [];
            const edges = treeData.edges || [];

            // Load verification definitions from database
            try {
              console.log(
                `[@context:NavigationConfigProvider:loadFromConfig] Loading verification definitions for tree: ${tree.name}`,
              );

              // Get userInterface to determine device model
              const uiResponse = await fetch(`/server/userinterfaces/${userInterfaceId}`);
              if (uiResponse.ok) {
                const uiData = await uiResponse.json();
                const deviceModel = uiData.userinterface?.models?.[0] || 'android_mobile';

                // Load verification definitions for this tree and device model
                const verificationsResponse = await fetch(
                  `/server/verifications/load-for-tree?tree_name=${encodeURIComponent(tree.name)}&device_model=${deviceModel}`,
                  {
                    headers: {
                      'Content-Type': 'application/json',
                    },
                  },
                );

                if (verificationsResponse.ok) {
                  const verificationsData = await verificationsResponse.json();

                  if (verificationsData.success && verificationsData.verifications.length > 0) {
                    console.log(
                      `[@context:NavigationConfigProvider:loadFromConfig] Found ${verificationsData.verifications.length} verification definitions in database`,
                    );

                    // Group verifications by node (based on verification name pattern)
                    const verificationsByNode = new Map<string, any[]>();

                    for (const verification of verificationsData.verifications) {
                      // Extract node label from verification name pattern: {node_label}_{verification_type}_{timestamp}
                      const nameParts = verification.name.split('_');
                      if (nameParts.length >= 3) {
                        const nodeLabel = nameParts[0];

                        if (!verificationsByNode.has(nodeLabel)) {
                          verificationsByNode.set(nodeLabel, []);
                        }

                        // Convert database verification to node verification format
                        const nodeVerification = {
                          verification_type: verification.verification_type,
                          command: verification.command,
                          params: verification.parameters || {},
                          timeout: verification.timeout,
                          device_model: verification.device_model,
                          // Add database metadata
                          _db_id: verification.id,
                          _db_name: verification.name,
                        };

                        verificationsByNode.get(nodeLabel)?.push(nodeVerification);
                      }
                    }

                    // Merge verification definitions with nodes
                    nodes = nodes.map((node) => {
                      const nodeVerifications = verificationsByNode.get(node.data?.label);
                      if (nodeVerifications && nodeVerifications.length > 0) {
                        console.log(
                          `[@context:NavigationConfigProvider:loadFromConfig] Adding ${nodeVerifications.length} verifications to node: ${node.data?.label}`,
                        );

                        return {
                          ...node,
                          data: {
                            ...node.data,
                            verifications: [
                              ...(node.data?.verifications || []),
                              ...nodeVerifications,
                            ],
                          },
                        };
                      }
                      return node;
                    });

                    console.log(
                      `[@context:NavigationConfigProvider:loadFromConfig] Successfully merged verification definitions with nodes`,
                    );
                  } else {
                    console.log(
                      `[@context:NavigationConfigProvider:loadFromConfig] No verification definitions found in database for tree: ${tree.name}`,
                    );
                  }
                } else {
                  console.warn(
                    `[@context:NavigationConfigProvider:loadFromConfig] Failed to load verification definitions: ${verificationsResponse.status}`,
                  );
                }
              } else {
                console.warn(
                  `[@context:NavigationConfigProvider:loadFromConfig] Failed to get userInterface details: ${uiResponse.status}`,
                );
              }
            } catch (verificationError) {
              console.error(
                `[@context:NavigationConfigProvider:loadFromConfig] Error loading verification definitions:`,
                verificationError,
              );
              // Continue with tree loading even if verification loading fails
            }

            state.setNodes(nodes);
            state.setEdges(edges);

            console.log(
              `[@context:NavigationConfigProvider:loadFromConfig] Loaded tree for userInterface: ${userInterfaceId} with ${nodes.length} nodes and ${edges.length} edges`,
            );

            // Set initial state for change tracking
            state.setInitialState({ nodes: [...nodes], edges: [...edges] });
            state.setHasUnsavedChanges(false);

            // Enable editing
            setIsLocked(true);
            setLockInfo(null);
            setIsCheckingLock(false);
            setShowReadOnlyOverlay(false);
          } else {
            console.log(
              `[@context:NavigationConfigProvider:loadFromConfig] No trees found for userInterface: ${userInterfaceId}, creating empty tree`,
            );

            // Create empty tree structure
            state.setNodes([]);
            state.setEdges([]);
            state.setInitialState({ nodes: [], edges: [] });
            state.setHasUnsavedChanges(false);

            // Allow editing for new trees
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

          const response = await fetch(`/server/navigation-trees/save`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: 'root', // Always use 'root' as the name
              userinterface_id: userInterfaceId,
              tree_data: {
                nodes: state.nodes,
                edges: state.edges,
              },
              description: `Navigation tree for userInterface: ${userInterfaceId}`,
              modification_type: 'update',
              changes_summary: 'Updated navigation tree from editor',
            }),
          });

          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();

          if (data.success) {
            // Update initial state to reflect saved state
            state.setInitialState({ nodes: [...state.nodes], edges: [...state.edges] });
            state.setHasUnsavedChanges(false);
            console.log(
              `[@context:NavigationConfigProvider:saveToConfig] Successfully saved tree for userInterface: ${userInterfaceId}`,
            );
          } else {
            throw new Error(data.message || 'Failed to save navigation tree to database');
          }
        } catch (error) {
          console.error(
            `[@context:NavigationConfigProvider:saveToConfig] Error saving tree:`,
            error,
          );
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
        const response = await fetch('/server/userinterfaces/list');

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data.success) {
          return data.userinterfaces || [];
        } else {
          throw new Error(data.message || 'Failed to list available user interfaces');
        }
      } catch (error) {
        console.error(
          `[@context:NavigationConfigProvider:listAvailableUserInterfaces] Error:`,
          error,
        );
        return [];
      }
    }, []);

    // Create empty tree
    const createEmptyTree = useCallback(
      async (userInterfaceId: string, state: NavigationConfigState) => {
        try {
          state.setIsLoading(true);
          state.setError(null);

          const response = await fetch(`/server/navigation-trees/save`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: 'root',
              userinterface_id: userInterfaceId,
              tree_data: {
                nodes: [],
                edges: [],
              },
              description: `New navigation tree for userInterface: ${userInterfaceId}`,
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
              `[@context:NavigationConfigProvider:createEmptyTree] Created empty tree for userInterface: ${userInterfaceId}`,
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
      },
      [],
    );

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
        // Remove stable functions from dependencies to prevent unnecessary re-renders
        // setCheckingLockState,
        // lockNavigationTree,
        // unlockNavigationTree,
        // checkTreeLockStatus,
        // setupAutoUnlock,
        // loadFromConfig,
        // saveToConfig,
        // listAvailableUserInterfaces,
        // createEmptyTree,

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
  },
);

// ========================================
// HOOK
// ========================================

export const useNavigationConfig = (): NavigationConfigContextType => {
  const context = useContext(NavigationConfigContext);
  if (!context) {
    throw new Error('useNavigationConfig must be used within a NavigationConfigProvider');
  }
  return context;
};

// Export the type for use in other files
export type { NavigationConfigState };
