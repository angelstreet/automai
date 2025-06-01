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