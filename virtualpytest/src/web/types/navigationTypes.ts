import { Node, Edge } from 'reactflow';

// Define types locally since we're not using the service
export interface UINavigationNode extends Node {
  data: {
    label: string;
    type: 'screen' | 'dialog' | 'popup' | 'overlay' | 'menu';
    screenshot?: string;
    description?: string;
    is_root?: boolean; // True only for the first entry node
    tree_id?: string; // For menu nodes, references the associated tree
    tree_name?: string; // For menu nodes, the name of the associated tree
  };
}

// Use ReactFlow's Edge type directly with our custom data
export type UINavigationEdge = Edge<{
  action?: string;      // The navigation action (e.g., "RIGHT", "ENTER", "OK")
  go?: string;          // Forward navigation action
  comeback?: string;    // Return navigation action
  description?: string;
  from?: string;        // Source node label
  to?: string;          // Target node label
  edgeType?: 'top' | 'bottom' | 'default';  // For edge coloring based on handle type
}>;

export interface NavigationTreeData {
  nodes: UINavigationNode[];
  edges: UINavigationEdge[];
}

export interface NodeForm {
  label: string;
  type: 'screen' | 'dialog' | 'popup' | 'overlay' | 'menu';
  description: string;
}

export interface EdgeForm {
  action?: string;      // Single action per edge
  go?: string;          // Forward action
  comeback?: string;    // Return action  
  description: string;
} 