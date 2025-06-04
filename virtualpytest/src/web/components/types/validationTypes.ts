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
    validNodes: number;
    errorNodes: number;
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
}

export interface ValidationState {
  isValidating: boolean;
  showPreview: boolean;
  showResults: boolean;
  showProgress: boolean;
  previewData: ValidationPreview | null;
  results: ValidationResults | null;
  progress: ValidationProgress | null;
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

export interface ValidationProgress {
  currentStep: number;
  totalSteps: number;
  currentNode: string;
  currentNodeName: string;
  status: 'running' | 'completed' | 'error';
  completedNodes: Array<{
    nodeId: string;
    nodeName: string;
    isValid: boolean;
    errors: string[];
  }>;
} 