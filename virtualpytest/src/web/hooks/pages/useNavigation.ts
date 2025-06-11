/**
 * Navigation Hooks
 * Consolidated navigation-related hooks for the Navigation page
 */

import { useState, useCallback, useRef } from 'react';
import { useNodesState, useEdgesState, ReactFlowInstance } from 'reactflow';
import { UINavigationNode, UINavigationEdge, UINavigationNodeData, UINavigationEdgeData } from '../../types/pages/Navigation_Types';

// Import the hook from the correct path
export { useNodeEdgeManagement } from '../navigation/useNodeEdgeManagement';

// Implement minimal versions of the missing hooks
export const useNavigationState = () => {
  // Node and edge state
  const [nodes, setNodes, onNodesChange] = useNodesState<UINavigationNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<UINavigationEdgeData>([]);
  
  // Complete node and edge state (unfiltered)
  // Dual arrays removed - using single source of truth
  
  // Tree state
  const [currentTreeId, setCurrentTreeId] = useState<string>('');
  const [currentTreeName, setCurrentTreeName] = useState<string>('');
  const [navigationPath, setNavigationPath] = useState<string[]>([]);
  const [navigationNamePath, setNavigationNamePath] = useState<string[]>([]);
  
  // Selection state
  const [selectedNode, setSelectedNode] = useState<UINavigationNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<UINavigationEdge | null>(null);
  const [nodeForm, setNodeForm] = useState<any>(null);
  const [edgeForm, setEdgeForm] = useState<any>(null);
  
  // Dialog state
  const [isNodeDialogOpen, setIsNodeDialogOpen] = useState<boolean>(false);
  const [isEdgeDialogOpen, setIsEdgeDialogOpen] = useState<boolean>(false);
  const [isNewNode, setIsNewNode] = useState<boolean>(false);
  
  // Loading state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoadingInterface, setIsLoadingInterface] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  
  // Changes state
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isDiscardDialogOpen, setIsDiscardDialogOpen] = useState<boolean>(false);
  const [initialState, setInitialState] = useState<{ nodes: UINavigationNode[], edges: UINavigationEdge[] } | null>(null);
  
  // History state
  const [history, setHistory] = useState<Array<{ nodes: UINavigationNode[], edges: UINavigationEdge[] }>>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  
  // Interface and tree state
  const [interfaceId, setInterfaceId] = useState<string>('');
  const [userInterface, setUserInterface] = useState<any>(null);
  const [rootTree, setRootTree] = useState<any>(null);
  
  // View state
  const [viewPath, setViewPath] = useState<any[]>([]);
  const [currentViewRootId, setCurrentViewRootId] = useState<string>('');
  
  // ReactFlow state
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  
  // Filter state
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [maxDisplayDepth, setMaxDisplayDepth] = useState<number>(5);
  const [availableFocusNodes, setAvailableFocusNodes] = useState<any[]>([]);
  
  // Progressive loading removed - loading all nodes at once
  
  return {
    // Node and edge state
    nodes, setNodes, onNodesChange,
    edges, setEdges, onEdgesChange,
    // Dual arrays removed - using single source of truth
    
    // Tree state
    currentTreeId, setCurrentTreeId,
    currentTreeName, setCurrentTreeName,
    navigationPath, setNavigationPath,
    navigationNamePath, setNavigationNamePath,
    
    // Selection state
    selectedNode, setSelectedNode,
    selectedEdge, setSelectedEdge,
    nodeForm, setNodeForm,
    edgeForm, setEdgeForm,
    
    // Dialog state
    isNodeDialogOpen, setIsNodeDialogOpen,
    isEdgeDialogOpen, setIsEdgeDialogOpen,
    isNewNode, setIsNewNode,
    
    // Loading state
    isLoading, setIsLoading,
    isSaving, setIsSaving,
    isLoadingInterface, setIsLoadingInterface,
    error, setError,
    saveError, setSaveError,
    saveSuccess, setSaveSuccess,
    
    // Changes state
    hasUnsavedChanges, setHasUnsavedChanges,
    isDiscardDialogOpen, setIsDiscardDialogOpen,
    initialState, setInitialState,
    
    // History state
    history, setHistory,
    historyIndex, setHistoryIndex,
    
    // Interface and tree state
    interfaceId, setInterfaceId,
    userInterface, setUserInterface,
    rootTree, setRootTree,
    
    // View state
    viewPath, setViewPath,
    currentViewRootId, setCurrentViewRootId,
    
    // ReactFlow state
    reactFlowWrapper,
    reactFlowInstance, setReactFlowInstance,
    
    // Filter state
    focusNodeId, setFocusNodeId,
    maxDisplayDepth, setMaxDisplayDepth,
    availableFocusNodes, setAvailableFocusNodes,
    
    // Progressive loading removed - loading all nodes at once
  };
};

export const useConnectionRules = () => {
  const validateConnection = useCallback((sourceNode: any, targetNode: any, params: any) => {
    // Default result - allowed generic connection
    return {
      isAllowed: true,
      edgeType: 'default'
    };
  }, []);

  const getRulesSummary = useCallback(() => {
    return "Connection rules summary";
  }, []);

  return { validateConnection, getRulesSummary };
};

// useNavigationHistory removed - using page reload for cancel changes



export const useNavigationConfig = (props: any) => {
  const loadFromConfig = useCallback((treeName: string) => {
    console.log(`Load from config: ${treeName}`);
  }, []);

  const saveToConfig = useCallback((treeName: string) => {
    console.log(`Save to config: ${treeName}`);
  }, []);

  const listAvailableTrees = useCallback(() => {
    console.log("List available trees");
    return [];
  }, []);

  const createEmptyTree = useCallback(() => {
    console.log("Create empty tree config");
  }, []);

  // Lock management
  const isLocked = false;
  const lockInfo = null;
  const sessionId = "dummy-session-id";

  const lockNavigationTree = useCallback((treeName: string) => {
    console.log(`Lock navigation tree: ${treeName}`);
  }, []);

  const unlockNavigationTree = useCallback((treeName: string) => {
    console.log(`Unlock navigation tree: ${treeName}`);
  }, []);

  const checkTreeLockStatus = useCallback((treeName: string) => {
    console.log(`Check tree lock status: ${treeName}`);
  }, []);

  const setupAutoUnlock = useCallback((treeName: string) => {
    console.log("Setup auto unlock for tree:", treeName);
    return () => {}; // Return cleanup function
  }, []);

  return {
    loadFromConfig,
    saveToConfig,
    listAvailableTrees,
    createEmptyTree,
    isLocked,
    lockInfo,
    sessionId,
    lockNavigationTree,
    unlockNavigationTree,
    checkTreeLockStatus,
    setupAutoUnlock
  };
};

// Main navigation editor hook is now in Navigation_Editor.ts
// Import from there if needed:
// export { default as useNavigationEditor } from './Navigation_Editor'; 