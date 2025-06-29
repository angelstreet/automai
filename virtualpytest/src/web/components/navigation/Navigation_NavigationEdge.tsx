import React from 'react';
import { EdgeProps, getBezierPath, useReactFlow } from 'reactflow';

import { useEdge } from '../../hooks/navigation/useEdge';
import { UINavigationEdge as UINavigationEdgeType } from '../../types/pages/Navigation_Types';

export const NavigationEdgeComponent: React.FC<EdgeProps<UINavigationEdgeType['data']>> = (
  props,
) => {
  const {
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
  } = props;

  // Access sourceHandle from props directly
  const sourceHandle = (props as any).sourceHandle;

  const { getNodes } = useReactFlow();
  const currentNodes = getNodes();

  // Use the consolidated edge hook
  const edgeHook = useEdge();

  // Validate that both nodes exist
  const sourceNode = currentNodes.find((node) => node.id === source);
  const targetNode = currentNodes.find((node) => node.id === target);

  if (!sourceNode || !targetNode) {
    console.warn(
      `[@component:NavigationEdgeComponent] Edge ${id} references non-existent nodes - source: ${!!sourceNode}, target: ${!!targetNode}`,
    );
    return null;
  }

  // Check if this is an entry edge
  const isSourceEntryNode =
    sourceNode?.data?.type === 'entry' || sourceNode?.data?.node_type === 'entry';
  const isEntryEdge =
    (data as any)?.isEntryEdge || sourceHandle === 'entry-source' || isSourceEntryNode;

  // Get edge colors based on validation status using the hook
  const edgeColors = edgeHook.getEdgeColorsForEdge(id, isEntryEdge);

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <g className={edgeColors.className} data-edge-type={data?.edgeType}>
      {/* Invisible thick overlay for better selectability */}
      <path
        id={`${id}-selectable`}
        style={{
          stroke: 'transparent',
          strokeWidth: 12, // Much thicker for easier selection
          fill: 'none',
          cursor: 'pointer',
          pointerEvents: 'stroke', // Only respond to clicks on the stroke area
        }}
        className="react-flow__edge-interaction"
        d={edgePath}
      />

      {/* Visible edge path */}
      <path
        id={id}
        style={{
          stroke: edgeColors.stroke,
          strokeWidth: edgeColors.strokeWidth,
          strokeDasharray: edgeColors.strokeDasharray,
          opacity: edgeColors.opacity,
          fill: 'none',
          transition: 'all 0.3s ease',
          pointerEvents: 'none', // Let the thick overlay handle interactions
        }}
        className="react-flow__edge-path"
        d={edgePath}
      />

      {/* Selection indicator */}
      {selected && (
        <path
          d={edgePath}
          style={{
            stroke: '#555',
            strokeWidth: edgeColors.strokeWidth + 2,
            fill: 'none',
            opacity: 0.3,
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Edge label if provided */}
      {(data as any)?.label && (
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
          {(data as any).label}
        </text>
      )}
    </g>
  );
};
