import { useCallback, useMemo } from 'react';

import {
  NODE_TYPE_COLORS,
  EDGE_COLORS,
  HANDLE_COLORS,
  type NodeType,
  type HandlePosition,
} from '../../config/validationColors';
import { UINavigationEdge } from '../../types/pages/Navigation_Types';

interface NodeColorResult {
  background: string;
  border: string;
  textColor: string;
  badgeColor: string;
  boxShadow?: string;
  className?: string;
}

interface EdgeColorResult {
  stroke: string;
  strokeWidth: number;
  strokeDasharray: string;
  opacity: number;
  className?: string;
}

interface HandleColorResult {
  background: string;
  boxShadow?: string;
  className?: string;
}

export const useValidationColors = (edges?: UINavigationEdge[]) => {
  // Get basic node colors based on node type
  const getNodeColors = useCallback((nodeType: NodeType): NodeColorResult => {
    const colors = NODE_TYPE_COLORS[nodeType] || NODE_TYPE_COLORS.screen;

    return {
      background: colors.background,
      border: colors.border,
      textColor: colors.textColor,
      badgeColor: colors.badgeColor,
      // boxShadow removed to eliminate all shadows in nested tree
    };
  }, []);

  // Get basic edge colors (default gray)
  const getEdgeColors = useCallback((edgeId: string): EdgeColorResult => {
    return {
      stroke: EDGE_COLORS.untested.stroke,
      strokeWidth: EDGE_COLORS.untested.strokeWidth,
      strokeDasharray: EDGE_COLORS.untested.strokeDasharray,
      opacity: EDGE_COLORS.untested.opacity,
    };
  }, []);

  // Get handle colors
  const getHandleColors = useCallback((position: HandlePosition): HandleColorResult => {
    const colors = HANDLE_COLORS[position] || HANDLE_COLORS.leftTop;

    return {
      background: colors.untested, // Use untested status as default
      // boxShadow removed to eliminate all shadows in nested tree
    };
  }, []);

  // Simplified functions for navigation feedback (no complex validation tracking)
  const setNavigationEdgesSuccess = useCallback((transitions: any[]) => {
    // Could implement simple edge highlighting here if needed
    console.log('Navigation successful for transitions:', transitions.length);
  }, []);

  const setNavigationEdgesFailure = useCallback((transitions: any[], failedIndex?: number) => {
    // Could implement simple edge highlighting here if needed
    console.log('Navigation failed at transition:', failedIndex);
  }, []);

  const resetNavigationEdgeColors = useCallback(() => {
    // Reset any edge highlighting
    console.log('Reset navigation edge colors');
  }, []);

  const setNodeVerificationSuccess = useCallback((nodeId: string) => {
    // Could implement simple node highlighting here if needed
    console.log('Node verification successful:', nodeId);
  }, []);

  const setNodeVerificationFailure = useCallback((nodeId: string) => {
    // Could implement simple node highlighting here if needed
    console.log('Node verification failed:', nodeId);
  }, []);

  const resetNodeVerificationColors = useCallback((nodeId?: string) => {
    // Reset any node highlighting
    console.log('Reset node verification colors:', nodeId);
  }, []);

  return {
    // Core color functions
    getNodeColors,
    getEdgeColors,
    getHandleColors,

    // Navigation feedback (simplified)
    setNavigationEdgesSuccess,
    setNavigationEdgesFailure,
    resetNavigationEdgeColors,
    setNodeVerificationSuccess,
    setNodeVerificationFailure,
    resetNodeVerificationColors,
  };
};
