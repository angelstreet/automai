/**
 * Core Script type definitions
 */

/**
 * Supported script languages
 */
export type ScriptLanguage = 'bash' | 'python' | 'javascript' | 'typescript';

/**
 * Script activation status
 */
export type ScriptStatus = 'active' | 'inactive' | 'draft';

/**
 * Script execution status
 */
export type ScriptRunStatus = 'success' | 'failed' | 'pending' | 'running';

/**
 * Script entity
 */
export interface Script {
  id: string;
  name: string;
  description?: string;
  content: string;
  language: ScriptLanguage;
  status: ScriptStatus;
  tenant_id: string;
  created_at: string;
  updated_at: string;
  last_run_at?: string;
  last_run_status?: ScriptRunStatus;
  last_run_output?: string;
  tags?: string[];
}

/**
 * Script execution record
 */
export interface ScriptRun {
  id: string;
  script_id: string;
  host_id?: string;
  status: ScriptRunStatus;
  output: string;
  error?: string;
  started_at: string;
  completed_at?: string;
  duration_ms?: number;
}

/**
 * Script filtering options
 */
export interface ScriptFilter {
  status?: ScriptStatus;
  language?: ScriptLanguage;
  tags?: string[];
}