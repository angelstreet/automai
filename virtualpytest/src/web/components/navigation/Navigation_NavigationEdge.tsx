import React from 'react';
import { EdgeProps, getSmoothStepPath, getBezierPath, useReactFlow } from 'reactflow';

import { useEdge } from '../../hooks/navigation/useEdge';
import { UINavigationEdge as UINavigationEdgeType } from '../../types/pages/Navigation_Types';

export const NavigationEdgeComponent: React.FC<EdgeProps<UINavigationEdgeType['data']>> = (
  props,
) => {
  const { id, source, target, sourceX, sourceY, targetX, targetY, data, selected } = props;
  const { getNodes } = useReactFlow();

  // Use the consolidated edge hook
  const edgeHook = useEdge();

  // Get edge colors based on validation status
  const edgeColors = edgeHook.getEdgeColorsForEdge(id, false);

  // Get current nodes to check types
  const nodes = getNodes();
  const sourceNode = nodes.find((node) => node.id === source);
  const targetNode = nodes.find((node) => node.id === target);

  // Check if this is an entry-to-home connection
  const isEntryToHome =
    sourceNode?.data?.type === 'entry' &&
    (targetNode?.data?.is_root === true || targetNode?.data?.label?.toLowerCase() === 'home');

  // Normalize coordinates for bidirectional edges to ensure same path (for non-entry edges)
  // Always use the lexicographically smaller node ID as "source" for path calculation
  const normalizedSource = source < target ? source : target;

  // Determine if we need to swap coordinates based on normalization
  const shouldSwapCoordinates = source !== normalizedSource;

  // Use normalized coordinates for consistent path (only for non-entry edges)
  const pathSourceX =
    isEntryToHome || shouldSwapCoordinates ? (isEntryToHome ? sourceX : targetX) : sourceX;
  const pathSourceY =
    isEntryToHome || shouldSwapCoordinates ? (isEntryToHome ? sourceY : targetY) : sourceY;
  const pathTargetX =
    isEntryToHome || shouldSwapCoordinates ? (isEntryToHome ? targetX : sourceX) : targetX;
  const pathTargetY =
    isEntryToHome || shouldSwapCoordinates ? (isEntryToHome ? targetY : sourceY) : targetY;

  // Choose path type based on edge type
  let edgePath: string;

  if (isEntryToHome) {
    // Use bezier path for entry-to-home connections
    [edgePath] = getBezierPath({
      sourceX: pathSourceX,
      sourceY: pathSourceY,
      targetX: pathTargetX,
      targetY: pathTargetY,
    });
  } else {
    // Use smooth step path for all other connections
    [edgePath] = getSmoothStepPath({
      sourceX: pathSourceX,
      sourceY: pathSourceY,
      targetX: pathTargetX,
      targetY: pathTargetY,
    });
  }

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
