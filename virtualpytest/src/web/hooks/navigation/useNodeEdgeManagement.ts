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

    state.setNodes((nds) => [...nds, newNode]);
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
    
    // Update the node
    state.setNodes((nds) =>
      nds.map((node) =>
        node.id === state.selectedNode!.id
          ? {
              ...node,
              type: state.nodeForm.type === 'menu' ? 'uiMenu' : 'uiScreen',
              data: updatedNodeData,
            }
          : node
      )
    );
    state.setHasUnsavedChanges(true);
    state.setIsNodeDialogOpen(false);
    state.setIsNewNode(false);
    
    console.log('[@hook:useNodeEdgeManagement] Saved node changes for:', state.nodeForm.label);
  }, [state]);

  // Cancel node changes
  const cancelNodeChanges = useCallback(() => {
    if (state.isNewNode && state.selectedNode) {
      // Delete the newly created node if canceling
      state.setNodes((nds) => nds.filter((node) => node.id !== state.selectedNode!.id));
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
    
    state.setEdges((eds) =>
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
      )
    );
    state.setHasUnsavedChanges(true);
    state.setIsEdgeDialogOpen(false);
    
    console.log('[@hook:useNodeEdgeManagement] Saved edge changes for:', state.selectedEdge.id);
  }, [state]);

  // Delete selected node or edge
  const deleteSelected = useCallback(() => {
    if (state.selectedNode) {
      console.log('[@hook:useNodeEdgeManagement] Deleting node:', state.selectedNode.data.label);
      state.setNodes((nds) => nds.filter((node) => node.id !== state.selectedNode!.id));
      state.setEdges((eds) => eds.filter((edge) => 
        edge.source !== state.selectedNode!.id && edge.target !== state.selectedNode!.id
      ));
      state.setSelectedNode(null);
      state.setHasUnsavedChanges(true);
    } else if (state.selectedEdge) {
      console.log('[@hook:useNodeEdgeManagement] Deleting edge:', state.selectedEdge.id);
      
      // Handle parent relationship cleanup when deleting edges
      state.setEdges((eds) => {
        const newEdges = eds.filter((edge) => edge.id !== state.selectedEdge!.id);
        
        // Check if the target node of the deleted edge has any remaining incoming edges
        const targetNodeId = state.selectedEdge!.target;
        const hasRemainingIncomingEdges = newEdges.some(edge => edge.target === targetNodeId);
        
        if (!hasRemainingIncomingEdges) {
          // No more incoming edges, clear parent chain and reset depth
          state.setNodes((nds) => nds.map((node) => {
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
          }));
        } else {
          console.log(`[@hook:useNodeEdgeManagement] Node ${targetNodeId} still has incoming edges, keeping parent/depth`);
        }
        
        return newEdges;
      });
      
      state.setSelectedEdge(null);
      state.setHasUnsavedChanges(true);
    }
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
    closeSelectionPanel,
  };
}; 