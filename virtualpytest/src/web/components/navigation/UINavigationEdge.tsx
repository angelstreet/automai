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
  console.log(`[@component:UINavigationEdge] Edge ${id} sourcePosition:`, sourcePosition);
  console.log(`[@component:UINavigationEdge] Edge ${id} targetPosition:`, targetPosition);

  // Check if this is an entry edge (source starts with __ENTRY__ or similar pattern)
  const isEntryEdge = source?.includes('ENTRY') || source?.includes('entry');
  
  // Determine edge color based on edge type and position
  let edgeColor = '#666666'; // Default gray
  let strokeWidth = 2;
  let strokeDasharray = '';
  
  if (isEntryEdge) {
    edgeColor = '#d32f2f'; // Red for entry point connections
    strokeWidth = 3;
    strokeDasharray = '8,4'; // Dashed pattern for entry edges
    console.log(`[@component:UINavigationEdge] Edge ${id} set to RED DASHED (entry point connection)`);
  } else if (targetPosition === 'bottom' || targetPosition === 'top') {
    edgeColor = '#f44336'; // Red for vertical connections (parent-child from bottom to top)
    console.log(`[@component:UINavigationEdge] Edge ${id} set to RED (vertical - bottom to top connection)`);
  } else if (sourcePosition === 'left' || sourcePosition === 'right' || targetPosition === 'left' || targetPosition === 'right') {
    edgeColor = '#1976d2'; // Blue for horizontal connections (siblings left-right)
    console.log(`[@component:UINavigationEdge] Edge ${id} set to BLUE (horizontal - left/right connection)`);
  } else {
    console.log(`[@component:UINavigationEdge] Edge ${id} set to GRAY (default) - sourcePosition: ${sourcePosition}, targetPosition: ${targetPosition}`);
  }

  console.log(`[@component:UINavigationEdge] Edge ${id} final color:`, edgeColor);

  return (
    <>
      {/* Force stroke color with higher specificity */}
      <style>
        {`
          .custom-edge-${id} {
            stroke: ${edgeColor} !important;
            stroke-width: ${strokeWidth}px !important;
            stroke-dasharray: ${strokeDasharray} !important;
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
      
      {/* Entry edge label */}
      {isEntryEdge && data?.action && (
        <text
          x={labelX}
          y={labelY - 10}
          textAnchor="middle"
          fontSize="11"
          fill={edgeColor}
          fontWeight="bold"
          style={{
            filter: 'drop-shadow(0 1px 2px rgba(255,255,255,0.8))',
          }}
        >
          {typeof data.action === 'string' ? data.action : data.action.label}
        </text>
      )}
      
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