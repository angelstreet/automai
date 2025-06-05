import { useCallback, useMemo } from 'react';
import { useValidationStore } from '../components/store/validationStore';
import { UINavigationEdge } from '../types/navigationTypes';
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

  // Get validation status for a specific node
  const getNodeValidationStatus = useCallback((nodeId: string): ValidationStatus => {
    // During validation, show testing status for current node
    if (isValidating && currentTestingNode === nodeId) {
      return 'testing';
    }

    // Check if we have validation results for this node
    const status = nodeValidationStatus.get(nodeId);
    return status?.status || 'untested';
  }, [nodeValidationStatus, currentTestingNode, isValidating]);

  // Get validation status for a specific edge
  const getEdgeValidationStatus = useCallback((edgeId: string): ValidationStatus => {
    // During validation, show testing status for current edge
    if (isValidating && currentTestingEdge === edgeId) {
      return 'testing';
    }

    // Check if we have validation results for this edge
    const status = edgeValidationStatus.get(edgeId);
    return status?.status || 'untested';
  }, [edgeValidationStatus, currentTestingEdge, isValidating]);

  // Get complete node colors including validation status
  const getNodeColors = useCallback((nodeId: string, nodeType: NodeType, isRootNode: boolean = false): NodeColorResult => {
    const baseColors = NODE_TYPE_COLORS[nodeType] || NODE_TYPE_COLORS.screen;
    const validationStatus = getNodeValidationStatus(nodeId);
    const statusColors = VALIDATION_STATUS_COLORS[validationStatus];

    // For root nodes, use enhanced styling
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
        : validationStatus !== 'untested'
        ? `0 2px 8px ${statusColors.glow}`
        : '0 2px 4px rgba(0,0,0,0.1)',
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
  const getHandleColors = useCallback((nodeId: string, handlePosition: HandlePosition, handleId?: string): HandleColorResult => {
    // First, try to find edges connected to this specific handle
    let handleValidationStatus: ValidationStatus = 'untested';
    
    if (handleId && edges) {
      // Look for edges connected to this specific handle
      const connectedEdges = [...edgeValidationStatus.entries()].filter(([edgeId, _]) => {
        // Get the actual edge data to check source/target handles
        const edgeData = edges?.find(edge => edge.id === edgeId);
        if (!edgeData) {
          return false;
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
        
        console.log(`[@hook:useValidationColors] Handle ${handleId} on node ${nodeId} has ${connectedEdges.length} connected edges with status: ${handleValidationStatus}`);
      }
    }
    
    // If no specific edge status found, fall back to node validation status
    if (handleValidationStatus === 'untested') {
      handleValidationStatus = getNodeValidationStatus(nodeId);
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
    nodeValidationStatus.clear();
    edgeValidationStatus.clear();
  }, [nodeValidationStatus, edgeValidationStatus]);

  // Memoized values for performance
  const validationState = useMemo(() => ({
    isValidating,
    currentTestingNode,
    currentTestingEdge,
    hasResults: !!results
  }), [isValidating, currentTestingNode, currentTestingEdge, results]);

  // Initialize validation colors from last results
  const initializeFromLastResults = useCallback(() => {
    const store = useValidationStore.getState();
    const { lastResult } = store;
    
    if (lastResult && lastResult.nodeResults && lastResult.edgeResults) {
      console.log('[@hook:useValidationColors] Initializing colors from last validation results');
      console.log('[@hook:useValidationColors] Last result structure:', {
        nodeResults: lastResult.nodeResults.length,
        edgeResults: lastResult.edgeResults.length,
        summary: lastResult.summary
      });
      
      // Initialize node validation status from array
      lastResult.nodeResults.forEach((nodeResult) => {
        if (nodeResult.nodeId) {
          // Calculate confidence based on node validity
          const confidence = nodeResult.isValid ? 0.8 : 0.2; // Simple confidence calculation
          const status = getValidationStatusFromConfidence(confidence);
          
          console.log(`[@hook:useValidationColors] Setting node ${nodeResult.nodeId} status: ${status} (confidence: ${confidence})`);
          store.setNodeValidationStatus(nodeResult.nodeId, {
            status,
            confidence,
            lastTested: new Date() // Use current date since we don't have timestamp
          });
        }
      });
      
      // Initialize edge validation status from array
      lastResult.edgeResults.forEach((edgeResult) => {
        if (edgeResult.from && edgeResult.to) {
          // Calculate confidence based on edge success and detailed results
          let confidence = 0;
          if (edgeResult.success) {
            // Calculate confidence from action and verification results
            const actionSuccessRate = edgeResult.actionResults?.length > 0 
              ? edgeResult.actionResults.filter(a => a.success).length / edgeResult.actionResults.length 
              : 1;
              
            const verificationSuccessRate = edgeResult.verificationResults?.length > 0
              ? edgeResult.verificationResults.filter(v => v.success).length / edgeResult.verificationResults.length
              : 1;
              
            confidence = (actionSuccessRate + verificationSuccessRate) / 2;
          } else {
            confidence = 0.1; // Low confidence for failed edges
          }
          
          const status = getValidationStatusFromConfidence(confidence);
          const edgeId = `${edgeResult.from}-${edgeResult.to}`;
          
          console.log(`[@hook:useValidationColors] Setting edge ${edgeId} status: ${status} (confidence: ${confidence})`);
          store.setEdgeValidationStatus(edgeId, {
            status,
            confidence,
            lastTested: new Date() // Use current date since we don't have timestamp
          });
        }
      });
      
      console.log('[@hook:useValidationColors] Initialized validation colors from last results');
    } else {
      console.log('[@hook:useValidationColors] No last validation results found to initialize colors');
      if (lastResult) {
        console.log('[@hook:useValidationColors] Last result exists but missing nodeResults or edgeResults:', {
          hasNodeResults: !!lastResult.nodeResults,
          hasEdgeResults: !!lastResult.edgeResults,
          nodeResultsLength: lastResult.nodeResults?.length,
          edgeResultsLength: lastResult.edgeResults?.length
        });
      }
    }
  }, []);

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
    
    // Initialize from last results
    initializeFromLastResults
  };
} 