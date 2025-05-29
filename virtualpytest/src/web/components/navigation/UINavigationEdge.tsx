import React from 'react';
import { EdgeProps, getBezierPath } from 'reactflow';
import { UINavigationEdge as UINavigationEdgeType } from '../../types/navigationTypes';

export const UINavigationEdge: React.FC<EdgeProps<UINavigationEdgeType['data']>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  source,
  target,
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Determine edge color based on edge type
  const getEdgeColor = (edgeType?: string) => {
    switch (edgeType) {
      case 'top': return '#1976d2';     // Blue for top connections
      case 'bottom': return '#f44336';  // Red for bottom connections
      default: return '#1976d2';        // Default blue
    }
  };

  const edgeColor = getEdgeColor(data?.edgeType);

  return (
    <>
      {/* Define arrow marker */}
      <defs>
        <marker
          id={`arrowhead-${id}`}
          markerWidth="8"
          markerHeight="6"
          refX="7"
          refY="3"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <polygon
            points="0 0, 8 3, 0 6"
            fill={edgeColor}
            stroke={edgeColor}
          />
        </marker>
      </defs>

      <path
        id={id}
        style={{
          stroke: edgeColor,
          strokeWidth: 2,
          fill: 'none',
          ...style,
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={`url(#arrowhead-${id})`}
      />
    </>
  );
}; 