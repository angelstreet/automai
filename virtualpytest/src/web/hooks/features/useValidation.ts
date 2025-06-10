/**
 * Validation Hook
 * 
 * This hook handles validation operations with progress tracking and API calls.
 */

import { useState, useCallback, useRef, useMemo } from 'react';
import { useRegistration } from '../../contexts/RegistrationContext';
import { 
  ValidationPreview, 
  ValidationResults, 
  ValidationProgress,
  ValidationPreviewResponse,
  ValidationRunResponse,
  ValidationExportResponse 
} from '../../types/validationTypes';

export const useValidation = () => {
  const { buildServerUrl } = useRegistration();
  const [progressCallback, setProgressCallback] = useState<((progress: ValidationProgress) => void) | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const getApiBaseUrl = useCallback((): string => {
    if (!buildServerUrl) {
      throw new Error('Validation hook not initialized. buildServerUrl function not available.');
    }
    // Use centralized URL building for validation endpoints
    return buildServerUrl('api/validation');
  }, [buildServerUrl]);

  const updateProgressCallback = useCallback((callback: ((progress: ValidationProgress) => void) | null) => {
    console.log('[@hook:useValidation:updateProgressCallback] Setting progress callback');
    setProgressCallback(() => callback);
  }, []);

  const getPreview = useCallback(async (treeId: string): Promise<ValidationPreview> => {
    console.log(`[@hook:useValidation:getPreview] Getting preview for tree: ${treeId}`);
    
    try {
      const response = await fetch(`${getApiBaseUrl()}/preview/${treeId}`);
      const data: ValidationPreviewResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to get validation preview');
      }
      
      console.log(`[@hook:useValidation:getPreview] Preview received: ${data.preview.totalNodes} nodes, ${data.preview.estimatedTime}s estimated`);
      return data.preview;
    } catch (error) {
      console.error(`[@hook:useValidation:getPreview] Error getting preview:`, error);
      throw error;
    }
  }, [getApiBaseUrl]);

  const setupProgressStream = useCallback((sessionId: string): void => {
    console.log(`[@hook:useValidation:setupProgressStream] Setting up progress stream for session: ${sessionId}`);
    
    try {
      eventSourceRef.current = new EventSource(`${getApiBaseUrl()}/progress/${sessionId}`);
      
      eventSourceRef.current.onmessage = (event) => {
        try {
          const progressData = JSON.parse(event.data);
          
          // Skip heartbeat messages
          if (progressData.type === 'heartbeat') {
            return;
          }
          
          console.log(`[@hook:useValidation:setupProgressStream] Progress update:`, progressData);
          
          // Convert backend progress format to frontend format
          const progress: ValidationProgress = {
            currentStep: progressData.currentStep || 0,
            totalSteps: progressData.totalSteps || 0,
            currentNode: progressData.currentEdgeTo || '',
            currentNodeName: progressData.currentEdgeToName || '',
            currentEdgeFrom: progressData.currentEdgeFrom || '',
            currentEdgeTo: progressData.currentEdgeTo || '',
            currentEdgeFromName: progressData.currentEdgeFromName || '',
            currentEdgeToName: progressData.currentEdgeToName || '',
            currentEdgeStatus: progressData.currentEdgeStatus as any || 'testing',
            retryAttempt: progressData.retryAttempt || 0,
            status: progressData.currentEdgeStatus === 'completed' ? 'completed' : 'running',
            completedNodes: [] // TODO: Track completed nodes if needed
          };
          
          // Call the progress callback
          if (progressCallback) {
            progressCallback(progress);
          }
          
        } catch (error) {
          console.error(`[@hook:useValidation:setupProgressStream] Error parsing progress data:`, error);
        }
      };
      
      eventSourceRef.current.onerror = (error) => {
        console.error(`[@hook:useValidation:setupProgressStream] SSE connection error:`, error);
        closeProgressStream();
      };
      
    } catch (error) {
      console.error(`[@hook:useValidation:setupProgressStream] Error setting up progress stream:`, error);
    }
  }, [getApiBaseUrl, progressCallback]);

  const closeProgressStream = useCallback((): void => {
    if (eventSourceRef.current) {
      console.log(`[@hook:useValidation:closeProgressStream] Closing progress stream`);
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const runValidation = useCallback(async (
    treeId: string, 
    skippedEdges?: Array<{ from: string; to: string }>
  ): Promise<ValidationResults> => {
    console.log(`[@hook:useValidation:runValidation] Running validation for tree: ${treeId}`, skippedEdges ? `with ${skippedEdges.length} skipped edges` : '');
    
    // Generate a unique session ID for this validation run
    const sessionId = `validation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      // Start Server-Sent Events connection for progress updates if callback is set
      if (progressCallback) {
        setupProgressStream(sessionId);
      }
      
      const requestBody: any = {
        session_id: progressCallback ? sessionId : undefined
      };
      
      // Add skipped edges if provided
      if (skippedEdges && skippedEdges.length > 0) {
        requestBody.skipped_edges = skippedEdges;
      }
      
      const response = await fetch(`${getApiBaseUrl()}/run/${treeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      const data: ValidationRunResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Validation failed');
      }
      
      console.log(`[@hook:useValidation:runValidation] Validation completed: ${data.results.summary.validNodes}/${data.results.summary.totalNodes} nodes valid`);
      
      // Close progress stream
      closeProgressStream();
      
      return data.results;
    } catch (error) {
      console.error(`[@hook:useValidation:runValidation] Error running validation:`, error);
      // Close progress stream on error
      closeProgressStream();
      throw error;
    }
  }, [getApiBaseUrl, progressCallback, setupProgressStream, closeProgressStream]);

  const exportReport = useCallback(async (treeId: string, format: 'json' | 'csv' = 'json'): Promise<Blob> => {
    console.log(`[@hook:useValidation:exportReport] Exporting report for tree: ${treeId}, format: ${format}`);
    
    try {
      const response = await fetch(`${getApiBaseUrl()}/export/${treeId}?format=${format}`);
      const data: ValidationExportResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Export failed');
      }
      
      // Convert the report data to a blob
      let blob: Blob;
      if (format === 'csv') {
        blob = new Blob([data.report], { type: 'text/csv' });
      } else {
        blob = new Blob([JSON.stringify(data.report, null, 2)], { type: 'application/json' });
      }
      
      console.log(`[@hook:useValidation:exportReport] Report exported successfully`);
      return blob;
    } catch (error) {
      console.error(`[@hook:useValidation:exportReport] Error exporting report:`, error);
      throw error;
    }
  }, [getApiBaseUrl]);

  const downloadBlob = useCallback((blob: Blob, filename: string): void => {
    console.log(`[@hook:useValidation:downloadBlob] Downloading file: ${filename}`);
    
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log(`[@hook:useValidation:downloadBlob] File download initiated: ${filename}`);
    } catch (error) {
      console.error(`[@hook:useValidation:downloadBlob] Error downloading file:`, error);
      throw error;
    }
  }, []);

  // Cleanup effect for component unmount
  const cleanup = useCallback(() => {
    closeProgressStream();
  }, [closeProgressStream]);

  return useMemo(() => ({
    getPreview,
    runValidation,
    exportReport,
    downloadBlob,
    updateProgressCallback,
    closeProgressStream,
    cleanup,
  }), [
    getPreview,
    runValidation,
    exportReport,
    downloadBlob,
    updateProgressCallback,
    closeProgressStream,
    cleanup,
  ]);
}; 