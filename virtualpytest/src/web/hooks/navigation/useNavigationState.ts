import { useState, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useNodesState, useEdgesState, ReactFlowInstance } from 'reactflow';
import {
  UINavigationNode,
  UINavigationEdge,
  UINavigationNodeData,
  UINavigationEdgeData,
  NodeForm,
  EdgeForm,
} from '../../types/pages/Navigation_Types';

export const useNavigationState = () => {
  const { treeId, treeName, interfaceId } = useParams<{
    treeId?: string;
    treeName: string;
    interfaceId?: string;
  }>();

  // Navigation state for breadcrumbs and nested trees
  // Use treeName as both ID and name for simplified approach
  const [currentTreeId, setCurrentTreeId] = useState<string>(treeName || treeId || 'home');
  const [currentTreeName, setCurrentTreeName] = useState<string>(treeName || 'home');
  const [navigationPath, setNavigationPath] = useState<string[]>([treeName || treeId || 'home']);
  const [navigationNamePath, setNavigationNamePath] = useState<string[]>([treeName || 'home']);

  // Save operation state
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState(false);

  // Interface state
  const [userInterface, setUserInterface] = useState<any>(null);
  const [rootTree, setRootTree] = useState<any>(null);
  const [isLoadingInterface, setIsLoadingInterface] = useState<boolean>(!!interfaceId);

  // React Flow state
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // History state removed - using page reload for cancel changes
  const [initialState, setInitialState] = useState<{
    nodes: UINavigationNode[];
    edges: UINavigationEdge[];
  } | null>(null);

  // Dual arrays removed - using single source of truth
  const [currentViewRootId, setCurrentViewRootId] = useState<string | null>(null);
  const [viewPath, setViewPath] = useState<{ id: string; name: string }[]>([]);

  // UI state
  const [selectedNode, setSelectedNode] = useState<UINavigationNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<UINavigationEdge | null>(null);
  const [isNodeDialogOpen, setIsNodeDialogOpen] = useState(false);
  const [isEdgeDialogOpen, setIsEdgeDialogOpen] = useState(false);
  const [isNewNode, setIsNewNode] = useState(false);
  const [nodeForm, setNodeForm] = useState<NodeForm>({
    label: '',
    type: 'screen',
    description: '',
    verifications: [],
  });
  const [edgeForm, setEdgeForm] = useState<EdgeForm>({
    actions: [],
    retryActions: [],
    finalWaitTime: 2000,
    description: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Tree filtering state
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [maxDisplayDepth, setMaxDisplayDepth] = useState<number>(5);
  const [availableFocusNodes, setAvailableFocusNodes] = useState<
    { id: string; label: string; depth: number }[]
  >([]);

  // Progressive loading removed - loading all nodes at once

  // React Flow refs
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  return useMemo(
    () => ({
      // Route params
      treeId,
      treeName,
      interfaceId,

      // Navigation state
      currentTreeId,
      setCurrentTreeId,
      currentTreeName,
      setCurrentTreeName,
      navigationPath,
      setNavigationPath,
      navigationNamePath,
      setNavigationNamePath,

      // Save state
      isSaving,
      setIsSaving,
      saveError,
      setSaveError,
      saveSuccess,
      setSaveSuccess,
      hasUnsavedChanges,
      setHasUnsavedChanges,
      isDiscardDialogOpen,
      setIsDiscardDialogOpen,

      // Interface state
      userInterface,
      setUserInterface,
      rootTree,
      setRootTree,
      isLoadingInterface,
      setIsLoadingInterface,

      // React Flow state
      nodes,
      setNodes,
      onNodesChange,
      edges,
      setEdges,
      onEdgesChange,

      // History state removed - using page reload for cancel changes
      initialState,
      setInitialState,

      // Dual arrays removed - using single source of truth
      currentViewRootId,
      setCurrentViewRootId,
      viewPath,
      setViewPath,

      // UI state
      selectedNode,
      setSelectedNode,
      selectedEdge,
      setSelectedEdge,
      isNodeDialogOpen,
      setIsNodeDialogOpen,
      isEdgeDialogOpen,
      setIsEdgeDialogOpen,
      isNewNode,
      setIsNewNode,
      nodeForm,
      setNodeForm,
      edgeForm,
      setEdgeForm,
      isLoading,
      setIsLoading,
      error,
      setError,
      success,
      setSuccess,

      // Filtering state
      focusNodeId,
      setFocusNodeId,
      maxDisplayDepth,
      setMaxDisplayDepth,
      availableFocusNodes,
      setAvailableFocusNodes,

      // Progressive loading removed - loading all nodes at once

      // React Flow refs
      reactFlowWrapper,
      reactFlowInstance,
      setReactFlowInstance,
    }),
    [
      // Route params
      treeId,
      treeName,
      interfaceId,
      // Navigation state
      currentTreeId,
      currentTreeName,
      navigationPath,
      navigationNamePath,
      // Save state
      isSaving,
      saveError,
      saveSuccess,
      hasUnsavedChanges,
      isDiscardDialogOpen,
      // Interface state
      userInterface,
      rootTree,
      isLoadingInterface,
      // React Flow state
      nodes,
      edges,
      onNodesChange,
      onEdgesChange,
      // History state
      initialState,
      // View state
      currentViewRootId,
      viewPath,
      // UI state
      selectedNode,
      selectedEdge,
      isNodeDialogOpen,
      isEdgeDialogOpen,
      isNewNode,
      nodeForm,
      edgeForm,
      isLoading,
      error,
      success,
      // Filtering state
      focusNodeId,
      maxDisplayDepth,
      availableFocusNodes,
      // React Flow refs
      reactFlowWrapper,
      reactFlowInstance,
      // Setters (these are stable references from useState)
      setCurrentTreeId,
      setCurrentTreeName,
      setNavigationPath,
      setNavigationNamePath,
      setIsSaving,
      setSaveError,
      setSaveSuccess,
      setHasUnsavedChanges,
      setIsDiscardDialogOpen,
      setUserInterface,
      setRootTree,
      setIsLoadingInterface,
      setNodes,
      setEdges,
      setInitialState,
      setCurrentViewRootId,
      setViewPath,
      setSelectedNode,
      setSelectedEdge,
      setIsNodeDialogOpen,
      setIsEdgeDialogOpen,
      setIsNewNode,
      setNodeForm,
      setEdgeForm,
      setIsLoading,
      setError,
      setSuccess,
      setFocusNodeId,
      setMaxDisplayDepth,
      setAvailableFocusNodes,
      setReactFlowInstance,
    ],
  );
};
