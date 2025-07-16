/**
 * Validation Hook
 *
 * This hook provides state management for validation operations.
 */

import { useState, useCallback } from 'react';

import {
  ValidationResults,
  ValidationResult,
  ValidationPreviewData,
} from '../../types/features/Validation_Types';
import { useHostManager } from '../useHostManager';

export const useValidation = (treeId: string) => {
  const { selectedHost, selectedDeviceId } = useHostManager();

  // Local state - no more store needed
  const [isValidating, setIsValidating] = useState(false);
  const [results, setResults] = useState<ValidationResults | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [preview, setPreview] = useState<ValidationPreviewData | null>(null);
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
      const data: ValidationPreviewData = await response.json();

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
   * Run validation by calling the simplified validation endpoint
   */
  const runValidation = useCallback(
    async (skippedEdges: string[] = []) => {
      if (!treeId || !selectedHost || !preview) {
        setValidationError('Tree ID, host, and preview data are required');
        return;
      }

      console.log('[@hook:useValidation] Setting isValidating to true');
      setIsValidating(true);
      setValidationError(null);
      setResults(null);
      setShowResults(false);

      try {
        console.log(`[@hook:useValidation] Starting validation for tree ${treeId}`);

        // Filter out skipped edges to get edges to validate
        const edgesToValidate = preview.edges.filter(
          (edge) => !skippedEdges.includes(`${edge.from_node}-${edge.to_node}`),
        );

        // Call simplified validation endpoint - it handles sequential execution
        const response = await fetch(`/server/validation/run/${treeId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            host: selectedHost,
            device_id: selectedDeviceId,
            edges_to_validate: edgesToValidate,
          }),
        });

        const result: ValidationResult = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'Validation failed');
        }

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
          nodeResults: [],
          edgeResults: result.results.map((edgeResult) => ({
            from: edgeResult.from_node,
            to: edgeResult.to_node,
            fromName: edgeResult.from_name,
            toName: edgeResult.to_name,
            success: edgeResult.success,
            skipped: edgeResult.skipped,
            retryAttempts: 0,
            errors: edgeResult.error_message ? [edgeResult.error_message] : [],
            actionsExecuted: edgeResult.actions_executed,
            totalActions: edgeResult.total_actions,
            executionTime: edgeResult.execution_time,
          })),
        };

        console.log('[@hook:useValidation] Setting results and showResults to true');
        setResults(validationResults);
        setShowResults(true);

        console.log(
          `[@hook:useValidation] Validation completed: ${result.summary.successful}/${result.summary.totalTested} successful`,
        );
      } catch (error) {
        console.error('[@hook:useValidation] Error running validation:', error);
        setValidationError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        console.log('[@hook:useValidation] Setting isValidating to false');
        setIsValidating(false);
      }
    },
    [treeId, selectedHost, selectedDeviceId, preview],
  );

  /**
   * Clear validation state
   */
  const clearValidation = useCallback(() => {
    setResults(null);
    setShowResults(false);
    setPreview(null);
    setValidationError(null);
  }, []);

  return {
    // State
    isValidating,
    validationResults: results,
    validationError,
    preview,
    isLoadingPreview,
    showResults,

    // Actions
    loadPreview,
    runValidation,
    clearValidation,
    setShowResults,

    // Computed
    hasResults: !!results,
    canRunValidation: !isValidating && !!selectedHost && !!treeId,
  };
};
