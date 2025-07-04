import React from 'react';
import { EdgeProps, getStraightPath } from 'reactflow';

import { useEdge } from '../../hooks/navigation/useEdge';
import { UINavigationEdge as UINavigationEdgeType } from '../../types/pages/Navigation_Types';

export const NavigationEdgeComponent: React.FC<EdgeProps<UINavigationEdgeType['data']>> = (
  props,
) => {
  const { id, sourceX, sourceY, targetX, targetY, data, selected } = props;

  // Use the consolidated edge hook
  const edgeHook = useEdge();

  // Get edge colors based on validation status
  const edgeColors = edgeHook.getEdgeColorsForEdge(id, false);

  // Get the straight path for the edge
  const [edgePath] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  return (
    <g className={edgeColors.className} data-edge-type={data?.edgeType}>
      {/* Invisible thick overlay for better selectability */}
      <path
        id={`${id}-selectable`}
        style={{
          ...edgeColors,
          strokeWidth: 15,
          fill: 'none',
          stroke: 'transparent',
          cursor: 'pointer',
        }}
        className="react-flow__edge-interaction"
        d={edgePath}
      />

      {/* Visible edge path without arrow */}
      <path
        id={id}
        style={{
          ...edgeColors,
          fill: 'none',
          strokeWidth: edgeColors.strokeWidth || 2,
          cursor: 'pointer',
        }}
        className="react-flow__edge-path"
        d={edgePath}
      />

      {/* Selection indicator */}
      {selected && (
        <path
          style={{
            ...edgeColors,
            stroke: '#555',
            strokeWidth: (edgeColors.strokeWidth || 2) + 2,
            fill: 'none',
            strokeDasharray: '5,5',
            opacity: 0.8,
          }}
          className="react-flow__edge-path"
          d={edgePath}
        />
      )}
    </g>
  );
};
