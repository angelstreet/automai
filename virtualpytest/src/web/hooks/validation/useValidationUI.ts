/**
 * Validation UI Hook
 *
 * This hook provides UI state management for validation operations,
 * built on top of the base useValidation hook.
 */

import { useState, useCallback } from 'react';
import { useValidationStore } from '../../components/store/validationStore';
import { useHostManager } from '../useHostManager';
import { ValidationPreview, ValidationResults } from '../../types/features/Validation_Types';

interface ValidationResult {
  success: boolean;
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

export const useValidationUI = (treeId: string) => {
  const { selectedHost, selectedDeviceId } = useHostManager();
  const {
    isValidating,
    results,
    setValidating,
    setResults,
    setShowPreview,
    setShowResults,
    reset,
  } = useValidationStore();

  const [preview, setPreview] = useState<ValidationPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  /**
   * Load validation preview
   */
  const loadPreview = useCallback(async () => {
    if (!treeId) return;

    setIsLoadingPreview(true);
    try {
      const response = await fetch(`/server/validation/preview/${treeId}`);
      const data = await response.json();

      if (data.success) {
        setPreview(data);
      } else {
        console.error('Failed to load validation preview:', data.error);
        setValidationError(data.error || 'Failed to load validation preview');
      }
    } catch (error) {
      console.error('Error loading validation preview:', error);
      setValidationError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsLoadingPreview(false);
    }
  }, [treeId]);

  /**
   * Run validation using NavigationExecutor for each edge
   */
  const runValidation = useCallback(
    async (skippedEdges: string[] = []) => {
      if (!treeId || !selectedHost) {
        setValidationError('Tree ID and host are required');
        return;
      }

      setValidating(true);
      setValidationError(null);
      reset();

      try {
        console.log(`[@hook:useValidationUI] Starting validation for tree ${treeId}`);
        console.log(
          `[@hook:useValidationUI] Host: ${selectedHost.host_name}, Device: ${selectedDeviceId}`,
        );
        console.log(`[@hook:useValidationUI] Skipped edges: ${skippedEdges.length}`);

        const response = await fetch(`/server/validation/run/${treeId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host: selectedHost,
            device_id: selectedDeviceId,
            skipped_edges: skippedEdges,
          }),
        });

        const result: ValidationResult = await response.json();

        if (result.success) {
          console.log(`[@hook:useValidationUI] Validation completed successfully`);
          console.log(
            `[@hook:useValidationUI] Results: ${result.summary.successful}/${result.summary.totalTested} successful`,
          );

          // Convert to expected ValidationResults format
          const validationResults: ValidationResults = {
            treeId,
            summary: {
              totalNodes: result.summary.totalTested,
              totalEdges: result.summary.totalTested,
              validNodes: result.summary.successful,
              errorNodes: result.summary.failed,
              skippedEdges: result.summary.skipped,
              overallHealth: result.summary.overallHealth,
              executionTime: result.results.reduce((sum, r) => sum + r.execution_time, 0),
            },
            nodeResults: [], // Will be derived from edge results if needed
            edgeResults: result.results.map((result) => ({
              from: result.from_node,
              to: result.to_node,
              fromName: result.from_name,
              toName: result.to_name,
              success: result.success,
              skipped: result.skipped,
              retryAttempts: 0,
              errors: result.error_message ? [result.error_message] : [],
              actionsExecuted: result.actions_executed,
              totalActions: result.total_actions,
              executionTime: result.execution_time,
            })),
          };

          setResults(validationResults);
          setShowResults(true);
        } else {
          console.error('[@hook:useValidationUI] Validation failed:', result);
          setValidationError('Validation failed');
        }
      } catch (error) {
        console.error('[@hook:useValidationUI] Error running validation:', error);
        setValidationError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setValidating(false);
      }
    },
    [treeId, selectedHost, selectedDeviceId, setValidating, setResults, setShowResults, reset],
  );

  /**
   * Clear validation state
   */
  const clearValidation = useCallback(() => {
    reset();
    setPreview(null);
    setValidationError(null);
  }, [reset]);

  return {
    // State
    isValidating,
    validationResults: results,
    validationError,
    preview,
    isLoadingPreview,

    // Actions
    loadPreview,
    runValidation,
    clearValidation,

    // Computed
    hasResults: !!results,
    canRunValidation: !isValidating && !!selectedHost && !!treeId,
  };
};
