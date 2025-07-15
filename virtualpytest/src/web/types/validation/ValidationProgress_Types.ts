export interface ValidationProgress {
  currentStep: number;
  totalSteps: number;
  currentEdge: {
    from_name: string;
    to_name: string;
    from_node: string;
    to_node: string;
  } | null;
  completedEdges: Array<{
    from_name: string;
    to_name: string;
    success: boolean;
    execution_time: number;
  }>;
}

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
