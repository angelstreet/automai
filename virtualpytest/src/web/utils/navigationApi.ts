// Navigation API utility functions
const API_BASE_URL = 'http://localhost:5009/api/navigation';

export interface NavigationStep {
  step_number: number;
  action: string;
  from_node_label: string;
  to_node_label: string;
  from_node_id: string;
  to_node_id: string;
}

export interface NavigationPreviewResponse {
  success: boolean;
  error?: string;
  tree_id: string;
  target_node_id: string;
  steps: NavigationStep[];
  total_steps: number;
}

export interface NavigationExecuteResponse {
  success: boolean;
  error?: string;
  steps_executed: number;
  total_steps: number;
  execution_time: number;
  target_node_id: string;
  current_node_id?: string;
}

export interface TakeControlStatusResponse {
  success: boolean;
  error?: string;
  tree_id: string;
  take_control_active: boolean;
}

export interface TakeControlToggleResponse {
  success: boolean;
  error?: string;
  tree_id: string;
  action: 'activate' | 'deactivate';
  take_control_active: boolean;
  user_id?: string;
}

export interface NavigationStatsResponse {
  success: boolean;
  error?: string;
  tree_id: string;
  total_nodes: number;
  total_edges: number;
  connected_components: number;
  has_cycles: boolean;
  entry_points: string[];
  isolated_nodes: string[];
}

export class NavigationApi {
  /**
   * Get navigation preview (path from current/root to target node)
   */
  static async getNavigationPreview(
    treeId: string,
    targetNodeId: string,
    currentNodeId?: string
  ): Promise<NavigationPreviewResponse> {
    try {
      console.log(`[@util:NavigationApi] Getting navigation preview for node ${targetNodeId} in tree ${treeId}`);
      
      const url = new URL(`${API_BASE_URL}/preview/${treeId}/${targetNodeId}`);
      if (currentNodeId) {
        url.searchParams.append('current_node_id', currentNodeId);
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result: NavigationPreviewResponse = await response.json();
      
      if (result.success) {
        console.log(`[@util:NavigationApi] Navigation preview success: ${result.total_steps} steps to reach ${targetNodeId}`);
      } else {
        console.error(`[@util:NavigationApi] Navigation preview failed: ${result.error}`);
      }

      return result;
    } catch (error) {
      console.error(`[@util:NavigationApi] Get navigation preview error: ${error}`);
      return {
        success: false,
        error: `Failed to get navigation preview: ${error instanceof Error ? error.message : 'Unknown error'}`,
        tree_id: treeId,
        target_node_id: targetNodeId,
        steps: [],
        total_steps: 0,
      };
    }
  }

  /**
   * Execute navigation to target node
   */
  static async executeNavigation(
    treeId: string,
    targetNodeId: string,
    currentNodeId?: string,
    execute: boolean = true
  ): Promise<NavigationExecuteResponse> {
    try {
      console.log(`[@util:NavigationApi] Executing navigation to node ${targetNodeId} in tree ${treeId}`);
      
      const response = await fetch(`${API_BASE_URL}/navigate/${treeId}/${targetNodeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          current_node_id: currentNodeId,
          execute: execute,
        }),
      });

      const result: NavigationExecuteResponse = await response.json();
      
      if (result.success) {
        console.log(`[@util:NavigationApi] Navigation executed successfully: ${result.steps_executed}/${result.total_steps} steps in ${result.execution_time}s`);
      } else {
        console.error(`[@util:NavigationApi] Navigation execution failed: ${result.error}`);
      }

      return result;
    } catch (error) {
      console.error(`[@util:NavigationApi] Execute navigation error: ${error}`);
      return {
        success: false,
        error: `Failed to execute navigation: ${error instanceof Error ? error.message : 'Unknown error'}`,
        steps_executed: 0,
        total_steps: 0,
        execution_time: 0,
        target_node_id: targetNodeId,
      };
    }
  }

  /**
   * Get take control status for a tree
   */
  static async getTakeControlStatus(treeId: string): Promise<TakeControlStatusResponse> {
    try {
      console.log(`[@util:NavigationApi] Getting take control status for tree ${treeId}`);
      
      const response = await fetch(`${API_BASE_URL}/take-control/${treeId}/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result: TakeControlStatusResponse = await response.json();
      
      if (result.success) {
        console.log(`[@util:NavigationApi] Take control status: ${result.take_control_active ? 'ACTIVE' : 'INACTIVE'}`);
      } else {
        console.error(`[@util:NavigationApi] Failed to get take control status: ${result.error}`);
      }

      return result;
    } catch (error) {
      console.error(`[@util:NavigationApi] Get take control status error: ${error}`);
      return {
        success: false,
        error: `Failed to get take control status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        tree_id: treeId,
        take_control_active: false,
      };
    }
  }

  /**
   * Toggle take control mode
   */
  static async toggleTakeControl(
    treeId: string,
    action: 'activate' | 'deactivate' = 'activate',
    userId: string = 'default_user'
  ): Promise<TakeControlToggleResponse> {
    try {
      console.log(`[@util:NavigationApi] ${action === 'activate' ? 'Activating' : 'Deactivating'} take control for tree ${treeId}`);
      
      const response = await fetch(`${API_BASE_URL}/take-control/${treeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: action,
          user_id: userId,
        }),
      });

      const result: TakeControlToggleResponse = await response.json();
      
      if (result.success) {
        console.log(`[@util:NavigationApi] Take control ${action}: SUCCESS`);
      } else {
        console.error(`[@util:NavigationApi] Take control ${action} failed: ${result.error}`);
      }

      return result;
    } catch (error) {
      console.error(`[@util:NavigationApi] Toggle take control error: ${error}`);
      return {
        success: false,
        error: `Failed to toggle take control: ${error instanceof Error ? error.message : 'Unknown error'}`,
        tree_id: treeId,
        action: action,
        take_control_active: false,
      };
    }
  }

  /**
   * Get navigation graph statistics
   */
  static async getNavigationStats(treeId: string): Promise<NavigationStatsResponse> {
    try {
      console.log(`[@util:NavigationApi] Getting navigation stats for tree ${treeId}`);
      
      const response = await fetch(`${API_BASE_URL}/stats/${treeId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result: NavigationStatsResponse = await response.json();
      
      if (result.success) {
        console.log(`[@util:NavigationApi] Navigation stats: ${result.total_nodes} nodes, ${result.total_edges} edges`);
      } else {
        console.error(`[@util:NavigationApi] Failed to get navigation stats: ${result.error}`);
      }

      return result;
    } catch (error) {
      console.error(`[@util:NavigationApi] Get navigation stats error: ${error}`);
      return {
        success: false,
        error: `Failed to get navigation stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
        tree_id: treeId,
        total_nodes: 0,
        total_edges: 0,
        connected_components: 0,
        has_cycles: false,
        entry_points: [],
        isolated_nodes: [],
      };
    }
  }

  /**
   * Clear navigation cache
   */
  static async clearNavigationCache(treeId?: string): Promise<{success: boolean; error?: string}> {
    try {
      console.log(`[@util:NavigationApi] Clearing navigation cache${treeId ? ` for tree ${treeId}` : ''}`);
      
      const response = await fetch(`${API_BASE_URL}/cache/clear`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tree_id: treeId,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log(`[@util:NavigationApi] Cache cleared successfully`);
      } else {
        console.error(`[@util:NavigationApi] Failed to clear cache: ${result.error}`);
      }

      return result;
    } catch (error) {
      console.error(`[@util:NavigationApi] Clear cache error: ${error}`);
      return {
        success: false,
        error: `Failed to clear cache: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

// Shared Action Execution Utilities

export interface ActionExecutionResult {
  results: string[];
  executionStopped: boolean;
  updatedActions: any[];
}

/**
 * Utility function to execute edge actions with proper error handling and break logic
 */
export async function executeEdgeActions(
  actions: any[],
  controllerTypes: string[],
  updateActionResults?: (index: number, success: boolean) => void,
  finalWaitTime: number = 2000
): Promise<ActionExecutionResult> {
  console.log(`[@util:NavigationApi] Starting execution of ${actions.length} actions`);
  
  const apiControllerType = controllerTypes[0]?.replace(/_/g, '-') || 'android-mobile';
  let results: string[] = [];
  const updatedActions = [...actions];
  let executionStopped = false;
  
  // Utility function to update last run results (keeps last 10 results)
  const updateLastRunResults = (results: boolean[], newResult: boolean): boolean[] => {
    const updatedResults = [newResult, ...results];
    return updatedResults.slice(0, 10); // Keep only last 10 results
  };

  // Calculate confidence score from last run results (0-1 scale)
  const calculateConfidenceScore = (results?: boolean[]): number => {
    if (!results || results.length === 0) return 0.5; // Default confidence for new actions
    const successCount = results.filter(result => result).length;
    return successCount / results.length;
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  try {
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      
      if (!action.id) {
        results.push(`❌ Action ${i + 1}: No action selected`);
        // Update action with failed result
        updatedActions[i] = {
          ...action,
          last_run_result: updateLastRunResults(action.last_run_result || [], false)
        };
        results.push(`⏹️ Execution stopped due to failed action ${i + 1}`);
        executionStopped = true;
        console.log(`[@util:NavigationApi] STOPPING EXECUTION due to missing action ${i + 1}. Breaking out of loop.`);
        break;
      }
      
      console.log(`[@util:NavigationApi] Executing action ${i + 1}/${actions.length}: ${action.label}`);
      
      const actionToExecute = {
        ...action,
        params: { ...action.params }
      };
      
      if (action.requiresInput && action.inputValue) {
        if (action.command === 'launch_app') {
          actionToExecute.params.package = action.inputValue;
        } else if (action.command === 'close_app') {
          actionToExecute.params.package = action.inputValue;
        } else if (action.command === 'input_text') {
          actionToExecute.params.text = action.inputValue;
        } else if (action.command === 'click_element') {
          actionToExecute.params.element_id = action.inputValue;
        } else if (action.command === 'coordinate_tap') {
          const coords = action.inputValue.split(',').map((coord: string) => parseInt(coord.trim()));
          if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
            actionToExecute.params.x = coords[0];
            actionToExecute.params.y = coords[1];
          }
        }
      }
      
      console.log(`[@util:NavigationApi] Action ${i + 1} (${action.command}): requiresInput=${action.requiresInput}, inputValue="${action.inputValue}", final params:`, actionToExecute.params);
      
      let actionSuccess = false;
      
      try {
        const response = await fetch(`http://localhost:5009/api/virtualpytest/${apiControllerType}/execute-action`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: actionToExecute
          }),
        });
        
        const result = await response.json();
        
        // Check both HTTP status and result.success
        if (response.ok && result.success) {
          results.push(`✅ Action ${i + 1}: ${result.message || 'Success'}`);
          actionSuccess = true;
          console.log(`[@util:NavigationApi] Action ${i + 1} SUCCESS: ${result.message || 'Success'}`);
        } else {
          results.push(`❌ Action ${i + 1}: ${result.error || result.message || 'Failed'}`);
          actionSuccess = false;
          console.log(`[@util:NavigationApi] Action ${i + 1} FAILED: HTTP ${response.status}, Error: ${result.error || result.message || 'Failed'}`);
        }
      } catch (err: any) {
        results.push(`❌ Action ${i + 1}: ${err.message || 'Network error'}`);
        actionSuccess = false;
        console.log(`[@util:NavigationApi] Action ${i + 1} NETWORK ERROR: ${err.message || 'Network error'}`);
      }
      
      // Update action with result and confidence info
      const updatedLastRunResults = updateLastRunResults(action.last_run_result || [], actionSuccess);
      const confidenceScore = calculateConfidenceScore(updatedLastRunResults);
      
      updatedActions[i] = {
        ...action,
        last_run_result: updatedLastRunResults
      };
      
      // Add confidence info to results
      results.push(`   📊 Confidence: ${(confidenceScore * 100).toFixed(1)}% (${updatedLastRunResults.length} runs)`);
      
      console.log(`[@util:NavigationApi] Action ${i + 1} completed. Success: ${actionSuccess}, New confidence: ${confidenceScore.toFixed(3)}`);
      
      // Update action results callback if provided
      if (updateActionResults) {
        updateActionResults(i, actionSuccess);
      }
      
      // Stop execution if action failed
      if (!actionSuccess) {
        results.push(`⏹️ Execution stopped due to failed action ${i + 1}`);
        executionStopped = true;
        console.log(`[@util:NavigationApi] STOPPING EXECUTION due to failed action ${i + 1}. Breaking out of loop.`);
        break;
      }
      
      // Wait after action
      if (action.waitTime > 0) {
        console.log(`[@util:NavigationApi] Waiting ${action.waitTime}ms after action ${i + 1}`);
        await delay(action.waitTime);
      }
    }
    
    console.log(`[@util:NavigationApi] Action loop completed. ExecutionStopped: ${executionStopped}`);
    
    // Final wait only if execution wasn't stopped
    if (!executionStopped && finalWaitTime > 0) {
      console.log(`[@util:NavigationApi] Final wait: ${finalWaitTime}ms`);
      await delay(finalWaitTime);
      results.push(`⏱️ Final wait: ${finalWaitTime}ms completed`);
    }
    
    if (executionStopped) {
      console.log(`[@util:NavigationApi] Execution stopped due to failure`);
    } else {
      console.log(`[@util:NavigationApi] All actions completed successfully`);
    }
    
  } catch (err: any) {
    console.error('[@util:NavigationApi] Error executing actions:', err);
    results.push(`❌ ${err.message}`);
    executionStopped = true;
  }
  
  return {
    results,
    executionStopped,
    updatedActions
  };
} 