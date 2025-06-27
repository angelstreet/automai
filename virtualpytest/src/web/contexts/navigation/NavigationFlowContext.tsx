import React, { createContext, useContext, useState, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ReactFlowInstance } from 'reactflow';

// ========================================
// TYPES
// ========================================

export interface NavigationFlowContextType {
  // Route params
  treeId?: string;
  treeName?: string;
  interfaceId?: string;

  // Navigation state
  currentTreeId: string;
  setCurrentTreeId: (id: string) => void;
  currentTreeName: string;
  setCurrentTreeName: (name: string) => void;
  navigationPath: string[];
  setNavigationPath: (path: string[]) => void;
  navigationNamePath: string[];
  setNavigationNamePath: (path: string[]) => void;

  // View state
  currentViewRootId: string | null;
  setCurrentViewRootId: (id: string | null) => void;
  viewPath: { id: string; name: string }[];
  setViewPath: (path: { id: string; name: string }[]) => void;

  // Interface state
  userInterface: any;
  setUserInterface: (ui: any) => void;
  rootTree: any;
  setRootTree: (tree: any) => void;

  // React Flow refs
  reactFlowWrapper: React.RefObject<HTMLDivElement>;
  reactFlowInstance: ReactFlowInstance | null;
  setReactFlowInstance: (instance: ReactFlowInstance | null) => void;

  // Callback functions
  validateNavigationPath: (path: string[]) => boolean;
  updateNavigationPath: (newPath: string[], newNamePath: string[]) => void;
}

interface NavigationFlowProviderProps {
  children: React.ReactNode;
}

// ========================================
// CONTEXT
// ========================================

const NavigationFlowContext = createContext<NavigationFlowContextType | null>(null);

export const NavigationFlowProvider: React.FC<NavigationFlowProviderProps> = ({ children }) => {
  // ========================================
  // ROUTE PARAMS
  // ========================================

  const { treeId, treeName, interfaceId } = useParams<{
    treeId?: string;
    treeName: string;
    interfaceId?: string;
  }>();

  // ========================================
  // STATE
  // ========================================

  // Navigation state for breadcrumbs and nested trees
  const [currentTreeId, setCurrentTreeId] = useState<string>(treeName || treeId || 'home');
  const [currentTreeName, setCurrentTreeName] = useState<string>(treeName || 'home');
  const [navigationPath, setNavigationPath] = useState<string[]>([treeName || treeId || 'home']);
  const [navigationNamePath, setNavigationNamePath] = useState<string[]>([treeName || 'home']);

  // View state
  const [currentViewRootId, setCurrentViewRootId] = useState<string | null>(null);
  const [viewPath, setViewPath] = useState<{ id: string; name: string }[]>([]);

  // Interface state
  const [userInterface, setUserInterface] = useState<any>(null);
  const [rootTree, setRootTree] = useState<any>(null);

  // React Flow refs
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  // ========================================
  // CALLBACK FUNCTIONS
  // ========================================

  const validateNavigationPath = useCallback((path: string[]): boolean => {
    console.log('[@context:NavigationFlowProvider] Validating navigation path:', path);
    // Basic validation - path should not be empty and contain valid tree IDs
    return path.length > 0 && path.every((id) => typeof id === 'string' && id.length > 0);
  }, []);

  const updateNavigationPath = useCallback(
    (newPath: string[], newNamePath: string[]) => {
      console.log('[@context:NavigationFlowProvider] Updating navigation path:', {
        newPath,
        newNamePath,
      });
      if (validateNavigationPath(newPath)) {
        setNavigationPath(newPath);
        setNavigationNamePath(newNamePath);
        // Update current tree info if path is not empty
        if (newPath.length > 0) {
          const currentId = newPath[newPath.length - 1];
          const currentName = newNamePath[newNamePath.length - 1] || currentId;
          setCurrentTreeId(currentId);
          setCurrentTreeName(currentName);
        }
      }
    },
    [validateNavigationPath],
  );

  // ========================================
  // CONTEXT VALUE
  // ========================================

  const stableNavigationPath = useMemo(() => navigationPath, [navigationPath]);
  const stableNavigationNamePath = useMemo(() => navigationNamePath, [navigationNamePath]);
  const stableViewPath = useMemo(() => viewPath, [viewPath]);

  const contextValue: NavigationFlowContextType = useMemo(() => {
    return {
      // Route params
      treeId,
      treeName,
      interfaceId,

      // Navigation state
      currentTreeId,
      setCurrentTreeId,
      currentTreeName,
      setCurrentTreeName,
      navigationPath: stableNavigationPath,
      setNavigationPath,
      navigationNamePath: stableNavigationNamePath,
      setNavigationNamePath,

      // View state
      currentViewRootId,
      setCurrentViewRootId,
      viewPath: stableViewPath,
      setViewPath,

      // Interface state
      userInterface,
      setUserInterface,
      rootTree,
      setRootTree,

      // React Flow refs
      reactFlowWrapper,
      reactFlowInstance,
      setReactFlowInstance,

      // Callbacks
      validateNavigationPath,
      updateNavigationPath,
    };
  }, [
    // Only include state values that actually change, not function references
    treeId,
    treeName,
    interfaceId,
    currentTreeId,
    currentTreeName,
    stableNavigationPath,
    stableNavigationNamePath,
    currentViewRootId,
    stableViewPath,
    userInterface,
    rootTree,
    reactFlowInstance,
    // Remove function dependencies to prevent cascade re-renders
    // validateNavigationPath and updateNavigationPath are stable due to their own useCallback dependencies
  ]);

  return (
    <NavigationFlowContext.Provider value={contextValue}>{children}</NavigationFlowContext.Provider>
  );
};

NavigationFlowProvider.displayName = 'NavigationFlowProvider';

// ========================================
// HOOK
// ========================================

export const useNavigationFlow = (): NavigationFlowContextType => {
  const context = useContext(NavigationFlowContext);
  if (!context) {
    throw new Error('useNavigationFlow must be used within a NavigationFlowProvider');
  }
  return context;
};
