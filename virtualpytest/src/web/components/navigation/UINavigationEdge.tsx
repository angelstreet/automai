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

  return (
    <>
      {/* Define arrow marker */}
      <defs>
        <marker
          id={`arrowhead-${id}`}
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill="#b1b1b7"
          />
        </marker>
      </defs>

      <path
        id={id}
        style={{
          stroke: '#b1b1b7',
          strokeWidth: 2,
          fill: 'none',
          ...style,
        }}
        className="react-flow__edge-path"
        d={edgePath}
        markerEnd={`url(#arrowhead-${id})`}
      />
      
      {/* From/To labels */}
      {(data?.from || data?.to) && (
        <>
          {data?.from && (
            <text
              x={labelX}
              y={labelY - 15}
              style={{
                fontSize: '9px',
                fill: '#888',
                textAnchor: 'middle',
                dominantBaseline: 'middle',
                pointerEvents: 'none',
                fontStyle: 'italic',
              }}
            >
              From: {data.from}
            </text>
          )}
          {data?.to && (
            <text
              x={labelX}
              y={labelY - 5}
              style={{
                fontSize: '9px',
                fill: '#888',
                textAnchor: 'middle',
                dominantBaseline: 'middle',
                pointerEvents: 'none',
                fontStyle: 'italic',
              }}
            >
              To: {data.to}
            </text>
          )}
        </>
      )}
    </>
  );
}; 