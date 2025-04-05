/**
 * Script types for deployment functionality
 */

/**
 * Script entity for deployment
 */
export interface Script {
  id: string;
  name: string;
  path: string;
  repository?: string;
  description?: string;
  type?: 'python' | 'shell';
  parameters?: ScriptParameter[];
}

/**
 * Script parameter definition
 */
export interface ScriptParameter {
  id: string;
  name: string;
  description?: string;
  type: 'string' | 'number' | 'boolean' | 'select';
  required: boolean;
  default?: string | number | boolean;
  options?: string[]; // For select type
}

/**
 * Script execution status
 */
export type ScriptRunStatus = 'pending' | 'running' | 'success' | 'failed';

/**
 * Script execution record
 */
export interface ScriptRun {
  id: string;
  scriptId: string;
  status: ScriptRunStatus;
  startedAt?: string;
  completedAt?: string;
  logs?: string[];
}
