import React from 'react';
import { EdgeProps, getBezierPath, useReactFlow } from 'reactflow';
import { UINavigationEdge as UINavigationEdgeType } from '../../types/navigationTypes';
import { useValidationColors } from '../../hooks/useValidationColors';

export const UINavigationEdge: React.FC<EdgeProps<UINavigationEdgeType['data']>> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  source,
  target,
  sourceHandle,
  targetHandle,
}) => {
  const { getEdges, getNodes } = useReactFlow();
  const currentEdges = getEdges();
  const currentNodes = getNodes();
  const { getEdgeColors } = useValidationColors(data?.treeId || 'default', currentEdges);

  // Validate that both nodes exist
  const sourceNode = currentNodes.find(node => node.id === source);
  const targetNode = currentNodes.find(node => node.id === target);
  
  if (!sourceNode || !targetNode) {
    console.warn(`[@component:UINavigationEdge] Edge ${id} references non-existent nodes - source: ${!!sourceNode}, target: ${!!targetNode}`);
    return null;
  }

  // Check if this is an entry edge
  const isSourceEntryNode = sourceNode?.data?.type === 'entry' || sourceNode?.data?.node_type === 'entry';
  const isEntryEdge = data?.isEntryEdge || sourceHandle === 'entry-source' || isSourceEntryNode;

  // Get edge colors based on validation status
  const edgeColors = getEdgeColors(id, isEntryEdge);

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <g className={edgeColors.className}>
      <path
        id={id}
        style={{
          stroke: edgeColors.stroke,
          strokeWidth: edgeColors.strokeWidth,
          strokeDasharray: edgeColors.strokeDasharray,
          opacity: edgeColors.opacity,
          fill: 'none',
          transition: 'all 0.3s ease',
        }}
        className="react-flow__edge-path"
        d={edgePath}
      />
      {selected && (
        <path
          d={edgePath}
          style={{
            stroke: '#555',
            strokeWidth: edgeColors.strokeWidth + 2,
            fill: 'none',
            opacity: 0.3,
          }}
        />
      )}
      
      {/* Edge label if provided */}
      {data?.label && (
        <text
          x={(sourceX + targetX) / 2}
          y={(sourceY + targetY) / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            fontSize: '10px',
            fill: edgeColors.stroke,
            fontWeight: '500',
            pointerEvents: 'none',
            textShadow: '1px 1px 2px rgba(255,255,255,0.8)',
          }}
        >
          {data.label}
        </text>
      )}
    </g>
  );
}; 