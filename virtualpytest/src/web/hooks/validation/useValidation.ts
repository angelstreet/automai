/**
 * Validation Hook
 *
 * This hook handles validation operations with progress tracking and API calls.
 */

import { useState, useCallback, useRef, useMemo } from 'react';

import {
  ValidationPreview,
  ValidationResults,
  ValidationProgress,
  ValidationPreviewResponse,
  ValidationRunResponse,
  ValidationExportResponse,
} from '../../types/features/Validation_Types';

// Simple constant for the API base URL
const VALIDATION_API_BASE_URL = '/server/validation';

export const useValidation = () => {
  const [progressCallback, setProgressCallback] = useState<
    ((progress: ValidationProgress) => void) | null
  >(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const updateProgressCallback = useCallback(
    (callback: ((progress: ValidationProgress) => void) | null) => {
      console.log('[@hook:useValidation:updateProgressCallback] Setting progress callback');
      setProgressCallback(() => callback);
    },
    [],
  );

  const getPreview = useCallback(async (treeId: string): Promise<ValidationPreview> => {
    console.log(`[@hook:useValidation:getPreview] Getting preview for tree: ${treeId}`);

    try {
      const response = await fetch(`${VALIDATION_API_BASE_URL}/preview/${treeId}`);
      const data: ValidationPreviewResponse = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to get validation preview');
      }

      console.log(
        `[@hook:useValidation:getPreview] Preview received: ${data.preview.totalNodes} nodes, ${data.preview.estimatedTime}s estimated`,
      );
      return data.preview;
    } catch (error) {
      console.error(`[@hook:useValidation:getPreview] Error getting preview:`, error);
      throw error;
    }
  }, []);

  const closeProgressStream = useCallback((): void => {
    if (eventSourceRef.current) {
      console.log(`[@hook:useValidation:closeProgressStream] Closing progress stream`);
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  }, []);

  const setupProgressStream = useCallback(
    (sessionId: string): void => {
      console.log(
        `[@hook:useValidation:setupProgressStream] Setting up progress stream for session: ${sessionId}`,
      );

      try {
        eventSourceRef.current = new EventSource(
          `${VALIDATION_API_BASE_URL}/progress/${sessionId}`,
        );

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
              currentEdgeStatus: (progressData.currentEdgeStatus as any) || 'testing',
              retryAttempt: progressData.retryAttempt || 0,
              status: progressData.currentEdgeStatus === 'completed' ? 'completed' : 'running',
              completedNodes: [], // TODO: Track completed nodes if needed
            };

            // Call the progress callback
            if (progressCallback) {
              progressCallback(progress);
            }
          } catch (error) {
            console.error(
              `[@hook:useValidation:setupProgressStream] Error parsing progress data:`,
              error,
            );
          }
        };

        eventSourceRef.current.onerror = (error) => {
          console.error(`[@hook:useValidation:setupProgressStream] SSE connection error:`, error);
          closeProgressStream();
        };
      } catch (error) {
        console.error(
          `[@hook:useValidation:setupProgressStream] Error setting up progress stream:`,
          error,
        );
      }
    },
    [progressCallback, closeProgressStream],
  );

  const runValidation = useCallback(
    async (
      treeId: string,
      skippedEdges?: Array<{ from: string; to: string }>,
      selectedHost?: any,
      selectedDeviceId?: string,
    ): Promise<ValidationResults> => {
      console.log(
        `[@hook:useValidation:runValidation] Running validation for tree: ${treeId}`,
        skippedEdges ? `with ${skippedEdges.length} skipped edges` : '',
      );

      // Generate a unique session ID for this validation run
      const sessionId = `validation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setCurrentSessionId(sessionId);

      try {
        // Start Server-Sent Events connection for progress updates if callback is set
        if (progressCallback) {
          setupProgressStream(sessionId);
        }

        const requestBody: any = {
          session_id: progressCallback ? sessionId : undefined,
        };

        // Add skipped edges if provided
        if (skippedEdges && skippedEdges.length > 0) {
          requestBody.skipped_edges = skippedEdges;
        }

        // Add host and device information if provided
        if (selectedHost && selectedDeviceId) {
          requestBody.host = selectedHost;
          requestBody.device_id = selectedDeviceId;
        }

        const response = await fetch(`${VALIDATION_API_BASE_URL}/run/${treeId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        const data: ValidationRunResponse = await response.json();

        if (!data.success) {
          throw new Error(data.error || 'Validation failed');
        }

        console.log(
          `[@hook:useValidation:runValidation] Validation completed: ${data.results.summary.validNodes}/${data.results.summary.totalNodes} nodes valid`,
        );

        // Close progress stream
        closeProgressStream();

        return data.results;
      } catch (error) {
        console.error(`[@hook:useValidation:runValidation] Error running validation:`, error);
        // Close progress stream on error
        closeProgressStream();
        throw error;
      } finally {
        // Clear session ID when validation completes
        setCurrentSessionId(null);
      }
    },
    [progressCallback, setupProgressStream, closeProgressStream],
  );

  const exportReport = useCallback(
    async (treeId: string, format: 'json' | 'csv' = 'json'): Promise<Blob> => {
      console.log(
        `[@hook:useValidation:exportReport] Exporting report for tree: ${treeId}, format: ${format}`,
      );

      try {
        const response = await fetch(
          `${VALIDATION_API_BASE_URL}/export/${treeId}?format=${format}`,
        );
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
    },
    [],
  );

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

  return useMemo(
    () => ({
      getPreview,
      runValidation,
      exportReport,
      downloadBlob,
      updateProgressCallback,
      closeProgressStream,
      currentSessionId,
      cleanup,
    }),
    [
      getPreview,
      runValidation,
      exportReport,
      downloadBlob,
      updateProgressCallback,
      closeProgressStream,
      currentSessionId,
      cleanup,
    ],
  );
};
