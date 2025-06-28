import React, { createContext, useContext, useCallback, useMemo } from 'react';

import { UINavigationNode, NodeForm } from '../../types/pages/Navigation_Types';

import { NavigationConfigContext } from './NavigationConfigContext';
import { useNavigationNodes } from './NavigationNodesContext';
import { useNavigationUI } from './NavigationUIContext';

// ========================================
// TYPES
// ========================================

interface NodeEdgeManagementContextType {
  saveNodeChanges: (formData: any) => Promise<void>;
  saveEdgeChanges: (formData: any) => Promise<void>;
  deleteSelected: () => void;
  addNewNode: (nodeType: string, position: { x: number; y: number }) => void;
  cancelNodeChanges: () => void;
  closeSelectionPanel: () => void;
  resetNode: (nodeId: string) => void;
}

interface NodeEdgeManagementProviderProps {
  children: React.ReactNode;
  userInterfaceId: string;
}

// ========================================
// CONTEXT
// ========================================

const NodeEdgeManagementContext = createContext<NodeEdgeManagementContextType | null>(null);

// ========================================
// PROVIDER
// ========================================

export const NodeEdgeManagementProvider: React.FC<NodeEdgeManagementProviderProps> = ({
  children,
  userInterfaceId,
}) => {
  // Get contexts directly - single source of truth
  const nodesContext = useNavigationNodes();
  const uiContext = useNavigationUI();
  const configContext = useContext(NavigationConfigContext);
  if (!configContext) {
    throw new Error('NodeEdgeManagementProvider must be used within a NavigationConfigProvider');
  }

  const {
    nodes,
    edges,
    selectedNode,
    selectedEdge,
    setNodes,
    setEdges,
    setSelectedNode,
    setSelectedEdge,
  } = nodesContext;

  const {
    nodeForm,
    edgeForm,
    isNewNode,
    setNodeForm,
    setEdgeForm,
    setIsNodeDialogOpen,
    setIsEdgeDialogOpen,
    setIsNewNode,
    setHasUnsavedChanges,
  } = uiContext;

  // Save node changes with database persistence
  const saveNodeChanges = useCallback(
    async (formData: any) => {
      console.log('[@context:NodeEdgeManagementProvider] === STARTING NODE SAVE ===');
      console.log('[@context:NodeEdgeManagementProvider] Form data received:', formData);
      console.log('[@context:NodeEdgeManagementProvider] Current selected node:', selectedNode);
      console.log('[@context:NodeEdgeManagementProvider] Is new node:', isNewNode);

      try {
        // Step 1: Save verifications to database and get their IDs
        const verificationIds: string[] = [];

        console.log(
          '[@context:NodeEdgeManagementProvider] Checking for verifications in formData:',
        );
        console.log(
          '[@context:NodeEdgeManagementProvider] formData.verifications:',
          formData.verifications,
        );

        // NodeForm has verifications at the top level
        const verificationsToSave = formData.verifications || [];
        console.log(
          '[@context:NodeEdgeManagementProvider] verificationsToSave:',
          verificationsToSave,
        );

        if (verificationsToSave && verificationsToSave.length > 0) {
          console.log(
            `[@context:NodeEdgeManagementProvider] Saving ${verificationsToSave.length} verifications to database`,
          );

          for (const verification of verificationsToSave) {
            try {
              const response = await fetch('/server/verification/saveVerification', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  name: `${formData.label || 'node'}_${verification.verification_type}_${Date.now()}`,
                  device_model: verification.device_model || 'android_mobile',
                  verification_type: verification.verification_type || 'image',
                  command: verification.command || '',
                  parameters: verification.params || {},
                }),
              });

              const result = await response.json();
              if (result.success && result.verification_id) {
                const message = result.reused
                  ? 'Reused existing verification'
                  : 'Saved new verification';
                console.log(
                  `[@context:NodeEdgeManagementProvider] ${message}: ${result.verification_id}`,
                );
                // Store the verification ID for tree persistence
                verificationIds.push(result.verification_id);
              } else {
                console.error(
                  `[@context:NodeEdgeManagementProvider] Failed to save verification: ${result.error}`,
                );
              }
            } catch (error) {
              console.error(
                `[@context:NodeEdgeManagementProvider] Error saving verification:`,
                error,
              );
            }
          }
        }

        console.log(
          `[@context:NodeEdgeManagementProvider] Verification IDs for tree storage:`,
          verificationIds,
        );

        // Step 2: Prepare node data for saving
        let updatedNodeData;

        if (isNewNode) {
          // For new nodes, convert NodeForm to UINavigationNode structure
          updatedNodeData = {
            id: formData.id || `node-${Date.now()}`,
            position: { x: 100, y: 100 },
            type: 'uiScreen',
            data: {
              label: formData.label,
              type: formData.type,
              description: formData.description,
              screenshot: formData.screenshot,
              depth: formData.depth,
              parent: formData.parent,
              menu_type: formData.menu_type,
              verification_ids: verificationIds, // ✅ Store verification IDs for persistence/database
              verifications: formData.verifications || [], // ✅ Store verification objects for UI
            },
          };
          console.log(
            '[@context:NodeEdgeManagementProvider] NEW node data prepared:',
            updatedNodeData,
          );
        } else if (selectedNode) {
          // For existing nodes, preserve original node structure and only update modified fields
          console.log(
            '[@context:NodeEdgeManagementProvider] ORIGINAL node before update:',
            selectedNode,
          );

          updatedNodeData = {
            ...selectedNode, // ✅ Preserve original node structure (id, position, type, etc.)
            // Only update the specific fields that can be modified
            data: {
              ...selectedNode.data, // ✅ Preserve existing data structure
              // Update fields from NodeForm
              label: formData.label,
              type: formData.type,
              description: formData.description,
              screenshot: formData.screenshot,
              depth: formData.depth,
              parent: formData.parent,
              menu_type: formData.menu_type,
              verification_ids: verificationIds, // ✅ Store verification IDs for persistence/database
              verifications: formData.verifications || [], // ✅ Store verification objects for UI
            },
          };
          console.log(
            '[@context:NodeEdgeManagementProvider] UPDATED node data prepared:',
            updatedNodeData,
          );
        } else {
          throw new Error('No selected node for update and not creating new node');
        }

        // Step 3: Update nodes in the single source of truth
        if (isNewNode) {
          // Create new node
          const newNode: UINavigationNode = {
            ...updatedNodeData,
            id: updatedNodeData.id || `node-${Date.now()}`,
            position: updatedNodeData.position || { x: 100, y: 100 },
          };

          console.log('[@context:NodeEdgeManagementProvider] Final NEW node to be added:', newNode);
          setNodes((nds: UINavigationNode[]) => [...nds, newNode]);
          console.log('[@context:NodeEdgeManagementProvider] Created new node:', newNode.id);
        } else if (selectedNode) {
          // Update existing node
          const updatedNodes = nodes.map((node) => {
            if (node.id === selectedNode.id) {
              console.log('[@context:NodeEdgeManagementProvider] Replacing node:', node.id);
              console.log('[@context:NodeEdgeManagementProvider] OLD node data:', node);
              console.log('[@context:NodeEdgeManagementProvider] NEW node data:', updatedNodeData);
              return updatedNodeData; // ✅ Use the carefully prepared node data
            }
            return node;
          });

          setNodes(updatedNodes);
          console.log('[@context:NodeEdgeManagementProvider] Updated node:', selectedNode.id);
        }

        // Step 4: Auto-save tree to persist verifications to database
        console.log(
          '[@context:NodeEdgeManagementProvider] Auto-saving tree with verifications to database',
        );

        // Get the most up-to-date nodes after our update
        const currentNodes = isNewNode
          ? [...nodes, updatedNodeData]
          : nodes.map((node) => (node.id === selectedNode.id ? updatedNodeData : node));

        // Create state object for saveToConfig with updated nodes
        const configState = {
          nodes: currentNodes,
          edges,
          userInterface: null, // Will be set by the config context
          setNodes,
          setEdges,
          setUserInterface: () => {}, // Placeholder
          setInitialState: () => {}, // Will be handled by config context
          setHasUnsavedChanges,
          setIsLoading: () => {}, // Will be handled by config context
          setError: () => {}, // Will be handled by config context
        };

        await configContext.saveToConfig(userInterfaceId, configState);

        console.log(
          '[@context:NodeEdgeManagementProvider] Tree auto-saved successfully with verifications',
        );

        // ✅ Mark as saved (no unsaved changes) since auto-save succeeded
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error('[@context:NodeEdgeManagementProvider] Error saving node or tree:', error);

        // Still update the node in memory even if database operations fail
        let fallbackNodeData;

        if (isNewNode) {
          fallbackNodeData = {
            id: formData.id || `node-${Date.now()}`,
            position: { x: 100, y: 100 },
            type: 'uiScreen',
            data: {
              label: formData.label,
              type: formData.type,
              description: formData.description,
              screenshot: formData.screenshot,
              depth: formData.depth,
              parent: formData.parent,
              menu_type: formData.menu_type,
              verification_ids: [], // ✅ Empty array if verification save failed
              verifications: [], // ✅ Empty array if verification save failed
            },
          };
        } else if (selectedNode) {
          fallbackNodeData = {
            ...selectedNode, // ✅ Preserve original node structure
            data: {
              ...selectedNode.data, // ✅ Preserve existing data structure
              // Update fields from NodeForm
              label: formData.label,
              type: formData.type,
              description: formData.description,
              screenshot: formData.screenshot,
              depth: formData.depth,
              parent: formData.parent,
              menu_type: formData.menu_type,
              verification_ids: [], // ✅ Empty array if verification save failed
              verifications: [], // ✅ Empty array if verification save failed
            },
          };
        }

        if (isNewNode && fallbackNodeData) {
          const newNode: UINavigationNode = {
            ...fallbackNodeData,
            id: fallbackNodeData.id || `node-${Date.now()}`,
            position: fallbackNodeData.position || { x: 100, y: 100 },
          };
          console.log('[@context:NodeEdgeManagementProvider] Creating fallback NEW node:', newNode);
          setNodes((nds: UINavigationNode[]) => [...nds, newNode]);
        } else if (selectedNode && fallbackNodeData) {
          const updatedNodes = nodes.map((node) => {
            if (node.id === selectedNode.id) {
              console.log(
                '[@context:NodeEdgeManagementProvider] Using fallback node data:',
                fallbackNodeData,
              );
              return fallbackNodeData;
            }
            return node;
          });
          setNodes(updatedNodes);
        }

        // ❌ Mark as having unsaved changes since auto-save failed
        setHasUnsavedChanges(true);
      }

      // Don't close dialog or clear selection - just mark as saved
      // This prevents the interface reload feeling
    },
    [
      isNewNode,
      selectedNode,
      nodes,
      edges,
      setNodes,
      setHasUnsavedChanges,
      configContext,
      userInterfaceId,
    ],
  );

  // Save edge changes
  const saveEdgeChanges = useCallback(
    async (formData: any) => {
      console.log('[@context:NodeEdgeManagementProvider] Saving edge changes:', formData);

      try {
        // Step 1: Save actions to database first (following verification pattern)
        const actionsToSave = formData.actions || [];
        const actionIds: string[] = [];

        if (actionsToSave.length > 0) {
          console.log(
            `[@context:NodeEdgeManagementProvider] Saving ${actionsToSave.length} actions to database`,
          );

          for (const action of actionsToSave) {
            try {
              const response = await fetch('/server/actions/save', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  name: `${formData.label || 'edge'}_${action.label || 'action'}_${Date.now()}`,
                  device_model: 'android_mobile', // Default device model
                  action_type: 'ui', // Default action type for edge actions
                  command: action.command || '',
                  parameters: action.params || {},
                  wait_time: action.waitTime || 500,
                  requires_input: action.requiresInput || false,
                }),
              });

              const result = await response.json();
              if (result.success && result.action_id) {
                const message = result.reused ? 'Reused existing action' : 'Saved new action';
                console.log(
                  `[@context:NodeEdgeManagementProvider] ${message}: ${result.action_id}`,
                );
                // Store the action ID for tree persistence
                actionIds.push(result.action_id);
              } else {
                console.error(
                  `[@context:NodeEdgeManagementProvider] Failed to save action: ${result.error}`,
                );
              }
            } catch (error) {
              console.error(`[@context:NodeEdgeManagementProvider] Error saving action:`, error);
            }
          }
        }

        console.log(
          `[@context:NodeEdgeManagementProvider] Action IDs for tree storage:`,
          actionIds,
        );

        // Step 2: Update edge with both action_ids and actions (dual storage like verifications)
        if (selectedEdge) {
          const updatedEdges = edges.map((edge) => {
            if (edge.id === selectedEdge.id) {
              return {
                ...edge,
                ...formData,
                data: {
                  ...edge.data,
                  ...formData.data,
                  action_ids: actionIds, // ✅ Store action IDs for persistence/database
                  actions: formData.actions || [], // ✅ Store action objects for UI
                },
              };
            }
            return edge;
          });

          // Update edges (single source of truth)
          setEdges(updatedEdges);

          console.log('[@context:NodeEdgeManagementProvider] Updated edge:', selectedEdge.id);

          // Step 3: Auto-save tree to persist actions to database
          console.log(
            '[@context:NodeEdgeManagementProvider] Auto-saving tree with actions to database',
          );

          // Create state object for saveToConfig with updated edges
          const configState = {
            nodes,
            edges: updatedEdges,
            userInterface: null, // Will be set by the config context
            setNodes,
            setEdges,
            setUserInterface: () => {}, // Placeholder
            setInitialState: () => {}, // Will be handled by config context
            setHasUnsavedChanges,
            setIsLoading: () => {}, // Will be handled by config context
            setError: () => {}, // Will be handled by config context
          };

          await configContext.saveToConfig(userInterfaceId, configState);

          console.log(
            '[@context:NodeEdgeManagementProvider] Tree auto-saved successfully with actions',
          );

          // ✅ Mark as saved (no unsaved changes) since auto-save succeeded
          setHasUnsavedChanges(false);
        }
      } catch (error) {
        console.error('[@context:NodeEdgeManagementProvider] Error saving edge or tree:', error);

        // Still update the edge in memory even if database operations fail
        if (selectedEdge) {
          const updatedEdges = edges.map((edge) => {
            if (edge.id === selectedEdge.id) {
              return {
                ...edge,
                ...formData,
                data: {
                  ...edge.data,
                  ...formData.data,
                  action_ids: [], // ✅ Empty array if action save failed
                  actions: [], // ✅ Empty array if action save failed
                },
              };
            }
            return edge;
          });

          setEdges(updatedEdges);
          console.log('[@context:NodeEdgeManagementProvider] Updated edge with fallback data');
        }

        // ❌ Mark as having unsaved changes since auto-save failed
        setHasUnsavedChanges(true);
      }

      // Clean up state
      setSelectedEdge(null);
      setEdgeForm(null);
      setIsEdgeDialogOpen(false);
    },
    [
      selectedEdge,
      edges,
      nodes,
      setEdges,
      setSelectedEdge,
      setEdgeForm,
      setIsEdgeDialogOpen,
      setHasUnsavedChanges,
      configContext,
      userInterfaceId,
    ],
  );

  // Delete selected node or edge
  const deleteSelected = useCallback(() => {
    console.log('[@context:NodeEdgeManagementProvider] Deleting selected item');

    if (selectedNode) {
      // Delete node
      const nodeId = selectedNode.id;

      // Filter out the node
      const updatedNodes = nodes.filter((node) => node.id !== nodeId);

      // Filter out any edges connected to this node
      const updatedEdges = edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId);

      setNodes(updatedNodes);
      setEdges(updatedEdges);

      console.log(`[@context:NodeEdgeManagementProvider] Deleted node: ${nodeId}`);
    } else if (selectedEdge) {
      // Delete edge
      const edgeId = selectedEdge.id;

      // Filter out the edge
      const updatedEdges = edges.filter((edge) => edge.id !== edgeId);

      setEdges(updatedEdges);

      console.log(`[@context:NodeEdgeManagementProvider] Deleted edge: ${edgeId}`);
    }

    // Clean up state
    setSelectedNode(null);
    setSelectedEdge(null);
    setNodeForm(null);
    setEdgeForm(null);
    setIsNodeDialogOpen(false);
    setIsEdgeDialogOpen(false);
    setHasUnsavedChanges(true);
  }, [
    selectedNode,
    selectedEdge,
    nodes,
    edges,
    setNodes,
    setEdges,
    setSelectedNode,
    setSelectedEdge,
    setNodeForm,
    setEdgeForm,
    setIsNodeDialogOpen,
    setIsEdgeDialogOpen,
    setHasUnsavedChanges,
  ]);

  // Add new node
  const addNewNode = useCallback(
    (nodeType: string, _position: { x: number; y: number }) => {
      console.log(`[@context:NodeEdgeManagementProvider] Adding new node of type: ${nodeType}`);

      // Create an initial form for the new node
      const initialForm: NodeForm = {
        id: `node-${Date.now()}`,
        label: `New ${nodeType}`,
        type: nodeType as 'screen' | 'dialog' | 'popup' | 'overlay' | 'menu' | 'entry',
        description: '',
        depth: 0,
        parent: [],
      };

      // Set form and open dialog
      setNodeForm(initialForm);
      setIsNewNode(true);
      setIsNodeDialogOpen(true);

      console.log('[@context:NodeEdgeManagementProvider] Node form initialized:', initialForm);
    },
    [setNodeForm, setIsNewNode, setIsNodeDialogOpen],
  );

  // Cancel node changes
  const cancelNodeChanges = useCallback(() => {
    console.log('[@context:NodeEdgeManagementProvider] Cancelling node changes');

    // Clean up state
    setSelectedNode(null);
    setNodeForm(null);
    setIsNodeDialogOpen(false);
    setIsNewNode(false);
  }, [setSelectedNode, setNodeForm, setIsNodeDialogOpen, setIsNewNode]);

  // Close selection panel
  const closeSelectionPanel = useCallback(() => {
    console.log('[@context:NodeEdgeManagementProvider] Closing selection panel');

    // Batch all state updates together to prevent multiple re-renders
    setSelectedNode(null);
    setSelectedEdge(null);
    setNodeForm(null);
    setEdgeForm(null);
    setIsNodeDialogOpen(false);
    setIsEdgeDialogOpen(false);
    setIsNewNode(false);
  }, [
    setSelectedNode,
    setSelectedEdge,
    setNodeForm,
    setEdgeForm,
    setIsNodeDialogOpen,
    setIsEdgeDialogOpen,
    setIsNewNode,
  ]);

  // Reset node
  const resetNode = useCallback(
    (nodeId: string) => {
      console.log(`[@context:NodeEdgeManagementProvider] Resetting node: ${nodeId}`);

      // Find the node in the original dataset
      const originalNode = nodes.find((node) => node.id === nodeId);

      if (originalNode) {
        // Convert UINavigationNode to NodeForm
        const nodeForm: NodeForm = {
          id: originalNode.id,
          label: originalNode.data.label,
          type: originalNode.data.type,
          description: originalNode.data.description || '',
          depth: originalNode.data.depth,
          parent: originalNode.data.parent,
          verifications: originalNode.data.verifications,
        };
        setNodeForm(nodeForm);
        console.log('[@context:NodeEdgeManagementProvider] Node form reset to original state');
      }
    },
    [nodes, setNodeForm],
  );

  // ========================================
  // CONTEXT VALUE
  // ========================================

  const contextValue: NodeEdgeManagementContextType = useMemo(
    () => ({
      saveNodeChanges,
      saveEdgeChanges,
      deleteSelected,
      addNewNode,
      cancelNodeChanges,
      closeSelectionPanel,
      resetNode,
    }),
    [
      saveNodeChanges,
      saveEdgeChanges,
      deleteSelected,
      addNewNode,
      cancelNodeChanges,
      closeSelectionPanel,
      resetNode,
    ],
  );

  return (
    <NodeEdgeManagementContext.Provider value={contextValue}>
      {children}
    </NodeEdgeManagementContext.Provider>
  );
};

NodeEdgeManagementProvider.displayName = 'NodeEdgeManagementProvider';

// ========================================
// HOOK
// ========================================

export const useNodeEdgeManagement = (): NodeEdgeManagementContextType => {
  const context = useContext(NodeEdgeManagementContext);
  if (!context) {
    throw new Error('useNodeEdgeManagement must be used within a NodeEdgeManagementProvider');
  }
  return context;
};
