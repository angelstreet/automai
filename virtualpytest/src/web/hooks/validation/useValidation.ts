/**
 * Validation Hook
 *
 * This hook provides state management for validation operations.
 */

import { useState, useCallback, useEffect } from 'react';

import { ValidationResults, ValidationPreviewData } from '../../types/features/Validation_Types';
import { useHostManager } from '../useHostManager';

// Progress tracking types
interface ValidationStep {
  stepNumber: number;
  totalSteps: number;
  fromNode: string;
  toNode: string;
  fromName: string;
  toName: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  error?: string;
  executionTime?: number;
}

interface ValidationProgress {
  currentStep: number;
  totalSteps: number;
  steps: ValidationStep[];
  isRunning: boolean;
}

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
    progress: ValidationProgress | null;
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
      progress: null,
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
   * Run validation with step-by-step progress tracking
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

      // Filter out skipped edges to get edges to validate
      const edgesToValidate = state.preview.edges.filter(
        (edge) => !skippedEdges.includes(`${edge.from_node}-${edge.to_node}`),
      );

      // For synchronous validation, don't show step-by-step progress
      // Just show a simple "running" state
      updateValidationState(treeId, {
        isValidating: true,
        validationError: null,
        results: null,
        showResults: false,
        progress: {
          currentStep: 0,
          totalSteps: edgesToValidate.length,
          steps: [],
          isRunning: true,
        },
      });

      try {
        console.log(`[@hook:useValidation] Starting validation for tree ${treeId}`);

        // Call validation run endpoint (which generates report)
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

        const apiResult: any = await response.json();

        if (!apiResult.success) {
          throw new Error(apiResult.error || 'Validation failed');
        }

        const { summary, results, report_url } = apiResult;

        // Convert API response to ValidationResults format
        const validationResults: ValidationResults = {
          treeId,
          summary: {
            totalNodes: summary.totalTested,
            totalEdges: summary.totalTested,
            validNodes: summary.successful,
            errorNodes: summary.failed,
            skippedEdges: summary.skipped,
            overallHealth: summary.overallHealth,
            executionTime: results.reduce((sum: number, r: any) => sum + r.execution_time, 0),
          },
          nodeResults: [],
          edgeResults: results.map((result: any) => ({
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
          reportUrl: report_url, // Include report URL from API response
        };

        console.log('[@hook:useValidation] Setting results and showResults to true');
        updateValidationState(treeId, {
          results: validationResults,
          showResults: true,
          progress: null, // Clear progress when showing results
        });

        console.log(
          `[@hook:useValidation] Validation completed: ${summary.successful}/${summary.totalTested} successful`,
        );
      } catch (error) {
        console.error('[@hook:useValidation] Error running validation:', error);
        updateValidationState(treeId, {
          validationError: error instanceof Error ? error.message : 'Unknown error',
          progress: null,
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
      progress: null,
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
    progress: state.progress,

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
