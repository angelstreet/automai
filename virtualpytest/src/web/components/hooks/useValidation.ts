import { useCallback } from 'react';
import { useValidationStore } from '../store/validationStore';
import { validationService } from '../services/validationService';
import { ValidationEvents } from '../validation/ValidationEventListener';

export function useValidation(treeId: string) {
  const {
    isValidating,
    showPreview,
    showResults,
    previewData,
    results,
    setShowPreview,
    setShowResults,
    setPreviewData,
    setResults,
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

  const runValidation = useCallback(async () => {
    console.log(`[@hook:useValidation] Starting validation for tree: ${treeId}`);
    
    setValidating(true);
    setShowPreview(false);
    
    try {
      const results = await validationService.runValidation(treeId);
      setResults(results);
      setShowResults(true);
      
      // Dispatch completion event
      window.dispatchEvent(new Event(ValidationEvents.VALIDATION_COMPLETE));
      
      console.log(`[@hook:useValidation] Validation completed successfully`);
    } catch (error) {
      console.error('[@hook:useValidation] Validation failed:', error);
      // Could add toast notification here
    } finally {
      setValidating(false);
    }
  }, [treeId, setValidating, setShowPreview, setResults, setShowResults]);

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
    previewData,
    results,
    
    // Actions
    openPreview,
    runValidation,
    exportReport,
    closePreview,
    closeResults,
  };
} 