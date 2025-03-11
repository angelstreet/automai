export type ScriptLanguage = 'bash' | 'python' | 'javascript' | 'typescript';
export type ScriptStatus = 'active' | 'inactive' | 'draft';
export type ScriptRunStatus = 'success' | 'failed' | 'pending' | 'running';

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

export interface ScriptFilter {
  status?: ScriptStatus;
  language?: ScriptLanguage;
  tags?: string[];
}
