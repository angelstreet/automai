import React, { createContext, useContext, useCallback, useMemo } from 'react';

import {
  UINavigationNode,
  UINavigationEdge,
  NodeForm,
  EdgeForm,
} from '../types/pages/Navigation_Types';

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
}

// ========================================
// CONTEXT
// ========================================

const NodeEdgeManagementContext = createContext<NodeEdgeManagementContextType | null>(null);

export const NodeEdgeManagementProvider: React.FC<NodeEdgeManagementProviderProps> = React.memo(
  ({ children, state }) => {
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
          // Step 1: Save verifications to database using the correct endpoint
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
                    parameters: verification.parameters || {},
                    timeout: verification.timeout,
                    // Optional fields for image verifications with references
                    r2_path: verification.params?.image_path || null,
                    r2_url: verification.params?.image_url || null,
                    area: verification.params?.area || null,
                  }),
                });

                const result = await response.json();
                if (result.success) {
                  console.log(
                    `[@context:NodeEdgeManagementProvider] Saved verification to database: ${result.verification_id}`,
                  );
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

          // Step 2: Update node in memory (verifications are stored in the node for tree persistence)

          if (isNewNode) {
            // Create new node
            const newNode: UINavigationNode = {
              ...formData,
              id: formData.id || `node-${Date.now()}`,
              position: formData.position || { x: 100, y: 100 },
            };

            // Add node to nodes array (single source of truth)
            setNodes((nds: UINavigationNode[]) => [...nds, newNode]);

            console.log('[@context:NodeEdgeManagementProvider] Created new node:', newNode);
          } else if (selectedNode) {
            // Update existing node
            const updatedNodes = nodes.map((node) => {
              if (node.id === selectedNode.id) {
                return { ...node, ...formData };
              }
              return node;
            });

            // Update nodes (single source of truth)
            setNodes(updatedNodes);

            console.log('[@context:NodeEdgeManagementProvider] Updated node:', selectedNode.id);
          }

          // Step 3: Trigger tree save to persist changes to database
          // We need to import the navigation config context to trigger save
          // For now, just mark as having unsaved changes - the user will need to save the tree
          setHasUnsavedChanges(true);

          console.log(
            '[@context:NodeEdgeManagementProvider] Node saved successfully with verifications',
          );
        } catch (error) {
          console.error('[@context:NodeEdgeManagementProvider] Error saving node:', error);
          // Still update the node in memory even if database save fails
          if (isNewNode) {
            const newNode: UINavigationNode = {
              ...formData,
              id: formData.id || `node-${Date.now()}`,
              position: formData.position || { x: 100, y: 100 },
            };
            setNodes((nds: UINavigationNode[]) => [...nds, newNode]);
          } else if (selectedNode) {
            const updatedNodes = nodes.map((node) => {
              if (node.id === selectedNode.id) {
                return { ...node, ...formData };
              }
              return node;
            });
            setNodes(updatedNodes);
          }
          setHasUnsavedChanges(true);
        }

        // Don't close dialog or clear selection - just mark as saved
        // This prevents the interface reload feeling
      },
      [isNewNode, selectedNode, nodes, setNodes, setHasUnsavedChanges],
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
        const updatedEdges = edges.filter(
          (edge) => edge.source !== nodeId && edge.target !== nodeId,
        );

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
  },
  // Custom comparison function to prevent unnecessary re-renders
  (prevProps, nextProps) => {
    // Compare children (usually stable)
    if (prevProps.children !== nextProps.children) {
      return false;
    }

    // Deep compare state object
    const prevState = JSON.stringify(prevProps.state);
    const nextState = JSON.stringify(nextProps.state);

    const areEqual = prevState === nextState;

    if (!areEqual) {
      console.log('[@context:NodeEdgeManagementProvider] State changed, re-rendering required');
    }

    return areEqual;
  },
);

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
