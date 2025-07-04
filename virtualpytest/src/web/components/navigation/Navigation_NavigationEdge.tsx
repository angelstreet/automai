import React from 'react';
import { EdgeProps } from 'reactflow';

import { UINavigationEdge as UINavigationEdgeType } from '../../types/pages/Navigation_Types';

export const NavigationEdgeComponent: React.FC<EdgeProps<UINavigationEdgeType['data']>> = () => {
  // Return null to use ReactFlow's default edge rendering
  // This allows the markerEnd from defaultEdgeOptions to work properly
  return null;
};
