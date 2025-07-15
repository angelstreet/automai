/**
 * Validation UI Hook
 *
 * This hook provides UI state management for validation operations,
 * built on top of the base useValidation hook.
 */

import { useState, useCallback } from 'react';

import { useValidationStore } from '../../components/store/validationStore';
import { ValidationResults } from '../../types/features/Validation_Types';
import {
  ValidationProgress,
  ValidationResult,
  ValidationPreviewData,
} from '../../types/validation/ValidationProgress_Types';
import { useHostManager } from '../useHostManager';

export const useValidationUI = (treeId: string) => {
  const { selectedHost, selectedDeviceId } = useHostManager();
  const { isValidating, results, setValidating, setResults, setShowResults, reset } =
    useValidationStore();

  const [preview, setPreview] = useState<ValidationPreviewData | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationProgress, setValidationProgress] = useState<ValidationProgress | null>(null);

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
      setValidationProgress(null);
      reset();

      try {
        console.log(`[@hook:useValidationUI] Starting validation for tree ${treeId}`);
        console.log(
          `[@hook:useValidationUI] Host: ${selectedHost.host_name}, Device: ${selectedDeviceId}`,
        );
        console.log(`[@hook:useValidationUI] Skipped edges: ${skippedEdges.length}`);

        // First, get the validation preview to know what edges we'll be testing
        const previewResponse = await fetch(`/server/validation/preview/${treeId}`);
        const previewData: ValidationPreviewData = await previewResponse.json();

        if (!previewData.success) {
          throw new Error(previewData.error || 'Failed to get validation preview');
        }

        // Filter edges based on skipped edges
        const edgesToValidate = previewData.edges.filter(
          (edge) => !skippedEdges.includes(`${edge.from_node}-${edge.to_node}`),
        );

        // Initialize progress
        setValidationProgress({
          currentStep: 0,
          totalSteps: edgesToValidate.length,
          currentEdge: null,
          completedEdges: [],
        });

        // Execute validation for each edge individually to track progress
        const results = [];
        let successful_count = 0;
        let failed_count = 0;

        for (let i = 0; i < edgesToValidate.length; i++) {
          const edge = edgesToValidate[i];

          // Update progress - currently validating this edge
          setValidationProgress((prev) =>
            prev
              ? {
                  ...prev,
                  currentStep: i + 1,
                  currentEdge: {
                    from_name: edge.from_name,
                    to_name: edge.to_name,
                    from_node: edge.from_node,
                    to_node: edge.to_node,
                  },
                }
              : null,
          );

          console.log(
            `[@hook:useValidationUI] Step ${i + 1}/${edgesToValidate.length}: Validating ${edge.from_node} → ${edge.to_node}`,
          );

          try {
            // Execute single edge validation
            const response = await fetch(`/server/validation/run/${treeId}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                host: selectedHost,
                device_id: selectedDeviceId,
                skipped_edges: [
                  // Skip all edges except the current one
                  ...previewData.edges
                    .filter((e) => e.from_node !== edge.from_node || e.to_node !== edge.to_node)
                    .map((e) => `${e.from_node}-${e.to_node}`),
                ],
              }),
            });

            const result: ValidationResult = await response.json();

            if (result.success && result.results.length > 0) {
              const edgeResult = result.results[0]; // Should be only one result
              results.push(edgeResult);

              if (edgeResult.success) {
                successful_count++;
              } else {
                failed_count++;
              }

              // Update progress - edge completed
              setValidationProgress((prev) =>
                prev
                  ? {
                      ...prev,
                      completedEdges: [
                        ...prev.completedEdges,
                        {
                          from_name: edge.from_name,
                          to_name: edge.to_name,
                          success: edgeResult.success,
                          execution_time: edgeResult.execution_time,
                        },
                      ],
                    }
                  : null,
              );
            } else {
              // Edge failed
              failed_count++;
              results.push({
                from_node: edge.from_node,
                to_node: edge.to_node,
                from_name: edge.from_name,
                to_name: edge.to_name,
                success: false,
                skipped: false,
                step_number: i + 1,
                total_steps: edgesToValidate.length,
                error_message: result.error || 'Edge validation failed',
                execution_time: 0,
                transitions_executed: 0,
                total_transitions: 0,
                actions_executed: 0,
                total_actions: 0,
                verification_results: [],
              });

              // Update progress - edge failed
              setValidationProgress((prev) =>
                prev
                  ? {
                      ...prev,
                      completedEdges: [
                        ...prev.completedEdges,
                        {
                          from_name: edge.from_name,
                          to_name: edge.to_name,
                          success: false,
                          execution_time: 0,
                        },
                      ],
                    }
                  : null,
              );
            }
          } catch (error) {
            console.error(
              `[@hook:useValidationUI] Error validating edge ${edge.from_node} → ${edge.to_node}:`,
              error,
            );
            failed_count++;
            results.push({
              from_node: edge.from_node,
              to_node: edge.to_node,
              from_name: edge.from_name,
              to_name: edge.to_name,
              success: false,
              skipped: false,
              step_number: i + 1,
              total_steps: edgesToValidate.length,
              error_message: error instanceof Error ? error.message : 'Unknown error',
              execution_time: 0,
              transitions_executed: 0,
              total_transitions: 0,
              actions_executed: 0,
              total_actions: 0,
              verification_results: [],
            });

            // Update progress - edge failed
            setValidationProgress((prev) =>
              prev
                ? {
                    ...prev,
                    completedEdges: [
                      ...prev.completedEdges,
                      {
                        from_name: edge.from_name,
                        to_name: edge.to_name,
                        success: false,
                        execution_time: 0,
                      },
                    ],
                  }
                : null,
            );
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

        console.log(
          `[@hook:useValidationUI] Validation completed: ${successful_count}/${total_tested} successful (${health_percentage.toFixed(1)}%)`,
        );

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
          nodeResults: [], // Will be derived from edge results if needed
          edgeResults: results.map((result) => ({
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
        setValidationProgress(null); // Clear progress when done
      } catch (error) {
        console.error('[@hook:useValidationUI] Error running validation:', error);
        setValidationError(error instanceof Error ? error.message : 'Unknown error');
        setValidationProgress(null);
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
    setValidationProgress(null);
  }, [reset]);

  return {
    // State
    isValidating,
    validationResults: results,
    validationError,
    validationProgress,
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
