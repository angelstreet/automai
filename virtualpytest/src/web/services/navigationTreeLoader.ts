/**
 * Navigation Tree Loader Service
 *
 * Centralizes the loading and resolution of navigation trees:
 * - Loads tree from database (with IDs only)
 * - Resolves all action_ids → action objects
 * - Resolves all verification_ids → verification objects
 * - Caches fully resolved tree for pathfinding and UI
 */

import { EdgeAction } from '../types/controller/Action_Types';
import { UINavigationNode, UINavigationEdge } from '../types/pages/Navigation_Types';
import { Verification } from '../types/verification/Verification_Types';

export interface TreeLoadResult {
  success: boolean;
  nodes: UINavigationNode[];
  edges: UINavigationEdge[];
  error?: string;
}

/**
 * Load and fully resolve navigation tree
 * This is the single point where IDs are resolved to objects
 */
export async function loadAndResolveTree(userInterfaceId: string): Promise<TreeLoadResult> {
  try {
    // Step 1: Load raw tree from database
    const response = await fetch(
      `/server/navigationTrees/getTreeByUserInterfaceId/${userInterfaceId}`,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success || !data.tree) {
      return {
        success: false,
        nodes: [],
        edges: [],
        error: 'Tree not found',
      };
    }

    const tree = data.tree;
    const treeData = tree.metadata || {};
    const rawNodes = treeData.nodes || [];
    const rawEdges = treeData.edges || [];

    // Step 2: Resolve all action IDs to action objects
    const resolvedEdges = await resolveEdgeActions(rawEdges);

    // Step 3: Resolve all verification IDs to verification objects
    const resolvedNodes = await resolveNodeVerifications(rawNodes);

    console.log(
      `[@service:navigationTreeLoader] Loaded and resolved tree with ${resolvedNodes.length} nodes and ${resolvedEdges.length} edges`,
    );

    return {
      success: true,
      nodes: resolvedNodes,
      edges: resolvedEdges,
    };
  } catch (error) {
    console.error('[@service:navigationTreeLoader] Error loading tree:', error);
    return {
      success: false,
      nodes: [],
      edges: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Resolve action_ids and retry_action_ids to full action objects for all edges
 */
async function resolveEdgeActions(rawEdges: any[]): Promise<UINavigationEdge[]> {
  const resolvedEdges: UINavigationEdge[] = [];

  for (const edge of rawEdges) {
    const edgeData = edge.data || {};

    // Resolve main actions
    const actions: EdgeAction[] = [];
    if (edgeData.action_ids && edgeData.action_ids.length > 0) {
      for (const actionId of edgeData.action_ids) {
        const action = await fetchActionById(actionId);
        if (action) {
          actions.push(action);
        }
      }
    }

    // Resolve retry actions
    const retryActions: EdgeAction[] = [];
    if (edgeData.retry_action_ids && edgeData.retry_action_ids.length > 0) {
      for (const actionId of edgeData.retry_action_ids) {
        const action = await fetchActionById(actionId);
        if (action) {
          retryActions.push(action);
        }
      }
    }

    // Create resolved edge with both IDs (for persistence) and objects (for UI)
    const resolvedEdge: UINavigationEdge = {
      ...edge,
      data: {
        ...edgeData,
        // Resolved objects for UI
        actions,
        retryActions,
        // Keep IDs for persistence
        action_ids: edgeData.action_ids || [],
        retry_action_ids: edgeData.retry_action_ids || [],
        finalWaitTime:
          edge.finalWaitTime !== undefined ? edge.finalWaitTime : edgeData.finalWaitTime,
      },
    };

    resolvedEdges.push(resolvedEdge);
  }

  return resolvedEdges;
}

/**
 * Resolve verification_ids to full verification objects for all nodes
 */
async function resolveNodeVerifications(rawNodes: any[]): Promise<UINavigationNode[]> {
  const resolvedNodes: UINavigationNode[] = [];

  for (const node of rawNodes) {
    const nodeData = node.data || {};

    // Resolve verifications
    const verifications: Verification[] = [];
    if (nodeData.verification_ids && nodeData.verification_ids.length > 0) {
      for (const verificationId of nodeData.verification_ids) {
        const verification = await fetchVerificationById(verificationId);
        if (verification) {
          verifications.push(verification);
        }
      }
    }

    // Create resolved node with both IDs (for persistence) and objects (for UI)
    const resolvedNode: UINavigationNode = {
      ...node,
      data: {
        ...nodeData,
        // Resolved objects for UI
        verifications,
        // Keep IDs for persistence
        verification_ids: nodeData.verification_ids || [],
      },
    };

    resolvedNodes.push(resolvedNode);
  }

  return resolvedNodes;
}

/**
 * Fetch action object by ID
 */
async function fetchActionById(actionId: string): Promise<EdgeAction | null> {
  try {
    const response = await fetch(`/server/actions/getAction/${actionId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`[@service:navigationTreeLoader] Action not found: ${actionId}`);
      return null;
    }

    const data = await response.json();
    if (data.success && data.action) {
      return data.action as EdgeAction;
    }

    return null;
  } catch (error) {
    console.error(`[@service:navigationTreeLoader] Error fetching action ${actionId}:`, error);
    return null;
  }
}

/**
 * Fetch verification object by ID
 */
async function fetchVerificationById(verificationId: string): Promise<Verification | null> {
  try {
    const response = await fetch(`/server/verification/getVerification/${verificationId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.warn(`[@service:navigationTreeLoader] Verification not found: ${verificationId}`);
      return null;
    }

    const data = await response.json();
    if (data.success && data.verification) {
      return data.verification as Verification;
    }

    return null;
  } catch (error) {
    console.error(
      `[@service:navigationTreeLoader] Error fetching verification ${verificationId}:`,
      error,
    );
    return null;
  }
}
