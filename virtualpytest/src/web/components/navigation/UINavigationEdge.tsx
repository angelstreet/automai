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
        markerEnd="url(#arrowhead)"
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
      
      {/* Single navigation action label */}
      {data?.action && (
        <text
          x={labelX}
          y={labelY + 8}
          style={{
            fontSize: '11px',
            fill: '#2563eb',
            textAnchor: 'middle',
            dominantBaseline: 'middle',
            pointerEvents: 'none',
            fontWeight: 'bold',
          }}
        >
          {data.action}
        </text>
      )}
    </>
  );
}; 