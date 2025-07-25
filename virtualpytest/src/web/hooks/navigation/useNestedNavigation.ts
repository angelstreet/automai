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
  const { pushLevel, stack } = useNavigationStack();
  const { actualTreeId } = useNavigationConfig();

  const handleNodeDoubleClick = useCallback(
    async (event: React.MouseEvent, node: any) => {
      // 1. Check if node is entry type (skip)
      if (node.data?.type === 'entry') {
        return;
      }

      // 2. INFINITE LOOP PROTECTION: Check if we're already in a sub-tree of this node type
      const nodeLabel = node.data.label || '';
      const isAlreadyInThisNodeType = stack.some((level) => level.parentNodeLabel === nodeLabel);

      if (isAlreadyInThisNodeType) {
        console.warn(
          `[@useNestedNavigation] Prevented infinite loop: Already in sub-tree of "${nodeLabel}"`,
        );
        // Fallback to edit dialog instead
        openNodeDialog(node);
        return;
      }

      // 3. Check for existing sub-trees
      try {
        const response = await fetch(
          `/server/navigationTrees/getNodeSubTrees/${actualTreeId}/${node.id}`,
        );
        const result = await response.json();

        if (result.success && result.sub_trees?.length > 0) {
          // 4a. Load existing sub-tree
          const primarySubTree = result.sub_trees[0];
          const treeResponse = await fetch(`/server/navigationTrees/getTree/${primarySubTree.id}`);
          const treeResult = await treeResponse.json();

          if (treeResult.success) {
            const treeData = treeResult.tree.metadata || {};
            
            // 5. Push to navigation stack FIRST to set isNested before setting nodes
            pushLevel(primarySubTree.id, node.id, primarySubTree.name, node.data.label);
            
            // Then set nodes and edges with small delay to ensure isNested is processed
            setTimeout(() => {
              setNodes(treeData.nodes || []);
              setEdges(treeData.edges || []);
            }, 10);

            console.log(`[@useNestedNavigation] Loaded existing sub-tree: ${primarySubTree.name}`);
          }
        } else {
          // 4b. Create sub-tree starting with the actual node (so user understands context)
          const contextSubTree = {
            nodes: [
              {
                id: `${node.id}-context`, // Unique ID for the context node
                type: 'uiScreen',
                position: { x: 250, y: 100 }, // Position at top center instead of middle (y: 250 -> y: 100)
                data: {
                  type: node.data.type,
                  label: node.data.label, // Keep the original label like "Live TV"
                  description: `You are now on ${node.data.label}. Add actions you can perform while staying here.`,
                  isContextNode: true, // Mark as the context node
                },
              },
            ],
            edges: [],
          };

          // 6. Push to navigation stack FIRST to set isNested before setting nodes
          pushLevel(`temp-${Date.now()}`, node.id, node.data.label, node.data.label);
          
          // Then set nodes and edges with small delay to ensure isNested is processed
          setTimeout(() => {
            setNodes(contextSubTree.nodes);
            setEdges(contextSubTree.edges);
          }, 10);

          console.log(`[@useNestedNavigation] Created empty sub-tree for node: ${node.data.label}`);
        }
      } catch (error) {
        console.error('[@useNestedNavigation] Error in nested navigation:', error);
        // Fallback to edit dialog only on error
        openNodeDialog(node);
      }
    },
    [actualTreeId, setNodes, setEdges, pushLevel, openNodeDialog, stack],
  );

  return {
    handleNodeDoubleClick,
  };
};
