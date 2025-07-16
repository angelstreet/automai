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

      // Initialize progress tracking
      const initialSteps: ValidationStep[] = edgesToValidate.map((edge, index) => ({
        stepNumber: index + 1,
        totalSteps: edgesToValidate.length,
        fromNode: edge.from_node,
        toNode: edge.to_node,
        fromName: edge.from_name,
        toName: edge.to_name,
        status: 'pending' as const,
      }));

      updateValidationState(treeId, {
        isValidating: true,
        validationError: null,
        results: null,
        showResults: false,
        progress: {
          currentStep: 0,
          totalSteps: edgesToValidate.length,
          steps: initialSteps,
          isRunning: true,
        },
      });

      try {
        console.log(`[@hook:useValidation] Starting validation for tree ${treeId}`);

        // Execute validation step by step
        const results: any[] = [];
        let successful_count = 0;
        let failed_count = 0;
        let current_node_id = null;

        for (let i = 0; i < edgesToValidate.length; i++) {
          const edge = edgesToValidate[i];
          const to_node = edge.to_node;

          console.log(
            `[@hook:useValidation] Step ${i + 1}/${edgesToValidate.length}: Navigating to ${to_node}`,
          );

          // Update progress to show current step running
          updateValidationState(treeId, {
            progress: {
              currentStep: i + 1,
              totalSteps: edgesToValidate.length,
              steps: initialSteps.map((step, index) => ({
                ...step,
                status: index < i ? 'success' : index === i ? 'running' : 'pending',
              })),
              isRunning: true,
            },
          });

          try {
            // Call navigation execute endpoint for this step
            const response = await fetch(`/server/navigation/execute/${treeId}/${to_node}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                host: selectedHost,
                device_id: selectedDeviceId,
                current_node_id: current_node_id,
              }),
            });

            const result: any = await response.json();
            const success = result.success || false;
            const executionTime = result.execution_time || 0;

            if (success) {
              successful_count++;
              current_node_id = result.final_position_node_id || to_node;
            } else {
              failed_count++;
              if (result.final_position_node_id) {
                current_node_id = result.final_position_node_id;
              }
            }

            // Update step status
            const updatedSteps = [...initialSteps];
            updatedSteps[i] = {
              ...updatedSteps[i],
              status: success ? 'success' : 'failed',
              error: success ? undefined : result.error,
              executionTime,
            };

            // Update progress with completed step
            updateValidationState(treeId, {
              progress: {
                currentStep: i + 1,
                totalSteps: edgesToValidate.length,
                steps: updatedSteps,
                isRunning: i < edgesToValidate.length - 1,
              },
            });

            // Build result entry
            const result_entry = {
              from_node: edge.from_node,
              to_node: edge.to_node,
              from_name: edge.from_name,
              to_name: edge.to_name,
              success: success,
              skipped: false,
              step_number: i + 1,
              total_steps: edgesToValidate.length,
              error_message: success ? null : result.error,
              execution_time: executionTime,
              transitions_executed: result.transitions_executed || 0,
              total_transitions: result.total_transitions || 0,
              actions_executed: result.actions_executed || 0,
              total_actions: result.total_actions || 0,
              verification_results: result.verification_results || [],
            };

            results.push(result_entry);

            // Small delay to show progress
            await new Promise((resolve) => setTimeout(resolve, 100));
          } catch (stepError) {
            console.error(`[@hook:useValidation] Error in step ${i + 1}:`, stepError);
            failed_count++;

            // Update step status to failed
            const updatedSteps = [...initialSteps];
            updatedSteps[i] = {
              ...updatedSteps[i],
              status: 'failed',
              error: stepError instanceof Error ? stepError.message : 'Unknown error',
            };

            updateValidationState(treeId, {
              progress: {
                currentStep: i + 1,
                totalSteps: edgesToValidate.length,
                steps: updatedSteps,
                isRunning: i < edgesToValidate.length - 1,
              },
            });

            // Build failed result entry
            const result_entry = {
              from_node: edge.from_node,
              to_node: edge.to_node,
              from_name: edge.from_name,
              to_name: edge.to_name,
              success: false,
              skipped: false,
              step_number: i + 1,
              total_steps: edgesToValidate.length,
              error_message: stepError instanceof Error ? stepError.message : 'Unknown error',
              execution_time: 0,
              transitions_executed: 0,
              total_transitions: 0,
              actions_executed: 0,
              total_actions: 0,
              verification_results: [],
            };

            results.push(result_entry);
          }
        }

        // Calculate overall health
        const total_tested = successful_count + failed_count;
        const health_percentage = (successful_count / total_tested) * 100 || 0;

        let overall_health: 'excellent' | 'good' | 'fair' | 'poor';
        if (health_percentage >= 90) {
          overall_health = 'excellent';
        } else if (health_percentage >= 75) {
          overall_health = 'good';
        } else if (health_percentage >= 50) {
          overall_health = 'fair';
        } else {
          overall_health = 'poor';
        }

        // Convert to expected ValidationResults format
        const validationResults: ValidationResults = {
          treeId,
          summary: {
            totalNodes: total_tested,
            totalEdges: total_tested,
            validNodes: successful_count,
            errorNodes: failed_count,
            skippedEdges: skippedEdges.length,
            overallHealth: overall_health,
            executionTime: results.reduce((sum, r) => sum + r.execution_time, 0),
          },
          nodeResults: [],
          edgeResults: results.map((edgeResult) => ({
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
          progress: null, // Clear progress when showing results
        });

        console.log(
          `[@hook:useValidation] Validation completed: ${successful_count}/${total_tested} successful`,
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
