import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { useNodesState, useEdgesState } from 'reactflow';

import { UINavigationNode, UINavigationEdge } from '../../types/pages/Navigation_Types';

// ========================================
// TYPES
// ========================================

export interface NavigationNodesContextType {
  // React Flow state
  nodes: UINavigationNode[];
  setNodes: (nodes: UINavigationNode[]) => void;
  onNodesChange: (changes: any[]) => void;
  edges: UINavigationEdge[];
  setEdges: (edges: UINavigationEdge[]) => void;
  onEdgesChange: (changes: any[]) => void;

  // Selection state
  selectedNode: UINavigationNode | null;
  setSelectedNode: (node: UINavigationNode | null) => void;
  selectedEdge: UINavigationEdge | null;
  setSelectedEdge: (edge: UINavigationEdge | null) => void;

  // Filtering state
  focusNodeId: string | null;
  setFocusNodeId: (id: string | null) => void;
  maxDisplayDepth: number;
  setMaxDisplayDepth: (depth: number) => void;
  availableFocusNodes: { id: string; label: string; depth: number }[];
  setAvailableFocusNodes: (nodes: { id: string; label: string; depth: number }[]) => void;

  // History state
  initialState: { nodes: UINavigationNode[]; edges: UINavigationEdge[] } | null;
  setInitialState: (state: { nodes: UINavigationNode[]; edges: UINavigationEdge[] } | null) => void;

  // Callback functions
  resetToInitialState: () => void;
  resetSelection: () => void;
}

interface NavigationNodesProviderProps {
  children: React.ReactNode;
}

// ========================================
// CONTEXT
// ========================================

const NavigationNodesContext = createContext<NavigationNodesContextType | null>(null);

export const NavigationNodesProvider: React.FC<NavigationNodesProviderProps> = ({ children }) => {
  console.log('[@context:NavigationNodesProvider] Initializing navigation nodes context');

  // ========================================
  // STATE
  // ========================================

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Memoize React Flow arrays to prevent unnecessary context recreation
  const stableNodes = useMemo(() => nodes, [nodes]);
  const stableEdges = useMemo(() => edges, [edges]);

  // Selection state
  const [selectedNode, setSelectedNode] = useState<UINavigationNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<UINavigationEdge | null>(null);

  // Tree filtering state
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [maxDisplayDepth, setMaxDisplayDepth] = useState<number>(5);
  const [availableFocusNodes, setAvailableFocusNodes] = useState<
    { id: string; label: string; depth: number }[]
  >([]);

  // History state
  const [initialState, setInitialState] = useState<{
    nodes: UINavigationNode[];
    edges: UINavigationEdge[];
  } | null>(null);

  // ========================================
  // CALLBACK FUNCTIONS
  // ========================================

  const resetToInitialState = useCallback(() => {
    console.log('[@context:NavigationNodesProvider] Resetting to initial state');
    if (initialState) {
      setNodes(initialState.nodes);
      setEdges(initialState.edges);
    }
  }, [initialState, setNodes, setEdges]);

  const resetSelection = useCallback(() => {
    console.log('[@context:NavigationNodesProvider] Resetting selection');
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  // ========================================
  // CONTEXT VALUE
  // ========================================

  const stableAvailableFocusNodes = useMemo(() => availableFocusNodes, [availableFocusNodes]);

  const contextValue: NavigationNodesContextType = useMemo(() => {
    console.log(`[@context:NavigationNodesProvider] Creating new context value`);
    return {
      // React Flow state
      nodes: stableNodes,
      setNodes,
      onNodesChange,
      edges: stableEdges,
      setEdges,
      onEdgesChange,

      // Selection state
      selectedNode,
      setSelectedNode,
      selectedEdge,
      setSelectedEdge,

      // Filtering state
      focusNodeId,
      setFocusNodeId,
      maxDisplayDepth,
      setMaxDisplayDepth,
      availableFocusNodes: stableAvailableFocusNodes,
      setAvailableFocusNodes,

      // History state
      initialState,
      setInitialState,

      // Callbacks
      resetToInitialState,
      resetSelection,
    };
  }, [
    stableNodes,
    stableEdges,
    selectedNode,
    selectedEdge,
    focusNodeId,
    maxDisplayDepth,
    stableAvailableFocusNodes,
    initialState,
    resetToInitialState,
    resetSelection,
  ]);

  return (
    <NavigationNodesContext.Provider value={contextValue}>
      {children}
    </NavigationNodesContext.Provider>
  );
};

NavigationNodesProvider.displayName = 'NavigationNodesProvider';

// ========================================
// HOOK
// ========================================

export const useNavigationNodes = (): NavigationNodesContextType => {
  const context = useContext(NavigationNodesContext);
  if (!context) {
    throw new Error('useNavigationNodes must be used within a NavigationNodesProvider');
  }
  return context;
};
