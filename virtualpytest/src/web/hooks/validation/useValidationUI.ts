/**
 * Validation UI Hook
 *
 * This hook provides UI state management for validation operations,
 * built on top of the base useValidation hook.
 */

import { useCallback } from 'react';

import { useValidationStore } from '../../components/store/validationStore';
import { ValidationEvents } from '../../components/validation/ValidationEventListener';
import { ValidationProgress } from '../../types/features/Validation_Types';

import { useValidation } from './useValidation';

export function useValidationUI(treeId: string, selectedHost?: any, selectedDeviceId?: string) {
  const {
    isValidating,
    showPreview,
    showResults,
    showProgress,
    previewData,
    results,
    lastResult,
    progress,
    setShowPreview,
    setShowResults,
    setShowProgress,
    setPreviewData,
    setResults,
    setProgress,
    setValidating,
    showLastResult,
    resetValidationColors,
  } = useValidationStore();

  const {
    getPreview,
    runValidation: baseRunValidation,
    exportReport: baseExportReport,
    updateProgressCallback,
  } = useValidation();

  const openPreview = useCallback(async () => {
    console.log(`[@hook:useValidationUI] Opening preview for tree: ${treeId}`);

    try {
      const preview = await getPreview(treeId);
      setPreviewData(preview);
      setShowPreview(true);

      console.log(`[@hook:useValidationUI] Preview opened successfully`);
    } catch (error) {
      console.error('[@hook:useValidationUI] Failed to get preview:', error);
      // Could add toast notification here
    }
  }, [treeId, getPreview, setPreviewData, setShowPreview]);

  const runValidation = useCallback(
    async (skippedEdges?: Array<{ from: string; to: string }>) => {
      console.log(
        `[@hook:useValidationUI] Starting validation for tree: ${treeId}`,
        skippedEdges ? `with ${skippedEdges.length} skipped edges` : '',
      );

      // Reset all validation colors to grey (untested) before starting validation
      console.log(
        `[@hook:useValidationUI] Resetting all validation colors to grey (untested) before starting validation`,
      );
      resetValidationColors();

      setValidating(true);
      setShowPreview(false);

      // Show progress immediately when validation starts
      setShowProgress(true);
      setProgress({
        currentStep: 1,
        totalSteps: previewData?.totalEdges || 1,
        currentNode: '',
        currentNodeName: 'Starting validation...',
        currentEdgeFrom: 'ENTRY',
        currentEdgeTo: 'home',
        currentEdgeFromName: 'ENTRY',
        currentEdgeToName: 'home',
        currentEdgeStatus: 'testing',
        retryAttempt: 0,
        status: 'running',
        completedNodes: [],
      });

      try {
        // Set up progress callback for real-time updates
        updateProgressCallback((progressData: ValidationProgress) => {
          console.log(`[@hook:useValidationUI] Real-time progress update:`, progressData);
          setProgress(progressData);
        });

        // Run actual validation with real-time progress updates and optional skipped edges
        const results = await baseRunValidation(
          treeId,
          skippedEdges,
          selectedHost,
          selectedDeviceId,
        );
        setResults(results);

        // Hide progress and show results
        setShowProgress(false);
        setShowResults(true);

        // Dispatch completion event
        window.dispatchEvent(new Event(ValidationEvents.VALIDATION_COMPLETE));

        console.log(`[@hook:useValidationUI] Validation completed successfully`);
      } catch (error) {
        console.error('[@hook:useValidationUI] Validation failed:', error);
        setShowProgress(false);
        // Could add toast notification here
      } finally {
        // Clear progress callback
        updateProgressCallback(null);
        setValidating(false);
      }
    },
    [
      treeId,
      baseRunValidation,
      updateProgressCallback,
      setValidating,
      setShowPreview,
      setShowProgress,
      setProgress,
      setResults,
      setShowResults,
      previewData,
      resetValidationColors,
      selectedHost,
      selectedDeviceId,
    ],
  );

  const exportReport = useCallback(
    async (format: 'json' | 'csv' = 'json') => {
      console.log(
        `[@hook:useValidationUI] Exporting report for tree: ${treeId}, format: ${format}`,
      );

      try {
        const blob = await baseExportReport(treeId, format);
        const filename = `validation-${treeId}.${format}`;

        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log(`[@hook:useValidationUI] Report exported successfully`);
      } catch (error) {
        console.error('[@hook:useValidationUI] Export failed:', error);
        // Could add toast notification here
      }
    },
    [treeId, baseExportReport],
  );

  const closePreview = useCallback(() => {
    console.log(`[@hook:useValidationUI] Closing preview`);
    setShowPreview(false);
  }, [setShowPreview]);

  const closeResults = useCallback(() => {
    console.log(`[@hook:useValidationUI] Closing results`);
    setShowResults(false);
  }, [setShowResults]);

  const viewLastResult = useCallback(() => {
    console.log(`[@hook:useValidationUI] Viewing last result`);
    showLastResult();
  }, [showLastResult]);

  return {
    // State
    isValidating,
    showPreview,
    showResults,
    showProgress,
    previewData,
    results,
    lastResult,
    progress,

    // Actions
    openPreview,
    runValidation,
    exportReport,
    closePreview,
    closeResults,
    viewLastResult,
  };
}
