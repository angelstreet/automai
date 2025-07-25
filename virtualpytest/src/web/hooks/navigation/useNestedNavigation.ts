import { useCallback } from 'react';
import { useNavigationStack } from '../../contexts/navigation/NavigationStackContext';
import { useNavigationConfig } from '../../contexts/navigation/NavigationConfigContext';

export interface NestedNavigationHookParams {
  setNodes: (nodes: any[]) => void;
  setEdges: (edges: any[]) => void;
  openNodeDialog: (node: any) => void;
}

export const useNestedNavigation = ({
  setNodes,
  setEdges,
  openNodeDialog,
}: NestedNavigationHookParams) => {
  const { pushLevel } = useNavigationStack();
  const { actualTreeId } = useNavigationConfig();

  const handleNodeDoubleClick = useCallback(
    async (event: React.MouseEvent, node: any) => {
      // 1. Check if node is entry type (skip)
      if (node.data?.type === 'entry') {
        return;
      }

      // 2. Check for existing sub-trees
      try {
        const response = await fetch(
          `/server/navigationTrees/getNodeSubTrees/${actualTreeId}/${node.id}`,
        );
        const result = await response.json();

        if (result.success && result.sub_trees?.length > 0) {
          // 3a. Load existing sub-tree
          const primarySubTree = result.sub_trees[0];
          const treeResponse = await fetch(`/server/navigationTrees/getTree/${primarySubTree.id}`);
          const treeResult = await treeResponse.json();

          if (treeResult.success) {
            const treeData = treeResult.tree.metadata || {};
            setNodes(treeData.nodes || []);
            setEdges(treeData.edges || []);

            // 4. Push to navigation stack with actual sub-tree data
            pushLevel(primarySubTree.id, node.id, primarySubTree.name, node.data.label);

            console.log(`[@useNestedNavigation] Loaded existing sub-tree: ${primarySubTree.name}`);
          }
        } else {
          // 3b. Create empty sub-tree (in memory only)
          const emptySubTree = {
            nodes: [
              {
                id: 'entry',
                type: 'uiScreen',
                position: { x: 250, y: 250 },
                data: { type: 'entry', label: 'ENTRY' },
              },
            ],
            edges: [],
          };

          setNodes(emptySubTree.nodes);
          setEdges(emptySubTree.edges);

          // 4. Push to navigation stack with temporary ID for new sub-tree
          pushLevel(`temp-${Date.now()}`, node.id, `${node.data.label} Actions`, node.data.label);

          console.log(`[@useNestedNavigation] Created empty sub-tree for node: ${node.data.label}`);
        }
      } catch (error) {
        console.error('[@useNestedNavigation] Error in nested navigation:', error);
        // Fallback to edit dialog only on error
        openNodeDialog(node);
      }
    },
    [actualTreeId, setNodes, setEdges, pushLevel, openNodeDialog],
  );

  return {
    handleNodeDoubleClick,
  };
};
