// Navigation API utility functions

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
  private buildServerUrl: ((endpoint: string) => string) | null = null;

  // Initialize with buildServerUrl function from RegistrationContext
  initialize(buildServerUrl: (endpoint: string) => string) {
    this.buildServerUrl = buildServerUrl;
  }

  private getApiBaseUrl(): string {
    if (!this.buildServerUrl) {
      throw new Error('NavigationApi not initialized. Call initialize() with buildServerUrl function first.');
    }
    // Use centralized URL building for navigation endpoints
    return this.buildServerUrl('server/navigation');
  }

  /**
   * Get navigation preview (path from current/root to target node)
   */
  async getNavigationPreview(
    treeId: string,
    targetNodeId: string,
    currentNodeId?: string
  ): Promise<NavigationPreviewResponse> {
    try {
      console.log(`[@util:NavigationApi] Getting navigation preview for node ${targetNodeId} in tree ${treeId}`);
      
      const url = new URL(`${this.getApiBaseUrl()}/preview/${treeId}/${targetNodeId}`);
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
  async executeNavigation(
    treeId: string,
    targetNodeId: string,
    currentNodeId?: string,
    execute: boolean = true
  ): Promise<NavigationExecuteResponse> {
    try {
      console.log(`[@util:NavigationApi] Executing navigation to node ${targetNodeId} in tree ${treeId}`);
      
      const response = await fetch(`${this.getApiBaseUrl()}/navigate/${treeId}/${targetNodeId}`, {
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
  async getTakeControlStatus(treeId: string): Promise<TakeControlStatusResponse> {
    try {
      console.log(`[@util:NavigationApi] Getting take control status for tree ${treeId}`);
      
      const response = await fetch(`${this.getApiBaseUrl()}/take-control/${treeId}/status`, {
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
  async toggleTakeControl(
    treeId: string,
    action: 'activate' | 'deactivate' = 'activate',
    userId: string = 'default_user'
  ): Promise<TakeControlToggleResponse> {
    try {
      console.log(`[@util:NavigationApi] ${action === 'activate' ? 'Activating' : 'Deactivating'} take control for tree ${treeId}`);
      
      const response = await fetch(`${this.getApiBaseUrl()}/take-control/${treeId}`, {
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
  async getNavigationStats(treeId: string): Promise<NavigationStatsResponse> {
    try {
      console.log(`[@util:NavigationApi] Getting navigation stats for tree ${treeId}`);
      
      const response = await fetch(`${this.getApiBaseUrl()}/stats/${treeId}`, {
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
  async clearNavigationCache(treeId?: string): Promise<{success: boolean; error?: string}> {
    try {
      console.log(`[@util:NavigationApi] Clearing navigation cache${treeId ? ` for tree ${treeId}` : ''}`);
      
      const response = await fetch(`${this.getApiBaseUrl()}/cache/clear`, {
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
  updatedRetryActions?: any[];
}

/**
 * Utility function to execute edge actions with proper error handling and retry logic
 */
export async function executeEdgeActions(
  actions: any[],
  controllerTypes: string[],
  selectedHost: any,
  updateActionResults?: (index: number, success: boolean) => void,
  finalWaitTime: number = 2000,
  retryActions: any[] = [],
  updateRetryActionResults?: (index: number, success: boolean) => void
): Promise<ActionExecutionResult> {
  console.log(`[@util:NavigationApi] Starting execution of ${actions.length} actions with ${retryActions.length} retry actions`);
  
  let results: string[] = [];
  let updatedActions = [...actions];
  let updatedRetryActions = [...retryActions];
  let executionStopped = false;
  
  // Check if remote controller proxy is available
  if (!selectedHost?.controllerProxies?.remote) {
    console.error('[@util:NavigationApi] Remote controller proxy not available');
    return {
      results: ['❌ Remote controller proxy not available for selected host'],
      executionStopped: true,
      updatedActions,
      updatedRetryActions,
    };
  }
  
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

  // Helper function to execute action via controller proxy
  const executeActionViaProxy = async (action: any): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      console.log(`[@util:NavigationApi] Executing action via controller proxy: ${action.command}`);
      
      const remoteProxy = selectedHost.controllerProxies.remote;
      
      // Map action commands to controller proxy methods
      switch (action.command) {
        case 'tap':
        case 'coordinate_tap':
          if (action.params?.x !== undefined && action.params?.y !== undefined) {
            const result = await remoteProxy.tap(action.params.x, action.params.y);
            return result;
          }
          return { success: false, error: 'Missing coordinates for tap action' };
          
        case 'input_text':
          if (action.params?.text) {
            const result = await remoteProxy.input_text(action.params.text);
            return result;
          }
          return { success: false, error: 'Missing text for input action' };
          
        case 'press_key':
          if (action.params?.key) {
            const result = await remoteProxy.press_key(action.params.key);
            return result;
          }
          return { success: false, error: 'Missing key for press action' };
          
        case 'launch_app':
          if (action.params?.package) {
            const result = await remoteProxy.launch_app(action.params.package);
            return result;
          }
          return { success: false, error: 'Missing package for launch app action' };
          
        case 'close_app':
          if (action.params?.package) {
            const result = await remoteProxy.close_app(action.params.package);
            return result;
          }
          return { success: false, error: 'Missing package for close app action' };
          
        case 'click_element':
          if (action.params?.element_id) {
            const result = await remoteProxy.click_element(action.params.element_id);
            return result;
          }
          return { success: false, error: 'Missing element_id for click element action' };
          
        default:
          // For other commands, use the generic send_command method
          const result = await remoteProxy.send_command(action.command, action.params || {});
          return result;
      }
    } catch (error: any) {
      console.error(`[@util:NavigationApi] Controller proxy error:`, error);
      return { success: false, error: error.message || 'Controller proxy execution failed' };
    }
  };

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
      
      let actionSuccess = false;
      
      try {
        const result = await executeActionViaProxy(action);
        
        if (result.success) {
          results.push(`✅ Action ${i + 1}: ${result.message || 'Success'}`);
          actionSuccess = true;
          console.log(`[@util:NavigationApi] Action ${i + 1} SUCCESS: ${result.message || 'Success'}`);
        } else {
          results.push(`❌ Action ${i + 1}: ${result.error || result.message || 'Failed'}`);
          actionSuccess = false;
          console.log(`[@util:NavigationApi] Action ${i + 1} FAILED: ${result.error || result.message || 'Failed'}`);
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
    
    // If main actions failed and we have retry actions, execute them
    if (executionStopped && retryActions.length > 0) {
      results.push('');
      results.push('🔄 Main actions failed. Starting retry actions...');
      results.push(`📋 Processing ${retryActions.length} retry action(s):`);
      console.log(`[@util:NavigationApi] Starting retry actions execution - ${retryActions.length} actions to process`);
      
      // Reset execution state for retry
      executionStopped = false;
      
      for (let i = 0; i < retryActions.length; i++) {
        const action = retryActions[i];
        
        if (!action.id) {
          results.push(`❌ Retry Action ${i + 1}: No action selected`);
          updatedRetryActions[i] = {
            ...action,
            last_run_result: updateLastRunResults(action.last_run_result || [], false)
          };
          results.push(`⏹️ Retry execution stopped due to failed action ${i + 1}`);
          executionStopped = true;
          console.log(`[@util:NavigationApi] STOPPING RETRY EXECUTION due to missing action ${i + 1}`);
          break;
        }
        
        console.log(`[@util:NavigationApi] Executing retry action ${i + 1}/${retryActions.length}: ${action.label}`);
        
        let actionSuccess = false;
        
        try {
          const result = await executeActionViaProxy(action);
          
          if (result.success) {
            results.push(`✅ Retry Action ${i + 1}: ${result.message || 'Success'}`);
            actionSuccess = true;
            console.log(`[@util:NavigationApi] Retry Action ${i + 1} SUCCESS`);
          } else {
            results.push(`❌ Retry Action ${i + 1}: ${result.error || result.message || 'Failed'}`);
            actionSuccess = false;
            console.log(`[@util:NavigationApi] Retry Action ${i + 1} FAILED`);
          }
        } catch (err: any) {
          results.push(`❌ Retry Action ${i + 1}: ${err.message || 'Network error'}`);
          actionSuccess = false;
          console.log(`[@util:NavigationApi] Retry Action ${i + 1} NETWORK ERROR`);
        }
        
        // Update retry action with result
        const updatedLastRunResults = updateLastRunResults(action.last_run_result || [], actionSuccess);
        const confidenceScore = calculateConfidenceScore(updatedLastRunResults);
        
        updatedRetryActions[i] = {
          ...action,
          last_run_result: updatedLastRunResults
        };
        
        results.push(`   📊 Confidence: ${(confidenceScore * 100).toFixed(1)}% (${updatedLastRunResults.length} runs)`);
        
        if (updateRetryActionResults) {
          updateRetryActionResults(i, actionSuccess);
        }
        
        // Stop execution if retry action failed
        if (!actionSuccess) {
          results.push(`⏹️ Retry execution stopped due to failed action ${i + 1}`);
          executionStopped = true;
          console.log(`[@util:NavigationApi] STOPPING RETRY EXECUTION due to failed action ${i + 1}`);
          break;
        }
        
        // Wait after retry action
        if (action.waitTime > 0) {
          console.log(`[@util:NavigationApi] Waiting ${action.waitTime}ms after retry action ${i + 1}`);
          await delay(action.waitTime);
        }
      }
      
      console.log(`[@util:NavigationApi] Retry actions loop completed. Processed ${retryActions.length} actions. ExecutionStopped: ${executionStopped}`);
      
      if (!executionStopped) {
        results.push('✅ Retry actions completed successfully!');
        console.log(`[@util:NavigationApi] All retry actions completed successfully`);
        // Reset executionStopped since retry actions succeeded
        executionStopped = false;
      } else {
        results.push('❌ Retry actions also failed.');
        console.log(`[@util:NavigationApi] Retry actions execution stopped due to failure`);
      }
    }
    
    // Final wait only if execution wasn't stopped
    if (!executionStopped && finalWaitTime > 0) {
      console.log(`[@util:NavigationApi] Final wait: ${finalWaitTime}ms`);
      await delay(finalWaitTime);
      results.push(`⏱️ Final wait: ${finalWaitTime}ms completed`);
    }
    
    // Add final summary message
    if (executionStopped) {
      results.push('');
      results.push('❌ OVERALL RESULT: FAILED - All actions failed');
      console.log(`[@util:NavigationApi] OVERALL EXECUTION FAILED`);
    } else {
      results.push('');
      results.push('✅ OVERALL RESULT: SUCCESS - Actions completed successfully');
      console.log(`[@util:NavigationApi] OVERALL EXECUTION SUCCEEDED`);
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
    updatedActions,
    updatedRetryActions
  };
}

// Export a singleton instance for components to use
export const navigationApi = new NavigationApi(); 