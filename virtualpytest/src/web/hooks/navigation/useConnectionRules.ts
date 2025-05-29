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
  const isHorizontal = (
    (params.sourceHandle?.includes('left') || params.sourceHandle?.includes('right')) ||
    (params.targetHandle?.includes('left') || params.targetHandle?.includes('right'))
  );

  if (isHorizontal) {
    // HORIZONTAL = SIBLINGS (same parent level)
    console.log('[@hook:establishConnectionRules] Horizontal connection - creating siblings');
    
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
    // VERTICAL = PARENT-CHILD (hierarchical)
    console.log('[@hook:establishConnectionRules] Vertical connection - creating parent-child relationship');
    
    // Target becomes child of source
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