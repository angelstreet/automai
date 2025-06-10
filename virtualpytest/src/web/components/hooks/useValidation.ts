import { useCallback } from 'react';
import { useValidationStore } from '../store/validationStore';
import { validationService } from '../../services/validationService';
import { ValidationEvents } from '../validation/ValidationEventListener';
import { ValidationProgress } from '../types/validationTypes';

export function useValidation(treeId: string) {
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

  const openPreview = useCallback(async () => {
    console.log(`[@hook:useValidation] Opening preview for tree: ${treeId}`);
    
    try {
      const preview = await validationService.getPreview(treeId);
      setPreviewData(preview);
      setShowPreview(true);
      
      console.log(`[@hook:useValidation] Preview opened successfully`);
    } catch (error) {
      console.error('[@hook:useValidation] Failed to get preview:', error);
      // Could add toast notification here
    }
  }, [treeId, setPreviewData, setShowPreview]);

  const runValidation = useCallback(async (skippedEdges?: Array<{ from: string; to: string }>) => {
    console.log(`[@hook:useValidation] Starting validation for tree: ${treeId}`, skippedEdges ? `with ${skippedEdges.length} skipped edges` : '');
    
    // Reset all validation colors to grey (untested) before starting validation
    console.log(`[@hook:useValidation] Resetting all validation colors to grey (untested) before starting validation`);
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
      completedNodes: []
    });
    
    try {
      // Set up progress callback for real-time updates
      validationService.setProgressCallback((progressData: ValidationProgress) => {
        console.log(`[@hook:useValidation] Real-time progress update:`, progressData);
        setProgress(progressData);
      });
      
      // Run actual validation with real-time progress updates and optional skipped edges
      const results = await validationService.runValidation(treeId, skippedEdges);
      setResults(results);
      
      // Hide progress and show results
      setShowProgress(false);
      setShowResults(true);
      
      // Dispatch completion event
      window.dispatchEvent(new Event(ValidationEvents.VALIDATION_COMPLETE));
      
      console.log(`[@hook:useValidation] Validation completed successfully`);
    } catch (error) {
      console.error('[@hook:useValidation] Validation failed:', error);
      setShowProgress(false);
      // Could add toast notification here
    } finally {
      // Clear progress callback
      validationService.setProgressCallback(null);
      setValidating(false);
    }
  }, [treeId, setValidating, setShowPreview, setShowProgress, setProgress, setResults, setShowResults, previewData, resetValidationColors]);

  const exportReport = useCallback(async (format: 'json' | 'csv' = 'json') => {
    console.log(`[@hook:useValidation] Exporting report for tree: ${treeId}, format: ${format}`);
    
    try {
      const blob = await validationService.exportReport(treeId, format);
      const filename = `validation-${treeId}.${format}`;
      validationService.downloadBlob(blob, filename);
      
      console.log(`[@hook:useValidation] Report exported successfully`);
    } catch (error) {
      console.error('[@hook:useValidation] Export failed:', error);
      // Could add toast notification here
    }
  }, [treeId]);

  const closePreview = useCallback(() => {
    console.log(`[@hook:useValidation] Closing preview`);
    setShowPreview(false);
  }, [setShowPreview]);

  const closeResults = useCallback(() => {
    console.log(`[@hook:useValidation] Closing results`);
    setShowResults(false);
  }, [setShowResults]);

  const viewLastResult = useCallback(() => {
    console.log(`[@hook:useValidation] Viewing last result`);
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