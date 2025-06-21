import React, { createContext, useContext, useCallback, useMemo } from 'react';

import {
  UINavigationNode,
  UINavigationEdge,
  NodeForm,
  EdgeForm,
} from '../../types/pages/Navigation_Types';

// ========================================
// TYPES
// ========================================

interface NodeEdgeManagementContextType {
  saveNodeChanges: (formData: any) => void;
  saveEdgeChanges: (formData: any) => void;
  deleteSelected: () => void;
  addNewNode: (nodeType: string, position: { x: number; y: number }) => void;
  cancelNodeChanges: () => void;
  closeSelectionPanel: () => void;
  resetNode: (nodeId: string) => void;
}

interface NodeEdgeManagementState {
  nodes: UINavigationNode[];
  edges: UINavigationEdge[];
  selectedNode: UINavigationNode | null;
  selectedEdge: UINavigationEdge | null;
  nodeForm: NodeForm | null;
  edgeForm: EdgeForm | null;
  isNewNode: boolean;
  setNodes: (
    nodes: UINavigationNode[] | ((prev: UINavigationNode[]) => UINavigationNode[]),
  ) => void;
  setEdges: (
    edges: UINavigationEdge[] | ((prev: UINavigationEdge[]) => UINavigationEdge[]),
  ) => void;
  setSelectedNode: (node: UINavigationNode | null) => void;
  setSelectedEdge: (edge: UINavigationEdge | null) => void;
  setNodeForm: (form: NodeForm | null) => void;
  setEdgeForm: (form: EdgeForm | null) => void;
  setIsNodeDialogOpen: (open: boolean) => void;
  setIsEdgeDialogOpen: (open: boolean) => void;
  setIsNewNode: (isNew: boolean) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
}

interface NodeEdgeManagementProviderProps {
  children: React.ReactNode;
  state: NodeEdgeManagementState;
  saveToConfig: (userInterfaceId: string) => Promise<void>;
  userInterfaceId: string;
}

// ========================================
// CONTEXT
// ========================================

const NodeEdgeManagementContext = createContext<NodeEdgeManagementContextType | null>(null);

export const NodeEdgeManagementProvider: React.FC<NodeEdgeManagementProviderProps> = ({
  children,
  state,
  saveToConfig,
  userInterfaceId,
}) => {
  console.log('[@context:NodeEdgeManagementProvider] Initializing node edge management context');

  const {
    nodes,
    edges,
    selectedNode,
    selectedEdge,

    isNewNode,
    setNodes,
    setEdges,
    setSelectedNode,
    setSelectedEdge,
    setNodeForm,
    setEdgeForm,
    setIsNodeDialogOpen,
    setIsEdgeDialogOpen,
    setIsNewNode,
    setHasUnsavedChanges,
  } = state;

  // ========================================
  // CRUD OPERATIONS
  // ========================================

  // Save node changes with database persistence
  const saveNodeChanges = useCallback(
    async (formData: any) => {
      console.log('[@context:NodeEdgeManagementProvider] Saving node changes:', formData);

      try {
        // Step 1: Save verifications to database and get their IDs
        const verificationIds: string[] = [];

        if (formData.verifications && formData.verifications.length > 0) {
          console.log(
            `[@context:NodeEdgeManagementProvider] Saving ${formData.verifications.length} verifications to database`,
          );

          for (const verification of formData.verifications) {
            try {
              const response = await fetch('/server/verifications/save-verification', {
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

        // Step 2: Update node in memory with verification IDs
        const nodeDataWithVerificationIds = {
          ...formData,
          data: {
            ...formData.data,
            // ✅ Add verification IDs to the node data
            verifications: verificationIds,
          },
        };

        // Step 3: Update nodes state
        if (isNewNode) {
          // Create new node
          const newNode: UINavigationNode = {
            ...nodeDataWithVerificationIds,
            id: nodeDataWithVerificationIds.id || `node-${Date.now()}`,
            position: nodeDataWithVerificationIds.position || { x: 100, y: 100 },
          };

          setNodes((nds: UINavigationNode[]) => [...nds, newNode]);
          console.log('[@context:NodeEdgeManagementProvider] Created new node:', newNode.id);
        } else if (selectedNode) {
          // Update existing node
          setNodes((nds: UINavigationNode[]) =>
            nds.map((node) => {
              if (node.id === selectedNode.id) {
                return { ...node, ...nodeDataWithVerificationIds };
              }
              return node;
            }),
          );
          console.log('[@context:NodeEdgeManagementProvider] Updated node:', selectedNode.id);
        }

        // Step 4: Auto-save tree after a brief delay to ensure React state has updated
        console.log(
          '[@context:NodeEdgeManagementProvider] Auto-saving tree with verification IDs to database',
        );

        // Use a small delay to ensure React state updates are processed
        await new Promise((resolve) => setTimeout(resolve, 50));

        await saveToConfig(userInterfaceId);
        console.log(
          '[@context:NodeEdgeManagementProvider] Tree auto-saved successfully with verification IDs',
        );

        // ✅ Mark as saved (no unsaved changes) since auto-save succeeded
        setHasUnsavedChanges(false);
      } catch (error) {
        console.error('[@context:NodeEdgeManagementProvider] Error saving node or tree:', error);

        // Still update the node in memory even if database operations fail
        const fallbackNodeData = {
          ...formData,
          data: {
            ...formData.data,
            verifications: [], // Empty array if verification save failed
          },
        };

        if (isNewNode) {
          const newNode: UINavigationNode = {
            ...fallbackNodeData,
            id: fallbackNodeData.id || `node-${Date.now()}`,
            position: fallbackNodeData.position || { x: 100, y: 100 },
          };
          setNodes((nds: UINavigationNode[]) => [...nds, newNode]);
        } else if (selectedNode) {
          const updatedNodes = nodes.map((node) => {
            if (node.id === selectedNode.id) {
              return { ...node, ...fallbackNodeData };
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
    [isNewNode, selectedNode, nodes, setNodes, setHasUnsavedChanges, saveToConfig, userInterfaceId],
  );

  // Save edge changes
  const saveEdgeChanges = useCallback(
    (formData: any) => {
      console.log('[@context:NodeEdgeManagementProvider] Saving edge changes:', formData);

      if (selectedEdge) {
        // Update existing edge
        const updatedEdges = edges.map((edge) => {
          if (edge.id === selectedEdge.id) {
            return { ...edge, ...formData };
          }
          return edge;
        });

        // Update edges (single source of truth)
        setEdges(updatedEdges);

        console.log('[@context:NodeEdgeManagementProvider] Updated edge:', selectedEdge.id);
      }

      // Clean up state
      setSelectedEdge(null);
      setEdgeForm(null);
      setIsEdgeDialogOpen(false);
      setHasUnsavedChanges(true);
    },
    [
      selectedEdge,
      edges,
      setEdges,
      setSelectedEdge,
      setEdgeForm,
      setIsEdgeDialogOpen,
      setHasUnsavedChanges,
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

// Export the type for use in other files
export type { NodeEdgeManagementState };
