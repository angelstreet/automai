/**
 * Navigation Service
 * 
 * This service handles all API calls related to navigation trees including:
 * - Creating, reading, updating, and deleting navigation trees
 * - Managing navigation tree data structure
 * - Handling API responses and error states
 */

// Types for navigation tree data
export interface NavigationNode {
  id: string;
  type: 'uiScreen';
  position: { x: number; y: number };
  data: {
    label: string;
    type: 'screen' | 'dialog' | 'popup' | 'overlay';
    screenshot?: string;
    thumbnail?: string;
    description?: string;
    hasChildren?: boolean;
    childTreeName?: string;
    parentTree?: string;
  };
}

export interface NavigationEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  data?: {
    go?: string;
    comeback?: string;
    description?: string;
  };
}

export interface NavigationTreeData {
  nodes: NavigationNode[];
  edges: NavigationEdge[];
}

export interface NavigationTree {
  id?: string;
  name: string;
  description?: string;
  device_type?: string;
  tree_data: NavigationTreeData;
  team_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  count?: number;
}

// Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5009';
const API_ENDPOINTS = {
  trees: '/api/navigation/trees',
  treeById: (id: string) => `/api/navigation/trees/${id}`,
  treeByName: (name: string) => `/api/navigation/trees/by-name/${name}`,
  deviceTypes: '/api/navigation/trees/device-types',
};

// Helper function to handle API requests
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    console.log(`[@service:navigation] Making API request to: ${url}`);
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
    };

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log(`[@service:navigation] API response:`, data);
    
    return data;
  } catch (error) {
    console.error(`[@service:navigation] API request failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

// Navigation Tree Service
export const navigationService = {
  /**
   * Get all navigation trees for a team
   */
  async getAllTrees(teamId?: string): Promise<ApiResponse<NavigationTree[]>> {
    const params = teamId ? `?team_id=${teamId}` : '';
    return apiRequest<NavigationTree[]>(`${API_ENDPOINTS.trees}${params}`);
  },

  /**
   * Get a specific navigation tree by ID
   */
  async getTreeById(id: string, teamId?: string): Promise<ApiResponse<NavigationTree>> {
    const params = teamId ? `?team_id=${teamId}` : '';
    return apiRequest<NavigationTree>(`${API_ENDPOINTS.treeById(id)}${params}`);
  },

  /**
   * Get a navigation tree by name
   */
  async getTreeByName(name: string, teamId?: string): Promise<ApiResponse<NavigationTree>> {
    const params = teamId ? `?team_id=${teamId}` : '';
    return apiRequest<NavigationTree>(`${API_ENDPOINTS.treeByName(name)}${params}`);
  },

  /**
   * Create a new navigation tree
   */
  async createTree(treeData: Omit<NavigationTree, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<NavigationTree>> {
    return apiRequest<NavigationTree>(API_ENDPOINTS.trees, {
      method: 'POST',
      body: JSON.stringify(treeData),
    });
  },

  /**
   * Update an existing navigation tree
   */
  async updateTree(id: string, treeData: Partial<NavigationTree>): Promise<ApiResponse<NavigationTree>> {
    return apiRequest<NavigationTree>(API_ENDPOINTS.treeById(id), {
      method: 'PUT',
      body: JSON.stringify(treeData),
    });
  },

  /**
   * Delete a navigation tree
   */
  async deleteTree(id: string, teamId?: string): Promise<ApiResponse<void>> {
    const params = teamId ? `?team_id=${teamId}` : '';
    return apiRequest<void>(`${API_ENDPOINTS.treeById(id)}${params}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get available device types
   */
  async getDeviceTypes(): Promise<ApiResponse<string[]>> {
    return apiRequest<string[]>(API_ENDPOINTS.deviceTypes);
  },

  /**
   * Save navigation tree data (create or update based on existence)
   */
  async saveTree(
    treeName: string,
    nodes: NavigationNode[],
    edges: NavigationEdge[],
    options: {
      description?: string;
      deviceType?: string;
      teamId?: string;
    } = {}
  ): Promise<ApiResponse<NavigationTree>> {
    try {
      console.log(`[@service:navigation] Saving tree: ${treeName}`);
      
      // Prepare tree data
      const treeData: NavigationTreeData = { nodes, edges };
      
      // Check if tree already exists
      const existingTreeResponse = await this.getTreeByName(treeName, options.teamId);
      
      if (existingTreeResponse.success && existingTreeResponse.data) {
        // Update existing tree
        console.log(`[@service:navigation] Updating existing tree: ${treeName}`);
        return this.updateTree(existingTreeResponse.data.id!, {
          name: treeName,
          description: options.description,
          device_type: options.deviceType || 'generic',
          tree_data: treeData,
          team_id: options.teamId,
        });
      } else {
        // Create new tree
        console.log(`[@service:navigation] Creating new tree: ${treeName}`);
        return this.createTree({
          name: treeName,
          description: options.description || '',
          device_type: options.deviceType || 'generic',
          tree_data: treeData,
          team_id: options.teamId,
        });
      }
    } catch (error) {
      console.error(`[@service:navigation] Error saving tree:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save navigation tree',
      };
    }
  },

  /**
   * Load navigation tree data by name
   */
  async loadTree(treeName: string, teamId?: string): Promise<ApiResponse<NavigationTreeData>> {
    try {
      console.log(`[@service:navigation] Loading tree: ${treeName}`);
      
      const response = await this.getTreeByName(treeName, teamId);
      
      if (response.success && response.data) {
        return {
          success: true,
          data: response.data.tree_data,
        };
      } else {
        return {
          success: false,
          error: response.error || 'Navigation tree not found',
        };
      }
    } catch (error) {
      console.error(`[@service:navigation] Error loading tree:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load navigation tree',
      };
    }
  },

  /**
   * Validate navigation tree data structure
   */
  validateTreeData(treeData: NavigationTreeData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check if nodes array exists
    if (!Array.isArray(treeData.nodes)) {
      errors.push('Nodes must be an array');
    }

    // Check if edges array exists
    if (!Array.isArray(treeData.edges)) {
      errors.push('Edges must be an array');
    }

    // Validate nodes
    if (Array.isArray(treeData.nodes)) {
      treeData.nodes.forEach((node, index) => {
        if (!node.id) {
          errors.push(`Node at index ${index} is missing an ID`);
        }
        if (!node.data || !node.data.label) {
          errors.push(`Node at index ${index} is missing a label`);
        }
        if (!node.position || typeof node.position.x !== 'number' || typeof node.position.y !== 'number') {
          errors.push(`Node at index ${index} has invalid position`);
        }
      });
    }

    // Validate edges
    if (Array.isArray(treeData.edges)) {
      treeData.edges.forEach((edge, index) => {
        if (!edge.id) {
          errors.push(`Edge at index ${index} is missing an ID`);
        }
        if (!edge.source) {
          errors.push(`Edge at index ${index} is missing a source`);
        }
        if (!edge.target) {
          errors.push(`Edge at index ${index} is missing a target`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },

  /**
   * Export navigation tree data as JSON
   */
  exportTreeData(treeData: NavigationTreeData, treeName: string): void {
    try {
      const dataStr = JSON.stringify(treeData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `${treeName}_navigation_tree.json`;
      link.click();
      
      console.log(`[@service:navigation] Exported tree data: ${treeName}`);
    } catch (error) {
      console.error(`[@service:navigation] Error exporting tree data:`, error);
      throw new Error('Failed to export navigation tree data');
    }
  },

  /**
   * Import navigation tree data from JSON file
   */
  async importTreeData(file: File): Promise<{ success: boolean; data?: NavigationTreeData; error?: string }> {
    try {
      const text = await file.text();
      const data = JSON.parse(text) as NavigationTreeData;
      
      const validation = this.validateTreeData(data);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Invalid tree data: ${validation.errors.join(', ')}`,
        };
      }
      
      console.log(`[@service:navigation] Imported tree data from file: ${file.name}`);
      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error(`[@service:navigation] Error importing tree data:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to import navigation tree data',
      };
    }
  },
};

export default navigationService; 