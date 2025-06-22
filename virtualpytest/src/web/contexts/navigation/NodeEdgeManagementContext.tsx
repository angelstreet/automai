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
      console.log('[@context:NodeEdgeManagementProvider] === STARTING NODE SAVE ===');
      console.log('[@context:NodeEdgeManagementProvider] Form data received:', formData);
      console.log('[@context:NodeEdgeManagementProvider] formData.verifications:', formData.verifications);
      console.log('[@context:NodeEdgeManagementProvider] formData.data:', formData.data);
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
        console.log(
          '[@context:NodeEdgeManagementProvider] formData.data?.verifications:',
          formData.data?.verifications,
        );

        // Check both possible locations for verifications
        const verificationsToSave = formData.verifications || formData.data?.verifications;
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
              console.log(
                `[@context:NodeEdgeManagementProvider] Saving individual verification:`,
                verification,
              );

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
              console.log(
                `[@context:NodeEdgeManagementProvider] Verification save response:`,
                result,
              );

              if (result.success && result.verification_id) {
                const message = result.reused
                  ? 'Reused existing verification'
                  : 'Saved new verification';
                console.log(
                  `[@context:NodeEdgeManagementProvider] ${message}: ${result.verification_id}`,
                );
                // Store the verification ID for tree persistence
                verificationIds.push(result.verification_id);
                console.log(
                  `[@context:NodeEdgeManagementProvider] verificationIds array after push:`,
                  verificationIds,
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
        } else {
          console.log(
            '[@context:NodeEdgeManagementProvider] No verifications to save',
          );
        }

        console.log(
          `[@context:NodeEdgeManagementProvider] FINAL verificationIds array:`,
          verificationIds,
        );
        console.log(
          `[@context:NodeEdgeManagementProvider] verificationIds.length:`,
          verificationIds.length,
        );

        // Step 2: Prepare node data for saving
        let updatedNodeData;

        if (isNewNode) {
          // For new nodes, use form data as base
          console.log(
            '[@context:NodeEdgeManagementProvider] Preparing NEW node data...',
          );
          console.log(
            '[@context:NodeEdgeManagementProvider] formData.data before node preparation:',
            formData.data,
          );

          updatedNodeData = {
            ...formData,
            data: {
              ...formData.data,
              verification_ids: verificationIds, // ✅ Store verification IDs for persistence/database
              verifications: formData.verifications || [], // ✅ Store verification objects for UI
            },
          };
          console.log(
            '[@context:NodeEdgeManagementProvider] NEW node data prepared:',
            updatedNodeData,
          );
          console.log(
            '[@context:NodeEdgeManagementProvider] NEW node verification_ids:',
            updatedNodeData.data.verification_ids,
          );
        } else if (selectedNode) {
          // For existing nodes, preserve original node structure and only update modified fields
          console.log(
            '[@context:NodeEdgeManagementProvider] Preparing EXISTING node data...',
          );
          console.log(
            '[@context:NodeEdgeManagementProvider] ORIGINAL node before update:',
            selectedNode,
          );
          console.log(
            '[@context:NodeEdgeManagementProvider] selectedNode.data before update:',
            selectedNode.data,
          );
          console.log(
            '[@context:NodeEdgeManagementProvider] formData.data before merge:',
            formData.data,
          );

          updatedNodeData = {
            ...selectedNode, // ✅ Preserve original node structure (id, position, type, etc.)
            // Only update the specific fields that can be modified
            label: formData.label, // Update label if changed
            data: {
              ...selectedNode.data, // ✅ Preserve existing data structure
              // Update only the fields from the form
              ...formData.data, // Apply form changes
              verification_ids: verificationIds, // ✅ Store verification IDs for persistence/database
              verifications: formData.verifications || [], // ✅ Store verification objects for UI
            },
          };
          console.log(
            '[@context:NodeEdgeManagementProvider] UPDATED node data prepared:',
            updatedNodeData,
          );
          console.log(
            '[@context:NodeEdgeManagementProvider] UPDATED node verification_ids:',
            updatedNodeData.data.verification_ids,
          );
          console.log(
            '[@context:NodeEdgeManagementProvider] UPDATED node verifications:',
            updatedNodeData.data.verifications,
          );
        } else {
          throw new Error('No selected node for update and not creating new node');
        }

        if (isNewNode) {
          // Create new node
          const newNode: UINavigationNode = {
            ...updatedNodeData,
            id: updatedNodeData.id || `node-${Date.now()}`,
            position: updatedNodeData.position || { x: 100, y: 100 },
          };

          console.log('[@context:NodeEdgeManagementProvider] Final NEW node to be added:', newNode);
          console.log('[@context:NodeEdgeManagementProvider] Final NEW node verification_ids:', newNode.data.verification_ids);
          setNodes((nds: UINavigationNode[]) => [...nds, newNode]);
          console.log('[@context:NodeEdgeManagementProvider] Created new node:', newNode.id);
        } else if (selectedNode) {
          // Update existing node
          const updatedNodes = nodes.map((node) => {
            if (node.id === selectedNode.id) {
              console.log('[@context:NodeEdgeManagementProvider] Replacing node:', node.id);
              console.log('[@context:NodeEdgeManagementProvider] OLD node data:', node);
              console.log('[@context:NodeEdgeManagementProvider] OLD node verification_ids:', node.data.verification_ids);
              console.log('[@context:NodeEdgeManagementProvider] NEW node data:', updatedNodeData);
              console.log('[@context:NodeEdgeManagementProvider] NEW node verification_ids:', updatedNodeData.data.verification_ids);
              return updatedNodeData; // ✅ Use the carefully prepared node data
            }
            return node;
          });

          setNodes(updatedNodes);
          console.log('[@context:NodeEdgeManagementProvider] Updated node:', selectedNode.id);
          console.log('[@context:NodeEdgeManagementProvider] Updated nodes array length:', updatedNodes.length);
          
          // Log the specific updated node
          const updatedNode = updatedNodes.find(n => n.id === selectedNode.id);
          if (updatedNode) {
            console.log('[@context:NodeEdgeManagementProvider] Final updated node in array:', updatedNode);
            console.log('[@context:NodeEdgeManagementProvider] Final updated node verification_ids:', updatedNode.data.verification_ids);
          }
        }

        // Step 3: Auto-save tree to persist verifications to database
        console.log(
          '[@context:NodeEdgeManagementProvider] Auto-saving tree with verifications to database',
        );
        console.log(
          '[@context:NodeEdgeManagementProvider] Current nodes state before tree save:',
          nodes,
        );

        await saveToConfig(userInterfaceId);

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
            ...formData,
            data: {
              ...formData.data,
              verification_ids: [], // ✅ Empty array if verification save failed
              verifications: [], // ✅ Empty array if verification save failed
            },
          };
        } else if (selectedNode) {
          fallbackNodeData = {
            ...selectedNode, // ✅ Preserve original node structure
            label: formData.label,
            data: {
              ...selectedNode.data, // ✅ Preserve existing data structure
              ...formData.data, // Apply form changes
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

      console.log(`