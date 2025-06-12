// Navigation utility functions for data manipulation and validation

import {
  NavigationStep,
  NavigationPreviewResponse,
  NavigationExecuteResponse,
  ActionExecutionResult,
  EdgeAction
} from '../../types/pages/Navigation_Types';

/**
 * Calculate confidence score from last run results (0-1 scale)
 */
export function calculateConfidenceScore(results?: boolean[]): number {
  if (!results || results.length === 0) return 0.5; // Default confidence for new actions
  const successCount = results.filter(result => result).length;
  return successCount / results.length;
}

/**
 * Update last run results (keeps last 10 results)
 */
export function updateLastRunResults(results: boolean[], newResult: boolean): boolean[] {
  const updatedResults = [newResult, ...results];
  return updatedResults.slice(0, 10); // Keep only last 10 results
}

/**
 * Create a delay promise for waiting between actions
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Validate navigation tree structure
 */
export function validateNavigationTreeStructure(treeData: any): boolean {
  if (!treeData || typeof treeData !== 'object') {
    return false;
  }

  // Check for required properties
  if (!Array.isArray(treeData.nodes) || !Array.isArray(treeData.edges)) {
    return false;
  }

  // Validate nodes structure
  for (const node of treeData.nodes) {
    if (!node.id || !node.data || typeof node.position !== 'object') {
      return false;
    }
  }

  // Validate edges structure
  for (const edge of treeData.edges) {
    if (!edge.id || !edge.source || !edge.target) {
      return false;
    }
  }

  return true;
}

/**
 * Find node by ID in a tree
 */
export function findNodeById(nodes: any[], nodeId: string): any | null {
  return nodes.find(node => node.id === nodeId) || null;
}

/**
 * Get all parent nodes for a given node
 */
export function getParentNodes(nodes: any[], edges: any[], nodeId: string): any[] {
  const parentEdges = edges.filter(edge => edge.target === nodeId);
  return parentEdges.map(edge => findNodeById(nodes, edge.source)).filter(Boolean);
}

/**
 * Get all child nodes for a given node
 */
export function getChildNodes(nodes: any[], edges: any[], nodeId: string): any[] {
  const childEdges = edges.filter(edge => edge.source === nodeId);
  return childEdges.map(edge => findNodeById(nodes, edge.target)).filter(Boolean);
}

/**
 * Check if a node is reachable from another node
 */
export function isNodeReachable(edges: any[], fromNodeId: string, toNodeId: string): boolean {
  if (fromNodeId === toNodeId) return true;

  const visited = new Set<string>();
  const queue = [fromNodeId];

  while (queue.length > 0) {
    const currentNodeId = queue.shift()!;
    
    if (visited.has(currentNodeId)) continue;
    visited.add(currentNodeId);

    if (currentNodeId === toNodeId) return true;

    // Add all connected nodes to queue
    const connectedEdges = edges.filter(edge => edge.source === currentNodeId);
    for (const edge of connectedEdges) {
      if (!visited.has(edge.target)) {
        queue.push(edge.target);
      }
    }
  }

  return false;
}

/**
 * Get the depth of a node in the tree (distance from root)
 */
export function getNodeDepth(nodes: any[], edges: any[], nodeId: string): number {
  const rootNodes = nodes.filter(node => node.data?.is_root);
  if (rootNodes.length === 0) return 0;

  let minDepth = Infinity;
  
  for (const rootNode of rootNodes) {
    const depth = calculateDepthFromNode(edges, rootNode.id, nodeId, new Set());
    if (depth !== -1) {
      minDepth = Math.min(minDepth, depth);
    }
  }

  return minDepth === Infinity ? 0 : minDepth;
}

/**
 * Helper function to calculate depth from a specific node
 */
function calculateDepthFromNode(edges: any[], fromNodeId: string, toNodeId: string, visited: Set<string>): number {
  if (fromNodeId === toNodeId) return 0;
  if (visited.has(fromNodeId)) return -1; // Cycle detected

  visited.add(fromNodeId);

  const childEdges = edges.filter(edge => edge.source === fromNodeId);
  let minDepth = Infinity;

  for (const edge of childEdges) {
    const depth = calculateDepthFromNode(edges, edge.target, toNodeId, new Set(visited));
    if (depth !== -1) {
      minDepth = Math.min(minDepth, depth + 1);
    }
  }

  return minDepth === Infinity ? -1 : minDepth;
}

/**
 * Generate a unique ID for new nodes/edges
 */
export function generateUniqueId(prefix: string = 'node'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Sanitize node/edge data for saving
 */
export function sanitizeTreeData(treeData: any): any {
  if (!treeData) return { nodes: [], edges: [] };

  return {
    nodes: Array.isArray(treeData.nodes) ? treeData.nodes.map(sanitizeNode) : [],
    edges: Array.isArray(treeData.edges) ? treeData.edges.map(sanitizeEdge) : [],
  };
}

/**
 * Sanitize individual node data
 */
function sanitizeNode(node: any): any {
  return {
    id: node.id || generateUniqueId('node'),
    type: node.type || 'default',
    position: {
      x: typeof node.position?.x === 'number' ? node.position.x : 0,
      y: typeof node.position?.y === 'number' ? node.position.y : 0,
    },
    data: {
      ...node.data,
      label: node.data?.label || 'Untitled Node',
    },
  };
}

/**
 * Sanitize individual edge data
 */
function sanitizeEdge(edge: any): any {
  return {
    id: edge.id || generateUniqueId('edge'),
    source: edge.source,
    target: edge.target,
    type: edge.type || 'default',
    data: edge.data || {},
  };
}

/**
 * Execute edge actions sequentially with retry logic
 */
export async function executeEdgeActions(
  actions: EdgeAction[],
  controllerTypes: string[],
  selectedHostDevice: any,
  updateActionResults?: (index: number, results: boolean[]) => void,
  finalWaitTime: number = 2000,
  retryActions: EdgeAction[] = [],
  updateRetryActionResults?: (index: number, results: boolean[]) => void
): Promise<{
  results: string[];
  updatedActions: EdgeAction[];
  updatedRetryActions?: EdgeAction[];
  executionStopped: boolean;
}> {
  console.log(`[@utils:navigationUtils:executeEdgeActions] Starting execution of ${actions.length} actions`);
  
  const results: string[] = [];
  const updatedActions = [...actions];
  const updatedRetryActions = [...retryActions];
  let executionStopped = false;

  if (!selectedHostDevice?.controllerProxies?.remote) {
    throw new Error('Remote controller proxy not available');
  }

  // Execute main actions
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i];
    console.log(`[@utils:navigationUtils:executeEdgeActions] Executing action ${i + 1}/${actions.length}: ${action.label}`);
    
    try {
      // Prepare action for execution
      const actionToExecute = {
        id: action.id,
        label: action.label,
        command: action.command,
        params: { ...action.params },
        requiresInput: action.requiresInput,
        waitTime: action.waitTime
      };

      // Update params with input values for actions that require them
      if (action.requiresInput && action.inputValue) {
        const inputValue = action.inputValue;
        const command = action.command;
        
        if (command === 'launch_app' || command === 'close_app') {
          actionToExecute.params.package = inputValue;
        } else if (command === 'input_text') {
          actionToExecute.params.text = inputValue;
        } else if (command === 'click_element') {
          actionToExecute.params.element_id = inputValue;
        } else if (command === 'coordinate_tap') {
          const coords = inputValue.split(',');
          if (coords.length >= 2) {
            try {
              actionToExecute.params.x = parseInt(coords[0].trim());
              actionToExecute.params.y = parseInt(coords[1].trim());
            } catch (error) {
              console.warn(`[@utils:navigationUtils:executeEdgeActions] Invalid coordinates: ${inputValue}`);
            }
          }
        }
      }

      // Execute the action via controller proxy
      const result = await selectedHostDevice.controllerProxies.remote.executeAction(actionToExecute);
      
      const success = result.success || false;
      const message = result.message || (success ? '✅ Success' : '❌ Failed');
      
      results.push(`Action ${i + 1}: ${message}`);
      
      // Update action results
      const newResults = updateLastRunResults(action.last_run_result || [], success);
      updatedActions[i] = { ...updatedActions[i], last_run_result: newResults };
      
      // Call update callback if provided
      if (updateActionResults) {
        updateActionResults(i, newResults);
      }
      
      // Wait between actions
      if (action.waitTime > 0) {
        await delay(action.waitTime);
      }
      
      // If action failed and we have retry actions, execute them
      if (!success && retryActions.length > 0) {
        console.log(`[@utils:navigationUtils:executeEdgeActions] Main action failed, executing ${retryActions.length} retry actions`);
        
        for (let j = 0; j < retryActions.length; j++) {
          const retryAction = retryActions[j];
          console.log(`[@utils:navigationUtils:executeEdgeActions] Executing retry action ${j + 1}/${retryActions.length}: ${retryAction.label}`);
          
          try {
            const retryActionToExecute = {
              id: retryAction.id,
              label: retryAction.label,
              command: retryAction.command,
              params: { ...retryAction.params },
              requiresInput: retryAction.requiresInput,
              waitTime: retryAction.waitTime
            };

            // Handle input values for retry actions
            if (retryAction.requiresInput && retryAction.inputValue) {
              const inputValue = retryAction.inputValue;
              const command = retryAction.command;
              
              if (command === 'launch_app' || command === 'close_app') {
                retryActionToExecute.params.package = inputValue;
              } else if (command === 'input_text') {
                retryActionToExecute.params.text = inputValue;
              } else if (command === 'click_element') {
                retryActionToExecute.params.element_id = inputValue;
              } else if (command === 'coordinate_tap') {
                const coords = inputValue.split(',');
                if (coords.length >= 2) {
                  try {
                    retryActionToExecute.params.x = parseInt(coords[0].trim());
                    retryActionToExecute.params.y = parseInt(coords[1].trim());
                  } catch (error) {
                    console.warn(`[@utils:navigationUtils:executeEdgeActions] Invalid retry coordinates: ${inputValue}`);
                  }
                }
              }
            }

            const retryResult = await selectedHostDevice.controllerProxies.remote.executeAction(retryActionToExecute);
            const retrySuccess = retryResult.success || false;
            const retryMessage = retryResult.message || (retrySuccess ? '✅ Retry Success' : '❌ Retry Failed');
            
            results.push(`Retry ${j + 1}: ${retryMessage}`);
            
            // Update retry action results
            const newRetryResults = updateLastRunResults(retryAction.last_run_result || [], retrySuccess);
            updatedRetryActions[j] = { ...updatedRetryActions[j], last_run_result: newRetryResults };
            
            // Call retry update callback if provided
            if (updateRetryActionResults) {
              updateRetryActionResults(j, newRetryResults);
            }
            
            // Wait between retry actions
            if (retryAction.waitTime > 0) {
              await delay(retryAction.waitTime);
            }
            
          } catch (retryError: any) {
            console.error(`[@utils:navigationUtils:executeEdgeActions] Retry action ${j + 1} failed:`, retryError);
            results.push(`Retry ${j + 1}: ❌ ${retryError.message}`);
            
            // Update retry action with failure
            const newRetryResults = updateLastRunResults(retryAction.last_run_result || [], false);
            updatedRetryActions[j] = { ...updatedRetryActions[j], last_run_result: newRetryResults };
            
            if (updateRetryActionResults) {
              updateRetryActionResults(j, newRetryResults);
            }
          }
        }
      }
      
    } catch (error: any) {
      console.error(`[@utils:navigationUtils:executeEdgeActions] Action ${i + 1} failed:`, error);
      results.push(`Action ${i + 1}: ❌ ${error.message}`);
      
      // Update action with failure
      const newResults = updateLastRunResults(action.last_run_result || [], false);
      updatedActions[i] = { ...updatedActions[i], last_run_result: newResults };
      
      if (updateActionResults) {
        updateActionResults(i, newResults);
      }
    }
  }

  // Final wait time
  if (finalWaitTime > 0) {
    console.log(`[@utils:navigationUtils:executeEdgeActions] Final wait: ${finalWaitTime}ms`);
    await delay(finalWaitTime);
  }

  console.log(`[@utils:navigationUtils:executeEdgeActions] Execution completed. Results: ${results.length}`);
  
  return {
    results,
    updatedActions,
    updatedRetryActions: retryActions.length > 0 ? updatedRetryActions : undefined,
    executionStopped
  };
} 