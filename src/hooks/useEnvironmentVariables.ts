import { useState, useCallback } from 'react';

import {
  getTeamEnvironmentVariables,
  createEnvironmentVariable,
  updateEnvironmentVariable,
  deleteEnvironmentVariable,
} from '@/app/actions/environmentVariablesAction';
import {
  EnvironmentVariable,
  EnvironmentVariableCreateInput,
  EnvironmentVariableUpdateInput,
} from '@/types/context/environmentVariablesContextType';

/**
 * Hook for managing environment variables for a team
 */
export function useEnvironmentVariables() {
  const [variables, setVariables] = useState<EnvironmentVariable[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch all environment variables for a team
   */
  const fetchVariables = useCallback(async (teamId: string) => {
    try {
      setLoading(true);
      setError(null);

      const result = await getTeamEnvironmentVariables(teamId);

      if (!result.success) {
        setError(result.error || 'Failed to fetch environment variables');
        return;
      }

      setVariables(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Create a new environment variable
   */
  const createVariable = useCallback(
    async (
      teamId: string,
      input: EnvironmentVariableCreateInput,
    ): Promise<EnvironmentVariable | null> => {
      try {
        setLoading(true);
        setError(null);

        const result = await createEnvironmentVariable(teamId, input);

        if (!result.success) {
          setError(result.error || 'Failed to create environment variable');
          return null;
        }

        setVariables((prev) => [...prev, result.data as EnvironmentVariable]);
        return result.data as EnvironmentVariable;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Update an existing environment variable
   */
  const updateVariable = useCallback(
    async (
      variableId: string,
      input: EnvironmentVariableUpdateInput,
    ): Promise<EnvironmentVariable | null> => {
      try {
        setLoading(true);
        setError(null);

        const result = await updateEnvironmentVariable(variableId, input);

        if (!result.success) {
          setError(result.error || 'Failed to update environment variable');
          return null;
        }

        setVariables((prev) =>
          prev.map((variable) =>
            variable.id === variableId ? (result.data as EnvironmentVariable) : variable,
          ),
        );

        return result.data as EnvironmentVariable;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /**
   * Delete an environment variable
   */
  const deleteVariable = useCallback(async (variableId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const result = await deleteEnvironmentVariable(variableId);

      if (!result.success) {
        setError(result.error || 'Failed to delete environment variable');
        return false;
      }

      setVariables((prev) => prev.filter((variable) => variable.id !== variableId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    variables,
    loading,
    error,
    fetchVariables,
    createVariable,
    updateVariable,
    deleteVariable,
  };
}
