/**
 * Validation Hook
 *
 * This hook provides state management for validation operations.
 */

import { useState, useCallback, useEffect } from 'react';

import {
  ValidationResults,
  ValidationResult,
  ValidationPreviewData,
} from '../../types/features/Validation_Types';
import { useHostManager } from '../useHostManager';

// Shared state store for validation
const validationStore: Record<
  string,
  {
    isValidating: boolean;
    results: ValidationResults | null;
    showResults: boolean;
    preview: ValidationPreviewData | null;
    isLoadingPreview: boolean;
    validationError: string | null;
    listeners: Set<() => void>;
  }
> = {};

const getValidationState = (treeId: string) => {
  if (!validationStore[treeId]) {
    validationStore[treeId] = {
      isValidating: false,
      results: null,
      showResults: false,
      preview: null,
      isLoadingPreview: false,
      validationError: null,
      listeners: new Set(),
    };
  }
  return validationStore[treeId];
};

const updateValidationState = (
  treeId: string,
  updates: Partial<(typeof validationStore)[string]>,
) => {
  const state = getValidationState(treeId);
  Object.assign(state, updates);
  // Notify all listeners
  state.listeners.forEach((listener) => listener());
};

export const useValidation = (treeId: string) => {
  const { selectedHost, selectedDeviceId } = useHostManager();
  const [, forceUpdate] = useState({});

  // Force re-render when state changes
  const rerender = useCallback(() => {
    forceUpdate({});
  }, []);

  // Subscribe to state changes
  useEffect(() => {
    const state = getValidationState(treeId);
    state.listeners.add(rerender);

    return () => {
      state.listeners.delete(rerender);
    };
  }, [treeId, rerender]);

  const state = getValidationState(treeId);

  /**
   * Load validation preview
   */
  const loadPreview = useCallback(async () => {
    if (!treeId) return;

    updateValidationState(treeId, { isLoadingPreview: true });
    try {
      const response = await fetch(`/server/validation/preview/${treeId}`);
      const data: ValidationPreviewData = await response.json();

      if (data.success) {
        updateValidationState(treeId, { preview: data });
      } else {
        console.error('Failed to load validation preview:', data.error);
        updateValidationState(treeId, {
          validationError: data.error || 'Failed to load validation preview',
        });
      }
    } catch (error) {
      console.error('Error loading validation preview:', error);
      updateValidationState(treeId, {
        validationError: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      updateValidationState(treeId, { isLoadingPreview: false });
    }
  }, [treeId]);

  /**
   * Run validation by calling the simplified validation endpoint
   */
  const runValidation = useCallback(
    async (skippedEdges: string[] = []) => {
      if (!treeId || !selectedHost || !state.preview) {
        updateValidationState(treeId, {
          validationError: 'Tree ID, host, and preview data are required',
        });
        return;
      }

      console.log('[@hook:useValidation] Setting isValidating to true');
      updateValidationState(treeId, {
        isValidating: true,
        validationError: null,
        results: null,
        showResults: false,
      });

      try {
        console.log(`[@hook:useValidation] Starting validation for tree ${treeId}`);

        // Filter out skipped edges to get edges to validate
        const edgesToValidate = state.preview.edges.filter(
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
        updateValidationState(treeId, {
          results: validationResults,
          showResults: true,
        });

        console.log(
          `[@hook:useValidation] Validation completed: ${result.summary.successful}/${result.summary.totalTested} successful`,
        );
      } catch (error) {
        console.error('[@hook:useValidation] Error running validation:', error);
        updateValidationState(treeId, {
          validationError: error instanceof Error ? error.message : 'Unknown error',
        });
      } finally {
        console.log('[@hook:useValidation] Setting isValidating to false');
        updateValidationState(treeId, { isValidating: false });
      }
    },
    [treeId, selectedHost, selectedDeviceId, state.preview],
  );

  /**
   * Clear validation state
   */
  const clearValidation = useCallback(() => {
    updateValidationState(treeId, {
      results: null,
      showResults: false,
      preview: null,
      validationError: null,
    });
  }, [treeId]);

  /**
   * Set show results
   */
  const setShowResults = useCallback(
    (show: boolean) => {
      updateValidationState(treeId, { showResults: show });
    },
    [treeId],
  );

  return {
    // State
    isValidating: state.isValidating,
    validationResults: state.results,
    validationError: state.validationError,
    preview: state.preview,
    isLoadingPreview: state.isLoadingPreview,
    showResults: state.showResults,

    // Actions
    loadPreview,
    runValidation,
    clearValidation,
    setShowResults,

    // Computed
    hasResults: !!state.results,
    canRunValidation: !state.isValidating && !!selectedHost && !!treeId,
  };
};
