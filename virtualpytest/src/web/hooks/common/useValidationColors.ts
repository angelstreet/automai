import { useCallback, useMemo, useEffect, useRef } from 'react';
import { useValidationStore } from '../../components/store/validationStore';
import { UINavigationEdge } from '../../types/pages/Navigation_Types';
import {
  NODE_TYPE_COLORS,
  VALIDATION_STATUS_COLORS,
  EDGE_COLORS,
  HANDLE_COLORS,
  getValidationStatusFromConfidence,
  type ValidationStatus,
  type NodeType,
  type HandlePosition
} from '../../config/validationColors';

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

export const useValidationColors = (treeId: string, edges?: UINavigationEdge[]) => {
  const {
    nodeValidationStatus,
    edgeValidationStatus,
    currentTestingNode,
    currentTestingEdge,
    isValidating,
    progress,
    results
  } = useValidationStore();

  // Track if stale validation check has been performed to avoid repeated calls
  const staleCheckPerformedRef = useRef(false);
  // Track nodes that have already been logged to avoid spam
  const loggedNodesRef = useRef(new Set<string>());

  // Get validation status for a specific node
  const getNodeValidationStatus = useCallback((nodeId: string): ValidationStatus => {
    // During validation, show testing status for current node
    if (isValidating && currentTestingNode === nodeId) {
      if (!loggedNodesRef.current.has(`${nodeId}-testing`)) {
        console.log(`[@hook:useValidationColors] Node ${nodeId} is currently being tested - showing 'testing' status`);
        loggedNodesRef.current.add(`${nodeId}-testing`);
      }
      return 'testing';
    }

    // Check if we have validation results for this node
    const status = nodeValidationStatus.get(nodeId);
    if (status) {
      const context = isValidating ? 'during active validation' : 'from persisted results';
      if (!loggedNodesRef.current.has(`${nodeId}-${status.status}`)) {
        console.log(`[@hook:useValidationColors] Node ${nodeId} has existing status: ${status.status} (${context})`);
        loggedNodesRef.current.add(`${nodeId}-${status.status}`);
      }
      return status.status;
    }
    
    // If no validation results exist, default to 'untested' (grey)
    // Only log this once per node to avoid spam
    if (!loggedNodesRef.current.has(`${nodeId}-untested`)) {
      console.log(`[@hook:useValidationColors] Node ${nodeId} has no validation status - defaulting to 'untested'`);
      loggedNodesRef.current.add(`${nodeId}-untested`);
    }
    return 'untested';
  }, [nodeValidationStatus, currentTestingNode, isValidating]);

  // Get validation status for a specific edge
  const getEdgeValidationStatus = useCallback((edgeId: string): ValidationStatus => {
    // During validation, show testing status for current edge
    if (isValidating && currentTestingEdge === edgeId) {
      console.log(`[@hook:useValidationColors] Edge ${edgeId} is currently being tested - showing 'testing' status`);
      return 'testing';
    }

    // Debug: Log what we're looking for
    console.log(`[@hook:useValidationColors] Looking up validation status for edge: ${edgeId}`);
    console.log(`[@hook:useValidationColors] Available validation statuses:`, Array.from(edgeValidationStatus.keys()));
    console.log(`[@hook:useValidationColors] Validation context: ${isValidating ? 'active validation' : 'using persisted results'}`);

    // Check if we have validation results for this edge ID directly
    let status = edgeValidationStatus.get(edgeId);
    if (status) {
      const context = isValidating ? 'during active validation' : 'from persisted results';
      console.log(`[@hook:useValidationColors] Found direct match for edge ${edgeId}: ${status.status} (${context})`);
      console.log(`[@hook:useValidationColors] Edge ${edgeId} confidence: ${status.confidence}, lastTested: ${status.lastTested}`);
      return status.status;
    }

    // If not found by direct ID, try to find by source-target format
    // Get the edge data to construct source-target ID
    if (edges) {
      const edgeData = edges.find(edge => edge.id === edgeId);
      if (edgeData) {
        const sourceTargetId = `${edgeData.source}-${edgeData.target}`;
        console.log(`[@hook:useValidationColors] Trying source-target ID: ${sourceTargetId} for edge: ${edgeId}`);
        status = edgeValidationStatus.get(sourceTargetId);
        if (status) {
          const context = isValidating ? 'during active validation' : 'from persisted results';
          console.log(`[@hook:useValidationColors] Found edge validation by source-target ID: ${sourceTargetId} for edge: ${edgeId}, status: ${status.status} (${context})`);
          console.log(`[@hook:useValidationColors] Edge ${sourceTargetId} confidence: ${status.confidence}, lastTested: ${status.lastTested}`);
          return status.status;
        } else {
          console.log(`[@hook:useValidationColors] No validation found for source-target ID: ${sourceTargetId}`);
        }
      } else {
        console.log(`[@hook:useValidationColors] Could not find edge data for ID: ${edgeId}`);
      }
    } else {
      console.log(`[@hook:useValidationColors] No edges array available for lookup`);
    }

    // If no validation results exist, default to 'untested' (grey)
    console.log(`[@hook:useValidationColors] No validation status found for edge ${edgeId}, defaulting to untested`);
    return 'untested';
  }, [edgeValidationStatus, currentTestingEdge, isValidating, edges]);

  // Get complete node colors including validation status
  const getNodeColors = useCallback((nodeId: string, nodeType: NodeType, isRootNode: boolean = false): NodeColorResult => {
    const baseColors = NODE_TYPE_COLORS[nodeType] || NODE_TYPE_COLORS.screen;
    const validationStatus = getNodeValidationStatus(nodeId);
    const statusColors = VALIDATION_STATUS_COLORS[validationStatus];

    // For entry nodes, always use yellow border regardless of validation status
    if (nodeType === 'entry') {
      return {
        background: baseColors.background,
        border: '#ffc107', // Always yellow for entry nodes
        textColor: baseColors.textColor,
        badgeColor: '#ffc107', // Always yellow for entry nodes
        boxShadow: validationStatus === 'testing' 
          ? `0 4px 12px rgba(255, 193, 7, 0.6), 0 0 20px rgba(255, 193, 7, 0.6)`
          : `0 2px 8px rgba(255, 193, 7, 0.4)`,
        className: validationStatus === 'testing' ? 'node-testing' : undefined
      };
    }

    // For untested nodes (no validation confidence), always use grey border
    if (validationStatus === 'untested') {
      return {
        background: baseColors.background,
        border: statusColors.border, // This will be grey (#9e9e9e) for untested
        textColor: baseColors.textColor,
        badgeColor: baseColors.badgeColor,
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)', // Subtle shadow for untested nodes
        className: undefined
      };
    }

    // For root nodes with validation status, use enhanced styling
    if (isRootNode) {
      return {
        background: baseColors.background,
        border: statusColors.border,
        textColor: baseColors.textColor,
        badgeColor: baseColors.badgeColor,
        boxShadow: validationStatus === 'testing' 
          ? `0 4px 12px ${statusColors.glow}, 0 0 20px ${statusColors.glow}`
          : `0 4px 12px rgba(211, 47, 47, 0.4)`,
        className: validationStatus === 'testing' ? 'node-testing' : undefined
      };
    }

    // Standard node styling with validation overlay
    return {
      background: baseColors.background,
      border: statusColors.border,
      textColor: baseColors.textColor,
      badgeColor: baseColors.badgeColor,
      boxShadow: validationStatus === 'testing'
        ? `0 4px 12px ${statusColors.glow}, 0 0 20px ${statusColors.glow}`
        : `0 2px 8px ${statusColors.glow}`,
      className: validationStatus === 'testing' ? 'node-testing' : undefined
    };
  }, [getNodeValidationStatus]);

  // Get edge colors including validation status
  const getEdgeColors = useCallback((edgeId: string, isEntryEdge: boolean = false): EdgeColorResult => {
    // Entry edges always use special styling regardless of validation status
    if (isEntryEdge) {
      return {
        stroke: EDGE_COLORS.entry.stroke,
        strokeWidth: EDGE_COLORS.entry.strokeWidth,
        strokeDasharray: EDGE_COLORS.entry.strokeDasharray,
        opacity: EDGE_COLORS.entry.opacity
      };
    }

    const validationStatus = getEdgeValidationStatus(edgeId);
    const edgeColors = EDGE_COLORS[validationStatus];

    return {
      stroke: edgeColors.stroke,
      strokeWidth: edgeColors.strokeWidth,
      strokeDasharray: edgeColors.strokeDasharray,
      opacity: edgeColors.opacity,
      className: validationStatus === 'testing' ? 'edge-testing' : undefined
    };
  }, [getEdgeValidationStatus]);

  // Get handle colors for specific position and validation status
  const getHandleColors = useCallback((nodeId: string, handlePosition: HandlePosition, handleId?: string, nodeType?: NodeType): HandleColorResult => {
    // For entry nodes, ALL handles should be yellow regardless of validation status
    if (nodeType === 'entry' || handleId === 'entry-source') {
      const validationStatus = getNodeValidationStatus(nodeId);
      return {
        background: '#ffc107', // Always yellow for entry node handles
        boxShadow: validationStatus === 'testing' 
          ? `0 0 12px rgba(255, 193, 7, 0.6)`
          : `0 1px 2px rgba(0,0,0,0.3)`,
        className: validationStatus === 'testing' ? 'handle-testing' : undefined
      };
    }

    // For root menu nodes' left handles, use yellow like entry nodes
    if (nodeType === 'menu' && handleId === 'left-target') {
      // Check if this is a root node by looking at the edges to see if it has incoming connections
      const hasIncomingEdges = edges?.some(edge => edge.target === nodeId);
      if (!hasIncomingEdges) {
        const validationStatus = getNodeValidationStatus(nodeId);
        return {
          background: '#ffc107', // Always yellow for root menu left handles
          boxShadow: validationStatus === 'testing' 
            ? `0 0 12px rgba(255, 193, 7, 0.6)`
            : `0 2px 8px rgba(255, 193, 7, 0.4)`,
          className: validationStatus === 'testing' ? 'handle-testing' : undefined
        };
      }
    }

    // For non-entry nodes, proceed with normal validation-based coloring
    let handleValidationStatus: ValidationStatus = 'untested';
    let isConnectedToEntryEdge = false;
    
    if (handleId && edges) {
      // Look for edges connected to this specific handle
      const connectedEdges = [...edgeValidationStatus.entries()].filter(([edgeId, _]) => {
        // Get the actual edge data to check source/target handles
        const edgeData = edges?.find(edge => edge.id === edgeId);
        if (!edgeData) {
          return false;
        }
        
        // Check if this edge is an entry edge
        const sourceNode = edges?.find(e => e.source === edgeData.source);
        const isEntryEdge = edgeData.sourceHandle === 'entry-source' || 
                           edgeData.data?.from === 'entry';
        
        if (isEntryEdge) {
          isConnectedToEntryEdge = true;
        }
        
        // For source handles, check if this node is the source and handle matches
        if (handleId.includes('source') && edgeData.source === nodeId) {
          // If edge has sourceHandle, match exactly, otherwise assume it matches
          if (edgeData.sourceHandle) {
            return edgeData.sourceHandle === handleId;
          } else {
            // Assume match if no sourceHandle specified (for edges loaded from database)
            return true;
          }
        }
        
        // For target handles, check if this node is the target and handle matches
        if (handleId.includes('target') && edgeData.target === nodeId) {
          // If edge has targetHandle, match exactly, otherwise assume it matches
          if (edgeData.targetHandle) {
            return edgeData.targetHandle === handleId;
          } else {
            // Assume match if no targetHandle specified (for edges loaded from database)
            return true;
          }
        }
        
        return false;
      });
      
      // If we found connected edges, use the "worst" validation status (prioritize failures)
      if (connectedEdges.length > 0) {
        const statuses = connectedEdges.map(([_, status]) => status.status);
        
        // Priority order: testing > low > medium > high > untested
        if (statuses.includes('testing')) {
          handleValidationStatus = 'testing';
        } else if (statuses.includes('low')) {
          handleValidationStatus = 'low';
        } else if (statuses.includes('medium')) {
          handleValidationStatus = 'medium';
        } else if (statuses.includes('high')) {
          handleValidationStatus = 'high';
        } else {
          handleValidationStatus = 'untested';
        }
      }
    }
    
    // If no specific edge status found, fall back to node validation status
    if (handleValidationStatus === 'untested') {
      handleValidationStatus = getNodeValidationStatus(nodeId);
    }
    
    // Special handling for handles connected to entry edges (but not entry nodes themselves)
    if (isConnectedToEntryEdge) {
      return {
        background: '#ffc107', // Always yellow for entry-related handles
        boxShadow: handleValidationStatus === 'testing' 
          ? `0 0 12px rgba(255, 193, 7, 0.6)`
          : `0 1px 2px rgba(0,0,0,0.3)`,
        className: handleValidationStatus === 'testing' ? 'handle-testing' : undefined
      };
    }
    
    const handleColors = HANDLE_COLORS[handlePosition];
    
    if (!handleColors) {
      // Fallback to a default handle color
      return {
        background: VALIDATION_STATUS_COLORS[handleValidationStatus].handle,
        className: handleValidationStatus === 'testing' ? 'handle-testing' : undefined
      };
    }

    return {
      background: handleColors[handleValidationStatus],
      boxShadow: handleValidationStatus === 'testing' 
        ? `0 0 12px ${VALIDATION_STATUS_COLORS.testing.glow}`
        : `0 1px 2px rgba(0,0,0,0.3)`,
      className: handleValidationStatus === 'testing' ? 'handle-testing' : undefined
    };
  }, [getNodeValidationStatus, edgeValidationStatus, edges]);

  // Calculate confidence from validation results
  const calculateEdgeConfidence = useCallback((edgeResult: any): number => {
    if (!edgeResult?.success) return 0;
    
    const actionSuccessRate = edgeResult.actionResults?.length > 0 
      ? edgeResult.actionResults.filter((a: any) => a.success).length / edgeResult.actionResults.length 
      : 1;
      
    const verificationSuccessRate = edgeResult.verificationResults?.length > 0
      ? edgeResult.verificationResults.filter((v: any) => v.success).length / edgeResult.verificationResults.length
      : 1;
      
    return (actionSuccessRate + verificationSuccessRate) / 2;
  }, []);

  // Update validation status from results
  const updateValidationStatusFromResults = useCallback(() => {
    if (!results?.edgeResults) return;

    results.edgeResults.forEach((edge: any) => {
      const confidence = calculateEdgeConfidence(edge);
      const status = edge.success ? getValidationStatusFromConfidence(confidence) : 'low';
      
      // Update edge status
      const edgeId = `${edge.from}-${edge.to}`;
      edgeValidationStatus.set(edgeId, {
        status,
        confidence,
        lastTested: new Date()
      });

      // Update target node status
      nodeValidationStatus.set(edge.to, {
        status: edge.success ? status : 'low',
        confidence: edge.success ? confidence : 0,
        lastTested: new Date()
      });
    });
  }, [results, calculateEdgeConfidence, edgeValidationStatus, nodeValidationStatus]);

  // Reset all validation colors to untested state
  const resetValidationColors = useCallback(() => {
    console.log('[@hook:useValidationColors] Resetting all validation colors to untested (grey)');
    nodeValidationStatus.clear();
    edgeValidationStatus.clear();
  }, [nodeValidationStatus, edgeValidationStatus]);

  // Clear stale validation results (when all edges are untested but nodes have status)
  const clearStaleValidationResults = useCallback(() => {
    const nodeCount = nodeValidationStatus.size;
    const edgeCount = edgeValidationStatus.size;
    
    console.log('[@hook:useValidationColors] Checking for stale validation results:', {
      nodeCount,
      edgeCount,
      nodeStatuses: Array.from(nodeValidationStatus.entries()).map(([id, status]) => ({ id, status: status.status, confidence: status.confidence })),
      edgeStatuses: Array.from(edgeValidationStatus.entries()).map(([id, status]) => ({ id, status: status.status, confidence: status.confidence }))
    });
    
    if (nodeCount > 0 && edgeCount > 0) {
      // Check if all edges are untested
      const allEdgesUntested = Array.from(edgeValidationStatus.values()).every(
        status => status.status === 'untested'
      );
      
      // Check if nodes have actual validation status (not untested)
      const nodesHaveValidationStatus = Array.from(nodeValidationStatus.values()).some(
        status => status.status !== 'untested'
      );
      
      console.log('[@hook:useValidationColors] Stale validation check results:', {
        allEdgesUntested,
        nodesHaveValidationStatus,
        shouldClear: allEdgesUntested && nodesHaveValidationStatus
      });
      
      if (allEdgesUntested && nodesHaveValidationStatus) {
        console.log('[@hook:useValidationColors] Detected stale validation results - all edges untested but nodes have status');
        console.log('[@hook:useValidationColors] This indicates a failed/incomplete validation run - clearing all results');
        
        // Clear all validation results
        nodeValidationStatus.clear();
        edgeValidationStatus.clear();
        
        // Also clear from the validation store
        const store = useValidationStore.getState();
        store.resetValidationColors();
        
        return true;
      }
    }
    
    return false;
  }, [nodeValidationStatus, edgeValidationStatus]);

  // Reset validation colors when validation starts
  const resetForNewValidation = useCallback(() => {
    console.log('[@hook:useValidationColors] Starting new validation - resetting all colors to grey');
    // Use the store's reset function for consistency
    const store = useValidationStore.getState();
    store.resetValidationColors();
    // Clear logged nodes to allow fresh logging for new validation
    loggedNodesRef.current.clear();
  }, []);

  // Memoized values for performance
  const validationState = useMemo(() => ({
    isValidating,
    currentTestingNode,
    currentTestingEdge,
    hasResults: !!results
  }), [isValidating, currentTestingNode, currentTestingEdge, results]);

  // Effect to automatically detect and clear stale validation results when the hook is first used
  // Only run once per hook instance to avoid unnecessary re-renders
  useEffect(() => {
    if (!staleCheckPerformedRef.current) {
      console.log('[@hook:useValidationColors] Performing initial stale validation check');
      clearStaleValidationResults();
      staleCheckPerformedRef.current = true;
    }
  }, []); // Empty dependency array - only run once on mount

  // Effect to clear logged nodes when validation state changes significantly
  useEffect(() => {
    if (isValidating) {
      console.log('[@hook:useValidationColors] Validation started - clearing logged nodes for fresh logging');
      loggedNodesRef.current.clear();
    }
  }, [isValidating]);

  return {
    // Color getters
    getNodeColors,
    getEdgeColors,
    getHandleColors,
    
    // Status getters
    getNodeValidationStatus,
    getEdgeValidationStatus,
    
    // Utilities
    calculateEdgeConfidence,
    updateValidationStatusFromResults,
    resetValidationColors,
    
    // State
    validationState,
    
    // Reset for new validation
    resetForNewValidation,
    
    // Clear stale validation results
    clearStaleValidationResults
  };
} 