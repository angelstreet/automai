import { useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MarkerType } from 'reactflow';

import { useNavigationFlow } from '../../contexts/navigation';

export const useNavigationFlowHook = () => {
  console.log('[@hook:useNavigationFlowHook] Initializing flow hook');

  const navigate = useNavigate();

  // Use the focused context
  const flowContext = useNavigationFlow();

  // Fit view to current nodes
  const fitView = useCallback(() => {
    console.log('[@hook:useNavigationFlowHook] Fitting view');
    if (flowContext.reactFlowInstance) {
      flowContext.reactFlowInstance.fitView({
        padding: 0.1,
        duration: 300,
      });
    }
  }, [flowContext.reactFlowInstance]);

  // Navigate back in breadcrumb
  const navigateToTreeLevel = useCallback(
    (index: number) => {
      console.log('[@hook:useNavigationFlowHook] Navigating to tree level:', index);
      const newPath = flowContext.navigationPath.slice(0, index + 1);
      const newNamePath = flowContext.navigationNamePath.slice(0, index + 1);
      const targetTreeId = newPath[newPath.length - 1];
      const targetTreeName = newNamePath[newNamePath.length - 1];

      // Prevent navigating to the same tree level
      if (flowContext.currentTreeId === targetTreeId) {
        return;
      }

      flowContext.setNavigationPath(newPath);
      flowContext.setNavigationNamePath(newNamePath);
      flowContext.setCurrentTreeId(targetTreeId);
      flowContext.setCurrentTreeName(targetTreeName);
      navigate(`/navigation-editor/${encodeURIComponent(targetTreeName)}/${targetTreeId}`);
    },
    [
      flowContext.navigationPath,
      flowContext.navigationNamePath,
      flowContext.currentTreeId,
      flowContext.setNavigationPath,
      flowContext.setNavigationNamePath,
      flowContext.setCurrentTreeId,
      flowContext.setCurrentTreeName,
      navigate,
    ],
  );

  // Go back to parent tree
  const goBackToParent = useCallback(() => {
    console.log('[@hook:useNavigationFlowHook] Going back to parent');
    if (flowContext.navigationPath.length > 1) {
      const newPath = flowContext.navigationPath.slice(0, -1);
      const newNamePath = flowContext.navigationNamePath.slice(0, -1);
      const targetTreeId = newPath[newPath.length - 1];
      const targetTreeName = newNamePath[newNamePath.length - 1];

      flowContext.setNavigationPath(newPath);
      flowContext.setNavigationNamePath(newNamePath);
      flowContext.setCurrentTreeId(targetTreeId);
      flowContext.setCurrentTreeName(targetTreeName);
      navigate(`/navigation-editor/${encodeURIComponent(targetTreeName)}/${targetTreeId}`);
    }
  }, [
    flowContext.navigationPath,
    flowContext.navigationNamePath,
    flowContext.setNavigationPath,
    flowContext.setNavigationNamePath,
    flowContext.setCurrentTreeId,
    flowContext.setCurrentTreeName,
    navigate,
  ]);

  // Navigate to parent view (breadcrumb click)
  const navigateToParentView = useCallback(
    (targetIndex: number) => {
      console.log('[@hook:useNavigationFlowHook] Navigating to parent view:', targetIndex);
      if (targetIndex < 0 || targetIndex >= flowContext.viewPath.length) return;

      const targetView = flowContext.viewPath[targetIndex];
      flowContext.setCurrentViewRootId(targetView.id);
      flowContext.setViewPath((prev) => prev.slice(0, targetIndex + 1));
    },
    [flowContext.viewPath, flowContext.setCurrentViewRootId, flowContext.setViewPath],
  );

  // Navigate back to parent interface
  const navigateToParent = useCallback(() => {
    console.log('[@hook:useNavigationFlowHook] Navigating to parent interface');
    navigate('/configuration/interface');
  }, [navigate]);

  // Set user interface from props
  const setUserInterfaceFromProps = useCallback(
    (userInterfaceData: any) => {
      console.log('[@hook:useNavigationFlowHook] Setting user interface from props');
      if (userInterfaceData) {
        flowContext.setUserInterface(userInterfaceData);
        // Note: isLoadingInterface is managed by NavigationUI context
      }
    },
    [flowContext.setUserInterface],
  );

  // Default edge options - memoized to prevent re-renders
  const defaultEdgeOptions = useMemo(
    () => ({
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed, color: '#b1b1b7' },
    }),
    [],
  );

  // Return the hook interface
  return useMemo(
    () => ({
      // Route params
      treeId: flowContext.treeId,
      treeName: flowContext.treeName,
      interfaceId: flowContext.interfaceId,

      // Navigation state
      currentTreeId: flowContext.currentTreeId,
      currentTreeName: flowContext.currentTreeName,
      navigationPath: flowContext.navigationPath,
      navigationNamePath: flowContext.navigationNamePath,

      // View state
      currentViewRootId: flowContext.currentViewRootId,
      viewPath: flowContext.viewPath,

      // Interface state
      userInterface: flowContext.userInterface,
      rootTree: flowContext.rootTree,

      // React Flow refs
      reactFlowWrapper: flowContext.reactFlowWrapper,
      reactFlowInstance: flowContext.reactFlowInstance,

      // Setters
      setCurrentTreeId: flowContext.setCurrentTreeId,
      setCurrentTreeName: flowContext.setCurrentTreeName,
      setNavigationPath: flowContext.setNavigationPath,
      setNavigationNamePath: flowContext.setNavigationNamePath,
      setCurrentViewRootId: flowContext.setCurrentViewRootId,
      setViewPath: flowContext.setViewPath,
      setUserInterface: flowContext.setUserInterface,
      setRootTree: flowContext.setRootTree,
      setReactFlowInstance: flowContext.setReactFlowInstance,

      // Navigation actions
      navigateToTreeLevel,
      goBackToParent,
      navigateToParentView,
      navigateToParent,

      // Flow actions
      fitView,

      // Configuration
      defaultEdgeOptions,

      // User interface management
      setUserInterfaceFromProps,

      // Validation
      validateNavigationPath: flowContext.validateNavigationPath,
      updateNavigationPath: flowContext.updateNavigationPath,
    }),
    [
      flowContext.treeId,
      flowContext.treeName,
      flowContext.interfaceId,
      flowContext.currentTreeId,
      flowContext.currentTreeName,
      flowContext.navigationPath,
      flowContext.navigationNamePath,
      flowContext.currentViewRootId,
      flowContext.viewPath,
      flowContext.userInterface,
      flowContext.rootTree,
      flowContext.reactFlowWrapper,
      flowContext.reactFlowInstance,
      navigateToTreeLevel,
      goBackToParent,
      navigateToParentView,
      navigateToParent,
      fitView,
      defaultEdgeOptions,
      setUserInterfaceFromProps,
      flowContext.validateNavigationPath,
      flowContext.updateNavigationPath,
    ],
  );
};
