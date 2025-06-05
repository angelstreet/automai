import { useCallback } from 'react';
import { UINavigationNode, UINavigationEdge, NodeForm, EdgeForm } from '../../types/navigationTypes';

interface NodeEdgeState {
  nodes: UINavigationNode[];
  edges: UINavigationEdge[];
  selectedNode: UINavigationNode | null;
  selectedEdge: UINavigationEdge | null;
  nodeForm: NodeForm;
  edgeForm: EdgeForm;
  isNewNode: boolean;
  setNodes: (nodes: UINavigationNode[] | ((prev: UINavigationNode[]) => UINavigationNode[])) => void;
  setEdges: (edges: UINavigationEdge[] | ((prev: UINavigationEdge[]) => UINavigationEdge[])) => void;
  setSelectedNode: (node: UINavigationNode | null) => void;
  setSelectedEdge: (edge: UINavigationEdge | null) => void;
  setNodeForm: (form: NodeForm) => void;
  setEdgeForm: (form: EdgeForm) => void;
  setIsNodeDialogOpen: (open: boolean) => void;
  setIsEdgeDialogOpen: (open: boolean) => void;
  setIsNewNode: (isNew: boolean) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  setAllNodes: (fn: (nds: UINavigationNode[]) => UINavigationNode[]) => void;
  setAllEdges: (fn: (eds: UINavigationEdge[]) => UINavigationEdge[]) => void;
}

export const useNodeEdgeManagement = (state: NodeEdgeState) => {
  // Add new node
  const addNewNode = useCallback(() => {
    const nodeId = `node-${Date.now()}`;
    const newNode: UINavigationNode = {
      id: nodeId,
      type: 'uiScreen',
      position: { x: Math.random() * 300 + 100, y: Math.random() * 300 + 100 },
      data: {
        label: 'New Node',
        type: 'screen',
        description: '',
        parent: [],
        depth: 0,
        is_root: false,
        verifications: [],
      },
    };

    // Add to filtered nodes
    state.setNodes((nds) => [...nds, newNode]);
    
    // Also add to allNodes
    state.setAllNodes((nds) => [...nds, newNode]);
    
    state.setSelectedNode(newNode);
    state.setNodeForm({
      label: newNode.data.label,
      type: newNode.data.type,
      description: newNode.data.description || '',
      screenshot: newNode.data.screenshot,
      menu_type: newNode.data.menu_type,
      verifications: [],
    });
    state.setIsNodeDialogOpen(true);
    state.setIsNewNode(true);
    state.setHasUnsavedChanges(true);
    console.log('[@hook:useNodeEdgeManagement] Added new node:', newNode.data.label, 'with is_root: false');
  }, [state]);

  // Save node changes
  const saveNodeChanges = useCallback(async () => {
    if (!state.selectedNode) return;
    
    // Validate required fields
    if (!state.nodeForm.label.trim()) {
      return; // Don't save if screen name is empty
    }
    
    // Update node data
    let updatedNodeData = {
      ...state.selectedNode.data,
      label: state.nodeForm.label,
      type: state.nodeForm.type,
      description: state.nodeForm.description,
      screenshot: state.nodeForm.screenshot,
      depth: state.nodeForm.depth || 0,
      menu_type: state.nodeForm.menu_type || (state.nodeForm.type === 'menu' ? 'main' : undefined),
      is_root: state.selectedNode.data.is_root,
      // Add verifications field to preserve verifications when saving node changes
      verifications: state.nodeForm.verifications || state.selectedNode.data.verifications || [],
    };
    
    // Update function for nodes - IMPORTANT: Preserve position to prevent auto-reorganization
    const updateNodeFunction = (nds: UINavigationNode[]) => 
      nds.map((node) =>
        node.id === state.selectedNode!.id
          ? {
              ...node,
              type: state.nodeForm.type === 'menu' ? 'uiMenu' : 'uiScreen',
              // Explicitly preserve the position to prevent React Flow from reorganizing
              position: node.position,
              data: updatedNodeData,
            }
          : node
      );
    
    // Update the filtered nodes
    state.setNodes(updateNodeFunction);
    
    // Also update allNodes
    state.setAllNodes(updateNodeFunction);
    
    state.setHasUnsavedChanges(true);
    state.setIsNodeDialogOpen(false);
    state.setIsNewNode(false);
    
    console.log('[@hook:useNodeEdgeManagement] Saved node changes for:', state.nodeForm.label, 'with preserved position:', state.selectedNode.position);
  }, [state]);

  // Cancel node changes
  const cancelNodeChanges = useCallback(() => {
    if (state.isNewNode && state.selectedNode) {
      // Delete the newly created node if canceling
      const deleteNodeFunction = (nds: UINavigationNode[]) => nds.filter((node) => node.id !== state.selectedNode!.id);
      
      state.setNodes(deleteNodeFunction);
      
      // Also remove from allNodes
      state.setAllNodes(deleteNodeFunction);
      
      state.setSelectedNode(null);
      console.log('[@hook:useNodeEdgeManagement] Canceled new node creation');
    }
    state.setIsNodeDialogOpen(false);
    state.setIsNewNode(false);
  }, [state]);

  // Save edge changes
  const saveEdgeChanges = useCallback(() => {
    if (!state.selectedEdge) return;
    
    console.log('[@hook:useNodeEdgeManagement] Saving edge changes');
    console.log('[@hook:useNodeEdgeManagement] Current edgeForm:', state.edgeForm);
    console.log('[@hook:useNodeEdgeManagement] finalWaitTime being saved:', state.edgeForm.finalWaitTime);
    
    // Get source and target node names for the edge
    const sourceNode = state.nodes.find(node => node.id === state.selectedEdge!.source);
    const targetNode = state.nodes.find(node => node.id === state.selectedEdge!.target);
    const fromNodeName = sourceNode?.data?.label || state.selectedEdge!.source;
    const toNodeName = targetNode?.data?.label || state.selectedEdge!.target;
    
    const updatedEdgeData = {
      ...state.selectedEdge.data,
      actions: state.edgeForm.actions,
      retryActions: state.edgeForm.retryActions,
      finalWaitTime: state.edgeForm.finalWaitTime,
      description: state.edgeForm.description,
      from: fromNodeName,
      to: toNodeName
    };
    
    console.log('[@hook:useNodeEdgeManagement] Updated edge data:', updatedEdgeData);
    
    // Update function for edges
    const updateEdgeFunction = (eds: UINavigationEdge[]) =>
      eds.map((edge) =>
        edge.id === state.selectedEdge!.id
          ? {
              ...edge,
              data: updatedEdgeData,
            }
          : edge
      );
    
    state.setEdges(updateEdgeFunction);
    
    // Also update allEdges
    state.setAllEdges(updateEdgeFunction);
    
    state.setHasUnsavedChanges(true);
    state.setIsEdgeDialogOpen(false);
    
    console.log('[@hook:useNodeEdgeManagement] Saved edge changes for:', state.selectedEdge.id);
  }, [state]);

  // Delete selected node or edge
  const deleteSelected = useCallback(() => {
    if (state.selectedNode) {
      console.log('[@hook:useNodeEdgeManagement] Deleting node:', state.selectedNode.data.label);
      
      const deleteNodeFunction = (nds: UINavigationNode[]) => nds.filter((node) => node.id !== state.selectedNode!.id);
      const deleteEdgeFunction = (eds: UINavigationEdge[]) => eds.filter((edge) => 
        edge.source !== state.selectedNode!.id && edge.target !== state.selectedNode!.id
      );
      
      // Update filtered arrays
      state.setNodes(deleteNodeFunction);
      state.setEdges(deleteEdgeFunction);
      
      // Update complete arrays
      state.setAllNodes(deleteNodeFunction);
      state.setAllEdges(deleteEdgeFunction);
      
      state.setSelectedNode(null);
      state.setHasUnsavedChanges(true);
    } else if (state.selectedEdge) {
      console.log('[@hook:useNodeEdgeManagement] Deleting edge:', state.selectedEdge.id);
      
      // Handle parent relationship cleanup when deleting edges
      const updateEdgesAndNodes = (eds: UINavigationEdge[], nds: UINavigationNode[]) => {
        const newEdges = eds.filter((edge) => edge.id !== state.selectedEdge!.id);
        
        // Check if the target node of the deleted edge has any remaining incoming edges
        const targetNodeId = state.selectedEdge!.target;
        const hasRemainingIncomingEdges = newEdges.some(edge => edge.target === targetNodeId);
        
        // Issue 2 Fix: Check if the source node (menu) loses its last outgoing edge
        const sourceNodeId = state.selectedEdge!.source;
        const hasRemainingOutgoingEdges = newEdges.some(edge => edge.source === sourceNodeId);
        
        let updatedNodes = nds;
        
        // Handle target node parent cleanup
        if (!hasRemainingIncomingEdges) {
          updatedNodes = updatedNodes.map((node) => {
            if (node.id === targetNodeId) {
              console.log(`[@hook:useNodeEdgeManagement] Clearing parent/depth for target node ${node.data.label} - no remaining incoming edges`);
              return {
                ...node,
                data: {
                  ...node.data,
                  parent: [],
                  depth: 0
                }
              };
            }
            return node;
          });
        } else {
          console.log(`[@hook:useNodeEdgeManagement] Target node ${targetNodeId} still has incoming edges, keeping parent/depth`);
        }
        
        // Issue 2 Fix: Handle source node (menu) parent cleanup when it loses its last edge
        if (!hasRemainingOutgoingEdges) {
          const sourceNode = nds.find(node => node.id === sourceNodeId);
          if (sourceNode && sourceNode.data.type === 'menu') {
            updatedNodes = updatedNodes.map((node) => {
              if (node.id === sourceNodeId) {
                console.log(`[@hook:useNodeEdgeManagement] Menu node ${node.data.label} lost its last edge - resetting parent/depth`);
                return {
                  ...node,
                  data: {
                    ...node.data,
                    parent: [],
                    depth: 0
                  }
                };
              }
              return node;
            });
          }
        }
        
        return { newEdges, updatedNodes };
      };
      
      // Update filtered arrays
      const filteredResult = updateEdgesAndNodes(state.edges, state.nodes);
      state.setEdges(() => filteredResult.newEdges);
      state.setNodes(() => filteredResult.updatedNodes);
      
      // Update complete arrays
      state.setAllEdges(() => filteredResult.newEdges);
      state.setAllNodes(() => filteredResult.updatedNodes);
      
      state.setSelectedEdge(null);
      state.setHasUnsavedChanges(true);
    }
  }, [state]);

  // Reset node - clear parent chain and depth, disconnect from hierarchy
  const resetNode = useCallback((nodeId?: string) => {
    const targetNodeId = nodeId || state.selectedNode?.id;
    if (!targetNodeId) {
      console.log(`[@hook:useNodeEdgeManagement] resetNode called but no target node ID available`);
      return;
    }
    
    console.log(`[@hook:useNodeEdgeManagement] Resetting node: ${targetNodeId}`);
    
    // Update function to clear parent chain and depth for the target node
    const updateNodeFunction = (nds: UINavigationNode[]) => nds.map((node) => {
      if (node.id === targetNodeId) {
        console.log(`[@hook:useNodeEdgeManagement] Clearing parent/depth for node ${node.data.label}`);
        return {
          ...node,
          // Explicitly preserve the position to prevent React Flow from reorganizing
          position: node.position,
          data: {
            ...node.data,
            parent: [],
            depth: 0
          }
        };
      }
      return node;
    });
    
    // Remove ALL edges connected to this node (both incoming and outgoing)
    const removeEdgesFunction = (eds: UINavigationEdge[]) => {
      // First, collect all the edges we're going to remove for analysis
      const edgesToRemove = eds.filter(edge => edge.source === targetNodeId || edge.target === targetNodeId);
      
      // Track affected target nodes that might become orphaned
      const affectedTargetNodes = new Set<string>();
      edgesToRemove.forEach(edge => {
        if (edge.target !== targetNodeId) {
          affectedTargetNodes.add(edge.target);
        }
      });
      
      // Filter out the edges connected to the target node
      const newEdges = eds.filter(edge => edge.source !== targetNodeId && edge.target !== targetNodeId);
      
      return { newEdges, affectedTargetNodes };
    };
    
    // Check for orphaned nodes and update them
    const updateOrphanedNodes = (nds: UINavigationNode[], affectedNodes: Set<string>, edges: UINavigationEdge[]) => {
      return nds.map(node => {
        // Only process affected nodes
        if (affectedNodes.has(node.id)) {
          // Check if this node still has any incoming edges
          const hasIncomingEdges = edges.some(edge => edge.target === node.id);
          
          if (!hasIncomingEdges) {
            console.log(`[@hook:useNodeEdgeManagement] Resetting orphaned node: ${node.data.label}`);
            return {
              ...node,
              // Explicitly preserve the position to prevent React Flow from reorganizing
              position: node.position,
              data: {
                ...node.data,
                parent: [],
                depth: 0
              }
            };
          }
        }
        return node;
      });
    };
    
    // Process edges for the filtered arrays
    const { newEdges, affectedTargetNodes } = removeEdgesFunction(state.edges);
    console.log(`[@hook:useNodeEdgeManagement] Removed edges for node ${targetNodeId}, found ${affectedTargetNodes.size} potentially affected nodes`);
    
    // First update the target node itself
    let updatedNodes = updateNodeFunction(state.nodes);
    
    // Then handle any orphaned nodes
    if (affectedTargetNodes.size > 0) {
      updatedNodes = updateOrphanedNodes(updatedNodes, affectedTargetNodes, newEdges);
    }
    
    // Apply changes to filtered arrays
    state.setNodes(() => updatedNodes);
    state.setEdges(() => newEdges);
    
    // Apply to complete arrays (allNodes and allEdges) using the setter functions
    state.setAllNodes(allNodes => {
      // We need to process the edges separately to identify affected nodes
      const allAffectedTargetNodes = new Set<string>();
      
      // Get edges related to this node from state.edges as a reference
      state.edges.forEach(edge => {
        if (edge.source === targetNodeId || edge.target === targetNodeId) {
          if (edge.target !== targetNodeId) {
            allAffectedTargetNodes.add(edge.target);
          }
        }
      });
      
      // Update the target node itself
      let updatedAllNodes = updateNodeFunction(allNodes);
      
      // Then handle orphaned nodes, checking state.edges for incoming edges
      if (allAffectedTargetNodes.size > 0) {
        updatedAllNodes = updatedAllNodes.map(node => {
          // Only process affected nodes
          if (allAffectedTargetNodes.has(node.id)) {
            // Check if this node still has any incoming edges after removing target node edges
            const hasIncomingEdges = state.edges.some(edge => 
              edge.target === node.id && edge.source !== targetNodeId
            );
            
            if (!hasIncomingEdges) {
              console.log(`[@hook:useNodeEdgeManagement] Resetting orphaned node in allNodes: ${node.data.label}`);
              return {
                ...node,
                // Explicitly preserve the position to prevent React Flow from reorganizing
                position: node.position,
                data: {
                  ...node.data,
                  parent: [],
                  depth: 0
                }
              };
            }
          }
          return node;
        });
      }
      
      return updatedAllNodes;
    });
    
    state.setAllEdges(allEdges => {
      // Just filter out edges connected to the target node
      return allEdges.filter(edge => edge.source !== targetNodeId && edge.target !== targetNodeId);
    });
    
    // IMPORTANT: Also update the form state if this is the currently selected node
    if (state.selectedNode && state.selectedNode.id === targetNodeId) {
      console.log(`[@hook:useNodeEdgeManagement] Updating form state for reset node`);
      state.setNodeForm({
        ...state.nodeForm,
        depth: 0,
        parent: [],
      });
    }
    
    state.setHasUnsavedChanges(true);
    console.log(`[@hook:useNodeEdgeManagement] Reset complete for node ${targetNodeId}`);
  }, [state]);

  // Close selection panel
  const closeSelectionPanel = useCallback(() => {
    state.setSelectedNode(null);
    state.setSelectedEdge(null);
  }, [state]);

  return {
    addNewNode,
    saveNodeChanges,
    cancelNodeChanges,
    saveEdgeChanges,
    deleteSelected,
    resetNode,
    closeSelectionPanel,
  };
}; 