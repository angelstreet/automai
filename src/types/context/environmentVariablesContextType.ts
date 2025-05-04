/**
 * Environment Variables Context Type Definitions
 */

/**
 * Environment Variable entity
 */
export interface EnvironmentVariable {
  id: string;
  key: string;
  value: string;
  description?: string | null;
  team_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  isShared: boolean;
}

/**
 * Environment Variable create input
 */
export interface EnvironmentVariableCreateInput {
  key: string;
  value: string;
  description?: string;
}

/**
 * Environment Variable update input
 */
export interface EnvironmentVariableUpdateInput {
  key?: string;
  value?: string;
  description?: string | null;
}

/**
 * Environment Variables Context
 */
export interface EnvironmentVariablesContextValue {
  variables: EnvironmentVariable[];
  loading: boolean;
  error: string | null;
  fetchVariables: (teamId: string) => Promise<void>;
  createVariable: (
    teamId: string,
    input: EnvironmentVariableCreateInput,
  ) => Promise<EnvironmentVariable | null>;
  updateVariable: (
    variableId: string,
    input: EnvironmentVariableUpdateInput,
  ) => Promise<EnvironmentVariable | null>;
  deleteVariable: (variableId: string) => Promise<boolean>;
}
