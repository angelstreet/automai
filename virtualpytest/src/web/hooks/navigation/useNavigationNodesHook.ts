import { useState, useCallback, useEffect, useMemo } from 'react';
import { addEdge, Connection } from 'reactflow';

import { useNavigationNodes } from '../../contexts/navigation';
import {
  UINavigationNode,
  UINavigationEdge,
  ConnectionResult,
} from '../../types/pages/Navigation_Types';
import { useConnectionRules } from './useConnectionRules';

export const useNavigationNodesHook = () => {
  // Use the focused context
  const nodesContext = useNavigationNodes();

  // Connection rules hook
  const { validateConnection, getRulesSummary } = useConnectionRules();

  // Additional local state
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);

  // Explicitly type the validateConnection function
  const typedValidateConnection = useCallback(
    (
      sourceNode: UINavigationNode,
      targetNode: UINavigationNode,
      params: Connection,
    ): ConnectionResult => {
      return validateConnection(sourceNode, targetNode, params) as ConnectionResult;
    },
    [validateConnection],
  );

  // Simplified onNodesChange with change tracking
  const customOnNodesChange = useCallback(
    (changes: any[]) => {
      // Apply changes to nodes
      nodesContext.onNodesChange(changes);
    },
    [nodesContext.onNodesChange],
  );

  // Handle edge changes
  const onEdgesChange = useCallback(
    (changes: any[]) => {
      nodesContext.onEdgesChange(changes);
    },
    [nodesContext.onEdgesChange],
  );

  // Handle new connections
  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;

      const sourceNode = nodesContext.nodes.find((n) => n.id === params.source);
      const targetNode = nodesContext.nodes.find((n) => n.id === params.target);

      if (!sourceNode || !targetNode) {
        console.error('[@hook:useNavigationNodesHook] Source or target node not found');
        return;
      }

      // Use the connection rules function
      const connectionResult = typedValidateConnection(sourceNode, targetNode, params);

      // Check if connection is allowed
      if (!connectionResult.isAllowed) {
        console.error(
          '[@hook:useNavigationNodesHook] Connection rejected:',
          connectionResult.reason,
        );
        return;
      }

      // Apply node updates if any
      if (connectionResult.sourceNodeUpdates || connectionResult.targetNodeUpdates) {
        const updateNodeFunction = (nds: UINavigationNode[]) =>
          nds.map((node) => {
            if (node.id === sourceNode.id && connectionResult.sourceNodeUpdates) {
              return {
                ...node,
                position: node.position,
                data: {
                  ...node.data,
                  ...connectionResult.sourceNodeUpdates,
                },
              };
            }
            if (node.id === targetNode.id && connectionResult.targetNodeUpdates) {
              return {
                ...node,
                position: node.position,
                data: {
                  ...node.data,
                  ...connectionResult.targetNodeUpdates,
                },
              };
            }
            return node;
          });

        nodesContext.setNodes(updateNodeFunction);
      }

      // Create the edge
      const edgeId = `${params.source}-${params.target}`;
      const newEdge: UINavigationEdge = {
        id: edgeId,
        source: params.source,
        target: params.target,
        sourceHandle: params.sourceHandle,
        targetHandle: params.targetHandle,
        type: 'uiNavigation',
        data: {
          edgeType: connectionResult.edgeType,
          description: `Connection from ${sourceNode.data.label} to ${targetNode.data.label}`,
          from: sourceNode.data.label,
          to: targetNode.data.label,
        },
      };

      // Add edge
      nodesContext.setEdges((eds) => addEdge(newEdge, eds));
    },
    [nodesContext.nodes, nodesContext.setNodes, nodesContext.setEdges, typedValidateConnection],
  );

  // Handle node selection
  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: UINavigationNode) => {
      event.stopPropagation();
      nodesContext.setSelectedNode(node as UINavigationNode);
      nodesContext.setSelectedEdge(null);
    },
    [nodesContext.setSelectedNode, nodesContext.setSelectedEdge],
  );

  // Handle edge selection
  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: UINavigationEdge) => {
      event.stopPropagation();
      nodesContext.setSelectedEdge(edge as UINavigationEdge);
      nodesContext.setSelectedNode(null);
    },
    [nodesContext.setSelectedEdge, nodesContext.setSelectedNode],
  );

  // Handle pane click (deselect)
  const onPaneClick = useCallback(() => {
    nodesContext.setSelectedNode(null);
    nodesContext.setSelectedEdge(null);
  }, [nodesContext.setSelectedNode, nodesContext.setSelectedEdge]);

  // Handle double-click on node for focus
  const onNodeDoubleClick = useCallback(
    (event: React.MouseEvent, node: UINavigationNode) => {
      event.stopPropagation();
      const uiNode = node as UINavigationNode;

      // Check if there's currently a filter applied
      if (nodesContext.focusNodeId) {
        // If filter is applied, reset it to show all nodes
        nodesContext.setFocusNodeId(null);
        nodesContext.setMaxDisplayDepth(5);
      } else {
        // If no filter is applied, focus on the double-clicked node (if it's focusable)
        const isFocusableNode = uiNode.data.type === 'menu' || uiNode.data.is_root;

        if (isFocusableNode) {
          nodesContext.setFocusNodeId(uiNode.id);
          nodesContext.setMaxDisplayDepth(3);
        }
      }
    },
    [nodesContext.focusNodeId, nodesContext.setFocusNodeId, nodesContext.setMaxDisplayDepth],
  );

  // Helper function to check if a node is descendant of another
  const isNodeDescendantOf = useCallback(
    (node: UINavigationNode, ancestorId: string, _nodes: UINavigationNode[]): boolean => {
      if (!node.data.parent || node.data.parent.length === 0) return false;
      return node.data.parent.includes(ancestorId);
    },
    [],
  );

  // Get filtered nodes based on focus node and depth
  const filteredNodes = useMemo(() => {
    const allNodes = nodesContext.nodes;

    if (!nodesContext.focusNodeId) {
      // No focus node - apply depth filtering to all nodes
      return allNodes.filter((node) => {
        const nodeDepth = node.data.depth || 0;
        return nodeDepth <= nodesContext.maxDisplayDepth;
      });
    }

    // Find the focus node
    const focusNode = allNodes.find((n) => n.id === nodesContext.focusNodeId);
    if (!focusNode) {
      return allNodes;
    }

    const focusDepth = focusNode.data.depth || 0;
    const maxAbsoluteDepth = focusDepth + nodesContext.maxDisplayDepth;

    // Show focus node, its siblings, and its descendants
    return allNodes.filter((node) => {
      const nodeDepth = node.data.depth || 0;

      // Include the focus node itself
      if (node.id === nodesContext.focusNodeId) {
        return true;
      }

      // Include descendants within depth limit
      const isDescendant = isNodeDescendantOf(node, nodesContext.focusNodeId!, allNodes);
      if (isDescendant && nodeDepth <= maxAbsoluteDepth) {
        return true;
      }

      // Include siblings (same depth and parent)
      if (nodeDepth === focusDepth) {
        const focusParent = focusNode.data.parent || [];
        const nodeParent = node.data.parent || [];
        return JSON.stringify(focusParent) === JSON.stringify(nodeParent);
      }

      return false;
    });
  }, [
    nodesContext.nodes,
    nodesContext.focusNodeId,
    nodesContext.maxDisplayDepth,
    isNodeDescendantOf,
  ]);

  // Get filtered edges (only between visible nodes)
  const filteredEdges = useMemo(() => {
    const visibleNodeIds = new Set(filteredNodes.map((n) => n.id));
    return nodesContext.edges.filter(
      (edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target),
    );
  }, [nodesContext.edges, filteredNodes]);

  // Focus management functions
  const setFocusNode = useCallback(
    (nodeId: string | null) => {
      console.log('[@hook:useNavigationNodesHook] Setting focus node:', nodeId);
      nodesContext.setFocusNodeId(nodeId);
    },
    [nodesContext.setFocusNodeId],
  );

  const setDisplayDepth = useCallback(
    (depth: number) => {
      console.log('[@hook:useNavigationNodesHook] Setting display depth:', depth);
      nodesContext.setMaxDisplayDepth(depth);
    },
    [nodesContext.setMaxDisplayDepth],
  );

  const resetFocus = useCallback(() => {
    console.log('[@hook:useNavigationNodesHook] Resetting focus');
    nodesContext.setFocusNodeId(null);
    nodesContext.setMaxDisplayDepth(5);
  }, [nodesContext.setFocusNodeId, nodesContext.setMaxDisplayDepth]);

  // Update available focus nodes when nodes change
  useEffect(() => {
    const focusableNodes = nodesContext.nodes
      .filter((node) => node.data.type === 'menu' || node.data.is_root)
      .map((node) => ({
        id: node.id,
        label: node.data.label,
        depth: node.data.depth || 0,
      }))
      .sort((a, b) => a.depth - b.depth || a.label.localeCompare(b.label));

    nodesContext.setAvailableFocusNodes(focusableNodes);
  }, [nodesContext.nodes, nodesContext.setAvailableFocusNodes]);

  // Return the hook interface
  return useMemo(
    () => ({
      // Filtered display data
      nodes: filteredNodes,
      edges: filteredEdges,

      // Raw data
      allNodes: nodesContext.nodes,
      allEdges: nodesContext.edges,

      // Selection state
      selectedNode: nodesContext.selectedNode,
      selectedEdge: nodesContext.selectedEdge,

      // Focus state
      focusNodeId: nodesContext.focusNodeId,
      maxDisplayDepth: nodesContext.maxDisplayDepth,
      availableFocusNodes: nodesContext.availableFocusNodes,

      // Local state
      pendingConnection,

      // Setters
      setNodes: nodesContext.setNodes,
      setEdges: nodesContext.setEdges,
      setSelectedNode: nodesContext.setSelectedNode,
      setSelectedEdge: nodesContext.setSelectedEdge,
      setPendingConnection,

      // Event handlers
      onNodesChange: customOnNodesChange,
      onEdgesChange,
      onConnect,
      onNodeClick,
      onEdgeClick,
      onPaneClick,
      onNodeDoubleClick,

      // Focus management
      setFocusNode,
      setDisplayDepth,
      resetFocus,
      isNodeDescendantOf,

      // Connection rules
      getConnectionRulesSummary: getRulesSummary,

      // Actions
      resetToInitialState: nodesContext.resetToInitialState,
      resetSelection: nodesContext.resetSelection,
    }),
    [
      filteredNodes,
      filteredEdges,
      nodesContext.nodes,
      nodesContext.edges,
      nodesContext.selectedNode,
      nodesContext.selectedEdge,
      nodesContext.focusNodeId,
      nodesContext.maxDisplayDepth,
      nodesContext.availableFocusNodes,
      pendingConnection,
      customOnNodesChange,
      onEdgesChange,
      onConnect,
      onNodeClick,
      onEdgeClick,
      onPaneClick,
      onNodeDoubleClick,
      setFocusNode,
      setDisplayDepth,
      resetFocus,
      isNodeDescendantOf,
      getRulesSummary,
      nodesContext.resetToInitialState,
      nodesContext.resetSelection,
    ],
  );
};
