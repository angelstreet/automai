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
    });
    state.setIsNodeDialogOpen(true);
    state.setIsNewNode(true);
    state.setHasUnsavedChanges(true);
    console.log('[@hook:useNodeEdgeManagement] Added new node:', newNode.data.label);
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
      depth: state.nodeForm.depth || 0,
      menu_type: state.nodeForm.menu_type || (state.nodeForm.type === 'menu' ? 'main' : undefined),
    };
    
    // Update function for nodes
    const updateNodeFunction = (nds: UINavigationNode[]) => 
      nds.map((node) =>
        node.id === state.selectedNode!.id
          ? {
              ...node,
              type: state.nodeForm.type === 'menu' ? 'uiMenu' : 'uiScreen',
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
    
    console.log('[@hook:useNodeEdgeManagement] Saved node changes for:', state.nodeForm.label);
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
    
    // Get source and target node names for the edge
    const sourceNode = state.nodes.find(node => node.id === state.selectedEdge!.source);
    const targetNode = state.nodes.find(node => node.id === state.selectedEdge!.target);
    const fromNodeName = sourceNode?.data?.label || state.selectedEdge!.source;
    const toNodeName = targetNode?.data?.label || state.selectedEdge!.target;
    
    // Update function for edges
    const updateEdgeFunction = (eds: UINavigationEdge[]) =>
      eds.map((edge) =>
        edge.id === state.selectedEdge!.id
          ? {
              ...edge,
              data: {
                ...edge.data,
                action: state.edgeForm.action,
                description: state.edgeForm.description,
                from: fromNodeName,
                to: toNodeName
              },
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
        
        let updatedNodes = nds;
        if (!hasRemainingIncomingEdges) {
          // No more incoming edges, clear parent chain and reset depth
          updatedNodes = nds.map((node) => {
            if (node.id === targetNodeId) {
              console.log(`[@hook:useNodeEdgeManagement] Clearing parent/depth for node ${node.data.label} - no remaining incoming edges`);
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
          console.log(`[@hook:useNodeEdgeManagement] Node ${targetNodeId} still has incoming edges, keeping parent/depth`);
        }
        
        return { newEdges, updatedNodes };
      };
      
      // Update filtered arrays
      const filteredResult = updateEdgesAndNodes(state.edges, state.nodes);
      state.setEdges(() => filteredResult.newEdges);
      state.setNodes(() => filteredResult.updatedNodes);
      
      // Update complete arrays
      state.setAllEdges(filteredResult.newEdges);
      state.setAllNodes(filteredResult.updatedNodes);
      
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
      const beforeCount = eds.length;
      const newEdges = eds.filter((edge) => edge.target !== targetNodeId && edge.source !== targetNodeId);
      const removedCount = beforeCount - newEdges.length;
      console.log(`[@hook:useNodeEdgeManagement] Removed ${removedCount} total edges (incoming and outgoing) for node ${targetNodeId}`);
      return newEdges;
    };
    
    // Apply to filtered arrays first
    console.log(`[@hook:useNodeEdgeManagement] Updating filtered nodes and edges for reset`);
    state.setNodes(updateNodeFunction);
    state.setEdges(removeEdgesFunction);
    
    // Apply to complete arrays (allNodes and allEdges) - these should always exist
    console.log(`[@hook:useNodeEdgeManagement] Updating allNodes and allEdges for reset`);
    state.setAllNodes(updateNodeFunction);
    state.setAllEdges(removeEdgesFunction);
    
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