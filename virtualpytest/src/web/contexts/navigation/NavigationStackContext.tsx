import React, { createContext, useContext, useState, useCallback } from 'react';

interface TreeLevel {
  treeId: string;
  treeName: string;
  parentNodeId: string | null;
  parentNodeLabel: string;
}

interface NavigationStackContextType {
  stack: TreeLevel[];
  currentLevel: TreeLevel | null;
  pushLevel: (
    treeId: string,
    parentNodeId: string,
    treeName: string,
    parentNodeLabel: string,
  ) => void;
  popLevel: () => void;
  jumpToLevel: (targetIndex: number) => void;
  jumpToRoot: () => void;
  isNested: boolean;
}

const NavigationStackContext = createContext<NavigationStackContextType | null>(null);

export const NavigationStackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stack, setStack] = useState<TreeLevel[]>([]);

  const pushLevel = useCallback(
    (treeId: string, parentNodeId: string, treeName: string, parentNodeLabel: string) => {
      setStack((prev) => [...prev, { treeId, treeName, parentNodeId, parentNodeLabel }]);
    },
    [],
  );

  const popLevel = useCallback(() => {
    setStack((prev) => prev.slice(0, -1));
  }, []);

  const jumpToLevel = useCallback((targetIndex: number) => {
    setStack((prev) => prev.slice(0, targetIndex + 1));
  }, []);

  const jumpToRoot = useCallback(() => {
    setStack([]);
  }, []);

  const currentLevel = stack[stack.length - 1] || null;
  const isNested = stack.length > 0;

  return (
    <NavigationStackContext.Provider
      value={{
        stack,
        currentLevel,
        pushLevel,
        popLevel,
        jumpToLevel,
        jumpToRoot,
        isNested,
      }}
    >
      {children}
    </NavigationStackContext.Provider>
  );
};

export const useNavigationStack = () => {
  const context = useContext(NavigationStackContext);
  if (!context) {
    throw new Error('useNavigationStack must be used within NavigationStackProvider');
  }
  return context;
};
