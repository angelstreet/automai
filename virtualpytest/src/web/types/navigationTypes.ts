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
  };
}

// Use ReactFlow's Edge type directly with our custom data
export type UINavigationEdge = Edge<{
  go?: string;
  comeback?: string;
  description?: string;
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
  go: string;
  comeback: string;
  description: string;
} 