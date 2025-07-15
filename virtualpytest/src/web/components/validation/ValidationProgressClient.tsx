'use client';

import { Box, LinearProgress, Typography, Paper, Fade, Chip } from '@mui/material';
import { useEffect, useRef } from 'react';

import { useHostManager } from '../../hooks/useHostManager';
import { useValidationUI, useValidationColors } from '../../hooks/validation';
import { useValidationStore } from '../store/validationStore';

interface ValidationProgressClientProps {
  treeId: string;
  onUpdateEdge?: (edgeId: string, updatedData: any) => void;
  onUpdateNode?: (nodeId: string, updatedData: any) => void;
}

const ValidationProgressClient: React.FC<ValidationProgressClientProps> = ({
  treeId,
  onUpdateEdge,
  onUpdateNode,
}) => {
  const { selectedHost, selectedDeviceId } = useHostManager();
  const validation = useValidationUI(treeId, selectedHost, selectedDeviceId);
  const { isValidating, progress, showProgress } = validation;
  const { resetForNewValidation } = useValidationColors();
  const {
    setCurrentTestingNode,
    setCurrentTestingEdge,
    setNodeValidationStatus,
    setEdgeValidationStatus,
  } = useValidationStore();

  // Track if auto-save has been triggered for this validation session
  const autoSaveTriggeredRef = useRef(false);
  // Track previous validation state to detect completion
  const prevIsValidatingRef = useRef(false);

  // Helper function to update edge confidence with validation results
  const updateEdgeConfidence = (edgeId: string, success: boolean) => {
    if (!onUpdateEdge) {
      console.warn(
        '[@component:ValidationProgressClient] onUpdateEdge callback not provided - confidence will not be persisted!',
      );
      return;
    }

    // Create a minimal action with validation result that can be merged by the parent
    // The parent update function will handle this as a simple object spread
    const validationUpdate = {
      // Add a special field that indicates this is a validation update
      _validation_update: true,
      // Store the validation result in a way that can be processed
      _validation_result: {
        success,
        timestamp: new Date().toISOString(),
        type: 'validation',
      },
    };

    console.log(
      `[@component:ValidationProgressClient] Updating edge ${edgeId} confidence with validation result: ${success}`,
    );
    onUpdateEdge(edgeId, validationUpdate);
  };

  // Helper function to update node confidence with validation results
  const updateNodeConfidence = (nodeId: string, success: boolean) => {
    if (!onUpdateNode) {
      console.warn(
        '[@component:ValidationProgressClient] onUpdateNode callback not provided - confidence will not be persisted!',
      );
      return;
    }

    // Create a minimal verification with validation result that can be merged by the parent
    // The parent update function will handle this as a simple object spread
    const validationUpdate = {
      // Add a special field that indicates this is a validation update
      _validation_update: true,
      // Store the validation result in a way that can be processed
      _validation_result: {
        success,
        timestamp: new Date().toISOString(),
        type: 'validation',
      },
    };

    console.log(
      `[@component:ValidationProgressClient] Updating node ${nodeId} confidence with validation result: ${success}`,
    );
    onUpdateNode(nodeId, validationUpdate);
  };

  // Reset auto-save flag when validation starts
  useEffect(() => {
    if (isValidating) {
      console.log(
        '[@component:ValidationProgressClient] Validation starting - resetting auto-save flag',
      );
      autoSaveTriggeredRef.current = false;
    }
  }, [isValidating]);

  // Reset all colors when validation starts
  useEffect(() => {
    if (isValidating && progress?.currentStep === 1) {
      console.log(
        '[@component:ValidationProgressClient] Validation starting - resetting all colors to grey',
      );
      resetForNewValidation();
    }
  }, [isValidating, progress?.currentStep, resetForNewValidation]);

  // Also reset when validation first becomes true (backup detection)
  useEffect(() => {
    if (isValidating && !progress) {
      console.log(
        '[@component:ValidationProgressClient] Validation started (no progress yet) - resetting all colors to grey',
      );
      resetForNewValidation();
    }
  }, [isValidating, progress, resetForNewValidation]);

  // Update current testing indicators based on progress
  useEffect(() => {
    if (progress && isValidating) {
      console.log('[@component:ValidationProgressClient] Updating testing indicators', {
        currentEdgeFrom: progress.currentEdgeFrom,
        currentEdgeTo: progress.currentEdgeTo,
        currentNodeName: progress.currentNodeName,
      });

      // Set current testing node
      if (progress.currentEdgeTo) {
        setCurrentTestingNode(progress.currentEdgeTo);
      }

      // Set current testing edge
      if (progress.currentEdgeFrom && progress.currentEdgeTo) {
        const edgeId = `${progress.currentEdgeFrom}-${progress.currentEdgeTo}`;
        setCurrentTestingEdge(edgeId);
      }

      // Update validation status based on edge status
      if (progress.currentEdgeStatus && progress.currentEdgeStatus !== 'testing') {
        const edgeId = `${progress.currentEdgeFrom}-${progress.currentEdgeTo}`;

        // Determine validation status and calculate real confidence
        let validationStatus: 'high' | 'medium' | 'low' | 'untested' = 'untested';
        let confidence = 0;
        let success = false;

        switch (progress.currentEdgeStatus) {
          case 'success':
            validationStatus = 'high';
            confidence = 0.9; // High confidence for successful validation
            success = true;
            break;
          case 'failed':
            validationStatus = 'low';
            confidence = 0.1; // Low confidence for failed validation
            success = false;
            break;
          case 'skipped':
            validationStatus = 'untested';
            confidence = 0.5; // Neutral confidence for skipped
            success = false;
            break;
          case 'completed':
            validationStatus = 'medium';
            confidence = 0.7; // Medium confidence for completed
            success = true;
            break;
        }

        if (progress.currentEdgeFrom && progress.currentEdgeTo) {
          console.log('[@component:ValidationProgressClient] BEFORE updating validation status:', {
            edgeId,
            nodeId: progress.currentEdgeTo,
            currentEdgeStatus: progress.currentEdgeStatus,
            validationStatus,
            confidence,
            success,
          });

          // Update edge confidence in the actual navigation tree data
          updateEdgeConfidence(edgeId, success);

          // Update target node confidence in the actual navigation tree data
          updateNodeConfidence(progress.currentEdgeTo, success);

          // Update validation store for UI indicators
          setEdgeValidationStatus(edgeId, {
            status: validationStatus,
            confidence,
            lastTested: new Date(),
          });

          setNodeValidationStatus(progress.currentEdgeTo, {
            status: validationStatus,
            confidence,
            lastTested: new Date(),
          });

          console.log(
            '[@component:ValidationProgressClient] AFTER updating validation status - status should now be preserved:',
            {
              edgeId,
              nodeId: progress.currentEdgeTo,
              status: validationStatus,
              confidence,
              success,
              message:
                'This edge/node should now show as ' +
                (success ? 'GREEN' : 'RED') +
                ' and stay that color during validation',
            },
          );
        }
      }
    }
  }, [
    progress,
    isValidating,
    setCurrentTestingNode,
    setCurrentTestingEdge,
    setNodeValidationStatus,
    setEdgeValidationStatus,
    onUpdateEdge,
    onUpdateNode,
  ]);

  // Clear testing indicators when validation stops
  useEffect(() => {
    if (!isValidating) {
      setCurrentTestingNode(null);
      setCurrentTestingEdge(null);
    }
  }, [isValidating, setCurrentTestingNode, setCurrentTestingEdge]);

  // Auto-save when validation completes - ONLY ONCE per validation session
  useEffect(() => {
    // Detect transition from validating to not validating (validation just completed)
    const wasValidating = prevIsValidatingRef.current;
    const isNowValidating = isValidating;

    // Update the ref for next time
    prevIsValidatingRef.current = isValidating;

    // Auto-save removed - validation completes without database save
    if (wasValidating && !isNowValidating && !autoSaveTriggeredRef.current) {
      console.log('[@component:ValidationProgressClient] Validation completed');
      autoSaveTriggeredRef.current = true;
    }
  }, [isValidating]);

  if (!showProgress || !isValidating) return null;

  const progressPercentage = progress
    ? Math.round((progress.currentStep / progress.totalSteps) * 100)
    : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'success';
      case 'failed':
        return 'error';
      case 'skipped':
        return 'default';
      case 'testing':
        return 'primary';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'success':
        return 'SUCCESS';
      case 'failed':
        return 'FAILED';
      case 'skipped':
        return 'SKIPPED';
      case 'testing':
        return 'TESTING';
      case 'completed':
        return 'COMPLETED';
      default:
        return status.toUpperCase();
    }
  };

  return (
    <Fade in={isValidating && showProgress}>
      <Paper
        elevation={4}
        sx={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          p: 2,
          width: 400,
          maxHeight: 500,
          bgcolor: 'background.paper',
          borderRadius: 2,
          zIndex: 1300,
          border: '1px solid',
          borderColor: 'divider',
          overflow: 'hidden',
        }}
      >
        <Typography variant="body2" gutterBottom fontWeight="medium">
          Validating Navigation Edges... ({progressPercentage}%)
        </Typography>

        <LinearProgress
          variant="determinate"
          value={progressPercentage}
          sx={{
            height: 6,
            borderRadius: 3,
            bgcolor: 'action.hover',
            mb: 1,
          }}
        />

        {progress && (
          <>
            <Typography variant="caption" color="textSecondary" display="block" mb={1}>
              {progress.currentEdgeFrom && progress.currentEdgeTo
                ? `${progress.currentEdgeFromName || progress.currentEdgeFrom} → ${progress.currentEdgeToName || progress.currentEdgeTo}`
                : progress.currentNodeName || 'Preparing...'}
            </Typography>

            <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
              <Typography variant="caption" color="textSecondary">
                {progress.currentStep} of {progress.totalSteps}
              </Typography>

              {progress.currentEdgeStatus && progress.currentEdgeStatus !== 'completed' && (
                <Chip
                  label={getStatusLabel(progress.currentEdgeStatus)}
                  color={getStatusColor(progress.currentEdgeStatus)}
                  size="small"
                  variant="outlined"
                />
              )}
            </Box>
          </>
        )}
      </Paper>
    </Fade>
  );
};

export default ValidationProgressClient;
