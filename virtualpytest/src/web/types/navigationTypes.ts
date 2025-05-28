import { Node, Edge } from 'reactflow';

// Define types locally since we're not using the service
export interface UINavigationNode extends Node {
  data: {
    label: string;
    type: 'screen' | 'dialog' | 'popup' | 'overlay';
    screenshot?: string;
    thumbnail?: string;
    description?: string;
    hasChildren?: boolean;
    childTreeId?: string;
    childTreeName?: string;
    parentTree?: string;
    parentNodeId?: string;  // For hierarchy support
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
}>;

export interface NavigationTreeData {
  nodes: UINavigationNode[];
  edges: UINavigationEdge[];
}

export interface NodeForm {
  label: string;
  type: 'screen' | 'dialog' | 'popup' | 'overlay';
  description: string;
}

export interface EdgeForm {
  action?: string;      // Single action per edge
  go?: string;          // Forward action
  comeback?: string;    // Return action  
  description: string;
} 