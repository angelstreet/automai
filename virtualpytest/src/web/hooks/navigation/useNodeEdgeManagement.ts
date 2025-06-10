import { useCallback } from 'react';
import { UINavigationNode, UINavigationEdge } from '../../types/pages/Navigation_Types';

interface NodeEdgeManagementProps {
  nodes: UINavigationNode[];
  edges: UINavigationEdge[];
  selectedNode: UINavigationNode | null;
  selectedEdge: UINavigationEdge | null;
  nodeForm: any;
  edgeForm: any;
  isNewNode: boolean;
  setNodes: (nodes: any) => void;
  setEdges: (edges: any) => void;
  setSelectedNode: (node: UINavigationNode | null) => void;
  setSelectedEdge: (edge: UINavigationEdge | null) => void;
  setNodeForm: (form: any) => void;
  setEdgeForm: (form: any) => void;
  setIsNodeDialogOpen: (isOpen: boolean) => void;
  setIsEdgeDialogOpen: (isOpen: boolean) => void;
  setIsNewNode: (isNew: boolean) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  setAllNodes: (nodes: UINavigationNode[]) => void;
  setAllEdges: (edges: UINavigationEdge[]) => void;
}

export const useNodeEdgeManagement = (props: NodeEdgeManagementProps) => {
  const {
    nodes,
    edges,
    selectedNode,
    selectedEdge,
    nodeForm,
    edgeForm,
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
    setAllNodes,
    setAllEdges
  } = props;
  
  // Save node changes
  const saveNodeChanges = useCallback((formData: any) => {
    console.log('[@hook:useNodeEdgeManagement] Saving node changes:', formData);
    
    if (isNewNode) {
      // Create new node
      const newNode: UINavigationNode = {
        ...formData,
        id: formData.id || `node-${Date.now()}`,
        position: formData.position || { x: 100, y: 100 }
      };
      
      // Add node to both node arrays
      setNodes((nds: UINavigationNode[]) => [...nds, newNode]);
      setAllNodes((nds: UINavigationNode[]) => [...nds, newNode]);
      
      console.log('[@hook:useNodeEdgeManagement] Created new node:', newNode);
    } else if (selectedNode) {
      // Update existing node
      const updatedNodes = nodes.map((node) => {
        if (node.id === selectedNode.id) {
          return { ...node, ...formData };
        }
        return node;
      });
      
      // Update allNodes as well
      const updatedAllNodes = nodes.map((node) => {
        if (node.id === selectedNode.id) {
          return { ...node, ...formData };
        }
        return node;
      });
      
      setNodes(updatedNodes);
      setAllNodes(updatedAllNodes);
      
      console.log('[@hook:useNodeEdgeManagement] Updated node:', selectedNode.id);
    }
    
    // Clean up state
    setSelectedNode(null);
    setNodeForm(null);
    setIsNodeDialogOpen(false);
    setIsNewNode(false);
    setHasUnsavedChanges(true);
  }, [
    isNewNode,
    selectedNode,
    nodes,
    setNodes,
    setAllNodes,
    setSelectedNode,
    setNodeForm,
    setIsNodeDialogOpen,
    setIsNewNode,
    setHasUnsavedChanges
  ]);
  
  // Save edge changes
  const saveEdgeChanges = useCallback((formData: any) => {
    console.log('[@hook:useNodeEdgeManagement] Saving edge changes:', formData);
    
    if (selectedEdge) {
      // Update existing edge
      const updatedEdges = edges.map((edge) => {
        if (edge.id === selectedEdge.id) {
          return { ...edge, ...formData };
        }
        return edge;
      });
      
      // Update allEdges as well
      const updatedAllEdges = edges.map((edge) => {
        if (edge.id === selectedEdge.id) {
          return { ...edge, ...formData };
        }
        return edge;
      });
      
      setEdges(updatedEdges);
      setAllEdges(updatedAllEdges);
      
      console.log('[@hook:useNodeEdgeManagement] Updated edge:', selectedEdge.id);
    }
    
    // Clean up state
    setSelectedEdge(null);
    setEdgeForm(null);
    setIsEdgeDialogOpen(false);
    setHasUnsavedChanges(true);
  }, [
    selectedEdge,
    edges,
    setEdges,
    setAllEdges,
    setSelectedEdge,
    setEdgeForm,
    setIsEdgeDialogOpen,
    setHasUnsavedChanges
  ]);
  
  // Delete selected node or edge
  const deleteSelected = useCallback(() => {
    console.log('[@hook:useNodeEdgeManagement] Deleting selected item');
    
    if (selectedNode) {
      // Delete node
      const nodeId = selectedNode.id;
      
      // Filter out the node
      const updatedNodes = nodes.filter((node) => node.id !== nodeId);
      const updatedAllNodes = nodes.filter((node) => node.id !== nodeId);
      
      // Filter out any edges connected to this node
      const updatedEdges = edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      );
      const updatedAllEdges = edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      );
      
      setNodes(updatedNodes);
      setAllNodes(updatedAllNodes);
      setEdges(updatedEdges);
      setAllEdges(updatedAllEdges);
      
      console.log(`[@hook:useNodeEdgeManagement] Deleted node: ${nodeId}`);
    } else if (selectedEdge) {
      // Delete edge
      const edgeId = selectedEdge.id;
      
      // Filter out the edge
      const updatedEdges = edges.filter((edge) => edge.id !== edgeId);
      const updatedAllEdges = edges.filter((edge) => edge.id !== edgeId);
      
      setEdges(updatedEdges);
      setAllEdges(updatedAllEdges);
      
      console.log(`[@hook:useNodeEdgeManagement] Deleted edge: ${edgeId}`);
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
    setAllNodes,
    setAllEdges,
    setSelectedNode,
    setSelectedEdge,
    setNodeForm,
    setEdgeForm,
    setIsNodeDialogOpen,
    setIsEdgeDialogOpen,
    setHasUnsavedChanges
  ]);
  
  // Add new node
  const addNewNode = useCallback((nodeType: string, position: { x: number, y: number }) => {
    console.log(`[@hook:useNodeEdgeManagement] Adding new node of type: ${nodeType}`);
    
    // Create an initial form for the new node
    const initialForm = {
      id: `node-${Date.now()}`,
      data: {
        label: `New ${nodeType}`,
        type: nodeType,
        depth: 0,
        parent: []
      },
      position: position,
      type: 'uiNavigation'
    };
    
    // Set form and open dialog
    setNodeForm(initialForm);
    setIsNewNode(true);
    setIsNodeDialogOpen(true);
    
    console.log('[@hook:useNodeEdgeManagement] Node form initialized:', initialForm);
  }, [setNodeForm, setIsNewNode, setIsNodeDialogOpen]);
  
  // Cancel node changes
  const cancelNodeChanges = useCallback(() => {
    console.log('[@hook:useNodeEdgeManagement] Cancelling node changes');
    
    // Clean up state
    setSelectedNode(null);
    setNodeForm(null);
    setIsNodeDialogOpen(false);
    setIsNewNode(false);
  }, [setSelectedNode, setNodeForm, setIsNodeDialogOpen, setIsNewNode]);
  
  // Close selection panel
  const closeSelectionPanel = useCallback(() => {
    console.log('[@hook:useNodeEdgeManagement] Closing selection panel');
    
    // Clean up state
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
    setIsNewNode
  ]);
  
  // Reset node
  const resetNode = useCallback((nodeId: string) => {
    console.log(`[@hook:useNodeEdgeManagement] Resetting node: ${nodeId}`);
    
    // Find the node in the original dataset
    const originalNode = nodes.find((node) => node.id === nodeId);
    
    if (originalNode) {
      // Update the form with original data
      setNodeForm({ ...originalNode });
      console.log('[@hook:useNodeEdgeManagement] Node form reset to original state');
    }
  }, [nodes, setNodeForm]);
  
  return {
    saveNodeChanges,
    saveEdgeChanges,
    deleteSelected,
    addNewNode,
    cancelNodeChanges,
    closeSelectionPanel,
    resetNode
  };
}; 