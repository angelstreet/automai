/**
 * Pipeline step configuration
 */
export interface PipelineStep {
  name: string;
  type: 'script' | 'command';
  command?: string;
  script?: {
    path: string;
    type: 'shell' | 'python';
    parameters?: string[];
  };
  environment?: Record<string, string>;
}

/**
 * Pipeline stage configuration
 */
export interface PipelineStage {
  name: string;
  steps: PipelineStep[];
  condition?: string;
}

/**
 * Pipeline configuration
 */
export interface PipelineConfig {
  name: string;
  description?: string;
  repository: {
    url: string;
    branch: string;
  };
  stages: PipelineStage[];
  parameters?: Array<{
    name: string;
    type: 'string' | 'boolean' | 'choice';
    description?: string;
    defaultValue?: string;
    choices?: string[];
  }>;
  environment?: Record<string, string>;
}
