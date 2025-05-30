import { useCallback } from 'react';
import { Connection } from 'reactflow';
import { UINavigationNode } from '../../types/navigationTypes';

interface ConnectionResult {
  isAllowed: boolean;
  reason?: string;
  edgeType: 'horizontal' | 'vertical';
  sourceNodeUpdates?: Partial<UINavigationNode['data']>;
  targetNodeUpdates?: Partial<UINavigationNode['data']>;
}

/**
 * Returns a summary of connection rules for reference
 */
const getConnectionRulesSummary = () => {
  return {
    rules: [
      {
        name: "Horizontal Connections (Siblings)",
        description: "Left/Right handles create sibling relationships - nodes share the same parent",
        example: "home_tvguide ↔ home_apps (both have parent: [home])"
      },
      {
        name: "Vertical Connections (Parent-Child)",
        description: "Top/Bottom handles create hierarchical relationships - target becomes child of source",
        example: "home_tvguide ↕ tvguide (tvguide gets parent: [home, home_tvguide])"
      }
    ]
  };
};

/**
 * Simple connection rules based on handle direction
 */
const establishConnectionRules = (
  sourceNode: UINavigationNode,
  targetNode: UINavigationNode,
  params: Connection
): ConnectionResult => {
  console.log('[@hook:establishConnectionRules] Simple connection:', {
    source: sourceNode.data.label,
    target: targetNode.data.label,
    sourceHandle: params.sourceHandle,
    targetHandle: params.targetHandle,
  });

  // Determine connection type by handle direction
  // Check for VERTICAL connections first (top/bottom handles)
  const isVertical = (
    (params.sourceHandle?.startsWith('top') || params.sourceHandle?.startsWith('bottom')) ||
    (params.targetHandle?.startsWith('top') || params.targetHandle?.startsWith('bottom'))
  );

  // Check for HORIZONTAL connections (left/right handles)
  const isHorizontal = (
    (params.sourceHandle?.startsWith('left') || params.sourceHandle?.startsWith('right')) ||
    (params.targetHandle?.startsWith('left') || params.targetHandle?.startsWith('right'))
  );

  if (isVertical) {
    // Orphan inherits from other node
    const targetIsOrphan = !targetNode.data.parent || targetNode.data.parent.length === 0;
    const sourceIsOrphan = !sourceNode.data.parent || sourceNode.data.parent.length === 0;
    
    // Issue 1 Fix: For vertical connections, also prioritize menu nodes when both are orphans
    if (sourceIsOrphan && targetIsOrphan) {
      const sourceIsMenu = sourceNode.data.type === 'menu';
      const targetIsMenu = targetNode.data.type === 'menu';
      
      if (sourceIsMenu && !targetIsMenu) {
        // Source (menu) becomes parent of target
        console.log('[@hook:establishConnectionRules] Both orphans vertical - menu source becomes parent of target');
        return {
          isAllowed: true,
          edgeType: 'vertical',
          targetNodeUpdates: {
            parent: [sourceNode.id],
            depth: 1
          }
        };
      } else if (targetIsMenu && !sourceIsMenu) {
        // Target (menu) becomes parent of source
        console.log('[@hook:establishConnectionRules] Both orphans vertical - menu target becomes parent of source');
        return {
          isAllowed: true,
          edgeType: 'vertical',
          sourceNodeUpdates: {
            parent: [targetNode.id],
            depth: 1
          }
        };
      }
    }
    
    if (sourceIsOrphan) {
      // Source is orphan - make it child of target
      const newParentChain = [
        ...(targetNode.data.parent || []),
        targetNode.id
      ];
      
      return {
        isAllowed: true,
        edgeType: 'vertical',
        sourceNodeUpdates: {
          parent: newParentChain,
          depth: newParentChain.length
        }
      };
    } else {
      // Target becomes child of source (default)
      const newParentChain = [
        ...(sourceNode.data.parent || []),
        sourceNode.id
      ];
      
      return {
        isAllowed: true,
        edgeType: 'vertical',
        targetNodeUpdates: {
          parent: newParentChain,
          depth: newParentChain.length
        }
      };
    }
  } else if (isHorizontal) {
    // HORIZONTAL = SIBLINGS (same parent level)
    console.log('[@hook:establishConnectionRules] Horizontal connection - creating siblings');
    
    // Check if both nodes are orphans (no parent)
    const sourceIsOrphan = !sourceNode.data.parent || sourceNode.data.parent.length === 0;
    const targetIsOrphan = !targetNode.data.parent || targetNode.data.parent.length === 0;
    
    // Issue 1 Fix: When both are orphans, menu node gets priority as parent
    if (sourceIsOrphan && targetIsOrphan) {
      const sourceIsMenu = sourceNode.data.type === 'menu';
      const targetIsMenu = targetNode.data.type === 'menu';
      
      if (sourceIsMenu && !targetIsMenu) {
        // Source (menu) becomes parent of target
        console.log('[@hook:establishConnectionRules] Both orphans - menu source becomes parent of target');
        return {
          isAllowed: true,
          edgeType: 'horizontal',
          targetNodeUpdates: {
            parent: [sourceNode.id],
            depth: 1
          }
        };
      } else if (targetIsMenu && !sourceIsMenu) {
        // Target (menu) becomes parent of source
        console.log('[@hook:establishConnectionRules] Both orphans - menu target becomes parent of source');
        return {
          isAllowed: true,
          edgeType: 'horizontal',
          sourceNodeUpdates: {
            parent: [targetNode.id],
            depth: 1
          }
        };
      }
    }
    
    // Both nodes should have the same parent
    // Use the deeper node's parent chain (more specific hierarchy)
    const sourceDepth = sourceNode.data.depth || 0;
    const targetDepth = targetNode.data.depth || 0;
    
    const parentChain = sourceDepth >= targetDepth 
      ? sourceNode.data.parent || []
      : targetNode.data.parent || [];
    
    return {
      isAllowed: true,
      edgeType: 'horizontal',
      sourceNodeUpdates: {
        parent: parentChain,
        depth: parentChain.length
      },
      targetNodeUpdates: {
        parent: parentChain,
        depth: parentChain.length
      }
    };
  } else {
    // Default to vertical if direction is unclear
    console.log('[@hook:establishConnectionRules] Direction unclear, defaulting to vertical connection - creating parent-child relationship');
    
    // Orphan inherits from other node
    const targetIsOrphan = !targetNode.data.parent || targetNode.data.parent.length === 0;
    const sourceIsOrphan = !sourceNode.data.parent || sourceNode.data.parent.length === 0;
    
    if (sourceIsOrphan) {
      // Source is orphan - make it child of target
      const newParentChain = [
        ...(targetNode.data.parent || []),
        targetNode.id
      ];
      
      return {
        isAllowed: true,
        edgeType: 'vertical',
        sourceNodeUpdates: {
          parent: newParentChain,
          depth: newParentChain.length
        }
      };
    } else {
      // Target becomes child of source (default)
      const newParentChain = [
        ...(sourceNode.data.parent || []),
        sourceNode.id
      ];
      
      return {
        isAllowed: true,
        edgeType: 'vertical',
        targetNodeUpdates: {
          parent: newParentChain,
          depth: newParentChain.length
        }
      };
    }
  }
};

export const useConnectionRules = () => {
  const validateConnection = useCallback((
    sourceNode: UINavigationNode,
    targetNode: UINavigationNode,
    params: Connection
  ): ConnectionResult => {
    return establishConnectionRules(sourceNode, targetNode, params);
  }, []);

  const getRulesSummary = useCallback(() => {
    return getConnectionRulesSummary();
  }, []);

  return {
    validateConnection,
    getRulesSummary,
  };
}; 