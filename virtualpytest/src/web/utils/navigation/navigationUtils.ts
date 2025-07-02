// Navigation utility functions for data manipulation and validation

/**
 * Calculate confidence score from last run results (0-1 scale)
 */
export function calculateConfidenceScore(results?: boolean[]): number {
  if (!results || results.length === 0) return 0.5; // Default confidence for new actions
  const successCount = results.filter((result) => result).length;
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
  return new Promise((resolve) => setTimeout(resolve, ms));
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
  return nodes.find((node) => node.id === nodeId) || null;
}

/**
 * Get all parent nodes for a given node
 */
export function getParentNodes(nodes: any[], edges: any[], nodeId: string): any[] {
  const parentEdges = edges.filter((edge) => edge.target === nodeId);
  return parentEdges.map((edge) => findNodeById(nodes, edge.source)).filter(Boolean);
}

/**
 * Get all child nodes for a given node
 */
export function getChildNodes(nodes: any[], edges: any[], nodeId: string): any[] {
  const childEdges = edges.filter((edge) => edge.source === nodeId);
  return childEdges.map((edge) => findNodeById(nodes, edge.target)).filter(Boolean);
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
    const connectedEdges = edges.filter((edge) => edge.source === currentNodeId);
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
  const rootNodes = nodes.filter((node) => node.data?.is_root);
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
function calculateDepthFromNode(
  edges: any[],
  fromNodeId: string,
  toNodeId: string,
  visited: Set<string>,
): number {
  if (fromNodeId === toNodeId) return 0;
  if (visited.has(fromNodeId)) return -1; // Cycle detected

  visited.add(fromNodeId);

  const childEdges = edges.filter((edge) => edge.source === fromNodeId);
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
    data: {
      ...edge.data,
      // Ensure final wait time is in data for persistence
      finalWaitTime:
        edge.finalWaitTime !== undefined ? edge.finalWaitTime : edge.data?.finalWaitTime,
    },
  };
}
