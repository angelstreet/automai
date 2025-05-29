import { useCallback } from 'react';
import { Connection } from 'reactflow';
import { UINavigationNode } from '../../types/navigationTypes';

interface ConnectionResult {
  isAllowed: boolean;
  reason?: string;
  edgeType: 'default' | 'top' | 'bottom' | 'menu';
  sourceNodeUpdates?: Partial<UINavigationNode['data']>;
  targetNodeUpdates?: Partial<UINavigationNode['data']>;
}

/**
 * Returns a summary of all connection rules for reference
 */
const getConnectionRulesSummary = () => {
  return {
    rules: [
      {
        name: "RULE 1: Menu Node Connections",
        description: "Menu nodes can connect using any handle type and establish parent-child relationships",
        cases: [
          "Menu → Any Node: Target inherits menu's parent chain + menu ID",
          "Any Node → Menu: Source inherits menu's parent chain + menu ID"
        ]
      },
      {
        name: "RULE 2: Screen-to-Screen Connections",
        description: "Left/Right handles for lateral navigation between screens",
        cases: [
          "Both nodes must be screens (not menus)",
          "No parent inheritance occurs",
          "Creates 'default' edge type"
        ]
      },
      {
        name: "RULE 3: Top/Bottom Handle Validation",
        description: "Top/Bottom handles require at least one menu node",
        cases: [
          "Must involve at least one menu node",
          "Creates 'top' or 'bottom' edge types"
        ]
      },
      {
        name: "RULE 4: Default Fallback",
        description: "Allow connection without parent inheritance",
        cases: [
          "Used when no other rules apply",
          "No parent chain modifications"
        ]
      }
    ],
    parentInheritance: {
      "Empty parent": "New nodes start with parent: [], depth: 0",
      "Menu inheritance": "Non-menu nodes inherit complete parent chain from connected menu + menu ID",
      "Screen connections": "Screen-to-screen connections don't modify parent chains",
      "Edge deletion": "Removing last incoming edge resets node to parent: [], depth: 0"
    }
  };
};

/**
 * Establishes connection rules and parent inheritance logic
 * @param sourceNode - The source node attempting to connect
 * @param targetNode - The target node being connected to
 * @param params - Connection parameters including handle information
 * @returns ConnectionResult with validation and update information
 */
const establishConnectionRules = (
  sourceNode: UINavigationNode,
  targetNode: UINavigationNode,
  params: Connection
): ConnectionResult => {
  console.log('[@hook:establishConnectionRules] Evaluating connection:', {
    source: sourceNode.data.label,
    target: targetNode.data.label,
    sourceHandle: params.sourceHandle,
    targetHandle: params.targetHandle,
    sourceType: sourceNode.data.type,
    targetType: targetNode.data.type,
    sourceParent: sourceNode.data.parent,
    targetParent: targetNode.data.parent,
  });

  // Analyze handle types
  const isLeftRightConnection = (
    (params.sourceHandle?.includes('left') || params.sourceHandle?.includes('right')) &&
    (params.targetHandle?.includes('left') || params.targetHandle?.includes('right'))
  );
  
  const isTopBottomConnection = (
    (params.sourceHandle?.includes('top') || params.sourceHandle?.includes('bottom')) &&
    (params.targetHandle?.includes('top') || params.targetHandle?.includes('bottom'))
  );

  const isTopConnection = params.sourceHandle?.includes('top') || params.targetHandle?.includes('top');
  const isBottomConnection = params.sourceHandle?.includes('bottom') || params.targetHandle?.includes('bottom');

  const hasMenuNode = sourceNode.data.type === 'menu' || targetNode.data.type === 'menu';

  // RULE 1: Menu nodes can connect using any handle type
  if (hasMenuNode) {
    console.log('[@hook:establishConnectionRules] Menu node connection - evaluating parent inheritance');
    
    // Determine edge type based on handles
    let edgeType: 'default' | 'top' | 'bottom' | 'menu' = 'menu';
    if (isTopConnection) edgeType = 'top';
    else if (isBottomConnection) edgeType = 'bottom';

    // PARENT INHERITANCE LOGIC
    if (sourceNode.data.type === 'menu') {
      // Case 1: Menu → Any Node (menu becomes parent of target)
      const newParentChain = [
        ...(sourceNode.data.parent || []),
        sourceNode.id
      ];
      
      console.log('[@hook:establishConnectionRules] Menu → Node: Target inherits parent chain:', newParentChain);
      
      return {
        isAllowed: true,
        edgeType,
        targetNodeUpdates: {
          parent: newParentChain,
          depth: newParentChain.length
        }
      };
    } else {
      // Case 2: Any Node → Menu (menu becomes parent of source)
      const newParentChain = [
        ...(targetNode.data.parent || []),
        targetNode.id
      ];
      
      console.log('[@hook:establishConnectionRules] Node → Menu: Source inherits parent chain:', newParentChain);
      
      return {
        isAllowed: true,
        edgeType,
        sourceNodeUpdates: {
          parent: newParentChain,
          depth: newParentChain.length
        }
      };
    }
  }

  // RULE 2: Left/Right handles for screen-to-screen connections
  if (isLeftRightConnection) {
    // Both nodes must be screens (not menus)
    if (sourceNode.data.type === 'menu' || targetNode.data.type === 'menu') {
      return {
        isAllowed: false,
        reason: 'Left/right handles cannot connect menu nodes to non-menu nodes',
        edgeType: 'default'
      };
    }
    
    console.log('[@hook:establishConnectionRules] Screen-to-screen connection via left/right handles - no parent inheritance');
    
    return {
      isAllowed: true,
      edgeType: 'default'
      // No parent updates for screen-to-screen connections
    };
  }

  // RULE 3: Top/Bottom handles should involve menu nodes
  if (isTopBottomConnection) {
    if (!hasMenuNode) {
      return {
        isAllowed: false,
        reason: 'Top/bottom handles are intended for menu navigation and require at least one menu node',
        edgeType: isTopConnection ? 'top' : 'bottom'
      };
    }
    
    // This case should be handled by RULE 1 above, but adding for completeness
    console.log('[@hook:establishConnectionRules] Top/bottom connection with menu node');
    return {
      isAllowed: true,
      edgeType: isTopConnection ? 'top' : 'bottom'
    };
  }

  // RULE 4: Default case - allow connection without parent inheritance
  console.log('[@hook:establishConnectionRules] Default connection - no parent inheritance');
  return {
    isAllowed: true,
    edgeType: 'default'
  };
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