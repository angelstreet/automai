import { useCallback } from 'react';
import { useValidationStore } from '../store/validationStore';
import { validationService } from '../services/validationService';
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
    progress,
    setShowPreview,
    setShowResults,
    setShowProgress,
    setPreviewData,
    setResults,
    setProgress,
    setValidating,
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

  const simulateProgress = useCallback(async (reachableEdges: Array<{from: string, to: string, fromName: string, toName: string}>) => {
    console.log(`[@hook:useValidation] Starting progress simulation for ${reachableEdges.length} edges`);
    
    // Initialize progress
    const initialProgress: ValidationProgress = {
      currentStep: 0,
      totalSteps: reachableEdges.length,
      currentNode: '',
      currentNodeName: 'Initializing...',
      currentEdgeFrom: '',
      currentEdgeTo: '',
      retryAttempt: 0,
      status: 'running',
      completedNodes: []
    };
    
    setProgress(initialProgress);
    setShowProgress(true);

    // Simulate testing each edge with realistic timing but without fake results
    for (let i = 0; i < reachableEdges.length; i++) {
      const currentEdge = reachableEdges[i];
      
      // Update current step
      const stepProgress: ValidationProgress = {
        currentStep: i + 1,
        totalSteps: reachableEdges.length,
        currentNode: currentEdge.to,
        currentNodeName: `Testing ${currentEdge.fromName} → ${currentEdge.toName}...`,
        currentEdgeFrom: currentEdge.fromName,
        currentEdgeTo: currentEdge.toName,
        retryAttempt: 0,
        status: 'running',
        completedNodes: [] // Don't show fake results, wait for real validation
      };
      
      setProgress(stepProgress);
      
      // Simulate processing time (1-3 seconds per edge)
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    }
    
    // Mark as completed
    const finalProgress: ValidationProgress = {
      currentStep: reachableEdges.length,
      totalSteps: reachableEdges.length,
      currentNode: '',
      currentNodeName: 'Finishing validation...',
      currentEdgeFrom: '',
      currentEdgeTo: '',
      retryAttempt: 0,
      status: 'completed',
      completedNodes: [] // Real results will come from backend
    };
    setProgress(finalProgress);
    
    console.log(`[@hook:useValidation] Progress simulation completed`);
  }, [setProgress, setShowProgress]);

  const runValidation = useCallback(async () => {
    console.log(`[@hook:useValidation] Starting validation for tree: ${treeId}`);
    
    setValidating(true);
    setShowPreview(false);
    
    try {
      // Start progress simulation if we have preview data with edges
      if (previewData?.reachableEdges) {
        await simulateProgress(previewData.reachableEdges);
      }
      
      // Run actual validation
      const results = await validationService.runValidation(treeId);
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
      setValidating(false);
    }
  }, [treeId, previewData, simulateProgress, setValidating, setShowPreview, setShowProgress, setResults, setShowResults]);

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

  return {
    // State
    isValidating,
    showPreview,
    showResults,
    showProgress,
    previewData,
    results,
    progress,
    
    // Actions
    openPreview,
    runValidation,
    exportReport,
    closePreview,
    closeResults,
  };
} 