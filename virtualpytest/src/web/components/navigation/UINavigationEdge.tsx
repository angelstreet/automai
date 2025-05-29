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

  // Debug logging
  console.log(`[@component:UINavigationEdge] Edge ${id} data:`, data);
  console.log(`[@component:UINavigationEdge] Edge ${id} edgeType:`, data?.edgeType);

  // Determine edge color based on edge type - simplified logic
  let edgeColor = '#666666'; // Default gray
  
  if (data?.edgeType === 'top') {
    edgeColor = '#1976d2'; // Blue for top connections
    console.log(`[@component:UINavigationEdge] Edge ${id} set to BLUE (top connection)`);
  } else if (data?.edgeType === 'bottom') {
    edgeColor = '#f44336'; // Red for bottom connections  
    console.log(`[@component:UINavigationEdge] Edge ${id} set to RED (bottom connection)`);
  } else {
    console.log(`[@component:UINavigationEdge] Edge ${id} set to GRAY (default) - edgeType was:`, data?.edgeType);
  }

  console.log(`[@component:UINavigationEdge] Edge ${id} final color:`, edgeColor);

  return (
    <>
      {/* Force stroke color with higher specificity */}
      <style>
        {`
          .custom-edge-${id} {
            stroke: ${edgeColor} !important;
            stroke-width: 2px !important;
          }
        `}
      </style>
      
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
          fill: 'none',
          ...style,
        }}
        className={`react-flow__edge-path custom-edge-${id}`}
        d={edgePath}
        markerEnd={`url(#arrowhead-${id})`}
      />
      
      {/* Invisible wider stroke for easier selection */}
      <path
        style={{
          stroke: 'transparent',
          strokeWidth: 20,
          fill: 'none',
          cursor: 'pointer',
        }}
        d={edgePath}
      />
    </>
  );
}; 