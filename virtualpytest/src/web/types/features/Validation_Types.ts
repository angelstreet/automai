export interface ValidationPreview {
  treeId: string;
  totalNodes: number;
  totalEdges: number;
  reachableNodes: string[];
  reachableEdges: Array<{
    from: string;
    to: string;
    fromName: string;
    toName: string;
  }>;
  estimatedTime: number;
}

export interface ValidationResults {
  treeId: string;
  summary: {
    totalNodes: number;
    totalEdges: number;
    validNodes: number;
    errorNodes: number;
    skippedEdges: number;
    overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
    executionTime: number;
  };
  nodeResults: Array<{
    nodeId: string;
    nodeName: string;
    isValid: boolean;
    pathLength: number;
    errors: string[];
  }>;
  edgeResults: Array<{
    from: string;
    to: string;
    fromName: string;
    toName: string;
    success: boolean;
    skipped: boolean;
    retryAttempts: number;
    errors: string[];
    // Detailed execution results
    actionsExecuted?: number;
    totalActions?: number;
    executionTime?: number;
    actionResults?: Array<{
      actionIndex: number;
      actionLabel: string;
      actionCommand: string;
      success: boolean;
      error?: string;
      inputValue?: string;
    }>;
    verificationResults?: Array<{
      verificationId: string;
      verificationLabel: string;
      verificationCommand: string;
      success: boolean;
      error?: string;
      resultType?: 'PASS' | 'FAIL' | 'ERROR';
      message?: string;
      inputValue?: string;
    }>;
  }>;
}

// API Response Types from server validation endpoints
export interface ValidationResult {
  success: boolean;
  error?: string;
  summary: {
    totalTested: number;
    successful: number;
    failed: number;
    skipped: number;
    overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
    healthPercentage: number;
  };
  results: Array<{
    from_node: string;
    to_node: string;
    from_name: string;
    to_name: string;
    success: boolean;
    skipped: boolean;
    step_number: number;
    total_steps: number;
    error_message?: string;
    execution_time: number;
    transitions_executed: number;
    total_transitions: number;
    actions_executed: number;
    total_actions: number;
    verification_results: Array<any>;
  }>;
}

export interface ValidationPreviewData {
  success: boolean;
  error?: string;
  tree_id: string;
  total_edges: number;
  edges: Array<{
    step_number: number;
    from_node: string;
    to_node: string;
    from_name: string;
    to_name: string;
    selected: boolean;
    actions: Array<any>;
    has_verifications: boolean;
  }>;
}

export interface ValidationApiResponse {
  success: boolean;
  error?: string;
  error_code?: string;
}

export interface ValidationPreviewResponse extends ValidationApiResponse {
  preview: ValidationPreview;
}

export interface ValidationRunResponse extends ValidationApiResponse {
  results: ValidationResults;
}

export interface ValidationExportResponse extends ValidationApiResponse {
  report: any;
  filename: string;
  content_type: string;
}
