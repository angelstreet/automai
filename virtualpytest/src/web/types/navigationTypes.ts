import { Node, Edge } from 'reactflow';

// Define types locally since we're not using the service
export interface UINavigationNode extends Node {
  data: {
    label: string;
    type: 'screen' | 'dialog' | 'popup' | 'overlay' | 'menu' | 'entry';
    screenshot?: string;
    description?: string;
    is_root?: boolean; // True only for the first entry node
    tree_id?: string; // For menu nodes, references the associated tree
    tree_name?: string; // For menu nodes, the name of the associated tree
    
    // NEW: Simple parent chain approach
    parent?: string[];    // ["home", "tvguide"] - array of parent node IDs
    depth?: number;       // parent?.length || 0
    
    is_loaded?: boolean; // Whether this node's children have been loaded
    has_children?: boolean; // Whether this node has child nodes
    child_count?: number; // Number of direct children
    menu_type?: 'main' | 'submenu' | 'leaf'; // Type of menu node
  };
}

// Updated action interface for multiple actions with wait times
export interface EdgeAction {
  id: string;
  label: string;
  command: string;
  params: any;
  requiresInput?: boolean;
  inputValue?: string;
  waitTime: number;
}

// Use ReactFlow's Edge type directly with our custom data
export type UINavigationEdge = Edge<{
  actions?: EdgeAction[]; // New: array of actions
  finalWaitTime?: number; // New: wait time after all actions
  description?: string;
  from?: string;        // Source node label
  to?: string;          // Target node label
  edgeType?: 'horizontal' | 'vertical';  // For edge coloring: horizontal=siblings, vertical=parent-child
  
  // Keep old action for compatibility during transition
  action?: string | {
    id: string;
    label: string;
    command: string;
    params: any;
    description?: string;
    requiresInput?: boolean;
    inputValue?: string;
  };
}>;

export interface NavigationTreeData {
  nodes: UINavigationNode[];
  edges: UINavigationEdge[];
  
  // New properties for progressive loading
  loaded_depth?: number; // Current maximum loaded depth
  max_depth?: number; // Maximum depth in the entire tree
  root_node_id?: string; // ID of the root node
  metadata?: {
    tv_interface_type?: 'android_tv' | 'fire_tv' | 'apple_tv' | 'generic';
    remote_type?: string;
    progressive_loading?: boolean;
  };
}

export interface NodeForm {
  label: string;
  type: 'screen' | 'dialog' | 'popup' | 'overlay' | 'menu' | 'entry';
  description: string;
  screenshot?: string;  // Add screenshot field to preserve during editing
  
  // New form fields for TV menus
  depth?: number;
  parent?: string[];
  menu_type?: 'main' | 'submenu' | 'leaf';
}

// Updated EdgeForm interface for multiple actions
export interface EdgeForm {
  actions: EdgeAction[];
  finalWaitTime: number;
  description: string;
}

// New interfaces for progressive loading
export interface LoadRequest {
  tree_id: string;
  node_id: string;
  depth: number;
  load_children: boolean;
}

export interface LoadResponse {
  success: boolean;
  nodes: UINavigationNode[];
  edges: UINavigationEdge[];
  has_more: boolean;
  max_depth_reached: boolean;
} 